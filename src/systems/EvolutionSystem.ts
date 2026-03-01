// Creature Evolution System - environmental adaptation & natural selection

import { EntityManager, EntityId, CreatureComponent, PositionComponent, NeedsComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EventLog } from './EventLog'

// --- Interfaces ---

export interface EvolutionTrait {
  name: string
  description: string
  effect: 'health_boost' | 'speed_boost' | 'hunger_slow' | 'frost_immune' | 'aquatic' | 'stealth' | 'defense_boost' | 'disease_resist'
  magnitude: number // 0.0-1.0
  source: 'environment' | 'natural_selection' | 'inherited'
}

export interface SpeciesEvolution {
  species: string
  traits: Map<string, { count: number; total: number }> // trait name -> how many have it / total pop
  deathCauses: { combat: number; hunger: number; disease: number; age: number; disaster: number }
  generation: number
  adaptationProgress: Map<string, number> // terrain type -> exposure ticks (0-1000, at 1000 trait unlocks)
}

// --- Trait definitions ---

const TERRAIN_TRAITS: Record<string, EvolutionTrait> = {
  mountain: {
    name: 'Mountain Hardy',
    description: 'Adapted to high altitudes, gaining increased vitality',
    effect: 'health_boost',
    magnitude: 0.2,
    source: 'environment',
  },
  forest: {
    name: 'Forest Stealth',
    description: 'Blends into woodland, harder to detect in combat',
    effect: 'stealth',
    magnitude: 0.15,
    source: 'environment',
  },
  sand: {
    name: 'Desert Endurance',
    description: 'Efficient metabolism reduces hunger in arid conditions',
    effect: 'hunger_slow',
    magnitude: 0.3,
    source: 'environment',
  },
  snow: {
    name: 'Frost Resistant',
    description: 'Immune to freezing effects',
    effect: 'frost_immune',
    magnitude: 1.0,
    source: 'environment',
  },
  water: {
    name: 'Aquatic',
    description: 'Can traverse shallow water without penalty',
    effect: 'aquatic',
    magnitude: 1.0,
    source: 'environment',
  },
}

/** Map TileType to the terrain key used in TERRAIN_TRAITS / adaptationProgress */
function tileToTerrainKey(tile: TileType): string | null {
  switch (tile) {
    case TileType.MOUNTAIN: return 'mountain'
    case TileType.FOREST: return 'forest'
    case TileType.SAND: return 'sand'
    case TileType.SNOW: return 'snow'
    case TileType.SHALLOW_WATER: return 'water'
    default: return null
  }
}

const ADAPTATION_THRESHOLD = 1000 // ticks of exposure needed to unlock a trait
const SELECTION_TRAIT_NAMES: readonly string[] = ['Battle Hardened', 'Efficient Metabolism', 'Disease Resistant']
const INHERITANCE_RATIO = 0.6     // 60% of species must have trait for auto-inherit
const SELECTION_DEATH_THRESHOLD = 20 // deaths before natural selection kicks in
/** Pre-computed causes array — avoids per-call literal array in checkNaturalSelection */
const _DEATH_CAUSES: ReadonlyArray<'combat' | 'hunger' | 'disease'> = ['combat', 'hunger', 'disease'] as const

// Natural selection trait templates (created dynamically per species)
function makeSelectionTrait(cause: 'combat' | 'hunger' | 'disease'): EvolutionTrait {
  switch (cause) {
    case 'combat':
      return {
        name: 'Battle Hardened',
        description: 'Natural selection favored tougher individuals',
        effect: 'defense_boost',
        magnitude: 0.05,
        source: 'natural_selection',
      }
    case 'hunger':
      return {
        name: 'Efficient Metabolism',
        description: 'Natural selection favored those who need less food',
        effect: 'hunger_slow',
        magnitude: 0.1,
        source: 'natural_selection',
      }
    case 'disease':
      return {
        name: 'Disease Resistant',
        description: 'Natural selection favored immune resilience',
        effect: 'disease_resist',
        magnitude: 0.1,
        source: 'natural_selection',
      }
  }
}

// --- Per-creature tracking (lightweight, keyed by entity id) ---

/** Tracks which traits have been applied to a specific creature */
const creatureTraits: Map<EntityId, Set<string>> = new Map()

// --- System ---

export class EvolutionSystem {
  private speciesData: Map<string, SpeciesEvolution> = new Map()
  private tickCounter: number = 0
  private _speciesGroups: Map<string, EntityId[]> = new Map()
  private _traitsBuf: EvolutionTrait[] = []

