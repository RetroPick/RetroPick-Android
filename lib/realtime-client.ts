'use client'

export type ReconcilerState = 'UNINITIALIZED' | 'SNAPSHOT_LOADING' | 'SYNCHRONIZED' | 'DEGRADED' | 'RESYNC_REQUIRED'
export type RealtimeEventType =
  | 'hello' | 'subscribed' | 'unsubscribed' | 'orderbook.snapshot' | 'orderbook.delta'
  | 'trade.executed' | 'market.tick_size_changed' | 'market.updated' | 'signal.created'
  | 'signal.retracted' | 'resync.required' | 'error'
export interface OrderBookLevel { price: string; size: string }
export interface OrderBookPayload {
  marketId: string; tokenId: string; bids: OrderBookLevel[]; asks: OrderBookLevel[]
  observedAt: string; publishedAt: string; streamEpoch: number; deliveryCounter: number
}
export interface TradeExecutedPayload {
  marketId: string; tokenId: string; observedAt: string; publishedAt: string
  streamEpoch: number; deliveryCounter: number; payload: Record<string, unknown>
}
export interface SignalEnvelope {
  schemaVersion: '1'; eventId: string; eventType: 'signal.created' | 'signal.retracted'; source: 'retropick'
  marketId: string; upstreamId: string; tokenId: string; sequence: null; snapshotHash?: string
  streamEpoch: number; deliveryCounter: number; observedAt: string; publishedAt: string
  payload: Record<string, unknown>
}
export interface WebSocketLike {
  readyState: number
  onopen: (() => void) | null
  onmessage: ((event: { data: string }) => void) | null
  onerror: (() => void) | null
  onclose: (() => void) | null
  send(data: string): void
  close(): void
}

type Options = {
  url: string
  socketFactory?: (url: string) => WebSocketLike
  scheduleReconnect?: (fn: () => void, delayMs: number) => unknown
  now?: () => number
  reconnectDelayMs?: number
}
type Subscription = { tokenId: string; marketId: string }
type SubscriptionReconciliation = {
  state: 'SNAPSHOT_LOADING' | 'SYNCHRONIZED' | 'RESYNC_REQUIRED'
  epoch: number | null
  counter: number
  seenEventIds: Set<string>
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  bookHash: string | null
  bookTimestamp: string | null
}
type ControlEventType = 'hello' | 'subscribed' | 'unsubscribed' | 'error'
type ControlEnvelope = {
  schemaVersion: '1'; eventType: ControlEventType; marketId?: string; tokenId?: string
  sequence: null; payload: Record<string, unknown>
}
type DataEventType = Exclude<RealtimeEventType, ControlEventType>
type DataEnvelope = {
  schemaVersion: '1'; eventId: string; eventType: DataEventType; source: 'retropick'
  marketId: string; upstreamId: string; tokenId: string; sequence: null; snapshotHash?: string
  streamEpoch: number; deliveryCounter: number; observedAt: string; publishedAt: string
  payload: Record<string, unknown>
}
type Envelope = ControlEnvelope | DataEnvelope

const CONTROL_TYPES = new Set<RealtimeEventType>(['hello', 'subscribed', 'unsubscribed', 'error'])
const DATA_TYPES = new Set<RealtimeEventType>([
  'orderbook.snapshot', 'orderbook.delta', 'trade.executed', 'market.tick_size_changed',
  'market.updated', 'signal.created', 'signal.retracted', 'resync.required',
])
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/

export class RealtimeClient {
  private ws: WebSocketLike | null = null
  private state: ReconcilerState = 'UNINITIALIZED'
  private latencyMs: number | null = null
  private reconnectPending = false
  private readonly subscriptions = new Map<string, Subscription>()
  private readonly reconciliation = new Map<string, SubscriptionReconciliation>()
  private readonly stateListeners = new Set<(state: ReconcilerState, latencyMs: number | null) => void>()
  private readonly signalListeners = new Set<(signal: SignalEnvelope) => void>()
  private readonly orderBookListeners = new Set<(data: OrderBookPayload) => void>()
  private readonly tradeListeners = new Set<(trade: TradeExecutedPayload) => void>()
  private readonly options: Options

