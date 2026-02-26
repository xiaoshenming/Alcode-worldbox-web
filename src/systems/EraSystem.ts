// Era System - world age progression and civilization evolution tracking

import { CivManager } from '../civilization/CivManager'
import { EntityManager, CreatureComponent } from '../ecs/Entity'
import { BuildingComponent, BuildingType, Civilization } from '../civilization/Civilization'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'
import { TimelineSystem } from './TimelineSystem'

export type EraName = 'stone' | 'bronze' | 'iron' | 'medieval' | 'renaissance'

interface EraDefinition {
  name: EraName
  displayName: string
  techRequired: number
  color: string
  unlockedBuildings: BuildingType[]
  bonuses: string[]
}

const ERA_DEFS: EraDefinition[] = [
  {
    name: 'stone', displayName: 'Stone Age', techRequired: 1, color: '#8B7355',
    unlockedBuildings: [BuildingType.HUT, BuildingType.FARM],
    bonuses: ['No bonuses']
  },
  {
    name: 'bronze', displayName: 'Bronze Age', techRequired: 2, color: '#CD7F32',
    unlockedBuildings: [BuildingType.HOUSE, BuildingType.MINE, BuildingType.BARRACKS],
    bonuses: ['Food +20%', 'Combat +10%']
  },
  {
    name: 'iron', displayName: 'Iron Age', techRequired: 3, color: '#71797E',
    unlockedBuildings: [BuildingType.TOWER, BuildingType.WORKSHOP, BuildingType.WALL],
    bonuses: ['Building HP +30%', 'Resources +20%']
  },
  {
    name: 'medieval', displayName: 'Medieval Age', techRequired: 4, color: '#4A4A6A',
    unlockedBuildings: [BuildingType.CASTLE, BuildingType.TEMPLE, BuildingType.MARKET, BuildingType.ACADEMY],
    bonuses: ['Research +30%', 'Gold +50%']
  },
  {
    name: 'renaissance', displayName: 'Renaissance', techRequired: 5, color: '#8B4513',
    unlockedBuildings: [BuildingType.PORT, BuildingType.GRANARY],
    bonuses: ['All resources +30%', 'Pop cap +50%']
  },
]

const ERA_BY_TECH: Record<number, EraName> = { 1: 'stone', 2: 'bronze', 3: 'iron', 4: 'medieval', 5: 'renaissance' }
const ERA_MAP: Map<EraName, EraDefinition> = new Map(ERA_DEFS.map(e => [e.name, e]))

// Temporary buff tracker
interface TempBuff {
  civId: number
  type: string
  expiresAt: number
}

export class EraSystem {
  private civEras: Map<number, EraName> = new Map()
  private tempBuffs: TempBuff[] = []
  private lastCheckTick = 0

  getEra(civId: number): EraName {
    return this.civEras.get(civId) ?? 'stone'
  }

  getEraInfo(era: EraName): { name: string; displayName: string; color: string; techRequired: number; bonuses: string[] } {
    const def = ERA_MAP.get(era)
    if (!def) return { name: era, displayName: era, color: '#888', techRequired: 0, bonuses: [] }
    return { name: def.name, displayName: def.displayName, color: def.color, techRequired: def.techRequired, bonuses: def.bonuses }
  }

  update(civManager: CivManager, em: EntityManager, particles: ParticleSystem, tick: number, timeline?: TimelineSystem): void {
    // Check era transitions every 120 ticks
    if (tick - this.lastCheckTick >= 120) {
      this.lastCheckTick = tick
      this.checkEraTransitions(civManager, em, particles, tick, timeline)
      this.applyEraBonuses(civManager)
    }
    // Expire temp buffs
    this.expireBuffs(civManager, tick)
  }

  private checkEraTransitions(civManager: CivManager, em: EntityManager, particles: ParticleSystem, tick: number, timeline?: TimelineSystem): void {
    for (const [civId, civ] of civManager.civilizations) {
      const newEra = ERA_BY_TECH[Math.min(Math.max(civ.techLevel, 1), 5)] ?? 'stone'
      const oldEra = this.civEras.get(civId)

      if (!oldEra) {
        // First time seeing this civ, just register
        this.civEras.set(civId, newEra)
        continue
      }

      if (newEra !== oldEra) {
        this.civEras.set(civId, newEra)
        const def = ERA_MAP.get(newEra)!

        // Event log
        EventLog.log('era', `${civ.name} has entered the ${def.displayName}!`, tick)

        // Timeline record
        timeline?.recordEvent(tick, 'era_change', `${civ.name} entered the ${def.displayName}`)

        // Firework at territory center
        const center = this.getTerritoryCenter(civ)
        if (center) {
          particles.spawnFirework(center.x, center.y, def.color)
          particles.spawnFirework(center.x + 2, center.y - 1, civ.color)
        }

        // Era-specific special events
        this.triggerSpecialEvent(newEra, civ, em, tick, timeline)
      }
    }
  }

