// Creature Collection System (v2.89) - Creatures collect and hoard items
// Collections give status, can be traded, stolen, or lost in disasters

import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'

export type CollectibleType = 'gem' | 'shell' | 'bone' | 'feather' | 'coin' | 'artifact' | 'flower' | 'stone'

export interface Collection {
  creatureId: number
  items: Map<CollectibleType, number>
  totalValue: number
  pride: number         // 0-100, how proud of collection
  lastFoundTick: number
}

const CHECK_INTERVAL = 900
const FIND_CHANCE = 0.02
const TRADE_CHANCE = 0.005
const THEFT_CHANCE = 0.003
const MAX_COLLECTIONS = 50

const ITEM_VALUES: Record<CollectibleType, number> = {
  gem: 10,
  shell: 2,
  bone: 3,
  feather: 1,
  coin: 5,
  artifact: 15,
  flower: 1,
  stone: 1,
}

const ITEM_TYPES = Object.keys(ITEM_VALUES) as CollectibleType[]

export class CreatureCollectionSystem {
  private collections = new Map<number, Collection>()
  private lastCheck = 0
  private _topCollectorsBuf: Collection[] = []

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.findItems(em, tick)
    this.tradeItems(em)
    this.stealItems(em)
    this.cleanupDeadCollectors(em)
  }

  private getOrCreate(creatureId: number): Collection {
    let col = this.collections.get(creatureId)
    if (!col) {
      col = {
        creatureId,
        items: new Map(),
        totalValue: 0,
        pride: 10,
        lastFoundTick: 0,
      }
      this.collections.set(creatureId, col)
    }
    return col
  }

  private findItems(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const eid of entities) {
      if (Math.random() > FIND_CHANCE) continue
      if (this.collections.size >= MAX_COLLECTIONS && !this.collections.has(eid)) continue

      const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)]
      const col = this.getOrCreate(eid)
      const count = col.items.get(type) ?? 0
      col.items.set(type, count + 1)
      col.totalValue += ITEM_VALUES[type]
      col.pride = Math.min(100, col.pride + 3)
      col.lastFoundTick = tick
    }
  }

  private tradeItems(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const eid of entities) {
      if (Math.random() > TRADE_CHANCE) continue
      const col = this.collections.get(eid)
      if (!col || col.items.size === 0) continue

      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue

      // Find nearby creature to trade with
      for (const oid of entities) {
        if (oid === eid) continue
        const opos = em.getComponent<PositionComponent>(oid, 'position')
        if (!opos) continue

        const dx = pos.x - opos.x
        const dy = pos.y - opos.y
        if (dx * dx + dy * dy > 25) continue

        // Transfer a random item
        let eligibleCount = 0
        for (const c of col.items.values()) { if (c > 0) eligibleCount++ }
        if (eligibleCount === 0) break
        let pick = Math.floor(Math.random() * eligibleCount)
        let type: CollectibleType = 'gem'
        for (const [t, c] of col.items.entries()) { if (c > 0 && pick-- === 0) { type = t; break } }
        col.items.set(type, (col.items.get(type) ?? 1) - 1)
        col.totalValue -= ITEM_VALUES[type]

        const otherCol = this.getOrCreate(oid)
        otherCol.items.set(type, (otherCol.items.get(type) ?? 0) + 1)
        otherCol.totalValue += ITEM_VALUES[type]
        break
      }
    }
  }

  private stealItems(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const eid of entities) {
      if (Math.random() > THEFT_CHANCE) continue

      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue

      for (const oid of entities) {
        if (oid === eid) continue
        const victimCol = this.collections.get(oid)
        if (!victimCol || victimCol.totalValue === 0) continue

        const opos = em.getComponent<PositionComponent>(oid, 'position')
        if (!opos) continue

        const dx = pos.x - opos.x
        const dy = pos.y - opos.y
        if (dx * dx + dy * dy > 16) continue

        // Steal one item
        let eligibleCount = 0
        for (const c of victimCol.items.values()) { if (c > 0) eligibleCount++ }
        if (eligibleCount === 0) break
        let pick = Math.floor(Math.random() * eligibleCount)
        let type: CollectibleType = 'gem'
        for (const [t, c] of victimCol.items.entries()) { if (c > 0 && pick-- === 0) { type = t; break } }
        victimCol.items.set(type, (victimCol.items.get(type) ?? 1) - 1)
        victimCol.totalValue -= ITEM_VALUES[type]
        victimCol.pride = Math.max(0, victimCol.pride - 10)

        const thiefCol = this.getOrCreate(eid)
        thiefCol.items.set(type, (thiefCol.items.get(type) ?? 0) + 1)
        thiefCol.totalValue += ITEM_VALUES[type]
        break
      }
    }
  }

  private cleanupDeadCollectors(em: EntityManager): void {
    for (const [creatureId] of this.collections) {
      const c = em.getComponent<CreatureComponent>(creatureId, 'creature')
      if (!c) {
        this.collections.delete(creatureId)
      }
    }
  }

  getTopCollectors(n: number): Collection[] {
    const buf = this._topCollectorsBuf; buf.length = 0
    for (const c of this.collections.values()) buf.push(c)
    buf.sort((a, b) => b.totalValue - a.totalValue)
    if (buf.length > n) buf.length = n
    return buf
  }
}
