import { EntityManager, EntityId, PositionComponent, VelocityComponent, NeedsComponent, AIComponent, CreatureComponent, RenderComponent, HeroComponent, NomadComponent, GeneticsComponent } from '../ecs/Entity'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { CreatureFactory } from '../entities/CreatureFactory'
import { EntityType } from '../utils/Constants'
import { findNextStep, isWalkable } from '../utils/Pathfinding'
import { EventLog } from './EventLog'
import { ResourceSystem, ResourceNode } from './ResourceSystem'
import { CivMemberComponent } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'
import { GeneticsSystem } from './GeneticsSystem'
import { SpatialHashSystem } from './SpatialHashSystem'

// Pre-allocated species max-age table — avoids creating a new object+7 arrays on every birth event
const _SPECIES_MAX_AGE: Record<string, readonly [number, number]> = {
  human: [600, 900], elf: [1200, 2000], dwarf: [800, 1200], orc: [400, 700],
  sheep: [300, 500], wolf: [400, 600], dragon: [2000, 4000],
} as const
const _DEFAULT_AGE_RANGE: readonly [number, number] = [500, 800] as const

export class AISystem {
  private em: EntityManager
  private world: World
  private particles: ParticleSystem
  private factory: CreatureFactory
  private spatialHash: SpatialHashSystem
  private breedCooldown: Map<EntityId, number> = new Map()
  private resources: ResourceSystem | null = null
  /** Batch index for staggered updates — only process 1/3 of entities per tick */
  private batchIndex: number = 0
  /** Pre-allocated newborn record slots — reused each tick to avoid per-birth object allocation */
  private _newbornsBuf: { species: EntityType; x: number; y: number; motherId: EntityId; fatherId: EntityId }[] =
    Array.from({ length: 32 }, () => ({ species: 'human' as EntityType, x: 0, y: 0, motherId: 0, fatherId: 0 }))
  private _newbornsCount = 0
  private _walkableTargetBuf = { x: 0, y: 0 }
  private _threatBuf: { id: EntityId; dist: number } = { id: 0, dist: 0 }

  constructor(em: EntityManager, world: World, particles: ParticleSystem, factory: CreatureFactory, spatialHash: SpatialHashSystem) {
    this.em = em
    this.world = world
    this.particles = particles
    this.factory = factory
    this.spatialHash = spatialHash
  }

  setResourceSystem(resources: ResourceSystem): void {
    this.resources = resources
  }

  setCivManager(_civManager: CivManager): void {
    // stored for future use
  }

