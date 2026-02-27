import { CivManager } from '../civilization/CivManager'
import { Civilization, TECHNOLOGIES, Technology, TECH_TREE, BuildingType, BuildingComponent } from '../civilization/Civilization'
import { EventLog } from './EventLog'

export class TechSystem {
  private tickCounter: number = 0
  private _availBuf: Technology[] = []

  /** Get all techs available at a given level */
  private getTechsForLevel(level: number): Technology[] {
    this._availBuf.length = 0
    for (const t of TECHNOLOGIES) { if (t.level === level) this._availBuf.push(t) }
    return this._availBuf
  }

  /** Get techs a civ can research (current level, not yet completed) */
  private getAvailableTechs(civ: Civilization): Technology[] {
    const byLevel = this.getTechsForLevel(civ.techLevel)
    // Note: _availBuf is reused — filter in-place
    let len = byLevel.length
    for (let _i = len - 1; _i >= 0; _i--) {
      if (civ.research.completed.includes(byLevel[_i].name)) {
        byLevel.splice(_i, 1)
      }
    }
    return byLevel
  }

  /** Auto-pick the best tech to research based on civ needs */
  private pickNextTech(civ: Civilization, civManager: CivManager): string | null {
    const available = this.getAvailableTechs(civ)
    if (available.length === 0) return null

    // Score each tech based on civ situation
    let best: Technology = available[0]
    let bestScore = -Infinity

    for (const tech of available) {
      let score = 0

      for (const effect of tech.effects) {
        switch (effect.type) {
          case 'food_bonus':
          case 'unlock_building':
            if (effect.building === BuildingType.FARM) {
              // Low food -> prioritize agriculture
              score += civ.resources.food < 20 ? 50 : 10
            } else if (effect.building === BuildingType.BARRACKS || effect.building === BuildingType.TOWER) {
              // At war -> prioritize military
              const atWar = this.isAtWar(civ)
              score += atWar ? 40 : 10
            } else if (effect.building === BuildingType.PORT) {
              score += 15
            } else if (effect.building === BuildingType.MINE) {
              score += civ.resources.stone < 15 ? 30 : 15
            } else if (effect.building === BuildingType.CASTLE) {
              score += 20
            }
            break
          case 'gather_speed':
            score += 20
            break
          case 'combat_bonus':
            score += this.isAtWar(civ) ? 45 : 15
            break
          case 'research_speed':
            score += 25 // always valuable
            break
          case 'health_regen':
            score += this.isAtWar(civ) ? 30 : 15
            break
          case 'build_speed':
            score += civ.population > 8 ? 25 : 10
            break
          case 'building_hp':
            score += this.isAtWar(civ) ? 30 : 10
            break
          case 'gold_income':
            score += civ.resources.gold < 30 ? 35 : 15
            break
          case 'territory_expansion':
            score += civ.territory.size < 50 ? 30 : 15
            break
          case 'research_to_allies':
            score += 20
            break
          case 'all_building_effects':
            score += civ.buildings.length > 5 ? 30 : 15
            break
        }
      }

      // Scholar culture trait prefers research techs
      if (civ.culture.trait === 'scholar') {
        const hasResearchEffect = tech.effects.some(e => e.type === 'research_speed')
        if (hasResearchEffect) score += 15
      }

      // Small random factor to avoid all civs picking the same order
      score += Math.random() * 5

      if (score > bestScore) {
        bestScore = score
        best = tech
      }
    }

    return best.name
  }

  private isAtWar(civ: Civilization): boolean {
    for (const [, rel] of civ.relations) {
      if (rel <= -50) return true
    }
    return false
  }

  /** Calculate effective research rate for a civ */
  private getEffectiveResearchRate(civ: Civilization, civManager: CivManager): number {
    let rate = civ.research.researchRate

    // Scholar culture bonus
    const scholarBonus = civManager.getCultureBonus(civ.id, 'tech')
    rate *= scholarBonus

    // Religion wisdom blessing bonus
    const religionBonus = civManager.getReligionTechBonus(civ.id)
    rate *= religionBonus

    // Temple count bonus: each temple adds 5% research speed
    let templeCount = 0
    for (const id of civ.buildings) {
      const b = civManager['em'].getComponent<BuildingComponent>(id, 'building')
      if (b && b.buildingType === BuildingType.TEMPLE) templeCount++
    }
    rate *= 1 + templeCount * 0.05

    // Writing tech bonus (from completed techs)
    if (civ.research.completed.includes('Writing')) {
      rate *= 1.25
    }

    // Population factor: more people = slightly faster research
    rate *= 1 + Math.min(civ.population, 20) * 0.01

    return rate
  }

