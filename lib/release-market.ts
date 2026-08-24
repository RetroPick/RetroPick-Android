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
const rfc3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/
const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const compareFixedPoint = (left: string, right: string) => {
  const [leftWhole, leftFraction = ''] = left.split('.')
  const [rightWhole, rightFraction = ''] = right.split('.')
  if (leftWhole.length !== rightWhole.length) return leftWhole.length < rightWhole.length ? -1 : 1
  if (leftWhole !== rightWhole) return leftWhole < rightWhole ? -1 : 1
  const width = Math.max(leftFraction.length, rightFraction.length)
  const a = leftFraction.padEnd(width, '0'); const b = rightFraction.padEnd(width, '0')
  return a === b ? 0 : a < b ? -1 : 1
}
const isCanonicalRfc3339 = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const match = rfc3339.exec(value)
  if (!match || !Number.isFinite(Date.parse(value))) return false
  const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] = match
  const daysInMonth = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate()
  return Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= daysInMonth &&
    Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59 &&
    (offsetHour === undefined || (Number(offsetHour) <= 23 && Number(offsetMinute) <= 59))
}
const parseArray = (value: unknown, field: string): unknown[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try { const parsed: unknown = JSON.parse(value); if (Array.isArray(parsed)) return parsed } catch { /* fail below */ }
  }
  throw new MarketDataUnavailableError(`${field} is malformed`)
}
const fixedPointValue = (value: unknown, field: string, max?: string) => {
  if (!nonEmptyString(value) || !fixedPoint.test(value) || (max !== undefined && compareFixedPoint(value, max) > 0)) {
    throw new MarketDataUnavailableError(`${field} is malformed`)
  }
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
      !nonEmptyString(realtimeTokenId) || !canonicalId.test(realtimeTokenId) || !isCanonicalRfc3339(endsAt)) {
    throw new MarketDataUnavailableError('market record has missing required fields')
  }
  const outcomes = parseArray(record.outcomes, 'outcomes')
  const prices = parseArray(record.outcomePrices, 'outcomePrices')
  if (outcomes.length < 2 || outcomes.length !== prices.length || !outcomes.every(nonEmptyString)) throw new MarketDataUnavailableError('outcomes are malformed')
  const validatedPrices = prices.map((price) => fixedPointValue(price, 'outcome price', '1'))
  const yesIndex = outcomes.findIndex((outcome) => outcome.toLowerCase() === 'yes')
  if (yesIndex < 0) throw new MarketDataUnavailableError('yes outcome is required')
  const yesPrice = validatedPrices[yesIndex]
  const volume = fixedPointValue(record.volume, 'volume')
  const liquidity = fixedPointValue(record.liquidity, 'liquidity')
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
