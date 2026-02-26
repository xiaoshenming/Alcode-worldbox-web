// Creature Glazier Master System (v3.560) - Master glass artisans
// Elite glaziers who create stained glass and decorative windows

import { EntityManager } from '../ecs/Entity'

export interface GlazierMaster {
  id: number
  entityId: number
  glassCutting: number
  leadWork: number
  colorMixing: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2670
const RECRUIT_CHANCE = 0.0013
const MAX_MASTERS = 10

export class CreatureGlazierMasterSystem {
  private masters: GlazierMaster[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.masters.length < MAX_MASTERS && Math.random() < RECRUIT_CHANCE) {
      this.masters.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        glassCutting: 10 + Math.random() * 25,
        leadWork: 15 + Math.random() * 20,
        colorMixing: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const m of this.masters) {
      m.glassCutting = Math.min(100, m.glassCutting + 0.02)
      m.colorMixing = Math.min(100, m.colorMixing + 0.015)
      m.outputQuality = Math.min(100, m.outputQuality + 0.01)
    }

    this.masters = this.masters.filter(m => m.glassCutting > 4)
  }

  getMasters(): GlazierMaster[] { return this.masters }
}
