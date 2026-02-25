// Diplomatic Atonement System (v3.430) - Atonement diplomacy
// Acts of contrition and making amends for past wrongs between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AtonementForm = 'public_apology' | 'memorial_construction' | 'reparative_service' | 'symbolic_gesture'

export interface AtonementProcess {
  id: number
  civIdA: number
  civIdB: number
  form: AtonementForm
  sincerityLevel: number
  acceptanceRate: number
  publicAwareness: number
  healingEffect: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2550
const PROCEED_CHANCE = 0.0021
const MAX_PROCESSES = 20

const FORMS: AtonementForm[] = ['public_apology', 'memorial_construction', 'reparative_service', 'symbolic_gesture']

export class DiplomaticAtonementSystem {
  private processes: AtonementProcess[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.processes.length < MAX_PROCESSES && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.processes.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        sincerityLevel: 20 + Math.random() * 35,
        acceptanceRate: 15 + Math.random() * 30,
        publicAwareness: 10 + Math.random() * 30,
        healingEffect: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const p of this.processes) {
      p.duration += 1
      p.sincerityLevel = Math.max(10, Math.min(85, p.sincerityLevel + (Math.random() - 0.46) * 0.12))
      p.acceptanceRate = Math.max(5, Math.min(80, p.acceptanceRate + (Math.random() - 0.47) * 0.11))
      p.publicAwareness = Math.max(5, Math.min(75, p.publicAwareness + (Math.random() - 0.45) * 0.10))
      p.healingEffect = Math.max(5, Math.min(70, p.healingEffect + (Math.random() - 0.48) * 0.09))
    }

    const cutoff = tick - 87000
    for (let i = this.processes.length - 1; i >= 0; i--) {
      if (this.processes[i].tick < cutoff) this.processes.splice(i, 1)
    }
  }

  getProcesses(): AtonementProcess[] { return this.processes }
}
