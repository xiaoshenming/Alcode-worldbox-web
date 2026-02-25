// World Ventifact System (v3.378) - Ventifact wind-sculpted stones
// Rocks shaped and polished by wind-driven sand abrasion in deserts

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Ventifact {
  id: number
  x: number
  y: number
  facets: number
  polish: number
  windExposure: number
  rockType: number
  abrasionRate: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2560
const FORM_CHANCE = 0.0015
const MAX_VENTIFACTS = 18

export class WorldVentifactSystem {
  private ventifacts: Ventifact[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.ventifacts.length < MAX_VENTIFACTS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.MOUNTAIN) {
        this.ventifacts.push({
          id: this.nextId++,
          x, y,
          facets: 1 + Math.floor(Math.random() * 5),
          polish: 10 + Math.random() * 40,
          windExposure: 30 + Math.random() * 50,
          rockType: Math.floor(Math.random() * 4),
          abrasionRate: 5 + Math.random() * 20,
          spectacle: 8 + Math.random() * 25,
          tick,
        })
      }
    }

    for (const v of this.ventifacts) {
      v.facets = Math.min(6, v.facets + (Math.random() < 0.0005 ? 1 : 0))
      v.polish = Math.min(80, v.polish + 0.00004)
      v.abrasionRate = Math.max(2, Math.min(35, v.abrasionRate + (Math.random() - 0.5) * 0.08))
      v.spectacle = Math.max(5, Math.min(50, v.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 90000
    for (let i = this.ventifacts.length - 1; i >= 0; i--) {
      if (this.ventifacts[i].tick < cutoff) this.ventifacts.splice(i, 1)
    }
  }

  getVentifacts(): Ventifact[] { return this.ventifacts }
}
