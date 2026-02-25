// World Permafrost Thaw System (v3.229) - Melting permafrost releases trapped gases
// Climate-driven thawing that destabilizes terrain and releases methane

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface PermafrostThawZone {
  id: number
  x: number
  y: number
  radius: number
  thawDepth: number
  methaneRelease: number
  groundStability: number
  temperature: number
  tick: number
}

const CHECK_INTERVAL = 2900
const FORM_CHANCE = 0.002
const MAX_ZONES = 24

export class WorldPermafrostThawSystem {
  private zones: PermafrostThawZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.zones.length < MAX_ZONES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 8 + Math.floor(Math.random() * (w - 16))
      const y = 8 + Math.floor(Math.random() * (h - 16))
      const tile = world.getTile(x, y)

      if (tile === TileType.SNOW || tile === TileType.MOUNTAIN) {
        const radius = 3 + Math.floor(Math.random() * 5)
        this.zones.push({
          id: this.nextId++,
          x, y, radius,
          thawDepth: 0.1 + Math.random() * 0.5,
          methaneRelease: Math.random() * 10,
          groundStability: 70 + Math.random() * 25,
          temperature: -15 + Math.random() * 10,
          tick,
        })
      }
    }

    for (const zone of this.zones) {
      zone.thawDepth = Math.min(10, zone.thawDepth + 0.005)
      zone.methaneRelease = Math.min(100, zone.methaneRelease + zone.thawDepth * 0.02)
      zone.groundStability = Math.max(5, zone.groundStability - 0.03)
      zone.temperature = Math.min(5, zone.temperature + 0.002)
    }

    const cutoff = tick - 85000
    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (this.zones[i].tick < cutoff) {
        this.zones.splice(i, 1)
      }
    }
  }

  getZones(): readonly PermafrostThawZone[] { return this.zones }
}
