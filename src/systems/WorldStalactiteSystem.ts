// World Stalactite System (v3.131) - Stalactite cave formations in mountains
// Caves grow formations over time in limestone, crystal, ice, and lava variants

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CaveType = 'limestone' | 'crystal' | 'ice' | 'lava'

export interface StalactiteCave {
  id: number
  x: number
  y: number
  caveType: CaveType
  depth: number
  formations: number
  age: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 3400
const SPAWN_CHANCE = 0.003
const MAX_CAVES = 12

const CAVE_TYPES: CaveType[] = ['limestone', 'crystal', 'ice', 'lava']
const CAVE_DEPTH: Record<CaveType, number> = {
  limestone: 5, crystal: 8, ice: 3, lava: 10,
}
const GROWTH_RATE: Record<CaveType, number> = {
  limestone: 0.01, crystal: 0.005, ice: 0.02, lava: 0.008,
}

export class WorldStalactiteSystem {
  private caves: StalactiteCave[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.caves.length < MAX_CAVES && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      // Mountain (5) or snow/mountain terrain
      if (tile != null && (tile === 5 || tile === 6)) {
        const ct = CAVE_TYPES[Math.floor(Math.random() * CAVE_TYPES.length)]
        this.caves.push({
          id: this.nextId++,
          x, y,
          caveType: ct,
          depth: CAVE_DEPTH[ct] + Math.floor(Math.random() * 5),
          formations: 1 + Math.floor(Math.random() * 3),
          age: 0,
          active: true,
          tick,
        })
      }
    }

    for (const c of this.caves) {
      c.age = tick - c.tick
      // Stalactites grow slowly over time
      if (Math.random() < GROWTH_RATE[c.caveType]) {
        c.formations = Math.min(100, c.formations + 1)
      }
      // Very old caves may collapse
      if (c.age > 300000 && Math.random() < 0.0005) {
        c.active = false
      }
    }

    for (let i = this.caves.length - 1; i >= 0; i--) {
      if (!this.caves[i].active) this.caves.splice(i, 1)
    }
  }

  getCaves(): readonly StalactiteCave[] { return this.caves }
}
