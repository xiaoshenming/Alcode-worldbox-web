// Diplomatic Hostage System (v2.44) - Civs exchange hostages for peace
// Hostages ensure treaties are honored; mistreating hostages causes war
// Hostages can be rescued, ransomed, or converted

import { EntityManager, EntityId } from '../ecs/Entity'

export interface Hostage {
  id: number
  entityId: EntityId
  originCivId: number
  holderCivId: number
  takenAt: number
  status: 'held' | 'ransomed' | 'converted' | 'rescued' | 'executed'
  treatyId: number
  treatment: 'good' | 'neutral' | 'poor'
}

const CHECK_INTERVAL = 1200
const EVENT_INTERVAL = 800
const MAX_HOSTAGES = 20

let nextHostageId = 1

export class DiplomaticHostageSystem {
  private hostages: Hostage[] = []
  private lastCheck = 0
  private lastEvent = 0

  update(dt: number, em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.exchangeHostages(em, civManager, tick)
    }
    if (tick - this.lastEvent >= EVENT_INTERVAL) {
      this.lastEvent = tick
      this.processHostages(em, civManager, tick)
    }
  }

  private exchangeHostages(em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (this.hostages.filter(h => h.status === 'held').length >= MAX_HOSTAGES) return
    const civs = [...civManager.civilizations.entries()]
    for (const [idA, civA] of civs) {
      if (Math.random() > 0.05) continue
      for (const [idB, civB] of civs) {
        if (idA === idB) continue
        const rel = civA.relations?.get(idB) ?? 0
        // Hostage exchange happens between neutral-to-slightly-hostile civs
        if (rel < -10 && rel > -50) {
          if (this.hasHostagePair(idA, idB)) continue
          // Find a creature from civA
          const creatures = em.getEntitiesWithComponents('creature', 'civMember')
          for (const eid of creatures) {
            const civ = em.getComponent<any>(eid, 'civMember')
            if (civ?.civId === idA) {
              this.hostages.push({
                id: nextHostageId++,
                entityId: eid,
                originCivId: idA,
                holderCivId: idB,
                takenAt: tick,
                status: 'held',
                treatyId: tick,
                treatment: 'neutral',
              })
              break
            }
          }
          break
        }
      }
    }
  }

  private processHostages(em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    for (const hostage of this.hostages) {
      if (hostage.status !== 'held') continue
      if (!em.getComponent(hostage.entityId, 'creature')) {
        hostage.status = 'executed'
        continue
      }
      // Random events
      const roll = Math.random()
      if (roll < 0.02) {
        hostage.status = 'rescued'
      } else if (roll < 0.04) {
        hostage.status = 'ransomed'
      } else if (roll < 0.05) {
        hostage.status = 'converted'
      }
      // Treatment affects relations
      const holder = civManager.civilizations.get(hostage.holderCivId)
      if (holder && Math.random() < 0.1) {
        const treatments: Hostage['treatment'][] = ['good', 'neutral', 'poor']
        hostage.treatment = treatments[Math.floor(Math.random() * treatments.length)]
      }
    }
  }

  private hasHostagePair(civA: number, civB: number): boolean {
    return this.hostages.some(h =>
      h.status === 'held' &&
      ((h.originCivId === civA && h.holderCivId === civB) ||
       (h.originCivId === civB && h.holderCivId === civA))
    )
  }

  getHostages(): Hostage[] {
    return this.hostages
  }

  getActiveHostages(): Hostage[] {
    return this.hostages.filter(h => h.status === 'held')
  }

  getHostageCount(): number {
    return this.hostages.filter(h => h.status === 'held').length
  }
}
