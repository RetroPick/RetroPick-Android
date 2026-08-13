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

function requireUrl(value: string | undefined, name: string, schemes: string[], environment: RuntimeEnvironment): string {
  if (!value) throw new RuntimeConfigurationError(`${name} is required; no localhost or upstream default is provided`)
  let parsed: URL
  try { parsed = new URL(value) } catch { throw new RuntimeConfigurationError(`${name} must be an absolute URL`) }
  const scheme = parsed.protocol.replace(':', '')
  if (!schemes.includes(scheme)) throw new RuntimeConfigurationError(`${name} must use ${schemes.join(' or ')}`)
  if (environment === 'production' && ['localhost', '127.0.0.1', '10.0.2.2'].includes(parsed.hostname)) {
    throw new RuntimeConfigurationError(`${name} cannot target localhost in production`)
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
