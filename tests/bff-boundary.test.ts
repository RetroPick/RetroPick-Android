import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveRuntimeConfig, RuntimeConfigurationError } from '../lib/runtime-config.ts'
import { MarketsTerminalClient } from '../lib/markets-terminal-client.ts'
import { RealtimeClient, type WebSocketLike } from '../lib/realtime-client.ts'
import { fetchLivePolymarketMarkets } from '../lib/polymarket-service.ts'
import { canonicalOrderBookDeltaPayload, controlEnvelope, dataEnvelope } from './fixtures/realtime-protocol.ts'

const production = {
  NEXT_PUBLIC_BFF_HTTP_URL: 'https://bff.retropick.example/api/v1',
  NEXT_PUBLIC_BFF_WS_URL: 'wss://bff.retropick.example/api/v1/markets/realtime',
}

test('production requires explicit BFF URLs and secure schemes', () => {
  assert.throws(() => resolveRuntimeConfig({}, 'production'), RuntimeConfigurationError)
  assert.throws(() => resolveRuntimeConfig({ ...production, NEXT_PUBLIC_BFF_HTTP_URL: 'http://localhost:8080/api/v1' }, 'production'), /https/)
  assert.throws(() => resolveRuntimeConfig({ ...production, NEXT_PUBLIC_BFF_WS_URL: 'ws://bff.example/ws' }, 'production'), /wss/)
  assert.deepEqual(resolveRuntimeConfig(production, 'production'), {
    httpUrl: production.NEXT_PUBLIC_BFF_HTTP_URL,
    wsUrl: production.NEXT_PUBLIC_BFF_WS_URL,
    demoSimulation: false,
    environment: 'production',
  })
})

test('production rejects loopback, wildcard, and localhost-alias BFF hosts', () => {
  const forbiddenHosts = [
    '127.0.0.2',
    '127.255.255.255',
    '[::1]',
    '[::ffff:127.0.0.1]',
    '[::ffff:7f00:2]',
    '0.0.0.0',
    '[::]',
    '[::ffff:0.0.0.0]',
    'localhost',
    'localhost.',
    'api.localhost',
    '*',
  ]

  for (const host of forbiddenHosts) {
    assert.throws(() => resolveRuntimeConfig({
      NEXT_PUBLIC_BFF_HTTP_URL: `https://${host}/api/v1`,
      NEXT_PUBLIC_BFF_WS_URL: production.NEXT_PUBLIC_BFF_WS_URL,
    }, 'production'), RuntimeConfigurationError, `HTTP ${host}`)
    assert.throws(() => resolveRuntimeConfig({
      NEXT_PUBLIC_BFF_HTTP_URL: production.NEXT_PUBLIC_BFF_HTTP_URL,
      NEXT_PUBLIC_BFF_WS_URL: `wss://${host}/api/v1/markets/realtime`,
    }, 'production'), RuntimeConfigurationError, host)
  }
})

test('simulation is explicit and cannot be enabled in production', () => {
  assert.equal(resolveRuntimeConfig({
    NEXT_PUBLIC_BFF_HTTP_URL: 'http://10.0.2.2:8080/api/v1',
    NEXT_PUBLIC_BFF_WS_URL: 'ws://10.0.2.2:8080/api/v1/markets/realtime',
    NEXT_PUBLIC_DEMO_SIMULATION: 'true',
  }, 'development').demoSimulation, true)
  assert.throws(() => resolveRuntimeConfig({ ...production, NEXT_PUBLIC_DEMO_SIMULATION: 'true' }, 'production'), /simulation/)
})

test('capabilities and eligibility fail closed on HTTP errors and timeout', async () => {
  const failingFetch: typeof fetch = async () => new Response('down', { status: 503, headers: { 'x-request-id': 'req-503' } })
  const client = new MarketsTerminalClient({ httpUrl: production.NEXT_PUBLIC_BFF_HTTP_URL, fetchImpl: failingFetch, timeoutMs: 5 })
  const capabilities = await client.fetchCapabilitiesFromBff()
  assert.deepEqual(capabilities.features, { realtime: false, trading: false, intelligence: false })
  assert.equal(capabilities.health.availability, 'unavailable')
  assert.equal(capabilities.health.requestId, 'req-503')

  const timeoutFetch: typeof fetch = (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('timed out', 'AbortError')))
  })
  const eligibility = await new MarketsTerminalClient({ httpUrl: production.NEXT_PUBLIC_BFF_HTTP_URL, fetchImpl: timeoutFetch, timeoutMs: 1 }).fetchEligibilityFromBff()
  assert.equal(eligibility.eligible, false)
  assert.equal(eligibility.jurisdiction, 'UNKNOWN')
  assert.equal(eligibility.health.availability, 'unavailable')
})

