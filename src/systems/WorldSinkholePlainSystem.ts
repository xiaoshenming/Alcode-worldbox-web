// World Sinkhole Plain System (v3.247) - Karst landscapes dotted with sinkholes
// Terrain where underground limestone dissolution creates surface depressions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface SinkholePlain {
  id: number
  x: number
  y: number
  radius: number
  depth: number
  waterLevel: number
  collapseRisk: number
  vegetationRing: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.002
const MAX_PLAINS = 22

export class WorldSinkholePlainSystem {
  private plains: SinkholePlain[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.plains.length < MAX_PLAINS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.GRASS || tile === TileType.FOREST) {
        this.plains.push({
          id: this.nextId++,
          x, y,
          radius: 3 + Math.floor(Math.random() * 5),
          depth: 5 + Math.random() * 25,
          waterLevel: Math.random() * 40,
          collapseRisk: 5 + Math.random() * 30,
          vegetationRing: 10 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const plain of this.plains) {
      plain.depth = Math.min(50, plain.depth + 0.002)
      plain.waterLevel = Math.max(0, Math.min(plain.depth * 0.8, plain.waterLevel + (Math.random() - 0.45) * 0.3))
      plain.collapseRisk = Math.max(1, Math.min(60, plain.collapseRisk + (Math.random() - 0.5) * 0.1))
      plain.vegetationRing = Math.min(80, plain.vegetationRing + 0.01)
    }

    const cutoff = tick - 90000
    for (let i = this.plains.length - 1; i >= 0; i--) {
      if (this.plains[i].tick < cutoff) this.plains.splice(i, 1)
    }
  }

}
