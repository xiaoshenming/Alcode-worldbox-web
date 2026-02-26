// Creature Annealer System (v3.602) - Metal annealing artisans
// Craftspeople who heat-treat metals to reduce hardness and increase ductility

import { EntityManager } from '../ecs/Entity'

export interface Annealer {
  id: number
  entityId: number
  annealingSkill: number
  temperatureControl: number
  coolingRate: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2780
const RECRUIT_CHANCE = 0.0014
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
        temperatureControl: 15 + Math.random() * 20,
        coolingRate: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const a of this.annealers) {
      a.annealingSkill = Math.min(100, a.annealingSkill + 0.02)
      a.temperatureControl = Math.min(100, a.temperatureControl + 0.015)
      a.outputQuality = Math.min(100, a.outputQuality + 0.01)
    }

    this.annealers = this.annealers.filter(a => a.annealingSkill > 4)
  }

  getAnnealers(): Annealer[] { return this.annealers }
}
