'use client'

import { useEffect, useState } from 'react'
import { type Market } from '@/lib/retropick-data'
import { MarketsTerminalClient } from '@/lib/markets-terminal-client'
import { fetchLivePolymarketMarkets } from '@/lib/polymarket-service'
import { loadRuntimeConfig } from '@/lib/runtime-config-loader'
import { TopBar } from './top-bar'
import { BottomNav, type Tab } from './bottom-nav'
import { DrawerMenu } from './drawer-menu'
import { MarketsScreen } from './screens/markets-screen'
import { MarketDetail } from './screens/market-detail'
import { ExploreScreen } from './screens/explore-screen'
import { PortfolioScreen } from './screens/portfolio-screen'
import { IntelligenceScreen } from './screens/intelligence-screen'

const TITLES: Record<Tab, string> = {
  explore: 'Explore',
  markets: 'Markets',
  intelligence: 'Intelligence',
  portfolio: 'Portfolio',
}

export function AppShell() {
  const [tab, setTab] = useState<Tab>('explore')
  const [detail, setDetail] = useState<Market | null>(null)
  const [categoryDetail, setCategoryDetail] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [dark, setDark] = useState(true)
  const [markets, setMarkets] = useState<Market[]>([])
  const [ready, setReady] = useState(false)
  const [unavailableReason, setUnavailableReason] = useState('Connecting to the RetroPick service…')

  useEffect(() => {
    let active = true
    async function initializeFromBff() {
      try {
        const runtimeConfig = await loadRuntimeConfig()
        if (runtimeConfig.demoSimulation) throw new Error('Simulation configuration is not permitted for this entrypoint')
        const client = new MarketsTerminalClient({ httpUrl: runtimeConfig.httpUrl })
        const [capabilities, eligibility, liveMarkets] = await Promise.all([
          client.fetchCapabilitiesFromBff(),
          client.fetchEligibilityFromBff(),
          fetchLivePolymarketMarkets(runtimeConfig.httpUrl),
        ])
        const readable = capabilities.health.availability === 'available' && capabilities.features.realtime && eligibility.health.availability === 'available'
        if (!readable) throw new Error('BFF capabilities, eligibility, or realtime state is unavailable')
        if (!active) return
        setMarkets(liveMarkets)
        setReady(true)
      } catch {
        if (active) {
          setReady(false)
          setUnavailableReason('Market data is unavailable. Account, portfolio, deposits, and trading remain disabled until the RetroPick BFF verifies service state.')
        }
      }
    }
    initializeFromBff()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.classList.toggle('light', !dark)
  }, [dark])

  if (!ready) {
    return <main className="grid min-h-screen place-items-center bg-[#05070a] p-6 text-center text-foreground">
      <section className="max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
        <h1 className="text-lg font-bold text-amber-300">RetroPick unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{unavailableReason}</p>
      </section>
    </main>
  }

  const openMarket = (market: Market) => { setDetail(market); setCategoryDetail(null) }
  const resetNavigation = (next: Tab) => { setTab(next); setDetail(null); setCategoryDetail(null); setDrawer(false) }

  return <div className="grid min-h-screen place-items-center bg-[#05070a] p-0 sm:p-6">
    <div className="relative h-screen w-full max-w-[420px] overflow-hidden bg-background sm:h-[860px] sm:rounded-[38px] sm:border-[10px] sm:border-[#05070a] sm:shadow-2xl">
      <div className={`relative flex h-full flex-col bg-background text-foreground ${dark ? 'dark' : 'light'}`}>
        <TopBar title={detail ? 'Market Detail' : TITLES[tab]} onMenu={() => setDrawer(true)} activeTab={tab} onTabChange={resetNavigation} authenticated={false} walletConnected={false} walletAddress="" walletProvider="" userEmail="" onConnect={() => undefined} onDisconnect={() => undefined} onNotifications={() => undefined} hasUnread={false} />
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-[11px] font-bold text-amber-400">Read-only market data from the RetroPick BFF. Trading, wallet, deposits, and portfolio are unavailable.</div>
        <main className="no-scrollbar flex-1 overflow-y-auto">
          {detail ? <MarketDetail market={detail} balance={0} positions={[]} sourceCategory={tab === 'explore' ? 'Trending' : (detail.category || 'Markets')} onBack={() => setDetail(null)} onTrade={() => undefined} onExecuteTrade={() => undefined} onSetAlert={() => undefined} onSelectMarket={openMarket} /> : <>
            {tab === 'explore' && <ExploreScreen onOpenMarket={openMarket} markets={markets} onSelectCategory={(category) => { setTab('markets'); setCategoryDetail(category) }} />}
            {tab === 'markets' && <MarketsScreen onOpenMarket={openMarket} markets={markets} selectedCategory={categoryDetail} onClearCategory={() => setCategoryDetail(null)} />}
            {tab === 'intelligence' && <IntelligenceScreen onSelectMarket={(marketId) => { const market = markets.find((candidate) => candidate.id === marketId); if (market) openMarket(market) }} onEnableWhaleAlerts={async () => false} />}
            {tab === 'portfolio' && <PortfolioScreen balance={0} positions={[]} activity={[]} authenticated={false} walletConnected={false} onConnect={() => undefined} onOpenAddFunds={() => undefined} walletAddress="" />}
          </>}
        </main>
        <BottomNav active={tab} onChange={resetNavigation} />
        <DrawerMenu open={drawer} onClose={() => setDrawer(false)} dark={dark} markets={markets} onToggleTheme={() => setDark((value) => !value)} onSelectExplore={() => resetNavigation('explore')} onSelectCategory={(category) => { setTab('markets'); setCategoryDetail(category); setDetail(null); setDrawer(false) }} onSubCategoryClick={(category) => { setTab('markets'); setCategoryDetail(category); setDetail(null); setDrawer(false) }} onNavigatePortfolio={() => resetNavigation('portfolio')} />
      </div>
    </div>
  </div>
}
