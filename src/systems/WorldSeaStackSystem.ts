// World Sea Stack System (v3.227) - Erosion-carved rock pillars rising from the sea
// Dramatic coastal formations created by wave action isolating rock columns

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface SeaStack {
  id: number
  x: number
  y: number
  height: number
  erosionRate: number
  rockType: string
  birdNesting: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.003
const MAX_STACKS = 32

const ROCK_TYPES = ['sandstone', 'limestone', 'basalt', 'granite']

export class WorldSeaStackSystem {
  private stacks: SeaStack[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.stacks.length < MAX_STACKS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 5 + Math.floor(Math.random() * (w - 10))
      const y = 5 + Math.floor(Math.random() * (h - 10))
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER || tile === TileType.MOUNTAIN) {
        this.stacks.push({
          id: this.nextId++,
          x, y,
          height: 10 + Math.random() * 40,
          erosionRate: 0.01 + Math.random() * 0.05,
          rockType: ROCK_TYPES[Math.floor(Math.random() * ROCK_TYPES.length)],
          birdNesting: Math.random() * 30,
          age: 0,
          tick,
        })
      }
    }

    for (const stack of this.stacks) {
      stack.age += 1
      stack.height = Math.max(1, stack.height - stack.erosionRate)
      stack.birdNesting = Math.min(100, stack.birdNesting + 0.03)
    }

    const cutoff = tick - 95000
    for (let i = this.stacks.length - 1; i >= 0; i--) {
      if (this.stacks[i].tick < cutoff || this.stacks[i].height < 1) {
        this.stacks.splice(i, 1)
      }
    }
  }

}