  constructor(options: Options) { this.options = options }

  public connect() {
    if (this.ws) return
    if (this.subscriptions.size > 0) this.setState('SNAPSHOT_LOADING')
    try {
      const factory = this.options.socketFactory ?? ((url: string) => new WebSocket(url) as unknown as WebSocketLike)
      const socket = factory(this.options.url)
      this.ws = socket
      socket.onopen = () => {
        this.reconnectPending = false
        this.subscriptions.forEach((_subscription, key) => this.reconciliation.set(key, this.newReconciliation()))
        this.refreshState()
        this.subscriptions.forEach((subscription) => this.sendSubscription('subscribe', subscription))
      }
      socket.onmessage = (event) => this.handleMessage(event.data)
      socket.onerror = () => this.setDegraded()
      socket.onclose = () => { this.detachSocket(); this.setState('RESYNC_REQUIRED'); this.scheduleReconnect() }
    } catch { this.detachSocket(); this.setState('DEGRADED'); this.scheduleReconnect() }
  }

  public disconnect() { const socket = this.ws; this.detachSocket(); socket?.close(); this.reconnectPending = false; this.setState('UNINITIALIZED') }

  public subscribeToken(tokenId: string, marketId: string) {
    const subscription = { tokenId, marketId }
    const key = this.subscriptionKey(marketId, tokenId)
    this.subscriptions.set(key, subscription)
    this.reconciliation.set(key, this.newReconciliation())
    if (this.ws?.readyState === 1) this.refreshState()
    if (this.ws?.readyState === 1) this.sendSubscription('subscribe', subscription)
  }

  public unsubscribeToken(tokenId: string, marketId = '') {
    const key = marketId ? `${marketId}:${tokenId}` : [...this.subscriptions.keys()].find((candidate) => candidate.endsWith(`:${tokenId}`))
    if (!key) return
    const subscription = this.subscriptions.get(key)!
    this.subscriptions.delete(key)
    this.reconciliation.delete(key)
    if (this.ws?.readyState === 1) this.refreshState()
    if (this.ws?.readyState === 1) this.sendSubscription('unsubscribe', subscription)
  }

  private sendSubscription(command: 'subscribe' | 'unsubscribe', subscription: Subscription) {
    this.ws?.send(JSON.stringify({ command, marketId: subscription.marketId, tokenId: subscription.tokenId }))
  }

  private parseEnvelope(raw: string): Envelope | null {
    try {
      const value: unknown = JSON.parse(raw)
      if (!this.isRecord(value) || value.schemaVersion !== '1' || typeof value.eventType !== 'string' ||
        value.sequence !== null || !this.isRecord(value.payload)) return null
      if (CONTROL_TYPES.has(value.eventType as RealtimeEventType)) {
        if ((value.marketId !== undefined && typeof value.marketId !== 'string') ||
          (value.tokenId !== undefined && typeof value.tokenId !== 'string')) return null
        return value as ControlEnvelope
      }
      if (!DATA_TYPES.has(value.eventType as RealtimeEventType) || typeof value.eventId !== 'string' || !value.eventId ||
        value.source !== 'retropick' || typeof value.marketId !== 'string' || !value.marketId ||
        typeof value.upstreamId !== 'string' || !value.upstreamId || typeof value.tokenId !== 'string' || !value.tokenId ||
        !this.isCounter(value.streamEpoch) || !this.isCounter(value.deliveryCounter) ||
        !this.isRFC3339(value.observedAt) || !this.isRFC3339(value.publishedAt) ||
        (value.snapshotHash !== undefined && typeof value.snapshotHash !== 'string')) return null
      return value as DataEnvelope
    } catch { return null }
  }

