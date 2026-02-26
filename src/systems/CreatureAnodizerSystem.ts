// Creature Anodizer System (v3.746) - Metal anodizing artisans
// Craftspeople who apply electrolytic passivation to increase oxide layer thickness on metals

import { EntityManager } from '../ecs/Entity'

export interface Anodizer {
  id: number
  entityId: number
  anodizingSkill: number
  electrolyteControl: number
  voltageRegulation: number
  coatingUniformity: number
  tick: number
}

const CHECK_INTERVAL = 3325
const RECRUIT_CHANCE = 0.0015
const MAX_ANODIZERS = 10

export class CreatureAnodizerSystem {
  private anodizers: Anodizer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.anodizers.length < MAX_ANODIZERS && Math.random() < RECRUIT_CHANCE) {
      this.anodizers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        anodizingSkill: 10 + Math.random() * 25,
        electrolyteControl: 15 + Math.random() * 20,
        voltageRegulation: 5 + Math.random() * 20,
        coatingUniformity: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const a of this.anodizers) {
      a.anodizingSkill = Math.min(100, a.anodizingSkill + 0.02)
      a.electrolyteControl = Math.min(100, a.electrolyteControl + 0.015)
      a.coatingUniformity = Math.min(100, a.coatingUniformity + 0.01)
    }

    this.anodizers = this.anodizers.filter(a => a.anodizingSkill > 4)
  }

  getAnodizers(): Anodizer[] { return this.anodizers }
}
