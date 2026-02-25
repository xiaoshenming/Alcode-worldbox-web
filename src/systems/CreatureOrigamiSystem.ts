// Creature Origami System (v3.108) - Paper folding art tradition
// Creatures create origami that boosts cultural value and morale

import { EntityManager, EntityId } from '../ecs/Entity'

export type OrigamiShape = 'crane' | 'dragon' | 'flower' | 'boat' | 'star'

export interface OrigamiWork {
  id: number
  creatorId: EntityId
  shape: OrigamiShape
  beauty: number
  complexity: number
  preserved: boolean
  tick: number
}

const CHECK_INTERVAL = 3000
const CREATE_CHANCE = 0.005
const MAX_WORKS = 50

const SHAPES: OrigamiShape[] = ['crane', 'dragon', 'flower', 'boat', 'star']
const COMPLEXITY: Record<OrigamiShape, number> = {
  crane: 30,
  dragon: 80,
  flower: 20,
  boat: 15,
  star: 50,
}

export class CreatureOrigamiSystem {
  private works: OrigamiWork[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Create origami
    if (this.works.length < MAX_WORKS && Math.random() < CREATE_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
        this.works.push({
          id: this.nextId++,
          creatorId: eid,
          shape,
          beauty: 20 + Math.floor(Math.random() * 80),
          complexity: COMPLEXITY[shape],
          preserved: Math.random() < 0.3,
          tick,
        })
      }
    }

    // Non-preserved works degrade
    const cutoff = tick - 60000
    for (let i = this.works.length - 1; i >= 0; i--) {
      const w = this.works[i]
      if (!w.preserved && w.tick < cutoff) {
        this.works.splice(i, 1)
      }
    }

    // Cap collection
    if (this.works.length > MAX_WORKS) {
      this.works.sort((a, b) => b.beauty - a.beauty)
      this.works.length = MAX_WORKS
    }
  }

  getWorks(): readonly OrigamiWork[] { return this.works }
}
