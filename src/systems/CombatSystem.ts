import { EntityManager, EntityId, PositionComponent, NeedsComponent, CreatureComponent, RenderComponent, AIComponent, HeroComponent, getHeroTitle } from '../ecs/Entity'
import { BuildingComponent, BuildingType, CivMemberComponent } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'
import { ParticleSystem } from './ParticleSystem'
import { SoundSystem } from './SoundSystem'
import { EventLog } from './EventLog'

export class CombatSystem {
  private em: EntityManager
  private civManager: CivManager
  private particles: ParticleSystem
  private audio: SoundSystem
  private tick: number = 0

  constructor(em: EntityManager, civManager: CivManager, particles: ParticleSystem, audio: SoundSystem) {
    this.em = em
    this.civManager = civManager
    this.particles = particles
    this.audio = audio
  }

  update(tick: number = 0): void {
    this.tick = tick
    const entities = this.em.getEntitiesWithComponents('position', 'creature', 'needs')

    // Spatial hash for fast neighbor lookup
    const grid: Map<string, EntityId[]> = new Map()
    for (const id of entities) {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')!
      const key = `${Math.floor(pos.x / 5)},${Math.floor(pos.y / 5)}`
      if (!grid.has(key)) grid.set(key, [])
      grid.get(key)!.push(id)
    }

    // Check combat for each entity
    for (const id of entities) {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')!
      const creature = this.em.getComponent<CreatureComponent>(id, 'creature')!
      const needs = this.em.getComponent<NeedsComponent>(id, 'needs')!
      const civMember = this.em.getComponent<CivMemberComponent>(id, 'civMember')

      if (needs.health <= 0) continue

      // Find nearby entities
      const cx = Math.floor(pos.x / 5)
      const cy = Math.floor(pos.y / 5)
      const nearby: EntityId[] = []

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const key = `${cx + dx},${cy + dy}`
          const cell = grid.get(key)
          if (cell) nearby.push(...cell)
        }
      }

