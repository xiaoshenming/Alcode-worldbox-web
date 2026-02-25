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
    return [...compMap.keys()]
  }

  getEntitiesWithComponents(...types: string[]): EntityId[] {
    if (types.length === 0) return []
    if (types.length === 1) return this.getEntitiesWithComponent(types[0])

    // Collect component maps, bail early if any type has no entities
    const maps: Map<EntityId, Component>[] = []
    for (const type of types) {
      const compMap = this.components.get(type)
      if (!compMap || compMap.size === 0) return []
      maps.push(compMap)
    }

    // Find the smallest map to iterate over
    let smallestIdx = 0
    for (let i = 1; i < maps.length; i++) {
      if (maps[i].size < maps[smallestIdx].size) {
        smallestIdx = i
      }
    }

    // Iterate smallest map, check membership in all others via has() — O(1) per check
    const smallest = maps[smallestIdx]
    const result: EntityId[] = []
    for (const id of smallest.keys()) {
      let hasAll = true
      for (let i = 0; i < maps.length; i++) {
        if (i !== smallestIdx && !maps[i].has(id)) {
          hasAll = false
          break
        }
      }
      if (hasAll) result.push(id)
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
  targetEntity: number | null
  cooldown: number
}

export interface CreatureComponent extends Component {
  type: 'creature'
  species: string
  speed: number
  damage: number
  isHostile: boolean
  name: string
  age: number
  maxAge: number
  gender: 'male' | 'female'
}

export interface HeroComponent extends Component {
  type: 'hero'
  level: number
  xp: number
  xpToNext: number
  kills: number
  title: string
  ability: 'warrior' | 'ranger' | 'healer' | 'berserker'
  abilityCooldown: number
}

export function getHeroTitle(ability: HeroComponent['ability'], level: number): string {
  if (level >= 5) {
    switch (ability) {
      case 'warrior': return 'Legend'
      case 'ranger': return 'Deadeye'
      case 'healer': return 'Archon'
      case 'berserker': return 'Destroyer'
    }
  } else if (level >= 3) {
    switch (ability) {
      case 'warrior': return 'Champion'
      case 'ranger': return 'Sharpshooter'
      case 'healer': return 'Sage'
      case 'berserker': return 'Warlord'
    }
  } else {
    switch (ability) {
      case 'warrior': return 'Warrior'
      case 'ranger': return 'Ranger'
      case 'healer': return 'Healer'
      case 'berserker': return 'Berserker'
    }
  }
}
