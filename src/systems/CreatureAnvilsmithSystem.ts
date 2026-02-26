// Creature Anvilsmith System (v3.533) - Anvil crafting artisans
// Skilled workers forging and maintaining anvils for metalworking

import { EntityManager } from '../ecs/Entity'

export interface Anvilsmith {
  id: number
  entityId: number
  heavyForging: number
  surfaceGrinding: number
  hornShaping: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2650
const RECRUIT_CHANCE = 0.0013
const MAX_ANVILSMITHS = 10

export class CreatureAnvilsmithSystem {
  private anvilsmiths: Anvilsmith[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.anvilsmiths.length < MAX_ANVILSMITHS && Math.random() < RECRUIT_CHANCE) {
      this.anvilsmiths.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        heavyForging: 10 + Math.random() * 25,
        surfaceGrinding: 15 + Math.random() * 20,
        hornShaping: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const a of this.anvilsmiths) {
      a.heavyForging = Math.min(100, a.heavyForging + 0.02)
      a.hornShaping = Math.min(100, a.hornShaping + 0.015)
      a.outputQuality = Math.min(100, a.outputQuality + 0.01)
    }

    this.anvilsmiths = this.anvilsmiths.filter(a => a.heavyForging > 4)
  }

  getAnvilsmiths(): Anvilsmith[] { return this.anvilsmiths }
}
