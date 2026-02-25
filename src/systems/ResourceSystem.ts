import { EntityManager, EntityId, PositionComponent, CreatureComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { CivMemberComponent } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'
import { ParticleSystem } from './ParticleSystem'

export type ResourceType = 'tree' | 'stone' | 'berry' | 'gold_ore'

export interface ResourceNode {
  x: number
  y: number
  type: ResourceType
  amount: number
  maxAmount: number
}

const RESOURCE_COLORS: Record<ResourceType, string> = {
  tree: '#1a5a1a',
  stone: '#888899',
  berry: '#cc4488',
  gold_ore: '#ffcc00'
}

const RESOURCE_SYMBOLS: Record<ResourceType, string> = {
  tree: '♣',
  stone: '◆',
  berry: '●',
  gold_ore: '★'
}

export class ResourceSystem {
  nodes: ResourceNode[] = []
  private world: World
  private em: EntityManager
  private civManager: CivManager
  private particles: ParticleSystem
  private initialized: boolean = false

  constructor(world: World, em: EntityManager, civManager: CivManager, particles: ParticleSystem) {
    this.world = world
    this.em = em
    this.civManager = civManager
    this.particles = particles
  }

  init(): void {
    if (this.initialized) return
    this.initialized = true
    this.nodes = []
    this.spawnResources()
  }

  private spawnResources(): void {
    for (let i = 0; i < 120; i++) {
      const x = Math.floor(Math.random() * WORLD_WIDTH)
      const y = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = this.world.getTile(x, y)
      if (tile === null) continue

      let type: ResourceType | null = null
      if (tile === TileType.FOREST) {
        type = Math.random() < 0.7 ? 'tree' : 'berry'
      } else if (tile === TileType.MOUNTAIN) {
        type = Math.random() < 0.6 ? 'stone' : 'gold_ore'
      } else if (tile === TileType.GRASS) {
        type = Math.random() < 0.5 ? 'berry' : 'tree'
      }

      if (type) {
        const maxAmount = type === 'gold_ore' ? 30 : type === 'stone' ? 50 : 40
        this.nodes.push({ x, y, type, amount: maxAmount, maxAmount })
      }
    }
  }

  update(): void {
    if (!this.initialized) this.init()

    // Creatures near resources gather them
    const entities = this.em.getEntitiesWithComponents('position', 'creature', 'civMember')
    for (const id of entities) {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')!
      const civMember = this.em.getComponent<CivMemberComponent>(id, 'civMember')!

      for (let i = this.nodes.length - 1; i >= 0; i--) {
        const node = this.nodes[i]
        const dx = pos.x - node.x
        const dy = pos.y - node.y
        if (dx * dx + dy * dy > 4) continue

        // Gather
        const gatherAmount = 0.5
        node.amount -= gatherAmount

        const civ = this.civManager.civilizations.get(civMember.civId)
        if (civ) {
          switch (node.type) {
            case 'tree': civ.resources.wood += gatherAmount; break
            case 'stone': civ.resources.stone += gatherAmount; break
            case 'berry': civ.resources.food += gatherAmount; break
            case 'gold_ore': civ.resources.gold += gatherAmount; break
          }
        }

        // Gather particle
        if (Math.random() < 0.1) {
          this.particles.spawn(node.x, node.y, 2, RESOURCE_COLORS[node.type], 0.6)
        }

        // Depleted
        if (node.amount <= 0) {
          this.nodes.splice(i, 1)
        }

        break // One resource per tick per creature
      }
    }

    // Slowly respawn resources
    if (Math.random() < 0.01 && this.nodes.length < 150) {
      const x = Math.floor(Math.random() * WORLD_WIDTH)
      const y = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = this.world.getTile(x, y)
      if (tile === TileType.FOREST || tile === TileType.MOUNTAIN || tile === TileType.GRASS) {
        let type: ResourceType = tile === TileType.MOUNTAIN
          ? (Math.random() < 0.6 ? 'stone' : 'gold_ore')
          : (Math.random() < 0.5 ? 'tree' : 'berry')
        const maxAmount = type === 'gold_ore' ? 30 : type === 'stone' ? 50 : 40
        this.nodes.push({ x, y, type, amount: maxAmount, maxAmount })
      }
    }
  }

  getColor(type: ResourceType): string {
    return RESOURCE_COLORS[type]
  }

  getSymbol(type: ResourceType): string {
    return RESOURCE_SYMBOLS[type]
  }
}
