// Creature String Maker System (v3.509) - String crafting artisans
// Skilled workers twisting fibers into strings and cords

import { EntityManager } from '../ecs/Entity'

export interface StringMaker {
  id: number
  entityId: number
  fiberTwisting: number
  cordStrength: number
  lengthControl: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2580
const RECRUIT_CHANCE = 0.0015
const MAX_STRINGMAKERS = 10

export class CreatureStringMakerSystem {
  private stringMakers: StringMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.stringMakers.length < MAX_STRINGMAKERS && Math.random() < RECRUIT_CHANCE) {
      this.stringMakers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        fiberTwisting: 10 + Math.random() * 25,
        cordStrength: 15 + Math.random() * 20,
        lengthControl: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.stringMakers) {
      s.fiberTwisting = Math.min(100, s.fiberTwisting + 0.02)
      s.lengthControl = Math.min(100, s.lengthControl + 0.015)
      s.outputQuality = Math.min(100, s.outputQuality + 0.01)
    }

    for (let _i = this.stringMakers.length - 1; _i >= 0; _i--) { if (this.stringMakers[_i].fiberTwisting <= 4) this.stringMakers.splice(_i, 1) }
  }

}