test('BFF HTTP requests explicitly include session-cookie credentials', async () => {
  let requestInit: RequestInit | undefined
  const fetchImpl: typeof fetch = async (_url, init) => {
    requestInit = init
    return Response.json({ features: {}, observedAt: '2026-08-13T00:00:00Z' })
  }

  await new MarketsTerminalClient({
    httpUrl: production.NEXT_PUBLIC_BFF_HTTP_URL,
    fetchImpl,
  }).fetchCapabilitiesFromBff()

  assert.equal(requestInit?.credentials, 'include')
})

test('Polymarket market BFF request explicitly includes session-cookie credentials', async () => {
  const originalFetch = globalThis.fetch
  let requestInit: RequestInit | undefined
  globalThis.fetch = async (_url, init) => {
    requestInit = init
    return Response.json([])
  }

  try {
    await fetchLivePolymarketMarkets(production.NEXT_PUBLIC_BFF_HTTP_URL)
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(requestInit?.credentials, 'include')
})

class FakeSocket implements WebSocketLike {
  static readonly OPEN = 1
  readyState = 0
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  send(data: string) { this.sent.push(data) }
  close() {}
  open() { this.readyState = FakeSocket.OPEN; this.onopen?.() }
  message(value: unknown) { this.onmessage?.({ data: typeof value === 'string' ? value : JSON.stringify(value) }) }
  disconnect() { this.readyState = 3; this.onclose?.() }
}

function envelope(
  counter: number,
  epoch = 1,
  eventId = `event-${counter}`,
  marketId = 'market-1',
  tokenId = 'token-1',
) {
  return dataEnvelope(counter === 1 ? 'orderbook.snapshot' : 'orderbook.delta', counter, {
    eventId, marketId, upstreamId: tokenId, tokenId, streamEpoch: epoch,
  })
}

test('realtime emits canonical subscribe and unsubscribe commands', () => {
  const socket = new FakeSocket()
  const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
  client.subscribeToken('token-1', 'market-1')
  client.connect()
  socket.open()
  assert.deepEqual(JSON.parse(socket.sent[0]), { command: 'subscribe', marketId: 'market-1', tokenId: 'token-1' })

  client.unsubscribeToken('token-1', 'market-1')
  assert.deepEqual(JSON.parse(socket.sent[1]), { command: 'unsubscribe', marketId: 'market-1', tokenId: 'token-1' })
})

test('realtime accepts canonical controls and schema-version-1 data without requestId', () => {
  const socket = new FakeSocket()
  const now = Date.parse('2026-08-13T12:00:01.125Z')
  const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket, now: () => now })
  const books: Array<{ observedAt: string; publishedAt: string }> = []
  client.onOrderBook((book) => books.push(book))
  client.subscribeToken('token-1', 'market-1')
  client.connect()
  socket.open()

  socket.message(controlEnvelope('hello'))
  socket.message(controlEnvelope('subscribed', 'market-1', 'token-1'))
  assert.equal(client.getState(), 'SNAPSHOT_LOADING')
  socket.message(dataEnvelope('orderbook.snapshot', 1))

  assert.equal(client.getState(), 'SYNCHRONIZED')
  assert.equal(client.getLatency(), 1000)
  assert.deepEqual(books, [{
    marketId: 'market-1', tokenId: 'token-1', bids: [], asks: [],
    observedAt: '2026-08-13T12:00:00.125Z', publishedAt: '2026-08-13T12:00:00.250Z',
    streamEpoch: 1, deliveryCounter: 1,
  }])
})

