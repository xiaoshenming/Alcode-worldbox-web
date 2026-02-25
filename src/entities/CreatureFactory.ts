import { EntityManager, EntityId, RenderComponent, PositionComponent, CreatureComponent } from '../ecs/Entity'
import { EntityType } from '../utils/Constants'

const CREATURE_COLORS: Record<string, string> = {
  human: '#ffcc99',
  elf: '#99ffcc',
  dwarf: '#cc9966',
  orc: '#66cc66',
  sheep: '#ffffff',
  wolf: '#888888',
  dragon: '#ff4444',
}

const CREATURE_SIZES: Record<string, number> = {
  human: 3,
  elf: 3,
  dwarf: 3,
  orc: 4,
  sheep: 3,
  wolf: 3,
  dragon: 6,
}

export class CreatureFactory {
  private em: EntityManager

  constructor(em: EntityManager) {
    this.em = em
  }

  spawn(type: EntityType, x: number, y: number): EntityId {
    const id = this.em.createEntity()

    // Position
    this.em.addComponent(id, {
      type: 'position',
      x, y
    })

    // Velocity
    this.em.addComponent(id, {
      type: 'velocity',
      vx: 0, vy: 0
    })

    // Render
    this.em.addComponent(id, {
      type: 'render',
      color: CREATURE_COLORS[type] || '#ff0000',
      size: CREATURE_SIZES[type] || 3
    })

    // Creature
    const isHostile = ['wolf', 'orc', 'dragon'].includes(type)
    this.em.addComponent(id, {
      type: 'creature',
      species: type,
      speed: type === 'dragon' ? 2 : type === 'wolf' ? 1.5 : 1,
      damage: type === 'dragon' ? 50 : type === 'wolf' ? 10 : 5,
      isHostile
    })

    // Needs
    this.em.addComponent(id, {
      type: 'needs',
      hunger: Math.random() * 30,
      health: 100
    })

    // AI
    this.em.addComponent(id, {
      type: 'ai',
      state: 'idle',
      targetX: x,
      targetY: y,
      cooldown: 0
    })

    return id
  }
}