  /** Check if all techs at current level are completed, advance level */
  private checkLevelAdvancement(civ: Civilization): boolean {
    const levelTechs = this.getTechsForLevel(civ.techLevel)
    const allCompleted = levelTechs.every(t => civ.research.completed.includes(t.name))

    if (allCompleted && civ.techLevel < 5) {
      civ.techLevel++
      const eraName = TECH_TREE[civ.techLevel]?.name ?? `Level ${civ.techLevel}`
      EventLog.log('tech', `${civ.name} advanced to the ${eraName}!`, 0)
      return true
    }
    return false
  }

  /** Apply effects of a completed technology */
  private applyTechEffects(civ: Civilization, tech: Technology): void {
    for (const effect of tech.effects) {
      switch (effect.type) {
        case 'research_speed':
          // Permanent research rate boost
          civ.research.researchRate *= (1 + effect.value)
          break
        // Other effects are queried dynamically via hasTech / getTechBonus
      }
    }
  }

  /** Check if a civ has completed a specific tech */
  static hasTech(civ: Civilization, techName: string): boolean {
    return civ.research.completed.includes(techName)
  }

  /** Get cumulative bonus of a specific effect type from all completed techs */
  static getTechBonus(civ: Civilization, effectType: string): number {
    let bonus = 0
    for (const techName of civ.research.completed) {
      const tech = TECHNOLOGIES.find(t => t.name === techName)
      if (!tech) continue
      for (const effect of tech.effects) {
        if (effect.type === effectType) {
          bonus += effect.value
        }
      }
    }
    return bonus
  }

  update(civManager: CivManager): void {
    this.tickCounter++
    // Only process research every 10 ticks for performance
    if (this.tickCounter % 10 !== 0) return

    for (const [, civ] of civManager.civilizations) {
      // If no current research, pick one
      if (!civ.research.currentTech) {
        const next = this.pickNextTech(civ, civManager)
        if (next) {
          const tech = TECHNOLOGIES.find(t => t.name === next)
          if (tech && civ.resources.gold >= tech.cost) {
            civ.resources.gold -= tech.cost
            civ.research.currentTech = next
            civ.research.progress = 0
          }
        }
        continue
      }

      // Advance current research
      const tech = TECHNOLOGIES.find(t => t.name === civ.research.currentTech)
      if (!tech) {
        civ.research.currentTech = null
        continue
      }

      const rate = this.getEffectiveResearchRate(civ, civManager)
      // Progress as percentage: each update adds (rate / researchTime) * 100 * ticksBetweenUpdates
      const progressIncrement = tech.researchTime > 0 ? (rate / tech.researchTime) * 100 * 10 : 0
      civ.research.progress += progressIncrement

      // Research complete
      if (civ.research.progress >= 100) {
        civ.research.progress = 0
        civ.research.completed.push(tech.name)
        civ.research.currentTech = null

        // Apply permanent effects
        this.applyTechEffects(civ, tech)

        EventLog.log('tech', `${civ.name} researched ${tech.name}: ${tech.description}`, 0)

        // Share research with allies if Printing Press is completed
        if (civ.research.completed.includes('Printing Press')) {
          this.shareResearchWithAllies(civ, tech, civManager)
        }

        // Check for level advancement
        this.checkLevelAdvancement(civ)
      }
    }
  }

  private shareResearchWithAllies(civ: Civilization, tech: Technology, civManager: CivManager): void {
    for (const [otherId] of civ.relations) {
      const relation = civ.relations.get(otherId) ?? 0
      if (relation <= 50) continue // only allies

      const otherCiv = civManager.civilizations.get(otherId)
      if (!otherCiv) continue

      // Give allies a 20% research boost on their current tech
      if (otherCiv.research.currentTech) {
        otherCiv.research.progress = Math.min(99, otherCiv.research.progress + 20)
      }
    }
  }
}
