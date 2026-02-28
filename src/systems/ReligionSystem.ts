import { CivManager } from '../civilization/CivManager'
import { EntityManager } from '../ecs/Entity'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'
import { RELIGION_NAMES, ReligionType, BuildingType, BuildingComponent, Civilization } from '../civilization/Civilization'

const RELIGION_COLORS: Record<ReligionType, string> = {
  sun: '#ffd700',
  moon: '#aaaaff',
  earth: '#44aa44',
  storm: '#6666ff',
  ancestor: '#cc88ff'
}

const BLESSING_NAMES: Record<ReligionType, string> = {
  sun: 'Solar Harvest',
  moon: 'Lunar Insight',
  earth: 'Earth Shield',
  storm: 'Storm Fury',
  ancestor: 'Spirit Guide'
}

const BLESSING_DURATION = 600
const BLESSING_COOLDOWN = 1200

export class ReligionSystem {
  private _civsBuf: Civilization[] = []
  private blessingCooldowns: Map<number, number> = new Map() // civId -> tick when cooldown ends

  update(civManager: CivManager, em: EntityManager, world: World, particles: ParticleSystem, tick: number): void {
    // Faith growth/decay every 120 ticks
    if (tick % 120 === 0) {
      this.updateFaith(civManager, em, tick)
      this.updateCulture(civManager, em)
    }

    // Religion spread every 300 ticks
    if (tick % 300 === 0) {
      this.spreadReligion(civManager, tick)
      this.checkHolyWar(civManager, tick)
    }

    // Blessing tick-down and effects
    this.updateBlessings(civManager, em, particles, tick)
  }

  private updateFaith(civManager: CivManager, em: EntityManager, tick: number): void {
    for (const [, civ] of civManager.civilizations) {
      const temples = this.countTemples(civ, em)
      if (temples > 0) {
        civ.religion.faith = Math.min(100, civ.religion.faith + 2 + temples)
      } else {
        civ.religion.faith = Math.max(0, civ.religion.faith - 1)
      }

      // Trigger blessing at faith 80+
      if (civ.religion.faith >= 80 && !civ.religion.blessing) {
        const cooldownEnd = this.blessingCooldowns.get(civ.id) ?? 0
        if (tick >= cooldownEnd) {
          this.grantBlessing(civ, tick)
        }
      }
    }
  }

  private grantBlessing(civ: Civilization, tick: number): void {
    const type = civ.religion.type
    civ.religion.blessing = type
    civ.religion.blessingTimer = BLESSING_DURATION
    this.blessingCooldowns.set(civ.id, tick + BLESSING_DURATION + BLESSING_COOLDOWN)
    EventLog.log('religion', `${civ.name}: ${BLESSING_NAMES[type]} granted by ${RELIGION_NAMES[type]}!`, tick)
  }

  private updateBlessings(civManager: CivManager, em: EntityManager, particles: ParticleSystem, tick: number): void {
    for (const [, civ] of civManager.civilizations) {
      if (!civ.religion.blessing) continue

      civ.religion.blessingTimer--

      // Apply blessing effects each tick
      this.applyBlessingEffect(civ, em)

      // Particle effect every 30 ticks
      if (tick % 30 === 0) {
        this.spawnBlessingParticles(civ, particles)
      }

      if (civ.religion.blessingTimer <= 0) {
        civ.religion.blessing = null
      }
    }
  }

  private applyBlessingEffect(civ: Civilization, em: EntityManager): void {
    const blessing = civ.religion.blessing as ReligionType | null
    if (!blessing) return

    switch (blessing) {
      case 'sun': // Solar Harvest: food +50%
        civ.resources.food += 0.05 // small per-tick bonus simulating +50% production
        break
      case 'moon': // Lunar Insight: research speed +50%
        civ.research.researchRate = Math.max(civ.research.researchRate, 1.5)
        break
      case 'earth': // Earth Shield: building HP regen
        for (const bId of civ.buildings) {
          const b = em.getComponent<BuildingComponent>(bId, 'building')
          if (b && b.health < b.maxHealth) {
            b.health = Math.min(b.maxHealth, b.health + 0.1)
          }
        }
        break
      case 'storm': // Storm Fury: morale boost
        civ.happiness = Math.min(100, civ.happiness + 0.02)
        break
      case 'ancestor': // Spirit Guide: population growth via food
        civ.resources.food += 0.04
        break
    }
  }

  private spawnBlessingParticles(civ: Civilization, particles: ParticleSystem): void {
    const color = RELIGION_COLORS[civ.religion.type]
    const size = civ.territory.size
    if (size === 0) return

    const count = Math.min(3, size)
    for (let i = 0; i < count; i++) {
      let targetIdx = Math.floor(Math.random() * size)
      for (const key of civ.territory) {
        if (targetIdx-- === 0) {
          const comma = key.indexOf(',')
          particles.spawnAura(+key.substring(0, comma), +key.substring(comma + 1), color, 1.5)
          break
        }
      }
    }
  }

