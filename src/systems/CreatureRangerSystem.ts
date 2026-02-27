// Creature Ranger System (v3.123) - Rangers patrol and protect territory
// They detect threats early and provide defense bonuses to settlements

import { EntityManager } from '../ecs/Entity'

export type RangerSpecialty = 'scout' | 'tracker' | 'warden' | 'sentinel'

export interface Ranger {
  id: number
  creatureId: number
  specialty: RangerSpecialty
  patrolRadius: number
  alertness: number
  threatsDetected: number
  experience: number
  tick: number
}

const CHECK_INTERVAL = 2600
const RECRUIT_CHANCE = 0.004
const MAX_RANGERS = 25

const SPECS: RangerSpecialty[] = ['scout', 'tracker', 'warden', 'sentinel']
const SPEC_RADIUS: Record<RangerSpecialty, number> = {
  scout: 20, tracker: 15, warden: 10, sentinel: 30,
}

export class CreatureRangerSystem {
  private rangers: Ranger[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.rangers.length < MAX_RANGERS && Math.random() < RECRUIT_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const spec = SPECS[Math.floor(Math.random() * SPECS.length)]
        this.rangers.push({
          id: this.nextId++,
          creatureId: eid,
          specialty: spec,
          patrolRadius: SPEC_RADIUS[spec],
          alertness: 40 + Math.floor(Math.random() * 40),
          threatsDetected: 0,
          experience: 0,
          tick,
        })
      }
    }

    for (const r of this.rangers) {
      // Patrol and detect threats
      if (Math.random() < 0.02) {
        r.threatsDetected++
        r.experience = Math.min(100, r.experience + 0.5)
        r.alertness = Math.min(100, r.alertness + 0.1)
      }
      // Expand patrol radius with experience
      if (r.experience > 50) {
        r.patrolRadius = Math.min(50, SPEC_RADIUS[r.specialty] + Math.floor(r.experience * 0.2))
      }
    }

    for (let i = this.rangers.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.rangers[i].creatureId, 'creature')) this.rangers.splice(i, 1)
    }
  }

  getRangers(): readonly Ranger[] { return this.rangers }
}
