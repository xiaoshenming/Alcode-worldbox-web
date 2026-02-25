// Resource Scarcity System — tracks per-civilization resource levels and applies
// famine, drought, starvation, and building-decay effects when resources run low.

/** Resource types tracked per civilization */
export type ScarcityResource = 'FOOD' | 'WOOD' | 'STONE' | 'GOLD' | 'WATER'

/** Scarcity threshold levels */
export type ScarcityLevel = 'ABUNDANT' | 'SUFFICIENT' | 'SCARCE' | 'CRITICAL' | 'DEPLETED'

/** Per-resource tracking data */
export interface ResourceStock {
  current: number
  capacity: number
  consumptionRate: number
  productionRate: number
}

/** Full resource state for one civilization */
export interface CivResourceState {
  resources: Record<ScarcityResource, ResourceStock>
  famineTicks: number
  droughtTicks: number
}

interface CivManagerLike {
  civilizations: Map<number, CivLike>
}
interface CivLike {
  id: number
  population: number
  resources: { food: number; wood: number; stone: number; gold: number }
  territory: { size: number }
  relations: Map<number, number>
}
interface EntityManagerLike {
  getEntitiesWithComponents(...types: string[]): number[]
  getComponent(id: number, type: string): unknown
}
interface WorldLike { tick: number; season?: string }

const ALL_RESOURCES: ScarcityResource[] = ['FOOD', 'WOOD', 'STONE', 'GOLD', 'WATER']
const SCARCITY_CHECK_INTERVAL = 30
const FAMINE_THRESHOLD_TICKS = 120
const STARVATION_HEALTH_DRAIN = 0.8
const WAR_LIKELIHOOD_BONUS = 0.25
const MIGRATION_CHANCE = 0.04
const DEFAULT_CAPACITY = 200
const DEFAULT_CONSUMPTION: Record<ScarcityResource, number> = {
  FOOD: 0.5, WOOD: 0.15, STONE: 0.05, GOLD: 0.02, WATER: 0.3,
}
const DEFAULT_PRODUCTION: Record<ScarcityResource, number> = {
  FOOD: 0.6, WOOD: 0.2, STONE: 0.08, GOLD: 0.03, WATER: 0.35,
}

