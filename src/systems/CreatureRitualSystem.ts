// Creature Ritual System (v2.48) - Creatures perform group rituals
// Rituals for blessings, harvests, war preparation, and spiritual events
// Successful rituals provide temporary buffs to participants

import { EntityManager, EntityId, PositionComponent } from '../ecs/Entity'

export type RitualType = 'harvest' | 'war' | 'blessing' | 'mourning' | 'celebration' | 'summoning'

export interface Ritual {
  id: number
  type: RitualType
  civId: number
  x: number
  y: number
  participants: EntityId[]
  progress: number      // 0-100
  startedAt: number
  completed: boolean
  buffDuration: number
}

const CHECK_INTERVAL = 1000
const PROGRESS_INTERVAL = 400
const MAX_RITUALS = 10
const PROGRESS_PER_TICK = 5
const BUFF_DURATION = 2000

const RITUAL_TYPES: RitualType[] = ['harvest', 'war', 'blessing', 'mourning', 'celebration', 'summoning']

let nextRitualId = 1

export class CreatureRitualSystem {
  private rituals: Ritual[] = []
  private lastCheck = 0
  private lastProgress = 0
  private completedCount = 0

  update(dt: number, em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.initiateRituals(em, civManager, tick)
    }
    if (tick - this.lastProgress >= PROGRESS_INTERVAL) {
      this.lastProgress = tick
      this.progressRituals(em, tick)
    }
  }

  private initiateRituals(em: EntityManager, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (this.rituals.filter(r => !r.completed).length >= MAX_RITUALS) return
    const civs = [...civManager.civilizations.entries()]
    for (const [civId, civ] of civs) {
      if (Math.random() > 0.06) continue
      // Find creatures from this civ near each other
      const creatures = em.getEntitiesWithComponents('creature', 'position', 'civMember')
      const civCreatures: { id: EntityId; pos: PositionComponent }[] = []
      for (const id of creatures) {
        const member = em.getComponent<any>(id, 'civMember')
        if (member?.civId !== civId) continue
        const pos = em.getComponent<PositionComponent>(id, 'position')
        if (pos) civCreatures.push({ id, pos })
        if (civCreatures.length >= 8) break
      }
      if (civCreatures.length < 3) continue
      const center = civCreatures[0].pos
      const nearby = civCreatures.filter(c => {
        const dx = c.pos.x - center.x, dy = c.pos.y - center.y
        return dx * dx + dy * dy < 100
      })
      if (nearby.length < 3) continue
      this.rituals.push({
        id: nextRitualId++,
        type: RITUAL_TYPES[Math.floor(Math.random() * RITUAL_TYPES.length)],
        civId,
        x: center.x, y: center.y,
        participants: nearby.map(c => c.id),
        progress: 0,
        startedAt: tick,
        completed: false,
        buffDuration: BUFF_DURATION,
      })
      break
    }
  }

  private progressRituals(em: EntityManager, tick: number): void {
    for (const ritual of this.rituals) {
      if (ritual.completed) continue
      // Check participants still alive
      ritual.participants = ritual.participants.filter(id => em.getComponent(id, 'creature'))
      if (ritual.participants.length < 2) {
        ritual.completed = true
        continue
      }
      ritual.progress = Math.min(100, ritual.progress + PROGRESS_PER_TICK + Math.floor(Math.random() * 3))
      if (ritual.progress >= 100) {
        ritual.completed = true
        this.completedCount++
      }
    }
    // Cleanup old completed rituals
    if (this.rituals.length > 20) {
      this.rituals = this.rituals.filter(r => !r.completed || tick - r.startedAt < 3000)
    }
  }

  getRituals(): Ritual[] {
    return this.rituals
  }

  getActiveRituals(): Ritual[] {
    return this.rituals.filter(r => !r.completed)
  }

  getCompletedCount(): number {
    return this.completedCount
  }
}
