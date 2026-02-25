// World Natural Wonder System (v2.27) - Natural wonders spawn on the map
// Great waterfalls, crystal caves, ancient trees, geysers, aurora zones
// Wonders provide area buffs to nearby creatures and civs

import { EntityManager, EntityId, PositionComponent, CreatureComponent } from '../ecs/Entity'

export type WonderType = 'waterfall' | 'crystal_cave' | 'ancient_tree' | 'geyser' | 'aurora_zone'

export interface NaturalWonder {
  id: number
  type: WonderType
  x: number
  y: number
  radius: number
  power: number       // buff strength 1-5
  discovered: boolean
  discoveredBy: number | null  // civId
  age: number
}

const SPAWN_INTERVAL = 3000
const BUFF_INTERVAL = 800
const MAX_WONDERS = 8
const WONDER_RADIUS = 12

const WONDER_NAMES: Record<WonderType, string[]> = {
  waterfall: ['Eternal Falls', 'Misty Cascade', 'Thunder Drop'],
  crystal_cave: ['Prism Grotto', 'Gem Hollow', 'Crystal Deep'],
  ancient_tree: ['World Tree', 'Elder Oak', 'Life Root'],
  geyser: ['Steam Spire', 'Hot Spring', 'Earth Breath'],
  aurora_zone: ['Sky Veil', 'Light Dance', 'Star Curtain'],
}

const WONDER_LIST: WonderType[] = ['waterfall', 'crystal_cave', 'ancient_tree', 'geyser', 'aurora_zone']

let nextWonderId = 1

export class WorldNaturalWonderSystem {
  private wonders: NaturalWonder[] = []
  private lastSpawn = 0
  private lastBuff = 0

  update(dt: number, em: EntityManager, world: { width: number; height: number; getTile: (x: number, y: number) => number | null }): void {
    const tick = this.lastBuff + BUFF_INTERVAL  // approximate
    if (Date.now() - this.lastSpawn >= SPAWN_INTERVAL * 16) {
      this.lastSpawn = Date.now()
      this.trySpawnWonder(world)
    }
    this.lastBuff++
    if (this.lastBuff % BUFF_INTERVAL === 0) {
      this.applyBuffs(em)
    }
  }

  private trySpawnWonder(world: { width: number; height: number; getTile: (x: number, y: number) => number | null }): void {
    if (this.wonders.length >= MAX_WONDERS) return
    const x = 10 + Math.floor(Math.random() * (world.width - 20))
    const y = 10 + Math.floor(Math.random() * (world.height - 20))
    const tile = world.getTile(x, y)
    if (tile === null || tile === 0 || tile === 1) return // skip water
    // Check distance from existing wonders
    for (const w of this.wonders) {
      const dx = w.x - x, dy = w.y - y
      if (dx * dx + dy * dy < 900) return // too close
    }
    const type = WONDER_LIST[Math.floor(Math.random() * WONDER_LIST.length)]
    this.wonders.push({
      id: nextWonderId++,
      type,
      x, y,
      radius: WONDER_RADIUS,
      power: 1 + Math.floor(Math.random() * 3),
      discovered: false,
      discoveredBy: null,
      age: 0,
    })
  }

  private applyBuffs(em: EntityManager): void {
    const creatures = em.getEntitiesWithComponents('creature', 'position')
    for (const wonder of this.wonders) {
      wonder.age++
      for (const id of creatures) {
        const pos = em.getComponent<PositionComponent>(id, 'position')
        if (!pos) continue
        const dx = pos.x - wonder.x, dy = pos.y - wonder.y
        if (dx * dx + dy * dy <= wonder.radius * wonder.radius) {
          if (!wonder.discovered) {
            wonder.discovered = true
            const cm = em.getComponent(id, 'civMember') as any
            if (cm) wonder.discoveredBy = cm.civId
          }
        }
      }
    }
  }

  getWonders(): NaturalWonder[] {
    return this.wonders
  }

  getWonderAt(x: number, y: number): NaturalWonder | undefined {
    for (const w of this.wonders) {
      const dx = w.x - x, dy = w.y - y
      if (dx * dx + dy * dy <= w.radius * w.radius) return w
    }
    return undefined
  }

  getWonderCount(): number {
    return this.wonders.length
  }
}
