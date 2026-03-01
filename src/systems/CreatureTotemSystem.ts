// Creature Totem System (v2.66) - Tribal totem worship
// Creatures build totems at significant locations representing their tribe/beliefs
// Totems grant passive bonuses to nearby creatures and decay without worship

import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'
import { World } from '../game/World'

export type TotemType = 'ancestor' | 'war' | 'fertility' | 'protection' | 'wisdom' | 'nature'

export interface Totem {
  id: number
  x: number
  y: number
  type: TotemType
  power: number          // 0-100
  creatorRace: string
  createdTick: number
  worshipCount: number
}

const CHECK_INTERVAL = 950
const MAX_TOTEMS = 40
const SPAWN_CHANCE = 0.025
const POWER_DECAY = 0.3
const WORSHIP_RADIUS = 10
const WORSHIP_POWER_GAIN = 5

const TOTEM_TYPES: TotemType[] = ['ancestor', 'war', 'fertility', 'protection', 'wisdom', 'nature']

const TOTEM_BONUS: Record<TotemType, { stat: string; value: number }> = {
  ancestor: { stat: 'morale', value: 10 },
  war: { stat: 'combat', value: 8 },
  fertility: { stat: 'growth', value: 12 },
  protection: { stat: 'defense', value: 9 },
  wisdom: { stat: 'xp', value: 7 },
  nature: { stat: 'healing', value: 6 },
}

export class CreatureTotemSystem {
  private totems: Totem[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, world: World, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.worshipTotems(em)
    this.trySpawnTotem(em, world, tick)
    this.decayTotems()
  }

  private trySpawnTotem(em: EntityManager, world: World, tick: number): void {
    if (this.totems.length >= MAX_TOTEMS) return

    const entities = em.getEntitiesWithComponents('creature', 'position')
    if (entities.length < 5) return

    for (let attempt = 0; attempt < 4; attempt++) {
      if (this.totems.length >= MAX_TOTEMS) break
      if (Math.random() > SPAWN_CHANCE) continue

      const eid = entities[Math.floor(Math.random() * entities.length)]
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      const creature = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!pos || !creature) continue

      // Don't place totems too close together
      if (this.totems.some(t => Math.abs(t.x - pos.x) < 12 && Math.abs(t.y - pos.y) < 12)) continue

      // Must be on land
      const x = Math.floor(pos.x)
      const y = Math.floor(pos.y)
      if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue

      // Population density check — more creatures nearby = higher chance
      let nearby = 0
      for (const other of entities) {
        const op = em.getComponent<PositionComponent>(other, 'position')
        if (!op) continue
        const dx = op.x - x, dy = op.y - y
        if (dx * dx + dy * dy < 225) nearby++ // radius 15
      }
      if (nearby < 3) continue

      const type = TOTEM_TYPES[Math.floor(Math.random() * TOTEM_TYPES.length)]
      this.totems.push({
        id: this.nextId++,
        x, y, type,
        power: 30 + Math.floor(Math.random() * 30),
        creatorRace: creature.species,
        createdTick: tick,
        worshipCount: 0,
      })
    }
  }

  private worshipTotems(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('creature', 'position')

    for (const totem of this.totems) {
      let worshippers = 0
      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        const dx = pos.x - totem.x, dy = pos.y - totem.y
        if (dx * dx + dy * dy <= WORSHIP_RADIUS * WORSHIP_RADIUS) {
          worshippers++
        }
      }
      if (worshippers > 0) {
        totem.worshipCount += worshippers
        totem.power = Math.min(100, totem.power + worshippers * WORSHIP_POWER_GAIN * 0.1)
      }
    }
  }

  private decayTotems(): void {
    for (let i = this.totems.length - 1; i >= 0; i--) {
      this.totems[i].power -= POWER_DECAY
      if (this.totems[i].power <= 0) {
        this.totems.splice(i, 1)
      }
    }
  }

  /** Get the bonus a totem type provides */
  getTotemBonus(type: TotemType): { stat: string; value: number } {
    return TOTEM_BONUS[type]
  }


  getTotemAt(x: number, y: number): Totem | undefined {
    return this.totems.find(t => t.x === x && t.y === y)
  }

  private _nearbyTotemsBuf: Totem[] = []
  getNearbyTotems(x: number, y: number, radius: number): Totem[] {
    const r2 = radius * radius
    this._nearbyTotemsBuf.length = 0
    for (const t of this.totems) {
      const dx = t.x - x, dy = t.y - y
      if (dx * dx + dy * dy <= r2) this._nearbyTotemsBuf.push(t)
    }
    return this._nearbyTotemsBuf
  }
}
