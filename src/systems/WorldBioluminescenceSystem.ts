// World Bioluminescence System (v3.35) - Glowing organisms in water and caves
// Bioluminescent zones provide light and attract creatures

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'

export type BioLightColor = 'blue' | 'green' | 'purple' | 'cyan' | 'amber'

export interface BioLightZone {
  id: number
  x: number
  y: number
  radius: number
  color: BioLightColor
  brightness: number  // 0-100
  pulse: number       // current pulse phase
  startTick: number
  duration: number
}

const CHECK_INTERVAL = 1000
const SPAWN_CHANCE = 0.005
const MAX_ZONES = 10
const HEAL_RADIUS = 6
const HEAL_AMOUNT = 0.08

const COLORS: BioLightColor[] = ['blue', 'green', 'purple', 'cyan', 'amber']

export class WorldBioluminescenceSystem {
  private zones: BioLightZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: any, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.trySpawnZone(world, tick)
      this.expireZones(tick)
    }

    this.updatePulse(tick)
    if (this.zones.length > 0) {
      this.attractCreatures(em)
    }
  }

  private trySpawnZone(world: any, tick: number): void {
    if (this.zones.length >= MAX_ZONES) return
    if (Math.random() > SPAWN_CHANCE) return

    const width = world.width || 200
    const height = world.height || 200
    const x = Math.floor(Math.random() * width)
    const y = Math.floor(Math.random() * height)

    // Prefer water tiles for bioluminescence
    const tile = world.getTile?.(x, y)
    const isWater = tile === 0 || tile === 1
    if (!isWater && Math.random() > 0.3) return

    this.zones.push({
      id: this.nextId++,
      x, y,
      radius: 4 + Math.floor(Math.random() * 6),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      brightness: 40 + Math.random() * 60,
      pulse: 0,
      startTick: tick,
      duration: 3000 + Math.floor(Math.random() * 4000),
    })
  }

  private updatePulse(tick: number): void {
    for (const z of this.zones) {
      z.pulse = Math.sin(tick * 0.01 + z.id) * 0.5 + 0.5
      z.brightness = 40 + z.pulse * 40
    }
  }

  private expireZones(tick: number): void {
    this.zones = this.zones.filter(z => tick - z.startTick < z.duration)
  }

  private attractCreatures(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position', 'needs')
    for (const eid of entities) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      const needs = em.getComponent<NeedsComponent>(eid, 'needs')
      if (!pos || !needs) continue

      for (const z of this.zones) {
        const dx = pos.x - z.x
        const dy = pos.y - z.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < HEAL_RADIUS + z.radius) {
          // Gentle healing from bioluminescent glow
          needs.health = Math.min(100, needs.health + HEAL_AMOUNT * (z.brightness * 0.01))
        }
      }
    }
  }

  getZones(): BioLightZone[] { return this.zones }
  getZoneAt(x: number, y: number): BioLightZone | undefined {
    return this.zones.find(z => {
      const dx = x - z.x
      const dy = y - z.y
      return Math.sqrt(dx * dx + dy * dy) < z.radius
    })
  }
}
