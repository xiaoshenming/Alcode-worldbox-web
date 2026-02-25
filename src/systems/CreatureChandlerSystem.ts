// Creature Chandler System (v3.186) - Creatures collect beeswax and tallow to craft candles
// Candles provide illumination, trade value, and ceremonial use

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type WickType = 'cotton' | 'hemp' | 'linen' | 'silk'

export interface Chandler {
  id: number
  entityId: number
  skill: number
  candlesProduced: number
  waxStored: number
  wickType: WickType
  lightOutput: number
  tick: number
}

const CHECK_INTERVAL = 1200
const CRAFT_CHANCE = 0.006
const MAX_CHANDLERS = 60
const SKILL_GROWTH = 0.07

const WICK_TYPES: WickType[] = ['cotton', 'hemp', 'linen', 'silk']

export class CreatureChandlerSystem {
  private chandlers: Chandler[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.chandlers.length >= MAX_CHANDLERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 8) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 12)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const wickType = WICK_TYPES[Math.floor(Math.random() * WICK_TYPES.length)]
      const waxStored = 5 + Math.random() * skill * 0.8
      const candlesProduced = 1 + Math.floor(skill / 20)
      const lightOutput = skill * (0.4 + Math.random() * 0.6)

      this.chandlers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        candlesProduced,
        waxStored,
        wickType,
        lightOutput,
        tick,
      })
    }

    // Expire old chandler records
    const cutoff = tick - 45000
    for (let i = this.chandlers.length - 1; i >= 0; i--) {
      if (this.chandlers[i].tick < cutoff) {
        this.chandlers.splice(i, 1)
      }
    }
  }

  getChandlers(): readonly Chandler[] { return this.chandlers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
