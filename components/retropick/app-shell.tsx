'use client'

import { useEffect, useState } from 'react'
import { type Market } from '@/lib/retropick-data'
import { MarketsTerminalClient } from '@/lib/markets-terminal-client'
import { fetchLivePolymarketMarkets } from '@/lib/polymarket-service'
import { RealtimeClient } from '@/lib/realtime-client'
import { loadRuntimeConfig } from '@/lib/runtime-config-loader'
import { MarketsScreen } from './screens/markets-screen'
import { MarketDetail } from './screens/market-detail'

async function awaitRealtimeVerification(client: RealtimeClient, timeoutMs = 8000): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let stop: () => void = () => {}
    const timeout = window.setTimeout(() => {
      stop()
      reject(new Error('Realtime verification timed out'))
    }, timeoutMs)
    stop = client.onStateChange((state) => {
      if (state === 'SYNCHRONIZED') {
        window.clearTimeout(timeout)
        stop()
        resolve()
      } else if (state === 'DEGRADED' || state === 'RESYNC_REQUIRED') {
        window.clearTimeout(timeout)
        stop()
        reject(new Error(`Realtime verification failed: ${state}`))
      }
    })
  })
}

export function AppShell() {
  const [detail, setDetail] = useState<Market | null>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [ready, setReady] = useState(false)
  const [unavailableReason, setUnavailableReason] = useState('Connecting to the RetroPick service…')

  useEffect(() => {
    let active = true
    let realtime: RealtimeClient | null = null
    async function initializeFromBff() {
      try {
        const runtimeConfig = await loadRuntimeConfig()
        if (runtimeConfig.demoSimulation) throw new Error('Simulation configuration is not permitted for this entrypoint')
        const terminal = new MarketsTerminalClient({ httpUrl: runtimeConfig.httpUrl })
        const [capabilities, eligibility, liveMarkets] = await Promise.all([
          terminal.fetchCapabilitiesFromBff(),
          terminal.fetchEligibilityFromBff(),
          fetchLivePolymarketMarkets(runtimeConfig.httpUrl),
        ])
        const readable = capabilities.health.availability === 'available' && capabilities.features.realtime && eligibility.health.availability === 'available'
        if (!readable) throw new Error('BFF capabilities or eligibility is unavailable')
        if (liveMarkets.length === 0) throw new Error('BFF returned no verified market data')
        const verifiedMarket = liveMarkets.find((market) => market.realtimeTokenId)
        if (!verifiedMarket?.realtimeTokenId) throw new Error('BFF market data has no realtime token')
        realtime = new RealtimeClient({ url: runtimeConfig.wsUrl })
        realtime.subscribeToken(verifiedMarket.realtimeTokenId, verifiedMarket.id)
        realtime.connect()
        await awaitRealtimeVerification(realtime)
        if (!active) return
        setMarkets(liveMarkets)
        setReady(true)
      } catch {
        if (active) {
          setReady(false)
          setUnavailableReason('Verified BFF market data and realtime state are required. Trading, wallets, accounts, and portfolios are unavailable.')
        }
      }
    }
    initializeFromBff()
    return () => { active = false; realtime?.disconnect() }
  }, [])

  if (!ready) return <main className="grid min-h-screen place-items-center bg-[#05070a] p-6 text-center text-foreground"><section className="max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 p-5"><h1 className="text-lg font-bold text-amber-300">RetroPick unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{unavailableReason}</p></section></main>

  return <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col bg-background text-foreground"><header className="border-b border-border px-4 py-4"><h1 className="text-lg font-bold">RetroPick Markets</h1><p className="text-xs text-muted-foreground">Verified read-only data from the RetroPick BFF</p></header><main className="flex-1 overflow-y-auto">{detail ? <MarketDetail market={detail} onBack={() => setDetail(null)} /> : <MarketsScreen markets={markets} onOpenMarket={setDetail} />}</main></div>
}
