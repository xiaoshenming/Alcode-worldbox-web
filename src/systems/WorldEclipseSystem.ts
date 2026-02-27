// World Eclipse System (v3.25) - Solar and lunar eclipses
// Rare celestial events that affect creature behavior worldwide

import { EntityManager, NeedsComponent } from '../ecs/Entity'

export type EclipseType = 'solar' | 'lunar'
export type EclipseEffect = 'panic' | 'worship' | 'power_surge' | 'darkness' | 'prophecy'

export interface Eclipse {
  id: number
  eclipseType: EclipseType
  intensity: number     // 0-100
  startTick: number
  duration: number
  effect: EclipseEffect
}

const CHECK_INTERVAL = 1500
const ECLIPSE_CHANCE = 0.002
const MAX_ECLIPSES = 2
const EFFECT_INTERVAL = 400

const EFFECTS: EclipseEffect[] = ['panic', 'worship', 'power_surge', 'darkness', 'prophecy']

export class WorldEclipseSystem {
  private eclipses: Eclipse[] = []
  private nextId = 1
  private lastCheck = 0
  private lastEffect = 0

  update(dt: number, world: any, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.trySpawnEclipse(tick)
      this.expireEclipses(tick)
    }

    if (this.eclipses.length > 0 && tick - this.lastEffect >= EFFECT_INTERVAL) {
      this.lastEffect = tick
      this.applyEffects(em, tick)
    }
  }

  private trySpawnEclipse(tick: number): void {
    if (this.eclipses.length >= MAX_ECLIPSES) return
    if (Math.random() > ECLIPSE_CHANCE) return

    // Solar eclipses are rarer than lunar
    const isSolar = Math.random() < 0.3
    const eclipseType: EclipseType = isSolar ? 'solar' : 'lunar'
    const intensity = isSolar
      ? 60 + Math.random() * 40
      : 30 + Math.random() * 50
    const duration = isSolar
      ? 800 + Math.floor(Math.random() * 400)
      : 1200 + Math.floor(Math.random() * 600)

    const effect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)]

    this.eclipses.push({
      id: this.nextId++,
      eclipseType,
      intensity,
      startTick: tick,
      duration,
      effect,
    })
  }

  private expireEclipses(tick: number): void {
    for (let _i = this.eclipses.length - 1; _i >= 0; _i--) { if (!((e) => tick - e.startTick < e.duration)(this.eclipses[_i])) this.eclipses.splice(_i, 1) }
  }

  private applyEffects(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('needs')

    for (const eclipse of this.eclipses) {
      const strength = eclipse.intensity * 0.01

      for (const eid of entities) {
        const needs = em.getComponent<NeedsComponent>(eid, 'needs')
        if (!needs) continue

        switch (eclipse.effect) {
          case 'panic':
            // Panic causes slight health loss from stress
            if (needs.health > 5) {
              needs.health -= 0.1 * strength
            }
            break
          case 'worship':
            // Worship provides minor healing
            needs.health = Math.min(100, needs.health + 0.05 * strength)
            break
          case 'power_surge':
            // Power surge boosts health slightly
            needs.health = Math.min(100, needs.health + 0.08 * strength)
            break
          case 'darkness':
            // Darkness causes minor stress
            if (needs.health > 10) {
              needs.health -= 0.05 * strength
            }
            break
          case 'prophecy':
            // Prophecy has no direct health effect
            break
        }
      }
    }
  }

  getEclipses(): Eclipse[] { return this.eclipses }
  getActiveEclipse(): Eclipse | undefined { return this.eclipses[0] }
  isEclipseActive(): boolean { return this.eclipses.length > 0 }
}
