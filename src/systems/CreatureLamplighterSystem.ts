// Creature Lamplighter System (v3.173) - Creatures maintain lights in settlements
// Lamplighters patrol streets at dusk, lighting lamps and maintaining them

import { EntityManager } from '../ecs/Entity'

export type FuelType = 'oil' | 'tallow' | 'gas' | 'crystal'

export interface Lamplighter {
  id: number
  entityId: number
  skill: number
  lampsLit: number
  lampsMaintained: number
  fuelType: FuelType
  routeLength: number
  efficiency: number
  nightsWorked: number
  tick: number
}

const CHECK_INTERVAL = 3200
const SPAWN_CHANCE = 0.003
const MAX_LAMPLIGHTERS = 10

const FUEL_TYPES: FuelType[] = ['oil', 'tallow', 'gas', 'crystal']
const FUEL_BRIGHTNESS: Record<FuelType, number> = {
  oil: 0.6, tallow: 0.4, gas: 0.8, crystal: 1.0,
}

export class CreatureLamplighterSystem {
  private lamplighters: Lamplighter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new lamplighters
    if (this.lamplighters.length < MAX_LAMPLIGHTERS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        if (!this.lamplighters.some(l => l.entityId === eid)) {
          const fuel = FUEL_TYPES[Math.floor(Math.random() * FUEL_TYPES.length)]
          this.lamplighters.push({
            id: this.nextId++, entityId: eid,
            skill: 5 + Math.random() * 15,
            lampsLit: 0, lampsMaintained: 0,
            fuelType: fuel,
            routeLength: 3 + Math.floor(Math.random() * 8),
            efficiency: 0.3 + Math.random() * 0.3,
            nightsWorked: 0, tick,
          })
        }
      }
    }

    for (const ll of this.lamplighters) {
      ll.nightsWorked++

      // Light lamps along route
      const brightness = FUEL_BRIGHTNESS[ll.fuelType]
      const lightChance = ll.efficiency * brightness * (ll.skill / 100)
      if (Math.random() < lightChance * 0.04) {
        ll.lampsLit++
        ll.skill = Math.min(100, ll.skill + 0.15)
      }

      // Maintain existing lamps
      if (ll.lampsLit > 0 && Math.random() < 0.03) {
        ll.lampsMaintained++
        ll.efficiency = Math.min(1, ll.efficiency + 0.01)
      }

      // Expand route with experience
      if (ll.skill > 50 && Math.random() < 0.004) {
        ll.routeLength = Math.min(20, ll.routeLength + 1)
      }

      // Upgrade fuel type
      if (ll.skill > 70 && Math.random() < 0.003) {
        const idx = FUEL_TYPES.indexOf(ll.fuelType)
        if (idx < FUEL_TYPES.length - 1) ll.fuelType = FUEL_TYPES[idx + 1]
      }
    }

    // Remove lamplighters whose creatures no longer exist
    for (let i = this.lamplighters.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.lamplighters[i].entityId, 'creature')) this.lamplighters.splice(i, 1)
    }
  }

}
