import { World } from './World'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization, BuildingComponent, CultureTrait, ReligionType } from '../civilization/Civilization'
import { ResourceSystem, ResourceNode } from '../systems/ResourceSystem'
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

const SAVE_KEY = 'worldbox_save'
const SLOT_PREFIX = 'worldbox_slot_'
const AUTO_SAVE_KEY = 'worldbox_autosave'
const META_KEY = 'worldbox_save_meta'
const MAX_SLOTS = 3
/** Pre-computed component type list for serialization — avoids per-save literal array creation */
const _SERIALIZE_COMPONENT_TYPES = ['position', 'velocity', 'render', 'needs', 'ai', 'creature', 'building', 'civMember'] as const

export interface SaveSlotMeta {
  slot: number | 'auto'
  label: string
  timestamp: number
  tick: number
  population: number
  civCount: number
}

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
  research?: { currentTech: string | null; progress: number; completed: string[]; researchRate: number }
  treaties?: number[]
  embassies?: { civId: number; x: number; y: number }[]
  diplomaticStance?: 'peaceful' | 'neutral' | 'aggressive' | 'isolationist'
}

export class SaveSystem {
  private static getSlotKey(slot: number | 'auto'): string {
    return slot === 'auto' ? AUTO_SAVE_KEY : `${SLOT_PREFIX}${slot}`
  }

  static save(world: World, em: EntityManager, civManager: CivManager, resources: ResourceSystem, slot: number | 'auto' = 'auto'): boolean {
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
      const key = SaveSystem.getSlotKey(slot)
      localStorage.setItem(key, json)

      // Also keep legacy key working
      if (slot !== 'auto') {
        localStorage.setItem(SAVE_KEY, json)
      }

      // Update metadata
      const meta: SaveSlotMeta = {
        slot,
        label: slot === 'auto' ? 'Autosave' : `Slot ${slot}`,
        timestamp: Date.now(),
        tick: world.tick,
        population: em.getEntitiesWithComponents('position', 'creature').length,
        civCount: civManager.civilizations.size,
      }
      SaveSystem.updateMeta(slot, meta)

      return true
    } catch (e) {
      console.error('Save failed:', e)
      return false
    }
  }

  static hasSave(slot?: number | 'auto'): boolean {
    if (slot !== undefined) {
      return localStorage.getItem(SaveSystem.getSlotKey(slot)) !== null
    }
    // Check any slot
    if (localStorage.getItem(AUTO_SAVE_KEY)) return true
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (localStorage.getItem(`${SLOT_PREFIX}${i}`)) return true
    }
    return localStorage.getItem(SAVE_KEY) !== null
  }

  static load(world: World, em: EntityManager, civManager: CivManager, resources: ResourceSystem, slot?: number | 'auto'): boolean {
    try {
      let json: string | null = null
      if (slot !== undefined) {
        json = localStorage.getItem(SaveSystem.getSlotKey(slot))
      } else {
        json = localStorage.getItem(SAVE_KEY)
      }
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
          research: sc.research ?? { currentTech: null, progress: 0, completed: [], researchRate: 1.0 },
          treaties: sc.treaties ?? [],
          embassies: sc.embassies ?? [],
          diplomaticStance: sc.diplomaticStance ?? 'neutral',
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

  static deleteSave(slot?: number | 'auto'): void {
    if (slot !== undefined) {
      localStorage.removeItem(SaveSystem.getSlotKey(slot))
      SaveSystem.removeMeta(slot)
    } else {
      localStorage.removeItem(SAVE_KEY)
    }
  }

  static getAllSlotMeta(): SaveSlotMeta[] {
    try {
      const raw = localStorage.getItem(META_KEY)
      if (!raw) return []
      return JSON.parse(raw) as SaveSlotMeta[]
    } catch { return [] }
  }

  private static updateMeta(slot: number | 'auto', meta: SaveSlotMeta): void {
    const all = SaveSystem.getAllSlotMeta().filter(m => m.slot !== slot)
    all.push(meta)
    localStorage.setItem(META_KEY, JSON.stringify(all))
  }

  private static removeMeta(slot: number | 'auto'): void {
    const all = SaveSystem.getAllSlotMeta().filter(m => m.slot !== slot)
    localStorage.setItem(META_KEY, JSON.stringify(all))
  }

  static getSlotCount(): number {
    return MAX_SLOTS
  }

  private static serializeEntities(em: EntityManager): SavedEntity[] {
    const result: SavedEntity[] = []
    const componentTypes = _SERIALIZE_COMPONENT_TYPES

    for (const id of em.getAllEntities()) {
      const components: Record<string, any> = {}

      for (const type of componentTypes) {
        const comp = em.getComponent(id, type)
        if (comp) {
          const { type: _, ...rest } = comp as unknown as Record<string, unknown>
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
