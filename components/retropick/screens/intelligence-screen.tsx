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
  Sparkles,
  SlidersHorizontal,
  Bell,
  BellOff,
  ChevronRight,
  Play,
  TrendingDown,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock Data for Whale Trade Feed
const WHALE_FEEDS = [
  {
    id: 'wf-1',
    wallet: '0x72F...9A3',
    ens: 'macroking.eth',
    avatar: '👑',
    type: 'BUY',
    outcome: 'YES',
    marketTitle: 'Will BTC exceed $150K in 2026?',
    price: '42¢',
    amountUsdc: '$42,500.00',
    shares: '101,190',
    time: '18s ago',
    badge: '🐋 Mega Whale',
    sizeBadge: 'Large size • 6.2% of 24h vol',
    deltaCents: '+2.1¢',
    highConviction: false
  },
  {
    id: 'wf-2',
    wallet: '0x1A2...B4C',
    ens: 'yield_farmer.eth',
    avatar: '🌾',
    type: 'SELL',
    outcome: 'NO',
    marketTitle: 'Federal Funds Rate < 4.0% by EO 2024',
    price: '78¢',
    amountUsdc: '$128,000.00',
    shares: '164,102',
    time: '4m ago',
    badge: '🧠 Smart Money',
    sizeBadge: 'High conviction',
    deltaCents: '-4.5¢',
    highConviction: true
  },
  {
    id: 'wf-3',
    wallet: '0x49B...12C',
    ens: 'satoshi_vault.eth',
    avatar: '⚡',
    type: 'BUY',
    outcome: 'NO',
    marketTitle: 'Fed Decision in July: No change?',
    price: '71¢',
    amountUsdc: '$84,000.00',
    shares: '118,309',
    time: '8m ago',
    badge: '🧠 Smart Money',
    sizeBadge: 'Large size • 4.1% of 24h vol',
    deltaCents: '+1.5¢',
    highConviction: false
  },
  {
    id: 'wf-4',
    wallet: '0x88A...31B',
    ens: 'polymarket_king.eth',
    avatar: '🏆',
    type: 'BUY',
    outcome: 'YES',
    marketTitle: 'Clarity Act (H.R.3633) signed into law in 2026?',
    price: '18¢',
    amountUsdc: '$15,000.00',
    shares: '83,333',
    time: '24m ago',
    badge: '🐋 Mega Whale',
    sizeBadge: 'High conviction',
    deltaCents: '+3.2¢',
    highConviction: true
  }
]

// Mock Data for Smart Money Leaderboard
const LEADERBOARD_TRADERS = [
  {
    rank: 1,
    wallet: '0x72F...9A3',
    ens: 'macroking',
    verified: true,
    score: 91,
    resolutions: 84,
    roi: '+32.4%',
    winRate: 84,
    pnl: '+$84,200.00',
    volume: '$480,000',
    badge: '🐋 Mega Whale',
    followers: 1240,
    categoryStrengths: [
      { category: 'Politics', winRate: 72 },
      { category: 'Crypto', winRate: 65 },
      { category: 'Macro', winRate: 45 }
    ],
    exposure: [
      { title: 'Will US GDP Growth Exceed 3.0% in Q3?', side: 'YES', value: '$13.6K', pnl: '+$1,240' },
      { title: 'Fed Funds Rate Above 5.0% by December', side: 'NO', value: '$7.7K', pnl: '-$450' }
    ],
    recentTrades: [
      { type: 'BUY', outcome: 'YES', shares: '10,000', title: 'SpaceX Mars Mission 2029', time: '2 hours ago' },
      { type: 'SELL', outcome: 'NO', shares: '5,000', title: 'BTC to hit $100k in 2024', time: 'Yesterday' }
    ]
  },
  {
    rank: 2,
    wallet: '0x49B...12C',
    ens: 'prediction_god',
    verified: true,
    score: 88,
    resolutions: 112,
    roi: '+28.1%',
    winRate: 79,
    pnl: '+$98,400.00',
    volume: '$310,000',
    badge: '🧠 Smart Money',
    followers: 890,
    categoryStrengths: [
      { category: 'Crypto', winRate: 88 },
      { category: 'Tech', winRate: 74 }
    ],
    exposure: [],
    recentTrades: []
  },
  {
    rank: 3,
    wallet: '0x12F...99E',
    ens: 'quant_mind',
    verified: false,
    score: 82,
    resolutions: 56,
    roi: '+19.5%',
    winRate: 76,
    pnl: '+$75,200.00',
    volume: '$220,000',
    badge: '🎯 High Win-Rate',
    followers: 650,
    categoryStrengths: [
      { category: 'Macro', winRate: 80 }
    ],
    exposure: [],
    recentTrades: []
  },
  {
    rank: 4,
    wallet: '0x88A...31B',
    ens: 'data_diver',
    verified: false,
    score: 79,
    resolutions: 201,
    roi: '+14.2%',
    winRate: 73,
    pnl: '+$54,100.00',
    volume: '$195,000',
    badge: '⚡ High Volume',
    followers: 430,
    categoryStrengths: [],
    exposure: [],
    recentTrades: []
  }
]

