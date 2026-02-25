import { EntityManager, EntityId, PositionComponent, NeedsComponent, CreatureComponent, RenderComponent, AIComponent } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'
import { ParticleSystem } from './ParticleSystem'
import { SoundSystem } from './SoundSystem'

export class CombatSystem {
  private em: EntityManager
  private civManager: CivManager
  private particles: ParticleSystem
  private audio: SoundSystem

  constructor(em: EntityManager, civManager: CivManager, particles: ParticleSystem, audio: SoundSystem) {
    this.em = em
    this.civManager = civManager
    this.particles = particles
    this.audio = audio
  }

  update(): void {
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

        if (dist > 2) continue // Too far for combat

        // Determine if hostile
        const shouldFight = this.isHostile(creature, civMember, otherCreature, otherCivMember)

        if (shouldFight && Math.random() < 0.1) {
          // Apply damage
          const damage = creature.damage * (0.5 + Math.random() * 0.5)
          otherNeeds.health -= damage
          this.audio.playCombat()

          if (otherNeeds.health <= 0) {
            this.onKill(id, otherId)
            this.audio.playDeath()
          }
        }
      }
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
    const killerCreature = this.em.getComponent<CreatureComponent>(killerId, 'creature')
    if (killerNeeds && killerCreature && killerCreature.isHostile) {
      killerNeeds.hunger = Math.max(0, killerNeeds.hunger - 30)
      killerNeeds.health = Math.min(100, killerNeeds.health + 10)
    }
  }
}
