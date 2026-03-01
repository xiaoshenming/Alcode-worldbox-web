// Creature Mentor System (v2.74) - Elder creatures mentor younger ones, passing down skills
// Mentorship bonds form between experienced and young creatures, boosting learning speed

import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'

export interface MentorBond {
  id: number
  mentorId: number
  apprenticeId: number
  skill: MentorSkill
  progress: number    // 0-100
  quality: number     // 0-100, based on mentor's experience
  formedTick: number
}

export type MentorSkill = 'combat' | 'foraging' | 'building' | 'crafting' | 'leadership' | 'survival'

const CHECK_INTERVAL = 700
const MAX_BONDS = 30
const BOND_CHANCE = 0.018
const PROGRESS_RATE = 4
const MENTOR_MIN_AGE = 500
const PROXIMITY_RANGE = 8

const SKILL_WEIGHTS: Record<MentorSkill, number> = {
  combat: 0.25,
  foraging: 0.2,
  building: 0.15,
  crafting: 0.15,
  leadership: 0.1,
  survival: 0.15,
}
const SKILL_ENTRIES = Object.entries(SKILL_WEIGHTS) as [MentorSkill, number][]

export class CreatureMentorSystem {
  private bonds: MentorBond[] = []
  private mentorIds = new Set<number>()
  private apprenticeIds = new Set<number>()
  private nextId = 1
  private lastCheck = 0
  private _mentorsBuf: number[] = []
  private _apprenticesBuf: number[] = []

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formBonds(em, tick)
    this.updateBonds(em)
  }

  private formBonds(em: EntityManager, tick: number): void {
    if (this.bonds.length >= MAX_BONDS) return
    const entities = em.getEntitiesWithComponents('position', 'creature')

    const mentors = this._mentorsBuf; mentors.length = 0
    const apprentices = this._apprenticesBuf; apprentices.length = 0

    for (const id of entities) {
      if (this.mentorIds.has(id) || this.apprenticeIds.has(id)) continue
      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!creature) continue
      const age = creature.age ?? 0
      if (age >= MENTOR_MIN_AGE) mentors.push(id)
      else if (age < MENTOR_MIN_AGE / 2) apprentices.push(id)
    }

    for (const mentorId of mentors) {
      if (this.bonds.length >= MAX_BONDS) break
      if (Math.random() > BOND_CHANCE) continue

      const mPos = em.getComponent<PositionComponent>(mentorId, 'position')
      if (!mPos) continue

      for (const appId of apprentices) {
        if (this.apprenticeIds.has(appId)) continue
        const aPos = em.getComponent<PositionComponent>(appId, 'position')
        if (!aPos) continue
        const dx = mPos.x - aPos.x
        const dy = mPos.y - aPos.y
        if (dx * dx + dy * dy > PROXIMITY_RANGE * PROXIMITY_RANGE) continue

        const roll = Math.random()
        let cumulative = 0
        let skill: MentorSkill = 'survival'
        for (const [s, w] of SKILL_ENTRIES) {
          cumulative += w
          if (roll <= cumulative) { skill = s; break }
        }

        const mentorAge = em.getComponent<CreatureComponent>(mentorId, 'creature')?.age ?? MENTOR_MIN_AGE
        const quality = Math.min(100, 30 + Math.floor((mentorAge / MENTOR_MIN_AGE) * 40) + Math.floor(Math.random() * 20))

        this.bonds.push({
          id: this.nextId++,
          mentorId,
          apprenticeId: appId,
          skill,
          progress: 0,
          quality,
          formedTick: tick,
        })
        this.mentorIds.add(mentorId)
        this.apprenticeIds.add(appId)
        break
      }
    }
  }

  private updateBonds(em: EntityManager): void {
    for (let i = this.bonds.length - 1; i >= 0; i--) {
      const bond = this.bonds[i]

      // Check both entities still exist via component check
      const mentorAlive = em.hasComponent(bond.mentorId, 'creature')
      const appAlive = em.hasComponent(bond.apprenticeId, 'creature')

      if (!mentorAlive || !appAlive) {
        this.removeBond(i)
        continue
      }

      const mPos = em.getComponent<PositionComponent>(bond.mentorId, 'position')
      const aPos = em.getComponent<PositionComponent>(bond.apprenticeId, 'position')
      if (mPos && aPos) {
        const dx = mPos.x - aPos.x
        const dy = mPos.y - aPos.y
        const inRange = dx * dx + dy * dy <= PROXIMITY_RANGE * PROXIMITY_RANGE * 4
        if (inRange) {
          bond.progress = Math.min(100, bond.progress + PROGRESS_RATE * (bond.quality / 100))
        }
      }

      if (bond.progress >= 100) {
        this.removeBond(i)
      }
    }
  }

  private removeBond(index: number): void {
    const bond = this.bonds[index]
    this.mentorIds.delete(bond.mentorId)
    this.apprenticeIds.delete(bond.apprenticeId)
    this.bonds.splice(index, 1)
  }


  getEntityBond(entityId: number): MentorBond | null {
    return this.bonds.find(b => b.mentorId === entityId || b.apprenticeId === entityId) ?? null
  }

  isMentor(entityId: number): boolean { return this.mentorIds.has(entityId) }
  isApprentice(entityId: number): boolean { return this.apprenticeIds.has(entityId) }
}
