// World Aurora System (v2.60) - Northern/southern lights appear in polar regions
// Auroras are visual spectacles that boost creature mood and inspire art
// Intensity varies with world magnetic activity and season

import { EntityManager } from '../ecs/Entity'

export type AuroraColor = 'green' | 'blue' | 'purple' | 'red' | 'pink' | 'white'

export interface AuroraEvent {
  id: number
  x: number
  y: number
  width: number
  color: AuroraColor
  intensity: number    // 0-100
  moodBoost: number    // 0-15
  startedAt: number
  duration: number
}

const CHECK_INTERVAL = 1200
const MAX_AURORAS = 15
const AURORA_CHANCE = 0.12

const COLORS: AuroraColor[] = ['green', 'blue', 'purple', 'red', 'pink', 'white']

const COLOR_MOOD: Record<AuroraColor, [number, number]> = {
  green: [3, 8],
  blue: [4, 10],
  purple: [5, 12],
  red: [2, 6],
  pink: [6, 12],
  white: [8, 15],
}

export class WorldAuroraSystem {
  private auroras: AuroraEvent[] = []
  private nextId = 1
  private lastCheck = 0
  private totalEvents = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.generateAuroras(tick)
      this.expireAuroras(tick)
      this.applyMoodEffects(em)
    }
  }

  private generateAuroras(tick: number): void {
    if (this.auroras.length >= MAX_AURORAS) return
    if (Math.random() > AURORA_CHANCE) return

    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const [minMood, maxMood] = COLOR_MOOD[color]

    // Auroras appear in northern/southern regions (low y or high y)
    const isNorth = Math.random() < 0.5
    const y = isNorth ? Math.floor(Math.random() * 30) : 170 + Math.floor(Math.random() * 30)
    const x = Math.floor(Math.random() * 180) + 10

    this.auroras.push({
      id: this.nextId++,
      x, y,
      width: 15 + Math.floor(Math.random() * 40),
      color,
      intensity: 30 + Math.floor(Math.random() * 70),
      moodBoost: minMood + Math.floor(Math.random() * (maxMood - minMood + 1)),
      startedAt: tick,
      duration: 2000 + Math.floor(Math.random() * 4000),
    })
    this.totalEvents++
  }

  private expireAuroras(tick: number): void {
    const expired: number[] = []
    for (let i = 0; i < this.auroras.length; i++) {
      if (tick - this.auroras[i].startedAt > this.auroras[i].duration) {
        expired.push(i)
      }
    }
    for (let i = expired.length - 1; i >= 0; i--) {
      this.auroras.splice(expired[i], 1)
    }
  }

  private applyMoodEffects(em: EntityManager): void {
    if (this.auroras.length === 0) return
    const creatures = em.getEntitiesWithComponents('creature', 'position')
    for (const id of creatures) {
      const pos = em.getComponent<any>(id, 'position')
      if (!pos) continue
      for (const aurora of this.auroras) {
        const dx = Math.abs(pos.x - aurora.x)
        const dy = Math.abs(pos.y - aurora.y)
        if (dx < aurora.width && dy < 15) {
          const creature = em.getComponent<any>(id, 'creature')
          if (creature && creature.mood != null) {
            creature.mood = Math.min(100, creature.mood + aurora.moodBoost * 0.03)
          }
          break
        }
      }
    }
  }

  getAuroras(): AuroraEvent[] { return this.auroras }
  getActiveAuroras(): AuroraEvent[] { return this.auroras }
  getTotalEvents(): number { return this.totalEvents }
}
