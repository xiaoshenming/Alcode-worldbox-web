// Creature Astrology System (v3.89) - Creatures observe celestial events for guidance
// Star readings grant temporary buffs based on cosmic alignments

import { EntityManager, CreatureComponent } from '../ecs/Entity'
import { pickRandom } from '../utils/RandomUtils'

export type CelestialEvent = 'new_moon' | 'full_moon' | 'eclipse' | 'meteor_shower' | 'conjunction' | 'comet'

export interface AstrologicalReading {
  id: number
  event: CelestialEvent
  effect: string
  magnitude: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const EVENT_CHANCE = 0.005
const MAX_READINGS = 100

const EVENTS: CelestialEvent[] = ['new_moon', 'full_moon', 'eclipse', 'meteor_shower', 'conjunction', 'comet']
const EFFECTS = ['strength', 'wisdom', 'speed', 'luck', 'resilience', 'charisma']

export class CreatureAstrologySystem {
  private readings: AstrologicalReading[] = []
  private nextId = 1
  private lastCheck = 0
  private currentEvent: CelestialEvent | null = null

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Generate celestial events
    if (Math.random() < EVENT_CHANCE) {
      this.currentEvent = pickRandom(EVENTS)
    }

    if (!this.currentEvent) return

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.readings.length >= MAX_READINGS) break
      if (Math.random() > 0.008) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      const effect = pickRandom(EFFECTS)
      const isRare = this.currentEvent === 'eclipse' || this.currentEvent === 'comet'
      const magnitude = (10 + Math.random() * 40) * (isRare ? 1.8 : 1)

      this.readings.push({
        id: this.nextId++,
        event: this.currentEvent,
        effect,
        magnitude,
        duration: 3000 + Math.random() * 7000,
        tick,
      })
    }

    // Clear expired readings
    const now = tick
    for (let i = this.readings.length - 1; i >= 0; i--) {
      const r = this.readings[i]
      if (now - r.tick > r.duration) {
        this.readings.splice(i, 1)
      }
    }

    // Celestial events fade
    if (Math.random() < 0.1) this.currentEvent = null
  }

}
