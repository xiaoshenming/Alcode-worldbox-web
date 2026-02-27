// Creature Phobia System (v3.14) - Creatures develop phobias
// Fears affect creature movement and decision-making behavior

import { EntityManager } from '../ecs/Entity'

export type FearType = 'water' | 'fire' | 'heights' | 'darkness' | 'crowds' | 'storms'

export interface Phobia {
  id: number
  entityId: number
  fear: FearType
  severity: number   // 1-10
  tick: number
}

const CHECK_INTERVAL = 900
const PHOBIA_CHANCE = 0.01
const MAX_PHOBIAS = 120

const FEAR_WEIGHTS: Record<FearType, number> = {
  water: 0.2, fire: 0.2, heights: 0.15,
  darkness: 0.2, crowds: 0.1, storms: 0.15,
}
const FEARS = Object.keys(FEAR_WEIGHTS) as FearType[]

export class CreaturePhobiaSystem {
  private phobias: Phobia[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.developPhobias(em, tick)
    this.evolveSeverity()
    this.pruneOld()
  }

  private developPhobias(em: EntityManager, tick: number): void {
    if (this.phobias.length >= MAX_PHOBIAS) return
    const entities = em.getEntitiesWithComponents('creature')

    for (const eid of entities) {
      if (Math.random() > PHOBIA_CHANCE) continue
      // Avoid duplicate phobias for same entity+fear
      const fear = this.pickFear()
      const exists = this.phobias.some(p => p.entityId === eid && p.fear === fear)
      if (exists) continue

      this.phobias.push({
        id: this.nextId++,
        entityId: eid,
        fear,
        severity: 1 + Math.floor(Math.random() * 5),
        tick,
      })
    }
  }

  private pickFear(): FearType {
    const r = Math.random()
    let cum = 0
    for (const f of FEARS) {
      cum += FEAR_WEIGHTS[f]
      if (r <= cum) return f
    }
    return 'darkness'
  }

  private evolveSeverity(): void {
    for (const p of this.phobias) {
      // Severity can increase or decrease over time
      const drift = (Math.random() - 0.45) * 0.5
      p.severity = Math.min(10, Math.max(1, p.severity + drift))
    }
  }

  private pruneOld(): void {
    // Remove phobias that have faded (severity near minimum)
    for (let _i = this.phobias.length - 1; _i >= 0; _i--) { if (!((p) => p.severity > 1.1)(this.phobias[_i])) this.phobias.splice(_i, 1) }
    if (this.phobias.length > MAX_PHOBIAS) {
      this.phobias.splice(0, this.phobias.length - MAX_PHOBIAS)
    }
  }

  getPhobias(): Phobia[] { return this.phobias }
  getPhobiasForEntity(entityId: number): Phobia[] {
    return this.phobias.filter(p => p.entityId === entityId)
  }
}
