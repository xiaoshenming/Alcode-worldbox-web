// Creature Gondolier System (v3.181) - Water-based transport creatures
// Creatures near water become gondoliers, ferrying passengers and cargo

import { EntityManager } from '../ecs/Entity'

export type BoatType = 'raft' | 'canoe' | 'gondola' | 'barge'

export interface Gondolier {
  id: number
  entityId: number
  skill: number
  passengersCarried: number
  cargoDelivered: number
  boatType: BoatType
  routeLength: number
  earnings: number
  tick: number
}

const CHECK_INTERVAL = 3000
const SPAWN_CHANCE = 0.003
const MAX_GONDOLIERS = 12

const BOAT_TYPES: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
const BOAT_CAPACITY: Record<BoatType, number> = {
  raft: 1, canoe: 2, gondola: 4, barge: 8,
}

export class CreatureGondolierSystem {
  private gondoliers: Gondolier[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new gondoliers
    if (this.gondoliers.length < MAX_GONDOLIERS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        if (!this.gondoliers.some(g => g.entityId === eid)) {
          const boat = BOAT_TYPES[Math.floor(Math.random() * BOAT_TYPES.length)]
          this.gondoliers.push({
            id: this.nextId++, entityId: eid,
            skill: 5 + Math.random() * 15,
            passengersCarried: 0, cargoDelivered: 0,
            boatType: boat,
            routeLength: 2 + Math.floor(Math.random() * 6),
            earnings: 0, tick,
          })
        }
      }
    }

    for (const g of this.gondoliers) {
      const cap = BOAT_CAPACITY[g.boatType]

      // Ferry passengers
      if (Math.random() < g.skill / 100 * 0.04) {
        const count = 1 + Math.floor(Math.random() * cap)
        g.passengersCarried += count
        g.earnings += count * 0.5
        g.skill = Math.min(100, g.skill + 0.1)
      }

      // Deliver cargo
      if (Math.random() < 0.03 * (g.routeLength / 10)) {
        g.cargoDelivered++
        g.earnings += cap * 0.3
      }

      // Upgrade boat with experience
      if (g.skill > 60 && Math.random() < 0.003) {
        const idx = BOAT_TYPES.indexOf(g.boatType)
        if (idx < BOAT_TYPES.length - 1) g.boatType = BOAT_TYPES[idx + 1]
      }

      // Extend route
      if (g.skill > 40 && Math.random() < 0.005) {
        g.routeLength = Math.min(20, g.routeLength + 1)
      }
    }

    // Remove gondoliers whose creatures no longer exist
    const alive = new Set(em.getEntitiesWithComponent('creature'))
    for (let i = this.gondoliers.length - 1; i >= 0; i--) {
      if (!alive.has(this.gondoliers[i].entityId)) this.gondoliers.splice(i, 1)
    }
  }

  getGondoliers(): readonly Gondolier[] { return this.gondoliers }
}
