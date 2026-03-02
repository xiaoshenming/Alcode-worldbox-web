// Creature Sleepwalk System (v3.29) - Creatures sleepwalk at night
// Some creatures wander aimlessly during night ticks, risking danger

import { EntityManager, PositionComponent } from '../ecs/Entity'

export interface Sleepwalker {
  id: number
  entityId: number
  startTick: number
  distance: number    // tiles walked
  direction: number   // angle in radians
  duration: number
}

const CHECK_INTERVAL = 600
const SLEEPWALK_CHANCE = 0.008
const MAX_SLEEPWALKERS = 30
const WANDER_SPEED = 0.3

export class CreatureSleepwalkSystem {
  private sleepwalkers: Sleepwalker[] = []
  private _sleepSet = new Set<number>()
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.startSleepwalking(em, tick)
      this.expireSleepwalkers(tick)
    }

    this.moveSleepwalkers(em)
  }

  private startSleepwalking(em: EntityManager, tick: number): void {
    if (this.sleepwalkers.length >= MAX_SLEEPWALKERS) return

    const entities = em.getEntitiesWithComponents('creature', 'position')
    for (const eid of entities) {
      if (Math.random() > SLEEPWALK_CHANCE) continue
      if (this._sleepSet.has(eid)) continue
      if (this.sleepwalkers.length >= MAX_SLEEPWALKERS) break

      this.sleepwalkers.push({
        id: this.nextId++,
        entityId: eid,
        startTick: tick,
        distance: 0,
        direction: Math.random() * Math.PI * 2,
        duration: 300 + Math.floor(Math.random() * 500),
      })
      this._sleepSet.add(eid)
    }
  }

  private moveSleepwalkers(em: EntityManager): void {
    for (const sw of this.sleepwalkers) {
      const pos = em.getComponent<PositionComponent>(sw.entityId, 'position')
      if (!pos) continue

      // Wander in current direction with slight drift
      sw.direction += (Math.random() - 0.5) * 0.3
      pos.x += Math.cos(sw.direction) * WANDER_SPEED
      pos.y += Math.sin(sw.direction) * WANDER_SPEED
      sw.distance += WANDER_SPEED
    }
  }

  private expireSleepwalkers(tick: number): void {
    for (let _i = this.sleepwalkers.length - 1; _i >= 0; _i--) {
      const sw = this.sleepwalkers[_i]
      if (!(tick - sw.startTick < sw.duration)) {
        this._sleepSet.delete(sw.entityId)
        this.sleepwalkers.splice(_i, 1)
      }
    }
  }

  getSleepwalker(entityId: number): Sleepwalker | undefined {
    if (!this._sleepSet.has(entityId)) {
      // Fallback scan in case sleepwalkers was pushed externally (e.g. tests)
      const found = this.sleepwalkers.find(sw => sw.entityId === entityId)
      if (found) this._sleepSet.add(entityId)
      return found
    }
    return this.sleepwalkers.find(sw => sw.entityId === entityId)
  }
}
