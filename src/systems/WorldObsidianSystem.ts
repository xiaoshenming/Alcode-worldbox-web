// World Obsidian System (v3.122) - Rare obsidian deposits in volcanic regions
// Obsidian is a valuable crafting material for weapons and tools

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ObsidianQuality = 'rough' | 'polished' | 'flawless' | 'legendary'

export interface ObsidianDeposit {
  id: number
  x: number
  y: number
  quality: ObsidianQuality
  reserves: number
  harvestRate: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 4200
const SPAWN_CHANCE = 0.002
const MAX_DEPOSITS = 10

const QUALITIES: ObsidianQuality[] = ['rough', 'polished', 'flawless', 'legendary']
const QUALITY_VALUE: Record<ObsidianQuality, number> = {
  rough: 5, polished: 15, flawless: 30, legendary: 60,
}

export class WorldObsidianSystem {
  private deposits: ObsidianDeposit[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.deposits.length < MAX_DEPOSITS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      // Spawn near lava or mountains
      if (tile != null && (tile === 7 || tile === 5)) {
        const quality = QUALITIES[Math.floor(Math.random() * QUALITIES.length)]
        this.deposits.push({
          id: this.nextId++,
          x, y,
          quality,
          reserves: 50 + Math.floor(Math.random() * 150),
          harvestRate: QUALITY_VALUE[quality] * 0.1,
          age: 0,
          tick,
        })
      }
    }

    for (const d of this.deposits) {
      d.age = tick - d.tick
      // Mining depletes reserves
      if (Math.random() < 0.005) {
        d.reserves = Math.max(0, d.reserves - 1)
      }
    }

    // Remove depleted deposits
    for (let i = this.deposits.length - 1; i >= 0; i--) {
      if (this.deposits[i].reserves <= 0) this.deposits.splice(i, 1)
    }
  }

}
