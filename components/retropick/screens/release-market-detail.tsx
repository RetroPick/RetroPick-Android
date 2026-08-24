'use client'

import { ArrowLeft, Clock } from 'lucide-react'
import type { ReleaseMarket } from '@/lib/release-market'

export function ReleaseMarketDetail({ market, onBack }: { market: ReleaseMarket; onBack: () => void }) {
  return <article className="space-y-5 px-4 py-5"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Markets</button><header className="space-y-2"><p className="text-xs font-bold uppercase text-primary">{market.category}</p><h1 className="text-xl font-bold">{market.question}</h1><p className="text-sm text-muted-foreground">Verified BFF market information. This Android release is read-only.</p></header><section className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 text-sm"><div><p className="text-muted-foreground">Yes probability</p><p className="text-xl font-bold">{market.yesPrice}</p></div><div><p className="text-muted-foreground">Volume</p><p className="text-xl font-bold">{market.volume}</p></div><div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" />{new Date(market.endsAt).toLocaleDateString()}</div><div><p className="text-muted-foreground">Liquidity</p><p className="font-bold">{market.liquidity}</p></div></section></article>
}