  /** Main update — call every tick, internally throttles to every 60 ticks. */
  update(em: EntityManager, world: World, tick: number): void {
    this.tickCounter++
    if (this.tickCounter % 60 !== 0) return

    const creatures = em.getEntitiesWithComponents('creature', 'position', 'needs')
    if (creatures.length === 0) return

    // 1. Group creatures by species and track terrain exposure
    const speciesGroups = this._speciesGroups
    for (const arr of speciesGroups.values()) arr.length = 0

    for (const id of creatures) {
      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!creature || !pos) continue

      let group = speciesGroups.get(creature.species)
      if (!group) {
        group = []
        speciesGroups.set(creature.species, group)
      } else if (group.length === 0) {
        // already reset above; reuse
      }
      group.push(id)

      // Ensure species data exists
      if (!this.speciesData.has(creature.species)) {
        this.speciesData.set(creature.species, this.createSpeciesData(creature.species))
      }

      const specData = this.speciesData.get(creature.species)
      if (!specData) continue

      // Accumulate terrain exposure
      const tx = Math.floor(pos.x)
      const ty = Math.floor(pos.y)
      if (tx >= 0 && tx < world.width && ty >= 0 && ty < world.height) {
        const tile = world.tiles[ty][tx]
        const terrainKey = tileToTerrainKey(tile)
        if (terrainKey) {
          const current = specData.adaptationProgress.get(terrainKey) || 0
          // Each creature on this terrain contributes 1 tick of exposure per update cycle
          specData.adaptationProgress.set(terrainKey, Math.min(ADAPTATION_THRESHOLD, current + 1))
        }
      }
    }

    // 2. Check adaptation thresholds and unlock traits
    for (const [species, specData] of this.speciesData) {
      for (const [terrainKey, progress] of specData.adaptationProgress) {
        if (progress >= ADAPTATION_THRESHOLD) {
          const traitDef = TERRAIN_TRAITS[terrainKey]
          if (!traitDef) continue

          // Check if species already has this trait counted
          if (!specData.traits.has(traitDef.name)) {
            specData.traits.set(traitDef.name, { count: 0, total: 0 })
            EventLog.log('mutation', `${species} evolved: ${traitDef.name}!`, tick)
          }
        }
      }

      // 3. Natural selection pressure
      this.checkNaturalSelection(specData, tick)
    }

    // 4. Update trait distribution counts
    for (const [species, ids] of speciesGroups) {
      const specData = this.speciesData.get(species)
      if (!specData) continue

      // Reset counts
      for (const [, stat] of specData.traits) {
        stat.count = 0
        stat.total = ids.length
      }

      // Count how many creatures have each trait
      for (const id of ids) {
        const applied = creatureTraits.get(id)
        if (!applied) continue
        for (const traitName of applied) {
          const stat = specData.traits.get(traitName)
          if (stat) stat.count++
        }
      }

      specData.generation = Math.max(specData.generation, ids.length)
    }

    // 5. Apply traits to creatures that don't have them yet
    for (const id of creatures) {
      this.applyTraitsToCreature(id, em)
    }