  private handleMessage(raw: string) {
    const envelope = this.parseEnvelope(raw)
    if (!envelope) { this.setDegraded(); return }
    if (this.isControlEnvelope(envelope)) {
      if (envelope.eventType === 'error') this.setDegraded()
      return
    }
    const reconciliation = this.reconciliation.get(this.subscriptionKey(envelope.marketId, envelope.tokenId))
    if (!reconciliation || reconciliation.seenEventIds.has(envelope.eventId)) return
    if (envelope.eventType === 'resync.required') {
      reconciliation.state = 'RESYNC_REQUIRED'
      reconciliation.epoch = envelope.streamEpoch
      reconciliation.counter = 0
      reconciliation.seenEventIds.add(envelope.eventId)
      this.refreshState()
      return
    }
    if (reconciliation.epoch !== null && envelope.streamEpoch < reconciliation.epoch) return
    if (reconciliation.epoch === null || envelope.streamEpoch > reconciliation.epoch) {
      if (envelope.eventType !== 'orderbook.snapshot') {
        reconciliation.state = 'RESYNC_REQUIRED'
        this.refreshState()
        return
      }
      reconciliation.epoch = envelope.streamEpoch
      reconciliation.counter = 0
      reconciliation.seenEventIds.clear()
    }
    if (envelope.deliveryCounter <= reconciliation.counter) return
    if (envelope.deliveryCounter !== reconciliation.counter + 1) {
      reconciliation.state = 'RESYNC_REQUIRED'
      this.refreshState()
      return
    }
    if (reconciliation.state !== 'SYNCHRONIZED' && envelope.eventType !== 'orderbook.snapshot') return

    const observedAt = Date.parse(envelope.observedAt)
    if (envelope.eventType === 'orderbook.snapshot') {
      const bids = this.levels(envelope.payload.bids); const asks = this.levels(envelope.payload.asks)
      const hash = envelope.payload.hash
      const timestamp = envelope.payload.timestamp
      if (!bids || !asks || typeof hash !== 'string' || !hash || !this.isRFC3339(timestamp)) {
        this.requireResync(reconciliation)
        return
      }
      const sortedBids = this.sortLevels(bids, 'bid')
      const sortedAsks = this.sortLevels(asks, 'ask')
      if (sortedBids.length > 0 && sortedAsks.length > 0 &&
        this.compareDecimal(sortedBids[0].price, sortedAsks[0].price) >= 0) {
        this.requireResync(reconciliation)
        return
      }
      reconciliation.bids = sortedBids
      reconciliation.asks = sortedAsks
      reconciliation.bookHash = hash
      reconciliation.bookTimestamp = timestamp
      reconciliation.state = 'SYNCHRONIZED'
      this.acceptOrderBook(envelope, reconciliation, observedAt)
    } else if (envelope.eventType === 'orderbook.delta') {
      const delta = this.delta(envelope.payload)
      if (!delta || delta.baseHash !== reconciliation.bookHash ||
        !reconciliation.bookTimestamp || Date.parse(delta.timestamp) <= Date.parse(reconciliation.bookTimestamp)) {
        this.requireResync(reconciliation)
        return
      }
      const levels = delta.side === 'bid' ? reconciliation.bids : reconciliation.asks
      const next = levels.filter((level) => this.compareDecimal(level.price, delta.price) !== 0)
      if (delta.size !== '0') next.push({ price: delta.price, size: delta.size })
      const sorted = this.sortLevels(next, delta.side)
      const bids = delta.side === 'bid' ? sorted : reconciliation.bids
      const asks = delta.side === 'ask' ? sorted : reconciliation.asks
      if (bids.length > 0 && asks.length > 0 && this.compareDecimal(bids[0].price, asks[0].price) >= 0) {
        this.requireResync(reconciliation)
        return
      }
      if (delta.side === 'bid') reconciliation.bids = sorted
      else reconciliation.asks = sorted
      reconciliation.bookHash = delta.nextHash
      reconciliation.bookTimestamp = delta.timestamp
      this.acceptOrderBook(envelope, reconciliation, observedAt)
    } else if (envelope.eventType === 'trade.executed') {
      this.acceptEnvelope(envelope, reconciliation, observedAt)
      this.tradeListeners.forEach((fn) => fn({
        marketId: envelope.marketId, tokenId: envelope.tokenId,
        observedAt: envelope.observedAt, publishedAt: envelope.publishedAt,
        streamEpoch: envelope.streamEpoch, deliveryCounter: envelope.deliveryCounter, payload: envelope.payload,
      }))
    } else if (envelope.eventType === 'signal.created' || envelope.eventType === 'signal.retracted') {
      this.acceptEnvelope(envelope, reconciliation, observedAt)
      this.signalListeners.forEach((fn) => fn(envelope as SignalEnvelope))
    } else {
      this.acceptEnvelope(envelope, reconciliation, observedAt)
    }
  }

