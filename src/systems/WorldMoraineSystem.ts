// World Moraine System (v3.312) - Glacial moraine formations
// Ridges of debris deposited by retreating glaciers

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Moraine {
  id: number
  x: number
  y: number
  length: number
  height: number
  debrisType: number
  glacialAge: number
  vegetationCover: number
  stability: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.0016
const MAX_MORAINES = 14

export class WorldMoraineSystem {
  private moraines: Moraine[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.moraines.length < MAX_MORAINES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SNOW) {
        this.moraines.push({
          id: this.nextId++,
          x, y,
          length: 15 + Math.random() * 40,
          height: 5 + Math.random() * 20,
          debrisType: Math.floor(Math.random() * 5),
          glacialAge: 100 + Math.random() * 500,
          vegetationCover: 5 + Math.random() * 30,
          stability: 40 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const moraine of this.moraines) {
      moraine.vegetationCover = Math.max(2, Math.min(80, moraine.vegetationCover + (Math.random() - 0.45) * 0.12))
      moraine.stability = Math.max(15, Math.min(90, moraine.stability + (Math.random() - 0.5) * 0.1))
      moraine.height = Math.max(2, moraine.height - 0.0002)
      moraine.glacialAge += 0.01
    }

    const cutoff = tick - 94000
    for (let i = this.moraines.length - 1; i >= 0; i--) {
      if (this.moraines[i].tick < cutoff) this.moraines.splice(i, 1)
    }
  }

  getMoraines(): Moraine[] { return this.moraines }
}
