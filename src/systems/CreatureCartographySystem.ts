// Creature Cartography System (v3.83) - Creatures learn map-making
// Maps reveal terrain, trade routes, and strategic locations

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type MapType = 'terrain' | 'trade_route' | 'military' | 'resource' | 'nautical' | 'celestial'
export type MapDetail = 'crude' | 'basic' | 'detailed' | 'masterwork'

export interface CartographicMap {
  id: number
  cartographerId: number
  mapType: MapType
  detail: MapDetail
  accuracy: number
  coverage: number
  tradeValue: number
  tick: number
}

const CHECK_INTERVAL = 1400
const MAP_CHANCE = 0.003
const MAX_MAPS = 80
const SKILL_GROWTH = 0.06

const MAP_TYPES: MapType[] = ['terrain', 'trade_route', 'military', 'resource', 'nautical', 'celestial']
const DETAILS: MapDetail[] = ['crude', 'basic', 'detailed', 'masterwork']

export class CreatureCartographySystem {
  private maps: CartographicMap[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.maps.length >= MAX_MAPS) break
      if (Math.random() > MAP_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 16) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 12)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const mapType = MAP_TYPES[Math.floor(Math.random() * MAP_TYPES.length)]
      const detailIdx = Math.min(DETAILS.length - 1, Math.floor(skill / 25))
      const accuracy = skill * (0.5 + Math.random() * 0.5)

      this.maps.push({
        id: this.nextId++,
        cartographerId: eid,
        mapType,
        detail: DETAILS[detailIdx],
        accuracy,
        coverage: 10 + skill * 0.8,
        tradeValue: accuracy * 0.5 + (mapType === 'nautical' ? 20 : 0),
        tick,
      })
    }

    const cutoff = tick - 60000
    for (let i = this.maps.length - 1; i >= 0; i--) {
      if (this.maps[i].tick < cutoff) this.maps.splice(i, 1)
    }
  }

  getMaps(): readonly CartographicMap[] { return this.maps }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