  private levels(value: unknown): OrderBookLevel[] | null {
    if (!Array.isArray(value)) return null
    const levels: OrderBookLevel[] = []
    const prices = new Set<string>()
    for (const level of value) {
      if (!this.isRecord(level) || typeof level.price !== 'string' || typeof level.size !== 'string' ||
        !this.isDecimal(level.price) || !this.isProbability(level.price) ||
        !this.isDecimal(level.size) || this.compareDecimal(level.size, '0') <= 0 || prices.has(level.price)) return null
      prices.add(level.price)
      levels.push({ price: level.price, size: level.size })
    }
    return levels
  }

  private delta(value: Record<string, unknown>) {
    const { BaseHash, NextHash, Timestamp, Side, Price, Size } = value
    if (typeof BaseHash !== 'string' || !BaseHash || typeof NextHash !== 'string' || !NextHash ||
      !this.isRFC3339(Timestamp) || (Side !== 'bid' && Side !== 'ask') ||
      typeof Price !== 'string' || !this.isDecimal(Price) || !this.isProbability(Price) ||
      typeof Size !== 'string' || !this.isDecimal(Size)) return null
    return {
      baseHash: BaseHash, nextHash: NextHash, timestamp: Timestamp,
      side: Side as 'bid' | 'ask', price: Price, size: Size,
    }
  }
  private acceptEnvelope(envelope: DataEnvelope, reconciliation: SubscriptionReconciliation, observedAt: number) {
    reconciliation.counter = envelope.deliveryCounter
    reconciliation.seenEventIds.add(envelope.eventId)
    this.latencyMs = Math.max(0, this.now() - observedAt)
  }
  private acceptOrderBook(envelope: DataEnvelope, reconciliation: SubscriptionReconciliation, observedAt: number) {
    this.acceptEnvelope(envelope, reconciliation, observedAt)
    this.refreshState()
    this.orderBookListeners.forEach((fn) => fn({
      marketId: envelope.marketId, tokenId: envelope.tokenId,
      bids: reconciliation.bids.map((level) => ({ ...level })), asks: reconciliation.asks.map((level) => ({ ...level })),
      observedAt: envelope.observedAt, publishedAt: envelope.publishedAt,
      streamEpoch: envelope.streamEpoch, deliveryCounter: envelope.deliveryCounter,
    }))
  }
  private requireResync(reconciliation: SubscriptionReconciliation) {
    reconciliation.state = 'RESYNC_REQUIRED'
    this.refreshState()
  }
  private isDecimal(value: string) { return /^(0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value) }
  private isProbability(value: string) { return this.compareDecimal(value, '1') <= 0 }
  private compareDecimal(left: string, right: string) {
    const [li, lf = ''] = left.split('.'); const [ri, rf = ''] = right.split('.')
    if (li.length !== ri.length) return li.length < ri.length ? -1 : 1
    if (li !== ri) return li < ri ? -1 : 1
    const width = Math.max(lf.length, rf.length)
    const lp = lf.padEnd(width, '0'); const rp = rf.padEnd(width, '0')
    return lp === rp ? 0 : lp < rp ? -1 : 1
  }
  private sortLevels(levels: OrderBookLevel[], side: 'bid' | 'ask') {
    return [...levels].sort((left, right) => this.compareDecimal(left.price, right.price) * (side === 'bid' ? -1 : 1))
  }

