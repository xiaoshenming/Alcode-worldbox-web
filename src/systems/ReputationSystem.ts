// Reputation System - tracks civilization reputation based on their actions
// Reputation affects diplomacy modifiers, trade willingness, and alliance formation

import { CivManager } from '../civilization/CivManager'
import { EntityManager } from '../ecs/Entity'

/** Reputation level thresholds and labels */
export type ReputationLevel = 'revered' | 'respected' | 'neutral' | 'distrusted' | 'despised'

/** Actions that can modify a civilization's reputation */
export type ReputationAction =
  | 'war_won'
  | 'alliance_broken'
  | 'trade_success'
  | 'city_conquered'
  | 'city_liberated'
  | 'wonder_built'
  | 'disease_spread'
  | 'ally_helped'
  | 'espionage_caught'

/** Reputation level boundaries (lower bound inclusive) */
const LEVEL_THRESHOLDS: { min: number; level: ReputationLevel }[] = [
  { min: 60, level: 'revered' },
  { min: 20, level: 'respected' },
  { min: -20, level: 'neutral' },
  { min: -60, level: 'distrusted' },
  { min: -100, level: 'despised' },
]

const MAX_REPUTATION = 100
const DECAY_RATE = 0.02
const DECAY_INTERVAL = 60

/**
 * Tracks per-civilization reputation scores based on world actions.
 *
 * Reputation ranges from -100 (despised) to 100 (revered) and slowly
 * decays toward 0 over time. Other systems can query reputation to
 * adjust diplomacy checks, trade willingness, and alliance formation
 * probability.
 */
export class ReputationSystem {
  /** civId -> current reputation score */
  private reputations: Map<number, number> = new Map()
  /** civId -> history of recent reputation changes for debugging/UI */
  private history: Map<number, { action: ReputationAction; tick: number; delta: number }[]> = new Map()
  private readonly maxHistoryPerCiv = 20

  /**
   * Main update loop. Applies slow decay toward 0 for all tracked civs
   * and cleans up entries for dead civilizations.
   * @param tick - Current world tick
   * @param civManager - Civilization manager for iterating active civs
   * @param em - Entity manager (unused currently, kept for system signature consistency)
   */
  update(tick: number, civManager: CivManager, em: EntityManager): void {
    if (tick % DECAY_INTERVAL !== 0) return

    // Clean up dead civs
    for (const civId of this.reputations.keys()) {
      if (!civManager.civilizations.has(civId)) {
        this.reputations.delete(civId)
        this.history.delete(civId)
      }
    }

    // Decay all reputations toward 0
    for (const [civId, rep] of this.reputations) {
      if (rep === 0) continue
      const decayed = rep > 0
        ? Math.max(0, rep - DECAY_RATE)
        : Math.min(0, rep + DECAY_RATE)
      this.reputations.set(civId, decayed)
    }
  }

  /**
   * Get the raw reputation score for a civilization.
   * @param civId - The civilization to query
   * @returns Reputation score from -100 to 100, or 0 if untracked
   */
  getReputation(civId: number): number {
    return this.reputations.get(civId) ?? 0
  }

  /**
   * Get the reputation level label for a civilization.
   * @param civId - The civilization to query
   * @returns One of 'revered', 'respected', 'neutral', 'distrusted', 'despised'
   */
  getReputationLevel(civId: number): ReputationLevel {
    return this.levelFromScore(this.getReputation(civId))
  }

  /**
   * Returns a diplomacy modifier based on reputation.
   * Positive reputation yields a bonus (up to +0.3), negative yields a
   * penalty (down to -0.3). This value can be added to diplomacy check
   * rolls or relation change rates by other systems.
   * @param civId - The civilization to query
   * @returns A modifier in the range [-0.3, 0.3]
   */
  getDiplomacyModifier(civId: number): number {
    const rep = this.getReputation(civId)
    // Linear mapping: -100 -> -0.3, 0 -> 0, 100 -> 0.3
    return (rep / MAX_REPUTATION) * 0.3
  }

  /**
   * Returns a trade willingness multiplier based on reputation.
   * Revered civs get up to 1.3x trade willingness, despised civs get 0.7x.
   * @param civId - The civilization to query
   * @returns Multiplier in the range [0.7, 1.3]
   */
  getTradeWillingness(civId: number): number {
    const rep = this.getReputation(civId)
    return 1.0 + (rep / MAX_REPUTATION) * 0.3
  }

  /**
   * Get recent reputation history for a civilization (for UI/debug).
   * @param civId - The civilization to query
   * @param count - Max entries to return
   * @returns Array of recent reputation change records
   */
  getHistory(civId: number, count: number = 10): { action: ReputationAction; tick: number; delta: number }[] {
    const hist = this.history.get(civId)
    if (!hist) return []
    return hist.slice(-count)
  }

  private levelFromScore(score: number): ReputationLevel {
    for (const { min, level } of LEVEL_THRESHOLDS) {
      if (score >= min) return level
    }
    return 'despised'
  }
}
