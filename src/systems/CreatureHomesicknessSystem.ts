// Creature Homesickness System (v3.49) - Creatures feel longing when far from home
// Homesick creatures lose morale and may attempt to return to their village

import { EntityManager, PositionComponent } from '../ecs/Entity'

export interface HomesicknessState {
  id: number
  entityId: number
  homeX: number
  homeY: number
  intensity: number    // 0-100
  moralePenalty: number
  returnAttempts: number
  tick: number
}

const CHECK_INTERVAL = 1000
const DEVELOP_CHANCE = 0.007
const MAX_STATES = 120
const INTENSITY_GROWTH = 0.025
const HOME_RADIUS = 8
const MAX_PENALTY = 25

export class CreatureHomesicknessSystem {
  private states: HomesicknessState[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    // Develop homesickness
    for (const eid of creatures) {
      if (this.states.length >= MAX_STATES) break
      if (this.states.some(s => s.entityId === eid)) continue
      if (Math.random() > DEVELOP_CHANCE) continue

      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue

      this.states.push({
        id: this.nextId++,
        entityId: eid,
        homeX: pos.x,
        homeY: pos.y,
        intensity: 5 + Math.random() * 15,
        moralePenalty: 0,
        returnAttempts: 0,
        tick,
      })
    }

    // Update states
    for (const state of this.states) {
      const pos = em.getComponent<PositionComponent>(state.entityId, 'position')
      if (!pos) continue

      const dx = pos.x - state.homeX
      const dy = pos.y - state.homeY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= HOME_RADIUS) {
        // Near home - reduce homesickness
        state.intensity = Math.max(0, state.intensity - 2)
        state.moralePenalty = Math.max(0, state.moralePenalty - 1)
      } else {
        // Far from home - increase
        state.intensity = Math.min(100, state.intensity + INTENSITY_GROWTH * CHECK_INTERVAL)
        state.moralePenalty = Math.min(MAX_PENALTY, state.intensity * 0.25)

        // Attempt to return
        if (state.intensity > 70 && Math.random() < 0.02) {
          state.returnAttempts++
          // Nudge toward home
          const norm = Math.max(1, dist)
          pos.x -= (dx / norm) * 0.8
          pos.y -= (dy / norm) * 0.8
        }
      }
    }

    // Remove for dead creatures
    for (let _i = this.states.length - 1; _i >= 0; _i--) { if (!((s) => em.hasComponent(s.entityId, 'creature'))(this.states[_i])) this.states.splice(_i, 1) }
  }

  getStates(): HomesicknessState[] {
    return this.states
  }

  getByEntity(entityId: number): HomesicknessState | undefined {
    return this.states.find(s => s.entityId === entityId)
  }
}