test('realtime applies a canonical backend delta after its snapshot', () => {
  const socket = new FakeSocket()
  const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
  const books: Array<{ bids: Array<{ price: string; size: string }>; asks: Array<{ price: string; size: string }> }> = []
  const states: string[] = []
  client.onOrderBook((book) => books.push(book))
  client.onStateChange((state) => states.push(state))
  client.subscribeToken('token-1', 'market-1')
  client.connect()
  socket.open()

  socket.message(dataEnvelope('orderbook.snapshot', 1, {
    payload: {
      hash: 'hash-1', timestamp: '2026-08-13T12:00:00.125Z',
      bids: [{ price: '0.4', size: '2' }], asks: [{ price: '0.6', size: '3' }],
    },
  }))
  socket.message(dataEnvelope('orderbook.delta', 2, {
    payload: canonicalOrderBookDeltaPayload({ Size: '4' }),
  }))

  assert.equal(books.length, 2, 'canonical backend orderbook.delta should be mapped/applied')
  assert.deepEqual(books[1], {
    marketId: 'market-1', tokenId: 'token-1',
    bids: [{ price: '0.4', size: '4' }], asks: [{ price: '0.6', size: '3' }],
    observedAt: '2026-08-13T12:00:00.125Z', publishedAt: '2026-08-13T12:00:00.250Z',
    streamEpoch: 1, deliveryCounter: 2,
  })
  assert.equal(client.getState(), 'SYNCHRONIZED')
  assert.equal(states.includes('DEGRADED'), false)
})

test('realtime rejects non-string and non-canonical snapshot levels without accepting them', () => {
  const invalidValues: unknown[] = [1, null, true, {}, -1, '0.4e0', '01', '', 'NaN', 'Infinity']
  for (const [index, invalid] of invalidValues.entries()) {
    for (const field of ['price', 'size'] as const) {
      const socket = new FakeSocket()
      const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
      const deliveries: number[] = []
      client.onOrderBook((book) => deliveries.push(book.deliveryCounter))
      client.subscribeToken('token-1', 'market-1')
      client.connect(); socket.open()

      socket.message(dataEnvelope('orderbook.snapshot', 1, { eventId: `invalid-${field}-${index}`, payload: {
        hash: 'invalid-hash', timestamp: '2026-08-13T12:00:00.125Z',
        bids: [{ price: '0.4', size: '2', [field]: invalid }], asks: [{ price: '0.6', size: '3' }],
      } }))

      assert.equal(client.getState(), 'RESYNC_REQUIRED', `${field}=${JSON.stringify(invalid)}`)
      assert.deepEqual(deliveries, [], `${field}=${JSON.stringify(invalid)}`)
      socket.message(dataEnvelope('orderbook.snapshot', 1, { eventId: `invalid-${field}-${index}`, streamEpoch: 2, payload: {
        hash: 'recovery-hash', timestamp: '2026-08-13T12:00:01.125Z',
        bids: [{ price: '0.4', size: '2' }], asks: [{ price: '0.6', size: '3' }],
      } }))
      assert.equal(client.getState(), 'SYNCHRONIZED', `${field} recovery`)
      assert.deepEqual(deliveries, [1], `${field} recovery`)
    }
  }
})

