// World Sandstorm System (v2.87) - Sandstorms form in desert regions
// Storms reduce visibility, damage structures, and push creatures away

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager, PositionComponent } from '../ecs/Entity'

export interface Sandstorm {
  id: number
  x: number
  y: number
  radius: number
  direction: number    // radians
  speed: number
  intensity: number    // 0-100
  duration: number
  maxDuration: number
  active: boolean
}

const CHECK_INTERVAL = 500
const MAX_STORMS = 4
const FORM_CHANCE = 0.018
const PUSH_FORCE = 0.5
const MIN_SAND_TILES = 8

export class WorldSandstormSystem {
  private storms: Sandstorm[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formStorms(world)
    this.moveStorms(world)
    this.pushCreatures(em)
    this.cleanup()
  }

  private formStorms(world: World): void {
    if (this.storms.length >= MAX_STORMS) return
    if (Math.random() > FORM_CHANCE) return

    const w = world.width
    const h = world.height

    for (let a = 0; a < 15; a++) {
      const x = 5 + Math.floor(Math.random() * (w - 10))
      const y = 5 + Math.floor(Math.random() * (h - 10))

      if (world.getTile(x, y) !== TileType.SAND) continue

      let sandCount = 0
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          if (world.getTile(x + dx, y + dy) === TileType.SAND) sandCount++
        }
      }
      if (sandCount < MIN_SAND_TILES) continue

      this.storms.push({
        id: this.nextId++,
        x, y,
        radius: 4 + Math.floor(Math.random() * 4),
        direction: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
        intensity: 40 + Math.random() * 60,
        duration: 0,
        maxDuration: 3000 + Math.floor(Math.random() * 4000),
        active: true,
      })
      break
    }
  }

  private moveStorms(world: World): void {
    for (const storm of this.storms) {
      storm.duration++

      // Drift direction slightly
      storm.direction += (Math.random() - 0.5) * 0.2
      storm.x += Math.cos(storm.direction) * storm.speed
      storm.y += Math.sin(storm.direction) * storm.speed

      // Clamp to world bounds
      storm.x = Math.max(2, Math.min(world.width - 2, storm.x))
      storm.y = Math.max(2, Math.min(world.height - 2, storm.y))

      // Intensity fluctuates
      storm.intensity += (Math.random() - 0.5) * 8
      storm.intensity = Math.max(20, Math.min(100, storm.intensity))

      if (storm.duration >= storm.maxDuration) {
        storm.active = false
      }
    }
  }

  private pushCreatures(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position')

    for (const storm of this.storms) {
      if (!storm.active) continue

      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue

        const dx = pos.x - storm.x
        const dy = pos.y - storm.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > storm.radius || dist < 0.5) continue

        // Push away from storm center along wind direction
        const force = PUSH_FORCE * (storm.intensity / 100) * (1 - dist / storm.radius)
        pos.x += Math.cos(storm.direction) * force
        pos.y += Math.sin(storm.direction) * force
      }
    }
  }

  private cleanup(): void {
    for (let i = this.storms.length - 1; i >= 0; i--) {
      if (!this.storms[i].active) {
        this.storms.splice(i, 1)
      }
    }
  }

  getStorms(): Sandstorm[] { return this.storms }
  getActiveStorms(): Sandstorm[] { return this.storms.filter(s => s.active) }
}
