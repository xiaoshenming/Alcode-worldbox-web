// World Artesian Well System (v3.522) - Artesian well formations
// Natural wells where water rises under pressure from confined aquifers

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface ArtesianWell {
  id: number
  x: number
  y: number
  waterPressure: number
  flowRate: number
  aquiferDepth: number
  waterPurity: number
  tick: number
}

const CHECK_INTERVAL = 3040
const FORM_CHANCE = 0.0012
const MAX_WELLS = 12

export class WorldArtesianWellSystem {
  private wells: ArtesianWell[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.wells.length < MAX_WELLS && Math.random() < FORM_CHANCE) {
      this.wells.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * world.width),
        y: Math.floor(Math.random() * world.height),
        waterPressure: 20 + Math.random() * 45,
        flowRate: 5 + Math.random() * 25,
        aquiferDepth: 10 + Math.random() * 40,
        waterPurity: 30 + Math.random() * 35,
        tick,
      })
    }

    for (const w of this.wells) {
      w.waterPressure = Math.max(10, Math.min(85, w.waterPressure + (Math.random() - 0.48) * 0.2))
      w.flowRate = Math.max(2, Math.min(55, w.flowRate + (Math.random() - 0.5) * 0.15))
      w.waterPurity = Math.max(15, Math.min(90, w.waterPurity + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 86000
    for (let i = this.wells.length - 1; i >= 0; i--) {
      if (this.wells[i].tick < cutoff) this.wells.splice(i, 1)
    }
  }

  getWells(): ArtesianWell[] { return this.wells }
}
