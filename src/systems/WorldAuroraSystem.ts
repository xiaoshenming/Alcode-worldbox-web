// World Aurora System (v3.15) - Auroras appear in the sky under certain conditions
// Auroras bring inspiration, fear, calm, or energy to creatures

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AuroraColor = 'green' | 'blue' | 'purple' | 'red' | 'pink'
export type AuroraEffect = 'inspiration' | 'fear' | 'calm' | 'energy'

export interface Aurora {
  id: number
  intensity: number   // 0-100
  color: AuroraColor
  startTick: number
  duration: number
  effect: AuroraEffect
}

const CHECK_INTERVAL = 1000
const AURORA_CHANCE = 0.008
const MAX_AURORAS = 5

const COLOR_EFFECTS: Record<AuroraColor, AuroraEffect> = {
  green: 'calm',
  blue: 'inspiration',
  purple: 'energy',
  red: 'fear',
  pink: 'calm',
}
const COLORS = Object.keys(COLOR_EFFECTS) as AuroraColor[]

export class WorldAuroraSystem {
  private auroras: Aurora[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.spawnAuroras(tick)
    this.evolveAuroras(tick)
    this.cleanup(tick)
  }

  private spawnAuroras(tick: number): void {
    if (this.auroras.length >= MAX_AURORAS) return
    if (Math.random() > AURORA_CHANCE) return

    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    this.auroras.push({
      id: this.nextId++,
      intensity: 30 + Math.random() * 70,
      color,
      startTick: tick,
      duration: 2000 + Math.floor(Math.random() * 4000),
      effect: COLOR_EFFECTS[color],
    })
  }

  private evolveAuroras(tick: number): void {
    for (const a of this.auroras) {
      const elapsed = tick - a.startTick
      const halfLife = a.duration * 0.5
      // Intensity peaks at midpoint then fades
      if (elapsed < halfLife) {
        a.intensity = Math.min(100, a.intensity + Math.random() * 2)
      } else {
        a.intensity = Math.max(0, a.intensity - Math.random() * 3)
      }
    }
  }

  private cleanup(tick: number): void {
    this.auroras = this.auroras.filter(a =>
      tick - a.startTick < a.duration && a.intensity > 0
    )
  }

  getAuroras(): Aurora[] { return this.auroras }
  getActiveAuroras(): Aurora[] {
    return this.auroras.filter(a => a.intensity > 10)
  }
}
