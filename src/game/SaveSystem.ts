import { World } from './World'
import { EntityManager, EntityId, PositionComponent, VelocityComponent, RenderComponent, NeedsComponent, AIComponent, CreatureComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization, BuildingComponent, CivMemberComponent, BuildingType, CultureTrait, ReligionType } from '../civilization/Civilization'
import { ResourceSystem, ResourceNode } from '../systems/ResourceSystem'
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

const SAVE_KEY = 'worldbox_save'

interface SaveData {
  version: number
  tick: number
  tiles: number[][]
  tileVariants: number[][]
  entities: SavedEntity[]
  civilizations: SavedCiv[]
  territoryMap: number[][]
  resourceNodes: ResourceNode[]
}

interface SavedEntity {
  components: Record<string, any>
}

interface SavedCiv {
  id: number
  name: string
  color: string
  population: number
  territory: string[]
  buildings: number[] // entity IDs rebuilt during load
  resources: { food: number; wood: number; stone: number; gold: number }
  techLevel: number
  relations: [number, number][]
  tradeRoutes?: { partnerId: number; fromPort: { x: number; y: number }; toPort: { x: number; y: number }; active: boolean; income: number }[]
  culture?: { trait: string; strength: number }
  religion?: { type: string; faith: number; temples: number; blessing: string | null; blessingTimer: number }
  happiness?: number
  taxRate?: number
  revoltTimer?: number
}

export class SaveSystem {
  static save(world: World, em: EntityManager, civManager: CivManager, resources: ResourceSystem): boolean {
    try {
      const data: SaveData = {
        version: 1,
        tick: world.tick,
        tiles: world.tiles,
        tileVariants: world.tileVariants,
        entities: SaveSystem.serializeEntities(em),
        civilizations: SaveSystem.serializeCivs(civManager),
        territoryMap: civManager.territoryMap,
        resourceNodes: resources.nodes.map(n => ({ ...n })),
      }

      const json = JSON.stringify(data)
      localStorage.setItem(SAVE_KEY, json)
      return true
    } catch (e) {
      console.error('Save failed:', e)
      return false
    }
  }

  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null
  }

  static load(world: World, em: EntityManager, civManager: CivManager, resources: ResourceSystem): boolean {
    try {
      const json = localStorage.getItem(SAVE_KEY)
      if (!json) return false

      const data: SaveData = JSON.parse(json)
      if (data.version !== 1) return false

      // Clear current state
      for (const id of em.getAllEntities()) {
        em.removeEntity(id)
      }
      civManager.civilizations.clear()

      // Restore world
      world.tiles = data.tiles
      world.tileVariants = data.tileVariants
      world.tick = data.tick
      world.markFullDirty()

      // Restore territory map
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
          civManager.territoryMap[y][x] = data.territoryMap[y]?.[x] ?? 0
        }
      }

      // Restore civilizations (before entities, so civMember refs work)
      for (const sc of data.civilizations) {
        const civ: Civilization = {
          id: sc.id,
          name: sc.name,
          color: sc.color,
          population: sc.population,
          territory: new Set(sc.territory),
          buildings: [], // rebuilt when loading building entities
          resources: { ...sc.resources },
          techLevel: sc.techLevel,
          relations: new Map(sc.relations),
          tradeRoutes: sc.tradeRoutes ?? [],
          culture: sc.culture ? { trait: sc.culture.trait as CultureTrait, strength: sc.culture.strength } : { trait: 'warrior' as CultureTrait, strength: 0 },
          religion: sc.religion ? { type: sc.religion.type as ReligionType, faith: sc.religion.faith, temples: sc.religion.temples ?? 0, blessing: sc.religion.blessing ?? null, blessingTimer: sc.religion.blessingTimer ?? 0 } : { type: 'sun' as ReligionType, faith: 5, temples: 0, blessing: null, blessingTimer: 0 },
          happiness: sc.happiness ?? 70,
          taxRate: sc.taxRate ?? 1,
          revoltTimer: sc.revoltTimer ?? 0,
        }
        civManager.civilizations.set(civ.id, civ)
      }

      // Restore entities
      for (const se of data.entities) {
        const id = em.createEntity()

        for (const [type, comp] of Object.entries(se.components)) {
          em.addComponent(id, { ...comp, type })
        }

        // Rebuild civ building references
        const building = em.getComponent<BuildingComponent>(id, 'building')
        if (building) {
          const civ = civManager.civilizations.get(building.civId)
          if (civ) civ.buildings.push(id)
        }
      }

      // Restore resources
      resources.nodes = data.resourceNodes

      return true
    } catch (e) {
      console.error('Load failed:', e)
      return false
    }
  }

  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY)
  }

  private static serializeEntities(em: EntityManager): SavedEntity[] {
    const result: SavedEntity[] = []
    const componentTypes = ['position', 'velocity', 'render', 'needs', 'ai', 'creature', 'building', 'civMember']

    for (const id of em.getAllEntities()) {
      const components: Record<string, any> = {}

      for (const type of componentTypes) {
        const comp = em.getComponent(id, type)
        if (comp) {
          const { type: _, ...rest } = comp as any
          components[type] = rest
        }
      }

      if (Object.keys(components).length > 0) {
        result.push({ components })
      }
    }
    return result
  }

  private static serializeCivs(civManager: CivManager): SavedCiv[] {
    const result: SavedCiv[] = []

    for (const [, civ] of civManager.civilizations) {
      result.push({
        id: civ.id,
        name: civ.name,
        color: civ.color,
        population: civ.population,
        territory: Array.from(civ.territory),
        buildings: [],
        resources: { ...civ.resources },
        techLevel: civ.techLevel,
        relations: Array.from(civ.relations.entries()),
        tradeRoutes: civ.tradeRoutes,
        culture: civ.culture,
        religion: civ.religion,
        happiness: civ.happiness,
        taxRate: civ.taxRate,
        revoltTimer: civ.revoltTimer,
      })
    }
    return result
  }
}
