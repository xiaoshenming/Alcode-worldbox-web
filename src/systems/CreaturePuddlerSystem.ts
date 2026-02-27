// Creature Puddler System (v3.614) - Iron puddling artisans
// Workers who stir molten iron to remove carbon and produce wrought iron

import { EntityManager } from '../ecs/Entity'

export interface Puddler {
  id: number
  entityId: number
  puddlingSkill: number
  stirringTechnique: number
  carbonControl: number
  ironPurity: number
  tick: number
}

const CHECK_INTERVAL = 2780
const RECRUIT_CHANCE = 0.0014
const MAX_PUDDLERS = 10

export class CreaturePuddlerSystem {
  private puddlers: Puddler[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.puddlers.length < MAX_PUDDLERS && Math.random() < RECRUIT_CHANCE) {
      this.puddlers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        puddlingSkill: 10 + Math.random() * 25,
        stirringTechnique: 15 + Math.random() * 20,
        carbonControl: 5 + Math.random() * 20,
        ironPurity: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const p of this.puddlers) {
      p.puddlingSkill = Math.min(100, p.puddlingSkill + 0.02)
      p.stirringTechnique = Math.min(100, p.stirringTechnique + 0.015)
      p.ironPurity = Math.min(100, p.ironPurity + 0.01)
    }

    for (let _i = this.puddlers.length - 1; _i >= 0; _i--) { if (this.puddlers[_i].puddlingSkill <= 4) this.puddlers.splice(_i, 1) }
  }

  getPuddlers(): Puddler[] { return this.puddlers }
}
