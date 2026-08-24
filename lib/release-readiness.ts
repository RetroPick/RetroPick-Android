import type { ReconcilerState } from './realtime-client.ts'

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
