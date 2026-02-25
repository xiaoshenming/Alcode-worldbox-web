// World Sinkhole Prevention System (v3.144) - Detecting and mitigating sinkhole risks
// Monitors ground stability and prevents sinkholes from forming near buildings

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface SinkholeRisk {
  id: number
  x: number
  y: number
  riskLevel: number
  groundStability: number
  monitoringSince: number
  mitigated: boolean
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 4000
const SPAWN_CHANCE = 0.003
const MAX_RISKS = 12

export class WorldSinkholePrevSystem {
  private risks: SinkholeRisk[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Detect new sinkhole risk zones
    if (this.risks.length < MAX_RISKS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      // Risk zones form on land tiles (not water)
      if (tile != null && tile > 2) {
        this.risks.push({
          id: this.nextId++,
          x, y,
          riskLevel: 20 + Math.floor(Math.random() * 40),
          groundStability: 50 + Math.floor(Math.random() * 30),
          monitoringSince: tick,
          mitigated: false,
          active: true,
          tick,
        })
      }
    }

    // Update risk levels based on geological activity
    for (const r of this.risks) {
      if (!r.active) continue

      // Ground stability degrades slowly
      if (!r.mitigated) {
        r.groundStability = Math.max(0, r.groundStability - 0.3)
        r.riskLevel = Math.min(100, r.riskLevel + (100 - r.groundStability) * 0.005)
      }

      // Mitigation efforts reduce risk
      if (!r.mitigated && Math.random() < 0.01) {
        r.mitigated = true
        r.riskLevel = Math.max(0, r.riskLevel - 30)
        r.groundStability = Math.min(100, r.groundStability + 40)
      }

      // Fully stabilized zones become inactive
      if (r.mitigated && r.riskLevel < 5) {
        r.active = false
      }
    }

    // Clean up inactive risks
    for (let i = this.risks.length - 1; i >= 0; i--) {
      if (!this.risks[i].active) this.risks.splice(i, 1)
    }
  }

  getRisks(): readonly SinkholeRisk[] { return this.risks }
}
