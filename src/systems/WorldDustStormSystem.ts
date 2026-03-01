// World Dust Storm System (v3.32) - Massive dust storms sweep across terrain
// Reduces visibility and damages crops, slows creature movement

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'

export type DustStormIntensity = 'mild' | 'moderate' | 'severe' | 'catastrophic'
const DUST_STORM_INTENSITIES: DustStormIntensity[] = ['mild', 'moderate', 'severe', 'catastrophic']

export interface DustStorm {
  id: number
  x: number
  y: number
  radius: number
  intensity: DustStormIntensity
  direction: number   // radians
  speed: number
  startTick: number
  duration: number
}

const CHECK_INTERVAL = 800
const STORM_CHANCE = 0.004
const MAX_STORMS = 3
const DAMAGE_MAP: Record<DustStormIntensity, number> = {
  mild: 0.05,
  moderate: 0.15,
  severe: 0.3,
  catastrophic: 0.5,
}

export class WorldDustStormSystem {
  private storms: DustStorm[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: any, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.trySpawnStorm(world, tick)
      this.expireStorms(tick)
    }

    this.moveStorms()
    if (this.storms.length > 0) {
      this.applyEffects(em)
    }
  }

  private trySpawnStorm(world: any, tick: number): void {
    if (this.storms.length >= MAX_STORMS) return
    if (Math.random() > STORM_CHANCE) return

    const width = world.width || 200
    const height = world.height || 200
    const intensities = DUST_STORM_INTENSITIES
    const roll = Math.random()
    const intensity = roll < 0.4 ? intensities[0] : roll < 0.7 ? intensities[1] : roll < 0.9 ? intensities[2] : intensities[3]

    this.storms.push({
      id: this.nextId++,
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
      radius: 10 + Math.floor(Math.random() * 15),
      intensity,
      direction: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.3,
      startTick: tick,
      duration: 1500 + Math.floor(Math.random() * 2000),
    })
  }

  private moveStorms(): void {
    for (const s of this.storms) {
      s.x += Math.cos(s.direction) * s.speed
      s.y += Math.sin(s.direction) * s.speed
      s.direction += (Math.random() - 0.5) * 0.1
    }
  }

  private expireStorms(tick: number): void {
    for (let _i = this.storms.length - 1; _i >= 0; _i--) { if (!((s) => tick - s.startTick < s.duration)(this.storms[_i])) this.storms.splice(_i, 1) }
  }

  private applyEffects(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position', 'needs')
    for (const eid of entities) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      const needs = em.getComponent<NeedsComponent>(eid, 'needs')
      if (!pos || !needs) continue

      for (const s of this.storms) {
        const dx = pos.x - s.x
        const dy = pos.y - s.y
        const distSq = dx * dx + dy * dy
        if (distSq < s.radius * s.radius) {
          const dmg = DAMAGE_MAP[s.intensity]
          if (needs.health > 5) {
            needs.health -= dmg
          }
        }
      }
    }
  }
}
