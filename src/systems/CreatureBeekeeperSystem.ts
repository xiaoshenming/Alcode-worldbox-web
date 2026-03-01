// Creature Beekeeper System (v3.171) - Creatures tend bee colonies for honey and wax
// Beekeepers maintain hives, harvest honey, and trade bee products

import { EntityManager } from '../ecs/Entity'

export type HiveType = 'log' | 'clay' | 'woven' | 'frame'

export interface Beekeeper {
  id: number
  entityId: number
  skill: number
  hivesManaged: number
  honeyHarvested: number
  waxCollected: number
  hiveType: HiveType
  beeHealth: number
  tick: number
}

const CHECK_INTERVAL = 3400
const SPAWN_CHANCE = 0.003
const MAX_BEEKEEPERS = 12

const HIVE_TYPES: HiveType[] = ['log', 'clay', 'woven', 'frame']
const HIVE_YIELD: Record<HiveType, number> = {
  log: 0.15, clay: 0.25, woven: 0.20, frame: 0.35,
}

export class CreatureBeekeeperSystem {
  private beekeepers: Beekeeper[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new beekeepers
    if (this.beekeepers.length < MAX_BEEKEEPERS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        if (!this.beekeepers.some(b => b.entityId === eid)) {
          const hive = HIVE_TYPES[Math.floor(Math.random() * HIVE_TYPES.length)]
          this.beekeepers.push({
            id: this.nextId++, entityId: eid,
            skill: 5 + Math.random() * 15,
            hivesManaged: 1,
            honeyHarvested: 0, waxCollected: 0,
            hiveType: hive,
            beeHealth: 60 + Math.random() * 30,
            tick,
          })
        }
      }
    }

    for (const bk of this.beekeepers) {
      // Harvest honey based on skill and hive type
      const yieldRate = HIVE_YIELD[bk.hiveType] * (bk.skill / 100) * (bk.beeHealth / 100)
      if (Math.random() < yieldRate * 0.05) {
        bk.honeyHarvested++
        bk.skill = Math.min(100, bk.skill + 0.2)
      }

      // Collect wax as byproduct
      if (bk.honeyHarvested > 0 && Math.random() < 0.02) {
        bk.waxCollected++
      }

      // Bee health fluctuation
      bk.beeHealth = Math.max(10, Math.min(100, bk.beeHealth + (Math.random() - 0.45) * 3))

      // Expand hives with experience
      if (bk.skill > 40 && bk.hivesManaged < 5 && Math.random() < 0.003) {
        bk.hivesManaged++
      }

      // Upgrade hive type with skill
      if (bk.skill > 60 && bk.hiveType !== 'frame' && Math.random() < 0.005) {
        const idx = HIVE_TYPES.indexOf(bk.hiveType)
        if (idx < HIVE_TYPES.length - 1) bk.hiveType = HIVE_TYPES[idx + 1]
      }
    }

    // Remove beekeepers whose creatures no longer exist
    for (let i = this.beekeepers.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.beekeepers[i].entityId, 'creature')) this.beekeepers.splice(i, 1)
    }
  }

}
