// Creature Rivalry System - persistent hatred/competition between individual creatures
// Rivalries form through combat, decay over time, and inherit across generations (halved)

import { EntityManager, EntityId, PositionComponent, CreatureComponent, NeedsComponent, GeneticsComponent } from '../ecs/Entity'
import { EventLog } from './EventLog'

/** Hatred level thresholds */
export type RivalryIntensity = 'grudge' | 'rival' | 'nemesis'

interface RivalryRecord {
  hatred: number         // 0-100
  lastCombatTick: number
  combatCount: number
}

const MAX_HATRED = 100
const MIN_HATRED = 0
const COMBAT_HATRED_GAIN = 15
const HATRED_DECAY_RATE = 0.3
const MAX_RIVALRIES_PER_ENTITY = 8
const SEEK_THRESHOLD = 50
const SEEK_RANGE = 20
const INHERITANCE_FACTOR = 0.5
const INHERITANCE_MIN = 10

/**
 * Tracks persistent hatred between individual creatures.
 * When two creatures fight, their mutual hatred increases. High hatred
 * causes creatures to actively seek each other out. Rivalries pass to
 * offspring at half strength via the genetics parentage system.
 */
export class CreatureRivalrySystem {
  private rivalries: Map<number, Map<number, RivalryRecord>> = new Map()

  /** Record a combat encounter between two creatures, increasing mutual hatred. */
  recordCombat(entityA: EntityId, entityB: EntityId, tick: number): void {
    this.addHatred(entityA, entityB, COMBAT_HATRED_GAIN, tick)
    this.addHatred(entityB, entityA, COMBAT_HATRED_GAIN, tick)
  }

  /** Inherit rivalries from a parent to a child creature (halved hatred). */
  inheritRivalries(parentId: EntityId, childId: EntityId, tick: number): void {
    const parentRivals = this.rivalries.get(parentId)
    if (!parentRivals) return
    for (const [rivalId, record] of parentRivals) {
      const inherited = record.hatred * INHERITANCE_FACTOR
      if (inherited < INHERITANCE_MIN) continue
      this.ensureMap(childId).set(rivalId, {
        hatred: inherited, lastCombatTick: tick, combatCount: 0,
      })
    }
  }

  /** Get the hatred level from entityA toward entityB. */
  getHatred(entityA: EntityId, entityB: EntityId): number {
    return this.rivalries.get(entityA)?.get(entityB)?.hatred ?? 0
  }

  /** Get the rivalry intensity label between two creatures. */
  getIntensity(entityA: EntityId, entityB: EntityId): RivalryIntensity | null {
    const hatred = this.getHatred(entityA, entityB)
    if (hatred >= 80) return 'nemesis'
    if (hatred >= 50) return 'rival'
    if (hatred >= 20) return 'grudge'
    return null
  }

  /** Get all rivals for an entity, sorted by hatred descending. */
  getRivals(entityId: EntityId): { rivalId: EntityId; record: RivalryRecord }[] {
    const map = this.rivalries.get(entityId)
    if (!map) return []
    const result: { rivalId: EntityId; record: RivalryRecord }[] = []
    for (const [rivalId, record] of map) result.push({ rivalId, record })
    result.sort((a, b) => b.record.hatred - a.record.hatred)
    return result
  }

  /** Main update: decay hatred, clean up dead entities, drive rival-seeking. */
  update(dt: number, em: EntityManager): void {
    const creatures = em.getEntitiesWithComponents('position', 'creature', 'needs')
    const aliveSet = new Set(creatures)
    this.decayAndCleanup(aliveSet)
    this.processInheritance(em, aliveSet)
    this.driveRivalSeeking(em, creatures)
  }

  /** Render hook (no-op on world canvas; use renderCreatureRivals for UI panels). */
  render(ctx: CanvasRenderingContext2D): void {
    // Rivalry info is exposed via getRivals() / renderCreatureRivals() for InfoPanel
  }

  /** Render rivalry details for a specific creature at a given panel position. */
  renderCreatureRivals(
    ctx: CanvasRenderingContext2D, entityId: EntityId,
    em: EntityManager, x: number, y: number
  ): number {
    const rivals = this.getRivals(entityId)
    if (rivals.length === 0) return 0

    ctx.save()
    ctx.font = '11px monospace'
    let offsetY = 0
    ctx.fillStyle = '#ffaaaa'
    ctx.fillText('Rivalries:', x, y)
    offsetY += 16

    const shown = Math.min(rivals.length, 5)
    for (let i = 0; i < shown; i++) {
      const { rivalId, record } = rivals[i]
      const rivalCreature = em.getComponent<CreatureComponent>(rivalId, 'creature')
      const name = rivalCreature ? rivalCreature.name : `#${rivalId}`
      const intensity = this.intensityFromHatred(record.hatred)
      const color = intensity === 'nemesis' ? '#ff4444'
        : intensity === 'rival' ? '#ff8844' : '#ffcc44'

      ctx.fillStyle = color
      ctx.fillText(`${name} [${intensity}]`, x + 4, y + offsetY)

      // Hatred bar
      const barX = x + 130, barW = 60, barH = 8
      ctx.fillStyle = '#333'
      ctx.fillRect(barX, y + offsetY - 8, barW, barH)
      ctx.fillStyle = color
      ctx.fillRect(barX, y + offsetY - 8, barW * (record.hatred / MAX_HATRED), barH)
      ctx.fillStyle = '#aaa'
      ctx.fillText(`x${record.combatCount}`, barX + barW + 4, y + offsetY)
      offsetY += 14
    }

    ctx.restore()
    return offsetY
  }

