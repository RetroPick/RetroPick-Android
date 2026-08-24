'use client'

import { Capacitor } from '@capacitor/core'
import { resolveRuntimeConfig, runtimeConfigFromProcess, type RuntimeConfig, type RuntimeEnvironment } from './runtime-config'

type NativeRuntimeConfig = {
  available?: boolean
  httpUrl?: string
  wsUrl?: string
  demoSimulation?: boolean
  environment?: RuntimeEnvironment
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (Capacitor.getPlatform() !== 'android') return runtimeConfigFromProcess()

  const plugin = (window as typeof window & { Capacitor?: { Plugins?: { RuntimeConfig?: { getConfig: () => Promise<NativeRuntimeConfig> } } } }).Capacitor?.Plugins?.RuntimeConfig
  if (!plugin) throw new Error('Android BFF runtime configuration bridge is unavailable')

  const native = await plugin.getConfig()
  if (!native.available) throw new Error('Android BFF runtime configuration is unavailable')
  const environment = native.environment === 'production' ? 'production' : native.environment === 'test' ? 'test' : 'development'
  return resolveRuntimeConfig({
    NEXT_PUBLIC_BFF_HTTP_URL: native.httpUrl,
    NEXT_PUBLIC_BFF_WS_URL: native.wsUrl,
    NEXT_PUBLIC_DEMO_SIMULATION: native.demoSimulation ? 'true' : 'false',
  }, environment)
}
