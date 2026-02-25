// World Bioluminescence System (v3.130) - Glowing organisms in water and caves
// Bioluminescent areas create beautiful nighttime displays

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type GlowType = 'algae' | 'jellyfish' | 'fungi' | 'plankton'

export interface BioluminescentZone {
  id: number
  x: number
  y: number
  glowType: GlowType
  brightness: number
  color: string
  spread: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 3200
const SPAWN_CHANCE = 0.003
const MAX_ZONES = 14

const GLOW_TYPES: GlowType[] = ['algae', 'jellyfish', 'fungi', 'plankton']
const GLOW_COLORS: Record<GlowType, string> = {
  algae: '#00ff88', jellyfish: '#8844ff', fungi: '#44ffcc', plankton: '#0088ff',
}
const GLOW_BRIGHTNESS: Record<GlowType, number> = {
  algae: 40, jellyfish: 70, fungi: 55, plankton: 60,
}

export class WorldBioluminescenceSystem {
  private zones: BioluminescentZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.zones.length < MAX_ZONES && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && (tile === 0 || tile === 1 || tile === 4)) {
        const gt = GLOW_TYPES[Math.floor(Math.random() * GLOW_TYPES.length)]
        this.zones.push({
          id: this.nextId++,
          x, y,
          glowType: gt,
          brightness: GLOW_BRIGHTNESS[gt],
          color: GLOW_COLORS[gt],
          spread: 2 + Math.floor(Math.random() * 5),
          active: true,
          tick,
        })
      }
    }

    for (const z of this.zones) {
      z.brightness = GLOW_BRIGHTNESS[z.glowType] *
        (0.6 + 0.4 * Math.sin(tick * 0.0005 + z.id))
      if (Math.random() < 0.001) {
        z.spread = Math.min(12, z.spread + 1)
      }
      const age = tick - z.tick
      if (age > 200000) {
        z.active = false
      }
    }

    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (!this.zones[i].active) this.zones.splice(i, 1)
    }
  }

  getZones(): readonly BioluminescentZone[] { return this.zones }
}