test('realtime validates canonical snapshot price bounds, positive sizes, uniqueness, and spread before acceptance', () => {
  const invalidBooks = [
    { bids: [{ price: '1.01', size: '1' }], asks: [] },
    { bids: [], asks: [{ price: '2', size: '1' }] },
    { bids: [{ price: '0.4', size: '0' }], asks: [{ price: '0.6', size: '1' }] },
    { bids: [{ price: '0.4', size: '1' }, { price: '0.4', size: '2' }], asks: [{ price: '0.6', size: '1' }] },
    { bids: [{ price: '0.4', size: '1' }], asks: [{ price: '0.6', size: '1' }, { price: '0.6', size: '2' }] },
    { bids: [{ price: '0.7', size: '1' }], asks: [{ price: '0.6', size: '1' }] },
    { bids: [{ price: '0.6', size: '1' }], asks: [{ price: '0.60', size: '1' }] },
  ]
  for (const [index, payload] of invalidBooks.entries()) {
    const socket = new FakeSocket()
    const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
    const deliveries: number[] = []
    client.onOrderBook((book) => deliveries.push(book.deliveryCounter))
    client.subscribeToken('token-1', 'market-1')
    client.connect(); socket.open()
    socket.message(dataEnvelope('orderbook.snapshot', 1, { payload: {
      hash: `invalid-${index}`, timestamp: '2026-08-13T12:00:00.125Z', ...payload,
    } }))
    assert.equal(client.getState(), 'RESYNC_REQUIRED', `case ${index}`)
    assert.deepEqual(deliveries, [], `case ${index}`)

    socket.message(dataEnvelope('orderbook.snapshot', 1, { eventId: `recovery-${index}`, streamEpoch: 2, payload: {
      hash: `recovery-${index}`, timestamp: '2026-08-13T12:00:01.125Z',
      bids: [{ price: '0.2', size: '1' }, { price: '0.4', size: '2' }],
      asks: [{ price: '0.8', size: '4' }, { price: '0.6', size: '3' }],
    } }))
    assert.equal(client.getState(), 'SYNCHRONIZED', `case ${index} recovery`)
    assert.deepEqual(deliveries, [1], `case ${index} recovery`)
  }
})

test('realtime rejects semantically duplicate snapshot prices on the same side without accepting state', () => {
  const duplicateCases = [
    { side: 'bids', prices: ['0.4', '0.40'] },
    { side: 'asks', prices: ['0', '0.0'] },
    { side: 'bids', prices: ['1', '1.00'] },
    { side: 'asks', prices: ['0.7', `0.7${'0'.repeat(128)}`] },
  ] as const

  for (const [index, duplicate] of duplicateCases.entries()) {
    const socket = new FakeSocket()
    const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
    const deliveries: number[] = []
    client.onOrderBook((book) => deliveries.push(book.deliveryCounter))
    client.subscribeToken('token-1', 'market-1')
    client.connect(); socket.open()
    const duplicateLevels = duplicate.prices.map((price, levelIndex) => ({ price, size: String(levelIndex + 1) }))
    socket.message(dataEnvelope('orderbook.snapshot', 1, { eventId: `duplicate-${index}`, payload: {
      hash: `rejected-hash-${index}`, timestamp: '2026-08-13T12:00:00.125Z',
      bids: duplicate.side === 'bids' ? duplicateLevels : [],
      asks: duplicate.side === 'asks' ? duplicateLevels : [],
    } }))

    assert.equal(client.getState(), 'RESYNC_REQUIRED', `${duplicate.side}: ${duplicate.prices.join('/')}`)
    assert.equal(deliveries.length, 0, `${duplicate.side}: ${duplicate.prices.join('/')}`)

    socket.message(dataEnvelope('orderbook.snapshot', 1, {
      eventId: `duplicate-${index}`, streamEpoch: 2, payload: {
        hash: `recovery-hash-${index}`, timestamp: '2026-08-13T12:00:01.125Z',
        bids: [{ price: '0.4', size: '2' }], asks: [{ price: '0.6', size: '3' }],
      },
    }))
    socket.message(dataEnvelope('orderbook.delta', 2, { streamEpoch: 2, eventId: `after-duplicate-${index}`, payload:
      canonicalOrderBookDeltaPayload({
        BaseHash: `recovery-hash-${index}`, NextHash: `after-recovery-hash-${index}`,
        Timestamp: '2026-08-13T12:00:01.500Z', Price: '0.3', Size: '1',
      }),
    }))

    assert.equal(client.getState(), 'SYNCHRONIZED', `${duplicate.side} recovery`)
    assert.deepEqual(deliveries, [1, 2], `${duplicate.side} recovery`)
  }
})

