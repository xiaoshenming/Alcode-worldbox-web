// Diplomatic Exile System (v2.49) - Civs exile criminals and dissidents
// Exiles may join other civs, become bandits, or form outcast communities
// Exile events affect civ stability and inter-civ relations

import { EntityManager, EntityId } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'

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

  private exileCreatures(em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (this.exiles.filter(e => e.status === 'wandering').length >= MAX_EXILES) return
    const civs = [...civManager.civilizations.entries()]
    for (const [civId, civ] of civs) {
      if (Math.random() > 0.04) continue
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
          reason: EXILE_REASONS[Math.floor(Math.random() * EXILE_REASONS.length)],
          exiledAt: tick,
          status: 'wandering',
        })
        break
      }
    }
  }

  private resolveFates(em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    for (const exile of this.exiles) {
      if (exile.status !== 'wandering') continue
      if (!em.getComponent(exile.entityId, 'creature')) {
        exile.status = 'dead'
        continue
      }
      const roll = Math.random()
      if (roll < 0.05) {
        // Join another civ
        const otherCivs = [...civManager.civilizations.keys()].filter(id => id !== exile.originCivId)
        if (otherCivs.length > 0) {
          exile.status = 'joined_other'
          exile.newCivId = otherCivs[Math.floor(Math.random() * otherCivs.length)]
        }
      } else if (roll < 0.08) {
        exile.status = 'bandit'
      } else if (roll < 0.09) {
        exile.status = 'pardoned'
      }
    }
  }

  private isExiled(id: EntityId): boolean {
    return this.exiles.some(e => e.entityId === id && e.status === 'wandering')
  }

  getExiles(): Exile[] {
    return this.exiles
  }

  getActiveExiles(): Exile[] {
    return this.exiles.filter(e => e.status === 'wandering')
  }

  getExileCount(): number {
    return this.exiles.filter(e => e.status === 'wandering').length
  }
}
