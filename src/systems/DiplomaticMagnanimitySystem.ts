// Diplomatic Magnanimity System (v3.373) - Magnanimity gestures
// Generous and forgiving treatment of rivals, especially after victory

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MagnanimityForm = 'generous_terms' | 'tribute_waiver' | 'territory_return' | 'honor_restoration'

export interface MagnanimityGesture {
  id: number
  civIdA: number
  civIdB: number
  form: MagnanimityForm
  generosity: number
  diplomaticGain: number
  rivalGratitude: number
  historicalImpact: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2360
const GESTURE_CHANCE = 0.0026
const MAX_GESTURES = 20

const FORMS: MagnanimityForm[] = ['generous_terms', 'tribute_waiver', 'territory_return', 'honor_restoration']

export class DiplomaticMagnanimitySystem {
  private gestures: MagnanimityGesture[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.gestures.length < MAX_GESTURES && Math.random() < GESTURE_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.gestures.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        generosity: 25 + Math.random() * 40,
        diplomaticGain: 20 + Math.random() * 35,
        rivalGratitude: 15 + Math.random() * 30,
        historicalImpact: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const g of this.gestures) {
      g.duration += 1
      g.generosity = Math.max(10, Math.min(90, g.generosity + (Math.random() - 0.46) * 0.13))
      g.diplomaticGain = Math.max(10, Math.min(85, g.diplomaticGain + (Math.random() - 0.5) * 0.12))
      g.rivalGratitude = Math.max(5, Math.min(75, g.rivalGratitude + (Math.random() - 0.45) * 0.11))
      g.historicalImpact = Math.max(5, Math.min(65, g.historicalImpact + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 86000
    for (let i = this.gestures.length - 1; i >= 0; i--) {
      if (this.gestures[i].tick < cutoff) this.gestures.splice(i, 1)
    }
  }

}
