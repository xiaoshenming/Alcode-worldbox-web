// Creature Claustrophobia System (v3.34) - Some creatures fear enclosed spaces
// Claustrophobic creatures panic near mountains, dense forests, or underground

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'

export interface Claustrophobe {
  id: number
  entityId: number
  severity: number    // 0-100
  panicLevel: number  // 0-100
  triggers: number    // times triggered
  tick: number
}

const CHECK_INTERVAL = 700
const PHOBIA_CHANCE = 0.008
const MAX_CLAUSTROPHOBES = 60
const PANIC_DECAY = 0.5
const PANIC_THRESHOLD = 60

export class CreatureClaustrophobiaSystem {
  private claustrophobes: Claustrophobe[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, world: any, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.identifyClaustrophobes(em, tick)
    this.checkEnvironment(em, world)
    this.decayPanic()
    this.cleanup()
  }

  private identifyClaustrophobes(em: EntityManager, tick: number): void {
    if (this.claustrophobes.length >= MAX_CLAUSTROPHOBES) return

    const entities = em.getEntitiesWithComponents('creature')
    for (const eid of entities) {
      if (Math.random() > PHOBIA_CHANCE) continue
      if (this.isClaustrophobe(eid)) continue
      if (this.claustrophobes.length >= MAX_CLAUSTROPHOBES) break

      this.claustrophobes.push({
        id: this.nextId++,
        entityId: eid,
        severity: 20 + Math.random() * 60,
        panicLevel: 0,
        triggers: 0,
        tick,
      })
    }
  }

  private checkEnvironment(em: EntityManager, world: any): void {
    for (const c of this.claustrophobes) {
      const pos = em.getComponent<PositionComponent>(c.entityId, 'position')
      if (!pos) continue

      // Check surrounding tiles for enclosed feeling
      const tx = Math.floor(pos.x)
      const ty = Math.floor(pos.y)
      let enclosedScore = 0

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue
          const tile = world.getTile?.(tx + dx, ty + dy)
          // Mountains (6) and dense forest (5) feel enclosed
          if (tile === 5 || tile === 6) enclosedScore += 15
        }
      }

      if (enclosedScore > 30) {
        c.panicLevel = Math.min(100, c.panicLevel + enclosedScore * 0.1 * (c.severity * 0.01))
        c.triggers++

        // Apply stress damage when panicking
        if (c.panicLevel > PANIC_THRESHOLD) {
          const needs = em.getComponent<NeedsComponent>(c.entityId, 'needs')
          if (needs && needs.health > 5) {
            needs.health -= 0.2 * (c.panicLevel * 0.01)
          }
        }
      }
    }
  }

  private decayPanic(): void {
    for (const c of this.claustrophobes) {
      c.panicLevel = Math.max(0, c.panicLevel - PANIC_DECAY)
    }
  }

  private cleanup(): void {
    if (this.claustrophobes.length > MAX_CLAUSTROPHOBES) {
      this.claustrophobes.sort((a, b) => b.severity - a.severity)
      this.claustrophobes.length = MAX_CLAUSTROPHOBES
    }
  }

  private isClaustrophobe(entityId: number): boolean {
    return this.claustrophobes.some(c => c.entityId === entityId)
  }

}
