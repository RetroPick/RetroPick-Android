'use client'

import { useState } from 'react'
import {
  Activity,
  Trophy,
  Wallet,
  Search,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Copy,
  Zap,
  Info,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock Data for Whale Trade Feed
const WHALE_FEEDS = [
  {
    id: 'wf-1',
    wallet: '0x71C...89A',
    ens: 'whale_alpha.eth',
    type: 'BUY',
    outcome: 'YES',
    marketTitle: 'Bitcoin above $70,000 on July 24?',
    price: '51¢',
    amountUsdc: '$12,500.00',
    shares: '24,509',
    time: '2 mins ago',
    txHash: '0x3a8...91f',
    badge: '🐋 Mega Whale'
  },
  {
    id: 'wf-2',
    wallet: '0x49B...12C',
    ens: 'satoshi_vault.eth',
    type: 'BUY',
    outcome: 'NO',
    marketTitle: 'Fed Decision in July: No change?',
    price: '71¢',
    amountUsdc: '$8,400.00',
    shares: '11,830',
    time: '8 mins ago',
    txHash: '0x9f1...44a',
    badge: '🧠 Smart Money'
  },
  {
    id: 'wf-3',
    wallet: '0x12F...99E',
    ens: 'macro_god.eth',
    type: 'SELL',
    outcome: 'YES',
    marketTitle: 'Formula 1 2026 Drivers Champion: Max Verstappen?',
    price: '54¢',
    amountUsdc: '$5,000.00',
    shares: '9,259',
    time: '15 mins ago',
    txHash: '0x7b2...01c',
    badge: '🎯 High Win-Rate'
  },
  {
    id: 'wf-4',
    wallet: '0x88A...31B',
    ens: 'polymarket_king.eth',
    type: 'BUY',
    outcome: 'YES',
    marketTitle: 'Clarity Act (H.R.3633) signed into law in 2026?',
    price: '18¢',
    amountUsdc: '$15,000.00',
    shares: '83,333',
    time: '24 mins ago',
    txHash: '0x11c...77e',
    badge: '🐋 Mega Whale'
  }
]

// Mock Data for Smart Money Leaderboard
const LEADERBOARD_TRADERS = [
  {
    rank: 1,
    wallet: '0x71C...89A',
    ens: 'whale_alpha.eth',
    winRate: 84.2,
    pnl: '+$142,500.00',
    roi: '+284.5%',
    volume: '$480,000',
    badge: '🐋 Mega Whale',
    followers: 1240
  },
  {
    rank: 2,
    wallet: '0x49B...12C',
    ens: 'satoshi_vault.eth',
    winRate: 79.5,
    pnl: '+$98,400.00',
    roi: '+192.0%',
    volume: '$310,000',
    badge: '🧠 Smart Money',
    followers: 890
  },
  {
    rank: 3,
    wallet: '0x12F...99E',
    ens: 'macro_god.eth',
    winRate: 76.8,
    pnl: '+$75,200.00',
    roi: '+154.3%',
    volume: '$220,000',
    badge: '🎯 High Win-Rate',
    followers: 650
  },
  {
    rank: 4,
    wallet: '0x88A...31B',
    ens: 'polymarket_king.eth',
    winRate: 73.1,
    pnl: '+$54,100.00',
    roi: '+118.9%',
    volume: '$195,000',
    badge: '⚡ High Volume',
    followers: 430
  }
]

export function IntelligenceScreen({
  onSelectMarket
}: {
  onSelectMarket?: (marketId: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'feed' | 'leaderboard' | 'paper' | 'search'>('feed')
  const [searchQuery, setSearchQuery] = useState('')
  const [followingWallets, setFollowingWallets] = useState<string[]>(['0x71C...89A'])
  const [selectedWalletModal, setSelectedWalletModal] = useState<any>(null)
  
  // Paper Copy Trading Virtual State ($10,000 Virtual USD)
  const [virtualBalance, setVirtualBalance] = useState<number>(10000)
  const [copyPositions, setCopyPositions] = useState([
    {
      id: 'cp-1',
      trader: 'whale_alpha.eth',
      market: 'Bitcoin above $70,000 on July 24?',
      side: 'YES (51¢)',
      amount: '$1,000.00',
      pnl: '+$240.00 (+24%)'
    },
    {
      id: 'cp-2',
      trader: 'satoshi_vault.eth',
      market: 'Fed Decision in July: No change?',
      side: 'NO (71¢)',
      amount: '$500.00',
      pnl: '+$95.00 (+19%)'
    }
  ])

  const toggleFollow = (wallet: string) => {
    if (followingWallets.includes(wallet)) {
      setFollowingWallets(prev => prev.filter(w => w !== wallet))
    } else {
      setFollowingWallets(prev => [...prev, wallet])
    }
  }

  return (
    <div className="relative flex flex-col h-full bg-background animate-fade-up px-4 pb-32 pt-3 space-y-4 text-foreground overflow-y-auto min-h-0 no-scrollbar">
      
      {/* Top Banner Header */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-bold text-indigo-300">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Smart Money V1 Active
            </span>
            <h1 className="text-base font-extrabold text-white flex items-center gap-1.5">
              Trader Intelligence
            </h1>
            <p className="text-xs text-slate-300">
              Track Whale orders, Smart Money rankings & copy trades.
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg shadow-inner">
            🧠
          </div>
        </div>
      </div>

      {/* 4 Navigation Sub-Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-secondary/30 rounded-xl border border-border/60">
        <button
          onClick={() => setActiveTab('feed')}
          className={cn(
            "py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex flex-col items-center gap-1",
            activeTab === 'feed'
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Whale Feed</span>
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={cn(
            "py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex flex-col items-center gap-1",
            activeTab === 'leaderboard'
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Leaderboard</span>
        </button>
        <button
          onClick={() => setActiveTab('paper')}
          className={cn(
            "py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex flex-col items-center gap-1",
            activeTab === 'paper'
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Paper Copy</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={cn(
            "py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex flex-col items-center gap-1",
            activeTab === 'search'
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </button>
      </div>

      {/* TAB 1: WHALE ACTIVITY FEED */}
      {activeTab === 'feed' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Live Large Trade Stream (&ge; $1,000)
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Realtime
            </span>
          </div>

          <div className="space-y-2.5">
            {WHALE_FEEDS.map((feed) => (
              <div
                key={feed.id}
                className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-sm hover:border-indigo-500/40 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedWalletModal(feed)}
                      className="font-mono text-xs font-bold text-indigo-400 hover:underline"
                    >
                      {feed.ens || feed.wallet}
                    </button>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-800 text-[10px] font-bold text-indigo-300">
                      {feed.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold">{feed.time}</span>
                </div>

                <p className="text-xs font-bold text-foreground line-clamp-1">
                  {feed.marketTitle}
                </p>

                <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-black border",
                      feed.type === 'BUY'
                        ? "bg-emerald-950/80 border-emerald-800 text-emerald-400"
                        : "bg-rose-950/80 border-rose-800 text-rose-400"
                    )}>
                      {feed.type} {feed.outcome} ({feed.price})
                    </span>
                    <span className="text-muted-foreground font-mono">({feed.shares} shares)</span>
                  </div>
                  <span className="font-extrabold text-foreground font-mono">{feed.amountUsdc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SMART MONEY LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Top Profitable Whales & Traders
            </span>
            <span className="text-[10px] text-muted-foreground">Updated hourly</span>
          </div>

          <div className="space-y-2.5">
            {LEADERBOARD_TRADERS.map((trader) => (
              <div
                key={trader.rank}
                className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs font-mono",
                      trader.rank === 1 ? "bg-amber-500 text-black" :
                      trader.rank === 2 ? "bg-slate-300 text-black" :
                      trader.rank === 3 ? "bg-amber-700 text-white" : "bg-slate-800 text-slate-300"
                    )}>
                      #{trader.rank}
                    </div>
                    <div>
                      <button
                        onClick={() => setSelectedWalletModal(trader)}
                        className="font-mono text-xs font-bold text-foreground hover:text-indigo-400 text-left block"
                      >
                        {trader.ens || trader.wallet}
                      </button>
                      <span className="text-[10px] text-muted-foreground">{trader.badge}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleFollow(trader.wallet)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition border",
                      followingWallets.includes(trader.wallet)
                        ? "bg-emerald-950/80 border-emerald-700 text-emerald-400"
                        : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                    )}
                  >
                    {followingWallets.includes(trader.wallet) ? 'Following ✓' : '+ Follow'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-secondary/20 p-2.5 rounded-xl border border-border/40 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Win Rate</span>
                    <span className="font-extrabold text-emerald-400 font-mono">{trader.winRate}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Net PnL</span>
                    <span className="font-extrabold text-sky-400 font-mono">{trader.pnl}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">ROI</span>
                    <span className="font-extrabold text-indigo-400 font-mono">{trader.roi}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PAPER COPY TRADING ($10,000 USD VIRTUAL) */}
      {activeTab === 'paper' && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Virtual Wallet Card */}
          <div className="p-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 space-y-2">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
              <span>Virtual Portfolio Simulator</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] font-bold">Risk-Free</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white font-mono">${virtualBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span className="text-xs font-bold text-emerald-400">+$335.00 (+3.35%)</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Auto-replicates orders from your followed Smart Money wallets.
            </p>
          </div>

          {/* Active Copy Positions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Active Copy Positions
            </h4>

            {copyPositions.map((pos) => (
              <div key={pos.id} className="p-3 rounded-xl border border-border/80 bg-card space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-foreground">
                  <span className="text-indigo-400 font-mono">@{pos.trader}</span>
                  <span className="text-emerald-400 font-mono">{pos.pnl}</span>
                </div>
                <p className="text-muted-foreground font-semibold line-clamp-1">{pos.market}</p>
                <div className="flex justify-between text-[11px] border-t border-border/40 pt-1 text-muted-foreground">
                  <span>Side: {pos.side}</span>
                  <span className="font-mono text-foreground font-bold">{pos.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: WALLET SEARCH & LOOKUP */}
      {activeTab === 'search' && (
        <div className="space-y-3.5 animate-fade-in">
          <div className="flex items-center gap-2 bg-secondary/20 border border-border rounded-xl px-3.5 py-2.5">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 0x... wallet or ENS address"
              className="w-full bg-transparent text-xs font-bold text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="p-4 rounded-2xl border border-border/80 bg-card text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto text-xl font-bold">
              🔍
            </div>
            <h3 className="text-xs font-extrabold text-foreground">
              Search any Polygon Wallet
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Type an address above to inspect win rates, active positions & historical trade signals.
            </p>
          </div>
        </div>
      )}

      {/* WALLET PROFILE MODAL */}
      {selectedWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative z-10 w-full max-w-sm bg-[#121722] text-white rounded-2xl border border-slate-800 p-4 space-y-4 my-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  {selectedWalletModal.ens || selectedWalletModal.wallet}
                </h3>
                <span className="text-xs font-semibold text-emerald-400">
                  {selectedWalletModal.badge || 'Verified Trader'}
                </span>
              </div>
              <button
                onClick={() => setSelectedWalletModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Estimated Win Rate</span>
                <span className="font-bold text-emerald-400 text-sm font-mono">
                  {selectedWalletModal.winRate || '82.4'}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Profit (PnL)</span>
                <span className="font-bold text-sky-400 text-sm font-mono">
                  {selectedWalletModal.pnl || '+$142,500'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                toggleFollow(selectedWalletModal.wallet || '0x71C...89A')
                setSelectedWalletModal(null)
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/50 transition"
            >
              {followingWallets.includes(selectedWalletModal.wallet || '0x71C...89A')
                ? 'Following Wallet ✓'
                : '+ Follow & Copy Signals'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
