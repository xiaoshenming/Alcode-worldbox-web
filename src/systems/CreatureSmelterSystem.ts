// Creature Smelter System (v3.611) - Ore smelting artisans
// Craftspeople who extract metals from raw ores through heat

import { EntityManager } from '../ecs/Entity'

export interface Smelter {
  id: number
  entityId: number
  smeltingSkill: number
  oreKnowledge: number
  heatManagement: number
  yieldEfficiency: number
  tick: number
}

const CHECK_INTERVAL = 2770
const RECRUIT_CHANCE = 0.0015
const MAX_SMELTERS = 10

export class CreatureSmelterSystem {
  private smelters: Smelter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.smelters.length < MAX_SMELTERS && Math.random() < RECRUIT_CHANCE) {
      this.smelters.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        smeltingSkill: 10 + Math.random() * 25,
        oreKnowledge: 15 + Math.random() * 20,
        heatManagement: 5 + Math.random() * 20,
        yieldEfficiency: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.smelters) {
      s.smeltingSkill = Math.min(100, s.smeltingSkill + 0.02)
      s.oreKnowledge = Math.min(100, s.oreKnowledge + 0.015)
      s.yieldEfficiency = Math.min(100, s.yieldEfficiency + 0.01)
    }

    for (let _i = this.smelters.length - 1; _i >= 0; _i--) { if (this.smelters[_i].smeltingSkill <= 4) this.smelters.splice(_i, 1) }
  }

  getSmelters(): Smelter[] { return this.smelters }
}
