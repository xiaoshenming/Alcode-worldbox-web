// Creature Grudge System (v3.26) - Creatures hold grudges against others
// After being attacked or wronged, creatures remember and seek revenge

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type GrudgeReason = 'attacked' | 'territory' | 'theft' | 'betrayal' | 'insult' | 'family_harm'

export interface Grudge {
  id: number
  holderId: number
  targetId: number
  reason: GrudgeReason
  intensity: number   // 0-100
  tick: number
}

const CHECK_INTERVAL = 800
const GRUDGE_CHANCE = 0.015
const MAX_GRUDGES = 120
const DECAY_RATE = 0.1

const REASONS: GrudgeReason[] = ['attacked', 'territory', 'theft', 'betrayal', 'insult', 'family_harm']

const INTENSITY_MAP: Record<GrudgeReason, number> = {
  attacked: 70,
  territory: 40,
  theft: 50,
  betrayal: 80,
  insult: 20,
  family_harm: 90,
}

export class CreatureGrudgeSystem {
  private grudges: Grudge[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formGrudges(em, tick)
    this.decayGrudges()
    this.cleanup()
  }

  private formGrudges(em: EntityManager, tick: number): void {
    if (this.grudges.length >= MAX_GRUDGES) return

    const entityArr = em.getEntitiesWithComponents('creature')
    if (entityArr.length < 2) return

    for (const eid of entityArr) {
      if (Math.random() > GRUDGE_CHANCE) continue
      if (this.grudges.length >= MAX_GRUDGES) break

      const creature = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!creature) continue

      // Pick a random target
      const targetIdx = Math.floor(Math.random() * entityArr.length)
      const targetId = entityArr[targetIdx]
      if (targetId === eid) continue
      if (this.hasGrudge(eid, targetId)) continue

      const reason = REASONS[Math.floor(Math.random() * REASONS.length)]
      const baseIntensity = INTENSITY_MAP[reason]

      this.grudges.push({
        id: this.nextId++,
        holderId: eid,
        targetId,
        reason,
        intensity: baseIntensity + Math.random() * 20 - 10,
        tick,
      })
    }
  }

  private decayGrudges(): void {
    for (const g of this.grudges) {
      g.intensity -= DECAY_RATE
    }
    for (let _i = this.grudges.length - 1; _i >= 0; _i--) { if (this.grudges[_i].intensity <= 0) this.grudges.splice(_i, 1) }
  }

  private cleanup(): void {
    if (this.grudges.length > MAX_GRUDGES) {
      this.grudges.sort((a, b) => b.intensity - a.intensity)
      this.grudges.length = MAX_GRUDGES
    }
  }

  private hasGrudge(holderId: number, targetId: number): boolean {
    return this.grudges.some(g => g.holderId === holderId && g.targetId === targetId)
  }

  private _grudgesBuf: Grudge[] = []
  private _enemiesBuf: number[] = []

  getGrudges(): Grudge[] { return this.grudges }
  getGrudgesFor(entityId: number): Grudge[] {
    this._grudgesBuf.length = 0
    for (const g of this.grudges) { if (g.holderId === entityId) this._grudgesBuf.push(g) }
    return this._grudgesBuf
  }
  getEnemies(entityId: number): number[] {
    this._enemiesBuf.length = 0
    for (const g of this.grudges) { if (g.holderId === entityId) this._enemiesBuf.push(g.targetId) }
    return this._enemiesBuf
  }
}
