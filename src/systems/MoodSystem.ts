// MoodSystem — tracks per-creature happiness/mood that affects work speed,
// combat strength, and desertion risk.

import { EntityManager, PositionComponent, NeedsComponent, CreatureComponent } from '../ecs/Entity'
import { CivMemberComponent, Civilization } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'
import { World } from '../game/World'
import { WeatherType } from './WeatherSystem'
import { SpatialHashSystem } from './SpatialHashSystem'

// ── Constants ────────────────────────────────────────────────────────

const MOOD_UPDATE_INTERVAL = 60
const DECAY_RATE = 0.92          // temporal effects decay per update
const NEARBY_RADIUS = 10
const HOME_RADIUS = 15
const PROSPERITY_GOLD_THRESHOLD = 80
const POVERTY_GOLD_THRESHOLD = 15

/** Mood factor contributions */
const FACTOR = {
  WELL_FED_BONUS:    15,
  WELL_FED_PENALTY: -20,
  SAFE_BONUS:        10,
  SAFE_PENALTY:     -15,
  HOME_BONUS:        10,
  HOME_PENALTY:      -5,
  SOCIAL_BONUS:       8,
  SOCIAL_PENALTY:   -10,
  WEATHER_CLEAR:      5,
  WEATHER_STORM:     -8,
  WEATHER_RAIN:      -3,
  VICTORY_BOOST:     20,
  LOSS_PENALTY:     -25,
  PROSPERITY_BONUS:  12,
  PROSPERITY_PENALTY:-10,
} as const

// ── Types ────────────────────────────────────────────────────────────

/** Mood level label derived from the numeric mood value */
export type MoodLevel = 'ecstatic' | 'happy' | 'content' | 'unhappy' | 'miserable'

/** Per-creature mood state */
export interface MoodData {
  mood: number            // 0-100
  victoryBoost: number    // temporary, decays
  lossBoost: number       // temporary (negative), decays
}

/** Gameplay modifiers derived from mood */
export interface MoodModifier {
  workSpeed: number       // multiplier, e.g. 1.2 = +20%
  combatStrength: number  // multiplier
}

/** Pre-computed singleton mood modifier objects — avoids per-call object allocation */
const _MOD_HIGH: MoodModifier = { workSpeed: 1.2, combatStrength: 1.1 }
const _MOD_LOW: MoodModifier = { workSpeed: 0.7, combatStrength: 0.85 }
const _MOD_NEUTRAL: MoodModifier = { workSpeed: 1.0, combatStrength: 1.0 }

// ── System ───────────────────────────────────────────────────────────

/**
 * Tracks creature happiness/mood and exposes gameplay modifiers.
 *
 * Mood is influenced by hunger, safety, proximity to home, social contact,
 * weather, recent combat outcomes, and civilization prosperity. High mood
 * boosts productivity; low mood causes work slowdowns, combat penalties,
 * and potential desertion.
 */
export class MoodSystem {
  private moods: Map<number, MoodData> = new Map()

