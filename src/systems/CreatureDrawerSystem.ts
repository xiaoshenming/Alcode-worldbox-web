// Creature Drawer System (v3.626) - Wire drawing artisans
// Craftspeople who pull metal through dies to create wire

import { EntityManager } from '../ecs/Entity'

export interface Drawer {
  id: number
  entityId: number
  drawingSkill: number
  diePrecision: number
  tensileControl: number
  wireQuality: number
  tick: number
}

const CHECK_INTERVAL = 2820
const RECRUIT_CHANCE = 0.0015
const MAX_DRAWERS = 10

export class CreatureDrawerSystem {
  private drawers: Drawer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.drawers.length < MAX_DRAWERS && Math.random() < RECRUIT_CHANCE) {
      this.drawers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        drawingSkill: 10 + Math.random() * 25,
        diePrecision: 15 + Math.random() * 20,
        tensileControl: 5 + Math.random() * 20,
        wireQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const d of this.drawers) {
      d.drawingSkill = Math.min(100, d.drawingSkill + 0.02)
      d.diePrecision = Math.min(100, d.diePrecision + 0.015)
      d.wireQuality = Math.min(100, d.wireQuality + 0.01)
    }

    this.drawers = this.drawers.filter(d => d.drawingSkill > 4)
  }

  getDrawers(): Drawer[] { return this.drawers }
}
