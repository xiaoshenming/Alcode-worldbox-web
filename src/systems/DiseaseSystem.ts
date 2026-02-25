import { EntityManager, EntityId, PositionComponent, NeedsComponent, CreatureComponent, DiseaseComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { CivManager } from '../civilization/CivManager'
import { CivMemberComponent } from '../civilization/Civilization'
import { ParticleSystem } from './ParticleSystem'
import { TechSystem } from './TechSystem'
import { EventLog } from './EventLog'

// Disease definitions
const DISEASES: Record<string, {
  name: string
  spreadRate: number
  severity: number
  lethality: number
  duration: number
  color: string
}> = {
  plague: { name: 'Black Plague', spreadRate: 0.02, severity: 3, lethality: 0.3, duration: 600, color: '#4a0' },
  fever: { name: 'Red Fever', spreadRate: 0.03, severity: 2, lethality: 0.15, duration: 400, color: '#f44' },
  blight: { name: 'Blight', spreadRate: 0.01, severity: 1, lethality: 0.05, duration: 300, color: '#8a4' },
  pox: { name: 'White Pox', spreadRate: 0.025, severity: 2.5, lethality: 0.2, duration: 500, color: '#ddd' },
}

const DISEASE_TYPES = Object.keys(DISEASES)

export class DiseaseSystem {
  totalInfected: number = 0
  totalDeaths: number = 0
  totalRecovered: number = 0

  private tickCounter: number = 0

  update(em: EntityManager, world: World, civManager: CivManager, particles: ParticleSystem): void {
    this.tickCounter++

    // Outbreak check every 30 ticks
    if (this.tickCounter % 30 === 0) {
      this.checkOutbreak(em, world, civManager)
    }

    // Spread check every 5 ticks
    if (this.tickCounter % 5 === 0) {
      this.spreadDiseases(em, civManager, world)
    }

    // Progression every tick
    this.progressDiseases(em, world, civManager, particles)
  }

  private checkOutbreak(em: EntityManager, world: World, civManager: CivManager): void {
    // Base chance: ~1/5000 ticks -> at 30-tick intervals, chance per check = 30/5000 = 0.006
    let chance = 0.006

    // Winter increases outbreak chance
    if (world.season === 'winter') chance *= 2.0
    if (world.season === 'autumn') chance *= 1.3

    // Low happiness in any civ increases chance
    for (const [, civ] of civManager.civilizations) {
      if (civ.happiness < 30) {
        chance *= 1.5
        break
      }
    }

    if (Math.random() > chance) return

    // Pick a random creature to be patient zero
    const creatures = em.getEntitiesWithComponents('position', 'creature', 'needs')
    if (creatures.length === 0) return

    // Prefer overcrowded areas: build spatial density
    const grid: Map<string, EntityId[]> = new Map()
    for (const id of creatures) {
      const pos = em.getComponent<PositionComponent>(id, 'position')!
      const key = `${Math.floor(pos.x / 10)},${Math.floor(pos.y / 10)}`
      if (!grid.has(key)) grid.set(key, [])
      grid.get(key)!.push(id)
    }

    // Find densest cell
    let densestCell: EntityId[] = []
    let maxDensity = 0
    for (const [, cell] of grid) {
      if (cell.length > maxDensity) {
        maxDensity = cell.length
        densestCell = cell
      }
    }

    // 60% chance to pick from densest area, 40% random
    let patientZero: EntityId
    if (maxDensity >= 3 && Math.random() < 0.6) {
      patientZero = densestCell[Math.floor(Math.random() * densestCell.length)]
    } else {
      patientZero = creatures[Math.floor(Math.random() * creatures.length)]
    }

    // Don't infect already infected or immune creatures
    const existing = em.getComponent<DiseaseComponent>(patientZero, 'disease')
    if (existing) return

    const diseaseType = DISEASE_TYPES[Math.floor(Math.random() * DISEASE_TYPES.length)]
    this.infectEntity(em, patientZero, diseaseType, world)

    const creature = em.getComponent<CreatureComponent>(patientZero, 'creature')!
    const disease = DISEASES[diseaseType]
    EventLog.log('disease', `${disease.name} outbreak! ${creature.name} is patient zero`, world.tick)
  }

  private spreadDiseases(em: EntityManager, civManager: CivManager, world: World): void {
    const infected = em.getEntitiesWithComponents('position', 'disease', 'creature')
    if (infected.length === 0) return

    // Build spatial hash for all creatures (cell size 5)
    const allCreatures = em.getEntitiesWithComponents('position', 'creature', 'needs')
    const grid: Map<string, EntityId[]> = new Map()
    for (const id of allCreatures) {
      const pos = em.getComponent<PositionComponent>(id, 'position')!
      const key = `${Math.floor(pos.x / 5)},${Math.floor(pos.y / 5)}`
      if (!grid.has(key)) grid.set(key, [])
      grid.get(key)!.push(id)
    }

    for (const id of infected) {
      const disease = em.getComponent<DiseaseComponent>(id, 'disease')!
      if (!disease.contagious || disease.immune) continue

      // Quarantine: if civ has Medicine, infected members don't spread within civ
      const civMember = em.getComponent<CivMemberComponent>(id, 'civMember')
      let quarantined = false
      if (civMember) {
        const civ = civManager.civilizations.get(civMember.civId)
        if (civ && TechSystem.hasTech(civ, 'Medicine')) {
          quarantined = true
        }
      }

      const pos = em.getComponent<PositionComponent>(id, 'position')!
      const creature = em.getComponent<CreatureComponent>(id, 'creature')!
      const diseaseDef = DISEASES[disease.diseaseType]
      if (!diseaseDef) continue

      const cx = Math.floor(pos.x / 5)
      const cy = Math.floor(pos.y / 5)

      // Check nearby cells (3 tile range -> 1 cell radius)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cell = grid.get(`${cx + dx},${cy + dy}`)
          if (!cell) continue

          for (const otherId of cell) {
            if (otherId === id) continue

            // Skip already infected or immune to this disease
            const otherDisease = em.getComponent<DiseaseComponent>(otherId, 'disease')
            if (otherDisease) continue

            const otherPos = em.getComponent<PositionComponent>(otherId, 'position')!
            const ddx = pos.x - otherPos.x
            const ddy = pos.y - otherPos.y
            const dist = Math.sqrt(ddx * ddx + ddy * ddy)
            if (dist > 3) continue

            let spreadChance = diseaseDef.spreadRate

            // Same species spreads faster
            const otherCreature = em.getComponent<CreatureComponent>(otherId, 'creature')!
            if (otherCreature.species === creature.species) {
              spreadChance *= 1.5
            }

            // Same civ spreads faster (close quarters)
            const otherCivMember = em.getComponent<CivMemberComponent>(otherId, 'civMember')
            if (civMember && otherCivMember && civMember.civId === otherCivMember.civId) {
              // But if quarantined, don't spread within civ
              if (quarantined) continue
              spreadChance *= 1.8
            }

            // Closer = more likely
            spreadChance *= (1 - dist / 4)

            if (Math.random() < spreadChance) {
              this.infectEntity(em, otherId, disease.diseaseType, world)
            }
          }
        }
      }
    }
  }

  private progressDiseases(em: EntityManager, world: World, civManager: CivManager, particles: ParticleSystem): void {
    const infected = em.getEntitiesWithComponents('disease', 'needs', 'creature', 'position')

    for (const id of infected) {
      const disease = em.getComponent<DiseaseComponent>(id, 'disease')!
      const needs = em.getComponent<NeedsComponent>(id, 'needs')!
      const creature = em.getComponent<CreatureComponent>(id, 'creature')!
      const pos = em.getComponent<PositionComponent>(id, 'position')!

      // Immune creatures: check if immunity expired
      if (disease.immune) {
        if (world.tick >= disease.immuneUntil) {
          em.removeComponent(id, 'disease')
        }
        continue
      }

      disease.duration++

      // Severity progression
      const diseaseDef = DISEASES[disease.diseaseType]
      if (!diseaseDef) continue

      let severityRate = diseaseDef.severity * 0.05

      // Medicine tech halves severity progression
      const civMember = em.getComponent<CivMemberComponent>(id, 'civMember')
      if (civMember) {
        const civ = civManager.civilizations.get(civMember.civId)
        if (civ && TechSystem.hasTech(civ, 'Medicine')) {
          severityRate *= 0.5
        }
      }

      disease.severity = Math.min(100, disease.severity + severityRate)

      // Health damage based on severity
      needs.health -= disease.severity * 0.01

      // Speed reduction (applied as temporary modifier)
      // We don't permanently modify creature.speed; instead the AI system
      // will read disease severity. We store the penalty in severity itself.

      // Sickly particle effect every ~30 ticks
      if (this.tickCounter % 30 === 0) {
        particles.spawn(pos.x, pos.y, 2, diseaseDef.color, 0.5)
      }

      // Check duration expiry
      if (disease.duration >= diseaseDef.duration) {
        // Lethality roll
        if (Math.random() < diseaseDef.lethality) {
          // Death from disease
          needs.health = 0
          particles.spawnDeath(pos.x, pos.y, diseaseDef.color)
          EventLog.log('disease', `${creature.name} died from ${diseaseDef.name}`, world.tick)
          this.totalDeaths++
          em.removeEntity(id)
        } else {
          // Recovery - become immune
          disease.immune = true
          disease.contagious = false
          disease.severity = 0
          disease.immuneUntil = world.tick + 3000
          this.totalRecovered++
          EventLog.log('disease', `${creature.name} recovered from ${diseaseDef.name}`, world.tick)
        }
      }

      // Early death if health hits 0 before duration ends
      if (needs.health <= 0 && !disease.immune) {
        particles.spawnDeath(pos.x, pos.y, diseaseDef.color)
        EventLog.log('disease', `${creature.name} succumbed to ${diseaseDef.name}`, world.tick)
        this.totalDeaths++
        em.removeEntity(id)
      }
    }
  }

  private infectEntity(em: EntityManager, id: EntityId, diseaseType: string, world: World): void {
    // Don't reinfect immune creatures
    const existing = em.getComponent<DiseaseComponent>(id, 'disease')
    if (existing) return

    em.addComponent<DiseaseComponent>(id, {
      type: 'disease',
      diseaseType,
      severity: 1,
      duration: 0,
      contagious: true,
      immune: false,
      immuneUntil: 0,
    })
    this.totalInfected++
  }

  /** Get the speed multiplier for a diseased creature (1.0 = no penalty) */
  static getSpeedMultiplier(em: EntityManager, id: EntityId): number {
    const disease = em.getComponent<DiseaseComponent>(id, 'disease')
    if (!disease || disease.immune) return 1.0
    // Reduce speed by severity% (e.g. severity 50 -> 0.5x speed)
    return Math.max(0.2, 1 - disease.severity / 100)
  }
}

/** God power: infect creatures at a location */
export function infectAt(em: EntityManager, x: number, y: number, diseaseType: string): void {
  const creatures = em.getEntitiesWithComponents('position', 'creature', 'needs')
  const diseaseDef = DISEASES[diseaseType]
  if (!diseaseDef) return

  for (const id of creatures) {
    const pos = em.getComponent<PositionComponent>(id, 'position')!
    const dx = pos.x - x
    const dy = pos.y - y
    if (dx * dx + dy * dy < 9) { // 3 tile radius
      const existing = em.getComponent<DiseaseComponent>(id, 'disease')
      if (!existing) {
        em.addComponent<DiseaseComponent>(id, {
          type: 'disease',
          diseaseType,
          severity: 5,
          duration: 0,
          contagious: true,
          immune: false,
          immuneUntil: 0,
        })
      }
    }
  }
}

/** Get disease color for rendering */
export function getDiseaseColor(em: EntityManager, id: EntityId): string | null {
  const disease = em.getComponent<DiseaseComponent>(id, 'disease')
  if (!disease || disease.immune) return null
  const def = DISEASES[disease.diseaseType]
  return def ? def.color : null
}
