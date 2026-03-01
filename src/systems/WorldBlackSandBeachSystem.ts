// World Black Sand Beach System (v3.217) - Volcanic black sand beaches
// Magnetite-rich shores form where volcanic rock meets the relentless ocean waves

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface BlackSandBeachZone {
  id: number
  x: number
  y: number
  magnetiteContent: number
  waveEnergy: number
  sandDepth: number
  volcanism: number
  tick: number
}

const CHECK_INTERVAL = 2500
const FORM_CHANCE = 0.003
const MAX_ZONES = 36

export class WorldBlackSandBeachSystem {
  private zones: BlackSandBeachZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.zones.length >= MAX_ZONES) break

      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Coastal tiles near volcanic areas
      if (tile !== TileType.SAND && tile !== TileType.SHALLOW_WATER) continue
      if (Math.random() > FORM_CHANCE) continue

      // Check for nearby volcanic activity
      let hasVolcanic = false
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const t = world.getTile(x + dx, y + dy)
          if (t === TileType.LAVA || t === TileType.MOUNTAIN) hasVolcanic = true
        }
      }
      if (!hasVolcanic) continue

      this.zones.push({
        id: this.nextId++,
        x,
        y,
        magnetiteContent: 20 + Math.random() * 60,
        waveEnergy: 30 + Math.random() * 50,
        sandDepth: 10 + Math.random() * 40,
        volcanism: 40 + Math.random() * 40,
        tick,
      })
    }

    const cutoff = tick - 53000
    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (this.zones[i].tick < cutoff) this.zones.splice(i, 1)
    }
  }

}
