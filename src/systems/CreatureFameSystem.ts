// Creature Fame System - tracks individual creature fame within civilizations
// Creatures accumulate fame through actions; high-fame creatures become leaders or legends

import { EntityManager, EntityId } from '../ecs/Entity'

/** Sources of fame that creatures can earn */
export type FameSource =
  | 'combat_victory'
  | 'exploration'
  | 'building'
  | 'healing'
  | 'leadership'
  | 'sacrifice'

/** Fame title tiers from lowest to highest */
export type FameTitle = 'unknown' | 'known' | 'famous' | 'legendary' | 'mythical'

/** Per-source fame values for breakdown tracking */
export type FameBreakdown = Record<FameSource, number>

/** Complete fame record for a single creature */
export interface FameRecord {
  totalFame: number
  fameBreakdown: FameBreakdown
  title: FameTitle
  rank: number
}

/** Fame amount awarded per source type */
const SOURCE_BASE_FAME: Record<FameSource, number> = {
  combat_victory: 8,
  exploration: 3,
  building: 5,
  healing: 4,
  leadership: 10,
  sacrifice: 20,
}

/** 预计算的FameSource键数组，避免热路径中Object.keys()分配 */
const FAME_SOURCES: FameSource[] = Object.keys(SOURCE_BASE_FAME) as FameSource[]

/** Title thresholds (descending order for lookup) */
const TITLE_THRESHOLDS: { min: number; title: FameTitle; rank: number }[] = [
  { min: 500, title: 'mythical', rank: 4 },
  { min: 300, title: 'legendary', rank: 3 },
  { min: 150, title: 'famous', rank: 2 },
  { min: 50, title: 'known', rank: 1 },
]

const MAX_FAME = 1000
const DECAY_RATE = 0.005
const DECAY_INTERVAL = 120

function createEmptyBreakdown(): FameBreakdown {
  return {
    combat_victory: 0,
    exploration: 0,
    building: 0,
    healing: 0,
    leadership: 0,
    sacrifice: 0,
  }
}

/**
 * Tracks individual creature fame within the world.
 *
 * Creatures accumulate fame through various actions (combat, exploration,
 * building, etc.). Fame slowly decays over time to prevent infinite growth.
 * Based on total fame, creatures earn titles from "unknown" to "mythical"
 * and a numeric rank (0-4). Other systems can query fame to determine
 * leadership eligibility, legend status, or UI display.
 */
export class CreatureFameSystem {
  private fameRecords: Map<EntityId, FameRecord> = new Map()

  /**
   * Main update loop. Decays fame over time and refreshes titles/ranks.
   * @param dt - Delta time (unused, tick-based decay)
   * @param entityManager - Entity manager for checking alive entities
   * @param tick - Current world tick
   */
  update(dt: number, entityManager: EntityManager, tick: number): void {
    if (tick % DECAY_INTERVAL !== 0) return

    // Remove records for dead entities
    for (const id of this.fameRecords.keys()) {
      if (!entityManager.hasComponent(id, 'creature')) {
        this.fameRecords.delete(id)
      }
    }

    // Decay all fame toward 0
    for (const [, record] of this.fameRecords) {
      if (record.totalFame <= 0) continue
      const decay = record.totalFame * DECAY_RATE
      record.totalFame = Math.max(0, record.totalFame - decay)

      // Proportionally decay each source
      for (const source of FAME_SOURCES) {
        const val = record.fameBreakdown[source]
        if (val > 0) {
          record.fameBreakdown[source] = Math.max(0, val - val * DECAY_RATE)
        }
      }

      // Refresh title after decay
      this.refreshTitle(record)
    }
  }

  /**
   * Add fame to a creature from a specific source.
   * @param entityId - The creature entity ID
   * @param source - The fame source type
   * @param amount - Fame amount (defaults to the source's base value)
   */
  addFame(entityId: EntityId, source: FameSource, amount?: number): void {
    const delta = amount ?? SOURCE_BASE_FAME[source]
    if (delta <= 0) return

    let record = this.fameRecords.get(entityId)
    if (!record) {
      record = {
        totalFame: 0,
        fameBreakdown: createEmptyBreakdown(),
        title: 'unknown',
        rank: 0,
      }
      this.fameRecords.set(entityId, record)
    }

    record.fameBreakdown[source] += delta
    record.totalFame = Math.min(MAX_FAME, record.totalFame + delta)
    this.refreshTitle(record)
  }

  /**
   * Get the full fame record for a creature.
   * @param entityId - The creature entity ID
   * @returns The fame record, or undefined if not tracked
   */
  getFame(entityId: EntityId): FameRecord | undefined {
    return this.fameRecords.get(entityId)
  }

  /**
   * Get the current title for a creature.
   * @param entityId - The creature entity ID
   * @returns The fame title string
   */
  getFameTitle(entityId: EntityId): FameTitle {
    return this.fameRecords.get(entityId)?.title ?? 'unknown'
  }

  /**
   * Get the top N most famous creatures, sorted by total fame descending.
   * @param count - Number of results to return
   * @returns Array of [entityId, FameRecord] pairs
   */
  getTopFamous(count: number): [EntityId, FameRecord][] {
    const entries = [...this.fameRecords.entries()]
    entries.sort((a, b) => b[1].totalFame - a[1].totalFame)
    return entries.slice(0, count)
  }

  private refreshTitle(record: FameRecord): void {
    for (const { min, title, rank } of TITLE_THRESHOLDS) {
      if (record.totalFame >= min) {
        record.title = title
        record.rank = rank
        return
      }
    }
    record.title = 'unknown'
    record.rank = 0
  }
}