      for (const otherId of nearby) {
        if (otherId === id) continue

        const otherPos = this.em.getComponent<PositionComponent>(otherId, 'position')!
        const otherNeeds = this.em.getComponent<NeedsComponent>(otherId, 'needs')
        const otherCreature = this.em.getComponent<CreatureComponent>(otherId, 'creature')
        const otherCivMember = this.em.getComponent<CivMemberComponent>(otherId, 'civMember')

        if (!otherNeeds || !otherCreature || otherNeeds.health <= 0) continue

        const dx = pos.x - otherPos.x
        const dy = pos.y - otherPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Hero ranger gets extended range
        const attackerHero = this.em.getComponent<HeroComponent>(id, 'hero')
        const combatRange = (attackerHero && attackerHero.ability === 'ranger') ? 3 : 2

        if (dist > combatRange) continue // Too far for combat

        // Determine if hostile
        const shouldFight = this.isHostile(creature, civMember, otherCreature, otherCivMember)

        if (shouldFight && Math.random() < 0.1) {
          // Apply damage with tech bonus
          let damage = creature.damage * (0.5 + Math.random() * 0.5)
          if (civMember) {
            const attackerCiv = this.civManager.civilizations.get(civMember.civId)
            if (attackerCiv) {
              // Tech level 3+: +20% damage, level 5: additional bonus
              if (attackerCiv.techLevel >= 5) damage *= 1.4
              else if (attackerCiv.techLevel >= 3) damage *= 1.2
            }
          }

          // Hero damage bonuses
          if (attackerHero) {
            switch (attackerHero.ability) {
              case 'warrior':
                damage *= 1.5
                break
              case 'ranger':
                damage *= 1.3
                break
              case 'berserker': {
                // Lower health = more damage, up to +100%
                const hpRatio = needs.health / 100
                const berserkerBonus = 1 + (1 - hpRatio)
                damage *= berserkerBonus
                break
              }
            }
          }

          otherNeeds.health -= damage
          this.audio.playCombat()

          if (otherNeeds.health <= 0) {
            this.onKill(id, otherId)
            this.audio.playDeath()
          }
        }
      }
    }

    // Tower defense: towers attack nearby enemies
    if (tick % 30 === 0) {
      this.updateTowerDefense(entities, grid)
    }

    // Clean up dead entities
    for (const id of entities) {
      const needs = this.em.getComponent<NeedsComponent>(id, 'needs')
      if (needs && needs.health <= 0) {
        const pos = this.em.getComponent<PositionComponent>(id, 'position')
        const render = this.em.getComponent<RenderComponent>(id, 'render')
        if (pos) {
          this.particles.spawnDeath(pos.x, pos.y, render ? render.color : '#880000')
        }
        this.em.removeEntity(id)
      }
    }
  }

  private isHostile(
    a: CreatureComponent, aCiv: CivMemberComponent | undefined,
    b: CreatureComponent, bCiv: CivMemberComponent | undefined
  ): boolean {
    // Hostile creatures attack everything
    if (a.isHostile && !b.isHostile) return true
    if (a.isHostile && b.isHostile && a.species !== b.species) return true

    // Different civilizations may fight
    if (aCiv && bCiv && aCiv.civId !== bCiv.civId) {
      const civA = this.civManager.civilizations.get(aCiv.civId)
      const civB = this.civManager.civilizations.get(bCiv.civId)
      if (civA && civB) {
        const relation = civA.relations.get(bCiv.civId) ?? 0
        return relation < -30 // Fight if relations are bad
      }
    }

    // Wolves attack sheep
    if (a.species === 'wolf' && b.species === 'sheep') return true

    return false
  }

  private onKill(killerId: EntityId, victimId: EntityId): void {
    const killerCreature = this.em.getComponent<CreatureComponent>(killerId, 'creature')
    const victimCreature = this.em.getComponent<CreatureComponent>(victimId, 'creature')
    if (killerCreature && victimCreature) {
      EventLog.log('death', `${killerCreature.name} (${killerCreature.species}) killed ${victimCreature.name} (${victimCreature.species})`, this.tick)
    }

    // Hero XP gain
    const killerHero = this.em.getComponent<HeroComponent>(killerId, 'hero')
    if (killerHero && victimCreature) {
      killerHero.kills++
      // XP based on victim type
      const victimHero = this.em.getComponent<HeroComponent>(victimId, 'hero')
      if (victimCreature.species === 'dragon') {
        killerHero.xp += 50
      } else if (victimHero) {
        killerHero.xp += 25
      } else {
        killerHero.xp += 10
      }

      // Check level up
      if (killerHero.xp >= killerHero.xpToNext) {
        killerHero.xp -= killerHero.xpToNext
        killerHero.level++
        killerHero.xpToNext = Math.floor(killerHero.xpToNext * 1.5)
        killerHero.title = getHeroTitle(killerHero.ability, killerHero.level)

        // Stat boosts
        if (killerCreature) {
          killerCreature.damage += 3
          killerCreature.speed += 0.5
        }
        const killerNeeds = this.em.getComponent<NeedsComponent>(killerId, 'needs')
        if (killerNeeds) {
          killerNeeds.health = 100
        }

        // Level up particles
        const killerPos = this.em.getComponent<PositionComponent>(killerId, 'position')
        if (killerPos) {
          this.particles.spawn(killerPos.x, killerPos.y, 8, '#ffff00', 1.5)
          this.particles.spawn(killerPos.x, killerPos.y, 5, '#ffffff', 1.0)
        }

        EventLog.log('hero', `${killerCreature?.name} leveled up to Lv.${killerHero.level} ${killerHero.title}!`, this.tick)
      }
    }

    const victimCiv = this.em.getComponent<CivMemberComponent>(victimId, 'civMember')
    if (victimCiv) {
      const civ = this.civManager.civilizations.get(victimCiv.civId)
      if (civ) {
        civ.population = Math.max(0, civ.population - 1)

        // Worsen relations with killer's civ
        const killerCiv = this.em.getComponent<CivMemberComponent>(killerId, 'civMember')
        if (killerCiv && killerCiv.civId !== victimCiv.civId) {
          const relation = civ.relations.get(killerCiv.civId) ?? 0
          civ.relations.set(killerCiv.civId, Math.max(-100, relation - 20))

          const otherCiv = this.civManager.civilizations.get(killerCiv.civId)
          if (otherCiv) {
            const otherRelation = otherCiv.relations.get(victimCiv.civId) ?? 0
            otherCiv.relations.set(victimCiv.civId, Math.max(-100, otherRelation - 10))
          }
        }
      }
    }

    // Killer heals a bit from eating (predators)
    const killerNeeds = this.em.getComponent<NeedsComponent>(killerId, 'needs')
    if (killerNeeds && killerCreature && killerCreature.isHostile) {
      killerNeeds.hunger = Math.max(0, killerNeeds.hunger - 30)
      killerNeeds.health = Math.min(100, killerNeeds.health + 10)
    }
  }

  private updateTowerDefense(creatures: EntityId[], grid: Map<string, EntityId[]>): void {
    const towers = this.em.getEntitiesWithComponent('building')

    for (const towerId of towers) {
      const b = this.em.getComponent<BuildingComponent>(towerId, 'building')
      if (!b || b.buildingType !== BuildingType.TOWER) continue

      const tPos = this.em.getComponent<PositionComponent>(towerId, 'position')
      if (!tPos) continue

      const range = 8
      const cx = Math.floor(tPos.x / 5)
      const cy = Math.floor(tPos.y / 5)

      // Check nearby creatures
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const cell = grid.get(`${cx + dx},${cy + dy}`)
          if (!cell) continue

          for (const creatureId of cell) {
            const cPos = this.em.getComponent<PositionComponent>(creatureId, 'position')
            if (!cPos) continue

            const ddx = cPos.x - tPos.x
            const ddy = cPos.y - tPos.y
            if (ddx * ddx + ddy * ddy > range * range) continue

            // Check if enemy
            const cCiv = this.em.getComponent<CivMemberComponent>(creatureId, 'civMember')
            const creature = this.em.getComponent<CreatureComponent>(creatureId, 'creature')
            if (!creature) continue

            let isEnemy = false
            if (creature.isHostile || creature.species === 'wolf' || creature.species === 'dragon') {
              isEnemy = true
            } else if (cCiv && cCiv.civId !== b.civId) {
              const towerCiv = this.civManager.civilizations.get(b.civId)
              if (towerCiv) {
                const rel = towerCiv.relations.get(cCiv.civId) ?? 0
                if (rel < -30) isEnemy = true
              }
            }

            if (isEnemy) {
              const needs = this.em.getComponent<NeedsComponent>(creatureId, 'needs')
              if (needs && needs.health > 0) {
                needs.health -= 5 * b.level
                this.particles.spawn(cPos.x, cPos.y, 2, '#ffaa00', 0.5)
              }
            }
          }
        }
      }
    }
  }
}
