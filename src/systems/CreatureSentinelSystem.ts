// Creature Sentinel System (v3.166) - Creatures serve as watchmen and guards
// Sentinels patrol borders, detect threats, and raise alarms for their settlements

import { EntityManager } from '../ecs/Entity'

export type PatrolRoute = 'perimeter' | 'watchtower' | 'roaming' | 'gate'

export interface Sentinel {
  id: number
  entityId: number
  skill: number
  alertness: number
  threatsDetected: number
  patrolRoute: PatrolRoute
  visionRange: number
  shiftDuration: number
  fatigue: number
  tick: number
}

const CHECK_INTERVAL = 3000
const SPAWN_CHANCE = 0.003
const MAX_SENTINELS = 16

const PATROL_ROUTES: PatrolRoute[] = ['perimeter', 'watchtower', 'roaming', 'gate']
const ROUTE_VISION: Record<PatrolRoute, number> = {
  perimeter: 6, watchtower: 10, roaming: 7, gate: 4,
}

export class CreatureSentinelSystem {
  private sentinels: Sentinel[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new sentinels
    if (this.sentinels.length < MAX_SENTINELS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        if (!this.sentinels.some(s => s.entityId === eid)) {
          const route = PATROL_ROUTES[Math.floor(Math.random() * PATROL_ROUTES.length)]
          this.sentinels.push({
            id: this.nextId++,
            entityId: eid,
            skill: 5 + Math.random() * 15,
            alertness: 50 + Math.random() * 30,
            threatsDetected: 0,
            patrolRoute: route,
            visionRange: ROUTE_VISION[route],
            shiftDuration: 0,
            fatigue: 0,
            tick,
          })
        }
      }
    }

    for (const s of this.sentinels) {
      s.shiftDuration++
      s.fatigue = Math.min(100, s.fatigue + 0.3)

      // Detect threats based on alertness and vision
      const detectChance = (s.alertness / 100) * (s.visionRange / 10) * (1 - s.fatigue / 200)
      if (Math.random() < detectChance * 0.02) {
        s.threatsDetected++
        s.skill = Math.min(100, s.skill + 0.3)
        s.alertness = Math.min(100, s.alertness + 2)
      }

      // Fatigue reduces alertness over time
      if (s.fatigue > 70) {
        s.alertness = Math.max(10, s.alertness - 0.5)
      }

      // Rest and shift change
      if (s.shiftDuration > 20) {
        s.fatigue = Math.max(0, s.fatigue - 30)
        s.shiftDuration = 0
        // Occasionally switch patrol route
        if (Math.random() < 0.1) {
          s.patrolRoute = PATROL_ROUTES[Math.floor(Math.random() * PATROL_ROUTES.length)]
          s.visionRange = ROUTE_VISION[s.patrolRoute]
        }
      }
    }

    // Remove sentinels whose creatures no longer exist
    for (let i = this.sentinels.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.sentinels[i].entityId, 'creature')) this.sentinels.splice(i, 1)
    }
  }

}