    // Cleanup dead entities from creatureTraits
    for (const id of creatureTraits.keys()) {
      if (!em.hasComponent(id, 'creature')) {
        creatureTraits.delete(id)
      }
    }
  }

  /** Record a death cause for natural selection tracking. */
  recordDeath(species: string, cause: 'combat' | 'hunger' | 'disease' | 'age' | 'disaster'): void {
    if (!this.speciesData.has(species)) {
      this.speciesData.set(species, this.createSpeciesData(species))
    }
    const specData = this.speciesData.get(species)
    if (!specData) return
    specData.deathCauses[cause]++
  }

  /** Get all evolution traits unlocked for a species. */
  getSpeciesTraits(species: string): EvolutionTrait[] {
    const specData = this.speciesData.get(species)
    if (!specData) return []

    const result = this._traitsBuf; result.length = 0

    // Environment traits (unlocked when adaptation reaches threshold)
    for (const [terrainKey, progress] of specData.adaptationProgress) {
      if (progress >= ADAPTATION_THRESHOLD) {
        const traitDef = TERRAIN_TRAITS[terrainKey]
        if (traitDef) result.push(traitDef)
      }
    }

    // Natural selection traits
    for (const [traitName, stat] of specData.traits) {
      // Only include traits not already from environment
      if (result.some(t => t.name === traitName)) continue
      if (stat.count > 0 || stat.total === 0) {
        // Find matching selection trait
        const selectionTraits = SELECTION_TRAIT_NAMES
        if (selectionTraits.includes(traitName)) {
          const cause = traitName === 'Battle Hardened' ? 'combat'
            : traitName === 'Efficient Metabolism' ? 'hunger'
            : 'disease'
          result.push(makeSelectionTrait(cause))
        }
      }
    }

    return result
  }

  /** Apply all unlocked species traits to a specific creature. */
  applyTraitsToCreature(entityId: EntityId, em: EntityManager): void {
    const creature = em.getComponent<CreatureComponent>(entityId, 'creature')
    if (!creature) return

    const specData = this.speciesData.get(creature.species)
    if (!specData) return

    if (!creatureTraits.has(entityId)) {
      creatureTraits.set(entityId, new Set())
    }
    const applied = creatureTraits.get(entityId)
    if (!applied) return

    const traits = this.getSpeciesTraits(creature.species)
    const needs = em.getComponent<NeedsComponent>(entityId, 'needs')

    for (const trait of traits) {
      if (applied.has(trait.name)) continue // already applied

      // Check inheritance: if trait source is environment but species ratio < threshold,
      // only apply if the species has fully unlocked it
      if (trait.source === 'environment') {
        const terrainKey = this.traitToTerrainKey(trait.name)
        if (terrainKey) {
          const progress = specData.adaptationProgress.get(terrainKey) || 0
          if (progress < ADAPTATION_THRESHOLD) continue
        }
      }

      // Apply the trait effect
      switch (trait.effect) {
        case 'health_boost':
          if (needs) {
            needs.health = Math.min(100, needs.health + 100 * trait.magnitude)
          }
          break
        case 'stealth':
          // Stealth is read by combat system; we mark it as applied
          // The +15% dodge is checked via hasEvolutionTrait()
          break
        case 'hunger_slow':
          // Hunger slow is checked via getHungerMultiplier()
          break
        case 'frost_immune':
          // Frost immunity is checked via hasFrostImmunity()
          break
        case 'aquatic':
          // Aquatic movement is checked via isAquatic()
          break
        case 'defense_boost':
          // Defense boost is checked via getDefenseBonus()
          break
        case 'disease_resist':
          // Disease resistance is checked via getDiseaseResistance()
          break
        case 'speed_boost':
          creature.speed *= (1 + trait.magnitude)
          break
      }

      applied.add(trait.name)
    }

    // Auto-inherit: if species ratio exceeds threshold, new creatures get traits for free
    for (const [traitName, stat] of specData.traits) {
      if (applied.has(traitName)) continue
      if (stat.total > 0 && stat.count / stat.total >= INHERITANCE_RATIO) {
        applied.add(traitName)
        // Apply inherited trait effects same as above
        const matchingTrait = traits.find(t => t.name === traitName)
        if (matchingTrait && matchingTrait.effect === 'health_boost' && needs) {
          needs.health = Math.min(100, needs.health + 100 * matchingTrait.magnitude)
        }
        if (matchingTrait && matchingTrait.effect === 'speed_boost') {
          creature.speed *= (1 + matchingTrait.magnitude)
        }
      }
    }
  }

  // --- Static query helpers (for other systems to check traits) ---

  /** Check if a creature has a specific evolution trait. */
  static hasEvolutionTrait(entityId: EntityId, traitName: string): boolean {
    const applied = creatureTraits.get(entityId)
    return applied ? applied.has(traitName) : false
  }

  /** Get hunger rate multiplier for a creature (< 1.0 means slower hunger). */
  static getHungerMultiplier(entityId: EntityId): number {
    const applied = creatureTraits.get(entityId)
    if (!applied) return 1.0
    let mult = 1.0
    if (applied.has('Desert Endurance')) mult *= 0.7   // -30%
    if (applied.has('Efficient Metabolism')) mult *= 0.9 // -10%
    return mult
  }

  /** Check if creature is immune to frost. */
  static hasFrostImmunity(entityId: EntityId): boolean {
    return EvolutionSystem.hasEvolutionTrait(entityId, 'Frost Resistant')
  }

  /** Check if creature can move in shallow water. */
  static isAquatic(entityId: EntityId): boolean {
    return EvolutionSystem.hasEvolutionTrait(entityId, 'Aquatic')
  }

  /** Get defense bonus from natural selection (0.0 = none). */
  static getDefenseBonus(entityId: EntityId): number {
    return EvolutionSystem.hasEvolutionTrait(entityId, 'Battle Hardened') ? 0.05 : 0
  }

  /** Get disease resistance bonus (0.0 = none). */
  static getDiseaseResistance(entityId: EntityId): number {
    return EvolutionSystem.hasEvolutionTrait(entityId, 'Disease Resistant') ? 0.1 : 0
  }

  /** Get stealth/dodge bonus (0.0 = none). */
  static getStealthBonus(entityId: EntityId): number {
    return EvolutionSystem.hasEvolutionTrait(entityId, 'Forest Stealth') ? 0.15 : 0
  }

  // --- Private helpers ---

  private createSpeciesData(species: string): SpeciesEvolution {
    return {
      species,
      traits: new Map(),
      deathCauses: { combat: 0, hunger: 0, disease: 0, age: 0, disaster: 0 },
      generation: 0,
      adaptationProgress: new Map(),
    }
  }

  private checkNaturalSelection(specData: SpeciesEvolution, tick: number): void {
    const { deathCauses } = specData
    const causes = _DEATH_CAUSES

    for (const cause of causes) {
      if (deathCauses[cause] >= SELECTION_DEATH_THRESHOLD) {
        const trait = makeSelectionTrait(cause)
        if (!specData.traits.has(trait.name)) {
          specData.traits.set(trait.name, { count: 0, total: 0 })
          EventLog.log('mutation', `${specData.species} developed ${trait.name} through natural selection`, tick)
        }
        // Reset counter so it can trigger again for stacking (but trait won't double-apply)
        deathCauses[cause] = 0
      }
    }
  }

  private traitToTerrainKey(traitName: string): string | null {
    switch (traitName) {
      case 'Mountain Hardy': return 'mountain'
      case 'Forest Stealth': return 'forest'
      case 'Desert Endurance': return 'sand'
      case 'Frost Resistant': return 'snow'
      case 'Aquatic': return 'water'
      default: return null
    }
  }
}
