// World Permafrost System (v3.37) - Permanently frozen ground in cold regions
// Permafrost zones slow movement and preserve ancient remains

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'

export interface PermafrostZone {
  id: number
  x: number
  y: number
  radius: number
  depth: number       // 0-100 frozen depth
  thawRate: number    // how fast it melts (0 = permanent)
  startTick: number
}

const CHECK_INTERVAL = 1200
const SPAWN_CHANCE = 0.004
const MAX_ZONES = 12
const COLD_DAMAGE = 0.08

export class WorldPermafrostSystem {
  private zones: PermafrostZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: any, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.trySpawnZone(world, tick)
      this.thawZones()
    }

    if (this.zones.length > 0) {
      this.applyEffects(em)
    }
  }

  private trySpawnZone(world: any, tick: number): void {
    if (this.zones.length >= MAX_ZONES) return
    if (Math.random() > SPAWN_CHANCE) return

    const width = world.width || 200
    const height = world.height || 200
    const x = Math.floor(Math.random() * width)
    const y = Math.floor(Math.random() * height)

    // Prefer snow tiles (7)
    const tile = world.getTile?.(x, y)
    if (tile !== 7 && Math.random() > 0.2) return

    this.zones.push({
      id: this.nextId++,
      x, y,
      radius: 5 + Math.floor(Math.random() * 8),
      depth: 50 + Math.random() * 50,
      thawRate: Math.random() * 0.05,
      startTick: tick,
    })
  }

  private thawZones(): void {
    for (const z of this.zones) {
      z.depth -= z.thawRate
    }
    for (let _i = this.zones.length - 1; _i >= 0; _i--) { if (this.zones[_i].depth <= 0) this.zones.splice(_i, 1) }
  }

  private applyEffects(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position', 'needs')
    for (const eid of entities) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      const needs = em.getComponent<NeedsComponent>(eid, 'needs')
      if (!pos || !needs) continue

      for (const z of this.zones) {
        const dx = pos.x - z.x
        const dy = pos.y - z.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < z.radius) {
          // Cold damage from permafrost
          if (needs.health > 10) {
            needs.health -= COLD_DAMAGE * (z.depth * 0.01)
          }
        }
      }
    }
  }

  getZones(): PermafrostZone[] { return this.zones }
  isPermafrost(x: number, y: number): boolean {
    return this.zones.some(z => {
      const dx = x - z.x
      const dy = y - z.y
      return Math.sqrt(dx * dx + dy * dy) < z.radius
    })
  }
}
