// Diplomatic Hostage System (v3.88) - Hostage capture and exchange between civilizations
// Hostages influence negotiations, treaties, and diplomatic leverage

import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export type HostageStatus = 'captured' | 'negotiating' | 'exchanged' | 'executed' | 'escaped'

export interface Hostage {
  id: number
  entityId: number
  captor: number
  origin: number
  status: HostageStatus
  value: number
  tick: number
}

const CHECK_INTERVAL = 2000
const CAPTURE_CHANCE = 0.002
const MAX_HOSTAGES = 50
const NEGOTIATE_CHANCE = 0.15
const ESCAPE_CHANCE = 0.03

export class DiplomaticHostageSystem {
  private hostages: Hostage[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!civManager?.civilizations) return
    const civs = Array.from(civManager.civilizations.values())
    if (civs.length < 2) return

    // Capture new hostages during conflicts
    if (this.hostages.length < MAX_HOSTAGES && Math.random() < CAPTURE_CHANCE) {
      const iA = Math.floor(Math.random() * civs.length)
      let iB = Math.floor(Math.random() * civs.length)
      if (iB === iA) iB = (iB + 1) % civs.length

      this.hostages.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 10000),
        captor: civs[iA].id,
        origin: civs[iB].id,
        status: 'captured',
        value: 20 + Math.random() * 80,
        tick,
      })
    }

    // Update hostage situations
    for (let i = this.hostages.length - 1; i >= 0; i--) {
      const h = this.hostages[i]

      if (h.status === 'captured' && Math.random() < NEGOTIATE_CHANCE) {
        h.status = 'negotiating'
      } else if (h.status === 'negotiating') {
        const roll = Math.random()
        if (roll < 0.4) h.status = 'exchanged'
        else if (roll < 0.5) h.status = 'executed'
      } else if (h.status === 'captured' && Math.random() < ESCAPE_CHANCE) {
        h.status = 'escaped'
      }

      const resolved = h.status === 'exchanged' || h.status === 'executed' || h.status === 'escaped'
      if (resolved && tick - h.tick > 3000) {
        this.hostages.splice(i, 1)
      }
    }
  }

  getHostages(): readonly Hostage[] { return this.hostages }
  getHostagesByCiv(civId: number): Hostage[] {
    return this.hostages.filter(h => h.captor === civId && h.status !== 'exchanged')
  }
}
