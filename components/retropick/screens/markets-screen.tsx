'use client'

import { useState, useMemo } from 'react'
import { MARKETS, type Market } from '@/lib/retropick-data'
import { MarketCard } from '../market-card'
import { cn } from '@/lib/utils'
import {
  Flame,
  ArrowUpDown,
  CircleDot,
  SlidersHorizontal,
  ListTodo,
  AlignEndHorizontal,
  Gauge,
  Calendar,
  Waypoints,
} from 'lucide-react'

const FILTERS = [
  { id: 'Trending', label: 'Trending', icon: Flame },
  { id: 'DIRECTION', label: 'Direction', icon: ArrowUpDown },
  { id: 'THRESHOLD', label: 'Threshold', icon: CircleDot },
  { id: 'RANGE', label: 'Range', icon: SlidersHorizontal },
  { id: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: ListTodo },
  { id: 'LADDER', label: 'Ladder', icon: AlignEndHorizontal },
  { id: 'VELOCITY', label: 'Velocity', icon: Gauge },
  { id: 'DATE', label: 'Date', icon: Calendar },
  { id: 'CONVERGENCE', label: 'Convergence', icon: Waypoints },
]

export function MarketsScreen({
  onOpenMarket,
  markets = MARKETS,
  selectedCategory,
  onClearCategory,
}: {
  onOpenMarket: (m: Market) => void
  markets?: Market[]
  selectedCategory?: string | null
  onClearCategory?: () => void
}) {
  const [filter, setFilter] = useState('Trending')

  const list = useMemo(() => {
    let result = [...markets]

    // 1. Filter by selected category / subcategory from sidebar or explore
    if (selectedCategory && selectedCategory.trim() !== '') {
      const query = selectedCategory.toLowerCase()
      
      result = result.filter((m) => {
        const cat = (m.category || '').toLowerCase()
        const q = (m.question || '').toLowerCase()
        const type = (m.marketType || '').toLowerCase()
        const optionsMatch = m.options && m.options.some((o) => o.label.toLowerCase().includes(query))
        const tagsMatch = m.tags && m.tags.some((t) => t.toLowerCase().includes(query))

        // Direct Category Match
        if (cat === query || cat.includes(query)) {
          return true
        }

        // Direct Sub-Tag / Symbol Match
        if (tagsMatch || optionsMatch) {
          return true
        }

        // Keyword Match Fallback
        if (query === 'btc' || query === 'bitcoin') return q.includes('btc') || q.includes('bitcoin')
        if (query === 'eth' || query === 'ethereum') return q.includes('eth') || q.includes('ethereum')
        if (query === 'sol' || query === 'solana') return q.includes('sol') || q.includes('solana')
        if (query === 'xrp') return q.includes('xrp')
        if (query === 'nfl') return q.includes('nfl') || q.includes('eagles') || q.includes('chiefs')
        if (query === 'f1' || query === 'formula 1') return q.includes('f1') || q.includes('formula 1')
        if (query === 'soccer' || query === 'football') return q.includes('soccer') || q.includes('football') || q.includes('fc') || q.includes('cup')
        if (query === 'fed' || query === 'fed & rates') return q.includes('fed') || q.includes('rate') || q.includes('powell')
        if (query === 'openai' || query === 'gpt') return q.includes('openai') || q.includes('gpt')
        if (query === 'ev' || query === 'electric vehicles') return q.includes('ev') || q.includes('electric vehicle')
        if (query === 'nvidia' || query === 'nvda') return q.includes('nvidia') || q.includes('nvda')
        if (query === 'apple' || query === 'aapl') return q.includes('apple') || q.includes('aapl')

        return q.includes(query) || type.includes(query)
      })
    }

    // 2. Filter by Polymarket market type filter (Direction, Range, Threshold, etc.)
    if (filter !== 'Trending') {
      const typeMap: Record<string, string> = {
        'DIRECTION': 'UP_OR_DOWN',
        'THRESHOLD': 'THRESHOLD',
        'RANGE': 'RANGE',
        'MULTIPLE_CHOICE': 'MULTIPLE_CHOICE',
        'LADDER': 'LADDER',
        'VELOCITY': 'VELOCITY',
        'DATE': 'DATE',
        'CONVERGENCE': 'CONVERGENCE',
      }
      const targetType = typeMap[filter]
      if (targetType) {
        result = result.filter(m => m.marketType === targetType)
      }
    }

    return result
  }, [markets, selectedCategory, filter])

  return (
    <div className="animate-fade-up flex flex-col pb-36">
      <div className="space-y-3 px-4 pt-1">
        {/* Polymarket-style Filter Tab Bar */}
        <div className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-b border-border/60 bg-background">
          {FILTERS.map((f) => {
            const Icon = f.icon
            const isActive = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex h-9 items-center justify-center gap-2 shrink-0 transition-all duration-150 cursor-pointer rounded-xl border text-xs font-bold shadow-none my-auto",
                  isActive
                    ? "border-border/60 bg-secondary/80 text-foreground px-3.5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30 px-2.5"
                )}
                aria-label={f.label}
              >
                <Icon className={cn("shrink-0 stroke-[2px]", isActive ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground")} />
                {isActive && (
                  <span className="whitespace-nowrap font-display text-xs font-extrabold leading-none">
                    {f.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Natural Flow Markets List */}
        <div className="space-y-3 mt-1">
          {list.length > 0 ? (
            list.map((m) => (
              <MarketCard
                key={m.id}
                market={m}
                onClick={() => onOpenMarket(m)}
              />
            ))
          ) : (
            <div className="text-center py-12 px-4 rounded-2xl border border-border/60 bg-card/50 space-y-3">
              <p className="text-xs font-bold text-foreground">
                No markets found matching "{selectedCategory}"
              </p>
              <p className="text-[11px] text-muted-foreground">
                Try selecting a different category or search term.
              </p>
              {onClearCategory && (
                <button
                  type="button"
                  onClick={onClearCategory}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
                >
                  View All Markets
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