test('realtime accepts and sorts distinct close fixed-point snapshot prices on the same side', () => {
  const socket = new FakeSocket()
  const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
  const books: Array<{ bids: Array<{ price: string }>; asks: Array<{ price: string }> }> = []
  client.onOrderBook((book) => books.push(book))
  client.subscribeToken('token-1', 'market-1')
  client.connect(); socket.open()
  socket.message(dataEnvelope('orderbook.snapshot', 1, { payload: {
    hash: 'hash-1', timestamp: '2026-08-13T12:00:00.125Z',
    bids: [{ price: '0.4', size: '1' }, { price: '0.40000000000000000000000000000000000001', size: '2' }],
    asks: [{ price: '0.60000000000000000000000000000000000001', size: '1' }, { price: '0.6', size: '2' }],
  } }))
  assert.deepEqual(books[0].bids.map((level) => level.price), ['0.40000000000000000000000000000000000001', '0.4'])
  assert.deepEqual(books[0].asks.map((level) => level.price), ['0.6', '0.60000000000000000000000000000000000001'])
})

test('realtime applies bid and ask deltas in canonical order and removes zero-size levels', () => {
  const socket = new FakeSocket()
  const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
  const books: Array<{ bids: Array<{ price: string; size: string }>; asks: Array<{ price: string; size: string }> }> = []
  client.onOrderBook((book) => books.push(book))
  client.subscribeToken('token-1', 'market-1')
  client.connect(); socket.open()
  socket.message(dataEnvelope('orderbook.snapshot', 1, { payload: {
    hash: 'hash-1', timestamp: '2026-08-13T12:00:00.125Z',
    bids: [{ price: '0.3', size: '1' }, { price: '0.4', size: '2' }],
    asks: [{ price: '0.7', size: '1' }, { price: '0.6', size: '3' }],
  } }))
  socket.message(dataEnvelope('orderbook.delta', 2, { payload: canonicalOrderBookDeltaPayload({
    NextHash: 'hash-2', Timestamp: '2026-08-13T12:00:00.500Z', Side: 'bid', Price: '0.5', Size: '5',
  }) }))
  socket.message(dataEnvelope('orderbook.delta', 3, { payload: canonicalOrderBookDeltaPayload({
    BaseHash: 'hash-2', NextHash: 'hash-3', Timestamp: '2026-08-13T12:00:00.600Z', Side: 'ask', Price: '0.55', Size: '6',
  }) }))
  socket.message(dataEnvelope('orderbook.delta', 4, { payload: canonicalOrderBookDeltaPayload({
    BaseHash: 'hash-3', NextHash: 'hash-4', Timestamp: '2026-08-13T12:00:00.700Z', Side: 'bid', Price: '0.4', Size: '0',
  }) }))

  assert.deepEqual(books.at(-1)?.bids, [{ price: '0.5', size: '5' }, { price: '0.3', size: '1' }])
  assert.deepEqual(books.at(-1)?.asks, [{ price: '0.55', size: '6' }, { price: '0.6', size: '3' }, { price: '0.7', size: '1' }])
  assert.equal(client.getState(), 'SYNCHRONIZED')
})

test('realtime removes levels for every canonical zero-equivalent delta size', () => {
  for (const [index, size] of ['0', '0.0', '0.00', `0.${'0'.repeat(128)}`].entries()) {
    const socket = new FakeSocket()
    const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
    const books: Array<{ bids: Array<{ price: string; size: string }>; asks: Array<{ price: string; size: string }>; deliveryCounter: number }> = []
    client.onOrderBook((book) => books.push(book))
    client.subscribeToken('token-1', 'market-1')
    client.connect(); socket.open()
    socket.message(dataEnvelope('orderbook.snapshot', 1, { eventId: `snapshot-${index}`, payload: {
      hash: 'hash-1', timestamp: '2026-08-13T12:00:00.125Z',
      bids: [{ price: '0.4', size: '2' }], asks: [{ price: '0.6', size: '3' }],
    } }))
    socket.message(dataEnvelope('orderbook.delta', 2, { eventId: `zero-${index}`, payload: canonicalOrderBookDeltaPayload({
      NextHash: 'hash-2', Timestamp: '2026-08-13T12:00:00.500Z', Size: size,
    }) }))

    assert.deepEqual(books[1], {
      marketId: 'market-1', tokenId: 'token-1', bids: [], asks: [{ price: '0.6', size: '3' }],
      observedAt: '2026-08-13T12:00:00.125Z', publishedAt: '2026-08-13T12:00:00.250Z',
      streamEpoch: 1, deliveryCounter: 2,
    }, `Size=${size}`)

    socket.message(dataEnvelope('orderbook.delta', 3, { eventId: `after-zero-${index}`, payload: canonicalOrderBookDeltaPayload({
      BaseHash: 'hash-2', NextHash: 'hash-3', Timestamp: '2026-08-13T12:00:00.600Z', Price: '0.3', Size: '1',
    }) }))
    assert.deepEqual(books.map((book) => book.deliveryCounter), [1, 2, 3], `Size=${size}`)
    assert.deepEqual(books[2].bids, [{ price: '0.3', size: '1' }], `Size=${size}`)
    assert.equal(client.getState(), 'SYNCHRONIZED', `Size=${size}`)
  }
})