  private triggerSpecialEvent(era: EraName, civ: Civilization, em: EntityManager, tick: number, timeline?: TimelineSystem): void {
    switch (era) {
      case 'bronze': {
        // "The Discovery of Bronze" — all soldiers +3 damage
        const soldiers = em.getEntitiesWithComponents('creature', 'civMember')
        for (const id of soldiers) {
          const member = em.getComponent<any>(id, 'civMember')
          if (member?.civId !== civ.id) continue
          const creature = em.getComponent<CreatureComponent>(id, 'creature')
          if (creature) creature.damage += 3
        }
        EventLog.log('era', `The Discovery of Bronze! ${civ.name}'s soldiers grow stronger.`, tick)
        timeline?.recordEvent(tick, 'achievement', `${civ.name}: The Discovery of Bronze`)
        break
      }
      case 'iron': {
        // "Iron Revolution" — boost building HP
        for (const bId of civ.buildings) {
          const b = em.getComponent<BuildingComponent>(bId, 'building')
          if (b) {
            b.maxHealth = Math.round(b.maxHealth * 1.3)
            b.health = Math.min(b.health + 20, b.maxHealth)
          }
        }
        EventLog.log('era', `Iron Revolution! ${civ.name}'s buildings are reinforced.`, tick)
        timeline?.recordEvent(tick, 'achievement', `${civ.name}: Iron Revolution`)
        break
      }
      case 'medieval': {
        // "Rise of Kingdoms" — reset diplomacy
        for (const [otherId] of civ.relations) {
          civ.relations.set(otherId, 0)
        }
        EventLog.log('era', `Rise of Kingdoms! ${civ.name} enters a new political era.`, tick)
        timeline?.recordEvent(tick, 'achievement', `${civ.name}: Rise of Kingdoms`)
        break
      }
      case 'renaissance': {
        // "Age of Enlightenment" — double research speed for 600 ticks
        this.tempBuffs.push({ civId: civ.id, type: 'research_double', expiresAt: tick + 600 })
        civ.research.researchRate *= 2
        EventLog.log('era', `Age of Enlightenment! ${civ.name}'s scholars work twice as fast!`, tick)
        timeline?.recordEvent(tick, 'achievement', `${civ.name}: Age of Enlightenment`)
        break
      }
    }
  }

  private applyEraBonuses(civManager: CivManager): void {
    for (const [civId, civ] of civManager.civilizations) {
      const era = this.civEras.get(civId) ?? 'stone'
      switch (era) {
        case 'bronze':
          civ.resources.food += Math.max(1, Math.floor(civ.resources.food * 0.002))  // ~+20% over time
          break
        case 'iron':
          civ.resources.food += Math.max(1, Math.floor(civ.resources.food * 0.0016))
          civ.resources.wood += Math.max(1, Math.floor(civ.resources.wood * 0.0016))
          civ.resources.stone += Math.max(1, Math.floor(civ.resources.stone * 0.0016))
          break
        case 'medieval':
          civ.resources.gold += Math.max(1, Math.floor(civ.resources.gold * 0.004))
          if (civ.research.currentTech) {
            civ.research.progress += 0.25  // research speed boost
          }
          break
        case 'renaissance':
          civ.resources.food += Math.max(1, Math.floor(civ.resources.food * 0.0025))
          civ.resources.wood += Math.max(1, Math.floor(civ.resources.wood * 0.0025))
          civ.resources.stone += Math.max(1, Math.floor(civ.resources.stone * 0.0025))
          civ.resources.gold += Math.max(1, Math.floor(civ.resources.gold * 0.0025))
          break
      }
    }
  }

  private expireBuffs(civManager: CivManager, tick: number): void {
    for (let i = this.tempBuffs.length - 1; i >= 0; i--) {
      const buff = this.tempBuffs[i]
      if (tick >= buff.expiresAt) {
        if (buff.type === 'research_double') {
          const civ = civManager.civilizations.get(buff.civId)
          if (civ) civ.research.researchRate = Math.max(1, civ.research.researchRate / 2)
        }
        this.tempBuffs.splice(i, 1)
      }
    }
  }

  private getTerritoryCenter(civ: Civilization): { x: number; y: number } | null {
    if (civ.territory.size === 0) return null
    let sx = 0, sy = 0, count = 0
    for (const key of civ.territory) {
      const [x, y] = key.split(',')
      sx += +x; sy += +y; count++
      if (count >= 200) break // sample cap for perf
    }
    return { x: Math.round(sx / count), y: Math.round(sy / count) }
  }
}
