// Creature Intuition System (v3.19) - Creatures sense danger and opportunity
// High-wisdom creatures have more accurate intuitions, triggering early reactions

import { EntityManager, CreatureComponent, NeedsComponent } from '../ecs/Entity'

export type IntuitionSense = 'danger' | 'opportunity' | 'weather' | 'betrayal' | 'treasure' | 'death'

export interface Intuition {
  id: number
  entityId: number
  sense: IntuitionSense
  accuracy: number    // 0-100
  triggered: boolean
  tick: number
}

const CHECK_INTERVAL = 700
const INTUITION_CHANCE = 0.015
const MAX_INTUITIONS = 80

const SENSE_TYPES: IntuitionSense[] = ['danger', 'opportunity', 'weather', 'betrayal', 'treasure', 'death']

const SENSE_WEIGHTS: Record<IntuitionSense, number> = {
  danger: 0.25,
  opportunity: 0.2,
  weather: 0.15,
  betrayal: 0.1,
  treasure: 0.15,
  death: 0.15,
}

const BASE_ACCURACY = 20
const WISDOM_ACCURACY_BONUS = 0.6

export class CreatureIntuitionSystem {
  private intuitions: Intuition[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.generateIntuitions(em, tick)
    this.processIntuitions(em)
    this.pruneOld()
  }

  private generateIntuitions(em: EntityManager, tick: number): void {
    if (this.intuitions.length >= MAX_INTUITIONS) return
    const entities = em.getEntitiesWithComponents('creature')
    for (const eid of entities) {
      if (Math.random() > INTUITION_CHANCE) continue
      const creature = em.getComponent<CreatureComponent>(eid, 'creature')
      const needs = em.getComponent<NeedsComponent>(eid, 'needs')
      if (!creature || !needs || needs.health <= 0) continue

      const sense = this.pickSense()
      const wisdom = this.getWisdom(creature)
      const accuracy = Math.min(100, BASE_ACCURACY + wisdom * WISDOM_ACCURACY_BONUS + Math.random() * 15)

      this.intuitions.push({
        id: this.nextId++,
        entityId: eid,
        sense,
        accuracy: Math.floor(accuracy),
        triggered: false,
        tick,
      })
      if (this.intuitions.length >= MAX_INTUITIONS) return
    }
  }

  private pickSense(): IntuitionSense {
    const r = Math.random()
    let cum = 0
    for (const s of SENSE_TYPES) {
      cum += SENSE_WEIGHTS[s]
      if (r <= cum) return s
    }
    return 'danger'
  }

  private getWisdom(creature: CreatureComponent): number {
    // Use age as proxy for wisdom
    const ageVal = creature.age ?? 0
    return Math.min(100, 50 + ageVal * 0.3)
  }

  private processIntuitions(em: EntityManager): void {
    for (const intuition of this.intuitions) {
      if (intuition.triggered) continue
      const creature = em.getComponent<CreatureComponent>(intuition.entityId, 'creature')
      const needs = em.getComponent<NeedsComponent>(intuition.entityId, 'needs')
      if (!creature || !needs || needs.health <= 0) {
        intuition.triggered = true
        continue
      }

      // Higher accuracy = higher chance of triggering
      const triggerChance = intuition.accuracy / 400
      if (Math.random() < triggerChance) {
        intuition.triggered = true
        this.applyIntuitionEffect(needs, intuition)
      }
    }
  }

  private applyIntuitionEffect(needs: NeedsComponent, intuition: Intuition): void {
    const bonus = intuition.accuracy * 0.05
    switch (intuition.sense) {
      case 'danger':
        needs.health = Math.min(100, needs.health + bonus)
        break
      case 'opportunity':
      case 'treasure':
        // Small health boost
        needs.health = Math.min(100, needs.health + bonus * 0.5)
        break
      case 'weather':
      case 'betrayal':
      case 'death':
        // Defensive boost via health
        needs.health = Math.min(100, needs.health + bonus * 0.5)
        break
    }
  }

  private pruneOld(): void {
    if (this.intuitions.length <= MAX_INTUITIONS) return
    for (let _i = this.intuitions.length - 1; _i >= 0; _i--) { if (!((i) => !i.triggered)(this.intuitions[_i])) this.intuitions.splice(_i, 1) }
    if (this.intuitions.length > MAX_INTUITIONS) {
      this.intuitions.splice(0, this.intuitions.length - MAX_INTUITIONS)
    }
  }

}
