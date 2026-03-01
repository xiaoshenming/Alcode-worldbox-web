// Creature Planisher Master System (v3.725) - Master planishing artisans
// Senior craftspeople who achieve mirror-finish surfaces through expert planishing

import { EntityManager } from '../ecs/Entity'

export interface PlanisherMaster {
  id: number
  entityId: number
  masterPlanishSkill: number
  mirrorFinish: number
  hammerControl: number
  surfacePerfection: number
  tick: number
}

const CHECK_INTERVAL = 3110
const RECRUIT_CHANCE = 0.0015
const MAX_MASTERS = 10

export class CreaturePlanisherMasterSystem {
  private masters: PlanisherMaster[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.masters.length < MAX_MASTERS && Math.random() < RECRUIT_CHANCE) {
      this.masters.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        masterPlanishSkill: 10 + Math.random() * 25,
        mirrorFinish: 15 + Math.random() * 20,
        hammerControl: 5 + Math.random() * 20,
        surfacePerfection: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const m of this.masters) {
      m.masterPlanishSkill = Math.min(100, m.masterPlanishSkill + 0.02)
      m.mirrorFinish = Math.min(100, m.mirrorFinish + 0.015)
      m.surfacePerfection = Math.min(100, m.surfacePerfection + 0.01)
    }

    for (let _i = this.masters.length - 1; _i >= 0; _i--) { if (this.masters[_i].masterPlanishSkill <= 4) this.masters.splice(_i, 1) }
  }

}
