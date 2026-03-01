// World Mineral Spring System (v3.513) - Mineral spring formations
// Natural springs rich in dissolved minerals and trace elements

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface MineralSpring {
  id: number
  x: number
  y: number
  mineralRichness: number
  flowRate: number
  temperature: number
  purity: number
  tick: number
}

const CHECK_INTERVAL = 3000
const FORM_CHANCE = 0.0013
const MAX_SPRINGS = 14

export class WorldMineralSpringSystem {
  private springs: MineralSpring[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.springs.length < MAX_SPRINGS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      this.springs.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        mineralRichness: 15 + Math.random() * 40,
        flowRate: 5 + Math.random() * 25,
        temperature: 10 + Math.random() * 35,
        purity: 20 + Math.random() * 30,
        tick,
      })
    }

    for (const s of this.springs) {
      s.mineralRichness = Math.max(5, Math.min(85, s.mineralRichness + (Math.random() - 0.48) * 0.2))
      s.flowRate = Math.max(2, Math.min(60, s.flowRate + (Math.random() - 0.5) * 0.15))
      s.purity = Math.max(10, Math.min(90, s.purity + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 87000
    for (let i = this.springs.length - 1; i >= 0; i--) {
      if (this.springs[i].tick < cutoff) this.springs.splice(i, 1)
    }
  }

}