test('realtime retains canonical nonzero delta sizes when updating or inserting levels', () => {
  for (const [index, size] of ['0.10', '0.0001', '1.0'].entries()) {
    const socket = new FakeSocket()
    const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
    const books: Array<{ bids: Array<{ price: string; size: string }>; deliveryCounter: number }> = []
    client.onOrderBook((book) => books.push(book))
    client.subscribeToken('token-1', 'market-1')
    client.connect(); socket.open()
    socket.message(dataEnvelope('orderbook.snapshot', 1, { eventId: `nonzero-snapshot-${index}`, payload: {
      hash: 'hash-1', timestamp: '2026-08-13T12:00:00.125Z',
      bids: [{ price: '0.4', size: '2' }], asks: [{ price: '0.6', size: '3' }],
    } }))
    const price = index === 0 ? '0.4' : '0.3'
    socket.message(dataEnvelope('orderbook.delta', 2, { eventId: `nonzero-${index}`, payload: canonicalOrderBookDeltaPayload({
      NextHash: 'hash-2', Timestamp: '2026-08-13T12:00:00.500Z', Price: price, Size: size,
    }) }))

    assert.equal(books[1].deliveryCounter, 2, `Size=${size}`)
    assert.deepEqual(books[1].bids.find((level) => level.price === price), { price, size }, `Size=${size}`)
    assert.equal(client.getState(), 'SYNCHRONIZED', `Size=${size}`)
  }
})

test('realtime requires resync for canonical delta hash mismatch or malformed fields', () => {
  const invalidPayloads = [
    canonicalOrderBookDeltaPayload({ BaseHash: 'wrong-hash' }),
    canonicalOrderBookDeltaPayload({ Side: 'BUY' }),
    canonicalOrderBookDeltaPayload({ Price: '0.4e0' }),
    canonicalOrderBookDeltaPayload({ Size: '-1' }),
    canonicalOrderBookDeltaPayload({ Size: '0e0' }),
    canonicalOrderBookDeltaPayload({ Size: '00' }),
    canonicalOrderBookDeltaPayload({ Size: '01' }),
    canonicalOrderBookDeltaPayload({ Timestamp: '2026-02-30T12:00:00Z' }),
    canonicalOrderBookDeltaPayload({ Side: 'bid', Price: '0.7', Size: '1' }),
  ]
  for (const payload of invalidPayloads) {
    const socket = new FakeSocket()
    const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
    const deliveries: number[] = []
    client.onOrderBook((book) => deliveries.push(book.deliveryCounter))
    client.subscribeToken('token-1', 'market-1')
    client.connect(); socket.open()
    socket.message(dataEnvelope('orderbook.snapshot', 1, { payload: {
      hash: 'hash-1', timestamp: '2026-08-13T12:00:00.125Z',
      bids: [{ price: '0.4', size: '2' }], asks: [{ price: '0.6', size: '3' }],
    } }))
    socket.message(dataEnvelope('orderbook.delta', 2, { payload }))
    assert.equal(client.getState(), 'RESYNC_REQUIRED', JSON.stringify(payload))
    assert.deepEqual(deliveries, [1], JSON.stringify(payload))
  }
})

