// World Rainbow System (v3.30) - Rainbows appear after rain
// Visual phenomenon that boosts creature morale in the area

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'

export interface Rainbow {
  id: number
  x: number
  y: number
  span: number        // width in tiles
  brightness: number  // 0-100
  startTick: number
  duration: number
}

const CHECK_INTERVAL = 1000
const RAINBOW_CHANCE = 0.005
const MAX_RAINBOWS = 4
const MORALE_RADIUS = 10
const MORALE_BOOST = 0.15

export class WorldRainbowSystem {
  private rainbows: Rainbow[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: any, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.trySpawnRainbow(world, tick)
      this.expireRainbows(tick)
    }

    if (this.rainbows.length > 0) {
      this.applyMoraleBoost(em)
    }
  }

  private trySpawnRainbow(world: any, tick: number): void {
    if (this.rainbows.length >= MAX_RAINBOWS) return
    if (Math.random() > RAINBOW_CHANCE) return

    const width = world.width || 200
    const height = world.height || 200

    this.rainbows.push({
      id: this.nextId++,
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
      span: 15 + Math.floor(Math.random() * 20),
      brightness: 50 + Math.random() * 50,
      startTick: tick,
      duration: 800 + Math.floor(Math.random() * 600),
    })
  }

  private expireRainbows(tick: number): void {
    this.rainbows = this.rainbows.filter(r => tick - r.startTick < r.duration)
  }

  private applyMoraleBoost(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position', 'needs')

    for (const eid of entities) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      const needs = em.getComponent<NeedsComponent>(eid, 'needs')
      if (!pos || !needs) continue

      for (const rb of this.rainbows) {
        const dx = pos.x - rb.x
        const dy = pos.y - rb.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MORALE_RADIUS + rb.span * 0.5) {
          needs.health = Math.min(100, needs.health + MORALE_BOOST * (rb.brightness * 0.01))
        }
      }
    }
  }

  getRainbows(): Rainbow[] { return this.rainbows }
  isRainbowVisible(): boolean { return this.rainbows.length > 0 }
}
