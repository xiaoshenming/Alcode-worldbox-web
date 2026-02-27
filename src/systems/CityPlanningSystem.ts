// City planning, population management, tax, happiness, and resource production system

import { CivManager } from '../civilization/CivManager'
import { Civilization, BuildingType, BuildingComponent } from '../civilization/Civilization'
import { EntityManager, PositionComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'
import { TileType } from '../utils/Constants'

interface CityLevel {
  name: string
  level: number
  multiplier: number
  maxPop: number
}

const CITY_LEVELS: CityLevel[] = [
  { name: 'Village', level: 1, multiplier: 1.0, maxPop: 15 },
  { name: 'Town', level: 2, multiplier: 1.3, maxPop: 35 },
  { name: 'City', level: 3, multiplier: 1.6, maxPop: 60 },
  { name: 'Metropolis', level: 4, multiplier: 2.0, maxPop: 100 },
]

const TAX_TABLE: { gold: number; happiness: number }[] = [
  { gold: 0, happiness: 0 },   // 0 = no tax
  { gold: 2, happiness: -1 },  // 1 = low
  { gold: 5, happiness: -3 },  // 2 = medium
  { gold: 10, happiness: -6 }, // 3 = high
]

const HOUSING_CAPACITY: Partial<Record<BuildingType, number>> = {
  [BuildingType.HUT]: 2,
  [BuildingType.HOUSE]: 4,
  [BuildingType.CASTLE]: 8,
}

export class CityPlanningSystem {
  private buildingCounts: Map<number, Map<BuildingType, number>> = new Map()

  getCityLevel(civ: Civilization): CityLevel {
    const pop = civ.population
    const bldg = civ.buildings.length
    if (pop >= 50 && bldg >= 25) return CITY_LEVELS[3]
    if (pop >= 25 && bldg >= 12) return CITY_LEVELS[2]
    if (pop >= 10 && bldg >= 5) return CITY_LEVELS[1]
    return CITY_LEVELS[0]
  }

  update(civManager: CivManager, em: EntityManager, world: World, particles: ParticleSystem, tick: number): void {
    for (const [, civ] of civManager.civilizations) {
      this.cacheBuildingCounts(civ, em)
      const cl = this.getCityLevel(civ)

      // Resource production every 60 ticks
      if (tick % 60 === 0) this.produceResources(civ, cl)

      // Tax & happiness every 120 ticks
      if (tick % 120 === 0) {
        this.collectTax(civ)
        this.updateHappiness(civ, em, civManager, cl)
        this.autoAdjustTax(civ)
      }

      // City expansion every 180 ticks
      if (tick % 180 === 0) this.planExpansion(civ, em, civManager, world, particles, cl)
    }
  }

  // --- Building count cache ---

  private cacheBuildingCounts(civ: Civilization, em: EntityManager): void {
    const counts = new Map<BuildingType, number>()
    for (const id of civ.buildings) {
      const b = em.getComponent<BuildingComponent>(id, 'building')
      if (b) counts.set(b.buildingType, (counts.get(b.buildingType) ?? 0) + 1)
    }
    this.buildingCounts.set(civ.id, counts)
  }

  private count(civId: number, type: BuildingType): number {
    return this.buildingCounts.get(civId)?.get(type) ?? 0
  }

  private has(civId: number, type: BuildingType): boolean {
    return this.count(civId, type) > 0
  }

  // --- Housing ---

  private getHousingCapacity(civ: Civilization, em: EntityManager): number {
    let cap = 0
    for (const id of civ.buildings) {
      const b = em.getComponent<BuildingComponent>(id, 'building')
      if (b) cap += (HOUSING_CAPACITY[b.buildingType] ?? 0) * b.level
    }
    return cap
  }

  // --- Resource production ---

  private produceResources(civ: Civilization, cl: CityLevel): void {
    const counts = this.buildingCounts.get(civ.id)
    if (!counts) return
    const m = cl.multiplier
    const hasGranary = this.has(civ.id, BuildingType.GRANARY)

    // FARM: +3 food each
    civ.resources.food += (counts.get(BuildingType.FARM) ?? 0) * 3 * m
    // MINE: +2 stone, +1 gold each
    const mines = counts.get(BuildingType.MINE) ?? 0
    civ.resources.stone += mines * 2 * m
    civ.resources.gold += mines * 1 * m
    // MARKET: +3 gold each
    civ.resources.gold += (counts.get(BuildingType.MARKET) ?? 0) * 3 * m
    // WORKSHOP: +2 wood, +1 stone each
    const workshops = counts.get(BuildingType.WORKSHOP) ?? 0
    civ.resources.wood += workshops * 2 * m
    civ.resources.stone += workshops * 1 * m

    // Food consumption (GRANARY reduces 20%)
    const consumption = civ.population * 0.5
    civ.resources.food -= hasGranary ? consumption * 0.8 : consumption
    if (civ.resources.food < 0) civ.resources.food = 0
  }

  // --- Tax ---

  private collectTax(civ: Civilization): void {
    const t = TAX_TABLE[civ.taxRate] ?? TAX_TABLE[0]
    civ.resources.gold += t.gold
    civ.happiness = Math.max(0, Math.min(100, civ.happiness + t.happiness))
  }

  private autoAdjustTax(civ: Civilization): void {
    if (civ.resources.gold < 20 && civ.taxRate < 3 && civ.happiness > 35) {
      civ.taxRate++
    } else if (civ.happiness < 30 && civ.taxRate > 0) {
      civ.taxRate--
    }
  }

  // --- Happiness ---

  private updateHappiness(civ: Civilization, em: EntityManager, civManager: CivManager, cl: CityLevel): void {
    let delta = 1 // base recovery

    // Building bonuses
    if (this.has(civ.id, BuildingType.MARKET)) delta += 2
    if (this.has(civ.id, BuildingType.TEMPLE)) delta += 3
    if (this.has(civ.id, BuildingType.ACADEMY)) delta += 1

    // Overcrowding
    const housing = this.getHousingCapacity(civ, em)
    if (housing > 0 && civ.population > housing) delta -= 5

    // At war
    for (const [, rel] of civ.relations) {
      if (rel <= -50) { delta -= 3; break }
    }

    civ.happiness = Math.max(0, Math.min(100, civ.happiness + delta))

    // Revolt check
    if (civ.happiness < 20 && civ.population > 2 && Math.random() < 0.1) {
      const lost = Math.max(1, Math.floor(civ.population * 0.1))
      civ.population = Math.max(0, civ.population - lost)
      civ.happiness = Math.min(100, civ.happiness + 10) // tension release
      EventLog.log('war', `Revolt in ${civ.name}! ${lost} citizens fled (happiness ${Math.round(civ.happiness)}%)`, 0)
    }
  }

  // --- City expansion ---

  private planExpansion(
    civ: Civilization, em: EntityManager, civManager: CivManager,
    world: World, particles: ParticleSystem, cl: CityLevel
  ): void {
    const housing = this.getHousingCapacity(civ, em)
    const r = civ.resources
    const pop = civ.population

    // Priority queue of build actions
    type Plan = { type: BuildingType; check: () => boolean }
    const plans: Plan[] = [
      {
        type: BuildingType.HOUSE,
        check: () => housing > 0 && pop / housing > 0.8 && r.wood >= 20,
      },
      {
        type: BuildingType.FARM,
        check: () => r.food < pop * 5 && r.wood >= 10,
      },
      {
        type: BuildingType.MARKET,
        check: () => r.gold < 50 && cl.level >= 2 && !this.has(civ.id, BuildingType.MARKET) && r.wood >= 30 && r.stone >= 20,
      },
      {
        type: BuildingType.GRANARY,
        check: () => pop >= 15 && !this.has(civ.id, BuildingType.GRANARY) && r.wood >= 25 && r.stone >= 15,
      },
      {
        type: BuildingType.WORKSHOP,
        check: () => civ.techLevel >= 3 && !this.has(civ.id, BuildingType.WORKSHOP) && r.wood >= 30 && r.stone >= 30,
      },
      {
        type: BuildingType.ACADEMY,
        check: () => civ.techLevel >= 4 && !this.has(civ.id, BuildingType.ACADEMY) && r.stone >= 40 && r.gold >= 20,
      },
    ]

    for (const plan of plans) {
      if (!plan.check()) continue
      const pos = this.findBuildSite(civ, em, world)
      if (!pos) break

      // Deduct resources
      this.deductCost(r, plan.type)
      const placed = civManager.placeBuilding(civ.id, plan.type, pos.x, pos.y)
      if (placed) {
        EventLog.log('building', `${civ.name} built a ${plan.type}`, 0)
        particles.spawnFirework(pos.x, pos.y, civ.color)
      }
      break // one building per cycle
    }
  }

  private deductCost(r: Civilization['resources'], type: BuildingType): void {
    switch (type) {
      case BuildingType.HOUSE:    r.wood -= 20; break
      case BuildingType.FARM:     r.wood -= 10; break
      case BuildingType.MARKET:   r.wood -= 30; r.stone -= 20; break
      case BuildingType.GRANARY:  r.wood -= 25; r.stone -= 15; break
      case BuildingType.WORKSHOP: r.wood -= 30; r.stone -= 30; break
      case BuildingType.ACADEMY:  r.stone -= 40; r.gold -= 20; break
    }
  }

  private findBuildSite(civ: Civilization, em: EntityManager, world: World): { x: number; y: number } | null {
    const territory = Array.from(civ.territory)
    if (territory.length === 0) return null

    // Occupied positions set for fast lookup (numeric key = x * 10000 + y)
    const occupied = new Set<number>()
    for (const id of civ.buildings) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (pos) occupied.add(Math.floor(pos.x) * 10000 + Math.floor(pos.y))
    }

    // Try up to 20 random spots
    for (let i = 0; i < 20; i++) {
      const key = territory[Math.floor(Math.random() * territory.length)]
      const [x, y] = key.split(',').map(Number)
      if (occupied.has(x * 10000 + y)) continue
      const tile = world.getTile(x, y)
      if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER || tile === TileType.LAVA || tile === TileType.MOUNTAIN) continue
      return { x, y }
    }
    return null
  }
}
