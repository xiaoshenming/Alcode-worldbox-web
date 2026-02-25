// World Sand Dune System (v3.149) - Wind-driven sand dunes slowly migrate
// across desert terrain, reshaping the landscape over time

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager } from '../ecs/Entity'

export interface SandDune {
  id: number
  x: number
  y: number
  height: number          // 1-10, affects migration resistance
  windDirection: number   // radians, current wind angle
  migrationSpeed: number  // tiles per check cycle
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 4500
const SPAWN_CHANCE = 0.003
const MAX_DUNES = 10
const WIND_SHIFT_RATE = 0.15

export class WorldSandDuneSystem {
  private dunes: SandDune[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.spawnDunes(world, tick)
    this.migrateDunes(world)
    this.cleanup()
  }

  private spawnDunes(world: World, tick: number): void {
    if (this.dunes.length >= MAX_DUNES) return
    if (Math.random() > SPAWN_CHANCE) return

    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 20; attempt++) {
      const x = 3 + Math.floor(Math.random() * (w - 6))
      const y = 3 + Math.floor(Math.random() * (h - 6))

      if (world.getTile(x, y) !== TileType.SAND) continue

      // Need a cluster of sand tiles
      let sandCount = 0
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (world.getTile(x + dx, y + dy) === TileType.SAND) sandCount++
        }
      }
      if (sandCount < 8) continue

      this.dunes.push({
        id: this.nextId++,
        x, y,
        height: 2 + Math.floor(Math.random() * 6),
        windDirection: Math.random() * Math.PI * 2,
        migrationSpeed: 0.3 + Math.random() * 0.7,
        active: true,
        tick,
      })
      break
    }
  }

  private migrateDunes(world: World): void {
    for (const dune of this.dunes) {
      // Wind direction shifts gradually
      dune.windDirection += (Math.random() - 0.5) * WIND_SHIFT_RATE
      dune.height += (Math.random() - 0.5) * 0.4
      dune.height = Math.max(1, Math.min(10, dune.height))

      // Calculate migration displacement
      const speed = dune.migrationSpeed / (1 + dune.height * 0.1)
      const nx = Math.round(dune.x + Math.cos(dune.windDirection) * speed)
      const ny = Math.round(dune.y + Math.sin(dune.windDirection) * speed)

      // Validate new position
      if (nx < 1 || nx >= world.width - 1 || ny < 1 || ny >= world.height - 1) {
        dune.active = false
        continue
      }

      const targetTile = world.getTile(nx, ny)

      // Dunes can only migrate over sand or convert grass to sand
      if (targetTile === TileType.SAND) {
        dune.x = nx
        dune.y = ny
      } else if (targetTile === TileType.GRASS && Math.random() < 0.15) {
        world.setTile(nx, ny, TileType.SAND)
        dune.x = nx
        dune.y = ny
      } else if (targetTile === TileType.DEEP_WATER || targetTile === TileType.SHALLOW_WATER) {
        dune.active = false
      }
    }
  }

  private cleanup(): void {
    for (let i = this.dunes.length - 1; i >= 0; i--) {
      if (!this.dunes[i].active) {
        this.dunes.splice(i, 1)
      }
    }
  }

  getDunes(): SandDune[] { return this.dunes }
}