test('realtime recognizes every canonical data event type and payload shape', () => {
  const socket = new FakeSocket()
  const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
  const trades: unknown[] = []
  const signals: unknown[] = []
  client.onTrade((trade) => trades.push(trade))
  client.onSignal((signal) => signals.push(signal))
  client.subscribeToken('token-1', 'market-1')
  client.connect()
  socket.open()
  socket.message(dataEnvelope('orderbook.snapshot', 1))
  socket.message(dataEnvelope('trade.executed', 2, { payload: { TokenID: 'token-1', Side: 'BUY', Price: '0.52', Size: '10' } }))
  socket.message(dataEnvelope('market.tick_size_changed', 3, { payload: { TokenID: 'token-1', OldTickSize: '0.01', NewTickSize: '0.001' } }))
  socket.message(dataEnvelope('market.updated', 4, { payload: { status: 'closed' } }))
  socket.message(dataEnvelope('signal.created', 5, { payload: { schemaVersion: '1', id: 'signal-1', type: 'price_move', marketId: 'market-1', state: 'active' } }))
  socket.message(dataEnvelope('signal.retracted', 6, { payload: { schemaVersion: '1', id: 'signal-1', type: 'price_move', marketId: 'market-1', state: 'retracted' } }))
  socket.message(dataEnvelope('resync.required', 7, { payload: { reason: 'resync_required' } }))

  assert.equal(trades.length, 1)
  assert.equal(signals.length, 2)
  assert.equal(client.getState(), 'RESYNC_REQUIRED')
})

test('realtime rejects invalid RFC3339 timestamps without computing latency', () => {
  for (const [field, invalid] of [
    ['observedAt', 'not-a-timestamp'],
    ['observedAt', '2026-02-30T12:00:00Z'],
    ['publishedAt', 'not-a-timestamp'],
    ['publishedAt', '2026-13-01T12:00:00Z'],
  ] as const) {
    const socket = new FakeSocket()
    const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket, now: () => Date.parse('2026-08-13T12:00:01Z') })
    client.subscribeToken('token-1', 'market-1')
    client.connect()
    socket.open()
    socket.message(dataEnvelope('orderbook.snapshot', 1, { [field]: invalid }))
    assert.equal(client.getState(), 'DEGRADED', `${field}: ${invalid}`)
    assert.equal(client.getLatency(), null, `${field}: ${invalid}`)
  }
})

test('realtime reconnects, resubscribes, rejects malformed/stale/duplicate/out-of-order data', () => {
  const sockets: FakeSocket[] = []
  const reconnects: Array<() => void> = []
  const client = new RealtimeClient({
    url: production.NEXT_PUBLIC_BFF_WS_URL,
    socketFactory: () => { const socket = new FakeSocket(); sockets.push(socket); return socket },
    scheduleReconnect: (fn) => { reconnects.push(fn); return 1 },
    now: () => Date.parse('2026-08-13T12:00:00.225Z'),
  })
  const books: number[] = []
  client.onOrderBook((book) => books.push(book.deliveryCounter))
  client.subscribeToken('token-1', 'market-1')
  client.connect()
  sockets[0].open()
  assert.equal(client.getState(), 'SNAPSHOT_LOADING')
  assert.match(sockets[0].sent[0], /subscribe/)

  sockets[0].message(envelope(1))
  assert.equal(client.getState(), 'SYNCHRONIZED')
  assert.equal(client.getLatency(), 100)
  sockets[0].message(envelope(1)) // duplicate counter/event
  sockets[0].message(envelope(2, 0)) // stale epoch
  assert.deepEqual(books, [1])

  sockets[0].message(envelope(3)) // gap
  assert.equal(client.getState(), 'RESYNC_REQUIRED')
  assert.equal(books.length, 1)
  sockets[0].message('{bad json')
  assert.equal(client.getState(), 'RESYNC_REQUIRED')

  sockets[0].disconnect()
  assert.equal(reconnects.length, 1)
  reconnects[0]()
  sockets[1].open()
  assert.match(sockets[1].sent[0], /subscribe/)
  sockets[1].message(envelope(1, 2, 'new-epoch'))
  assert.equal(client.getState(), 'SYNCHRONIZED')
})

