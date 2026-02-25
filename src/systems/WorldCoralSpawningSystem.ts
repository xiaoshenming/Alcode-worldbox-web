// World Coral Spawning System (v3.149) - Periodic coral spawning events in water
// Coral colonies release spawn that disperses and settles to form new colonies

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CoralSeason = 'dormant' | 'preparing' | 'spawning' | 'dispersing'

export interface CoralSpawn {
  id: number
  x: number
  y: number
  density: number
  fertility: number
  season: CoralSeason
  dispersal: number
  tick: number
}

const CHECK_INTERVAL = 4200
const SPAWN_CHANCE = 0.003
const MAX_SPAWNS = 12

const SEASON_ORDER: CoralSeason[] = ['dormant', 'preparing', 'spawning', 'dispersing']
const SEASON_DURATION: Record<CoralSeason, number> = {
  dormant: 60000, preparing: 30000, spawning: 15000, dispersing: 40000,
}

export class WorldCoralSpawningSystem {
  private spawns: CoralSpawn[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Create new coral spawn sites in water
    if (this.spawns.length < MAX_SPAWNS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      // Shallow water (1) preferred for coral
      if (tile != null && (tile === 1 || tile === 0)) {
        this.spawns.push({
          id: this.nextId++,
          x, y,
          density: 5 + Math.floor(Math.random() * 20),
          fertility: 30 + Math.floor(Math.random() * 50),
          season: 'dormant',
          dispersal: 0,
          tick,
        })
      }
    }

    // Advance coral lifecycle
    for (const s of this.spawns) {
      const age = tick - s.tick
      const idx = SEASON_ORDER.indexOf(s.season)
      let elapsed = 0
      for (let i = 0; i <= idx; i++) elapsed += SEASON_DURATION[SEASON_ORDER[i]]

      // Transition to next season
      if (age > elapsed && idx < SEASON_ORDER.length - 1) {
        s.season = SEASON_ORDER[idx + 1]
      }

      // Season-specific behavior
      if (s.season === 'preparing') {
        s.density = Math.min(100, s.density + 0.3)
      } else if (s.season === 'spawning') {
        s.fertility = Math.min(100, s.fertility + 0.5)
        s.dispersal += 0.2
      } else if (s.season === 'dispersing') {
        s.dispersal = Math.min(50, s.dispersal + 0.4)
        s.density = Math.max(1, s.density - 0.1)
        s.fertility = Math.max(0, s.fertility - 0.2)
      }
    }

    // Remove fully dispersed spawns
    for (let i = this.spawns.length - 1; i >= 0; i--) {
      const s = this.spawns[i]
      const age = tick - s.tick
      const totalCycle = SEASON_DURATION.dormant + SEASON_DURATION.preparing
        + SEASON_DURATION.spawning + SEASON_DURATION.dispersing
      if (s.season === 'dispersing' && age > totalCycle) {
        this.spawns.splice(i, 1)
      }
    }
  }

  getSpawns(): readonly CoralSpawn[] { return this.spawns }
}
