// World Maelstrom System (v2.77) - Oceanic maelstroms form in deep water, pulling creatures and ships
// Maelstroms grow and shrink cyclically, creating dangerous navigation hazards

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager, PositionComponent } from '../ecs/Entity'

export interface Maelstrom {
  id: number
  x: number
  y: number
  radius: number
  maxRadius: number
  strength: number    // 0-100, pull force
  phase: number       // 0-1, growth cycle
  growthRate: number
  age: number
  active: boolean
}

const CHECK_INTERVAL = 600
const MAX_MAELSTROMS = 6
const FORM_CHANCE = 0.02
const PULL_RANGE_MULT = 2.5
const DAMAGE_PER_TICK = 3
const MAX_AGE = 8000
const MIN_DEEP_WATER = 12

export class WorldMaelstromSystem {
  private maelstroms: Maelstrom[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formMaelstroms(world, tick)
    this.updateMaelstroms()
    this.pullEntities(em)
    this.cleanupExpired()
  }

  private formMaelstroms(world: World, _tick: number): void {
    if (this.maelstroms.length >= MAX_MAELSTROMS) return
    if (Math.random() > FORM_CHANCE) return

    // Find deep water cluster
    const w = world.width
    const h = world.height
    const attempts = 15

    for (let a = 0; a < attempts; a++) {
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))

      if (world.getTile(x, y) !== TileType.DEEP_WATER) continue

      // Count surrounding deep water
      let deepCount = 0
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          if (world.getTile(x + dx, y + dy) === TileType.DEEP_WATER) deepCount++
        }
      }

      if (deepCount < MIN_DEEP_WATER) continue

      // Check distance from existing maelstroms
      const tooClose = this.maelstroms.some(m => {
        const ddx = m.x - x
        const ddy = m.y - y
        return ddx * ddx + ddy * ddy < 400
      })
      if (tooClose) continue

      this.maelstroms.push({
        id: this.nextId++,
        x, y,
        radius: 2,
        maxRadius: 3 + Math.floor(Math.random() * 3),
        strength: 30 + Math.random() * 50,
        phase: 0,
        growthRate: 0.02 + Math.random() * 0.03,
        age: 0,
        active: true,
      })
      break
    }
  }

  private updateMaelstroms(): void {
    for (const m of this.maelstroms) {
      m.age++
      m.phase = (m.phase + m.growthRate) % 1
      m.radius = 2 + Math.sin(m.phase * Math.PI * 2) * m.maxRadius

      // Strength fluctuates
      m.strength = Math.max(10, m.strength + (Math.random() - 0.5) * 5)

      if (m.age > MAX_AGE) {
        m.active = false
      }
    }
  }

  private pullEntities(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position')

    for (const m of this.maelstroms) {
      if (!m.active) continue
      const pullRange = m.radius * PULL_RANGE_MULT

      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue

        const dx = m.x - pos.x
        const dy = m.y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > pullRange || dist < 0.5) continue

        // Pull toward center
        const pullForce = (m.strength / 100) * (1 - dist / pullRange) * 0.3
        pos.x += dx / dist * pullForce
        pos.y += dy / dist * pullForce
      }
    }
  }

  private cleanupExpired(): void {
    for (let i = this.maelstroms.length - 1; i >= 0; i--) {
      if (!this.maelstroms[i].active) {
        this.maelstroms.splice(i, 1)
      }
    }
  }

  getMaelstroms(): Maelstrom[] { return this.maelstroms }
  getActiveMaelstroms(): Maelstrom[] { return this.maelstroms.filter(m => m.active) }
}
