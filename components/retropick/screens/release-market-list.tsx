'use client'

import { useMemo, useState } from 'react'
import type { ReleaseMarket } from '@/lib/release-market'

export function ReleaseMarketList({ markets, onOpenMarket }: { markets: ReleaseMarket[]; onOpenMarket: (market: ReleaseMarket) => void }) {
  const [query, setQuery] = useState('')
  const visible = useMemo(() => markets.filter((market) => `${market.question} ${market.category}`.toLowerCase().includes(query.trim().toLowerCase())), [markets, query])
  return <section className="space-y-3 px-4 py-4"><label className="block text-sm font-semibold" htmlFor="market-search">Markets</label><input id="market-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter verified BFF markets" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />{visible.map((market) => <button type="button" key={market.id} onClick={() => onOpenMarket(market)} className="w-full rounded-xl border border-border bg-card p-4 text-left"><p className="text-xs font-bold uppercase text-primary">{market.category}</p><h2 className="mt-1 font-semibold">{market.question}</h2><p className="mt-2 text-sm text-muted-foreground">Yes {market.yesPrice} · BFF read-only data</p></button>)}{visible.length === 0 && <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">No verified BFF markets match this filter.</p>}</section>
}
