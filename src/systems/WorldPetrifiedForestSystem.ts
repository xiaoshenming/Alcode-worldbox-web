// World Petrified Forest System (v3.128) - Ancient stone forests as landmarks
// Petrified forests are rare geological formations that provide resources and mystery

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PetrifiedAge = 'recent' | 'ancient' | 'primordial' | 'mythic'

export interface PetrifiedForest {
  id: number
  x: number
  y: number
  petrifiedAge: PetrifiedAge
  treeCount: number
  mineralValue: number
  mysteryLevel: number
  discoveredBy: number
  tick: number
}

const CHECK_INTERVAL = 5000
const SPAWN_CHANCE = 0.001
const MAX_FORESTS = 6

const AGES: PetrifiedAge[] = ['recent', 'ancient', 'primordial', 'mythic']
const AGE_VALUE: Record<PetrifiedAge, number> = {
  recent: 10, ancient: 25, primordial: 50, mythic: 80,
}

export class WorldPetrifiedForestSystem {
  private forests: PetrifiedForest[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.forests.length < MAX_FORESTS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      // Spawn on rocky or mountain terrain
      if (tile != null && (tile === 5 || tile === 3)) {
        const age = AGES[Math.floor(Math.random() * AGES.length)]
        this.forests.push({
          id: this.nextId++,
          x, y,
          petrifiedAge: age,
          treeCount: 10 + Math.floor(Math.random() * 40),
          mineralValue: AGE_VALUE[age],
          mysteryLevel: 20 + Math.floor(Math.random() * 60),
          discoveredBy: 0,
          tick,
        })
      }
    }

    for (const f of this.forests) {
      // Mystery level fluctuates
      f.mysteryLevel = Math.max(5, Math.min(100,
        f.mysteryLevel + (Math.random() - 0.5) * 0.5))
      // Mining reduces tree count
      if (Math.random() < 0.002) {
        f.treeCount = Math.max(0, f.treeCount - 1)
      }
    }

    // Remove fully mined forests
    for (let i = this.forests.length - 1; i >= 0; i--) {
      if (this.forests[i].treeCount <= 0) this.forests.splice(i, 1)
    }
  }

  getForests(): readonly PetrifiedForest[] { return this.forests }
}
