// Creature Forger System (v3.650) - Metal forging specialists
// Master craftspeople who shape metal through controlled hammering and pressing

import { EntityManager } from '../ecs/Entity'

export interface Forger {
  id: number
  entityId: number
  forgingSkill: number
  hammerControl: number
  metalReading: number
  structuralIntegrity: number
  tick: number
}

const CHECK_INTERVAL = 2900
const RECRUIT_CHANCE = 0.0014
const MAX_FORGERS = 10

export class CreatureForgerSystem {
  private forgers: Forger[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.forgers.length < MAX_FORGERS && Math.random() < RECRUIT_CHANCE) {
      this.forgers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        forgingSkill: 10 + Math.random() * 25,
        hammerControl: 15 + Math.random() * 20,
        metalReading: 5 + Math.random() * 20,
        structuralIntegrity: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const f of this.forgers) {
      f.forgingSkill = Math.min(100, f.forgingSkill + 0.02)
      f.hammerControl = Math.min(100, f.hammerControl + 0.015)
      f.structuralIntegrity = Math.min(100, f.structuralIntegrity + 0.01)
    }

    this.forgers = this.forgers.filter(f => f.forgingSkill > 4)
  }

  getForgers(): Forger[] { return this.forgers }
}
