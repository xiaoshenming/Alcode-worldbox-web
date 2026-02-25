// Diplomatic Rapprochement System (v3.337) - Rapprochement agreements
// Restoration of cordial relations after periods of hostility or estrangement

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type RapprochementStage = 'overture' | 'dialogue' | 'cooperation' | 'partnership'

export interface RapprochementAgreement {
  id: number
  civIdA: number
  civIdB: number
  stage: RapprochementStage
  goodwillLevel: number
  diplomaticProgress: number
  economicTies: number
  culturalBonds: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2360
const TREATY_CHANCE = 0.0026
const MAX_TREATIES = 20

const STAGES: RapprochementStage[] = ['overture', 'dialogue', 'cooperation', 'partnership']

export class DiplomaticRapprochementSystem {
  private treaties: RapprochementAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const stage = STAGES[Math.floor(Math.random() * STAGES.length)]

      this.treaties.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        stage,
        goodwillLevel: 10 + Math.random() * 30,
        diplomaticProgress: 5 + Math.random() * 25,
        economicTies: 8 + Math.random() * 22,
        culturalBonds: 5 + Math.random() * 20,
        duration: 0,
        tick,
      })
    }

    for (const treaty of this.treaties) {
      treaty.duration += 1
      treaty.goodwillLevel = Math.max(5, Math.min(85, treaty.goodwillLevel + (Math.random() - 0.44) * 0.13))
      treaty.diplomaticProgress = Math.max(3, Math.min(80, treaty.diplomaticProgress + (Math.random() - 0.45) * 0.11))
      treaty.economicTies = Math.max(3, Math.min(70, treaty.economicTies + (Math.random() - 0.46) * 0.1))
      treaty.culturalBonds = Math.max(2, Math.min(65, treaty.culturalBonds + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 84000
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      if (this.treaties[i].tick < cutoff) this.treaties.splice(i, 1)
    }
  }

  getTreaties(): RapprochementAgreement[] { return this.treaties }
}
