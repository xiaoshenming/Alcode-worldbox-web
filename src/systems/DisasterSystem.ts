// Natural disaster auto-events system
// Volcanic eruptions, floods, wildfires that spread organically over time

import { World } from '../game/World'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'
import { EntityManager, PositionComponent } from '../ecs/Entity'

// Pre-allocated offsets for hasAdjacentTile — avoids creating 4 sub-arrays per call
const CARDINAL_OFFSETS: readonly [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const

interface ActiveDisaster {
  type: 'volcano' | 'flood' | 'wildfire'
  x: number
  y: number
  radius: number
  maxRadius: number
  ticksLeft: number
  spreadRate: number
}

export class DisasterSystem {
  private world: World
  private particles: ParticleSystem
  private em: EntityManager
  private disasters: ActiveDisaster[] = []
  private tickCounter: number = 0

  constructor(world: World, particles: ParticleSystem, em: EntityManager) {
    this.world = world
    this.particles = particles
    this.em = em
  }

  update(): void {
    this.tickCounter++

    // Random disaster spawning (very rare)
    if (this.tickCounter % 60 === 0) {
      this.trySpawnDisaster()
    }

    // Update active disasters
    for (let i = this.disasters.length - 1; i >= 0; i--) {
      const d = this.disasters[i]
      d.ticksLeft--

      if (d.ticksLeft <= 0) {
        this.disasters.splice(i, 1)
        continue
      }

      // Spread at intervals
      if (this.tickCounter % d.spreadRate === 0) {
        switch (d.type) {
          case 'volcano': this.spreadVolcano(d); break
          case 'flood': this.spreadFlood(d); break
          case 'wildfire': this.spreadWildfire(d); break
        }
      }
    }
  }

  private trySpawnDisaster(): void {
    // Max 2 concurrent disasters
    if (this.disasters.length >= 2) return

    // ~0.1% chance per check (every 60 ticks)
    if (Math.random() > 0.001) return

    const roll = Math.random()
    if (roll < 0.35) {
      this.spawnVolcano()
    } else if (roll < 0.7) {
      this.spawnFlood()
    } else {
      this.spawnWildfire()
    }
  }

  private spawnVolcano(): void {
    // Find a mountain tile
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = Math.floor(Math.random() * WORLD_WIDTH)
      const y = Math.floor(Math.random() * WORLD_HEIGHT)
      if (this.world.getTile(x, y) === TileType.MOUNTAIN) {
        this.disasters.push({
          type: 'volcano', x, y,
          radius: 1, maxRadius: 6,
          ticksLeft: 600, spreadRate: 15
        })
        this.world.setTile(x, y, TileType.LAVA)
        this.particles.spawnExplosion(x, y)
        EventLog.log('disaster', `Volcanic eruption at (${x}, ${y})!`, this.world.tick)
        return
      }
    }
  }

  private spawnFlood(): void {
    // Find a water-adjacent tile
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = Math.floor(Math.random() * WORLD_WIDTH)
      const y = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = this.world.getTile(x, y)
      if (tile === TileType.SHALLOW_WATER || tile === TileType.SAND) {
        const hasWater = this.hasAdjacentTile(x, y, TileType.DEEP_WATER) || this.hasAdjacentTile(x, y, TileType.SHALLOW_WATER)
        if (hasWater) {
          this.disasters.push({
            type: 'flood', x, y,
            radius: 1, maxRadius: 8,
            ticksLeft: 500, spreadRate: 20
          })
          this.particles.spawnRain(x, y)
          EventLog.log('disaster', `Flooding near (${x}, ${y})!`, this.world.tick)
          return
        }
      }
    }
  }

  private spawnWildfire(): void {
    // Find a forest tile
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = Math.floor(Math.random() * WORLD_WIDTH)
      const y = Math.floor(Math.random() * WORLD_HEIGHT)
      if (this.world.getTile(x, y) === TileType.FOREST) {
        this.disasters.push({
          type: 'wildfire', x, y,
          radius: 1, maxRadius: 10,
          ticksLeft: 400, spreadRate: 10
        })
        this.world.setTile(x, y, TileType.SAND)
        EventLog.log('disaster', `Wildfire broke out at (${x}, ${y})!`, this.world.tick)
        return
      }
    }
  }

  private spreadVolcano(d: ActiveDisaster): void {
    if (d.radius >= d.maxRadius) return

    // Expand lava ring outward
    const r = d.radius
    for (let angle = 0; angle < 12; angle++) {
      const a = (angle / 12) * Math.PI * 2
      const tx = Math.floor(d.x + Math.cos(a) * r)
      const ty = Math.floor(d.y + Math.sin(a) * r)
      if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue

      const tile = this.world.getTile(tx, ty)
      if (tile === TileType.DEEP_WATER || tile === TileType.LAVA) continue

      if (Math.random() < 0.5) {
        if (r <= d.maxRadius * 0.4) {
          this.world.setTile(tx, ty, TileType.LAVA)
        } else {
          this.world.setTile(tx, ty, TileType.MOUNTAIN)
        }
        this.killAt(tx, ty)
      }
    }

    d.radius += 0.5
    this.particles.spawnExplosion(d.x, d.y)
  }

  private spreadFlood(d: ActiveDisaster): void {
    if (d.radius >= d.maxRadius) return

    // Water spreads to adjacent low-lying tiles
    const r = Math.floor(d.radius)
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue
        const tx = d.x + dx
        const ty = d.y + dy
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue

        const tile = this.world.getTile(tx, ty)
        if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER || tile === TileType.MOUNTAIN) continue

        if (Math.random() < 0.15) {
          if (tile === TileType.SAND || tile === TileType.GRASS) {
            this.world.setTile(tx, ty, TileType.SHALLOW_WATER)
          } else if (tile === TileType.FOREST) {
            this.world.setTile(tx, ty, TileType.GRASS)
          }
          this.killAt(tx, ty)
        }
      }
    }

    d.radius += 0.3
  }

  private spreadWildfire(d: ActiveDisaster): void {
    if (d.radius >= d.maxRadius) return

    // Fire spreads to adjacent forest/grass tiles
    const r = Math.floor(d.radius)
    let spread = false
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue
        const tx = d.x + dx
        const ty = d.y + dy
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue

        const tile = this.world.getTile(tx, ty)
        if (tile === TileType.FOREST && Math.random() < 0.2) {
          this.world.setTile(tx, ty, TileType.SAND)
          this.killAt(tx, ty)
          spread = true
        } else if (tile === TileType.GRASS && Math.random() < 0.08) {
          this.world.setTile(tx, ty, TileType.SAND)
          spread = true
        }
      }
    }

    // Fire dies faster if nothing to burn
    if (!spread) {
      d.ticksLeft -= 20
    }

    d.radius += 0.4
  }

  private killAt(x: number, y: number): void {
    const entities = this.em.getEntitiesWithComponent('position')
    for (const id of entities) {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const dx = pos.x - x
      const dy = pos.y - y
      if (dx * dx + dy * dy < 2 && Math.random() < 0.4) {
        this.em.removeEntity(id)
      }
    }
  }

  private hasAdjacentTile(x: number, y: number, tileType: TileType): boolean {
    for (const [dx, dy] of CARDINAL_OFFSETS) {
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT) {
        if (this.world.getTile(nx, ny) === tileType) return true
      }
    }
    return false
  }

  getActiveDisasters(): ActiveDisaster[] {
    return this.disasters
  }
}