  private addHatred(from: EntityId, toward: EntityId, amount: number, tick: number): void {
    const map = this.ensureMap(from)
    const existing = map.get(toward)
    if (existing) {
      const wasBelow = existing.hatred < 80
      existing.hatred = Math.min(MAX_HATRED, existing.hatred + amount)
      existing.lastCombatTick = tick
      existing.combatCount++
      if (wasBelow && existing.hatred >= 80) {
        EventLog.log('combat', `A nemesis rivalry has formed! Entity #${from} vs #${toward}`, tick)
      }
    } else {
      if (map.size >= MAX_RIVALRIES_PER_ENTITY) this.evictLowest(map)
      map.set(toward, { hatred: Math.min(MAX_HATRED, amount), lastCombatTick: tick, combatCount: 1 })
    }
  }

  private ensureMap(entityId: EntityId): Map<number, RivalryRecord> {
    let map = this.rivalries.get(entityId)
    if (!map) { map = new Map(); this.rivalries.set(entityId, map) }
    return map
  }

  private evictLowest(map: Map<number, RivalryRecord>): void {
    let lowestId = -1, lowestHatred = Infinity
    for (const [id, record] of map) {
      if (record.hatred < lowestHatred) { lowestHatred = record.hatred; lowestId = id }
    }
    if (lowestId >= 0) map.delete(lowestId)
  }

  private decayAndCleanup(aliveSet: Set<EntityId>): void {
    for (const [entityId, map] of this.rivalries) {
      if (!aliveSet.has(entityId)) { this.rivalries.delete(entityId); continue }
      for (const [rivalId, record] of map) {
        if (!aliveSet.has(rivalId)) { map.delete(rivalId); continue }
        record.hatred = Math.max(MIN_HATRED, record.hatred - HATRED_DECAY_RATE)
        if (record.hatred <= MIN_HATRED) map.delete(rivalId)
      }
      if (map.size === 0) this.rivalries.delete(entityId)
    }
  }

  /** Inherit parent rivalries for young creatures with genetics data. */
  private processInheritance(em: EntityManager, aliveSet: Set<EntityId>): void {
    const geneticEntities = em.getEntitiesWithComponents('creature', 'genetics')
    for (const entityId of geneticEntities) {
      if (this.rivalries.has(entityId)) continue
      const genetics = em.getComponent<GeneticsComponent>(entityId, 'genetics')
      if (!genetics) continue
      const creature = em.getComponent<CreatureComponent>(entityId, 'creature')
      if (!creature || creature.age > 5) continue
      if (genetics.parentA !== null && aliveSet.has(genetics.parentA))
        this.inheritRivalries(genetics.parentA, entityId, 0)
      if (genetics.parentB !== null && aliveSet.has(genetics.parentB))
        this.inheritRivalries(genetics.parentB, entityId, 0)
    }
  }

  /** Make high-hatred creatures move toward their top rival. */
  private driveRivalSeeking(em: EntityManager, creatures: EntityId[]): void {
    for (const entityId of creatures) {
      const rivals = this.rivalries.get(entityId)
      if (!rivals) continue
      let topRivalId: EntityId | null = null, topHatred = 0
      for (const [rivalId, record] of rivals) {
        if (record.hatred > topHatred && record.hatred >= SEEK_THRESHOLD) {
          topHatred = record.hatred; topRivalId = rivalId
        }
      }
      if (topRivalId === null) continue

      const pos = em.getComponent<PositionComponent>(entityId, 'position')
      const rivalPos = em.getComponent<PositionComponent>(topRivalId, 'position')
      if (!pos || !rivalPos) continue
      const dx = rivalPos.x - pos.x, dy = rivalPos.y - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > SEEK_RANGE || dist < 2) continue

      const creature = em.getComponent<CreatureComponent>(entityId, 'creature')
      if (!creature) continue
      const step = creature.speed * 0.3, nx = dx / dist, ny = dy / dist
      pos.x += nx * step
      pos.y += ny * step
    }
  }

  private intensityFromHatred(hatred: number): RivalryIntensity {
    if (hatred >= 80) return 'nemesis'
    if (hatred >= 50) return 'rival'
    return 'grudge'
  }
}
