// Creature Mimicry System (v3.69) - Creatures mimic other species for survival
// Mimicry aids in hunting, defense, and social infiltration

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type MimicryType = 'visual' | 'behavioral' | 'acoustic' | 'chemical' | 'aggressive' | 'defensive'

export interface MimicryAttempt {
  id: number
  mimicId: number
  targetId: number
  type: MimicryType
  skill: number
  success: boolean
  benefit: number        // survival advantage gained
  tick: number
}

const CHECK_INTERVAL = 1100
const MIMIC_CHANCE = 0.004
const MAX_ATTEMPTS = 80
const SKILL_GROWTH = 0.06
const SUCCESS_BASE = 0.3

const TYPES: MimicryType[] = ['visual', 'behavioral', 'acoustic', 'chemical', 'aggressive', 'defensive']

const BENEFIT_MAP: Record<MimicryType, number> = {
  visual: 0.5,
  behavioral: 0.6,
  acoustic: 0.4,
  chemical: 0.7,
  aggressive: 0.8,
  defensive: 0.65,
}

export class CreatureMimicrySystem {
  private attempts: MimicryAttempt[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')
    if (creatures.length < 2) return

    for (const eid of creatures) {
      if (this.attempts.length >= MAX_ATTEMPTS) break
      if (Math.random() > MIMIC_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c) continue

      let skill = this.skillMap.get(eid) ?? (5 + Math.random() * 20)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      // Find a target to mimic
      const target = creatures.find(t => t !== eid) ?? creatures[0]
      if (target === eid) continue

      const type = TYPES[Math.floor(Math.random() * TYPES.length)]
      const success = Math.random() < SUCCESS_BASE + (skill / 100) * 0.5

      this.attempts.push({
        id: this.nextId++,
        mimicId: eid,
        targetId: target,
        type,
        skill,
        success,
        benefit: success ? BENEFIT_MAP[type] * (skill / 100) : 0,
        tick,
      })
    }

    // Cleanup old attempts
    const cutoff = tick - 5000
    for (let i = this.attempts.length - 1; i >= 0; i--) {
      if (this.attempts[i].tick < cutoff) {
        this.attempts.splice(i, 1)
      }
    }
  }

  getAttempts(): readonly MimicryAttempt[] { return this.attempts }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
