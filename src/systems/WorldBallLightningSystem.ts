// World Ball Lightning System (v3.65) - Rare ball lightning phenomena during storms
// Ball lightning moves erratically, damages structures, and terrifies creatures

import { EntityManager, PositionComponent } from '../ecs/Entity'
import { World } from '../game/World'

export type BallSize = 'small' | 'medium' | 'large' | 'massive'

export interface BallLightning {
  id: number
  x: number
  y: number
  size: BallSize
  energy: number         // 0-100
  speed: number
  direction: number
  damageRadius: number
  creaturesTerrified: number
  lifetime: number
  startTick: number
}

const CHECK_INTERVAL = 900
const SPAWN_CHANCE = 0.003
const MAX_BALLS = 6
const ENERGY_DECAY = 0.08
const DIRECTION_CHAOS = 0.4

const SIZES: BallSize[] = ['small', 'medium', 'large', 'massive']

const RADIUS_MAP: Record<BallSize, number> = {
  small: 1,
  medium: 2,
  large: 4,
  massive: 6,
}

const ENERGY_MAP: Record<BallSize, number> = {
  small: 40,
  medium: 60,
  large: 80,
  massive: 100,
}

export class WorldBallLightningSystem {
  private balls: BallLightning[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn ball lightning
    if (this.balls.length < MAX_BALLS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const size = SIZES[Math.floor(Math.random() * SIZES.length)]

      this.balls.push({
        id: this.nextId++,
        x, y,
        size,
        energy: ENERGY_MAP[size],
        speed: 0.3 + Math.random() * 0.5,
        direction: Math.random() * Math.PI * 2,
        damageRadius: RADIUS_MAP[size],
        creaturesTerrified: 0,
        lifetime: 1500 + Math.random() * 3000,
        startTick: tick,
      })
    }

    // Update balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i]
      const elapsed = tick - b.startTick

      // Erratic movement
      b.direction += (Math.random() - 0.5) * DIRECTION_CHAOS
      b.x = Math.max(0, Math.min(w - 1, b.x + Math.cos(b.direction) * b.speed))
      b.y = Math.max(0, Math.min(h - 1, b.y + Math.sin(b.direction) * b.speed))

      // Energy decay
      b.energy = Math.max(0, b.energy - ENERGY_DECAY)

      // Terrify nearby creatures
      const creatures = em.getEntitiesWithComponents('creature', 'position')
      for (const eid of creatures) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        const dx = pos.x - b.x
        const dy = pos.y - b.y
        if (dx * dx + dy * dy < b.damageRadius * b.damageRadius * 4) {
          b.creaturesTerrified++
        }
      }

      // Expire
      if (elapsed > b.lifetime || b.energy <= 0) {
        this.balls.splice(i, 1)
      }
    }
  }

}