  update(): void {
    const entities = this.em.getEntitiesWithComponents('position', 'ai', 'creature', 'needs')

    // Staggered batch: only process 1/8 of entities per tick
    const BATCH_COUNT = 8
    const batch = this.batchIndex % BATCH_COUNT
    this.batchIndex++

    for (let idx = batch; idx < entities.length; idx += BATCH_COUNT) {
      const id = entities[idx]
      const pos = this.em.getComponent<PositionComponent>(id, 'position')
      const ai = this.em.getComponent<AIComponent>(id, 'ai')
      const needs = this.em.getComponent<NeedsComponent>(id, 'needs')
      const creature = this.em.getComponent<CreatureComponent>(id, 'creature')
      if (!pos || !ai || !needs || !creature) continue
      const vel = this.em.getComponent<VelocityComponent>(id, 'velocity')

      // Update cooldown
      if (ai.cooldown > 0) ai.cooldown--

      // Aging
      creature.age += 0.1
      if (creature.age >= creature.maxAge) {
        const render = this.em.getComponent<RenderComponent>(id, 'render')
        this.particles.spawnDeath(pos.x, pos.y, render ? render.color : '#880000')
        EventLog.log('death', `${creature.name} (${creature.species}) died of old age`, this.world.tick)
        this.em.removeEntity(id)
        this.breedCooldown.delete(id)
        continue
      }

      // Hunger increases over time
      needs.hunger += 0.02
      if (needs.hunger >= 100) {
        needs.health -= 1
      }

      // Check death
      if (needs.health <= 0) {
        const render = this.em.getComponent<RenderComponent>(id, 'render')
        this.particles.spawnDeath(pos.x, pos.y, render ? render.color : '#880000')
        EventLog.log('death', `${creature.name} (${creature.species}) starved to death`, this.world.tick)
        this.em.removeEntity(id)
        continue
      }

      // State machine — threat detection overrides other states
      const threat = this.findNearbyThreat(id, pos, creature)
      if (threat) {
        if (creature.isHostile || creature.species === 'wolf' || creature.species === 'dragon') {
          // Predators attack
          ai.state = 'attacking'
          ai.targetEntity = threat.id
        } else if (needs.health < 60 || creature.damage < 10) {
          // Weak/injured creatures flee
          ai.state = 'fleeing'
          ai.targetEntity = threat.id
        }
      }

      // Hero behavior adjustments
      const hero = this.em.getComponent<HeroComponent>(id, 'hero')
      if (hero) {
        // Heroes never flee, they fight
        if (ai.state === 'fleeing') {
          ai.state = 'attacking'
        }
        // Healer ability: heal nearby allies
        if (hero.ability === 'healer' && hero.abilityCooldown <= 0) {
          this.heroHeal(id, pos, hero)
        }
        if (hero.abilityCooldown > 0) hero.abilityCooldown--
      }

      // Hunger can override idle/wandering but not combat states
      if (ai.state !== 'fleeing' && ai.state !== 'attacking' && ai.state !== 'migrating') {
        if (needs.hunger > 70) {
          ai.state = 'hungry'
        } else if (ai.state === 'hungry' && needs.hunger < 30) {
          ai.state = 'idle'
        }
      }

      // Clear combat states if target is gone
      if ((ai.state === 'fleeing' || ai.state === 'attacking') && ai.targetEntity !== null) {
        if (!this.em.hasComponent(ai.targetEntity, 'position')) {
          ai.state = 'idle'
          ai.targetEntity = null
        }
      }

      // Execute behavior based on state
      switch (ai.state) {
        case 'idle':
          if (Math.random() < 0.02) {
            // Civ members seek resources when idle
            const civMember = this.em.getComponent<CivMemberComponent>(id, 'civMember')
            if (civMember && civMember.role === 'worker' && this.resources) {
              const resNode = this.findNearestResource(pos, null, 25)
              if (resNode) {
                ai.state = 'wandering'
                ai.targetX = resNode.x
                ai.targetY = resNode.y
                break
              }
            }
            ai.state = 'wandering'
            const target = this.findWalkableTarget(pos, creature, 20)
            ai.targetX = target.x
            ai.targetY = target.y
          }
          break

        case 'wandering':
          this.moveTowards(pos, ai, creature, vel)
          if (this.reachedTarget(pos, ai)) {
            ai.state = 'idle'
          }
          break

        case 'hungry':
          // Find food: prioritize berry resource nodes, fallback to grass/forest
          if (ai.cooldown === 0) {
            const berryNode = this.findNearestResource(pos, 'berry', 30)
            if (berryNode) {
              ai.targetX = berryNode.x
              ai.targetY = berryNode.y
            } else {
              const target = this.findWalkableTarget(pos, creature, 30)
              ai.targetX = target.x
              ai.targetY = target.y
            }
            ai.cooldown = 60
          }
          this.moveTowards(pos, ai, creature, vel)

          // Eat from nearby berry node first
          if (this.tryEatFromResource(pos, needs)) {
            // ate from resource node
          } else {
            // Fallback: eat if on grass/forest
            const tile = this.world.getTile(Math.floor(pos.x), Math.floor(pos.y))
            if (tile === TileType.GRASS || tile === TileType.FOREST) {
              needs.hunger = Math.max(0, needs.hunger - 0.5)
            }
          }
          break

        case 'fleeing': {
          if (ai.targetEntity === null) { ai.state = 'idle'; break }
          const threatPos = this.em.getComponent<PositionComponent>(ai.targetEntity, 'position')
          if (!threatPos) { ai.state = 'idle'; ai.targetEntity = null; break }

          // Run away from threat
          const fdx = pos.x - threatPos.x
          const fdy = pos.y - threatPos.y
          const fdist2 = fdx * fdx + fdy * fdy

          if (fdist2 > 225) {
            // Safe distance (15^2=225), stop fleeing
            ai.state = 'idle'
            ai.targetEntity = null
          } else if (fdist2 < 0.01) {
            // Overlapping with threat — flee in random direction
            ai.targetX = pos.x + (Math.random() - 0.5) * 20
            ai.targetY = pos.y + (Math.random() - 0.5) * 20
            this.moveTowards(pos, ai, creature, vel)
          } else {
            // Flee in opposite direction
            const fdist = Math.sqrt(fdist2) || 1
            ai.targetX = pos.x + (fdx / fdist) * 10
            ai.targetY = pos.y + (fdy / fdist) * 10
            this.moveTowards(pos, ai, creature, vel)
          }
          break
        }

        case 'attacking': {
          if (ai.targetEntity === null) { ai.state = 'idle'; break }
          const preyPos = this.em.getComponent<PositionComponent>(ai.targetEntity, 'position')
          if (!preyPos) { ai.state = 'idle'; ai.targetEntity = null; break }

          const adx = preyPos.x - pos.x
          const ady = preyPos.y - pos.y

          if (adx * adx + ady * ady > 400) {
            // Lost interest, too far
            ai.state = 'idle'
            ai.targetEntity = null
          } else {
            // Chase prey
            ai.targetX = preyPos.x
            ai.targetY = preyPos.y
            this.moveTowards(pos, ai, creature, vel)
          }
          break
        }

        case 'migrating': {
          // Nomad band migration: handled by MigrationSystem for target updates
          const nomad = this.em.getComponent<NomadComponent>(id, 'nomad')
          if (nomad) {
            // Band members move faster (1.5x), MigrationSystem sets their targets
            const origSpeed = creature.speed
            creature.speed *= 1.5
            this.moveTowards(pos, ai, creature, vel)
            creature.speed = origSpeed
            break
          }

          // Legacy fallback: non-band migrating creatures (shouldn't happen often)
          const fallbackSpeed = creature.speed
          creature.speed *= 1.5
          this.moveTowards(pos, ai, creature, vel)
          creature.speed = fallbackSpeed
          if (this.reachedTarget(pos, ai)) {
            ai.state = 'idle'
            ai.cooldown = 0
          }
          break
        }
      }

      // Clamp position
      pos.x = Math.max(0, Math.min(WORLD_WIDTH - 1, pos.x))
      pos.y = Math.max(0, Math.min(WORLD_HEIGHT - 1, pos.y))
    }

    // Breeding pass
    this.updateBreeding(entities)
  }

