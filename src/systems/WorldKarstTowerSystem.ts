// World Karst Tower System (v3.262) - Dramatic limestone tower formations
// Tall isolated pillars of limestone rising from flat plains, shaped by millennia of erosion

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface KarstTower {
  id: number
  x: number
  y: number
  radius: number
  height: number
  erosionRate: number
  vegetationCover: number
  caveCount: number
  stability: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.002
const MAX_TOWERS = 22

export class WorldKarstTowerSystem {
  private towers: KarstTower[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.towers.length < MAX_TOWERS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.GRASS || tile === TileType.MOUNTAIN) {
        this.towers.push({
          id: this.nextId++,
          x, y,
          radius: 2 + Math.floor(Math.random() * 4),
          height: 30 + Math.random() * 70,
          erosionRate: 5 + Math.random() * 20,
          vegetationCover: 10 + Math.random() * 40,
          caveCount: Math.floor(Math.random() * 5),
          stability: 60 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const tower of this.towers) {
      tower.height = Math.max(10, tower.height - 0.001)
      tower.erosionRate = Math.max(1, Math.min(40, tower.erosionRate + (Math.random() - 0.5) * 0.1))
      tower.vegetationCover = Math.min(80, tower.vegetationCover + 0.008)
      tower.stability = Math.max(20, tower.stability - 0.002)
    }

    const cutoff = tick - 95000
    for (let i = this.towers.length - 1; i >= 0; i--) {
      if (this.towers[i].tick < cutoff) this.towers.splice(i, 1)
    }
  }

  getTowers(): KarstTower[] { return this.towers }
}
