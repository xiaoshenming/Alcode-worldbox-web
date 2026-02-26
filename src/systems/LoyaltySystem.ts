// Loyalty & Rebellion System — tracks citizen loyalty per civilization,
// triggers revolts and civil-war splits when loyalty drops too low.

import { CivManager } from '../civilization/CivManager'
import { EntityManager, PositionComponent } from '../ecs/Entity'
import { BuildingComponent, BuildingType, Civilization, CivMemberComponent, createCivilization } from '../civilization/Civilization'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'

const LOYALTY_UPDATE_INTERVAL = 120
const REBELLION_CHECK_INTERVAL = 300
const REBELLION_THRESHOLD = 30
const CIVIL_WAR_THRESHOLD = 15
const POP_COMFORT_ZONE = 12          // population above this starts hurting loyalty
const FOOD_PER_CAPITA_LOW = 1.0      // below this → loyalty penalty

export class LoyaltySystem {
  /** civId → loyalty (0-100) */
  private loyalty: Map<number, number> = new Map()

  getLoyalty(civId: number): number {
    return this.loyalty.get(civId) ?? 70
  }

  update(civManager: CivManager, em: EntityManager, world: World, particles: ParticleSystem, tick: number): void {
    // Register new civs
    for (const [civId] of civManager.civilizations) {
      if (!this.loyalty.has(civId)) {
        this.loyalty.set(civId, 70)
      }
    }

    // Periodic loyalty recalculation
    if (tick % LOYALTY_UPDATE_INTERVAL === 0) {
      this.updateLoyalty(civManager, em, tick)
    }

    // Periodic rebellion check
    if (tick % REBELLION_CHECK_INTERVAL === 0) {
      this.checkRebellions(civManager, em, world, particles, tick)
    }

    // Cleanup deleted civs
    for (const civId of this.loyalty.keys()) {
      if (!civManager.civilizations.has(civId)) {
        this.loyalty.delete(civId)
      }
    }
  }

  // ── Loyalty calculation ──────────────────────────────────────────

  private updateLoyalty(civManager: CivManager, em: EntityManager, tick: number): void {
    for (const [civId, civ] of civManager.civilizations) {
      let delta = 0

      // 1. Overpopulation penalty
      if (civ.population > POP_COMFORT_ZONE) {
        const excess = civ.population - POP_COMFORT_ZONE
        delta -= Math.min(excess * 0.4, 8)
      }

      // 2. War losses — being at war hurts loyalty
      let atWar = false
      for (const [, rel] of civ.relations) {
        if (rel <= -50) { atWar = true; break }
      }
      if (atWar) delta -= 3

      // 3. High tax / low food
      if (civ.taxRate >= 3) delta -= 4
      else if (civ.taxRate === 2) delta -= 1.5

      const foodPerCapita = civ.population > 0 ? civ.resources.food / civ.population : 10
      if (foodPerCapita < FOOD_PER_CAPITA_LOW) delta -= 4
      else if (foodPerCapita < FOOD_PER_CAPITA_LOW * 2) delta -= 1.5

      // 4. Temples boost loyalty
      const temples = this.countBuildings(em, civ, BuildingType.TEMPLE)
      delta += Math.min(temples * 1.5, 6)

      // 5. Markets boost loyalty
      const markets = this.countBuildings(em, civ, BuildingType.MARKET)
      delta += Math.min(markets * 1.2, 5)

      // 6. Hero presence boosts loyalty
      const heroCount = this.countHeroes(em, civId)
      delta += Math.min(heroCount * 2.5, 8)

      // 7. Natural drift toward 60 (slow stabilizer)
      const current = this.loyalty.get(civId) ?? 70
      if (current > 60) delta -= 0.3
      else if (current < 60) delta += 0.5

      const newLoyalty = Math.max(0, Math.min(100, current + delta))
      this.loyalty.set(civId, newLoyalty)
    }
  }

  // ── Rebellion & civil war ────────────────────────────────────────

  private checkRebellions(civManager: CivManager, em: EntityManager, world: World, particles: ParticleSystem, tick: number): void {
    for (const [civId, civ] of civManager.civilizations) {
      const loyalty = this.loyalty.get(civId) ?? 70
      if (loyalty >= REBELLION_THRESHOLD) continue
      if (civ.population < 3) continue

      // Probability scales with how far below threshold
      const severity = (REBELLION_THRESHOLD - loyalty) / REBELLION_THRESHOLD // 0-1
      const chance = 0.15 + severity * 0.45 // 15%-60%
      if (Math.random() > chance) continue

      // Civil war when extremely low
      if (loyalty < CIVIL_WAR_THRESHOLD && civ.population >= 6 && Math.random() < 0.4) {
        this.triggerCivilWar(civManager, em, world, particles, civ, tick)
      } else {
        this.triggerRebellion(civManager, em, particles, civ, severity, tick)
      }
    }
  }

