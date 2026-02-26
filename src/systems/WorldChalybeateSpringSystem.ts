// World Chalybeate Spring System (v3.525) - Iron-rich spring formations
// Natural springs containing dissolved iron compounds

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface ChalybeateSpring {
  id: number
  x: number
  y: number
  ironContent: number
  flowRate: number
  rustDeposit: number
  waterTaste: number
  tick: number
}

const CHECK_INTERVAL = 3060
const FORM_CHANCE = 0.0011
const MAX_SPRINGS = 12

export class WorldChalybeateSpringSystem {
  private springs: ChalybeateSpring[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.springs.length < MAX_SPRINGS && Math.random() < FORM_CHANCE) {
      this.springs.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * world.width),
        y: Math.floor(Math.random() * world.height),
        ironContent: 15 + Math.random() * 35,
        flowRate: 5 + Math.random() * 25,
        rustDeposit: 10 + Math.random() * 30,
        waterTaste: 20 + Math.random() * 40,
        tick,
      })
    }

    for (const s of this.springs) {
      s.ironContent = Math.max(5, Math.min(75, s.ironContent + (Math.random() - 0.48) * 0.2))
      s.flowRate = Math.max(2, Math.min(50, s.flowRate + (Math.random() - 0.5) * 0.15))
      s.rustDeposit = Math.min(70, s.rustDeposit + 0.006)
    }

    const cutoff = tick - 83000
    for (let i = this.springs.length - 1; i >= 0; i--) {
      if (this.springs[i].tick < cutoff) this.springs.splice(i, 1)
    }
  }

  getSprings(): ChalybeateSpring[] { return this.springs }
}
