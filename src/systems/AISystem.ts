import { EntityManager, EntityId, PositionComponent, VelocityComponent, NeedsComponent, AIComponent, CreatureComponent, RenderComponent } from '../ecs/Entity'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { CreatureFactory } from '../entities/CreatureFactory'
import { EntityType } from '../utils/Constants'

export class AISystem {
  private em: EntityManager
  private world: World
  private particles: ParticleSystem
  private factory: CreatureFactory
  private breedCooldown: Map<EntityId, number> = new Map()

  constructor(em: EntityManager, world: World, particles: ParticleSystem, factory: CreatureFactory) {
    this.em = em
    this.world = world
    this.particles = particles
    this.factory = factory
  }

  update(): void {
    const entities = this.em.getEntitiesWithComponents('position', 'ai', 'creature', 'needs')

    for (const id of entities) {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')!
      const ai = this.em.getComponent<AIComponent>(id, 'ai')!
      const needs = this.em.getComponent<NeedsComponent>(id, 'needs')!
      const creature = this.em.getComponent<CreatureComponent>(id, 'creature')!
      const vel = this.em.getComponent<VelocityComponent>(id, 'velocity')

      // Update cooldown
      if (ai.cooldown > 0) ai.cooldown--

      // Aging
      creature.age += 0.1
      if (creature.age >= creature.maxAge) {
        const render = this.em.getComponent<RenderComponent>(id, 'render')
        this.particles.spawnDeath(pos.x, pos.y, render ? render.color : '#880000')
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
        this.em.removeEntity(id)
        continue
      }

      // State machine
      if (needs.hunger > 70) {
        ai.state = 'hungry'
      } else if (ai.state === 'hungry' && needs.hunger < 30) {
        ai.state = 'idle'
      }

      // Execute behavior based on state
      switch (ai.state) {
        case 'idle':
          if (Math.random() < 0.02) {
            ai.state = 'wandering'
            ai.targetX = pos.x + (Math.random() - 0.5) * 20
            ai.targetY = pos.y + (Math.random() - 0.5) * 20
          }
          break

        case 'wandering':
          this.moveTowards(pos, ai, creature, vel)
          if (this.reachedTarget(pos, ai)) {
            ai.state = 'idle'
          }
          break

        case 'hungry':
          // Find food (move to grass/forest tiles)
          if (ai.cooldown === 0) {
            ai.targetX = pos.x + (Math.random() - 0.5) * 30
            ai.targetY = pos.y + (Math.random() - 0.5) * 30
            ai.cooldown = 60
          }
          this.moveTowards(pos, ai, creature, vel)

          // Eat if on grass/forest
          const tile = this.world.getTile(Math.floor(pos.x), Math.floor(pos.y))
          if (tile === TileType.GRASS || tile === TileType.FOREST) {
            needs.hunger = Math.max(0, needs.hunger - 0.5)
          }
          break
      }

      // Clamp position
      pos.x = Math.max(0, Math.min(WORLD_WIDTH - 1, pos.x))
      pos.y = Math.max(0, Math.min(WORLD_HEIGHT - 1, pos.y))
    }

    // Breeding pass
    this.updateBreeding(entities)
  }

  private updateBreeding(entities: EntityId[]): void {
    const newborns: { species: EntityType; x: number; y: number }[] = []

    for (const id of entities) {
      if (!this.em.hasComponent(id, 'creature')) continue
      const creature = this.em.getComponent<CreatureComponent>(id, 'creature')!
      const pos = this.em.getComponent<PositionComponent>(id, 'position')!
      const needs = this.em.getComponent<NeedsComponent>(id, 'needs')!

      // Must be adult (age > 20% of maxAge), healthy, not hungry
      if (creature.age < creature.maxAge * 0.2) continue
      if (needs.health < 50 || needs.hunger > 60) continue
      if (creature.gender !== 'female') continue

      // Breed cooldown
      const cd = this.breedCooldown.get(id) ?? 0
      if (cd > 0) {
        this.breedCooldown.set(id, cd - 1)
        continue
      }

      // Find nearby male of same species
      for (const otherId of entities) {
        if (otherId === id) continue
        if (!this.em.hasComponent(otherId, 'creature')) continue
        const other = this.em.getComponent<CreatureComponent>(otherId, 'creature')!
        if (other.species !== creature.species || other.gender !== 'male') continue
        if (other.age < other.maxAge * 0.2) continue

        const otherPos = this.em.getComponent<PositionComponent>(otherId, 'position')!
        const dx = pos.x - otherPos.x
        const dy = pos.y - otherPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 3 && Math.random() < 0.005) {
          newborns.push({ species: creature.species as EntityType, x: pos.x, y: pos.y })
          this.breedCooldown.set(id, 300)
          break
        }
      }
    }

    for (const baby of newborns) {
      const babyId = this.factory.spawn(baby.species, baby.x, baby.y)
      const render = this.em.getComponent<RenderComponent>(babyId, 'render')
      this.particles.spawnBirth(baby.x, baby.y, render ? render.color : '#ffffff')
    }
  }

  private moveTowards(pos: PositionComponent, ai: AIComponent, creature: CreatureComponent, vel: VelocityComponent | undefined): void {
    const dx = ai.targetX - pos.x
    const dy = ai.targetY - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 0.5) {
      const moveX = (dx / dist) * creature.speed * 0.1
      const moveY = (dy / dist) * creature.speed * 0.1
      pos.x += moveX
      pos.y += moveY

      if (vel) {
        vel.vx = moveX
        vel.vy = moveY
      }
    }
  }

  private reachedTarget(pos: PositionComponent, ai: AIComponent): boolean {
    const dx = ai.targetX - pos.x
    const dy = ai.targetY - pos.y
    return Math.sqrt(dx * dx + dy * dy) < 1
  }
}
