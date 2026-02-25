// World Geyser System (v3.12) - Geysers erupt periodically on the map
// Geysers spawn randomly, erupt on a cycle, and affect surrounding terrain

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface Geyser {
  id: number
  x: number
  y: number
  power: number       // 1-10
  interval: number    // eruption interval in ticks
  lastEruption: number
  active: boolean
}

const CHECK_INTERVAL = 500
const SPAWN_CHANCE = 0.003
const MAX_GEYSERS = 30

export class WorldGeyserSystem {
  private geysers: Geyser[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.spawnGeysers(world)
    this.processEruptions(tick)
    this.cleanup()
  }

  private spawnGeysers(world: World): void {
    if (this.geysers.length >= MAX_GEYSERS) return
    if (Math.random() > SPAWN_CHANCE) return

    const x = Math.floor(Math.random() * world.width)
    const y = Math.floor(Math.random() * world.height)
    const tile = world.getTile(x, y)
    if (tile === null) return

    this.geysers.push({
      id: this.nextId++,
      x, y,
      power: 1 + Math.floor(Math.random() * 10),
      interval: 800 + Math.floor(Math.random() * 1200),
      lastEruption: 0,
      active: true,
    })
  }

  private processEruptions(tick: number): void {
    for (const g of this.geysers) {
      if (!g.active) continue
      if (tick - g.lastEruption < g.interval) continue
      g.lastEruption = tick
      // Power decays slightly each eruption
      g.power = Math.max(1, g.power - Math.random() * 0.3)
      if (g.power <= 1 && Math.random() < 0.05) {
        g.active = false
      }
    }
  }

  private cleanup(): void {
    for (let i = this.geysers.length - 1; i >= 0; i--) {
      if (!this.geysers[i].active) this.geysers.splice(i, 1)
    }
  }

  getGeysers(): Geyser[] { return this.geysers }
  getActiveGeysers(): Geyser[] {
    return this.geysers.filter(g => g.active)
  }
}