  private updateBreeding(entities: EntityId[]): void {
    const newborns = this._newbornsBuf
    this._newbornsCount = 0

    for (const id of entities) {
      if (!this.em.hasComponent(id, 'creature')) continue
      const creature = this.em.getComponent<CreatureComponent>(id, 'creature')
      const pos = this.em.getComponent<PositionComponent>(id, 'position')
      const needs = this.em.getComponent<NeedsComponent>(id, 'needs')
      if (!creature || !pos || !needs) continue

      // Must be adult (age > 20% of maxAge), healthy, not hungry
      if (creature.age < creature.maxAge * 0.2) continue
      if (needs.health < 50 || needs.hunger > 60) continue
      if (creature.gender !== 'female') continue

      // Fertility trait affects breed chance threshold
      const motherGenetics = this.em.getComponent<GeneticsComponent>(id, 'genetics')
      const fertilityMod = motherGenetics ? motherGenetics.traits.fertility : 1.0

      // Breed cooldown
      const cd = this.breedCooldown.get(id) ?? 0
      if (cd > 0) {
        this.breedCooldown.set(id, cd - 1)
        continue
      }

      // Find nearby male of same species using global spatial hash
      const nearby = this.spatialHash.query(pos.x, pos.y, 5)

      for (const otherId of nearby) {
            if (otherId === id) continue
            if (!this.em.hasComponent(otherId, 'creature')) continue
            const other = this.em.getComponent<CreatureComponent>(otherId, 'creature')
            if (!other) continue
            if (other.species !== creature.species || other.gender !== 'male') continue
            if (other.age < other.maxAge * 0.2) continue

            const otherPos = this.em.getComponent<PositionComponent>(otherId, 'position')
            if (!otherPos) continue
            const ddx = pos.x - otherPos.x
            const ddy = pos.y - otherPos.y
            const dist2 = ddx * ddx + ddy * ddy

            if (dist2 < 9 && Math.random() < 0.005 * fertilityMod) {
              if (this._newbornsCount < newborns.length) {
                const slot = newborns[this._newbornsCount++]
                slot.species = creature.species as EntityType
                slot.x = pos.x; slot.y = pos.y
                slot.motherId = id; slot.fatherId = otherId
              }
              this.breedCooldown.set(id, 300)
              break
            }
      }
    }

    for (let bi = 0; bi < this._newbornsCount; bi++) {
      const baby = newborns[bi]
      const babyId = this.factory.spawn(baby.species, baby.x, baby.y)
      const babyCreature = this.em.getComponent<CreatureComponent>(babyId, 'creature')

      // Inherit genetics from parents
      const motherGenetics = this.em.getComponent<GeneticsComponent>(baby.motherId, 'genetics')
      const fatherGenetics = this.em.getComponent<GeneticsComponent>(baby.fatherId, 'genetics')

      if (motherGenetics && fatherGenetics) {
        // Remove the random genetics added by factory spawn
        this.em.removeComponent(babyId, 'genetics')

        // Inherit from parents
        const childGenetics = GeneticsSystem.inheritTraits(motherGenetics, fatherGenetics, baby.motherId, baby.fatherId)

        // Attempt mutation
        const mutationName = GeneticsSystem.mutate(childGenetics)

        this.em.addComponent(babyId, childGenetics)

        // Re-apply traits (reset creature stats to base, then apply inherited traits)
        // The factory already applied random genetics, so we need to reset and reapply
        if (babyCreature) {
          // Reset to species base values before applying inherited genetics
          const baseSpeed = baby.species === 'dragon' ? 2 : baby.species === 'wolf' ? 1.5 : 1
          const baseDamage = baby.species === 'dragon' ? 50 : baby.species === 'wolf' ? 10 : 5
          babyCreature.speed = baseSpeed
          babyCreature.damage = baseDamage
          // Re-roll a fresh base maxAge from species range (factory randomized it then scaled)
          const ageRange = _SPECIES_MAX_AGE[baby.species] ?? _DEFAULT_AGE_RANGE
          babyCreature.maxAge = ageRange[0] + Math.random() * (ageRange[1] - ageRange[0])
        }
        GeneticsSystem.applyTraits(babyId, this.em)

        if (mutationName && babyCreature) {
          GeneticsSystem.logMutation(babyCreature.name, baby.species, mutationName, this.world.tick)
        }
      }

      const render = this.em.getComponent<RenderComponent>(babyId, 'render')
      this.particles.spawnBirth(baby.x, baby.y, render ? render.color : '#ffffff')
      if (babyCreature) {
        EventLog.log('birth', `${babyCreature.name} (${baby.species}) was born (gen ${this.em.getComponent<GeneticsComponent>(babyId, 'genetics')?.generation ?? 0})`, this.world.tick)
      }
    }
  }

