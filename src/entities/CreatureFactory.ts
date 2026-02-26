import { EntityManager, EntityId } from '../ecs/Entity'
import { EntityType } from '../utils/Constants'
import { generateName } from '../utils/NameGenerator'
import { GeneticsSystem } from '../systems/GeneticsSystem'

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

const MAX_AGE: Record<string, [number, number]> = {
  human: [600, 900],
  elf: [1200, 2000],
  dwarf: [800, 1200],
  orc: [400, 700],
  sheep: [300, 500],
  wolf: [400, 600],
  dragon: [2000, 4000],
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
    const ageRange = MAX_AGE[type] || [500, 800]
    const maxAge = ageRange[0] + Math.random() * (ageRange[1] - ageRange[0])
    this.em.addComponent(id, {
      type: 'creature',
      species: type,
      speed: type === 'dragon' ? 2 : type === 'wolf' ? 1.5 : 1,
      damage: type === 'dragon' ? 50 : type === 'wolf' ? 10 : 5,
      isHostile,
      name: generateName(type),
      age: 0,
      maxAge,
      gender: Math.random() < 0.5 ? 'male' : 'female'
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
      targetEntity: null,
      cooldown: 0
    })

    // Genetics — random traits for spawned creatures
    const genetics = GeneticsSystem.generateRandomTraits()
    this.em.addComponent(id, genetics)
    GeneticsSystem.applyTraits(id, this.em)

    return id
  }
}
