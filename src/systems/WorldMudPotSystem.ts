// World Mud Pot System (v3.483) - Mud pot formations
// Bubbling pools of hot mud formed by geothermal activity

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface MudPot {
  id: number
  x: number
  y: number
  viscosity: number
  temperature: number
  bubbleRate: number
  acidContent: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2680
const FORM_CHANCE = 0.0009
const MAX_POTS = 8

export class WorldMudPotSystem {
  private pots: MudPot[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pots.length < MAX_POTS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.pots.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        viscosity: 30 + Math.random() * 40,
        temperature: 50 + Math.random() * 40,
        bubbleRate: 10 + Math.random() * 30,
        acidContent: 5 + Math.random() * 25,
        age: 0,
        tick,
      })
    }

    for (const p of this.pots) {
      p.age += 0.005
      p.viscosity = Math.max(10, Math.min(90, p.viscosity + (Math.random() - 0.5) * 0.1))
      p.temperature = Math.max(30, p.temperature - 0.006)
      p.bubbleRate = Math.max(5, Math.min(80, p.bubbleRate + (Math.random() - 0.48) * 0.08))
    }

    this.pots = this.pots.filter(p => p.age < 90)
  }

  getPots(): MudPot[] { return this.pots }
}
