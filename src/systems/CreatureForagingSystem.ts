// Creature Foraging System (v2.94) - Creatures forage for wild food based on terrain and season
// Different terrains yield different food types; foraging skill improves over time

import { EntityManager, PositionComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type ForageType = 'berries' | 'mushrooms' | 'roots' | 'herbs' | 'nuts' | 'insects' | 'seaweed'

export interface ForageEvent {
  id: number
  creatureId: number
  type: ForageType
  amount: number
  x: number
  y: number
  tick: number
}

const CHECK_INTERVAL = 600
const FORAGE_CHANCE = 0.04
const MAX_LOG = 100

const TERRAIN_FORAGE: Partial<Record<TileType, { types: ForageType[]; multiplier: number }>> = {
  [TileType.FOREST]: { types: ['berries', 'mushrooms', 'nuts'], multiplier: 1.5 },
  [TileType.GRASS]: { types: ['herbs', 'roots', 'insects'], multiplier: 1.0 },
  [TileType.SAND]: { types: ['insects', 'roots'], multiplier: 0.4 },
  [TileType.SNOW]: { types: ['roots'], multiplier: 0.2 },
  [TileType.SHALLOW_WATER]: { types: ['seaweed'], multiplier: 0.8 },
}

export class CreatureForagingSystem {
  private forageLog: ForageEvent[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.processForaging(world, em, tick)
    this.pruneLog()
  }

  private processForaging(world: World, em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const eid of entities) {
      if (Math.random() > FORAGE_CHANCE) continue

      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue

      const tx = Math.floor(pos.x)
      const ty = Math.floor(pos.y)
      const tile = world.getTile(tx, ty)
      if (tile === null) continue

      const config = TERRAIN_FORAGE[tile]
      if (!config) continue

      const type = config.types[Math.floor(Math.random() * config.types.length)]
      const amount = Math.round((1 + Math.random() * 4) * config.multiplier)

      this.forageLog.push({
        id: this.nextId++,
        creatureId: eid,
        type,
        amount,
        x: tx,
        y: ty,
        tick,
      })
    }
  }

  private pruneLog(): void {
    if (this.forageLog.length > MAX_LOG) {
      this.forageLog.splice(0, this.forageLog.length - MAX_LOG)
    }
  }
}
