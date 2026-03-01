// World Ice Sheet System (v3.154) - Massive ice sheets form in frigid regions,
// expanding or retreating based on temperature, affecting surrounding climate

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager } from '../ecs/Entity'

export interface IceSheet {
  id: number
  x: number
  y: number
  thickness: number    // 1-100, ice depth
  area: number         // number of tiles covered
  meltRate: number     // how fast it melts per cycle
  age: number          // ticks since formation
  expanding: boolean
  tick: number
}

const CHECK_INTERVAL = 4000
const SPAWN_CHANCE = 0.002
const MAX_ICE_SHEETS = 8
const EXPANSION_CHANCE = 0.25
const MELT_THRESHOLD = 60

export class WorldIceSheetSystem {
  private iceSheets: IceSheet[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formIceSheets(world, tick)
    this.evolveIceSheets(world)
    this.cleanup()
  }

  private formIceSheets(world: World, tick: number): void {
    if (this.iceSheets.length >= MAX_ICE_SHEETS) return
    if (Math.random() > SPAWN_CHANCE) return

    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 20; attempt++) {
      const x = 4 + Math.floor(Math.random() * (w - 8))
      const y = 4 + Math.floor(Math.random() * (h - 8))

      if (world.getTile(x, y) !== TileType.SNOW) continue

      let snowCount = 0
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          if (world.getTile(x + dx, y + dy) === TileType.SNOW) snowCount++
        }
      }
      if (snowCount < 12) continue
      if (this.iceSheets.some(s => Math.abs(s.x - x) < 8 && Math.abs(s.y - y) < 8)) continue

      this.iceSheets.push({
        id: this.nextId++,
        x, y,
        thickness: 20 + Math.random() * 30,
        area: snowCount,
        meltRate: 0.5 + Math.random() * 1.5,
        age: 0,
        expanding: true,
        tick,
      })
      break
    }
  }

  private evolveIceSheets(world: World): void {
    for (const sheet of this.iceSheets) {
      sheet.age++
      if (sheet.expanding) {
        if (Math.random() < EXPANSION_CHANCE) {
          const dx = (Math.random() < 0.5 ? -1 : 1) * 3
          const dy = (Math.random() < 0.5 ? -1 : 1) * 3
          const nx = sheet.x + dx, ny = sheet.y + dy
          if (nx >= 0 && nx < world.width && ny >= 0 && ny < world.height) {
            const tile = world.getTile(nx, ny)
            if (tile === TileType.GRASS || tile === TileType.MOUNTAIN) {
              world.setTile(nx, ny, TileType.SNOW)
              sheet.area++
            }
          }
        }
        sheet.thickness = Math.min(100, sheet.thickness + 1.2)
        if (sheet.age > 800 || sheet.thickness >= 90) sheet.expanding = false
      } else {
        sheet.thickness -= sheet.meltRate
        sheet.meltRate += 0.02
        if (sheet.thickness < MELT_THRESHOLD && Math.random() < 0.1) {
          const mx = sheet.x + Math.floor(Math.random() * 5) - 2
          const my = sheet.y + Math.floor(Math.random() * 5) - 2
          if (world.getTile(mx, my) === TileType.SNOW) {
            world.setTile(mx, my, TileType.GRASS)
            sheet.area--
          }
        }
      }
    }
  }

  private cleanup(): void {
    for (let i = this.iceSheets.length - 1; i >= 0; i--) {
      if (this.iceSheets[i].thickness <= 0 || this.iceSheets[i].area <= 0) {
        this.iceSheets.splice(i, 1)
      }
    }
  }

}
