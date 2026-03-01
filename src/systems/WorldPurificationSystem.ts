// World Purification System (v3.09) - Sacred sites purify corrupted land
// Purification waves spread outward, restoring terrain and boosting fertility

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager } from '../ecs/Entity'

export interface PurificationSite {
  id: number
  x: number
  y: number
  radius: number
  power: number        // 0-100
  growthRate: number
  age: number
  active: boolean
}

const CHECK_INTERVAL = 1000
const MAX_SITES = 8
const FORM_CHANCE = 0.01

export class WorldPurificationSystem {
  private sites: PurificationSite[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formSites(world)
    this.expandSites()
    this.cleanup()
  }

  private formSites(world: World): void {
    if (this.sites.length >= MAX_SITES) return
    if (Math.random() > FORM_CHANCE) return

    const x = Math.floor(Math.random() * world.width)
    const y = Math.floor(Math.random() * world.height)
    const tile = world.getTile(x, y)
    if (tile === null || tile === TileType.DEEP_WATER) return

    this.sites.push({
      id: this.nextId++,
      x, y,
      radius: 2,
      power: 30 + Math.random() * 50,
      growthRate: 0.01 + Math.random() * 0.03,
      age: 0,
      active: true,
    })
  }

  private expandSites(): void {
    for (const site of this.sites) {
      site.age++
      site.radius += site.growthRate
      site.radius = Math.min(20, site.radius)
      site.power *= 0.999
      if (site.power < 5) site.active = false
    }
  }

  private cleanup(): void {
    for (let i = this.sites.length - 1; i >= 0; i--) {
      if (!this.sites[i].active) this.sites.splice(i, 1)
    }
  }

  private _activeSitesBuf: PurificationSite[] = []
  getActiveSites(): PurificationSite[] {
    this._activeSitesBuf.length = 0
    for (const s of this.sites) { if (s.active) this._activeSitesBuf.push(s) }
    return this._activeSitesBuf
  }
}