  private isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
  private isControlEnvelope(envelope: Envelope): envelope is ControlEnvelope { return CONTROL_TYPES.has(envelope.eventType) }
  private isCounter(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) >= 0 }
  private isRFC3339(value: unknown): value is string {
    if (typeof value !== 'string') return false
    const match = RFC3339.exec(value)
    if (!match || !Number.isFinite(Date.parse(value))) return false
    const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] = match
    const y = Number(year); const m = Number(month); const d = Number(day)
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth && Number(hour) <= 23 &&
      Number(minute) <= 59 && Number(second) <= 59 &&
      (offsetHour === undefined || (Number(offsetHour) <= 23 && Number(offsetMinute) <= 59))
  }
  private scheduleReconnect() {
    if (this.reconnectPending) return
    this.reconnectPending = true
    const schedule = this.options.scheduleReconnect ?? ((fn: () => void, delay: number) => setTimeout(fn, delay))
    schedule(() => { this.reconnectPending = false; this.connect() }, this.options.reconnectDelayMs ?? 5000)
  }
  private detachSocket() { if (this.ws) { this.ws.onopen = null; this.ws.onmessage = null; this.ws.onerror = null; this.ws.onclose = null }; this.ws = null }
  private now() { return (this.options.now ?? Date.now)() }
  private subscriptionKey(marketId: string, tokenId: string) { return `${marketId}:${tokenId}` }
  private newReconciliation(): SubscriptionReconciliation {
    return {
      state: 'SNAPSHOT_LOADING', epoch: null, counter: 0, seenEventIds: new Set<string>(),
      bids: [], asks: [], bookHash: null, bookTimestamp: null,
    }
  }
  private refreshState() {
    const states = [...this.reconciliation.values()].map((value) => value.state)
    if (states.length === 0) this.setState('UNINITIALIZED')
    else if (states.some((state) => state === 'RESYNC_REQUIRED')) this.setState('RESYNC_REQUIRED')
    else if (states.some((state) => state !== 'SYNCHRONIZED')) this.setState('SNAPSHOT_LOADING')
    else this.setState('SYNCHRONIZED')
  }
  private setDegraded() {
    const hasResyncRequired = [...this.reconciliation.values()].some((value) => value.state === 'RESYNC_REQUIRED')
    this.setState(hasResyncRequired ? 'RESYNC_REQUIRED' : 'DEGRADED')
  }
  private setState(state: ReconcilerState) { this.state = state; this.stateListeners.forEach((fn) => fn(state, this.latencyMs)) }
  public getState() { return this.state }
  public getLatency() { return this.latencyMs }
  public onStateChange(fn: (state: ReconcilerState, latencyMs: number | null) => void) { this.stateListeners.add(fn); fn(this.state, this.latencyMs); return () => this.stateListeners.delete(fn) }
  public onSignal(fn: (signal: SignalEnvelope) => void) { this.signalListeners.add(fn); return () => this.signalListeners.delete(fn) }
  public onOrderBook(fn: (data: OrderBookPayload) => void) { this.orderBookListeners.add(fn); return () => this.orderBookListeners.delete(fn) }
  public onTrade(fn: (trade: TradeExecutedPayload) => void) { this.tradeListeners.add(fn); return () => this.tradeListeners.delete(fn) }
}
