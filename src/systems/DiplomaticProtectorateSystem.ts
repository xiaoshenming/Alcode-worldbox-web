// Diplomatic Protectorate System (v3.180) - Powerful civilizations protect weaker ones
// Protector civs offer military protection in exchange for tribute and influence

import { EntityManager } from '../ecs/Entity'

export interface Protectorate {
  id: number
  protectorCivId: number
  protectedCivId: number
  tributeRate: number
  autonomy: number
  stability: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3600
const FORM_CHANCE = 0.004
const MAX_PROTECTORATES = 8

export class DiplomaticProtectorateSystem {
  private protectorates: Protectorate[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: any, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Form new protectorate relationships
    if (this.protectorates.length < MAX_PROTECTORATES && Math.random() < FORM_CHANCE) {
      const civs = em.getEntitiesWithComponent('civilization')
      if (civs.length >= 2) {
        const protector = civs[Math.floor(Math.random() * civs.length)]
        const candidates = civs.filter(c => c !== protector)
        const protected_ = candidates[Math.floor(Math.random() * candidates.length)]
        const alreadyExists = this.protectorates.some(
          p => p.protectorCivId === protector && p.protectedCivId === protected_
        )
        if (!alreadyExists) {
          this.protectorates.push({
            id: this.nextId++,
            protectorCivId: protector,
            protectedCivId: protected_,
            tributeRate: 0.05 + Math.random() * 0.15,
            autonomy: 0.5 + Math.random() * 0.4,
            stability: 0.6 + Math.random() * 0.3,
            duration: 0, tick,
          })
        }
      }
    }

    for (const p of this.protectorates) {
      p.duration++

      // Stability fluctuates based on tribute and autonomy balance
      const tension = p.tributeRate / (p.autonomy + 0.01)
      if (tension > 0.5 && Math.random() < 0.03) {
        p.stability = Math.max(0, p.stability - 0.05)
      }

      // Autonomy erodes over time as protector exerts influence
      if (Math.random() < 0.01) {
        p.autonomy = Math.max(0.1, p.autonomy - 0.02)
        p.tributeRate = Math.min(0.5, p.tributeRate + 0.005)
      }

      // Stability recovers when autonomy is respected
      if (p.autonomy > 0.6 && Math.random() < 0.015) {
        p.stability = Math.min(1, p.stability + 0.03)
      }

      // Long-lasting protectorates become more stable
      if (p.duration > 20 && Math.random() < 0.008) {
        p.stability = Math.min(1, p.stability + 0.02)
      }
    }

    // Dissolve unstable protectorates
    const aliveCivs = new Set(em.getEntitiesWithComponent('civilization'))
    for (let i = this.protectorates.length - 1; i >= 0; i--) {
      const p = this.protectorates[i]
      const civGone = !aliveCivs.has(p.protectorCivId) || !aliveCivs.has(p.protectedCivId)
      if (civGone || (p.stability < 0.1 && Math.random() < 0.05)) {
        this.protectorates.splice(i, 1)
      }
    }
  }

  getProtectorates(): readonly Protectorate[] { return this.protectorates }
}
