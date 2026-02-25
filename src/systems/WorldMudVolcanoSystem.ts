// World Mud Volcano System (v3.179) - Mud volcanoes erupt and reshape surrounding terrain
// Pressure builds underground until eruption, spreading mud and emitting gas

import { EntityManager } from '../ecs/Entity'

export interface MudVolcano {
  id: number
  x: number
  y: number
  pressure: number
  eruptionCount: number
  mudDepth: number
  gasEmission: number
  dormant: boolean
  tick: number
}

const CHECK_INTERVAL = 3400
const SPAWN_CHANCE = 0.003
const MAX_VOLCANOES = 8
const ERUPTION_THRESHOLD = 80

export class WorldMudVolcanoSystem {
  private volcanoes: MudVolcano[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: any, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn new mud volcanoes on land
    if (this.volcanoes.length < MAX_VOLCANOES && Math.random() < SPAWN_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile?.(x, y)
      if (tile !== 0 && tile !== 1 && tile !== 'deep_water' && tile !== 'shallow_water') {
        this.volcanoes.push({
          id: this.nextId++, x, y,
          pressure: 10 + Math.random() * 30,
          eruptionCount: 0,
          mudDepth: 0.1 + Math.random() * 0.3,
          gasEmission: 0.5 + Math.random() * 1.5,
          dormant: false, tick,
        })
      }
    }

    for (const v of this.volcanoes) {
      if (v.dormant) {
        // Dormant volcanoes slowly recharge
        if (Math.random() < 0.008) {
          v.pressure += 2 + Math.random() * 3
          if (v.pressure > 40) v.dormant = false
        }
        continue
      }

      // Build pressure over time
      v.pressure += 0.5 + Math.random() * 1.5
      v.gasEmission = Math.min(10, v.gasEmission + 0.05)

      // Eruption when pressure exceeds threshold
      if (v.pressure >= ERUPTION_THRESHOLD && Math.random() < 0.06) {
        v.eruptionCount++
        v.mudDepth = Math.min(5, v.mudDepth + 0.3 + Math.random() * 0.5)
        v.pressure = 5 + Math.random() * 10
        v.gasEmission *= 1.5

        // Chance to go dormant after eruption
        if (v.eruptionCount > 3 && Math.random() < 0.15) {
          v.dormant = true
          v.gasEmission *= 0.2
        }
      }

      // Gas slowly dissipates
      v.gasEmission = Math.max(0.1, v.gasEmission * 0.995)
    }

    // Remove volcanoes that have been dormant too long
    for (let i = this.volcanoes.length - 1; i >= 0; i--) {
      if (this.volcanoes[i].dormant && this.volcanoes[i].eruptionCount > 6 && Math.random() < 0.005) {
        this.volcanoes.splice(i, 1)
      }
    }
  }

  getVolcanoes(): readonly MudVolcano[] { return this.volcanoes }
}
