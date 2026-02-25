// World Mudslide System (v3.42) - Heavy rain triggers mudslides on mountain terrain
// Mudslides reshape terrain, damage buildings, and push creatures downhill

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type MudslideScale = 'minor' | 'moderate' | 'severe' | 'catastrophic'

export interface Mudslide {
  id: number
  startX: number
  startY: number
  dirX: number
  dirY: number
  scale: MudslideScale
  length: number      // how far it travels
  progress: number    // 0-100
  startTick: number
  duration: number
}

const CHECK_INTERVAL = 1400
const MUDSLIDE_CHANCE = 0.004
const MAX_MUDSLIDES = 4

const DAMAGE_MAP: Record<MudslideScale, number> = {
  minor: 0.1,
  moderate: 0.3,
  severe: 0.6,
  catastrophic: 1.0,
}

const LENGTH_MAP: Record<MudslideScale, number> = {
  minor: 6,
  moderate: 12,
  severe: 20,
  catastrophic: 35,
}

const SCALES: MudslideScale[] = ['minor', 'moderate', 'severe', 'catastrophic']

export class WorldMudslideSystem {
  private mudslides: Mudslide[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Trigger new mudslides on mountain tiles
    if (this.mudslides.length < MAX_MUDSLIDES && Math.random() < MUDSLIDE_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SNOW) {
        const scale = SCALES[Math.floor(Math.random() * SCALES.length)]
        const angle = Math.random() * Math.PI * 2
        this.mudslides.push({
          id: this.nextId++,
          startX: x,
          startY: y,
          dirX: Math.cos(angle),
          dirY: Math.sin(angle),
          scale,
          length: LENGTH_MAP[scale],
          progress: 0,
          startTick: tick,
          duration: 300 + Math.random() * 400,
        })
      }
    }

    // Progress active mudslides
    for (const slide of this.mudslides) {
      const elapsed = tick - slide.startTick
      slide.progress = Math.min(100, (elapsed / slide.duration) * 100)

      // Damage creatures in path
      const currentDist = (slide.progress / 100) * slide.length
      const cx = Math.round(slide.startX + slide.dirX * currentDist)
      const cy = Math.round(slide.startY + slide.dirY * currentDist)
      const damage = DAMAGE_MAP[slide.scale]

      const creatures = em.getEntitiesWithComponents('position', 'needs')
      for (const eid of creatures) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        const dx = pos.x - cx
        const dy = pos.y - cy
        if (dx * dx + dy * dy < 9) {
          const needs = em.getComponent<NeedsComponent>(eid, 'needs')
          if (needs) {
            needs.health = Math.max(0, needs.health - damage)
          }
          // Push creature along mudslide direction
          pos.x += slide.dirX * 0.5
          pos.y += slide.dirY * 0.5
        }
      }
    }

    // Remove completed mudslides
    this.mudslides = this.mudslides.filter(s => s.progress < 100)
  }

  getMudslides(): Mudslide[] {
    return this.mudslides
  }
}
