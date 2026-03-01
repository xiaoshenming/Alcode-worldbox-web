// Entity-Component-System architecture

let nextEntityId = 1

export type EntityId = number

export interface Component {
  type: string
}

export class EntityManager {
  private entities: Set<EntityId> = new Set()
  private components: Map<string, Map<EntityId, Component>> = new Map()
  private cacheVersion = 0
  private queryCache: Map<string, { version: number; result: EntityId[] }> = new Map()
  /** Reusable buffer for component maps in getEntitiesWithComponents — avoids new[] per call */
  private _mapsBuf: Map<EntityId, Component>[] = []

  private invalidateCache(): void {
    this.cacheVersion++
  }

  createEntity(): EntityId {
    const id = nextEntityId++
    this.entities.add(id)
    return id
  }

  removeEntity(id: EntityId): void {
    this.entities.delete(id)
    this.components.forEach(compMap => compMap.delete(id))
    this.invalidateCache()
  }

  addComponent<T extends Component>(id: EntityId, component: T): void {
    let typeMap = this.components.get(component.type)
    if (!typeMap) {
      typeMap = new Map()
      this.components.set(component.type, typeMap)
    }
    typeMap.set(id, component)
    this.invalidateCache()
  }

  getComponent<T extends Component>(id: EntityId, type: string): T | undefined {
    return this.components.get(type)?.get(id) as T | undefined
  }

  hasComponent(id: EntityId, type: string): boolean {
    return this.components.get(type)?.has(id) ?? false
  }

  removeComponent(id: EntityId, type: string): void {
    this.components.get(type)?.delete(id)
    this.invalidateCache()
  }

  getEntitiesWithComponent(type: string): EntityId[] {
    const cached = this.queryCache.get(type)
    if (cached && cached.version === this.cacheVersion) return cached.result
    const compMap = this.components.get(type)
    if (!compMap) return []
    const result = [...compMap.keys()]
    this.queryCache.set(type, { version: this.cacheVersion, result })
    return result
  }

  getEntitiesWithComponents(...types: string[]): EntityId[] {
    if (types.length === 0) return []
    if (types.length === 1) return this.getEntitiesWithComponent(types[0])

    // Build cacheKey without join() for 2-4 arg common cases
    let cacheKey: string
    if (types.length === 2) cacheKey = types[0] + '|' + types[1]
    else if (types.length === 3) cacheKey = types[0] + '|' + types[1] + '|' + types[2]
    else cacheKey = types.join('|')
    const cached = this.queryCache.get(cacheKey)
    if (cached && cached.version === this.cacheVersion) return cached.result

    // Collect component maps, bail early if any type has no entities
    const maps = this._mapsBuf; maps.length = 0
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
    this.queryCache.set(cacheKey, { version: this.cacheVersion, result })
    return result
  }

  getAllEntities(): EntityId[] {
    return Array.from(this.entities)
  }

  getEntityCount(): number {
    return this.entities.size
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
  state: 'idle' | 'wandering' | 'hungry' | 'fleeing' | 'attacking' | 'migrating'
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
  mood?: number
  state?: string
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

export interface NomadComponent extends Component {
  type: 'nomad'
  bandId: number        // which nomad band this creature belongs to
  role: 'leader' | 'follower'
  origin: { x: number; y: number }  // where they started
  destination: { x: number; y: number }  // where they're heading
  journeyTicks: number  // how long they've been traveling
}

export interface ArtifactComponent extends Component {
  type: 'artifact'
  artifactType: string
  name: string
  rarity: 'legendary' | 'mythic'
  effect: string
  bonusType: 'combat' | 'health' | 'speed' | 'xp' | 'aura' | 'regen'
  bonusValue: number
  claimed: boolean
  claimedBy: number | null
}

export interface InventoryComponent extends Component {
  type: 'inventory'
  artifacts: string[]
}

export interface DiseaseComponent extends Component {
  type: 'disease'
  diseaseType: string     // 'plague' | 'fever' | 'blight' | 'pox'
  severity: number        // 0-100, increases over time
  duration: number        // ticks since infection
  contagious: boolean     // can spread to others
  immune: boolean         // recovered and now immune
  immuneUntil: number     // tick when immunity expires (for reinfection prevention)
}

export interface GeneticsComponent extends Component {
  type: 'genetics'
  traits: {
    strength: number      // 0.5-2.0, affects damage
    vitality: number      // 0.5-2.0, affects max health
    agility: number       // 0.5-2.0, affects speed
    fertility: number     // 0.5-2.0, affects breed chance
    longevity: number     // 0.5-2.0, affects max age
    intelligence: number  // 0.5-2.0, affects tech contribution
  }
  mutations: string[]     // list of active mutation names
  generation: number      // 0 = original, increments each generation
  parentA: number | null
  parentB: number | null
}

export interface ShipComponent extends Component {
  type: 'ship'
  shipType: 'warship' | 'trader' | 'explorer' | 'fishing'
  civId: number
  health: number
  maxHealth: number
  speed: number
  damage: number
  cargo: { food: number; gold: number; wood: number }
  crew: number
  maxCrew: number
  targetX: number
  targetY: number
  state: 'idle' | 'sailing' | 'combat' | 'trading' | 'exploring'
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
