// Population Dynamics System — manages birth rates, aging, natural death,
// population caps, baby booms, and famine for each civilization.

import { EntityManager, CreatureComponent, NeedsComponent, PositionComponent } from '../ecs/Entity'
import { CivMemberComponent, Civilization, BuildingType, BuildingComponent } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'
import { generateName } from '../utils/NameGenerator'
import { GeneticsSystem } from './GeneticsSystem'

const POP_CHECK_INTERVAL = 120
const ELDER_AGE_RATIO = 0.85          // age/maxAge above this → death chance
const ELDER_DEATH_CHANCE = 0.08       // per check for elders
const FAMINE_DAMAGE = 12              // health lost per check when starving
const BASE_BIRTH_RATE = 0.06          // base chance per check per civ
const BABY_BOOM_MULTIPLIER = 1.8      // birth rate multiplier during peace
const POP_CAP_PER_TERRITORY = 0.05    // 1 pop per 20 territory tiles
const POP_CAP_PER_BUILDING = 2        // each building adds 2 to cap
const POP_CAP_BASE = 5                // minimum cap for any civ
const FOOD_PER_CAPITA_THRESHOLD = 1.5 // below this → famine

const SPECIES_COLORS: Record<string, string> = {
  human: '#ffcc99', elf: '#99ffcc', dwarf: '#cc9966', orc: '#66cc66',
  sheep: '#ffffff', wolf: '#888888', dragon: '#ff4444',
}
const SPECIES_SIZES: Record<string, number> = {
  human: 3, elf: 3, dwarf: 3, orc: 4, sheep: 3, wolf: 3, dragon: 6,
}
const SPECIES_MAX_AGE: Record<string, [number, number]> = {
  human: [600, 900], elf: [1200, 2000], dwarf: [800, 1200], orc: [400, 700],
  sheep: [300, 500], wolf: [400, 600], dragon: [2000, 4000],
}

export interface PopulationEvent {
  type: 'birth' | 'death'
  civId: number
  reason: string
  x: number
  y: number
}

export class PopulationSystem {
  private pendingEvents: PopulationEvent[] = []

  /** Drain and return accumulated events since last call */
  drainEvents(): PopulationEvent[] {
    const events = this.pendingEvents
    this.pendingEvents = []
    return events
  }

  update(em: EntityManager, world: World, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    // Aging is handled by AISystem (creature.age += 0.1 per tick) — no duplicate here

    if (tick % POP_CHECK_INTERVAL !== 0) return

    for (const [civId, civ] of civManager.civilizations) {
      const members = this.getCivMembers(em, civId)
      if (members.length === 0) continue

      const popCap = this.calcPopCap(civ)
      const foodPerCapita = civ.population > 0 ? civ.resources.food / civ.population : 10
      const atPeace = this.isAtPeace(civ)

      // --- Natural death (old age) ---
      this.processAging(em, members, civ, particles, tick)

      // --- Famine ---
      if (foodPerCapita < FOOD_PER_CAPITA_THRESHOLD) {
        this.processFamine(em, members, civ, foodPerCapita, particles, tick)
      }

      // --- Births ---
      if (civ.population < popCap) {
        this.processBirths(em, members, civ, popCap, foodPerCapita, atPeace, particles, tick)
      }
    }
  }

  // ── Aging (death checks only; age increment is in AISystem) ──────

