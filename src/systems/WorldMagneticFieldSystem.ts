// World Magnetic Field System (v3.142) - Magnetic anomalies affecting navigation
// Anomalous magnetic zones appear across the world, disrupting creature behavior

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MagneticPolarity = 'north' | 'south' | 'chaotic' | 'null'

export interface MagneticAnomaly {
  id: number
  x: number
  y: number
  polarity: MagneticPolarity
  strength: number
  radius: number
  fluctuation: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 3400
const SPAWN_CHANCE = 0.003
const MAX_ANOMALIES = 10

const POLARITIES: MagneticPolarity[] = ['north', 'south', 'chaotic', 'null']
const POLARITY_BASE_STRENGTH: Record<MagneticPolarity, number> = {
  north: 60, south: 60, chaotic: 80, null: 20,
}

export class WorldMagneticFieldSystem {
  private anomalies: MagneticAnomaly[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn new magnetic anomalies
    if (this.anomalies.length < MAX_ANOMALIES && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null) {
        const polarity = POLARITIES[Math.floor(Math.random() * POLARITIES.length)]
        this.anomalies.push({
          id: this.nextId++,
          x, y,
          polarity,
          strength: POLARITY_BASE_STRENGTH[polarity],
          radius: 3 + Math.floor(Math.random() * 6),
          fluctuation: 0.5 + Math.random() * 1.5,
          active: true,
          tick,
        })
      }
    }

    // Fluctuate magnetic strength over time
    for (const a of this.anomalies) {
      if (!a.active) continue
      const wave = Math.sin((tick - a.tick) * 0.001 * a.fluctuation)
      a.strength = POLARITY_BASE_STRENGTH[a.polarity] * (0.6 + 0.4 * wave)

      // Chaotic anomalies may shift polarity
      if (a.polarity === 'chaotic' && Math.random() < 0.005) {
        a.polarity = POLARITIES[Math.floor(Math.random() * POLARITIES.length)]
      }

      // Anomalies decay over long periods
      if (tick - a.tick > 60000 && Math.random() < 0.01) {
        a.active = false
      }
    }

    // Remove inactive anomalies
    for (let i = this.anomalies.length - 1; i >= 0; i--) {
      if (!this.anomalies[i].active) this.anomalies.splice(i, 1)
    }
  }

}
