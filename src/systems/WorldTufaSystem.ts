// World Tufa System (v3.498) - Tufa tower formations
// Porous limestone deposits formed by precipitation from alkaline waters

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface TufaTower {
  id: number
  x: number
  y: number
  towerHeight: number
  calciumContent: number
  porosityLevel: number
  waterAlkalinity: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2770
const FORM_CHANCE = 0.0007
const MAX_TOWERS = 6

export class WorldTufaSystem {
  private towers: TufaTower[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.towers.length < MAX_TOWERS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.towers.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        towerHeight: 3 + Math.random() * 12,
        calciumContent: 40 + Math.random() * 35,
        porosityLevel: 25 + Math.random() * 30,
        waterAlkalinity: 30 + Math.random() * 35,
        age: 0,
        tick,
      })
    }

    for (const t of this.towers) {
      t.age += 0.003
      t.towerHeight = Math.min(60, t.towerHeight + 0.006)
      t.calciumContent = Math.max(15, t.calciumContent - 0.004)
      t.porosityLevel = Math.min(80, t.porosityLevel + 0.005)
    }

    this.towers = this.towers.filter(t => t.age < 97)
  }

  getTowers(): TufaTower[] { return this.towers }
}
