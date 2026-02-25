// World Meteor Shower System (v3.04) - Periodic meteor showers light up the sky
// Meteors can deposit rare minerals, start fires, or damage structures

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager, PositionComponent } from '../ecs/Entity'

export interface MeteorShower {
  id: number
  centerX: number
  centerY: number
  radius: number
  intensity: number    // 0-100
  meteorsPerTick: number
  duration: number
  maxDuration: number
  totalImpacts: number
  active: boolean
}

const CHECK_INTERVAL = 700
const MAX_SHOWERS = 2
const FORM_CHANCE = 0.008
const IMPACT_DAMAGE_RADIUS = 2

export class WorldMeteorShowerSystem {
  private showers: MeteorShower[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formShowers(world)
    this.processImpacts(world, em)
    this.evolve()
    this.cleanup()
  }

  private formShowers(world: World): void {
    if (this.showers.length >= MAX_SHOWERS) return
    if (Math.random() > FORM_CHANCE) return

    this.showers.push({
      id: this.nextId++,
      centerX: Math.floor(Math.random() * world.width),
      centerY: Math.floor(Math.random() * world.height),
      radius: 10 + Math.floor(Math.random() * 20),
      intensity: 30 + Math.random() * 70,
      meteorsPerTick: 1 + Math.floor(Math.random() * 3),
      duration: 0,
      maxDuration: 1500 + Math.floor(Math.random() * 2500),
      totalImpacts: 0,
      active: true,
    })
  }

  private processImpacts(world: World, em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position')

    for (const shower of this.showers) {
      if (!shower.active) continue

      for (let i = 0; i < shower.meteorsPerTick; i++) {
        if (Math.random() > shower.intensity / 100) continue

        const angle = Math.random() * Math.PI * 2
        const dist = Math.random() * shower.radius
        const ix = Math.floor(shower.centerX + Math.cos(angle) * dist)
        const iy = Math.floor(shower.centerY + Math.sin(angle) * dist)

        if (ix < 0 || ix >= world.width || iy < 0 || iy >= world.height) continue

        shower.totalImpacts++
        this.pushNearbyCreatures(entities, em, ix, iy)
      }
    }
  }

  private pushNearbyCreatures(
    entities: number[], em: EntityManager,
    ix: number, iy: number
  ): void {
    for (const eid of entities) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue

      const dx = pos.x - ix
      const dy = pos.y - iy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > IMPACT_DAMAGE_RADIUS || dist < 0.1) continue

      const force = 0.6 * (1 - dist / IMPACT_DAMAGE_RADIUS)
      pos.x += (dx / dist) * force
      pos.y += (dy / dist) * force
    }
  }

  private evolve(): void {
    for (const s of this.showers) {
      s.duration++
      s.intensity += (Math.random() - 0.5) * 8
      s.intensity = Math.max(10, Math.min(100, s.intensity))

      if (s.duration >= s.maxDuration) {
        s.active = false
      }
    }
  }

  private cleanup(): void {
    for (let i = this.showers.length - 1; i >= 0; i--) {
      if (!this.showers[i].active) {
        this.showers.splice(i, 1)
      }
    }
  }

  getShowers(): MeteorShower[] { return this.showers }
  getActiveShowers(): MeteorShower[] { return this.showers.filter(s => s.active) }
}
