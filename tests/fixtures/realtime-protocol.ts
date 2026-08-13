export const controlEnvelope = (eventType: 'hello' | 'subscribed' | 'unsubscribed' | 'error', marketId = '', tokenId = '') => ({
  schemaVersion: '1',
  eventType,
  ...(marketId ? { marketId } : {}),
  ...(tokenId ? { tokenId } : {}),
  sequence: null,
  payload: eventType === 'error' ? { code: 'upstream_unavailable', message: 'try later' } : { status: eventType === 'hello' ? 'connected' : 'ok' },
})

// Mechanically mirrors encoding/json output for marketdata.Delta at backend
// dfdd1a84: Delta has no json tags, so its exported Go field names are retained.
export const canonicalOrderBookDeltaPayload = (
  overrides: Record<string, unknown> = {},
) => ({
  BaseHash: 'hash-1',
  NextHash: 'hash-2',
  Timestamp: '2026-08-13T12:00:00.500Z',
  Side: 'bid',
  Price: '0.4',
  Size: '4',
  ...overrides,
})

export const dataEnvelope = (
  eventType: 'orderbook.snapshot' | 'orderbook.delta' | 'trade.executed' | 'market.tick_size_changed' |
    'market.updated' | 'signal.created' | 'signal.retracted' | 'resync.required',
  counter: number,
  overrides: Record<string, unknown> = {},
) => ({
  schemaVersion: '1',
  eventId: `event-${counter}`,
  eventType,
  source: 'retropick',
  marketId: 'market-1',
  upstreamId: 'token-1',
  tokenId: 'token-1',
  sequence: null,
  streamEpoch: 1,
  deliveryCounter: counter,
  observedAt: '2026-08-13T12:00:00.125Z',
  publishedAt: '2026-08-13T12:00:00.250Z',
  payload: eventType === 'orderbook.snapshot'
    ? { hash: 'hash-1', timestamp: '2026-08-13T12:00:00.125Z', bids: [], asks: [] }
    : eventType === 'orderbook.delta' ? canonicalOrderBookDeltaPayload() : {},
  ...overrides,
})