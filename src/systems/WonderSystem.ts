// World Wonder System - unique civilization mega-structures with global effects
import { CivManager } from '../civilization/CivManager'
import { EntityManager, PositionComponent } from '../ecs/Entity'
import { BuildingComponent, BuildingType } from '../civilization/Civilization'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'

export interface WonderDef {
  id: string
  name: string
  techRequired: number
  resourceCost: { food?: number; wood?: number; stone?: number; gold?: number }
  preferredCulture: string
  effects: string[]
  color: string
}

export interface ActiveWonder {
  defId: string
  civId: number
  entityId: number
  x: number
  y: number
  completedAt: number
}

interface WonderConstruction { defId: string; civId: number; startedAt: number }

const WONDER_DEFS: WonderDef[] = [
  { id: 'great_library', name: 'Great Library', techRequired: 3,
    resourceCost: { gold: 200 }, preferredCulture: 'scholar',
    effects: ['Research speed +50%'], color: '#6080c0' },
  { id: 'colosseum', name: 'Colosseum', techRequired: 3,
    resourceCost: { stone: 150 }, preferredCulture: 'warrior',
    effects: ['Army combat +30%', 'Happiness +10'], color: '#c0a060' },
  { id: 'grand_bazaar', name: 'Grand Bazaar', techRequired: 4,
    resourceCost: { gold: 300 }, preferredCulture: 'merchant',
    effects: ['Trade income +100%', 'All resources +20%'], color: '#e6a040' },
  { id: 'world_tree', name: 'World Tree', techRequired: 4,
    resourceCost: { wood: 200 }, preferredCulture: 'nature',
    effects: ['Food production +50%', 'Population cap +30%'], color: '#2ecc71' },
  { id: 'sky_fortress', name: 'Sky Fortress', techRequired: 5,
    resourceCost: { stone: 300, gold: 200 }, preferredCulture: 'builder',
    effects: ['Building HP +100%', 'Territory defense +50%'], color: '#8a8aaa' },
]

const BUILD_DURATION = 1000
const CHECK_INTERVAL = 300
const PARTICLE_INTERVAL = 60
// Pre-built O(1) lookup: wonder def id → WonderDef
const WONDER_DEF_MAP: Map<string, WonderDef> = new Map(WONDER_DEFS.map(d => [d.id, d]))

export class WonderSystem {
  private activeWonders: ActiveWonder[] = []
  private constructions: WonderConstruction[] = []
  private _activeWonderIds = new Set<string>()    // defId
  private _constructionIds = new Set<string>()    // defId
  private _activeWonderCivSet = new Set<string>() // key: `${civId}_${defId}`
  private _availBuf: WonderDef[] = []
  private lastCheckTick = 0

  update(civManager: CivManager, em: EntityManager, world: World, particles: ParticleSystem, tick: number): void {
    if (tick % PARTICLE_INTERVAL === 0) this.emitWonderParticles(particles)
    this.progressConstructions(civManager, em, particles, tick)
    if (tick - this.lastCheckTick >= CHECK_INTERVAL) {
      this.lastCheckTick = tick
      this.tryStartConstruction(civManager, tick)
    }
  }

  getActiveWonders(): ActiveWonder[] { return this.activeWonders }

  getAvailableWonders(): WonderDef[] {
    // Sync Sets from arrays (tests may push directly to internal arrays)
    this._activeWonderIds.clear()
    for (const w of this.activeWonders) this._activeWonderIds.add(w.defId)
    this._constructionIds.clear()
    for (const c of this.constructions) this._constructionIds.add(c.defId)

    const buf = this._availBuf; buf.length = 0
    for (const d of WONDER_DEFS) {
      if (!this._activeWonderIds.has(d.id) &&
          !this._constructionIds.has(d.id)) {
        buf.push(d)
      }
    }
    return buf
  }

  hasWonder(civId: number, wonderId: string): boolean {
    if (this._activeWonderCivSet.has(`${civId}_${wonderId}`)) return true
    // Lazy sync: tests may push directly to activeWonders
    const found = this.activeWonders.some(w => w.civId === civId && w.defId === wonderId)
    if (found) this._activeWonderCivSet.add(`${civId}_${wonderId}`)
    return found
  }

