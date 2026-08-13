export const controlEnvelope = (eventType: 'hello' | 'subscribed' | 'unsubscribed' | 'error', marketId = '', tokenId = '') => ({
  schemaVersion: '1',
  eventType,
  ...(marketId ? { marketId } : {}),
  ...(tokenId ? { tokenId } : {}),
  sequence: null,
  payload: eventType === 'error' ? { code: 'upstream_unavailable', message: 'try later' } : { status: eventType === 'hello' ? 'connected' : 'ok' },
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
  payload: eventType.startsWith('orderbook.') ? { bids: [], asks: [] } : {},
  ...overrides,
})