// World Radium Spring System (v3.534) - Radioactive spring formations
// Natural springs with trace radioactive mineral content

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface RadiumSpring {
  id: number
  x: number
  y: number
  radioactivity: number
  mineralContent: number
  warmth: number
  glowIntensity: number
  tick: number
}

const CHECK_INTERVAL = 3080
const FORM_CHANCE = 0.0010
const MAX_SPRINGS = 10

export class WorldRadiumSpringSystem {
  private springs: RadiumSpring[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.springs.length < MAX_SPRINGS && Math.random() < FORM_CHANCE) {
      this.springs.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * world.width),
        y: Math.floor(Math.random() * world.height),
        radioactivity: 5 + Math.random() * 25,
        mineralContent: 10 + Math.random() * 30,
        warmth: 15 + Math.random() * 35,
        glowIntensity: 3 + Math.random() * 15,
        tick,
      })
    }

    for (const s of this.springs) {
      s.radioactivity = Math.max(2, Math.min(50, s.radioactivity + (Math.random() - 0.48) * 0.15))
      s.warmth = Math.max(5, Math.min(60, s.warmth + (Math.random() - 0.5) * 0.12))
      s.glowIntensity = Math.max(1, Math.min(30, s.glowIntensity + (Math.random() - 0.47) * 0.08))
    }

    const cutoff = tick - 82000
    for (let i = this.springs.length - 1; i >= 0; i--) {
      if (this.springs[i].tick < cutoff) this.springs.splice(i, 1)
    }
  }

  getSprings(): RadiumSpring[] { return this.springs }
}