  // --- Wonder effect bonuses ---

  private tryStartConstruction(civManager: CivManager, tick: number): void {
    const available = this.getAvailableWonders()
    if (available.length === 0) return

    for (const def of available) {
      if (this._constructionIds.has(def.id)) continue
      for (const [civId, civ] of civManager.civilizations) {
        if (civ.techLevel < def.techRequired) continue
        if (!this.canAfford(civ.resources, def.resourceCost)) continue
        const chance = civ.culture.trait === def.preferredCulture ? 0.15 : 0.03
        if (Math.random() < chance) {
          this.constructions.push({ defId: def.id, civId, startedAt: tick })
          this._constructionIds.add(def.id)
          EventLog.log('building', `${civ.name} began constructing ${def.name}!`, tick)
          break
        }
      }
    }
  }

  private progressConstructions(civManager: CivManager, em: EntityManager, particles: ParticleSystem, tick: number): void {
    for (let i = this.constructions.length - 1; i >= 0; i--) {
      const con = this.constructions[i]
      const civ = civManager.civilizations.get(con.civId)
      if (!civ) { this._constructionIds.delete(con.defId); this.constructions.splice(i, 1); continue }
      if (tick - con.startedAt < BUILD_DURATION) continue

      const def = WONDER_DEF_MAP.get(con.defId)
      if (!def) continue
      this.deductResources(civ.resources, def.resourceCost)
      const center = this.findTerritoryCenter(civ.territory)

      // Create wonder entity
      const entityId = em.createEntity()
      em.addComponent(entityId, { type: 'position', x: center.x, y: center.y } as PositionComponent)
      em.addComponent(entityId, {
        type: 'building', buildingType: BuildingType.CASTLE,
        civId: con.civId, health: 500, maxHealth: 500, level: 5
      } as BuildingComponent)
      em.addComponent(entityId, { type: 'render', color: def.color, size: 5 })
      civ.buildings.push(entityId)

      this.activeWonders.push({
        defId: def.id, civId: con.civId, entityId,
        x: center.x, y: center.y, completedAt: tick
      })
      this._activeWonderIds.add(def.id)
      this._activeWonderCivSet.add(`${con.civId}_${def.id}`)
      this._constructionIds.delete(def.id)
      this.constructions.splice(i, 1)

      particles.spawnFirework(center.x, center.y, def.color)
      particles.spawnFirework(center.x, center.y, '#ffffff')
      EventLog.log('building', `${civ.name} completed the ${def.name}! (${def.effects.join(', ')})`, tick)
    }
  }

  private emitWonderParticles(particles: ParticleSystem): void {
    for (const w of this.activeWonders) {
      const def = WONDER_DEF_MAP.get(w.defId)
      if (def) particles.spawnAura(w.x, w.y, def.color, 3)
    }
  }

  private canAfford(
    res: { food: number; wood: number; stone: number; gold: number },
    cost: { food?: number; wood?: number; stone?: number; gold?: number }
  ): boolean {
    return !(cost.food && res.food < cost.food) && !(cost.wood && res.wood < cost.wood)
      && !(cost.stone && res.stone < cost.stone) && !(cost.gold && res.gold < cost.gold)
  }

  private deductResources(
    res: { food: number; wood: number; stone: number; gold: number },
    cost: { food?: number; wood?: number; stone?: number; gold?: number }
  ): void {
    if (cost.food) res.food -= cost.food
    if (cost.wood) res.wood -= cost.wood
    if (cost.stone) res.stone -= cost.stone
    if (cost.gold) res.gold -= cost.gold
  }

  private findTerritoryCenter(territory: Set<string>): { x: number; y: number } {
    let sumX = 0, sumY = 0, count = 0
    for (const key of territory) {
      const comma = key.indexOf(',')
      sumX += +key.substring(0, comma); sumY += +key.substring(comma + 1); count++
    }
    return count === 0 ? { x: 100, y: 100 } : { x: Math.round(sumX / count), y: Math.round(sumY / count) }
  }
}