function percentToLevel(pct: number): ScarcityLevel {
  if (pct <= 0) return 'DEPLETED'
  if (pct < 0.25) return 'CRITICAL'
  if (pct < 0.50) return 'SCARCE'
  if (pct < 0.75) return 'SUFFICIENT'
  return 'ABUNDANT'
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

/**
 * Models resource scarcity, famine, and drought effects on civilizations.
 * Tracks FOOD, WOOD, STONE, GOLD, WATER per civ with thresholds:
 * ABUNDANT (>75%), SUFFICIENT (50-75%), SCARCE (25-50%), CRITICAL (<25%), DEPLETED (0%).
 */
export class ResourceScarcitySystem {
  private states: Map<number, CivResourceState> = new Map()

  /** Process resource consumption/production and apply scarcity effects */
  update(tick: number, civManager: CivManagerLike, _em: EntityManagerLike, world: WorldLike): void {
    for (const [civId] of civManager.civilizations) {
      if (!this.states.has(civId)) this.states.set(civId, this.createDefaultState())
    }
    for (const civId of this.states.keys()) {
      if (!civManager.civilizations.has(civId)) this.states.delete(civId)
    }
    for (const [civId, civ] of civManager.civilizations) {
      this.syncFromCiv(civId, civ)
    }

    // Resource tick: production and consumption
    for (const [civId, state] of this.states) {
      const civ = civManager.civilizations.get(civId)
      if (!civ) continue
      const popFactor = Math.max(1, civ.population * 0.1)
      const sMod = this.seasonModifier(world)
      for (const res of ALL_RESOURCES) {
        const s = state.resources[res]
        const prod = s.productionRate * sMod * (res === 'FOOD' && this.isDrought(civId) ? 0.5 : 1)
        s.current = clamp(s.current + prod - s.consumptionRate * popFactor, 0, s.capacity)
      }
      // Track famine / drought duration
      const fl = this.getResourceLevel(civId, 'FOOD')
      if (fl === 'CRITICAL' || fl === 'DEPLETED') state.famineTicks++
      else state.famineTicks = Math.max(0, state.famineTicks - 2)

      const wl = this.getResourceLevel(civId, 'WATER')
      if (wl === 'SCARCE' || wl === 'CRITICAL' || wl === 'DEPLETED') state.droughtTicks++
      else state.droughtTicks = Math.max(0, state.droughtTicks - 2)
    }

    if (tick % SCARCITY_CHECK_INTERVAL !== 0) return

    for (const [civId, civ] of civManager.civilizations) {
      const state = this.states.get(civId)
      if (!state) continue
      const foodLevel = this.getResourceLevel(civId, 'FOOD')
      if (foodLevel === 'DEPLETED') civ.resources.food = 0
      if (foodLevel === 'CRITICAL' || foodLevel === 'DEPLETED') {
        civ.resources.food = Math.max(0, civ.resources.food - civ.population * 0.1)
      }
      if (this.getResourceLevel(civId, 'WOOD') === 'DEPLETED') civ.resources.wood = 0
      if (state.famineTicks >= FAMINE_THRESHOLD_TICKS) {
        this.processFamineEvent(civId, civ, civManager)
      }
    }
  }

  /** Get the scarcity level for a specific resource of a civilization */
  getResourceLevel(civId: number, resource: ScarcityResource): ScarcityLevel {
    return percentToLevel(this.getResourcePercent(civId, resource))
  }

  /** Get the resource percentage (0-1) for a civilization's resource */
  getResourcePercent(civId: number, resource: ScarcityResource): number {
    const state = this.states.get(civId)
    if (!state) return 1
    const s = state.resources[resource]
    return s.capacity <= 0 ? 0 : clamp(s.current / s.capacity, 0, 1)
  }

  /** Whether the civilization is in famine (food CRITICAL for 120+ ticks) */
  isFamine(civId: number): boolean {
    const state = this.states.get(civId)
    return state ? state.famineTicks >= FAMINE_THRESHOLD_TICKS : false
  }

  /** Whether the civilization is in drought (water SCARCE or worse) */
  isDrought(civId: number): boolean {
    const wl = this.getResourceLevel(civId, 'WATER')
    return wl === 'SCARCE' || wl === 'CRITICAL' || wl === 'DEPLETED'
  }

  /** Production modifier (0.1-1.0), reduced by drought and food/wood scarcity */
  getProductionModifier(civId: number): number {
    let m = 1.0
    if (this.isDrought(civId)) m *= 0.5
    const foodPct = this.getResourcePercent(civId, 'FOOD')
    if (foodPct < 0.5) m *= 0.5 + foodPct
    if (this.getResourcePercent(civId, 'WOOD') < 0.25) m *= 0.7
    return clamp(m, 0.1, 1.0)
  }

  /** Health drain per tick from starvation (0 if no starvation) */
  getHealthDrain(civId: number): number {
    const fl = this.getResourceLevel(civId, 'FOOD')
    if (fl === 'DEPLETED') return STARVATION_HEALTH_DRAIN
    if (fl === 'CRITICAL') return STARVATION_HEALTH_DRAIN * 0.3
    return 0
  }

  // ── Private ───────────────────────────────────────────────────────────

  private createDefaultState(): CivResourceState {
    const resources = {} as Record<ScarcityResource, ResourceStock>
    for (const res of ALL_RESOURCES) {
      resources[res] = {
        current: DEFAULT_CAPACITY * 0.6,
        capacity: DEFAULT_CAPACITY,
        consumptionRate: DEFAULT_CONSUMPTION[res],
        productionRate: DEFAULT_PRODUCTION[res],
      }
    }
    return { resources, famineTicks: 0, droughtTicks: 0 }
  }

  private syncFromCiv(civId: number, civ: CivLike): void {
    const state = this.states.get(civId)
    if (!state) return
    const bonus = Math.max(1, civ.territory.size * 0.5)
    for (const res of ALL_RESOURCES) state.resources[res].capacity = DEFAULT_CAPACITY + bonus
    state.resources.FOOD.current = clamp(civ.resources.food, 0, state.resources.FOOD.capacity)
    state.resources.WOOD.current = clamp(civ.resources.wood, 0, state.resources.WOOD.capacity)
    state.resources.STONE.current = clamp(civ.resources.stone, 0, state.resources.STONE.capacity)
    state.resources.GOLD.current = clamp(civ.resources.gold, 0, state.resources.GOLD.capacity)
  }

  private seasonModifier(world: WorldLike): number {
    switch (world.season) {
      case 'spring': return 1.2
      case 'summer': return 1.0
      case 'autumn': return 0.8
      case 'winter': return 0.4
      default: return 1.0
    }
  }

  private processFamineEvent(civId: number, civ: CivLike, civManager: CivManagerLike): void {
    // Migration: population drifts away from famine areas
    if (Math.random() < MIGRATION_CHANCE && civ.population > 2) {
      civ.population = Math.max(1, civ.population - 1)
    }
    // Resource wars: worsen relations with resource-rich neighbors
    for (const [otherId, relation] of civ.relations) {
      if (relation > -80 && civManager.civilizations.has(otherId)) {
        if (this.getResourcePercent(otherId, 'FOOD') > 0.5) {
          civ.relations.set(otherId, Math.max(-100, relation - WAR_LIKELIHOOD_BONUS * 100))
        }
      }
    }
  }
}
