// World Waterspout System (v3.70) - Waterspouts form over warm ocean waters
// Waterspouts damage coastal areas, scatter sea creatures, and create waves

import { EntityManager, PositionComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type SpoutIntensity = 'weak' | 'moderate' | 'strong' | 'tornadic'

export interface Waterspout {
  id: number
  x: number
  y: number
  intensity: SpoutIntensity
  height: number
  speed: number
  direction: number
  damageRadius: number
  creaturesScattered: number
  lifetime: number
  startTick: number
}

const CHECK_INTERVAL = 1000
const SPAWN_CHANCE = 0.004
const MAX_SPOUTS = 6
const DIRECTION_DRIFT = 0.2

const INTENSITIES: SpoutIntensity[] = ['weak', 'moderate', 'strong', 'tornadic']

const RADIUS_MAP: Record<SpoutIntensity, number> = {
  weak: 2,
  moderate: 3,
  strong: 5,
  tornadic: 8,
}

export class WorldWaterspoutSystem {
  private spouts: Waterspout[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn over water
    if (this.spouts.length < MAX_SPOUTS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER || tile === TileType.DEEP_WATER) {
        const intensity = INTENSITIES[Math.floor(Math.random() * INTENSITIES.length)]
        this.spouts.push({
          id: this.nextId++,
          x, y,
          intensity,
          height: 20 + Math.random() * 60,
          speed: 0.2 + Math.random() * 0.4,
          direction: Math.random() * Math.PI * 2,
          damageRadius: RADIUS_MAP[intensity],
          creaturesScattered: 0,
          lifetime: 1500 + Math.random() * 3500,
          startTick: tick,
        })
      }
    }

    // Update spouts
    for (let i = this.spouts.length - 1; i >= 0; i--) {
      const s = this.spouts[i]
      const elapsed = tick - s.startTick

      // Move
      s.direction += (Math.random() - 0.5) * DIRECTION_DRIFT
      s.x = Math.max(0, Math.min(w - 1, s.x + Math.cos(s.direction) * s.speed))
      s.y = Math.max(0, Math.min(h - 1, s.y + Math.sin(s.direction) * s.speed))

      // Dissipate over land
      const tile = world.getTile(Math.floor(s.x), Math.floor(s.y))
      if (tile !== TileType.SHALLOW_WATER && tile !== TileType.DEEP_WATER) {
        s.lifetime *= 0.4
      }

      // Scatter nearby creatures
      const creatures = em.getEntitiesWithComponents('creature', 'position')
      for (const eid of creatures) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        const dx = pos.x - s.x
        const dy = pos.y - s.y
        if (dx * dx + dy * dy < s.damageRadius * s.damageRadius) {
          s.creaturesScattered++
        }
      }

      // Expire
      if (elapsed > s.lifetime) {
        this.spouts.splice(i, 1)
      }
    }
  }

  getSpouts(): readonly Waterspout[] { return this.spouts }
}
