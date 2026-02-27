// Legendary Battle System - detects and enhances large-scale epic combat events

import { EntityManager, EntityId, PositionComponent, CreatureComponent, HeroComponent, NeedsComponent } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'

/** Battle phase based on participant count */
export type BattlePhase = 'SKIRMISH' | 'BATTLE' | 'EPIC_BATTLE' | 'LEGENDARY'

/** Tracked battle info */
export interface BattleInfo {
  id: number; centerX: number; centerY: number
  participants: Map<number, Set<EntityId>> // civId -> entity set
  startTick: number; casualties: number
  phase: BattlePhase; lastUpdateTick: number
}

/** Visual effect data for a battle */
export interface BattleVisualEffects { dustPositions: { x: number; y: number }[]; shakeIntensity: number }

const BATTLE_DETECT_RADIUS = 12
const BATTLE_EXPIRE_TICKS = 120
const STORY_TEMPLATES = [
  'The Battle of ({loc}) - ({civ1}) vs ({civ2}), ({casualties}) fell',
  'At ({loc}), ({civ1}) clashed with ({civ2}) in a ({phase}) - ({casualties}) perished',
  'The ({phase}) near ({loc}): ({civ1}) and ({civ2}) fought fiercely, ({casualties}) lost',
  '({civ1}) met ({civ2}) at ({loc}) in a bloody ({phase}), claiming ({casualties}) lives',
]
// Pre-allocated dust offsets to avoid GC in hot path
const DUST_OFFSETS: { dx: number; dy: number }[] = []
for (let i = 0; i < 40; i++) {
  const a = (i / 40) * Math.PI * 2, r = 3 + (i % 5) * 2
  DUST_OFFSETS.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r })
}

/**
 * Detects and enhances large-scale epic combat events.
 * When 10+ creatures from 2+ civilizations fight in a small area,
 * the system tracks the battle, applies hero bonuses, generates
 * war stories, and provides visual effect data.
 */
export class LegendaryBattleSystem {
  private battles: Map<number, BattleInfo> = new Map()
  private warStories: string[] = []
  private nextBattleId = 1
  private heroBuffs: Map<EntityId, number> = new Map() // entityId -> buff expiry tick
  // Reusable collections to avoid GC pressure (numeric key = cx * 10000 + cy)
  private _detectGrid: Map<number, EntityId[]> = new Map()
  private _visited: Set<number> = new Set()

  /**
   * Main update loop. Detects new battles, updates existing ones,
   * applies hero bonuses, and generates war stories.
   */
  update(tick: number, em: EntityManager, civManager: CivManager): void {
    // Expire old battles
    for (const [id, battle] of this.battles) {
      if (tick - battle.lastUpdateTick > BATTLE_EXPIRE_TICKS) {
        this.finalizeBattle(battle, civManager)
        this.battles.delete(id)
      }
    }

    // Expire hero buffs
    for (const [eid, expiry] of this.heroBuffs) {
      if (tick >= expiry) this.heroBuffs.delete(eid)
    }

    // Only scan every 10 ticks for performance
    if (tick % 10 !== 0) return

    // Gather all fighting creatures with civ membership
    const fighters = em.getEntitiesWithComponents('position', 'creature', 'needs', 'civMember')
    if (fighters.length < 10) return

    // Build spatial grid (cell size = DETECT_RADIUS)
    const cellSize = BATTLE_DETECT_RADIUS
    const grid = this._detectGrid
    grid.clear()
    for (const id of fighters) {
      const needs = em.getComponent<NeedsComponent>(id, 'needs')
      if (!needs || needs.health <= 0) continue
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const key = Math.floor(pos.x / cellSize) * 10000 + Math.floor(pos.y / cellSize)
      const cell = grid.get(key)
      if (cell) cell.push(id)
      else grid.set(key, [id])
    }

    // Scan each cell + neighbors for multi-civ clusters
    const visited = this._visited
    visited.clear()
    for (const [key, _cell] of grid) {
      if (visited.has(key)) continue
      visited.add(key)

      // Collect entities from this cell and neighbors
      const cx = Math.floor(key / 10000)
      const cy = key % 10000
      const cluster: EntityId[] = []

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nCell = grid.get((cx + dx) * 10000 + (cy + dy))
          if (nCell) {
            cluster.push(...nCell)
            visited.add((cx + dx) * 10000 + (cy + dy))
          }
        }
      }

      if (cluster.length < 10) continue

      // Count civs in cluster
      const civCounts = new Map<number, EntityId[]>()
      let sumX = 0
      let sumY = 0
      let posCount = 0
      for (const id of cluster) {
        const civ = em.getComponent<CivMemberComponent>(id, 'civMember')
        const pos = em.getComponent<PositionComponent>(id, 'position')
        if (!civ || !pos) continue
        sumX += pos.x
        sumY += pos.y
        posCount++
        const arr = civCounts.get(civ.civId)
        if (arr) arr.push(id)
        else civCounts.set(civ.civId, [id])
      }

      if (civCounts.size < 2) continue

      const centerX = posCount > 0 ? sumX / posCount : 0
      const centerY = posCount > 0 ? sumY / posCount : 0

      // Try to merge into existing battle
      let merged = false
      for (const battle of this.battles.values()) {
        const dx = battle.centerX - centerX
        const dy = battle.centerY - centerY
        if (dx * dx + dy * dy < BATTLE_DETECT_RADIUS * BATTLE_DETECT_RADIUS) {
          this.mergeBattle(battle, civCounts, centerX, centerY, tick)
          merged = true
          break
        }
      }

