// World Natural Tunnel System (v3.429) - Natural tunnel formations
// Tunnels formed through rock by water erosion or lava flow

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface NaturalTunnel {
  id: number
  x: number
  y: number
  length: number
  diameter: number
  stability: number
  waterFlow: number
  echoEffect: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2650
const FORM_CHANCE = 0.0011
const MAX_TUNNELS = 12

export class WorldNaturalTunnelSystem {
  private tunnels: NaturalTunnel[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.tunnels.length < MAX_TUNNELS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN) {
        this.tunnels.push({
          id: this.nextId++,
          x, y,
          length: 10 + Math.random() * 40,
          diameter: 2 + Math.random() * 8,
          stability: 45 + Math.random() * 40,
          waterFlow: 5 + Math.random() * 25,
          echoEffect: 15 + Math.random() * 30,
          spectacle: 20 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const t of this.tunnels) {
      t.diameter = Math.min(15, t.diameter + 0.000004)
      t.stability = Math.max(10, t.stability - 0.00003)
      t.waterFlow = Math.max(0, Math.min(50, t.waterFlow + (Math.random() - 0.48) * 0.07))
      t.spectacle = Math.max(10, Math.min(65, t.spectacle + (Math.random() - 0.47) * 0.08))
    }

    const cutoff = tick - 95000
    for (let i = this.tunnels.length - 1; i >= 0; i--) {
      if (this.tunnels[i].tick < cutoff) this.tunnels.splice(i, 1)
    }
  }

  getTunnels(): NaturalTunnel[] { return this.tunnels }
}