  private triggerRebellion(
    civManager: CivManager, em: EntityManager, particles: ParticleSystem,
    civ: Civilization, severity: number, tick: number
  ): void {
    // Gather non-leader members
    const members = em.getEntitiesWithComponent('civMember')
    const civMembers = members.filter(id => {
      const m = em.getComponent<CivMemberComponent>(id, 'civMember')
      return m && m.civId === civ.id && m.role !== 'leader'
    })
    if (civMembers.length === 0) return

    // 15-40% of population rebels
    const ratio = 0.15 + severity * 0.25
    const rebelCount = Math.max(1, Math.ceil(civMembers.length * ratio))

    // Remove rebels from civ
    for (let i = 0; i < rebelCount && civMembers.length > 0; i++) {
      const idx = Math.floor(Math.random() * civMembers.length)
      const id = civMembers[idx]
      em.removeComponent(id, 'civMember')
      civ.population = Math.max(0, civ.population - 1)
      civMembers.splice(idx, 1)
    }

    // Rebels damage a random building
    if (civ.buildings.length > 0) {
      const bIdx = Math.floor(Math.random() * civ.buildings.length)
      const bId = civ.buildings[bIdx]
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      const bPos = em.getComponent<PositionComponent>(bId, 'position')
      if (b) {
        b.health -= 30 + Math.floor(severity * 30)
        if (b.health <= 0) {
          if (bPos) particles.spawnExplosion(bPos.x, bPos.y)
          em.removeEntity(bId)
          civ.buildings.splice(bIdx, 1)
        }
      }
    }

    // Red particle effect at territory center
    const center = this.getTerritoryCenter(civ)
    if (center) {
      particles.spawn(center.x, center.y, 12, '#ff2222', 2.5)
      particles.spawn(center.x, center.y, 6, '#ff6644', 1.5)
    }

    // Loyalty rebounds slightly after revolt
    this.loyalty.set(civ.id, Math.min(100, (this.loyalty.get(civ.id) ?? 0) + 10))

    EventLog.log('war', `Rebellion in ${civ.name}! ${rebelCount} citizens revolted (loyalty ${Math.round(this.loyalty.get(civ.id) ?? 0)}%)`, tick)
  }

  private triggerCivilWar(
    civManager: CivManager, em: EntityManager, world: World,
    particles: ParticleSystem, civ: Civilization, tick: number
  ): void {
    // Split: create a new rebel civilization
    const members = em.getEntitiesWithComponent('civMember')
    const civMembers = members.filter(id => {
      const m = em.getComponent<CivMemberComponent>(id, 'civMember')
      return m && m.civId === civ.id && m.role !== 'leader'
    })
    if (civMembers.length < 4) return

    // ~40% of population joins the rebel civ
    const splitCount = Math.max(2, Math.ceil(civMembers.length * 0.4))

    // Pick a rebel spawn point from territory edge
    const spawnPos = this.pickEdgeTerritory(civ)
    if (!spawnPos) return

    // Create rebel civilization
    const rebelCiv = createCivilization()
    rebelCiv.name = `Rebel ${civ.name}`
    civManager.civilizations.set(rebelCiv.id, rebelCiv)

    // Claim a small territory for rebels
    civManager.claimTerritory(rebelCiv.id, spawnPos.x, spawnPos.y, 3)

    // Transfer members
    let transferred = 0
    for (let i = 0; i < splitCount && civMembers.length > 0; i++) {
      const idx = Math.floor(Math.random() * civMembers.length)
      const id = civMembers[idx]
      const m = em.getComponent<CivMemberComponent>(id, 'civMember')
      if (m) {
        m.civId = rebelCiv.id
        m.role = 'worker'
      }
      civ.population = Math.max(0, civ.population - 1)
      rebelCiv.population++
      civMembers.splice(idx, 1)
      transferred++
    }

    // Rebels start hostile to parent civ
    rebelCiv.relations.set(civ.id, -70)
    civ.relations.set(rebelCiv.id, -70)

    // Give rebels some starting resources
    rebelCiv.resources.food = Math.floor(civ.resources.food * 0.2)
    rebelCiv.resources.wood = Math.floor(civ.resources.wood * 0.2)
    civ.resources.food = Math.floor(civ.resources.food * 0.8)
    civ.resources.wood = Math.floor(civ.resources.wood * 0.8)

    // Set loyalty for both
    this.loyalty.set(civ.id, 35)
    this.loyalty.set(rebelCiv.id, 55)

    // Red particle burst
    particles.spawn(spawnPos.x, spawnPos.y, 20, '#ff0000', 3)
    particles.spawn(spawnPos.x, spawnPos.y, 10, '#ff4444', 2)

    EventLog.log('war', `Civil war in ${civ.name}! ${transferred} citizens split off to form ${rebelCiv.name}`, tick)
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private countBuildings(em: EntityManager, civ: Civilization, bType: BuildingType): number {
    let count = 0
    for (const id of civ.buildings) {
      const b = em.getComponent<BuildingComponent>(id, 'building')
      if (b && b.buildingType === bType) count++
    }
    return count
  }

  private countHeroes(em: EntityManager, civId: number): number {
    const heroes = em.getEntitiesWithComponents('hero', 'civMember')
    let count = 0
    for (const id of heroes) {
      const m = em.getComponent<CivMemberComponent>(id, 'civMember')
      if (m && m.civId === civId) count++
    }
    return count
  }

  private getTerritoryCenter(civ: Civilization): { x: number; y: number } | null {
    if (civ.territory.size === 0) return null
    let sx = 0, sy = 0, n = 0
    for (const key of civ.territory) {
      const [x, y] = key.split(',').map(Number)
      sx += x; sy += y; n++
      if (n >= 200) break
    }
    return { x: Math.round(sx / n), y: Math.round(sy / n) }
  }

  private pickEdgeTerritory(civ: Civilization): { x: number; y: number } | null {
    const arr = Array.from(civ.territory)
    if (arr.length === 0) return null
    // Sample from the last quarter of territory entries (likely edge tiles)
    const start = Math.max(0, arr.length - Math.ceil(arr.length / 4))
    const pick = arr[start + Math.floor(Math.random() * (arr.length - start))]
    const [x, y] = pick.split(',').map(Number)
    return { x, y }
  }
}
