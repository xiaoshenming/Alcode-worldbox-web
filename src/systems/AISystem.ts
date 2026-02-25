import { EntityManager, EntityId, PositionComponent, VelocityComponent, NeedsComponent, AIComponent, CreatureComponent, RenderComponent } from '../ecs/Entity'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'

export class AISystem {
  private em: EntityManager
  private world: World
  private particles: ParticleSystem

  constructor(em: EntityManager, world: World, particles: ParticleSystem) {
    this.em = em
    this.world = world
    this.particles = particles
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
