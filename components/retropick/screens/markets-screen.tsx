'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
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
  X,
  Filter,
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

function getMarketCardHeight(m: Market): number {
  if (!m) return 210
  // Base Card Padding + Top Header + Question text + Volume/TimeFooter = ~135px
  let height = 135

  if (m.options && m.options.length > 0) {
    // Each Option row is ~48px + 8px gap
    const count = Math.min(m.options.length, 4)
    height += count * 56 + 10
  } else {
    // Up/Down or Threshold card has 2 big buttons: ~58px
    height += 64
  }

  return height + 14 // +14px gap between cards
}

function useSimpleVirtualizer({
  items,
  parentRef,
  getItemHeight,
  overscan = 5,
}: {
  items: Market[]
  parentRef: React.RefObject<HTMLDivElement | null>
  getItemHeight: (m: Market) => number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(650)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return

    const handleScroll = () => setScrollTop(el.scrollTop)
    const handleResize = () => setContainerHeight(el.clientHeight || 650)

    handleResize()
    el.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [parentRef])

  const offsets = useMemo(() => {
    const arr = [0]
    for (let i = 0; i < items.length; i++) {
      arr.push(arr[i] + getItemHeight(items[i]))
    }
    return arr
  }, [items, getItemHeight])

  const totalSize = offsets[items.length] || 0

  let startIndex = 0
  while (startIndex < items.length && offsets[startIndex + 1] < scrollTop) {
    startIndex++
  }
  startIndex = Math.max(0, startIndex - overscan)

  let endIndex = startIndex
  while (endIndex < items.length && offsets[endIndex] < scrollTop + containerHeight) {
    endIndex++
  }
  endIndex = Math.min(items.length - 1, endIndex + overscan)

  const virtualItems = []
  for (let i = startIndex; i <= endIndex; i++) {
    if (i >= 0 && i < items.length) {
      virtualItems.push({
        index: i,
        key: items[i]?.id || i,
        start: offsets[i],
        size: offsets[i + 1] - offsets[i],
      })
    }
  }

  return {
    getTotalSize: () => totalSize,
    getVirtualItems: () => virtualItems,
  }
}

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
  const parentRef = useRef<HTMLDivElement>(null)

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

  const rowVirtualizer = useSimpleVirtualizer({
    items: list,
    parentRef,
    getItemHeight: getMarketCardHeight,
    overscan: 5,
  })

  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 })
  }, [filter, selectedCategory])

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

        {/* Markets Virtualized List Container */}
        <div className="mt-1">
          {list.length > 0 ? (
            <div
              ref={parentRef}
              className="max-h-[calc(100vh-210px)] overflow-y-auto no-scrollbar pr-0.5"
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const m = list[virtualRow.index]
                  if (!m) return null
                  return (
                    <div
                      key={virtualRow.key}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="pb-3"
                    >
                      <MarketCard
                        market={m}
                        onClick={() => onOpenMarket(m)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
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
