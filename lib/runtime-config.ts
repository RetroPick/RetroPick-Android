export type RuntimeEnvironment = 'production' | 'development' | 'test'

export interface RuntimeConfig {
  httpUrl: string
  wsUrl: string
  demoSimulation: boolean
  environment: RuntimeEnvironment
}

export class RuntimeConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RuntimeConfigurationError'
  }
}

type PublicEnvironment = Record<string, string | undefined>

function isForbiddenProductionHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  if (host === '*') return true
  if (host === 'localhost' || host.endsWith('.localhost')) return true

  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)?.slice(1).map(Number)
  if (ipv4) return ipv4[0] === 127 || ipv4.every((octet) => octet === 0)

  if (host === '::' || host === '::1') return true
  if (!host.startsWith('::ffff:')) return false

  const mapped = host.slice('::ffff:'.length)
  const mappedIpv4 = mapped.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)?.slice(1).map(Number)
  if (mappedIpv4) return mappedIpv4[0] === 127 || mappedIpv4.every((octet) => octet === 0)

  const halves = mapped.split(':')
  if (halves.length !== 2 || halves.some((half) => !/^[0-9a-f]{1,4}$/.test(half))) return false
  const mappedValue = Number.parseInt(halves[0], 16) * 0x10000 + Number.parseInt(halves[1], 16)
  return mappedValue === 0 || Math.floor(mappedValue / 0x1000000) === 127
}

function requireUrl(value: string | undefined, name: string, schemes: string[], environment: RuntimeEnvironment): string {
  if (!value) throw new RuntimeConfigurationError(`${name} is required; no localhost or upstream default is provided`)
  let parsed: URL
  try { parsed = new URL(value) } catch { throw new RuntimeConfigurationError(`${name} must be an absolute URL`) }
  const scheme = parsed.protocol.replace(':', '')
  if (!schemes.includes(scheme)) throw new RuntimeConfigurationError(`${name} must use ${schemes.join(' or ')}`)
  if (environment === 'production' && isForbiddenProductionHost(parsed.hostname)) {
    throw new RuntimeConfigurationError(`${name} cannot target a loopback, wildcard, or localhost host in production`)
  }
  return value.replace(/\/$/, '')
}

export function resolveRuntimeConfig(env: PublicEnvironment, environment: RuntimeEnvironment): RuntimeConfig {
  const production = environment === 'production'
  const demoSimulation = env.NEXT_PUBLIC_DEMO_SIMULATION === 'true'
  if (production && demoSimulation) throw new RuntimeConfigurationError('demo simulation is forbidden in production')
  return {
    httpUrl: requireUrl(env.NEXT_PUBLIC_BFF_HTTP_URL, 'NEXT_PUBLIC_BFF_HTTP_URL', production ? ['https'] : ['http', 'https'], environment),
    wsUrl: requireUrl(env.NEXT_PUBLIC_BFF_WS_URL, 'NEXT_PUBLIC_BFF_WS_URL', production ? ['wss'] : ['ws', 'wss'], environment),
    demoSimulation,
    environment,
  }
}

export function runtimeConfigFromProcess(): RuntimeConfig {
  const environment: RuntimeEnvironment = process.env.NODE_ENV === 'production' ? 'production' : process.env.NODE_ENV === 'test' ? 'test' : 'development'
  return resolveRuntimeConfig(process.env, environment)
}
