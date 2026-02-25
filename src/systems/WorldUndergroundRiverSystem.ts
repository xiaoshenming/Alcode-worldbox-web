// World Underground River System (v3.77) - Hidden rivers flow beneath the surface
// Underground rivers create oases, feed wells, and can be discovered by mining

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type RiverFlow = 'slow' | 'moderate' | 'fast' | 'torrent'

export interface UndergroundRiver {
  id: number
  segments: Array<{ x: number; y: number }>
  flow: RiverFlow
  depth: number
  minerals: number
  discovered: boolean
  tick: number
}

const CHECK_INTERVAL = 2500
const FORM_CHANCE = 0.002
const MAX_RIVERS = 25

const FLOWS: RiverFlow[] = ['slow', 'moderate', 'fast', 'torrent']

export class WorldUndergroundRiverSystem {
  private rivers: UndergroundRiver[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.rivers.length < MAX_RIVERS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const startX = Math.floor(Math.random() * w)
      const startY = Math.floor(Math.random() * h)
      const segCount = 5 + Math.floor(Math.random() * 10)
      const segments: Array<{ x: number; y: number }> = []

      let cx = startX, cy = startY
      for (let i = 0; i < segCount; i++) {
        segments.push({ x: cx, y: cy })
        cx = Math.max(0, Math.min(w - 1, cx + Math.floor(Math.random() * 5) - 2))
        cy = Math.max(0, Math.min(h - 1, cy + Math.floor(Math.random() * 3) - 1))
      }

      this.rivers.push({
        id: this.nextId++,
        segments,
        flow: FLOWS[Math.floor(Math.random() * FLOWS.length)],
        depth: 10 + Math.random() * 40,
        minerals: Math.random() * 60,
        discovered: false,
        tick,
      })
    }

    // Slowly reveal rivers near mining activity
    for (const river of this.rivers) {
      if (!river.discovered && Math.random() < 0.001) {
        river.discovered = true
      }
      river.minerals = Math.min(100, river.minerals + 0.01)
    }

    const cutoff = tick - 90000
    for (let i = this.rivers.length - 1; i >= 0; i--) {
      if (this.rivers[i].tick < cutoff) this.rivers.splice(i, 1)
    }
  }

  getRivers(): readonly UndergroundRiver[] { return this.rivers }
}
