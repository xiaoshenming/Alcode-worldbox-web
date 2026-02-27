// Creature Toolsmith System (v3.536) - Tool forging artisans
// Master craftsmen who forge and maintain essential tools for civilization

import { EntityManager } from '../ecs/Entity'

export interface Toolsmith {
  id: number
  entityId: number
  metalWorking: number
  toolDesign: number
  temperingSkill: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2580
const RECRUIT_CHANCE = 0.0015
const MAX_TOOLSMITHS = 10

export class CreatureToolsmithSystem {
  private toolsmiths: Toolsmith[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.toolsmiths.length < MAX_TOOLSMITHS && Math.random() < RECRUIT_CHANCE) {
      this.toolsmiths.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        metalWorking: 10 + Math.random() * 25,
        toolDesign: 15 + Math.random() * 20,
        temperingSkill: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const t of this.toolsmiths) {
      t.metalWorking = Math.min(100, t.metalWorking + 0.02)
      t.temperingSkill = Math.min(100, t.temperingSkill + 0.015)
      t.outputQuality = Math.min(100, t.outputQuality + 0.01)
    }

    for (let _i = this.toolsmiths.length - 1; _i >= 0; _i--) { if (this.toolsmiths[_i].metalWorking <= 4) this.toolsmiths.splice(_i, 1) }
  }

  getToolsmiths(): Toolsmith[] { return this.toolsmiths }
}
