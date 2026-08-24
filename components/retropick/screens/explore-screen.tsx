'use client'

import { type Market } from '@/lib/retropick-data'
import { MarketCard } from '../market-card'

export function ExploreScreen({ markets, onOpenMarket }: { markets: Market[]; onOpenMarket: (market: Market) => void }) {
  return <section className="space-y-3 px-4 py-4"><h2 className="text-lg font-bold">Verified markets</h2>{markets.map((market) => <MarketCard key={market.id} market={market} onClick={() => onOpenMarket(market)} />)}</section>
}
