// Creature Wiredrawer System (v3.557) - Wire drawing artisans
// Metalworkers who draw metal into fine wire for various uses

import { EntityManager } from '../ecs/Entity'

export interface Wiredrawer {
  id: number
  entityId: number
  metalDrawing: number
  dieWork: number
  gaugeControl: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2650
const RECRUIT_CHANCE = 0.0014
const MAX_WIREDRAWERS = 10

export class CreatureWiredrawerSystem {
  private wiredrawers: Wiredrawer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.wiredrawers.length < MAX_WIREDRAWERS && Math.random() < RECRUIT_CHANCE) {
      this.wiredrawers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        metalDrawing: 10 + Math.random() * 25,
        dieWork: 15 + Math.random() * 20,
        gaugeControl: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const w of this.wiredrawers) {
      w.metalDrawing = Math.min(100, w.metalDrawing + 0.02)
      w.gaugeControl = Math.min(100, w.gaugeControl + 0.015)
      w.outputQuality = Math.min(100, w.outputQuality + 0.01)
    }

    this.wiredrawers = this.wiredrawers.filter(w => w.metalDrawing > 4)
  }

  getWiredrawers(): Wiredrawer[] { return this.wiredrawers }
}