  private spreadReligion(civManager: CivManager, tick: number): void {
    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)

    for (let i = 0; i < civs.length; i++) {
      for (let j = i + 1; j < civs.length; j++) {
        const a = civs[i]
        const b = civs[j]
        if (!this.areBordering(a, b, civManager)) continue

        const faithDiff = a.religion.faith - b.religion.faith
        if (faithDiff === 0) continue

        const spreader = faithDiff > 0 ? a : b
        const target = faithDiff > 0 ? b : a
        const diff = Math.abs(faithDiff)
        const prob = diff / 200

        if (Math.random() < prob) {
          target.religion.faith = Math.max(0, target.religion.faith - 5)
          spreader.religion.faith = Math.min(100, spreader.religion.faith + 2)

          // Conversion check
          if (target.religion.faith <= 0 && Math.random() < 0.1) {
            const oldReligion = RELIGION_NAMES[target.religion.type]
            target.religion.type = spreader.religion.type
            target.religion.faith = 10
            EventLog.log('religion', `${target.name} converted from ${oldReligion} to ${RELIGION_NAMES[spreader.religion.type]}!`, tick)
          }
        }
      }
    }
  }

  private updateCulture(civManager: CivManager, em: EntityManager): void {
    for (const civ of civManager.civilizations.values()) {
      // Natural culture growth
      if (civ.culture.strength < 100) {
        let growth = 1
        // Academy bonus
        let academies = 0
        for (const id of civ.buildings) {
          const b = em.getComponent<BuildingComponent>(id, 'building')
          if (b && b.buildingType === BuildingType.ACADEMY) academies++
        }
        growth += academies * 2
        civ.culture.strength = Math.min(100, civ.culture.strength + growth)
      }

      // Culture diplomacy effects
      for (const other of civManager.civilizations.values()) {
        if (other.id === civ.id) continue
        const rel = civ.relations.get(other.id) ?? 0

        if (civ.culture.trait === other.culture.trait) {
          // Same trait: improve relations
          civ.relations.set(other.id, Math.min(100, rel + 2))
        } else {
          // Cultural assimilation: strong culture absorbs weak
          const diff = civ.culture.strength - other.culture.strength
          if (diff > 30 && Math.random() < 0.05) {
            other.culture.trait = civ.culture.trait
            other.culture.strength = Math.max(5, other.culture.strength - 10)
            EventLog.log('religion', `${other.name} adopted ${civ.name}'s ${civ.culture.trait} culture`, 0)
          }
        }
      }
    }
  }

  private checkHolyWar(civManager: CivManager, tick: number): void {
    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)

    for (let i = 0; i < civs.length; i++) {
      for (let j = i + 1; j < civs.length; j++) {
        const a = civs[i]
        const b = civs[j]

        if (a.religion.type === b.religion.type) continue
        if (a.religion.faith <= 60 || b.religion.faith <= 60) continue
        if (!this.areBordering(a, b, civManager)) continue

        // Small probability of holy war
        if (Math.random() < 0.03) {
          const relA = a.relations.get(b.id) ?? 0
          const relB = b.relations.get(a.id) ?? 0
          a.relations.set(b.id, Math.max(-100, relA - 30))
          b.relations.set(a.id, Math.max(-100, relB - 30))
          EventLog.log('war', `Holy war! ${a.name} (${RELIGION_NAMES[a.religion.type]}) vs ${b.name} (${RELIGION_NAMES[b.religion.type]})`, tick)
        }
      }
    }
  }

  private areBordering(a: Civilization, b: Civilization, civManager: CivManager): boolean {
    const mapH = civManager.territoryMap.length
    const mapW = civManager.territoryMap[0]?.length ?? 0
    for (const key of a.territory) {
      const comma = key.indexOf(',')
      const x = +key.substring(0, comma)
      const y = +key.substring(comma + 1)
      // Check 4 neighbours without creating temporary arrays
      if (y - 1 >= 0 && civManager.territoryMap[y - 1][x] === b.id) return true
      if (y + 1 < mapH && civManager.territoryMap[y + 1][x] === b.id) return true
      if (x - 1 >= 0 && civManager.territoryMap[y][x - 1] === b.id) return true
      if (x + 1 < mapW && civManager.territoryMap[y][x + 1] === b.id) return true
    }
    return false
  }

  private countTemples(civ: Civilization, em: EntityManager): number {
    let count = 0
    for (const id of civ.buildings) {
      const b = em.getComponent<BuildingComponent>(id, 'building')
      if (b && b.buildingType === BuildingType.TEMPLE) count++
    }
    return count
  }
}
