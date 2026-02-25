// Diplomatic Marriage System (v2.54) - Political marriages between civilizations
// Royal marriages forge alliances, improve relations, and produce heirs
// Failed marriages can trigger wars

import { EntityManager, EntityId } from '../ecs/Entity'

export type MarriageStatus = 'proposed' | 'accepted' | 'active' | 'dissolved' | 'rejected'

export interface DiplomaticMarriage {
  id: number
  civA: number
  civB: number
  entityA: EntityId
  entityB: EntityId
  status: MarriageStatus
  alliance: number      // 0-100 alliance strength
  startedAt: number
  children: number
}

const CHECK_INTERVAL = 1000
const UPDATE_INTERVAL = 600
const MAX_MARRIAGES = 30
const PROPOSAL_CHANCE = 0.05
const ALLIANCE_GAIN = 3
const CHILD_CHANCE = 0.02
const DISSOLVE_CHANCE = 0.01

let nextMarriageId = 1

export class DiplomaticMarriageSystem {
  private marriages: DiplomaticMarriage[] = []
  private lastCheck = 0
  private lastUpdate = 0
  private totalMarriages = 0

  update(dt: number, em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.proposeMarriages(em, civManager, tick)
    }
    if (tick - this.lastUpdate >= UPDATE_INTERVAL) {
      this.lastUpdate = tick
      this.updateMarriages(em, tick)
    }
  }

  private proposeMarriages(em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (this.marriages.filter(m => m.status === 'active' || m.status === 'proposed').length >= MAX_MARRIAGES) return
    const civs = [...civManager.civilizations.entries()]
    if (civs.length < 2) return

    for (let i = 0; i < civs.length; i++) {
      if (Math.random() > PROPOSAL_CHANCE) continue
      const [civIdA] = civs[i]
      const j = Math.floor(Math.random() * civs.length)
      if (j === i) continue
      const [civIdB] = civs[j]

      // Check no existing marriage between these civs
      if (this.marriages.some(m => m.status === 'active' && ((m.civA === civIdA && m.civB === civIdB) || (m.civA === civIdB && m.civB === civIdA)))) continue

      // Find eligible creatures from each civ
      const creatures = em.getEntitiesWithComponents('creature', 'civMember')
      let entityA: EntityId | null = null
      let entityB: EntityId | null = null
      for (const id of creatures) {
        const member = em.getComponent<any>(id, 'civMember')
        if (!member) continue
        if (member.civId === civIdA && !entityA) entityA = id
        if (member.civId === civIdB && !entityB) entityB = id
        if (entityA && entityB) break
      }
      if (!entityA || !entityB) continue

      const accepted = Math.random() < 0.6
      this.marriages.push({
        id: nextMarriageId++,
        civA: civIdA,
        civB: civIdB,
        entityA,
        entityB,
        status: accepted ? 'active' : 'rejected',
        alliance: accepted ? 30 : 0,
        startedAt: tick,
        children: 0,
      })
      this.totalMarriages++
      break
    }
  }

  private updateMarriages(em: EntityManager, tick: number): void {
    const toRemove: number[] = []
    for (let i = 0; i < this.marriages.length; i++) {
      const marriage = this.marriages[i]
      if (marriage.status !== 'active') {
        if (tick - marriage.startedAt > 5000) toRemove.push(i)
        continue
      }

      // Check both partners alive
      const cA = em.getComponent<any>(marriage.entityA, 'creature')
      const cB = em.getComponent<any>(marriage.entityB, 'creature')
      if (!cA || !cB) {
        marriage.status = 'dissolved'
        continue
      }

      // Strengthen alliance
      marriage.alliance = Math.min(100, marriage.alliance + ALLIANCE_GAIN)

      // Chance for children
      if (Math.random() < CHILD_CHANCE) {
        marriage.children++
      }

      // Chance to dissolve
      if (Math.random() < DISSOLVE_CHANCE && marriage.alliance < 40) {
        marriage.status = 'dissolved'
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.marriages.splice(toRemove[i], 1)
    }
  }

  getMarriages(): DiplomaticMarriage[] { return this.marriages }
  getActiveMarriages(): DiplomaticMarriage[] { return this.marriages.filter(m => m.status === 'active') }
  getTotalMarriages(): number { return this.totalMarriages }
}
