// Creature Chainmaker System (v3.545) - Chain forging artisans
// Metalworkers specializing in forging chains for various purposes

import { EntityManager } from '../ecs/Entity'

export interface Chainmaker {
  id: number
  entityId: number
  linkForging: number
  weldingSkill: number
  tensileTest: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2640
const RECRUIT_CHANCE = 0.0014
const MAX_CHAINMAKERS = 10

export class CreatureChainmakerSystem {
  private chainmakers: Chainmaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.chainmakers.length < MAX_CHAINMAKERS && Math.random() < RECRUIT_CHANCE) {
      this.chainmakers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        linkForging: 10 + Math.random() * 25,
        weldingSkill: 15 + Math.random() * 20,
        tensileTest: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const c of this.chainmakers) {
      c.linkForging = Math.min(100, c.linkForging + 0.02)
      c.tensileTest = Math.min(100, c.tensileTest + 0.015)
      c.outputQuality = Math.min(100, c.outputQuality + 0.01)
    }

    for (let _i = this.chainmakers.length - 1; _i >= 0; _i--) { if (this.chainmakers[_i].linkForging <= 4) this.chainmakers.splice(_i, 1) }
  }

  getChainmakers(): Chainmaker[] { return this.chainmakers }
}
