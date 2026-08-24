import type { ReconcilerState, RealtimeClient } from './realtime-client.ts'

/** Fails closed unless the current transport cycle has produced a synchronized snapshot. */
export class ReleaseReadinessGate {
  private ready = false
  constructor(private readonly publish: (ready: boolean) => void) {}

  consume(state: ReconcilerState) {
    const next = state === 'SYNCHRONIZED'
    if (next === this.ready) return
    this.ready = next
    this.publish(next)
  }

  isReady() { return this.ready }
}

/** Connects the release UI's readiness state directly to the live transport. */
export function bindReleaseReadiness(realtime: Pick<RealtimeClient, 'onStateChange'>, publish: (ready: boolean) => void) {
  const gate = new ReleaseReadinessGate(publish)
  return realtime.onStateChange((state) => gate.consume(state))
}
