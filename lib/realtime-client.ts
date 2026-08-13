'use client'

export type ReconcilerState = 'UNINITIALIZED' | 'SNAPSHOT_LOADING' | 'SYNCHRONIZED' | 'DEGRADED' | 'RESYNC_REQUIRED'
export interface OrderBookLevel { price: string; size: string }
export interface OrderBookPayload {
  marketId: string; tokenId: string; bids: OrderBookLevel[]; asks: OrderBookLevel[]
  observedAt: number; streamEpoch: number; deliveryCounter: number; requestId: string
}
export interface TradeExecutedPayload {
  marketId: string; tokenId: string; side: 'YES' | 'NO'; price: string; size: string
  user: string; observedAt: number; streamEpoch: number; deliveryCounter: number; requestId: string
}
export interface SignalEnvelope {
  schemaVersion: string; eventId: string; eventType: 'signal.created' | 'signal.retracted'; source: string
  marketId: string; tokenId?: string; signalType: 'price_move' | 'liquidity_change' | 'whale_trade'
  title: string; description: string; side?: 'YES' | 'NO'; amount?: string; price?: string; timeAgo: string; observedAt: number
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
type Envelope = {
  schemaVersion: string; eventId: string; eventType: string; marketId: string; tokenId: string
  streamEpoch: number; deliveryCounter: number; observedAt: number; requestId: string; payload: any
}

export class RealtimeClient {
  private ws: WebSocketLike | null = null
  private state: ReconcilerState = 'UNINITIALIZED'
  private epoch: number | null = null
  private counter = 0
  private latencyMs: number | null = null
  private reconnectPending = false
  private readonly subscriptions = new Map<string, Subscription>()
  private readonly seenEventIds = new Set<string>()
  private readonly stateListeners = new Set<(state: ReconcilerState, latencyMs: number | null) => void>()
  private readonly signalListeners = new Set<(signal: SignalEnvelope) => void>()
  private readonly orderBookListeners = new Set<(data: OrderBookPayload) => void>()
  private readonly tradeListeners = new Set<(trade: TradeExecutedPayload) => void>()
  private readonly options: Options

  constructor(options: Options) { this.options = options }

  public connect() {
    if (this.ws) return
    this.setState('SNAPSHOT_LOADING')
    try {
      const factory = this.options.socketFactory ?? ((url: string) => new WebSocket(url) as unknown as WebSocketLike)
      const socket = factory(this.options.url)
      this.ws = socket
      socket.onopen = () => {
        this.reconnectPending = false
        this.epoch = null
        this.counter = 0
        this.seenEventIds.clear()
        this.setState('SNAPSHOT_LOADING')
        this.subscriptions.forEach((subscription) => this.sendSubscription('subscribe', subscription))
      }
      socket.onmessage = (event) => this.handleMessage(event.data)
      socket.onerror = () => this.setState('DEGRADED')
      socket.onclose = () => { this.detachSocket(); this.setState('RESYNC_REQUIRED'); this.scheduleReconnect() }
    } catch { this.detachSocket(); this.setState('DEGRADED'); this.scheduleReconnect() }
  }

  public disconnect() { const socket = this.ws; this.detachSocket(); socket?.close(); this.reconnectPending = false; this.setState('UNINITIALIZED') }

  public subscribeToken(tokenId: string, marketId: string) {
    const subscription = { tokenId, marketId }
    this.subscriptions.set(`${marketId}:${tokenId}`, subscription)
    if (this.ws?.readyState === 1) this.sendSubscription('subscribe', subscription)
  }

  public unsubscribeToken(tokenId: string, marketId = '') {
    const key = marketId ? `${marketId}:${tokenId}` : [...this.subscriptions.keys()].find((candidate) => candidate.endsWith(`:${tokenId}`))
    if (!key) return
    const subscription = this.subscriptions.get(key)!
    this.subscriptions.delete(key)
    if (this.ws?.readyState === 1) this.sendSubscription('unsubscribe', subscription)
  }

  private sendSubscription(operation: 'subscribe' | 'unsubscribe', subscription: Subscription) {
    this.ws?.send(JSON.stringify({ operation, marketId: subscription.marketId, tokenId: subscription.tokenId }))
  }

