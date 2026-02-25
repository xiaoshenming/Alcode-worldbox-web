// World Bioluminescent Bay System (v3.202) - Coastal bays glow with bioluminescent organisms
// These rare phenomena attract tourism, inspire culture, and indicate ecosystem health

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface BioluminescentBay {
  id: number
  x: number
  y: number
  intensity: number
  organismDensity: number
  waterClarity: number
  culturalValue: number
  seasonalPeak: boolean
  tick: number
}

const CHECK_INTERVAL = 2200
const SPAWN_CHANCE = 0.002
const MAX_BAYS = 10

export class WorldBioluminescentBaySystem {
  private bays: BioluminescentBay[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.bays.length < MAX_BAYS && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Form in shallow coastal water
      if (tile !== null && tile >= 0 && tile <= 1) {
        this.bays.push({
          id: this.nextId++,
          x, y,
          intensity: 10 + Math.random() * 40,
          organismDensity: 20 + Math.random() * 50,
          waterClarity: 40 + Math.random() * 40,
          culturalValue: 5 + Math.random() * 20,
          seasonalPeak: Math.random() < 0.3,
          tick,
        })
      }
    }

    for (const b of this.bays) {
      b.seasonalPeak = (tick % 20000) < 5000
      const peakMult = b.seasonalPeak ? 1.5 : 1.0
      b.intensity = Math.min(100, b.organismDensity * 0.6 * peakMult * (b.waterClarity / 100))
      b.organismDensity = Math.max(5, Math.min(100, b.organismDensity + (Math.random() - 0.48) * 2))
      b.waterClarity = Math.max(10, Math.min(100, b.waterClarity + (Math.random() - 0.5) * 1.5))
      b.culturalValue = Math.min(100, b.culturalValue + b.intensity * 0.005)
    }

    for (let i = this.bays.length - 1; i >= 0; i--) {
      if (this.bays[i].organismDensity <= 5) {
        this.bays.splice(i, 1)
      }
    }
  }

  getBays(): readonly BioluminescentBay[] { return this.bays }
}
