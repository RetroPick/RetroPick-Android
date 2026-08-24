'use client'

import { useEffect, useState } from 'react'
import type { ReleaseMarket } from '@/lib/release-market'
import { fetchReleaseMarkets } from '@/lib/release-market'
import { MarketsTerminalClient } from '@/lib/markets-terminal-client'
import { RealtimeClient } from '@/lib/realtime-client'
import { bindReleaseReadiness } from '@/lib/release-readiness'
import { loadRuntimeConfig } from '@/lib/runtime-config-loader'
import { ReleaseMarketList } from './screens/release-market-list'
import { ReleaseMarketDetail } from './screens/release-market-detail'

export function AppShell() {
  const [detail, setDetail] = useState<ReleaseMarket | null>(null)
  const [markets, setMarkets] = useState<ReleaseMarket[]>([])
  const [ready, setReady] = useState(false)
  const [unavailableReason, setUnavailableReason] = useState('Connecting to the RetroPick service…')

  useEffect(() => {
    let active = true
    let realtime: RealtimeClient | null = null
    let stopStateListener: (() => void) | null = null
    const failClosed = () => {
      if (!active) return
      setReady(false)
      setUnavailableReason('Verified BFF market data and synchronized realtime state are required. Trading, wallets, accounts, and portfolios are unavailable.')
    }
    async function initializeFromBff() {
      try {
        const runtimeConfig = await loadRuntimeConfig()
        if (runtimeConfig.demoSimulation) throw new Error('Simulation configuration is not permitted for this entrypoint')
        const terminal = new MarketsTerminalClient({ httpUrl: runtimeConfig.httpUrl })
        const [capabilities, eligibility, liveMarkets] = await Promise.all([
          terminal.fetchCapabilitiesFromBff(), terminal.fetchEligibilityFromBff(), fetchReleaseMarkets(runtimeConfig.httpUrl),
        ])
        if (capabilities.health.availability !== 'available' || !capabilities.features.realtime || eligibility.health.availability !== 'available') throw new Error('BFF capabilities or eligibility is unavailable')
        const verifiedMarket = liveMarkets.find((market) => market.realtimeTokenId)
        if (!verifiedMarket) throw new Error('BFF market data has no realtime token')
        realtime = new RealtimeClient({ url: runtimeConfig.wsUrl })
        stopStateListener = bindReleaseReadiness(realtime, (isReady) => {
          if (!active) return
          if (!isReady) { failClosed(); return }
          setMarkets(liveMarkets)
          setReady(true)
        })
        realtime.subscribeToken(verifiedMarket.realtimeTokenId, verifiedMarket.id)
        realtime.connect()
      } catch { failClosed() }
    }
    initializeFromBff()
    return () => { active = false; stopStateListener?.(); realtime?.dispose() }
  }, [])

  if (!ready) return <main className="grid min-h-screen place-items-center bg-[#05070a] p-6 text-center text-foreground"><section className="max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 p-5"><h1 className="text-lg font-bold text-amber-300">RetroPick unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{unavailableReason}</p></section></main>
  return <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col bg-background text-foreground"><header className="border-b border-border px-4 py-4"><h1 className="text-lg font-bold">RetroPick Markets</h1><p className="text-xs text-muted-foreground">Verified read-only data from the RetroPick BFF</p></header><main className="flex-1 overflow-y-auto">{detail ? <ReleaseMarketDetail market={detail} onBack={() => setDetail(null)} /> : <ReleaseMarketList markets={markets} onOpenMarket={setDetail} />}</main></div>
}
