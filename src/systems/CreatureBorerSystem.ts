// Creature Borer System (v3.686) - Metal boring artisans
// Craftspeople who enlarge holes in metal using single-point cutting tools

import { EntityManager } from '../ecs/Entity'

export interface Borer {
  id: number
  entityId: number
  boringSkill: number
  cuttingDepth: number
  holeConcentricity: number
  toolAlignment: number
  tick: number
}

const CHECK_INTERVAL = 2980
const RECRUIT_CHANCE = 0.0015
const MAX_BORERS = 10

export class CreatureBorerSystem {
  private borers: Borer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.borers.length < MAX_BORERS && Math.random() < RECRUIT_CHANCE) {
      this.borers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        boringSkill: 10 + Math.random() * 25,
        cuttingDepth: 15 + Math.random() * 20,
        holeConcentricity: 5 + Math.random() * 20,
        toolAlignment: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const b of this.borers) {
      b.boringSkill = Math.min(100, b.boringSkill + 0.02)
      b.cuttingDepth = Math.min(100, b.cuttingDepth + 0.015)
      b.toolAlignment = Math.min(100, b.toolAlignment + 0.01)
    }

    for (let _i = this.borers.length - 1; _i >= 0; _i--) { if (this.borers[_i].boringSkill <= 4) this.borers.splice(_i, 1) }
  }

  getBorers(): Borer[] { return this.borers }
}
