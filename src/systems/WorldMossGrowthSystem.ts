// World Moss Growth System (v3.101) - Moss spreads across damp surfaces
// Moss grows on rocks and trees near water, slowly spreading to adjacent tiles

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MossStage = 'spore' | 'thin' | 'thick' | 'lush'

export interface MossPatch {
  id: number
  x: number
  y: number
  stage: MossStage
  moisture: number
  spreadChance: number
  tick: number
}

const CHECK_INTERVAL = 2500
const SPAWN_CHANCE = 0.004
const MAX_PATCHES = 60
const SPREAD_RADIUS = 2

const STAGES: MossStage[] = ['spore', 'thin', 'thick', 'lush']

export class WorldMossGrowthSystem {
  private patches: MossPatch[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn near water on rocky/forest tiles
    if (this.patches.length < MAX_PATCHES && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && (tile === 4 || tile === 5)) {
        let nearWater = false
        for (let dx = -2; dx <= 2 && !nearWater; dx++) {
          for (let dy = -2; dy <= 2 && !nearWater; dy++) {
            const t = world.getTile(x + dx, y + dy)
            if (t != null && t <= 1) nearWater = true
          }
        }
        if (nearWater) {
          this.patches.push({
            id: this.nextId++,
            x, y,
            stage: 'spore',
            moisture: 50 + Math.random() * 30,
            spreadChance: 0.02 + Math.random() * 0.03,
            tick,
          })
        }
      }
    }

    // Grow and spread
    const newPatches: MossPatch[] = []
    for (const p of this.patches) {
      p.moisture = Math.min(100, p.moisture + 0.5)
      const idx = STAGES.indexOf(p.stage)
      if (idx < 3 && p.moisture > 60 + idx * 10) {
        p.stage = STAGES[idx + 1]
      }

      // Spread to neighbors
      if (p.stage === 'thick' || p.stage === 'lush') {
        if (this.patches.length + newPatches.length < MAX_PATCHES && Math.random() < p.spreadChance) {
          const nx = p.x + Math.floor(Math.random() * SPREAD_RADIUS * 2) - SPREAD_RADIUS
          const ny = p.y + Math.floor(Math.random() * SPREAD_RADIUS * 2) - SPREAD_RADIUS
          const t = world.getTile(nx, ny)
          if (t != null && t >= 3 && !this.hasPatchAt(nx, ny)) {
            newPatches.push({
              id: this.nextId++,
              x: nx, y: ny,
              stage: 'spore',
              moisture: 40,
              spreadChance: p.spreadChance * 0.9,
              tick,
            })
          }
        }
      }
    }
    for (const np of newPatches) this.patches.push(np)

    // Remove old patches
    const cutoff = tick - 150000
    for (let i = this.patches.length - 1; i >= 0; i--) {
      if (this.patches[i].tick < cutoff) this.patches.splice(i, 1)
    }
  }

  private hasPatchAt(x: number, y: number): boolean {
    for (const p of this.patches) {
      if (p.x === x && p.y === y) return true
    }
    return false
  }

}
