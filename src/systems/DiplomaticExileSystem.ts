// Diplomatic Exile System (v2.49) - Civs exile criminals and dissidents
// Exiles may join other civs, become bandits, or form outcast communities
// Exile events affect civ stability and inter-civ relations

import { EntityManager, EntityId } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'
import { pickRandom } from '../utils/RandomUtils'

export type ExileReason = 'criminal' | 'dissident' | 'heretic' | 'traitor' | 'outcast'

export interface Exile {
  id: number
  entityId: EntityId
  originCivId: number
  reason: ExileReason
  exiledAt: number
  status: 'wandering' | 'joined_other' | 'bandit' | 'dead' | 'pardoned'
  newCivId?: number
}

const CHECK_INTERVAL = 1200
const FATE_INTERVAL = 800
const MAX_EXILES = 30

const EXILE_REASONS: ExileReason[] = ['criminal', 'dissident', 'heretic', 'traitor', 'outcast']

let nextExileId = 1

export class DiplomaticExileSystem {
  private exiles: Exile[] = []
  private _wanderingSet = new Set<number>()      // entityIds with status 'wandering'
  private lastCheck = 0
  private lastFate = 0

  update(dt: number, em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.exileCreatures(em, civManager, tick)
    }
    if (tick - this.lastFate >= FATE_INTERVAL) {
      this.lastFate = tick
      this.resolveFates(em, civManager, tick)
    }
  }

  private countWanderingExiles(): number {
    let n = 0
    for (const e of this.exiles) { if (e.status === 'wandering') n++ }
    return n
  }

  private exileCreatures(em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (this.countWanderingExiles() >= MAX_EXILES) return
    for (const [civId, _civ] of civManager.civilizations.entries()) {      if (Math.random() > 0.04) continue
      const creatures = em.getEntitiesWithComponents('creature', 'civMember')
      for (const id of creatures) {
        const member = em.getComponent<CivMemberComponent>(id, 'civMember')
        if (member?.civId !== civId) continue
        if (this.isExiled(id)) continue
        if (Math.random() > 0.1) continue
        this.exiles.push({
          id: nextExileId++,
          entityId: id,
          originCivId: civId,
          reason: pickRandom(EXILE_REASONS),
          exiledAt: tick,
          status: 'wandering',
        })
        this._wanderingSet.add(id)
        break
      }
    }
  }

  private resolveFates(em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    for (const exile of this.exiles) {
      if (exile.status !== 'wandering') continue
      if (!em.getComponent(exile.entityId, 'creature')) {
        exile.status = 'dead'
        this._wanderingSet.delete(exile.entityId)
        continue
      }
      const roll = Math.random()
      if (roll < 0.05) {
        // Join another civ
        let newCivId = -1
        for (const id of civManager.civilizations.keys()) {
          if (id !== exile.originCivId) { newCivId = id; break }
        }
        // Pick random other civ
        const otherCount = civManager.civilizations.size - 1
        if (otherCount > 0) {
          let skip = Math.floor(Math.random() * otherCount)
          for (const id of civManager.civilizations.keys()) {
            if (id === exile.originCivId) continue
            if (skip-- === 0) { newCivId = id; break }
          }
        }
        if (newCivId >= 0) {
          exile.status = 'joined_other'
          exile.newCivId = newCivId
          this._wanderingSet.delete(exile.entityId)
        }
      } else if (roll < 0.08) {
        exile.status = 'bandit'
        this._wanderingSet.delete(exile.entityId)
      } else if (roll < 0.09) {
        exile.status = 'pardoned'
        this._wanderingSet.delete(exile.entityId)
      }
    }
  }

  private isExiled(id: EntityId): boolean {
    return this._wanderingSet.has(id)
  }

}
