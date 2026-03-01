// World Dust Devil System (v3.60) - Small whirlwinds form in arid regions
// Dust devils scatter resources, disorient creatures, and reshape sand terrain

import { EntityManager, PositionComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type DevilIntensity = 'minor' | 'moderate' | 'strong' | 'violent'

export interface DustDevil {
  id: number
  x: number
  y: number
  intensity: DevilIntensity
  radius: number
  speed: number          // movement speed
  direction: number      // angle in radians
  lifetime: number
  startTick: number
  resourcesScattered: number
  creaturesDisoriented: number
}

const CHECK_INTERVAL = 1000
const SPAWN_CHANCE = 0.005
const MAX_DEVILS = 8
const MOVE_SPEED = 0.3
const DIRECTION_DRIFT = 0.15

const INTENSITIES: DevilIntensity[] = ['minor', 'moderate', 'strong', 'violent']

const RADIUS_MAP: Record<DevilIntensity, number> = {
  minor: 2,
  moderate: 3,
  strong: 5,
  violent: 7,
}

const ARID_TILES = new Set([TileType.SAND])

export class WorldDustDevilSystem {
  private devils: DustDevil[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn in arid regions
    if (this.devils.length < MAX_DEVILS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile != null && ARID_TILES.has(tile)) {
        const intensity = INTENSITIES[Math.floor(Math.random() * INTENSITIES.length)]
        this.devils.push({
          id: this.nextId++,
          x, y,
          intensity,
          radius: RADIUS_MAP[intensity],
          speed: MOVE_SPEED * (1 + Math.random()),
          direction: Math.random() * Math.PI * 2,
          lifetime: 2000 + Math.random() * 4000,
          startTick: tick,
          resourcesScattered: 0,
          creaturesDisoriented: 0,
        })
      }
    }

    // Update devils
    for (let i = this.devils.length - 1; i >= 0; i--) {
      const d = this.devils[i]
      const elapsed = tick - d.startTick

      // Move
      d.direction += (Math.random() - 0.5) * DIRECTION_DRIFT
      d.x = Math.max(0, Math.min(w - 1, d.x + Math.cos(d.direction) * d.speed))
      d.y = Math.max(0, Math.min(h - 1, d.y + Math.sin(d.direction) * d.speed))

      // Check terrain - dissipate on non-arid
      const tile = world.getTile(Math.floor(d.x), Math.floor(d.y))
      if (tile == null || !ARID_TILES.has(tile)) {
        d.lifetime *= 0.5
      }

      // Disorient nearby creatures
      const creatures = em.getEntitiesWithComponents('creature', 'position')
      for (const eid of creatures) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        const dx = pos.x - d.x
        const dy = pos.y - d.y
        if (dx * dx + dy * dy < d.radius * d.radius) {
          d.creaturesDisoriented++
        }
      }

      // Expire
      if (elapsed > d.lifetime) {
        this.devils.splice(i, 1)
      }
    }
  }

}
