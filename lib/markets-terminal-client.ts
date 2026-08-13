'use client'

export type FreshnessState = 'fresh' | 'stale' | 'resyncing' | 'degraded' | 'unavailable'

export interface TransportHealth {
  availability: 'available' | 'degraded' | 'unavailable'
  source: 'Go BFF Projection' | 'unavailable'
  observedAt: string | null
  latencyMs: number | null
  requestId: string | null
}

export interface MarketHealth extends TransportHealth {
  marketId: string
  spread: string | null
  spreadStatus: 'tight' | 'normal' | 'wide' | 'unavailable'
  depthScore: number | null
  liquidityRating: 'OPTIMAL' | 'MODERATE' | 'LOW' | 'UNAVAILABLE'
  ok: boolean
  degraded: boolean
}

export interface CapabilitiesResponse {
  features: { realtime: boolean; trading: boolean; intelligence: boolean }
  version: string | null
  environment: string | null
  health: TransportHealth
}

export interface EligibilityResponse {
  eligible: boolean
  jurisdiction: string
  reason?: string
  health: TransportHealth
}

export interface DataProvenance {
  marketId: string
  source: 'Go BFF Projection' | 'unavailable'
  freshnessState: FreshnessState
  etag: string | null
  requestId: string | null
  observedAt: string | null
  staleSeconds: number | null
  latencyMs: number | null
}

type ClientOptions = { httpUrl: string; fetchImpl?: typeof fetch; timeoutMs?: number; now?: () => number }

const unavailableHealth = (requestId: string | null = null): TransportHealth => ({
  availability: 'unavailable', source: 'unavailable', observedAt: null, latencyMs: null, requestId,
})

export class MarketsTerminalClient {
  private readonly httpUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number
  private readonly now: () => number
  private capabilitiesCache: CapabilitiesResponse | null = null
  private eligibilityCache: EligibilityResponse | null = null
  private provenance = new Map<string, DataProvenance>()
  private health = new Map<string, MarketHealth>()

  constructor(options: ClientOptions) {
    this.httpUrl = options.httpUrl.replace(/\/$/, '')
    this.fetchImpl = options.fetchImpl ?? fetch
    this.timeoutMs = options.timeoutMs ?? 5000
    this.now = options.now ?? Date.now
  }

  private async get(path: string): Promise<{ data: any; health: TransportHealth; headers: Headers }> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    const started = this.now()
    try {
      const response = await this.fetchImpl(`${this.httpUrl}${path}`, { signal: controller.signal, headers: { Accept: 'application/json' } })
      const requestId = response.headers.get('x-request-id')
      if (!response.ok) throw Object.assign(new Error(`BFF HTTP ${response.status}`), { requestId })
      const data = await response.json()
      const observedAt = data.observedAt ?? response.headers.get('x-observed-at')
      return { data, headers: response.headers, health: {
        availability: data.degraded ? 'degraded' : 'available', source: 'Go BFF Projection',
        observedAt: typeof observedAt === 'string' ? observedAt : new Date(this.now()).toISOString(),
        latencyMs: Math.max(0, this.now() - started), requestId: data.requestId ?? requestId,
      } }
    } finally { clearTimeout(timer) }
  }

  public async fetchCapabilitiesFromBff(): Promise<CapabilitiesResponse> {
    try {
      const { data, health } = await this.get('/markets/capabilities')
      this.capabilitiesCache = {
        features: {
          realtime: data.features?.realtime === true || data.features?.orderbook_read === true,
          trading: data.features?.trading === true || data.trading === true,
          intelligence: data.features?.intelligence === true || data.intelligence === true,
        }, version: typeof data.version === 'string' ? data.version : null,
        environment: typeof data.environment === 'string' ? data.environment : null, health,
      }
    } catch (error: any) {
      this.capabilitiesCache = { features: { realtime: false, trading: false, intelligence: false }, version: null, environment: null, health: unavailableHealth(error?.requestId ?? null) }
    }
    return this.capabilitiesCache
  }

  public getCapabilities(): CapabilitiesResponse {
    return this.capabilitiesCache ?? { features: { realtime: false, trading: false, intelligence: false }, version: null, environment: null, health: unavailableHealth() }
  }

  public async fetchEligibilityFromBff(): Promise<EligibilityResponse> {
    try {
      const { data, health } = await this.get('/markets/eligibility')
      this.eligibilityCache = {
        eligible: data.eligible === true,
        jurisdiction: typeof data.jurisdiction === 'string' ? data.jurisdiction : 'UNKNOWN',
        reason: typeof data.reason === 'string' ? data.reason : undefined, health,
      }
    } catch (error: any) {
      this.eligibilityCache = { eligible: false, jurisdiction: 'UNKNOWN', reason: 'Eligibility unavailable', health: unavailableHealth(error?.requestId ?? null) }
    }
    return this.eligibilityCache
  }

  public getEligibility(): EligibilityResponse {
    return this.eligibilityCache ?? { eligible: false, jurisdiction: 'UNKNOWN', reason: 'Eligibility not verified', health: unavailableHealth() }
  }

  public getMarketHealth(marketId: string): MarketHealth {
    return this.health.get(marketId) ?? { ...unavailableHealth(), marketId, spread: null, spreadStatus: 'unavailable', depthScore: null, liquidityRating: 'UNAVAILABLE', ok: false, degraded: true }
  }

  public getMarketProvenance(marketId: string): DataProvenance {
    return this.provenance.get(marketId) ?? { marketId, source: 'unavailable', freshnessState: 'unavailable', etag: null, requestId: null, observedAt: null, staleSeconds: null, latencyMs: null }
  }
}
