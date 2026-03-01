// Creature Annealer System (v3.638) - Metal annealing specialists
// Workers who heat-treat metals to reduce hardness and increase ductility

import { EntityManager } from '../ecs/Entity'

export interface Annealer {
  id: number
  entityId: number
  annealingSkill: number
  temperatureCycling: number
  coolingRate: number
  grainRefinement: number
  tick: number
}

const CHECK_INTERVAL = 2860
const RECRUIT_CHANCE = 0.0015
const MAX_ANNEALERS = 10

export class CreatureAnnealerSystem {
  private annealers: Annealer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.annealers.length < MAX_ANNEALERS && Math.random() < RECRUIT_CHANCE) {
      this.annealers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        annealingSkill: 10 + Math.random() * 25,
        temperatureCycling: 15 + Math.random() * 20,
        coolingRate: 5 + Math.random() * 20,
        grainRefinement: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const a of this.annealers) {
      a.annealingSkill = Math.min(100, a.annealingSkill + 0.02)
      a.temperatureCycling = Math.min(100, a.temperatureCycling + 0.015)
      a.grainRefinement = Math.min(100, a.grainRefinement + 0.01)
    }

    for (let _i = this.annealers.length - 1; _i >= 0; _i--) { if (this.annealers[_i].annealingSkill <= 4) this.annealers.splice(_i, 1) }
  }

}
