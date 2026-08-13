import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveRuntimeConfig, RuntimeConfigurationError } from '../lib/runtime-config.ts'
import { MarketsTerminalClient } from '../lib/markets-terminal-client.ts'
import { RealtimeClient, type WebSocketLike } from '../lib/realtime-client.ts'

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

function envelope(counter: number, epoch = 1, eventId = `event-${counter}`) {
  return {
    schemaVersion: '1.0', eventId, eventType: counter === 1 ? 'orderbook.snapshot' : 'orderbook.delta',
    marketId: 'market-1', tokenId: 'token-1', streamEpoch: epoch, deliveryCounter: counter,
    observedAt: 900, requestId: `req-${counter}`, payload: { bids: [], asks: [] },
  }
}

test('realtime reconnects, resubscribes, rejects malformed/stale/duplicate/out-of-order data', () => {
  const sockets: FakeSocket[] = []
  const reconnects: Array<() => void> = []
  const client = new RealtimeClient({
    url: production.NEXT_PUBLIC_BFF_WS_URL,
    socketFactory: () => { const socket = new FakeSocket(); sockets.push(socket); return socket },
    scheduleReconnect: (fn) => { reconnects.push(fn); return 1 },
    now: () => 1000,
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
  assert.notEqual(client.getState(), 'SYNCHRONIZED')

  sockets[0].disconnect()
  assert.equal(reconnects.length, 1)
  reconnects[0]()
  sockets[1].open()
  assert.match(sockets[1].sent[0], /subscribe/)
  sockets[1].message(envelope(1, 2, 'new-epoch'))
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
