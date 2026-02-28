import { EntityManager, PositionComponent } from '../ecs/Entity'
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

const GRID_CELL_SIZE = 10

export class ResourceSystem {
  nodes: ResourceNode[] = []
  private grid: Map<number, ResourceNode[]> = new Map()
  private world: World
  private em: EntityManager
  private civManager: CivManager
  private particles: ParticleSystem
  private initialized: boolean = false
  private _nodesNearBuf: ResourceNode[] = []

  constructor(world: World, em: EntityManager, civManager: CivManager, particles: ParticleSystem) {
    this.world = world
    this.em = em
    this.civManager = civManager
    this.particles = particles
  }

  private gridKey(x: number, y: number): number {
    return Math.floor(x / GRID_CELL_SIZE) * 10000 + Math.floor(y / GRID_CELL_SIZE)
  }

  private addToGrid(node: ResourceNode): void {
    const key = this.gridKey(node.x, node.y)
    let cell = this.grid.get(key)
    if (!cell) {
      cell = []
      this.grid.set(key, cell)
    }
    cell.push(node)
  }

  private removeFromGrid(node: ResourceNode): void {
    const key = this.gridKey(node.x, node.y)
    const cell = this.grid.get(key)
    if (!cell) return
    const idx = cell.indexOf(node)
    if (idx !== -1) cell.splice(idx, 1)
    if (cell.length === 0) this.grid.delete(key)
  }

  getNodesNear(x: number, y: number, range: number): ResourceNode[] {
    const result = this._nodesNearBuf; result.length = 0
    const minCx = Math.floor((x - range) / GRID_CELL_SIZE)
    const maxCx = Math.floor((x + range) / GRID_CELL_SIZE)
    const minCy = Math.floor((y - range) / GRID_CELL_SIZE)
    const maxCy = Math.floor((y + range) / GRID_CELL_SIZE)
    const rangeSq = range * range

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.grid.get(cx * 10000 + cy)
        if (!cell) continue
        for (const node of cell) {
          const dx = node.x - x
          const dy = node.y - y
          if (dx * dx + dy * dy <= rangeSq) {
            result.push(node)
          }
        }
      }
    }
    return result
  }

  init(): void {
    if (this.initialized) return
    this.initialized = true
    this.nodes = []
    this.grid.clear()
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
        const node: ResourceNode = { x, y, type, amount: maxAmount, maxAmount }
        this.nodes.push(node)
        this.addToGrid(node)
      }
    }
  }

  update(): void {
    if (!this.initialized) this.init()

    // Creatures near resources gather them
    const entities = this.em.getEntitiesWithComponents('position', 'creature', 'civMember')
    for (const id of entities) {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')
      const civMember = this.em.getComponent<CivMemberComponent>(id, 'civMember')
      if (!pos || !civMember) continue

      const nearby = this.getNodesNear(pos.x, pos.y, 2)
      for (const node of nearby) {
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
          this.removeFromGrid(node)
          const idx = this.nodes.indexOf(node)
          if (idx !== -1) this.nodes.splice(idx, 1)
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
        const node: ResourceNode = { x, y, type, amount: maxAmount, maxAmount }
        this.nodes.push(node)
        this.addToGrid(node)
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
