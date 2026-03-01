// Creature Firewalker System (v3.134) - Creatures who walk through fire and lava
// Firewalkers gain heat resistance and mastery over time

import { EntityManager } from '../ecs/Entity'

export type FirewalkerMastery = 'novice' | 'adept' | 'master' | 'grandmaster'

export interface FirewalkerData {
  entityId: number
  heatResistance: number
  fireTrail: boolean
  walkDistance: number
  mastery: FirewalkerMastery
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 2600
const ASSIGN_CHANCE = 0.002
const MAX_FIREWALKERS = 8

const MASTERY_RESISTANCE: Record<FirewalkerMastery, number> = {
  novice: 20, adept: 50, master: 80, grandmaster: 100,
}

export class CreatureFirewalkerSystem {
  private firewalkers: FirewalkerData[] = []
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.firewalkers.length < MAX_FIREWALKERS && Math.random() < ASSIGN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.firewalkers.some(f => f.entityId === eid)
        if (!already) {
          this.firewalkers.push({
            entityId: eid,
            heatResistance: MASTERY_RESISTANCE.novice,
            fireTrail: false,
            walkDistance: 0,
            mastery: 'novice',
            active: true,
            tick,
          })
        }
      }
    }

    for (const f of this.firewalkers) {
      // Walk through fire, gain distance
      if (Math.random() < 0.03) {
        f.walkDistance += 1 + Math.floor(Math.random() * 3)
      }
      // Mastery progression based on walk distance
      if (f.walkDistance > 100 && f.mastery === 'novice') {
        f.mastery = 'adept'
        f.heatResistance = MASTERY_RESISTANCE.adept
        f.fireTrail = true
      } else if (f.walkDistance > 300 && f.mastery === 'adept') {
        f.mastery = 'master'
        f.heatResistance = MASTERY_RESISTANCE.master
      } else if (f.walkDistance > 600 && f.mastery === 'master') {
        f.mastery = 'grandmaster'
        f.heatResistance = MASTERY_RESISTANCE.grandmaster
      }
    }

    for (let i = this.firewalkers.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.firewalkers[i].entityId, 'creature')) this.firewalkers.splice(i, 1)
    }
  }

}
