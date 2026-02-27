// Creature Engraver System (v3.744) - Metal engraving artisans
// Craftspeople who cut or carve intricate designs into metal surfaces

import { EntityManager } from '../ecs/Entity'

export interface Engraver {
  id: number
  entityId: number
  engravingSkill: number
  burinControl: number
  lineDepth: number
  detailPrecision: number
  tick: number
}

const CHECK_INTERVAL = 3300
const RECRUIT_CHANCE = 0.0015
const MAX_ENGRAVERS = 10

export class CreatureEngraverSystem {
  private engravers: Engraver[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.engravers.length < MAX_ENGRAVERS && Math.random() < RECRUIT_CHANCE) {
      this.engravers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        engravingSkill: 10 + Math.random() * 25,
        burinControl: 15 + Math.random() * 20,
        lineDepth: 5 + Math.random() * 20,
        detailPrecision: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const e of this.engravers) {
      e.engravingSkill = Math.min(100, e.engravingSkill + 0.02)
      e.burinControl = Math.min(100, e.burinControl + 0.015)
      e.detailPrecision = Math.min(100, e.detailPrecision + 0.01)
    }

    for (let _i = this.engravers.length - 1; _i >= 0; _i--) { if (this.engravers[_i].engravingSkill <= 4) this.engravers.splice(_i, 1) }
  }

  getEngravers(): Engraver[] { return this.engravers }
}