      if (!merged) {
        const participants = new Map<number, Set<EntityId>>()
        for (const [civId, ids] of civCounts) {
          participants.set(civId, new Set(ids))
        }
        const battle: BattleInfo = {
          id: this.nextBattleId++,
          centerX,
          centerY,
          participants,
          startTick: tick,
          casualties: 0,
          phase: this.calcPhase(cluster.length),
          lastUpdateTick: tick,
        }
        this.battles.set(battle.id, battle)
      }
    }

    // Apply hero buffs for active legendary/epic battles
    for (const battle of this.battles.values()) {
      if (battle.phase !== 'LEGENDARY' && battle.phase !== 'EPIC_BATTLE') continue
      for (const entitySet of battle.participants.values()) {
        for (const eid of entitySet) {
          const hero = em.getComponent<HeroComponent>(eid, 'hero')
          if (hero && !this.heroBuffs.has(eid)) {
            const creature = em.getComponent<CreatureComponent>(eid, 'creature')
            if (creature) {
              const bonus = battle.phase === 'LEGENDARY' ? 5 : 3
              creature.damage += bonus
              creature.speed += bonus * 0.3
              this.heroBuffs.set(eid, tick + 200)
            }
          }
        }
      }
    }

    // Count casualties: participants who are now dead
    for (const battle of this.battles.values()) {
      let totalAlive = 0
      for (const entitySet of battle.participants.values()) {
        for (const eid of entitySet) {
          const needs = em.getComponent<NeedsComponent>(eid, 'needs')
          if (!needs || needs.health <= 0) {
            entitySet.delete(eid)
            battle.casualties++
          } else {
            totalAlive++
          }
        }
      }
      battle.phase = this.calcPhase(totalAlive)
    }
  }

  /** Returns all currently active battles. */
  getActiveBattles(): BattleInfo[] {
    return [...this.battles.values()]
  }

  /** Returns the battle at the given position within radius, or null. */
  getBattleAt(x: number, y: number, radius: number): BattleInfo | null {
    const r2 = radius * radius
    for (const battle of this.battles.values()) {
      const dx = battle.centerX - x
      const dy = battle.centerY - y
      if (dx * dx + dy * dy <= r2) return battle
    }
    return null
  }

  /** Returns the phase name for a given battle ID. */
  getBattleScale(battleId: number): BattlePhase | null {
    return this.battles.get(battleId)?.phase ?? null
  }

  /** Returns all generated war story strings. */
  getWarStories(): string[] {
    return this.warStories
  }

  /** Returns visual effect data for a given battle. */
  getVisualEffects(battleId: number): BattleVisualEffects | null {
    const battle = this.battles.get(battleId)
    if (!battle) return null

    const count = this.getParticipantCount(battle)
    const dustCount = Math.min(DUST_OFFSETS.length, Math.floor(count * 0.6))
    const dustPositions: { x: number; y: number }[] = []
    for (let i = 0; i < dustCount; i++) {
      const off = DUST_OFFSETS[i]
      dustPositions.push({ x: battle.centerX + off.dx, y: battle.centerY + off.dy })
    }

    const shakeIntensity = battle.phase === 'LEGENDARY' ? 4
      : battle.phase === 'EPIC_BATTLE' ? 2.5
      : battle.phase === 'BATTLE' ? 1
      : 0

    return { dustPositions, shakeIntensity }
  }

  private mergeBattle(
    battle: BattleInfo, civCounts: Map<number, EntityId[]>,
    centerX: number, centerY: number, tick: number
  ): void {
    battle.centerX = (battle.centerX + centerX) * 0.5
    battle.centerY = (battle.centerY + centerY) * 0.5
    battle.lastUpdateTick = tick
    for (const [civId, ids] of civCounts) {
      const existing = battle.participants.get(civId)
      if (existing) {
        for (const id of ids) existing.add(id)
      } else {
        battle.participants.set(civId, new Set(ids))
      }
    }

    battle.phase = this.calcPhase(this.getParticipantCount(battle))
  }

  private finalizeBattle(battle: BattleInfo, civManager: CivManager): void {
    if (battle.casualties < 3) return
    const civIds = [...battle.participants.keys()]
    const civ1 = civManager.civilizations.get(civIds[0])
    const civ2 = civIds.length > 1 ? civManager.civilizations.get(civIds[1]) : null
    const name1 = civ1?.name ?? 'Unknown'
    const name2 = civ2?.name ?? 'Unknown'
    const loc = `${Math.round(battle.centerX)},${Math.round(battle.centerY)}`
    const template = STORY_TEMPLATES[battle.id % STORY_TEMPLATES.length]

    const story = template
      .replace('({loc})', loc)
      .replace('({civ1})', name1)
      .replace('({civ2})', name2)
      .replace('({casualties})', String(battle.casualties))
      .replace('({phase})', battle.phase.toLowerCase().replace('_', ' '))

    this.warStories.push(story)
    if (this.warStories.length > 50) this.warStories.shift()
  }

  private calcPhase(count: number): BattlePhase {
    if (count >= 50) return 'LEGENDARY'
    if (count >= 30) return 'EPIC_BATTLE'
    if (count >= 10) return 'BATTLE'
    return 'SKIRMISH'
  }

  private getParticipantCount(battle: BattleInfo): number {
    let total = 0
    for (const set of battle.participants.values()) total += set.size
    return total
  }
}