  private moveTowards(pos: PositionComponent, ai: AIComponent, creature: CreatureComponent, vel: VelocityComponent | undefined): void {
    const canFly = creature.species === 'dragon'
    const step = findNextStep(this.world, pos.x, pos.y, ai.targetX, ai.targetY, canFly)

    if (step) {
      const speed = creature.speed * 0.1
      const moveX = step.x * speed
      const moveY = step.y * speed
      // Normalize diagonal movement
      const mag = Math.sqrt(step.x * step.x + step.y * step.y) || 1
      pos.x += (step.x / mag) * speed
      pos.y += (step.y / mag) * speed

      if (vel) {
        vel.vx = moveX
        vel.vy = moveY
      }
    } else {
      // Stuck — pick a new random target
      ai.state = 'idle'
      ai.cooldown = 30
    }
  }

  private reachedTarget(pos: PositionComponent, ai: AIComponent): boolean {
    const dx = ai.targetX - pos.x
    const dy = ai.targetY - pos.y
    return dx * dx + dy * dy < 1
  }

  private findNearestResource(pos: PositionComponent, type: string | null, range: number): ResourceNode | null {
    if (!this.resources) return null
    let best: ResourceNode | null = null
    let bestDist = range * range

    for (const node of this.resources.nodes) {
      if (node.amount <= 0) continue
      if (type && node.type !== type) continue
      const dx = node.x - pos.x
      const dy = node.y - pos.y
      const dist2 = dx * dx + dy * dy
      if (dist2 < bestDist) {
        bestDist = dist2
        best = node
      }
    }
    return best
  }

