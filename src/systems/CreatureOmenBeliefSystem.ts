// Creature Omen Belief System (v3.41) - Creatures interpret natural events as omens
// Omens influence morale, migration decisions, and pre-battle rituals

import { EntityManager } from '../ecs/Entity'
import { pickRandom } from '../utils/RandomUtils'

export type OmenType = 'good_harvest' | 'dark_sky' | 'animal_sign' | 'water_omen' | 'fire_portent' | 'wind_whisper'

export interface OmenBelief {
  id: number
  entityId: number
  type: OmenType
  conviction: number   // 0-100
  moralEffect: number  // -20 to +20
  spreadCount: number
  tick: number
}

const CHECK_INTERVAL = 1100
const OMEN_CHANCE = 0.008
const SPREAD_CHANCE = 0.02
const MAX_BELIEFS = 120
const DECAY_RATE = 0.004

const MORALE_MAP: Record<OmenType, number> = {
  good_harvest: 15,
  dark_sky: -12,
  animal_sign: 8,
  water_omen: -5,
  fire_portent: -18,
  wind_whisper: 10,
}

const TYPES: OmenType[] = ['good_harvest', 'dark_sky', 'animal_sign', 'water_omen', 'fire_portent', 'wind_whisper']

export class CreatureOmenBeliefSystem {
  private beliefs: OmenBelief[] = []
  private nextId = 1
  private lastCheck = 0
  // Set<"entityId_type"> for O(1) duplicate detection
  private _beliefKeySet = new Set<string>()

  private _addBelief(b: OmenBelief): void {
    this.beliefs.push(b)
    this._beliefKeySet.add(`${b.entityId}_${b.type}`)
  }

  private _removeBelief(index: number): void {
    const b = this.beliefs[index]
    this._beliefKeySet.delete(`${b.entityId}_${b.type}`)
    this.beliefs.splice(index, 1)
  }

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    // Develop new omen beliefs
    for (const eid of creatures) {
      if (this.beliefs.length >= MAX_BELIEFS) break
      if (Math.random() > OMEN_CHANCE) continue

      const type = pickRandom(TYPES)
      this._addBelief({
        id: this.nextId++,
        entityId: eid,
        type,
        conviction: 30 + Math.random() * 40,
        moralEffect: MORALE_MAP[type],
        spreadCount: 0,
        tick,
      })
    }

    // Spread beliefs between creatures
    for (const belief of this.beliefs) {
      if (Math.random() > SPREAD_CHANCE) continue
      for (const nid of creatures) {
        if (nid === belief.entityId) continue
        if (this.beliefs.length >= MAX_BELIEFS) break
        if (this._beliefKeySet.has(`${nid}_${belief.type}`)) continue
        if (Math.random() > 0.3) continue

        belief.spreadCount++
        this._addBelief({
          id: this.nextId++,
          entityId: nid,
          type: belief.type,
          conviction: belief.conviction * 0.7,
          moralEffect: belief.moralEffect * 0.8,
          spreadCount: 0,
          tick,
        })
        break
      }
    }

    // Decay convictions
    for (const b of this.beliefs) {
      b.conviction -= DECAY_RATE * CHECK_INTERVAL
    }
    for (let _i = this.beliefs.length - 1; _i >= 0; _i--) {
      if (this.beliefs[_i].conviction <= 5) this._removeBelief(_i)
    }
  }

  getBeliefs(): OmenBelief[] {
    return this.beliefs
  }

  private _entityBeliefsBuf: OmenBelief[] = []
  getByEntity(entityId: number): OmenBelief[] {
    this._entityBeliefsBuf.length = 0
    for (const b of this.beliefs) { if (b.entityId === entityId) this._entityBeliefsBuf.push(b) }
    return this._entityBeliefsBuf
  }
}
