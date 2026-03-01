// Creature Nostalgia System (v2.56) - Creatures feel nostalgia for birthplace
// Nostalgia grows with distance and time away from home
// Strong nostalgia boosts mood when returning, causes sadness when far away

import { EntityManager, EntityId, PositionComponent, CreatureComponent } from '../ecs/Entity'

export interface NostalgiaState {
  entityId: EntityId
  birthX: number
  birthY: number
  currentDist: number   // distance from birthplace
  intensity: number     // 0-100
  moodEffect: number    // -15 to +15
  lastVisitHome: number // tick of last visit
}

const CHECK_INTERVAL = 900
const MAX_TRACKED = 100
const NOSTALGIA_CHANCE = 0.05
const HOME_RADIUS = 8

export class CreatureNostalgiaSystem {
  private states: NostalgiaState[] = []
  private lastCheck = 0
  private totalHomesick = 0
  private totalReturned = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.trackCreatures(em, tick)
      this.updateNostalgia(em, tick)
    }
  }

  private trackCreatures(em: EntityManager, tick: number): void {
    if (this.states.length >= MAX_TRACKED) return
    const creatures = em.getEntitiesWithComponents('creature', 'position')
    for (const id of creatures) {
      if (Math.random() > NOSTALGIA_CHANCE) continue
      if (this.states.some(s => s.entityId === id)) continue

      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue

      this.states.push({
        entityId: id,
        birthX: Math.floor(pos.x),
        birthY: Math.floor(pos.y),
        currentDist: 0,
        intensity: 0,
        moodEffect: 0,
        lastVisitHome: tick,
      })
      if (this.states.length >= MAX_TRACKED) break
    }
  }

  private updateNostalgia(em: EntityManager, tick: number): void {
    for (let i = this.states.length - 1; i >= 0; i--) {
      const state = this.states[i]
      const pos = em.getComponent<PositionComponent>(state.entityId, 'position')
      if (!pos) { this.states.splice(i, 1); continue }

      const dx = pos.x - state.birthX
      const dy = pos.y - state.birthY
      state.currentDist = Math.sqrt(dx * dx + dy * dy)

      const isHome = state.currentDist < HOME_RADIUS
      if (isHome) {
        state.lastVisitHome = tick
        state.intensity = Math.max(0, state.intensity - 5)
        state.moodEffect = Math.min(15, 5 + state.intensity * 0.1)
        this.totalReturned++
      } else {
        const timeFactor = Math.min(1, (tick - state.lastVisitHome) / 5000)
        const distFactor = Math.min(1, state.currentDist / 80)
        state.intensity = Math.min(100, (timeFactor * 50 + distFactor * 50))
        state.moodEffect = -Math.floor(state.intensity * 0.15)
        if (state.intensity > 70) this.totalHomesick++
      }

      // Apply mood
      const creature = em.getComponent<CreatureComponent>(state.entityId, 'creature')
      if (creature && creature.mood != null) {
        creature.mood = Math.max(0, Math.min(100, creature.mood + state.moodEffect * 0.02))
      }
    }
  }

}