  private tryEatFromResource(pos: PositionComponent, needs: NeedsComponent): boolean {
    if (!this.resources) return false
    for (const node of this.resources.nodes) {
      if (node.type !== 'berry' || node.amount <= 0) continue
      const dx = pos.x - node.x
      const dy = pos.y - node.y
      if (dx * dx + dy * dy < 4) {
        node.amount -= 1
        needs.hunger = Math.max(0, needs.hunger - 5)
        return true
      }
    }
    return false
  }

  private findWalkableTarget(pos: PositionComponent, creature: CreatureComponent, range: number): { x: number; y: number } {
    const canFly = creature.species === 'dragon'
    for (let i = 0; i < 10; i++) {
      const tx = Math.floor(pos.x + (Math.random() - 0.5) * range)
      const ty = Math.floor(pos.y + (Math.random() - 0.5) * range)
      const tile = this.world.getTile(tx, ty)
      if (tile !== null && isWalkable(tile, canFly)) {
        this._walkableTargetBuf.x = tx; this._walkableTargetBuf.y = ty
        return this._walkableTargetBuf
      }
    }
    // Fallback: stay near current position
    this._walkableTargetBuf.x = pos.x; this._walkableTargetBuf.y = pos.y
    return this._walkableTargetBuf
  }

  private heroHeal(id: EntityId, pos: PositionComponent, hero: HeroComponent): void {
    const civMember = this.em.getComponent<CivMemberComponent>(id, 'civMember')
    // Use spatial hash instead of iterating all entities
    const nearby = this.spatialHash.query(pos.x, pos.y, 5)

    for (const otherId of nearby) {
      if (otherId === id) continue
      const otherPos = this.em.getComponent<PositionComponent>(otherId, 'position')
      if (!otherPos) continue
      const dx = pos.x - otherPos.x
      const dy = pos.y - otherPos.y
      if (dx * dx + dy * dy > 25) continue // 5 tile range

      // Only heal same civilization members
      if (civMember) {
        const otherCiv = this.em.getComponent<CivMemberComponent>(otherId, 'civMember')
        if (!otherCiv || otherCiv.civId !== civMember.civId) continue
      }

      const otherNeeds = this.em.getComponent<NeedsComponent>(otherId, 'needs')
      if (otherNeeds && otherNeeds.health < 100) {
        otherNeeds.health = Math.min(100, otherNeeds.health + 15)
        this.particles.spawn(otherPos.x, otherPos.y, 3, '#00ff88', 0.8)
        hero.abilityCooldown = 120
        break // Heal one per activation
      }
    }
  }

  private findNearbyThreat(
    id: EntityId, pos: PositionComponent, creature: CreatureComponent
  ): { id: EntityId; dist: number } | null {
    let detectRange = creature.isHostile ? 12 : 8
    // Heroes have doubled detect range
    const hero = this.em.getComponent<HeroComponent>(id, 'hero')
    if (hero) detectRange *= 2
    const detectRange2 = detectRange * detectRange
    let closestDist2 = detectRange2
    let foundId: EntityId = -1

    // Query global spatial hash with detectRange radius
    const nearby = this.spatialHash.query(pos.x, pos.y, detectRange)

    for (const otherId of nearby) {
          if (otherId === id) continue
          const otherCreature = this.em.getComponent<CreatureComponent>(otherId, 'creature')
          if (!otherCreature) continue

          // Predators look for prey; prey looks for predators
          if (creature.isHostile || creature.species === 'wolf' || creature.species === 'dragon') {
            // Predator: target non-hostile, non-same-species
            if (otherCreature.isHostile && otherCreature.species !== 'sheep') continue
            if (otherCreature.species === creature.species) continue
          } else {
            // Prey: detect hostile creatures nearby
            if (!otherCreature.isHostile && otherCreature.species !== 'wolf' && otherCreature.species !== 'dragon') continue
          }

          const otherPos = this.em.getComponent<PositionComponent>(otherId, 'position')
          if (!otherPos) continue

          const ddx = pos.x - otherPos.x
          const ddy = pos.y - otherPos.y
          const dist2 = ddx * ddx + ddy * ddy

          if (dist2 < closestDist2) {
            closestDist2 = dist2
            foundId = otherId
          }
    }

    if (foundId === -1) return null
    this._threatBuf.id = foundId
    this._threatBuf.dist = closestDist2  // stored as squared distance (dist field unused by callers)
    return this._threatBuf
  }
}
