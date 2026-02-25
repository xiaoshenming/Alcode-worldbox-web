// World Coral Atoll System (v3.242) - Ring-shaped coral reef islands
// Circular reef formations enclosing shallow lagoons in tropical waters

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface CoralAtoll {
  id: number
  x: number
  y: number
  outerRadius: number
  innerRadius: number
  coralHealth: number
  lagoonDepth: number
  biodiversity: number
  bleachingRisk: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.002
const MAX_ATOLLS = 20

export class WorldCoralAtollSystem {
  private atolls: CoralAtoll[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.atolls.length < MAX_ATOLLS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 12 + Math.floor(Math.random() * (w - 24))
      const y = 12 + Math.floor(Math.random() * (h - 24))
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER || tile === TileType.DEEP_WATER) {
        const outerRadius = 5 + Math.floor(Math.random() * 5)
        this.atolls.push({
          id: this.nextId++,
          x, y,
          outerRadius,
          innerRadius: Math.max(2, outerRadius - 2 - Math.floor(Math.random() * 2)),
          coralHealth: 50 + Math.random() * 40,
          lagoonDepth: 2 + Math.random() * 8,
          biodiversity: 30 + Math.random() * 50,
          bleachingRisk: Math.random() * 20,
          tick,
        })
      }
    }

    for (const atoll of this.atolls) {
      atoll.coralHealth = Math.max(10, Math.min(100, atoll.coralHealth + (Math.random() - 0.48) * 0.1))
      atoll.biodiversity = Math.min(100, atoll.biodiversity + 0.01)
      atoll.bleachingRisk = Math.max(0, Math.min(80, atoll.bleachingRisk + (Math.random() - 0.5) * 0.2))
    }

    const cutoff = tick - 95000
    for (let i = this.atolls.length - 1; i >= 0; i--) {
      if (this.atolls[i].tick < cutoff) this.atolls.splice(i, 1)
    }
  }

  getAtolls(): CoralAtoll[] { return this.atolls }
}
