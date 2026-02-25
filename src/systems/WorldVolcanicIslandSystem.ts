// World Volcanic Island System (v3.72) - Volcanic eruptions create new islands
// Islands emerge from ocean, cool over time, and become habitable

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type IslandStage = 'erupting' | 'cooling' | 'barren' | 'fertile' | 'lush'

export interface VolcanicIsland {
  id: number
  x: number
  y: number
  radius: number
  stage: IslandStage
  age: number
  fertility: number
  tick: number
}

const CHECK_INTERVAL = 2000
const EMERGE_CHANCE = 0.002
const MAX_ISLANDS = 30
const STAGE_DURATION = 8000

const STAGES: IslandStage[] = ['erupting', 'cooling', 'barren', 'fertile', 'lush']

export class WorldVolcanicIslandSystem {
  private islands: VolcanicIsland[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Chance to spawn new volcanic island in deep water
    if (this.islands.length < MAX_ISLANDS && Math.random() < EMERGE_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile !== null && tile <= 1) { // deep or shallow water
        const radius = 2 + Math.floor(Math.random() * 4)
        this.islands.push({
          id: this.nextId++,
          x, y, radius,
          stage: 'erupting',
          age: 0,
          fertility: Math.random() * 30,
          tick,
        })
      }
    }

    // Progress island stages
    for (const island of this.islands) {
      island.age = tick - island.tick
      const stageIdx = Math.min(STAGES.length - 1, Math.floor(island.age / STAGE_DURATION))
      island.stage = STAGES[stageIdx]
      if (island.stage === 'fertile' || island.stage === 'lush') {
        island.fertility = Math.min(100, island.fertility + 0.05)
      }
    }

    // Remove very old islands (absorbed into mainland)
    const cutoff = tick - 80000
    for (let i = this.islands.length - 1; i >= 0; i--) {
      if (this.islands[i].tick < cutoff) {
        this.islands.splice(i, 1)
      }
    }
  }

  getIslands(): readonly VolcanicIsland[] { return this.islands }
}
