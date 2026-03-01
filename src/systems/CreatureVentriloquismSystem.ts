// Creature Ventriloquism System (v3.59) - Creatures develop voice-throwing abilities
// Ventriloquism can deceive enemies, entertain allies, and aid in hunting

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type VoiceTrick = 'distraction' | 'mimicry' | 'intimidation' | 'lure' | 'comedy' | 'warning'

export interface VentriloquismAct {
  id: number
  performerId: number
  trick: VoiceTrick
  skill: number        // 0-100
  effectiveness: number
  targetId: number | null
  detected: boolean    // was the trick seen through
  tick: number
}

const CHECK_INTERVAL = 1100
const PERFORM_CHANCE = 0.004
const MAX_ACTS = 80
const SKILL_GROWTH = 0.07
const DETECTION_BASE = 0.4

const TRICKS: VoiceTrick[] = ['distraction', 'mimicry', 'intimidation', 'lure', 'comedy', 'warning']

const EFFECTIVENESS_MAP: Record<VoiceTrick, number> = {
  distraction: 0.6,
  mimicry: 0.7,
  intimidation: 0.8,
  lure: 0.75,
  comedy: 0.5,
  warning: 0.65,
}

export class CreatureVentriloquismSystem {
  private acts: VentriloquismAct[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.acts.length >= MAX_ACTS) break
      if (Math.random() > PERFORM_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 12) continue

      let skill = this.skillMap.get(eid) ?? (5 + Math.random() * 20)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const trick = TRICKS[Math.floor(Math.random() * TRICKS.length)]
      const baseFx = EFFECTIVENESS_MAP[trick]
      const detected = Math.random() > (skill / 100) * (1 - DETECTION_BASE) + DETECTION_BASE

      // Find a target
      const target = creatures.find(t => t !== eid) ?? null

      this.acts.push({
        id: this.nextId++,
        performerId: eid,
        trick,
        skill,
        effectiveness: detected ? baseFx * 0.2 : baseFx * (skill / 100),
        targetId: target,
        detected,
        tick,
      })
    }

    // Cleanup old acts
    const cutoff = tick - 5000
    for (let i = this.acts.length - 1; i >= 0; i--) {
      if (this.acts[i].tick < cutoff) {
        this.acts.splice(i, 1)
      }
    }
  }

}
