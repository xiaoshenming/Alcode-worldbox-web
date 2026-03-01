// Creature Shipwright System (v3.211) - Shipwrights build and repair vessels
// The ring of hammer on hull echoes across the harbor as skilled hands shape timber into seaworthy craft

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type VesselType = 'canoe' | 'galley' | 'caravel' | 'warship'

export interface Shipwright {
  id: number
  entityId: number
  skill: number
  vesselsBuilt: number
  vesselType: VesselType
  seaworthiness: number
  repairsDone: number
  tick: number
}

const CHECK_INTERVAL = 1200
const CRAFT_CHANCE = 0.006
const MAX_SHIPWRIGHTS = 48
const SKILL_GROWTH = 0.08

const VESSEL_TYPES: VesselType[] = ['canoe', 'galley', 'caravel', 'warship']

export class CreatureShipwrightSystem {
  private shipwrights: Shipwright[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.shipwrights.length >= MAX_SHIPWRIGHTS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const vesselType = VESSEL_TYPES[Math.floor(Math.random() * VESSEL_TYPES.length)]
      const seaworthiness = 30 + skill * 0.6 + Math.random() * 10

      this.shipwrights.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        vesselsBuilt: 1 + Math.floor(skill / 20),
        vesselType,
        seaworthiness: Math.min(100, seaworthiness),
        repairsDone: Math.floor(Math.random() * skill * 0.3),
        tick
      })
    }

    const cutoff = tick - 44000
    for (let i = this.shipwrights.length - 1; i >= 0; i--) {
      if (this.shipwrights[i].tick < cutoff) this.shipwrights.splice(i, 1)
    }
  }

}