  private processAging(
    em: EntityManager, members: number[], civ: Civilization,
    particles: ParticleSystem, tick: number
  ): void {
    for (const id of members) {
      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!creature) continue

      const ageRatio = creature.age / creature.maxAge
      if (ageRatio < ELDER_AGE_RATIO) continue

      // Death probability increases as age approaches maxAge
      const deathChance = ELDER_DEATH_CHANCE + (ageRatio - ELDER_AGE_RATIO) * 0.6
      if (Math.random() > deathChance) continue

      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (pos) {
        particles.spawn(pos.x, pos.y, 4, '#aaaaaa', 1.5)
        this.pendingEvents.push({ type: 'death', civId: civ.id, reason: 'old_age', x: pos.x, y: pos.y })
      }

      EventLog.log('death', `${creature.name} of ${civ.name} died of old age (${Math.round(creature.age)})`, tick)
      em.removeEntity(id)
      civ.population = Math.max(0, civ.population - 1)
    }
  }

  // ── Famine ─────────────────────────────────────────────────────────

  private processFamine(
    em: EntityManager, members: number[], civ: Civilization,
    foodPerCapita: number, particles: ParticleSystem, tick: number
  ): void {
    // Severity: 0 (barely starving) to 1 (no food at all)
    const severity = 1 - Math.min(foodPerCapita / FOOD_PER_CAPITA_THRESHOLD, 1)
    const damageThisRound = FAMINE_DAMAGE * (0.3 + severity * 0.7)

    for (const id of members) {
      const needs = em.getComponent<NeedsComponent>(id, 'needs')
      if (!needs) continue

      // Not everyone suffers equally — random selection
      if (Math.random() > 0.4 + severity * 0.4) continue

      needs.health -= damageThisRound
      needs.hunger = Math.min(100, needs.hunger + 10)

      if (needs.health <= 0) {
        const creature = em.getComponent<CreatureComponent>(id, 'creature')
        const pos = em.getComponent<PositionComponent>(id, 'position')
        if (pos) {
          particles.spawn(pos.x, pos.y, 3, '#886622', 1.2)
          this.pendingEvents.push({ type: 'death', civId: civ.id, reason: 'famine', x: pos.x, y: pos.y })
        }
        const name = creature?.name ?? 'A citizen'
        EventLog.log('death', `${name} of ${civ.name} starved to death`, tick)
        em.removeEntity(id)
        civ.population = Math.max(0, civ.population - 1)
      }
    }
  }

  // ── Births ─────────────────────────────────────────────────────────

  private processBirths(
    em: EntityManager, members: number[], civ: Civilization,
    popCap: number, foodPerCapita: number, atPeace: boolean,
    particles: ParticleSystem, tick: number
  ): void {
    // Food factor: well-fed civs reproduce faster
    const foodFactor = Math.min(foodPerCapita / 3, 1.5)
    // Density factor: slow down as approaching cap
    const densityFactor = 1 - (civ.population / popCap) * 0.7
    // Baby boom during peace
    const peaceFactor = atPeace ? BABY_BOOM_MULTIPLIER : 1.0

    const birthRate = BASE_BIRTH_RATE * foodFactor * Math.max(0.1, densityFactor) * peaceFactor

    // Each fertile-age member has a chance to trigger a birth
    let birthsThisRound = 0
    const maxBirths = Math.max(1, Math.floor((popCap - civ.population) * 0.3))

    for (const id of members) {
      if (birthsThisRound >= maxBirths) break
      if (civ.population >= popCap) break

      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!creature) continue

      // Only fertile-age creatures (20%-70% of lifespan)
      const ageRatio = creature.age / creature.maxAge
      if (ageRatio < 0.2 || ageRatio > 0.7) continue

      if (Math.random() > birthRate) continue

      // Pick spawn position near parent
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue

      particles.spawn(pos.x, pos.y, 5, '#88ff88', 1.8)
      this.pendingEvents.push({ type: 'birth', civId: civ.id, reason: 'natural', x: pos.x, y: pos.y })

      // Create actual ECS entity for the newborn
      const childId = em.createEntity()
      const species = creature.species
      const ageRange = SPECIES_MAX_AGE[species] || [500, 800]
      const maxAge = ageRange[0] + Math.random() * (ageRange[1] - ageRange[0])
      const offsetX = pos.x + (Math.random() - 0.5) * 2
      const offsetY = pos.y + (Math.random() - 0.5) * 2

      em.addComponent(childId, { type: 'position', x: offsetX, y: offsetY })
      em.addComponent(childId, { type: 'velocity', vx: 0, vy: 0 })
      em.addComponent(childId, {
        type: 'render',
        color: SPECIES_COLORS[species] || '#ffcc99',
        size: SPECIES_SIZES[species] || 3
      })
      em.addComponent(childId, {
        type: 'creature',
        species,
        speed: species === 'dragon' ? 2 : species === 'wolf' ? 1.5 : 1,
        damage: species === 'dragon' ? 50 : species === 'wolf' ? 10 : 5,
        isHostile: ['wolf', 'orc', 'dragon'].includes(species),
        name: generateName(species),
        age: 0,
        maxAge,
        gender: Math.random() < 0.5 ? 'male' : 'female'
      })
      em.addComponent(childId, { type: 'needs', hunger: 0, health: 100 })
      em.addComponent(childId, {
        type: 'ai', state: 'idle',
        targetX: offsetX, targetY: offsetY,
        targetEntity: null, cooldown: 0
      })
      const genetics = GeneticsSystem.generateRandomTraits()
      em.addComponent(childId, genetics)
      GeneticsSystem.applyTraits(childId, em)

      // Assign to civ (this also increments civ.population)
      em.addComponent(childId, { type: 'civMember', civId: civ.id, role: 'worker' } as CivMemberComponent)
      civ.population++

      // Consume food for the birth
      civ.resources.food = Math.max(0, civ.resources.food - 3)
      birthsThisRound++

      EventLog.log('birth', `A new citizen is born in ${civ.name} (pop: ${civ.population})`, tick)
    }

    if (birthsThisRound > 0 && atPeace && birthsThisRound >= 2) {
      EventLog.log('birth', `Baby boom in ${civ.name}! ${birthsThisRound} births this cycle`, tick)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private getCivMembers(em: EntityManager, civId: number): number[] {
    const all = em.getEntitiesWithComponents('civMember', 'creature')
    return all.filter(id => {
      const m = em.getComponent<CivMemberComponent>(id, 'civMember')
      return m && m.civId === civId
    })
  }

  private calcPopCap(civ: Civilization): number {
    const fromTerritory = Math.floor(civ.territory.size * POP_CAP_PER_TERRITORY)
    const fromBuildings = civ.buildings.length * POP_CAP_PER_BUILDING
    return POP_CAP_BASE + fromTerritory + fromBuildings
  }

  private isAtPeace(civ: Civilization): boolean {
    for (const [, rel] of civ.relations) {
      if (rel <= -50) return false
    }
    return true
  }
}
