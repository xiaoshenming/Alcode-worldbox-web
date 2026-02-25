// Creature Shapeshifting System (v3.84) - Magical creatures can change form
// Shapeshifters disguise as other species, gain abilities, but risk identity loss

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ShiftForm = 'wolf' | 'eagle' | 'bear' | 'serpent' | 'deer' | 'shadow'

export interface ShapeShift {
  id: number
  shifterId: number
  originalRace: string
  currentForm: ShiftForm
  stability: number
  powerGain: number
  identityLoss: number
  tick: number
}

const CHECK_INTERVAL = 1500
const SHIFT_CHANCE = 0.002
const MAX_SHIFTS = 60
const MASTERY_GROWTH = 0.04

const FORMS: ShiftForm[] = ['wolf', 'eagle', 'bear', 'serpent', 'deer', 'shadow']

export class CreatureShapeshiftingSystem {
  private shifts: ShapeShift[] = []
  private nextId = 1
  private lastCheck = 0
  private masteryMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.shifts.length >= MAX_SHIFTS) break
      if (Math.random() > SHIFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 18) continue

      let mastery = this.masteryMap.get(eid) ?? (2 + Math.random() * 8)
      mastery = Math.min(100, mastery + MASTERY_GROWTH)
      this.masteryMap.set(eid, mastery)

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]
      const stability = mastery * (0.4 + Math.random() * 0.6)

      this.shifts.push({
        id: this.nextId++,
        shifterId: eid,
        originalRace: c.species ?? 'human',
        currentForm: form,
        stability,
        powerGain: form === 'bear' ? 30 : form === 'eagle' ? 20 : 15,
        identityLoss: Math.max(0, 50 - stability),
        tick,
      })
    }

    const cutoff = tick - 20000
    for (let i = this.shifts.length - 1; i >= 0; i--) {
      if (this.shifts[i].tick < cutoff) this.shifts.splice(i, 1)
    }
  }

  getShifts(): readonly ShapeShift[] { return this.shifts }
  getMastery(eid: number): number { return this.masteryMap.get(eid) ?? 0 }
}
