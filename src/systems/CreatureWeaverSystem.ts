// Creature Weaver System (v3.161) - Textile crafting
// Creatures learn weaving, collect fibers, and produce cloth for their settlements

import { EntityManager } from '../ecs/Entity'
import { pickRandom } from '../utils/RandomUtils'

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
  private _weaversSet = new Set<number>()
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new weavers from existing creatures
    if (this.weavers.length < MAX_WEAVERS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = pickRandom(entities)
        const already = this._weaversSet.has(eid)
        if (!already) {
          const spec = pickRandom(FIBER_TYPES)
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
          this._weaversSet.add(eid)
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
        w.specialization = pickRandom(FIBER_TYPES)
      }
    }

    // Remove weavers whose creatures no longer exist
    for (let i = this.weavers.length - 1; i >= 0; i--) {
      const w = this.weavers[i]
      this._weaversSet.delete(w.entityId)
      if (!em.hasComponent(w.entityId, 'creature')) this.weavers.splice(i, 1)

    }
  }

}
