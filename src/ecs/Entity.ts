// Entity-Component-System architecture

let nextEntityId = 1

export type EntityId = number

export interface Component {
  type: string
}

export class EntityManager {
  private entities: Set<EntityId> = new Set()
  private components: Map<string, Map<EntityId, Component>> = new Map()

  createEntity(): EntityId {
    const id = nextEntityId++
    this.entities.add(id)
    return id
  }

  removeEntity(id: EntityId): void {
    this.entities.delete(id)
    this.components.forEach(compMap => compMap.delete(id))
  }

  addComponent<T extends Component>(id: EntityId, component: T): void {
    if (!this.components.has(component.type)) {
      this.components.set(component.type, new Map())
    }
    this.components.get(component.type)!.set(id, component)
  }

  getComponent<T extends Component>(id: EntityId, type: string): T | undefined {
    return this.components.get(type)?.get(id) as T | undefined
  }

  hasComponent(id: EntityId, type: string): boolean {
    return this.components.get(type)?.has(id) ?? false
  }

  getEntitiesWithComponent(type: string): EntityId[] {
    const compMap = this.components.get(type)
    if (!compMap) return []
    return Array.from(compMap.keys())
  }

  getEntitiesWithComponents(...types: string[]): EntityId[] {
    let result: EntityId[] = []
    for (const type of types) {
      const entities = this.getEntitiesWithComponent(type)
      if (result.length === 0) {
        result = entities
      } else {
        result = result.filter(id => entities.includes(id))
      }
    }
    return result
  }

  getAllEntities(): EntityId[] {
    return Array.from(this.entities)
  }
}

// Components
export interface PositionComponent extends Component {
  type: 'position'
  x: number
  y: number
}

export interface VelocityComponent extends Component {
  type: 'velocity'
  vx: number
  vy: number
}

export interface RenderComponent extends Component {
  type: 'render'
  color: string
  size: number
}

export interface NeedsComponent extends Component {
  type: 'needs'
  hunger: number  // 0-100, dies at 100
  health: number  // 0-100, dies at 0
}

export interface AIComponent extends Component {
  type: 'ai'
  state: 'idle' | 'wandering' | 'hungry' | 'fleeing' | 'attacking'
  targetX: number
  targetY: number
  cooldown: number
}

export interface CreatureComponent extends Component {
  type: 'creature'
  species: string
  speed: number
  damage: number
  isHostile: boolean
}
