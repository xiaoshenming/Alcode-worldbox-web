// World Comet System (v3.20) - Comets streak across the sky
// Rare but impactful events bringing resources, omens, or mutations

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'

export type CometEffect = 'resource_rain' | 'omen' | 'inspiration' | 'mutation' | 'blessing'

export interface Comet {
  id: number
  trajectory: { startX: number; startY: number; endX: number; endY: number }
  speed: number
  brightness: number   // 0-100
  effect: CometEffect
  startTick: number
  duration: number
}

const CHECK_INTERVAL = 1200
const COMET_CHANCE = 0.003
const MAX_COMETS = 3

const EFFECTS: CometEffect[] = ['resource_rain', 'omen', 'inspiration', 'mutation', 'blessing']

const EFFECT_WEIGHTS: Record<CometEffect, number> = {
  resource_rain: 0.25,
  omen: 0.2,
  inspiration: 0.25,
  mutation: 0.15,
  blessing: 0.15,
}

export class WorldCometSystem {
  private comets: Comet[] = []
  private nextId = 1
  private lastCheck = 0
  private totalComets = 0

  update(dt: number, world: { width: number; height: number }, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.spawnComet(world, tick)
    this.updateComets(tick, em, world)
    this.removeExpired(tick)
  }

  private spawnComet(world: { width: number; height: number }, tick: number): void {
    if (this.comets.length >= MAX_COMETS) return
    if (Math.random() > COMET_CHANCE) return

    const w = world.width
    const h = world.height
    const startX = Math.random() * w
    const startY = 0
    const endX = Math.random() * w
    const endY = h

    const effect = this.pickEffect()
    const speed = 0.5 + Math.random() * 2
    const duration = 800 + Math.floor(Math.random() * 1200)

    this.comets.push({
      id: this.nextId++,
      trajectory: { startX, startY, endX, endY },
      speed,
      brightness: 50 + Math.floor(Math.random() * 50),
      effect,
      startTick: tick,
      duration,
    })
    this.totalComets++
  }

  private pickEffect(): CometEffect {
    const r = Math.random()
    let cum = 0
    for (const e of EFFECTS) {
      cum += EFFECT_WEIGHTS[e]
      if (r <= cum) return e
    }
    return 'omen'
  }

  private updateComets(tick: number, em: EntityManager, world: { width: number; height: number }): void {
    for (const comet of this.comets) {
      const elapsed = tick - comet.startTick
      const progress = Math.min(1, elapsed / comet.duration)

      // Apply effect at midpoint
      if (progress >= 0.45 && progress <= 0.55) {
        this.applyEffect(comet, em, world)
      }

      // Brightness fades near end
      if (progress > 0.7) {
        comet.brightness = Math.max(0, comet.brightness - 2)
      }
    }
  }

  private applyEffect(comet: Comet, em: EntityManager, world: { width: number; height: number }): void {
    const midX = (comet.trajectory.startX + comet.trajectory.endX) / 2
    const midY = (comet.trajectory.startY + comet.trajectory.endY) / 2
    const entities = em.getEntitiesWithComponents('creature', 'position')

    switch (comet.effect) {
      case 'resource_rain':
        // Boost health of nearby creatures
        for (const eid of entities) {
          const pos = em.getComponent<PositionComponent>(eid, 'position')
          if (!pos) continue
          const dx = pos.x - midX, dy = pos.y - midY
          if (dx * dx + dy * dy < 400) {
            const needs = em.getComponent<NeedsComponent>(eid, 'needs')
            if (needs) needs.health = Math.min(100, needs.health + 10)
          }
        }
        break
      case 'inspiration':
        // Small stat boost to random creatures
        for (const eid of entities) {
          if (Math.random() > 0.1) continue
          const needs = em.getComponent<NeedsComponent>(eid, 'needs')
          if (needs) needs.health = Math.min(100, needs.health + 5)
        }
        break
      case 'mutation':
        // Slight damage to nearby creatures (cosmic radiation)
        for (const eid of entities) {
          const pos = em.getComponent<PositionComponent>(eid, 'position')
          if (!pos) continue
          const dx = pos.x - midX, dy = pos.y - midY
          if (dx * dx + dy * dy < 200) {
            const needs = em.getComponent<NeedsComponent>(eid, 'needs')
            if (needs) needs.health = Math.max(1, needs.health - 3)
          }
        }
        break
      case 'omen':
      case 'blessing':
        // Passive effects, no direct gameplay change
        break
    }
  }

  private removeExpired(tick: number): void {
    for (let _i = this.comets.length - 1; _i >= 0; _i--) { if (!((c) => tick - c.startTick < c.duration)(this.comets[_i])) this.comets.splice(_i, 1) }
  }

  getComets(): Comet[] { return this.comets }
  getActiveComets(): Comet[] { return this.comets }
  getTotalComets(): number { return this.totalComets }
}
