// Diplomatic Asylum System (v2.93) - Persecuted creatures seek asylum in other civilizations
// Exiled or low-loyalty creatures can flee to friendly nations for protection

import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'

export type AsylumStatus = 'seeking' | 'granted' | 'denied' | 'expired'

export interface AsylumRequest {
  id: number
  creatureId: number
  originCiv: string
  targetCiv: string
  status: AsylumStatus
  reason: string
  tick: number
  resolveTick: number
}

const CHECK_INTERVAL = 1000
const ASYLUM_CHANCE = 0.02
const GRANT_CHANCE = 0.6
const MAX_REQUESTS = 80
const RESOLVE_DELAY = 500

const ASYLUM_REASONS = [
  'political_exile',
  'religious_persecution',
  'war_refugee',
  'famine_escape',
  'criminal_flight',
  'tribal_conflict',
] as const

export class DiplomaticAsylumSystem {
  private requests: AsylumRequest[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.generateRequests(em, tick)
    this.resolveRequests(tick)
    this.pruneOld()
  }

  private generateRequests(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const eid of entities) {
      if (Math.random() > ASYLUM_CHANCE) continue

      const creature = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!creature) continue

      const reason = ASYLUM_REASONS[Math.floor(Math.random() * ASYLUM_REASONS.length)]
      const civs = ['human', 'elf', 'dwarf', 'orc']
      const originCiv = civs[Math.floor(Math.random() * civs.length)]
      let targetCiv = civs[Math.floor(Math.random() * civs.length)]
      while (targetCiv === originCiv && civs.length > 1) {
        targetCiv = civs[Math.floor(Math.random() * civs.length)]
      }

      this.requests.push({
        id: this.nextId++,
        creatureId: eid,
        originCiv,
        targetCiv,
        status: 'seeking',
        reason,
        tick,
        resolveTick: tick + RESOLVE_DELAY,
      })
    }
  }

  private resolveRequests(tick: number): void {
    for (const req of this.requests) {
      if (req.status !== 'seeking') continue
      if (tick < req.resolveTick) continue

      req.status = Math.random() < GRANT_CHANCE ? 'granted' : 'denied'
    }
  }

  private pruneOld(): void {
    if (this.requests.length > MAX_REQUESTS) {
      this.requests.splice(0, this.requests.length - MAX_REQUESTS)
    }
  }

  getRequests(): AsylumRequest[] { return this.requests }
  getPendingRequests(): AsylumRequest[] { return this.requests.filter(r => r.status === 'seeking') }
  getGrantedCount(): number { return this.requests.filter(r => r.status === 'granted').length }
  getDeniedCount(): number { return this.requests.filter(r => r.status === 'denied').length }
}
