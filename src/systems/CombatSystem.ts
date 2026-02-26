import { EntityManager, EntityId, PositionComponent, NeedsComponent, CreatureComponent, RenderComponent, AIComponent, HeroComponent, getHeroTitle } from '../ecs/Entity'
import { BuildingComponent, BuildingType, CivMemberComponent } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'
import { ParticleSystem } from './ParticleSystem'
import { SoundSystem } from './SoundSystem'
import { EventLog } from './EventLog'
import { ArtifactSystem, getArtifactCombatBonus, getArtifactBonus } from './ArtifactSystem'
import { SpatialHashSystem } from './SpatialHashSystem'

export class CombatSystem {
  private em: EntityManager
  private civManager: CivManager
  private particles: ParticleSystem
  private audio: SoundSystem
  private tick: number = 0
  private artifactSystem: ArtifactSystem | null = null
  private spatialHash: SpatialHashSystem
  /** Batch index for staggered updates — only process 1/3 of entities per tick */
  private batchIndex: number = 0

  constructor(em: EntityManager, civManager: CivManager, particles: ParticleSystem, audio: SoundSystem, spatialHash: SpatialHashSystem) {
    this.em = em
    this.civManager = civManager
    this.particles = particles
    this.audio = audio
    this.spatialHash = spatialHash
  }

  setArtifactSystem(artifactSystem: ArtifactSystem): void {
    this.artifactSystem = artifactSystem
  }

  update(tick: number = 0): void {
    this.tick = tick
    const entities = this.em.getEntitiesWithComponents('position', 'creature', 'needs')

    // Staggered batch: only process 1/10 of entities per tick for combat checks
    const BATCH_COUNT = 10
    const batch = this.batchIndex % BATCH_COUNT
    this.batchIndex++

    // Check combat for each entity in this batch
    for (let idx = batch; idx < entities.length; idx += BATCH_COUNT) {
      const id = entities[idx]
      const pos = this.em.getComponent<PositionComponent>(id, 'position')
      const creature = this.em.getComponent<CreatureComponent>(id, 'creature')
      const needs = this.em.getComponent<NeedsComponent>(id, 'needs')
      if (!pos || !creature || !needs) continue
      const civMember = this.em.getComponent<CivMemberComponent>(id, 'civMember')

      if (needs.health <= 0) continue

      // Hoist hero lookup out of inner loop — only depends on attacker id
      const attackerHero = this.em.getComponent<HeroComponent>(id, 'hero')
      const combatRange = (attackerHero && attackerHero.ability === 'ranger') ? 3 : 2
      const combatRange2 = combatRange * combatRange

      // Find nearby entities using spatial hash — query radius matches combat range
      const nearby = this.spatialHash.query(pos.x, pos.y, combatRange)

      for (const otherId of nearby) {
        if (otherId === id) continue

        // Check distance first (cheapest filter)
        const otherPos = this.em.getComponent<PositionComponent>(otherId, 'position')
        if (!otherPos) continue
        const dx = pos.x - otherPos.x
        const dy = pos.y - otherPos.y
        const dist2 = dx * dx + dy * dy
        if (dist2 > combatRange2) continue

        const otherNeeds = this.em.getComponent<NeedsComponent>(otherId, 'needs')
        if (!otherNeeds || otherNeeds.health <= 0) continue

        const otherCreature = this.em.getComponent<CreatureComponent>(otherId, 'creature')
        if (!otherCreature) continue
        const otherCivMember = this.em.getComponent<CivMemberComponent>(otherId, 'civMember')

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

              // Warrior culture bonus
              const cultureMult = this.civManager.getCultureBonus(civMember.civId, 'combat')
              damage *= cultureMult
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

          // Artifact combat bonus
          damage *= getArtifactCombatBonus(this.em, id)

          otherNeeds.health -= damage
          this.audio.playCombat()

          if (otherNeeds.health <= 0) {
            this.onKill(id, otherId)
            this.audio.playDeath()
          }
        }
      }
    }

    // Siege: soldiers attack enemy buildings
    if (tick % 20 === 0) {
      this.updateSiege(entities)
    }

    // Tower defense: towers attack nearby enemies
    if (tick % 30 === 0) {
      this.updateTowerDefense()
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
        // Drop artifacts on death
        if (this.artifactSystem) {
          this.artifactSystem.dropAllArtifacts(this.em, id)
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
      let xpGain = 10
      if (victimCreature.species === 'dragon') {
        xpGain = 50
      } else if (victimHero) {
        xpGain = 25
      }

      // Artifact XP bonus
      xpGain = Math.floor(xpGain * getArtifactBonus(this.em, killerId, 'xp'))
      killerHero.xp += xpGain

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

  private updateTowerDefense(): void {
    const towers = this.em.getEntitiesWithComponent('building')

    for (const towerId of towers) {
      const b = this.em.getComponent<BuildingComponent>(towerId, 'building')
      if (!b || b.buildingType !== BuildingType.TOWER) continue

      const tPos = this.em.getComponent<PositionComponent>(towerId, 'position')
      if (!tPos) continue

      const range = 8
      // Query global spatial hash for entities within tower range
      const nearby = this.spatialHash.query(tPos.x, tPos.y, range)

      for (const creatureId of nearby) {
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

  private updateSiege(creatures: EntityId[]): void {
    const buildings = this.em.getEntitiesWithComponent('building')

    for (const creatureId of creatures) {
      const civMember = this.em.getComponent<CivMemberComponent>(creatureId, 'civMember')
      if (!civMember || civMember.role !== 'soldier') continue

      const cPos = this.em.getComponent<PositionComponent>(creatureId, 'position')
      const creature = this.em.getComponent<CreatureComponent>(creatureId, 'creature')
      const needs = this.em.getComponent<NeedsComponent>(creatureId, 'needs')
      if (!cPos || !creature || !needs || needs.health <= 0) continue

      const attackerCiv = this.civManager.civilizations.get(civMember.civId)
      if (!attackerCiv) continue

      for (const buildingId of buildings) {
        const b = this.em.getComponent<BuildingComponent>(buildingId, 'building')
        if (!b || b.civId === civMember.civId) continue

        // Check if at war (relation < -50)
        const relation = attackerCiv.relations.get(b.civId) ?? 0
        if (relation >= -50) continue

        const bPos = this.em.getComponent<PositionComponent>(buildingId, 'position')
        if (!bPos) continue

        const dx = cPos.x - bPos.x
        const dy = cPos.y - bPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 3) continue

        // Deal siege damage
        const damage = creature.damage * (0.3 + Math.random() * 0.4)
        b.health -= damage
        this.particles.spawn(bPos.x, bPos.y, 3, '#ff6600', 0.8)

        if (b.health <= 0) {
          // Destroy building
          const defenderCiv = this.civManager.civilizations.get(b.civId)
          if (defenderCiv) {
            const idx = defenderCiv.buildings.indexOf(buildingId)
            if (idx !== -1) defenderCiv.buildings.splice(idx, 1)
            EventLog.log('combat', `${attackerCiv.name} destroyed ${defenderCiv.name}'s ${b.buildingType}`, this.tick)
          }
          this.particles.spawn(bPos.x, bPos.y, 8, '#ff4400', 1.5)
          this.em.removeEntity(buildingId)
        }

        break // One building per soldier per tick
      }
    }
  }
}
