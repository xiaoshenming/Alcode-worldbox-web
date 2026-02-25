// World Fumarole Field System (v3.209) - Volcanic fumarole fields emitting steam and gases
// These geothermal vents form near volcanic activity, releasing sulfurous gases and superheated steam

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface FumaroleFieldZone {
  id: number
  x: number
  y: number
  temperature: number
  sulfurContent: number
  steamIntensity: number
  gasOutput: number
  tick: number
}

const CHECK_INTERVAL = 2400
const FORM_CHANCE = 0.003
const MAX_ZONES = 40

export class WorldFumaroleFieldSystem {
  private zones: FumaroleFieldZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width, h = world.height
    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.zones.length >= MAX_ZONES) break
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Form near mountain or volcanic (lava) tiles
      if (tile !== TileType.MOUNTAIN && tile !== TileType.LAVA) continue
      if (Math.random() > FORM_CHANCE) continue

      this.zones.push({
        id: this.nextId++,
        x, y,
        temperature: 80 + Math.random() * 120,
        sulfurContent: 10 + Math.random() * 50,
        steamIntensity: 20 + Math.random() * 60,
        gasOutput: 15 + Math.random() * 45,
        tick,
      })
    }

    // Fumarole activity fluctuates over time
    for (const z of this.zones) {
      z.temperature = Math.max(50, Math.min(300, z.temperature + (Math.random() - 0.48) * 5))
      z.steamIntensity = Math.max(5, Math.min(100, z.steamIntensity + (Math.random() - 0.5) * 3))
      z.sulfurContent = Math.max(0, Math.min(100, z.sulfurContent + (Math.random() - 0.5) * 2))
      z.gasOutput = Math.max(5, Math.min(100, z.gasOutput + (Math.random() - 0.48) * 2.5))
    }

    const cutoff = tick - 52000
    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (this.zones[i].tick < cutoff) {
        this.zones.splice(i, 1)
      }
    }
  }

  getZones(): readonly FumaroleFieldZone[] { return this.zones }
}
