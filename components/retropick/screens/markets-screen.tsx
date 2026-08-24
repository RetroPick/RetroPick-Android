'use client'

import { useMemo, useState } from 'react'
import { type Market } from '@/lib/retropick-data'
import { MarketCard } from '../market-card'

export function MarketsScreen({ markets, onOpenMarket }: { markets: Market[]; onOpenMarket: (market: Market) => void }) {
  const [query, setQuery] = useState('')
  const visibleMarkets = useMemo(() => markets.filter((market) => `${market.question} ${market.category}`.toLowerCase().includes(query.trim().toLowerCase())), [markets, query])
  return <section className="space-y-3 px-4 py-4"><label className="block text-sm font-semibold" htmlFor="market-search">Markets</label><input id="market-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter verified BFF markets" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />{visibleMarkets.map((market) => <MarketCard key={market.id} market={market} onClick={() => onOpenMarket(market)} />)}{visibleMarkets.length === 0 && <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">No verified BFF markets match this filter.</p>}</section>
}