  /**
   * Main update — recalculates mood factors for all creatures periodically.
   * @param tick      Current game tick
   * @param em        Entity manager
   * @param world     World map (used for territory checks)
   * @param civManager Civilization manager
   * @param weather   Current weather type
   * @param spatial   Spatial hash for nearby queries
   */
  update(
    tick: number,
    em: EntityManager,
    world: World,
    civManager: CivManager,
    weather: WeatherType,
    spatial: SpatialHashSystem
  ): void {
    if (tick % MOOD_UPDATE_INTERVAL !== 0) return

    const creatures = em.getEntitiesWithComponents('creature', 'position', 'needs')

    for (let i = 0; i < creatures.length; i++) {
      const id = creatures[i]
      const data = this.getOrCreate(id)
      const pos = em.getComponent<PositionComponent>(id, 'position')
      const needs = em.getComponent<NeedsComponent>(id, 'needs')
      if (!pos || !needs) continue
      const civMem = em.getComponent<CivMemberComponent>(id, 'civMember')

      let delta = 0

      // 1. Hunger
      if (needs.hunger < 30) delta += FACTOR.WELL_FED_BONUS
      else if (needs.hunger > 80) delta += FACTOR.WELL_FED_PENALTY

      // 2. Safety — check for hostile creatures nearby
      const nearby = spatial.query(pos.x, pos.y, NEARBY_RADIUS)
      let inDanger = false
      for (let j = 0; j < nearby.length; j++) {
        if (nearby[j] === id) continue
        const otherCreature = em.getComponent<CreatureComponent>(nearby[j], 'creature')
        if (otherCreature && otherCreature.isHostile) { inDanger = true; break }
      }
      delta += inDanger ? FACTOR.SAFE_PENALTY : FACTOR.SAFE_BONUS

      // 3. Home proximity
      if (civMem) {
        const civ = civManager.civilizations.get(civMem.civId)
        if (civ) {
          const nearHome = this.isNearTerritory(pos.x, pos.y, civ, civManager)
          delta += nearHome ? FACTOR.HOME_BONUS : FACTOR.HOME_PENALTY
        }
      }

      // 4. Social — count friendly (same species or same civ) nearby
      let friendCount = 0
      for (let j = 0; j < nearby.length; j++) {
        if (nearby[j] === id) continue
        const otherCreature = em.getComponent<CreatureComponent>(nearby[j], 'creature')
        if (otherCreature && !otherCreature.isHostile) friendCount++
      }
      delta += friendCount >= 2 ? FACTOR.SOCIAL_BONUS : FACTOR.SOCIAL_PENALTY

      // 5. Weather
      delta += this.weatherMoodDelta(weather)

      // 6. Temporal effects (victory / loss) — add then decay
      delta += data.victoryBoost + data.lossBoost
      data.victoryBoost *= DECAY_RATE
      data.lossBoost *= DECAY_RATE
      if (Math.abs(data.victoryBoost) < 0.5) data.victoryBoost = 0
      if (Math.abs(data.lossBoost) < 0.5) data.lossBoost = 0

      // 7. Civilization prosperity
      if (civMem) {
        const civ = civManager.civilizations.get(civMem.civId)
        if (civ) {
          const gold = civ.resources.gold
          if (gold >= PROSPERITY_GOLD_THRESHOLD) delta += FACTOR.PROSPERITY_BONUS
          else if (gold <= POVERTY_GOLD_THRESHOLD) delta += FACTOR.PROSPERITY_PENALTY
        }
      }

      // Apply delta (scaled down so mood changes gradually)
      const scaled = delta * 0.1
      data.mood = Math.max(0, Math.min(100, data.mood + scaled))
    }

    // Cleanup removed entities
    for (const id of this.moods.keys()) {
      if (!em.hasComponent(id, 'creature')) this.moods.delete(id)
    }
  }

  /**
   * Returns the raw mood value (0-100) for a creature.
   * Returns 50 (neutral) if the entity has no mood data.
   */
  getMood(entityId: number): number {
    return this.moods.get(entityId)?.mood ?? 50
  }

  /**
   * Returns a human-readable mood level label.
   */
  getMoodLevel(entityId: number): MoodLevel {
    const m = this.getMood(entityId)
    if (m >= 80) return 'ecstatic'
    if (m >= 60) return 'happy'
    if (m >= 40) return 'content'
    if (m >= 20) return 'unhappy'
    return 'miserable'
  }

  /**
   * Returns work speed and combat strength multipliers based on mood.
   * - High mood (>75): +20% work, +10% combat
   * - Low mood (<25): -30% work, -15% combat
   * - Otherwise: neutral (1.0)
   */
  getMoodModifier(entityId: number): MoodModifier {
    const m = this.getMood(entityId)
    if (m > 75) return _MOD_HIGH
    if (m < 25) return _MOD_LOW
    return _MOD_NEUTRAL
  }

  // ── Private helpers ────────────────────────────────────────────────

  private getOrCreate(entityId: number): MoodData {
    let data = this.moods.get(entityId)
    if (!data) {
      data = { mood: 50, victoryBoost: 0, lossBoost: 0 }
      this.moods.set(entityId, data)
    }
    return data
  }

  private weatherMoodDelta(weather: WeatherType): number {
    switch (weather) {
      case 'clear':   return FACTOR.WEATHER_CLEAR
      case 'storm':
      case 'tornado':
      case 'heatwave': return FACTOR.WEATHER_STORM
      case 'rain':
      case 'snow':
      case 'fog':      return FACTOR.WEATHER_RAIN
      case 'drought':  return FACTOR.WEATHER_STORM
      default:         return 0
    }
  }

  private isNearTerritory(
    x: number, y: number, civ: Civilization, civManager: CivManager
  ): boolean {
    const tx = Math.floor(x)
    const ty = Math.floor(y)
    // Check if the tile or any tile within HOME_RADIUS belongs to this civ
    if (civManager.territoryMap[ty]?.[tx] === civ.id) return true
    // Quick check: scan a small cross pattern instead of full radius
    for (let d = 1; d <= HOME_RADIUS; d += 3) {
      if (civManager.territoryMap[ty]?.[tx + d] === civ.id) return true
      if (civManager.territoryMap[ty]?.[tx - d] === civ.id) return true
      if (civManager.territoryMap[ty + d]?.[tx] === civ.id) return true
      if (civManager.territoryMap[ty - d]?.[tx] === civ.id) return true
    }
    return false
  }
}