  private parseEnvelope(raw: string): Envelope | null {
    try {
      const value = JSON.parse(raw)
      if (!value || typeof value !== 'object' || typeof value.schemaVersion !== 'string' || typeof value.eventId !== 'string' ||
        typeof value.eventType !== 'string' || typeof value.marketId !== 'string' || typeof value.tokenId !== 'string' ||
        !Number.isSafeInteger(value.streamEpoch) || !Number.isSafeInteger(value.deliveryCounter) || typeof value.observedAt !== 'number' ||
        typeof value.requestId !== 'string' || !value.payload || typeof value.payload !== 'object') return null
      return value as Envelope
    } catch { return null }
  }

  private handleMessage(raw: string) {
    const envelope = this.parseEnvelope(raw)
    if (!envelope) { this.setState('DEGRADED'); return }
    if (this.seenEventIds.has(envelope.eventId)) return
    if (this.epoch !== null && envelope.streamEpoch < this.epoch) return
    if (this.epoch === null || envelope.streamEpoch > this.epoch) {
      if (envelope.eventType !== 'orderbook.snapshot') { this.setState('RESYNC_REQUIRED'); return }
      this.epoch = envelope.streamEpoch
      this.counter = 0
      this.seenEventIds.clear()
    }
    if (envelope.deliveryCounter <= this.counter) return
    if (envelope.deliveryCounter !== this.counter + 1) { this.setState('RESYNC_REQUIRED'); return }
    if (this.state !== 'SYNCHRONIZED' && envelope.eventType !== 'orderbook.snapshot') return

    this.counter = envelope.deliveryCounter
    this.seenEventIds.add(envelope.eventId)
    this.latencyMs = Math.max(0, this.now() - envelope.observedAt)
    if (envelope.eventType === 'orderbook.snapshot' || envelope.eventType === 'orderbook.delta') {
      const bids = this.levels(envelope.payload.bids); const asks = this.levels(envelope.payload.asks)
      if (!bids || !asks) { this.setState('DEGRADED'); return }
      this.setState('SYNCHRONIZED')
      this.orderBookListeners.forEach((fn) => fn({ marketId: envelope.marketId, tokenId: envelope.tokenId, bids, asks, observedAt: envelope.observedAt, streamEpoch: envelope.streamEpoch, deliveryCounter: envelope.deliveryCounter, requestId: envelope.requestId }))
    }
  }

  private levels(value: unknown): OrderBookLevel[] | null {
    if (!Array.isArray(value)) return null
    const levels = value.map((level: any) => ({ price: String(level?.price ?? ''), size: String(level?.size ?? '') }))
    return levels.every((level) => level.price && level.size && Number.isFinite(Number(level.price)) && Number.isFinite(Number(level.size))) ? levels : null
  }

  private scheduleReconnect() {
    if (this.reconnectPending) return
    this.reconnectPending = true
    const schedule = this.options.scheduleReconnect ?? ((fn: () => void, delay: number) => setTimeout(fn, delay))
    schedule(() => { this.reconnectPending = false; this.connect() }, this.options.reconnectDelayMs ?? 5000)
  }
  private detachSocket() { if (this.ws) { this.ws.onopen = null; this.ws.onmessage = null; this.ws.onerror = null; this.ws.onclose = null }; this.ws = null }
  private now() { return (this.options.now ?? Date.now)() }
  private setState(state: ReconcilerState) { this.state = state; this.stateListeners.forEach((fn) => fn(state, this.latencyMs)) }
  public getState() { return this.state }
  public getLatency() { return this.latencyMs }
  public onStateChange(fn: (state: ReconcilerState, latencyMs: number | null) => void) { this.stateListeners.add(fn); fn(this.state, this.latencyMs); return () => this.stateListeners.delete(fn) }
  public onSignal(fn: (signal: SignalEnvelope) => void) { this.signalListeners.add(fn); return () => this.signalListeners.delete(fn) }
  public onOrderBook(fn: (data: OrderBookPayload) => void) { this.orderBookListeners.add(fn); return () => this.orderBookListeners.delete(fn) }
  public onTrade(fn: (trade: TradeExecutedPayload) => void) { this.tradeListeners.add(fn); return () => this.tradeListeners.delete(fn) }
}