test('realtime reconciles equal epoch and counters independently per subscription', () => {
  const socket = new FakeSocket()
  const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
  const books: string[] = []
  client.onOrderBook((book) => books.push(`${book.marketId}:${book.tokenId}:${book.deliveryCounter}`))
  client.subscribeToken('token-1', 'market-1')
  client.subscribeToken('token-2', 'market-1')
  client.connect()
  socket.open()

  socket.message(envelope(1, 7, 'shared-event', 'market-1', 'token-1'))
  assert.equal(client.getState(), 'SNAPSHOT_LOADING')
  socket.message(envelope(1, 7, 'shared-event', 'market-1', 'token-2'))

  assert.deepEqual(books, ['market-1:token-1:1', 'market-1:token-2:1'])
  assert.equal(client.getState(), 'SYNCHRONIZED')
})

test('realtime empty subscription set remains uninitialized while connected', () => {
  const socket = new FakeSocket()
  const client = new RealtimeClient({ url: production.NEXT_PUBLIC_BFF_WS_URL, socketFactory: () => socket })
  client.connect()
  assert.equal(client.getState(), 'UNINITIALIZED')
  socket.open()

  assert.equal(client.getState(), 'UNINITIALIZED')
})

test('realtime isolates gaps, stale events, reconnect resets, and exact unsubscribe state', () => {
  const sockets: FakeSocket[] = []
  const reconnects: Array<() => void> = []
  const client = new RealtimeClient({
    url: production.NEXT_PUBLIC_BFF_WS_URL,
    socketFactory: () => { const socket = new FakeSocket(); sockets.push(socket); return socket },
    scheduleReconnect: (fn) => { reconnects.push(fn); return 1 },
  })
  const books: string[] = []
  client.onOrderBook((book) => books.push(`${book.tokenId}:${book.streamEpoch}:${book.deliveryCounter}`))
  client.subscribeToken('token-1', 'market-1')
  client.subscribeToken('token-2', 'market-1')
  client.connect()
  sockets[0].open()
  sockets[0].message(envelope(1, 2, 'snapshot', 'market-1', 'token-1'))
  sockets[0].message(envelope(1, 2, 'snapshot', 'market-1', 'token-2'))

  sockets[0].message(envelope(3, 2, 'gap', 'market-1', 'token-1'))
  assert.equal(client.getState(), 'RESYNC_REQUIRED')
  sockets[0].message(envelope(2, 1, 'stale', 'market-1', 'token-2'))
  sockets[0].message(envelope(2, 2, 'delta', 'market-1', 'token-2'))
  sockets[0].message(envelope(2, 2, 'delta', 'market-1', 'token-2'))
  assert.deepEqual(books, ['token-1:2:1', 'token-2:2:1', 'token-2:2:2'])
  assert.equal(client.getState(), 'RESYNC_REQUIRED')

  sockets[0].disconnect()
  reconnects[0]()
  sockets[1].open()
  assert.equal(sockets[1].sent.filter((message) => message.includes('subscribe')).length, 2)
  sockets[1].message(envelope(1, 2, 'snapshot', 'market-1', 'token-1'))
  assert.equal(client.getState(), 'SNAPSHOT_LOADING')
  sockets[1].message(envelope(1, 2, 'snapshot', 'market-1', 'token-2'))
  assert.equal(client.getState(), 'SYNCHRONIZED')

  client.unsubscribeToken('token-1', 'market-1')
  assert.match(sockets[1].sent.at(-1)!, /unsubscribe/)
  sockets[1].message(envelope(2, 2, 'removed-token', 'market-1', 'token-1'))
  sockets[1].message(envelope(2, 2, 'remaining-token', 'market-1', 'token-2'))
  assert.equal(books.at(-1), 'token-2:2:2')
  assert.equal(client.getState(), 'SYNCHRONIZED')
})

test('production sources contain no direct Gamma/CLOB transport or unconditional simulation', async () => {
  const fs = await import('node:fs/promises')
  const sources = await Promise.all([
    'lib/polymarket-service.ts', 'lib/realtime-client.ts', 'lib/markets-terminal-client.ts',
    'android/app/src/main/java/com/retropick/core/network/BffRuntimeConfig.java',
    'android/app/build.gradle',
  ].map((path) => fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8')))
  const joined = sources.join('\n')
  assert.doesNotMatch(joined, /gamma-api\.polymarket\.com|ws-subscriptions-clob\.polymarket\.com|corsproxy\.io/)
  assert.doesNotMatch(joined, /startSimulationStream|activateSimulationMode/)
})
