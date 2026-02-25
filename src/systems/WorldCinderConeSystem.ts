// World Cinder Cone System (v3.269) - Small volcanic cinder cones
// Steep conical hills formed by volcanic debris and pyroclastic fragments

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface CinderCone {
  id: number
  x: number
  y: number
  radius: number
  height: number
  ashDeposit: number
  activity: number
  erosion: number
  temperature: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.0018
const MAX_CONES = 16

export class WorldCinderConeSystem {
  private cones: CinderCone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.cones.length < MAX_CONES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 12 + Math.floor(Math.random() * (w - 24))
      const y = 12 + Math.floor(Math.random() * (h - 24))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.LAVA) {
        this.cones.push({
          id: this.nextId++,
          x, y,
          radius: 3 + Math.floor(Math.random() * 4),
          height: 30 + Math.random() * 50,
          ashDeposit: 15 + Math.random() * 30,
          activity: 10 + Math.random() * 60,
          erosion: 5 + Math.random() * 15,
          temperature: 200 + Math.random() * 600,
          tick,
        })
      }
    }

    for (const cone of this.cones) {
      cone.activity = Math.max(0, Math.min(100, cone.activity + (Math.random() - 0.55) * 0.3))
      cone.ashDeposit = Math.min(80, cone.ashDeposit + cone.activity * 0.0005)
      cone.erosion = Math.min(60, cone.erosion + 0.005)
      cone.temperature = Math.max(50, Math.min(1200, cone.temperature + (cone.activity - 30) * 0.02))
      cone.height = Math.max(10, cone.height - cone.erosion * 0.0003)
    }

    const cutoff = tick - 95000
    for (let i = this.cones.length - 1; i >= 0; i--) {
      if (this.cones[i].tick < cutoff) this.cones.splice(i, 1)
    }
  }

  getCones(): CinderCone[] { return this.cones }
}
