// Creature Exile System (v3.21) - Creatures exiled from civilizations
// Criminal or treasonous creatures are banished, becoming wanderers

import { EntityManager, PositionComponent, CreatureComponent, NeedsComponent } from '../ecs/Entity'

export type ExileReason = 'crime' | 'treason' | 'heresy' | 'cowardice' | 'debt' | 'curse'

export interface Exile {
  id: number
  entityId: number
  fromCivId: number
  reason: ExileReason
  wanderTicks: number
  tick: number
}

const CHECK_INTERVAL = 800
const EXILE_CHANCE = 0.008
const MAX_EXILES = 60

const REASONS: ExileReason[] = ['crime', 'treason', 'heresy', 'cowardice', 'debt', 'curse']

export class CreatureExileSystem {
  private exiles: Exile[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.checkForExiles(em, tick)
    this.updateWanderers(em)
    this.cleanup()
  }

  private checkForExiles(em: EntityManager, tick: number): void {
    if (this.exiles.length >= MAX_EXILES) return

    const entities = em.getEntitiesWithComponents('creature', 'position')
    for (const eid of entities) {
      if (Math.random() > EXILE_CHANCE) continue
      if (this.isExiled(eid)) continue

      const creature = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!creature) continue

      // Only exile creatures that belong to a civilization (have a name)
      if (!creature.name) continue

      const reason = REASONS[Math.floor(Math.random() * REASONS.length)]
      this.exiles.push({
        id: this.nextId++,
        entityId: eid,
        fromCivId: 0,
        reason,
        wanderTicks: 0,
        tick,
      })

      if (this.exiles.length >= MAX_EXILES) break
    }
  }

  private updateWanderers(em: EntityManager): void {
    for (const exile of this.exiles) {
      exile.wanderTicks++

      // Exiled creatures slowly lose health from hardship
      const needs = em.getComponent<NeedsComponent>(exile.entityId, 'needs')
      if (needs && needs.health > 10) {
        needs.health -= Math.random() * 0.3
      }

      // Wanderers move randomly
      const pos = em.getComponent<PositionComponent>(exile.entityId, 'position')
      if (pos) {
        pos.x += (Math.random() - 0.5) * 2
        pos.y += (Math.random() - 0.5) * 2
      }
    }
  }

  private cleanup(): void {
    // Remove exiles whose entities no longer exist or who wandered long enough
    this.exiles = this.exiles.filter(e => e.wanderTicks < 5000)
    if (this.exiles.length > MAX_EXILES) {
      this.exiles.splice(0, this.exiles.length - MAX_EXILES)
    }
  }

  private isExiled(entityId: number): boolean {
    return this.exiles.some(e => e.entityId === entityId)
  }

  getExiles(): Exile[] { return this.exiles }
  getExileCount(): number { return this.exiles.length }
}
