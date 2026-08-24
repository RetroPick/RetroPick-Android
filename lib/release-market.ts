export type ReleaseMarket = {
  id: string
  question: string
  category: string
  yesPrice: string
  volume: string
  liquidity: string
  endsAt: string
  realtimeTokenId: string
}

export class MarketDataUnavailableError extends Error {
  constructor(message: string) { super(`Market data is unavailable: ${message}`); this.name = 'MarketDataUnavailableError' }
}

const fixedPoint = /^(0|[1-9][0-9]*)(?:\.[0-9]+)?$/
const canonicalId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/
const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const parseArray = (value: unknown, field: string): unknown[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try { const parsed: unknown = JSON.parse(value); if (Array.isArray(parsed)) return parsed } catch { /* fail below */ }
  }
  throw new MarketDataUnavailableError(`${field} is malformed`)
}
const positiveFixedPoint = (value: unknown, field: string) => {
  if (!nonEmptyString(value) || !fixedPoint.test(value) || Number(value) < 0) throw new MarketDataUnavailableError(`${field} is malformed`)
  return value
}

function recordToMarket(value: unknown): ReleaseMarket {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MarketDataUnavailableError('market record is malformed')
  const record = value as Record<string, unknown>
  const id = record.id
  const question = record.question
  const category = record.category
  const realtimeTokenId = record.tokenId
  const endsAt = record.endDate
  if (!nonEmptyString(id) || !canonicalId.test(id) || !nonEmptyString(question) || !nonEmptyString(category) ||
      !nonEmptyString(realtimeTokenId) || !canonicalId.test(realtimeTokenId) || !nonEmptyString(endsAt) || !Number.isFinite(Date.parse(endsAt))) {
    throw new MarketDataUnavailableError('market record has missing required fields')
  }
  const outcomes = parseArray(record.outcomes, 'outcomes')
  const prices = parseArray(record.outcomePrices, 'outcomePrices')
  if (outcomes.length < 2 || outcomes.length !== prices.length || !outcomes.every(nonEmptyString)) throw new MarketDataUnavailableError('outcomes are malformed')
  const yesIndex = outcomes.findIndex((outcome) => outcome.toLowerCase() === 'yes')
  if (yesIndex < 0) throw new MarketDataUnavailableError('yes outcome is required')
  const yesPrice = positiveFixedPoint(prices[yesIndex], 'outcome price')
  if (Number(yesPrice) > 1) throw new MarketDataUnavailableError('outcome price is outside the probability range')
  const volume = positiveFixedPoint(record.volume, 'volume')
  const liquidity = positiveFixedPoint(record.liquidity, 'liquidity')
  return { id, question: question.trim(), category: category.trim(), yesPrice, volume, liquidity, endsAt, realtimeTokenId }
}

export async function fetchReleaseMarkets(bffUrl: string | undefined = process.env.NEXT_PUBLIC_BFF_HTTP_URL): Promise<ReleaseMarket[]> {
  if (!bffUrl) throw new MarketDataUnavailableError('BFF URL is missing')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(`${bffUrl.replace(/\/$/, '')}/markets`, { credentials: 'include', signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new MarketDataUnavailableError(`BFF returned HTTP ${response.status}`)
    const payload: unknown = await response.json()
    const records = Array.isArray(payload) ? payload : null
    if (!records || records.length === 0) throw new MarketDataUnavailableError('BFF response is empty or malformed')
    return records.map(recordToMarket)
  } catch (error) {
    if (error instanceof MarketDataUnavailableError) throw error
    throw new MarketDataUnavailableError(error instanceof Error ? error.message : 'request failed')
  } finally { clearTimeout(timeout) }
}
