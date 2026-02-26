// CreatureAgingSystem — tracks creature visual aging, life stages, and
// age-based stat modifiers. Elders/Ancients mentor nearby young creatures.

import { EntityManager, EntityId, CreatureComponent, NeedsComponent, PositionComponent } from '../ecs/Entity'
import { SpatialHashSystem } from './SpatialHashSystem'

// ── Constants ────────────────────────────────────────────────────────

const AGING_UPDATE_INTERVAL = 30
const MENTOR_RADIUS = 8
const MENTOR_STAT_BOOST = 0.05

/** Life stage age thresholds (inclusive lower bound) */
const STAGE_THRESHOLDS = [
  { name: 'BABY',    minAge: 0,  maxAge: 5  },
  { name: 'CHILD',   minAge: 5,  maxAge: 15 },
  { name: 'ADULT',   minAge: 15, maxAge: 60 },
  { name: 'ELDER',   minAge: 60, maxAge: 90 },
  { name: 'ANCIENT', minAge: 90, maxAge: Infinity },
] as const

/** Per-stage multipliers and modifiers */
const STAGE_STATS: Record<LifeStage, StageModifiers> = {
  BABY:    { size: 0.5,  speed: 0.6, combat: 0.1, wisdom: 0,   deathChance: 0,     tint: { r: 30, g: 30, b: 30 } },
  CHILD:   { size: 0.7,  speed: 0.9, combat: 0.4, wisdom: 0,   deathChance: 0,     tint: { r: 15, g: 15, b: 15 } },
  ADULT:   { size: 1.0,  speed: 1.0, combat: 1.0, wisdom: 0.1, deathChance: 0,     tint: { r: 0,  g: 0,  b: 0  } },
  ELDER:   { size: 0.9,  speed: 0.7, combat: 0.8, wisdom: 0.3, deathChance: 0.001, tint: { r: -15, g: -15, b: -5 } },
  ANCIENT: { size: 0.85, speed: 0.5, combat: 0.6, wisdom: 0.5, deathChance: 0.005, tint: { r: -30, g: -30, b: -10 } },
}

// ── Types ────────────────────────────────────────────────────────────

/** Possible life stages a creature can be in */
export type LifeStage = 'BABY' | 'CHILD' | 'ADULT' | 'ELDER' | 'ANCIENT'

/** RGB color tint modifier applied to creature rendering */
export interface ColorTint {
  r: number
  g: number
  b: number
}

interface StageModifiers {
  size: number
  speed: number
  combat: number
  wisdom: number
  deathChance: number
  tint: ColorTint
}

// ── System ───────────────────────────────────────────────────────────

/**
 * Tracks creature life stages based on age and provides visual/stat modifiers.
 *
 * Each creature progresses through BABY -> CHILD -> ADULT -> ELDER -> ANCIENT
 * stages. Each stage affects size, speed, combat ability, and visual appearance.
 * Elders and Ancients naturally risk death each tick and can mentor nearby
 * young creatures, boosting their stats.
 */
export class CreatureAgingSystem {
  private stageCache: Map<EntityId, LifeStage> = new Map()

  /**
   * Process aging effects for all creatures: update cached stages,
   * apply natural death rolls, and run mentor bonuses.
   * @param tick Current game tick
   * @param em   Entity manager
   * @param spatial Spatial hash for nearby queries (optional, enables mentoring)
   */
  update(tick: number, em: EntityManager, spatial?: SpatialHashSystem): void {
    if (tick % AGING_UPDATE_INTERVAL !== 0) return

    const creatures = em.getEntitiesWithComponents('creature', 'needs')

    for (let i = 0; i < creatures.length; i++) {
      const id = creatures[i]
      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      const needs = em.getComponent<NeedsComponent>(id, 'needs')
      if (!creature || !needs) continue
      const stage = this.resolveStage(creature.age)
      this.stageCache.set(id, stage)

      // Natural death chance for elders/ancients
      const stats = STAGE_STATS[stage]
      if (stats.deathChance > 0 && Math.random() < stats.deathChance) {
        needs.health = 0
      }

      // Mentor effect: elders/ancients boost nearby young creatures
      if (spatial && (stage === 'ELDER' || stage === 'ANCIENT')) {
        this.applyMentorEffect(id, em, spatial, stats.wisdom)
      }
    }

    // Cleanup removed entities
    for (const id of this.stageCache.keys()) {
      if (!em.hasComponent(id, 'creature')) this.stageCache.delete(id)
    }
  }

  /**
   * Returns the current life stage name for a creature.
   * @param entityId Target entity
   */
  getLifeStage(entityId: EntityId): LifeStage {
    return this.stageCache.get(entityId) ?? 'ADULT'
  }

  /**
   * Returns the size multiplier for rendering based on life stage.
   * @param entityId Target entity
   */
  getSizeMultiplier(entityId: EntityId): number {
    return STAGE_STATS[this.getLifeStage(entityId)].size
  }

  /**
   * Returns the speed multiplier based on life stage.
   * @param entityId Target entity
   */
  getSpeedMultiplier(entityId: EntityId): number {
    return STAGE_STATS[this.getLifeStage(entityId)].speed
  }

  /**
   * Returns the combat strength multiplier based on life stage.
   * @param entityId Target entity
   */
  getCombatMultiplier(entityId: EntityId): number {
    return STAGE_STATS[this.getLifeStage(entityId)].combat
  }

  /**
   * Returns the RGB color tint modifier for rendering.
   * Positive values lighten (babies), negative values darken/grey (elders).
   * @param entityId Target entity
   */
  getColorTint(entityId: EntityId): ColorTint {
    return STAGE_STATS[this.getLifeStage(entityId)].tint
  }

  /**
   * Returns the wisdom bonus (0-0.5) for the creature's life stage.
   * Higher wisdom improves tech contribution and mentoring effectiveness.
   * @param entityId Target entity
   */
  getWisdomBonus(entityId: EntityId): number {
    return STAGE_STATS[this.getLifeStage(entityId)].wisdom
  }

  // ── Private helpers ────────────────────────────────────────────────

  private resolveStage(age: number): LifeStage {
    for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i--) {
      if (age >= STAGE_THRESHOLDS[i].minAge) {
        return STAGE_THRESHOLDS[i].name
      }
    }
    return 'BABY'
  }

  private applyMentorEffect(
    mentorId: EntityId,
    em: EntityManager,
    spatial: SpatialHashSystem,
    wisdom: number
  ): void {
    const pos = em.getComponent<PositionComponent>(mentorId, 'position')
    if (!pos) return

    const nearby = spatial.query(pos.x, pos.y, MENTOR_RADIUS)
    const boost = MENTOR_STAT_BOOST * wisdom

    for (let i = 0; i < nearby.length; i++) {
      const otherId = nearby[i]
      if (otherId === mentorId) continue

      const otherCreature = em.getComponent<CreatureComponent>(otherId, 'creature')
      if (!otherCreature) continue

      const otherStage = this.stageCache.get(otherId) ?? this.resolveStage(otherCreature.age)
      if (otherStage !== 'BABY' && otherStage !== 'CHILD') continue

      // Boost young creature's speed and damage slightly
      otherCreature.speed *= (1 + boost)
      otherCreature.damage *= (1 + boost)
    }
  }
}