// Mock Data for Discovery Screen
const TRENDING_TRADERS = [
  { ens: 'alpha_seeker', pnl: '+12.4%', avatar: '⚡' },
  { ens: 'defi_degen', pnl: '+8.2%', avatar: '🔥' },
  { ens: '0x98A...84C', pnl: '+5.7%', avatar: '🎯' }
]

const TRENDING_MARKETS = [
  { id: 'm-1', title: 'BTC to $100k by Dec?', odds: '66%', vol: '$4.2M', icon: '₿' },
  { id: 'm-2', title: 'NFL: Chiefs to win Super Bowl?', odds: '24%', vol: '$1.8M', icon: '🏈' },
  { id: 'm-3', title: 'Tesla Q4 Earnings Bear?', odds: '78%', vol: '$920K', icon: '📈', highConviction: true }
]

export function IntelligenceScreen({
  onSelectMarket
}: {
  onSelectMarket?: (marketId: string) => void
}) {
  // Navigation Sub-Tabs: Whales | Smart Money | Following | Paper | Search
  const [activeTab, setActiveTab] = useState<'whales' | 'smart_money' | 'following' | 'paper' | 'search'>('whales')
  const [searchQuery, setSearchQuery] = useState('')
  const [feedFilter, setFeedFilter] = useState<'all' | '25k' | '100k' | 'following'>('all')
  const [leaderboardCategory, setLeaderboardCategory] = useState<'Overall' | 'Politics' | 'Crypto' | 'Macro' | 'Sports'>('Overall')
  
  // Followed Trader & Alert States
  const [followingWallets, setFollowingWallets] = useState<string[]>(['0x72F...9A3'])
  const [alertedMarkets, setAlertedMarkets] = useState<string[]>(['m-3'])
  
  // Modals & Drawers State
  const [selectedTraderProfile, setSelectedTraderProfile] = useState<any>(null)
  const [showQuickBacktestModal, setShowQuickBacktestModal] = useState(false)
  const [showPaperFollowConfirmation, setShowPaperFollowConfirmation] = useState(false)
  const [showWhaleAlertsSettings, setShowWhaleAlertsSettings] = useState(false)

  // Backtest Simulation Settings
  const [backtestTimeframe, setBacktestTimeframe] = useState<'30D' | '90D' | 'ALL'>('30D')
  const [backtestStartingBalance, setBacktestStartingBalance] = useState<number>(1000)
  const [backtestCopySize, setBacktestCopySize] = useState<number>(25)
  const [backtestRunning, setBacktestRunning] = useState<boolean>(false)

  // Paper Follow Settings
  const [paperBalanceInput, setPaperBalanceInput] = useState<number>(1000)
  const [paperCopySizeInput, setPaperCopySizeInput] = useState<number>(25)
  const [paperMaxPerTradeInput, setPaperMaxPerTradeInput] = useState<number>(50)
  const [paperCategoryInput, setPaperCategoryInput] = useState<string>('All')

  // Whale Alerts Settings
  const [whaleAlertsEnabled, setWhaleAlertsEnabled] = useState(true)
  const [followedWalletsAlertsEnabled, setFollowedWalletsAlertsEnabled] = useState(true)
  const [minTradeThreshold, setMinTradeThreshold] = useState(5000)
  const [minSmartScore, setMinSmartScore] = useState(70)
  const [alertCategory, setAlertCategory] = useState('All')
  const [quietHours, setQuietHours] = useState('10 PM - 7 AM')
  const [dailyMaxAlerts, setDailyMaxAlerts] = useState(12)

  // Paper Portfolio Virtual State
  const [paperPortfolioEquity] = useState(1184.00)
  const [simulatedFills] = useState([
    {
      id: 'fill-1',
      trader: 'macroking.eth',
      market: 'Fed Rate Cut Nov 2024',
      side: 'YES',
      sourcePrice: '42.0¢',
      simFill: '44.3¢',
      slippage: '+2.3¢',
      time: '12m ago'
    }
  ])

  const toggleFollow = (wallet: string) => {
    if (followingWallets.includes(wallet)) {
      setFollowingWallets(prev => prev.filter(w => w !== wallet))
    } else {
      setFollowingWallets(prev => [...prev, wallet])
    }
  }

  const toggleMarketAlert = (marketId: string) => {
    if (alertedMarkets.includes(marketId)) {
      setAlertedMarkets(prev => prev.filter(m => m !== marketId))
    } else {
      setAlertedMarkets(prev => [...prev, marketId])
    }
  }

  return (
    <div className="relative flex flex-col h-full bg-background animate-fade-up px-4 pb-32 pt-3 space-y-4 text-foreground overflow-y-auto min-h-0 no-scrollbar">
      
      {/* 4 Primary Navigation Tabs: Whales | Smart Money | Following | Paper */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-secondary/30 rounded-xl border border-border/60">
        <button
          onClick={() => setActiveTab('whales')}
          className={cn(
            "py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex flex-col items-center gap-0.5",
            activeTab === 'whales'
              ? "bg-primary text-primary-foreground shadow-md font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Whales</span>
        </button>

        <button
          onClick={() => setActiveTab('smart_money')}
          className={cn(
            "py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex flex-col items-center gap-0.5",
            activeTab === 'smart_money'
              ? "bg-primary text-primary-foreground shadow-md font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Smart Money</span>
        </button>

        <button
          onClick={() => setActiveTab('following')}
          className={cn(
            "py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex flex-col items-center gap-0.5",
            activeTab === 'following'
              ? "bg-primary text-primary-foreground shadow-md font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Following</span>
        </button>

        <button
          onClick={() => setActiveTab('paper')}
          className={cn(
            "py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex flex-col items-center gap-0.5",
            activeTab === 'paper'
              ? "bg-primary text-primary-foreground shadow-md font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Paper</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. WHALE FEED TAB (REALTIME LARGE TRADE STREAM & ALERT SETTINGS SHORTCUT) */}
      {/* ========================================================================= */}
      {activeTab === 'whales' && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Quick Search & Size Filter Bar */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-secondary/20 border border-border/80 rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wallet or trader..."
                className="w-full bg-transparent text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px]">
              {(['all', '25k', '100k', 'following'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFeedFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded-xl font-bold transition border shrink-0",
                    feedFilter === f
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-xs"
                      : "bg-secondary/20 border-border/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === 'all' && 'All'}
                  {f === '25k' && '>$25K'}
                  {f === '100k' && '>$100K'}
                  {f === 'following' && 'Following'}
                </button>
              ))}
            </div>
          </div>

          {/* Live Indicator Bar */}
          <div className="flex items-center justify-between px-1 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE-ISH • UPDATED 8S AGO</span>
            </div>
            <button
              onClick={() => setShowWhaleAlertsSettings(true)}
              className="text-indigo-400 hover:underline font-bold flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" /> Alert Settings
            </button>
          </div>

          {/* Whale Feed List Cards */}
          <div className="space-y-3">
            {WHALE_FEEDS.map((feed) => (
              <div
                key={feed.id}
                className="p-4 rounded-2xl border border-border/80 bg-card shadow-sm hover:border-indigo-500/50 transition-all space-y-3"
              >
                {/* Header: Market Title & Trade Amount */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <p className="text-xs font-extrabold text-foreground line-clamp-2 leading-snug">
                      {feed.marketTitle}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded font-mono text-[10px] font-black border",
                        feed.type === 'BUY'
                          ? "bg-emerald-950/80 border-emerald-800 text-emerald-400"
                          : "bg-rose-950/80 border-rose-800 text-rose-400"
                      )}>
                        {feed.type === 'BUY' ? 'BOUGHT' : 'SOLD'} {feed.outcome} @ {feed.price}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-black text-foreground block">{feed.amountUsdc}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{feed.time}</span>
                  </div>
                </div>

                {/* Footer: Wallet handle & Size Badge */}
                <div className="flex items-center justify-between border-t border-border/40 pt-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{feed.avatar}</span>
                    <button
                      onClick={() => {
                        const matched = LEADERBOARD_TRADERS.find(t => t.ens === 'macroking' || t.wallet === feed.wallet) || LEADERBOARD_TRADERS[0]
                        setSelectedTraderProfile(matched)
                      }}
                      className="font-mono text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>{feed.ens || feed.wallet}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded border border-border/50">
                      {feed.sizeBadge}
                    </span>
                    <button
                      onClick={() => {
                        const matched = LEADERBOARD_TRADERS.find(t => t.ens === 'macroking' || t.wallet === feed.wallet) || LEADERBOARD_TRADERS[0]
                        setSelectedTraderProfile(matched)
                      }}
                      className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-0.5"
                    >
                      View Trader &gt;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SMART MONEY TAB (LEADERBOARD & TRADER PROFILES) */}
      {/* ========================================================================= */}
      {activeTab === 'smart_money' && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Category Filter Bar */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              {(['Overall', 'Politics', 'Crypto', 'Macro', 'Sports'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setLeaderboardCategory(cat)}
                  className={cn(
                    "px-3 py-1 rounded-xl font-bold transition",
                    leaderboardCategory === cat
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-extrabold text-foreground">Top Performers</span>
            <span className="text-[10px] text-muted-foreground font-mono">Last 30 Days</span>
          </div>

          {/* Leaderboard Cards */}
          <div className="space-y-2.5">
            {LEADERBOARD_TRADERS.map((trader) => (
              <div
                key={trader.rank}
                onClick={() => setSelectedTraderProfile(trader)}
                className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-sm hover:border-indigo-500/50 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-black text-muted-foreground w-4 text-center">
                    {trader.rank}
                  </span>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-foreground font-mono">{trader.ens}</span>
                      {trader.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-blue-400/20" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Score: <strong className="text-foreground">{trader.score}</strong> • {trader.resolutions} Res.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className="font-mono text-sm font-black text-emerald-400 block">{trader.roi}</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">ROI</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl border border-border/50 bg-secondary/10 text-[10px] text-muted-foreground text-center space-y-1">
            <p>ⓘ Calculated using historical realized performance on RetroPick and Polymarket.</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DISCOVERY SEARCH & TRENDING MARKETS (DISCOVERY STAGE) */}
      {/* ========================================================================= */}
      {activeTab === 'search' && (
        <div className="space-y-4 animate-fade-in">
          {/* Wallet Search Input */}
          <div className="flex items-center gap-2 bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wallet or trader..."
              className="w-full bg-transparent text-xs font-bold text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Recent Searches */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Recent Searches</span>
              <button className="text-indigo-400 hover:underline">Clear</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full border border-border/60 bg-secondary/20 text-xs font-mono font-semibold text-foreground flex items-center gap-1.5">
                <RotateCcwIcon /> 0x482...F1E
              </span>
              <span className="px-3 py-1 rounded-full border border-border/60 bg-secondary/20 text-xs font-mono font-semibold text-foreground flex items-center gap-1.5">
                <RotateCcwIcon /> yield_farmer
              </span>
            </div>
          </div>

          {/* Trending Traders Section */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Trending Traders
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {TRENDING_TRADERS.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const matched = LEADERBOARD_TRADERS.find(tr => tr.ens.includes(t.ens)) || LEADERBOARD_TRADERS[0]
                    setSelectedTraderProfile(matched)
                  }}
                  className="flex items-center gap-2 p-2 px-3 rounded-xl border border-border/70 bg-card hover:border-indigo-500/40 text-xs font-bold shrink-0 transition"
                >
                  <span className="text-sm">{t.avatar}</span>
                  <span className="font-mono text-foreground">{t.ens}</span>
                  <span className="text-emerald-400 font-mono text-[11px]">{t.pnl}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trending Markets with High Conviction Badge */}
          <div className="space-y-2.5 pt-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Trending Markets
            </span>

            {TRENDING_MARKETS.map((m) => (
              <div key={m.id} className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg bg-secondary/30 p-2 rounded-xl border border-border/50">{m.icon}</span>
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-foreground">{m.title}</p>
                      {m.highConviction && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-[10px] font-black text-emerald-400">
                          HIGH CONVICTION
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span className="font-bold text-emerald-400 block">{m.odds} Odds</span>
                    <span className="text-[10px] text-muted-foreground">VOL {m.vol}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                  <button
                    onClick={() => toggleMarketAlert(m.id)}
                    className={cn(
                      "px-3 py-1 rounded-xl text-xs font-bold transition border flex items-center gap-1.5",
                      alertedMarkets.includes(m.id)
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Bell className="w-3 h-3" />
                    <span>{alertedMarkets.includes(m.id) ? 'Alert Set ✓' : 'Alert Me'}</span>
                  </button>

                  <button
                    onClick={() => onSelectMarket?.(m.id)}
                    className="text-indigo-400 font-bold hover:underline"
                  >
                    View Market &gt;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FOLLOWING & PAPER PORTFOLIO STAGE (REVIEW STAGE) */}
      {/* ========================================================================= */}
      {(activeTab === 'paper' || activeTab === 'following') && (
        <div className="space-y-4 animate-fade-in">
          {/* Virtual Portfolio Equity Card */}
          <div className="p-4.5 rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/90 via-slate-900 to-slate-950 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-[10px] font-bold text-indigo-300 border border-indigo-400/30">
                SIMULATION
              </span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 font-mono">
                <TrendingUp className="w-3.5 h-3.5" /> +18.4% (+$184.00)
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Virtual Equity</span>
              <span className="text-3xl font-black text-white font-mono">${paperPortfolioEquity.toFixed(2)}</span>
            </div>

            {/* Simulated Performance Curve */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span>Performance (Simulated)</span>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  {['1D', '1W', '1M', '3M', 'ALL'].map((tf) => (
                    <button
                      key={tf}
                      className={cn(
                        "px-2 py-0.5 rounded",
                        tf === '1M' ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-20 w-full bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-2 flex items-end">
                {/* Vector SVG Performance Area Chart */}
                <svg viewBox="0 0 200 50" className="w-full h-full overflow-visible">
                  <path
                    d="M 0 40 Q 40 35 70 25 T 140 18 T 200 5"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                  <circle cx="200" cy="5" r="4" fill="#10b981" />
                </svg>
              </div>
            </div>
          </div>

          {/* Paper Following List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground uppercase tracking-wider">Paper Following</span>
              <button
                onClick={() => setShowPaperFollowConfirmation(true)}
                className="text-indigo-400 hover:underline flex items-center gap-1"
              >
                + Add Trader
              </button>
            </div>

            <div className="p-3.5 rounded-2xl border border-border/80 bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-indigo-600/20 border border-indigo-500/40 grid place-items-center text-sm">
                  👑
                </div>
                <div>
                  <h4 className="font-mono text-xs font-bold text-foreground">macroking.eth</h4>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">+12.4% (Sim)</span>
                </div>
              </div>

              <div className="text-right font-mono text-xs">
                <span className="font-bold text-foreground block">$500</span>
                <span className="text-[10px] text-muted-foreground">Allocated</span>
              </div>
            </div>
          </div>

          {/* Watchlist Auto-Alerts Toggle Section */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground uppercase tracking-wider">Watchlist Auto-Alerts</span>
              <button className="text-indigo-400 hover:underline">+</button>
            </div>

            <div className="p-3 rounded-xl border border-border/80 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📈</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">Tesla Q4 Earnings</p>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">78% Odds • HIGH CONVICTION</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleMarketAlert('m-3')}
                  className={cn(
                    "w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer",
                    alertedMarkets.includes('m-3') ? "bg-indigo-600" : "bg-secondary"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full bg-white transition-transform",
                    alertedMarkets.includes('m-3') ? "translate-x-4" : "translate-x-0"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">👤</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">macroking.eth</p>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">+12.4% (24h)</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleFollow('0x72F...9A3')}
                  className={cn(
                    "w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer",
                    followingWallets.includes('0x72F...9A3') ? "bg-indigo-600" : "bg-secondary"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full bg-white transition-transform",
                    followingWallets.includes('0x72F...9A3') ? "translate-x-4" : "translate-x-0"
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* Simulated Fills Stream */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Simulated Fills Stream
            </span>

            {simulatedFills.map((fill) => (
              <div key={fill.id} className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-indigo-400 font-bold">✢ {fill.trader} entered</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-[10px] font-black text-emerald-400">
                    {fill.side}
                  </span>
                </div>
                <p className="text-xs font-bold text-foreground">{fill.market}</p>

                <div className="grid grid-cols-3 gap-2 bg-secondary/30 p-2 rounded-xl border border-border/40 text-center font-mono text-xs">
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Source</span>
                    <span className="font-bold text-foreground">{fill.sourcePrice}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Sim Fill</span>
                    <span className="font-bold text-emerald-400">{fill.simFill}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Slippage</span>
                    <span className="font-bold text-amber-400">{fill.slippage}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. WALLET PROFILE & QUICK BACKTEST DRAWER (ANALYSIS STAGE) */}
      {/* ========================================================================= */}
      {selectedTraderProfile && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-[2px] animate-fade-in p-0">
          <div className="absolute inset-0" onClick={() => setSelectedTraderProfile(null)} />

          <div className="relative z-10 w-full mb-[92px] rounded-t-3xl rounded-b-none border-t border-border/80 bg-[#121722] text-white p-5 pb-6 shadow-2xl animate-slide-up flex flex-col space-y-4 max-h-[calc(85vh-92px)] overflow-y-auto">
            <div className="w-12 h-1 bg-slate-600/60 rounded-full mx-auto -mt-1 mb-1 cursor-pointer" onClick={() => setSelectedTraderProfile(null)} />

            {/* Profile Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-indigo-600/20 border border-indigo-500/40 grid place-items-center text-lg">
                  👑
                </div>
                <div>
                  <h3 className="font-mono text-sm font-extrabold text-white flex items-center gap-1.5">
                    {selectedTraderProfile.ens} <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400/20" />
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[10px] font-bold text-emerald-400">
                      High volume
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-[10px] font-bold text-indigo-300">
                      Recently active
                    </span>
                  </div>
                </div>
              </div>

              <button onClick={() => setSelectedTraderProfile(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions: Follow + Quick Backtest */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => toggleFollow(selectedTraderProfile.wallet)}
                className={cn(
                  "py-2.5 px-3 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1.5",
                  followingWallets.includes(selectedTraderProfile.wallet)
                    ? "bg-emerald-950/80 border-emerald-700 text-emerald-400"
                    : "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                )}
              >
                {followingWallets.includes(selectedTraderProfile.wallet) ? 'Following ✓' : '+ Follow Trader'}
              </button>

              <button
                onClick={() => setShowQuickBacktestModal(true)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" /> Quick Backtest
              </button>
            </div>

            {/* Performance Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Realized PnL</span>
                <span className="font-extrabold text-emerald-400 text-sm">{selectedTraderProfile.pnl}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ROI %</span>
                <span className="font-extrabold text-sky-400 text-sm">{selectedTraderProfile.roi}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Win Rate</span>
                <span className="font-extrabold text-indigo-400 text-sm">{selectedTraderProfile.winRate}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Smart Money Score</span>
                <span className="font-extrabold text-amber-400 text-sm">{selectedTraderProfile.score}/100</span>
              </div>
            </div>

            {/* Category Strengths Bars */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Category Strengths</span>
              {selectedTraderProfile.categoryStrengths?.map((cs: any, idx: number) => (
                <div key={idx} className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-300">{cs.category}</span>
                    <span className="text-emerald-400 font-bold">{cs.winRate}% Win Rate</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cs.winRate}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Open Exposure */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Current Exposure</span>
              {selectedTraderProfile.exposure?.map((exp: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
                  <p className="font-bold text-white leading-tight">{exp.title}</p>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold">{exp.side} • {exp.value}</span>
                    <span className="text-sky-400">{exp.pnl}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK BACKTEST BOTTOM SHEET MODAL */}
      {/* ========================================================================= */}
      {showQuickBacktestModal && (
        <div className="absolute inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-[2px] animate-fade-in p-0">
          <div className="absolute inset-0" onClick={() => setShowQuickBacktestModal(false)} />

          <div className="relative z-10 w-full mb-[92px] rounded-t-3xl rounded-b-none border-t border-indigo-500/60 bg-[#0E131F] text-white p-5 pb-6 shadow-2xl animate-slide-up flex flex-col space-y-4 max-h-[calc(85vh-92px)] overflow-y-auto">
            <div className="w-12 h-1 bg-slate-600/60 rounded-full mx-auto -mt-1 mb-1 cursor-pointer" onClick={() => setShowQuickBacktestModal(false)} />

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-400 fill-indigo-400" /> Quick Backtest Simulation
              </h3>
              <button onClick={() => setShowQuickBacktestModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Controls: Time Period, Starting Balance, Copy Size */}
            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Time Period</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['30D', '90D', 'ALL'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setBacktestTimeframe(tf)}
                      className={cn(
                        "py-2 rounded-xl font-bold transition border",
                        backtestTimeframe === tf
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Starting Balance</label>
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                    <span className="text-slate-500 mr-1">$</span>
                    <input
                      type="number"
                      value={backtestStartingBalance}
                      onChange={(e) => setBacktestStartingBalance(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent font-bold text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Copy Size</label>
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                    <span className="text-slate-500 mr-1">$</span>
                    <input
                      type="number"
                      value={backtestCopySize}
                      onChange={(e) => setBacktestCopySize(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent font-bold text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Yield Banner */}
            <div className="p-4 rounded-2xl border border-indigo-500/40 bg-indigo-950/40 space-y-2 text-center">
              <span className="text-[11px] text-slate-300 font-semibold">
                If you followed <strong className="text-white">macroking.eth</strong> over past {backtestTimeframe}...
              </span>

              <div className="text-2xl font-black text-emerald-400 font-mono">
                ${(backtestStartingBalance * 1.184).toFixed(0)} <span className="text-xs font-bold">(+18.4%)</span>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-indigo-900/60 font-mono text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 block">Est. PnL</span>
                  <span className="font-bold text-emerald-400">+${(backtestStartingBalance * 0.184).toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">Max Drawdown</span>
                  <span className="font-bold text-rose-400">-9.2%</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">Total Trades</span>
                  <span className="font-bold text-white">73</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">Win Rate</span>
                  <span className="font-bold text-indigo-300">57%</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed text-center">
              ⓘ Simulation assumes execution at next available market price. Past performance is not indicative of future results.
            </p>

            <button
              onClick={() => {
                setShowQuickBacktestModal(false)
                setSelectedTraderProfile(null)
                setShowPaperFollowConfirmation(true)
              }}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/50 transition cursor-pointer"
            >
              Start Paper Copy 🚀
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAPER FOLLOW CONFIRMATION BOTTOM SHEET MODAL (ACTION STAGE) */}
      {/* ========================================================================= */}
      {showPaperFollowConfirmation && (
        <div className="absolute inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-[2px] animate-fade-in p-0">
          <div className="absolute inset-0" onClick={() => setShowPaperFollowConfirmation(false)} />

          <div className="relative z-10 w-full mb-[92px] rounded-t-3xl rounded-b-none border-t border-indigo-500/60 bg-[#0E131F] text-white p-5 pb-6 shadow-2xl animate-slide-up flex flex-col space-y-4 max-h-[calc(85vh-92px)] overflow-y-auto">
            <div className="w-12 h-1 bg-slate-600/60 rounded-full mx-auto -mt-1 mb-1 cursor-pointer" onClick={() => setShowPaperFollowConfirmation(false)} />

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">Paper Follow Confirmation</h3>
                <span className="text-[10px] font-bold text-emerald-400 font-mono">SIMULATION MODE</span>
              </div>
              <button onClick={() => setShowPaperFollowConfirmation(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Trader Header */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
              <span className="text-xl">👑</span>
              <div>
                <h4 className="font-mono text-xs font-bold text-white">macroking</h4>
                <span className="font-mono text-[10px] text-slate-400">0x72F...9A3</span>
              </div>
            </div>

            {/* Configuration Inputs */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Virtual starting balance</span>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
                  <span className="text-slate-500 mr-1">$</span>
                  <input
                    type="number"
                    value={paperBalanceInput}
                    onChange={(e) => setPaperBalanceInput(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-transparent text-right font-bold text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Copy amount per trade</span>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
                  <span className="text-slate-500 mr-1">$</span>
                  <input
                    type="number"
                    value={paperCopySizeInput}
                    onChange={(e) => setPaperCopySizeInput(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-transparent text-right font-bold text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Maximum per trade</span>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
                  <span className="text-slate-500 mr-1">$</span>
                  <input
                    type="number"
                    value={paperMaxPerTradeInput}
                    onChange={(e) => setPaperMaxPerTradeInput(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-transparent text-right font-bold text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Markets</span>
                <select
                  value={paperCategoryInput}
                  onChange={(e) => setPaperCategoryInput(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-bold outline-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Politics">Politics</option>
                  <option value="Macro">Macro</option>
                </select>
              </div>
            </div>

            {/* Explanation Card */}
            <div className="p-3 rounded-xl border border-indigo-900/60 bg-indigo-950/30 text-[11px] text-slate-300 space-y-1">
              <p className="font-semibold flex items-center gap-1 text-indigo-300">
                <Info className="w-3.5 h-3.5" /> How simulation fills work
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                RetroPick simulates your fill using the next available market price after the trade is observed.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setShowPaperFollowConfirmation(false)
                  setActiveTab('paper')
                }}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/50 transition cursor-pointer"
              >
                Start Paper Follow
              </button>

              <button
                onClick={() => setShowPaperFollowConfirmation(false)}
                className="w-full py-2.5 text-center text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WHALE ALERTS SETTINGS BOTTOM SHEET MODAL (MONITORING STAGE) */}
      {/* ========================================================================= */}
      {showWhaleAlertsSettings && (
        <div className="absolute inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-[2px] animate-fade-in p-0">
          <div className="absolute inset-0" onClick={() => setShowWhaleAlertsSettings(false)} />

          <div className="relative z-10 w-full mb-[92px] rounded-t-3xl rounded-b-none border-t border-border bg-card text-foreground p-5 pb-6 shadow-2xl animate-slide-up flex flex-col space-y-4 max-h-[calc(85vh-92px)] overflow-y-auto">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto -mt-1 mb-1 cursor-pointer" onClick={() => setShowWhaleAlertsSettings(false)} />

            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" /> Alerts & Whale Settings
              </h3>
              <button onClick={() => setShowWhaleAlertsSettings(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Whale Alerts</span>
                  <button
                    onClick={() => setWhaleAlertsEnabled(!whaleAlertsEnabled)}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer",
                      whaleAlertsEnabled ? "bg-indigo-600" : "bg-secondary"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full bg-white transition-transform",
                      whaleAlertsEnabled ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Followed wallets</span>
                  <button
                    onClick={() => setFollowedWalletsAlertsEnabled(!followedWalletsAlertsEnabled)}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer",
                      followedWalletsAlertsEnabled ? "bg-indigo-600" : "bg-secondary"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full bg-white transition-transform",
                      followedWalletsAlertsEnabled ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>

              {/* Min Trade Slider */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <div className="flex justify-between font-bold">
                  <span className="uppercase text-[10px] text-muted-foreground">Minimum Trade Threshold</span>
                  <span className="text-indigo-400">${(minTradeThreshold / 1000).toFixed(0)}K</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={minTradeThreshold}
                  onChange={(e) => setMinTradeThreshold(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Min Smart Score */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span className="uppercase text-[10px] text-muted-foreground">Min Smart Money Score</span>
                  <span className="text-emerald-400">{minSmartScore}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="1"
                  value={minSmartScore}
                  onChange={(e) => setMinSmartScore(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Market Categories */}
              <div className="space-y-1.5 pt-1">
                <span className="uppercase text-[10px] text-muted-foreground font-bold block">Market Categories</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {(['All', 'Politics', 'Crypto', 'Macro', 'Sports'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setAlertCategory(cat)}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-bold transition border shrink-0",
                        alertCategory === cat
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-secondary/20 border-border text-muted-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiet Hours & Daily Max */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                <div className="space-y-1">
                  <span className="uppercase text-[10px] text-muted-foreground font-bold block">Quiet hours</span>
                  <span className="font-bold text-foreground block">{quietHours}</span>
                </div>

                <div className="space-y-1">
                  <span className="uppercase text-[10px] text-muted-foreground font-bold block">Daily maximum</span>
                  <span className="font-bold text-foreground block">{dailyMaxAlerts} alerts</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowWhaleAlertsSettings(false)}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md transition cursor-pointer mt-2"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RotateCcwIcon() {
  return (
    <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}
