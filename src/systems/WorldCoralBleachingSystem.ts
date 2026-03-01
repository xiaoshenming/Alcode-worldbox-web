// World Coral Bleaching System (v3.138) - High water temperatures cause coral bleaching
// Bleached coral can recover or die depending on conditions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type BleachingStage = 'healthy' | 'stressed' | 'bleaching' | 'dead'

export interface BleachingEvent {
  id: number
  x: number
  y: number
  severity: number
  affectedArea: number
  recoveryRate: number
  stage: BleachingStage
  tick: number
}

const CHECK_INTERVAL = 4000
const SPAWN_CHANCE = 0.002
const MAX_EVENTS = 10

const STAGE_SEVERITY: Record<BleachingStage, number> = {
  healthy: 0, stressed: 30, bleaching: 65, dead: 100,
}

export class WorldCoralBleachingSystem {
  private events: BleachingEvent[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.events.length < MAX_EVENTS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      // Shallow water (1) or deep water (0)
      if (tile != null && (tile === 0 || tile === 1)) {
        this.events.push({
          id: this.nextId++,
          x, y,
          severity: 10 + Math.floor(Math.random() * 20),
          affectedArea: 2 + Math.floor(Math.random() * 4),
          recoveryRate: 0.1 + Math.random() * 0.3,
          stage: 'healthy',
          tick,
        })
      }
    }

    for (const e of this.events) {
      const age = tick - e.tick
      // Bleaching progresses over time
      if (age > 80000 && e.stage === 'healthy') {
        e.stage = 'stressed'
        e.severity = STAGE_SEVERITY['stressed']
      }
      if (age > 160000 && e.stage === 'stressed') {
        e.stage = 'bleaching'
        e.severity = STAGE_SEVERITY['bleaching']
        e.affectedArea = Math.min(15, e.affectedArea + 1)
      }
      // Recovery chance or death
      if (e.stage === 'bleaching') {
        if (Math.random() < e.recoveryRate * 0.005) {
          e.stage = 'stressed'
          e.severity = STAGE_SEVERITY['stressed']
        } else if (age > 280000) {
          e.stage = 'dead'
          e.severity = STAGE_SEVERITY['dead']
        }
      }
    }

    // Remove dead coral after a while
    for (let i = this.events.length - 1; i >= 0; i--) {
      const age = tick - this.events[i].tick
      if (this.events[i].stage === 'dead' && age > 350000) {
        this.events.splice(i, 1)
      }
    }
  }

}
