// Creature Beast Master System (v3.05) - Creatures specialize in taming wild beasts
// Beast masters form bonds with animals, using them in combat and labor

import { EntityManager } from '../ecs/Entity'

export type BeastBond = 'companion' | 'war_mount' | 'pack_animal' | 'scout' | 'guardian'

export interface BeastMasterRecord {
  id: number
  masterId: number
  beastId: number
  bond: BeastBond
  loyalty: number      // 0-100
  trainingLevel: number // 0-100
  tick: number
}

const CHECK_INTERVAL = 800
const TAME_CHANCE = 0.02
const MAX_RECORDS = 60

const BOND_WEIGHTS: Record<BeastBond, number> = {
  companion: 0.3, war_mount: 0.15, pack_animal: 0.2,
  scout: 0.2, guardian: 0.15,
}

const BONDS = Object.keys(BOND_WEIGHTS) as BeastBond[]

export class CreatureBeastMasterSystem {
  private records: BeastMasterRecord[] = []
  private nextId = 1
  private _bondsBuf: BeastMasterRecord[] = []
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.attemptTaming(em, tick)
    this.trainBeasts()
    this.pruneOld()
  }

  private attemptTaming(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('creature')

    for (const eid of entities) {
      if (Math.random() > TAME_CHANCE) continue

      if (entities.length < 2) continue
      let beastId: number
      do {
        beastId = entities[Math.floor(Math.random() * entities.length)]
      } while (beastId === eid)
      const bond = this.pickBond()

      this.records.push({
        id: this.nextId++,
        masterId: eid,
        beastId,
        bond,
        loyalty: 20 + Math.random() * 40,
        trainingLevel: 5 + Math.random() * 20,
        tick,
      })
    }
  }

  private pickBond(): BeastBond {
    const r = Math.random()
    let cum = 0
    for (const b of BONDS) {
      cum += BOND_WEIGHTS[b]
      if (r <= cum) return b
    }
    return 'companion'
  }

  private trainBeasts(): void {
    for (const rec of this.records) {
      rec.trainingLevel = Math.min(100, rec.trainingLevel + Math.random() * 0.5)
      rec.loyalty = Math.min(100, rec.loyalty + Math.random() * 0.3)
    }
  }

  private pruneOld(): void {
    if (this.records.length > MAX_RECORDS) {
      this.records.splice(0, this.records.length - MAX_RECORDS)
    }
  }

  getRecords(): BeastMasterRecord[] { return this.records }
  getMasterBonds(masterId: number): BeastMasterRecord[] {
    this._bondsBuf.length = 0
    for (const r of this.records) { if (r.masterId === masterId) this._bondsBuf.push(r) }
    return this._bondsBuf
  }
  getAverageLoyalty(): number {
    if (this.records.length === 0) return 0
    let s = 0; for (const r of this.records) s += r.loyalty; return s / this.records.length
  }
}
