// Creature Oath System (v2.96) - Creatures swear oaths of loyalty, vengeance, or protection
// Oaths bind creatures to specific behaviors and grant mood/combat bonuses

import { EntityManager } from '../ecs/Entity'

export type OathType = 'loyalty' | 'vengeance' | 'protection' | 'pilgrimage' | 'silence' | 'service'

export interface Oath {
  id: number
  creatureId: number
  type: OathType
  targetId: number | null
  strength: number     // 0-100
  fulfilled: boolean
  tick: number
}

const CHECK_INTERVAL = 900
const OATH_CHANCE = 0.025
const MAX_OATHS = 80

const OATH_WEIGHTS: Record<OathType, number> = {
  loyalty: 0.25,
  vengeance: 0.15,
  protection: 0.2,
  pilgrimage: 0.15,
  silence: 0.1,
  service: 0.15,
}

const OATH_TYPES = Object.keys(OATH_WEIGHTS) as OathType[]

export class CreatureOathSystem {
  private oaths: Oath[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.generateOaths(em, tick)
    this.resolveFulfillment(tick)
    this.pruneOld()
  }

  private generateOaths(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const eid of entities) {
      if (Math.random() > OATH_CHANCE) continue

      const type = this.pickType()
      const others = entities.filter(e => e !== eid)
      const targetId = others.length > 0
        ? others[Math.floor(Math.random() * others.length)]
        : null

      this.oaths.push({
        id: this.nextId++,
        creatureId: eid,
        type,
        targetId,
        strength: 30 + Math.random() * 70,
        fulfilled: false,
        tick,
      })
    }
  }

  private pickType(): OathType {
    const r = Math.random()
    let cum = 0
    for (const t of OATH_TYPES) {
      cum += OATH_WEIGHTS[t]
      if (r <= cum) return t
    }
    return 'loyalty'
  }

  private resolveFulfillment(tick: number): void {
    for (const oath of this.oaths) {
      if (oath.fulfilled) continue
      // Oaths have a chance to be fulfilled over time
      const age = tick - oath.tick
      if (age > 2000 && Math.random() < 0.05) {
        oath.fulfilled = true
      }
    }
  }

  private pruneOld(): void {
    if (this.oaths.length > MAX_OATHS) {
      this.oaths.splice(0, this.oaths.length - MAX_OATHS)
    }
  }

  getOaths(): Oath[] { return this.oaths }
  getActiveOaths(): Oath[] { return this.oaths.filter(o => !o.fulfilled) }
  getFulfilledCount(): number { return this.oaths.filter(o => o.fulfilled).length }
}
