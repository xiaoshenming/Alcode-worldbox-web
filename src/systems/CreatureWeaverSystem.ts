// Creature Weaver System (v3.161) - Textile crafting
// Creatures learn weaving, collect fibers, and produce cloth for their settlements

import { EntityManager } from '../ecs/Entity'

export type FiberType = 'cotton' | 'silk' | 'wool' | 'linen'

export interface Weaver {
  id: number
  entityId: number
  skill: number
  fibersCollected: number
  clothProduced: number
  loomLevel: number
  specialization: FiberType
  tick: number
}

const CHECK_INTERVAL = 3200
const SPAWN_CHANCE = 0.003
const MAX_WEAVERS = 14

const FIBER_TYPES: FiberType[] = ['cotton', 'silk', 'wool', 'linen']
const FIBER_QUALITY: Record<FiberType, number> = {
  cotton: 0.25, silk: 0.45, wool: 0.30, linen: 0.20,
}

export class CreatureWeaverSystem {
  private weavers: Weaver[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new weavers from existing creatures
    if (this.weavers.length < MAX_WEAVERS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.weavers.some(w => w.entityId === eid)
        if (!already) {
          const spec = FIBER_TYPES[Math.floor(Math.random() * FIBER_TYPES.length)]
          this.weavers.push({
            id: this.nextId++,
            entityId: eid,
            skill: 5 + Math.random() * 10,
            fibersCollected: 0,
            clothProduced: 0,
            loomLevel: 1,
            specialization: spec,
            tick,
          })
        }
      }
    }

    // Weavers gather fibers and produce cloth
    for (const w of this.weavers) {
      // Gather fibers based on skill
      if (Math.random() < 0.03 * (w.skill / 50)) {
        w.fibersCollected += 1 + Math.floor(w.loomLevel * 0.5)
      }

      // Weave cloth when enough fibers collected
      if (w.fibersCollected >= 5 && Math.random() < 0.02) {
        const quality = FIBER_QUALITY[w.specialization] * (w.skill / 100)
        const produced = 1 + Math.floor(quality * w.loomLevel)
        w.clothProduced += produced
        w.fibersCollected -= 5
        w.skill = Math.min(100, w.skill + 0.3)
      }

      // Upgrade loom with experience
      if (w.clothProduced > w.loomLevel * 10 && w.loomLevel < 5 && Math.random() < 0.005) {
        w.loomLevel++
      }

      // Occasionally switch specialization
      if (w.clothProduced > 5 && Math.random() < 0.003) {
        w.specialization = FIBER_TYPES[Math.floor(Math.random() * FIBER_TYPES.length)]
      }
    }

    // Remove weavers whose creatures no longer exist
    const alive = new Set(em.getEntitiesWithComponent('creature'))
    for (let i = this.weavers.length - 1; i >= 0; i--) {
      if (!alive.has(this.weavers[i].entityId)) this.weavers.splice(i, 1)
    }
  }

  getWeavers(): readonly Weaver[] { return this.weavers }
}
