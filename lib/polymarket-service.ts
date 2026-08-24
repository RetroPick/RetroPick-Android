import { fetchReleaseMarkets, type ReleaseMarket } from './release-market.ts'

export type MarketCategoryEnum = 'Sports' | 'Crypto' | 'AI' | 'Climate' | 'Economics' | 'Tech' | 'Finance' | 'Science' | 'Stocks'

export function classifyMarketCategory(question = '', originalCategory = '', tags: string[] = [], eventTitle = '', slug = ''): MarketCategoryEnum {
  const text = [question, originalCategory, ...tags, eventTitle, slug].join(' ').toLowerCase()
  if (/biology|medicine|physics|space/.test(text)) return 'Science'
  if (/shares|equity|nyse|nasdaq|stock/.test(text)) return 'Stocks'
  if (/bitcoin|btc|ethereum|eth|solana|crypto/.test(text)) return 'Crypto'
  if (/nba|nfl|soccer|tennis|sport/.test(text)) return 'Sports'
  if (/openai|artificial intelligence|\bai\b/.test(text)) return 'AI'
  if (/climate|carbon|renewable/.test(text)) return 'Climate'
  if (/inflation|federal reserve|\bfed\b|gdp/.test(text)) return 'Economics'
  if (/chip|quantum|spacex|electric vehicle/.test(text)) return 'Tech'
  return 'Finance'
}

export function extractSubTags(question = '', category: MarketCategoryEnum = 'Finance'): string[] {
  return [category, ...(/bitcoin|btc/i.test(question) ? ['Bitcoin'] : [])]
}

/** Compatibility export for the release entrypoint; it never imports fixture data. */
export async function fetchLivePolymarketMarkets(bffUrl?: string): Promise<ReleaseMarket[]> {
  return fetchReleaseMarkets(bffUrl)
}
