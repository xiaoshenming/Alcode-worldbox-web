// Creature Migration Memory System (v2.79) - Creatures remember good habitats
// Migration knowledge passes between generations, forming ancestral routes

import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'

export interface HabitatMemory {
  id: number
  creatureId: number
  x: number
  y: number
  quality: number       // 0-100, how good the habitat was
  season: number        // which season it was discovered
  visits: number
  lastVisitTick: number
  inherited: boolean    // passed from parent
}

export interface MigrationRoute {
  id: number
  raceType: string
  waypoints: Array<{ x: number; y: number; quality: number }>
  followers: number
  age: number
}

const CHECK_INTERVAL = 850
const MAX_MEMORIES = 60
const MAX_ROUTES = 15
const MEMORIZE_CHANCE = 0.02
const INHERIT_CHANCE = 0.3
const QUALITY_DECAY = 0.2
const PROXIMITY_RANGE = 6
const MIN_QUALITY = 10

export class CreatureMigrationMemorySystem {
  private memories: HabitatMemory[] = []
  private routes: MigrationRoute[] = []
  private nextMemId = 1
  private nextRouteId = 1
  private lastCheck = 0
  private _raceMemoriesMap: Map<string, HabitatMemory[]> = new Map()
  // O(1) per-creature memory lookup: creatureId → memories
  private _creatureMemMap: Map<number, HabitatMemory[]> = new Map()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const entities = em.getEntitiesWithComponents('position', 'creature')
    this.formMemories(em, tick, entities)
    this.inheritMemories(em, tick, entities)
    this.updateRoutes(em)
    this.decayMemories()
    this.pruneDeadCreatures(em)
  }

  private formMemories(em: EntityManager, tick: number, entities: number[]): void {
    if (this.memories.length >= MAX_MEMORIES) return

    for (const id of entities) {
      if (Math.random() > MEMORIZE_CHANCE) continue

      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue

      // Check if already memorized this area (use per-creature map for O(n_per_creature) instead of O(n_all))
      const creatMems = this._creatureMemMap.get(id)
      const alreadyKnown = creatMems !== undefined && creatMems.some(m =>
        Math.abs(m.x - pos.x) < 5 &&
        Math.abs(m.y - pos.y) < 5
      )
      if (alreadyKnown) continue

      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!creature) continue

      // Quality based on random assessment of location
      const quality = 40 + Math.random() * 60

      const newMem: HabitatMemory = {
        id: this.nextMemId++,
        creatureId: id,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        quality,
        season: tick % 4,
        visits: 1,
        lastVisitTick: tick,
        inherited: false,
      }
      this.memories.push(newMem)
      // Sync per-creature map
      let cm = this._creatureMemMap.get(id)
      if (!cm) { cm = []; this._creatureMemMap.set(id, cm) }
      cm.push(newMem)
    }
  }

  private inheritMemories(em: EntityManager, tick: number, entities: number[]): void {
    if (this.memories.length >= MAX_MEMORIES) return

    for (const id of entities) {
      if (Math.random() > INHERIT_CHANCE * 0.01) continue

      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue

      // Find nearby elder with memories
      for (const oid of entities) {
        if (oid === id) continue
        const opos = em.getComponent<PositionComponent>(oid, 'position')
        if (!opos) continue

        const dx = pos.x - opos.x
        const dy = pos.y - opos.y
        if (dx * dx + dy * dy > PROXIMITY_RANGE * PROXIMITY_RANGE) continue

        // Find memories of elder with quality > 40, pick one randomly (use per-creature map)
        const oidMems = this._creatureMemMap.get(oid)
        let eligibleCount = 0
        if (oidMems) { for (const m of oidMems) { if (m.quality > 40) eligibleCount++ } }
        if (eligibleCount === 0) continue

        // Sample one eligible memory
        let targetIdx = Math.floor(Math.random() * eligibleCount)
        let mem = this.memories[0]
        if (oidMems) {
          for (const m of oidMems) {
            if (m.quality > 40) {
              if (targetIdx-- === 0) { mem = m; break }
            }
          }
        }
        const idMems = this._creatureMemMap.get(id)
        const alreadyHas = idMems !== undefined && idMems.some(m =>
          Math.abs(m.x - mem.x) < 5 &&
          Math.abs(m.y - mem.y) < 5
        )
        if (alreadyHas) continue

        const inheritedMem: HabitatMemory = {
          id: this.nextMemId++,
          creatureId: id,
          x: mem.x,
          y: mem.y,
          quality: mem.quality * 0.7,
          season: mem.season,
          visits: 0,
          lastVisitTick: tick,
          inherited: true,
        }
        this.memories.push(inheritedMem)
        let cm2 = this._creatureMemMap.get(id)
        if (!cm2) { cm2 = []; this._creatureMemMap.set(id, cm2) }
        cm2.push(inheritedMem)
        break
      }
    }
  }

  private updateRoutes(em: EntityManager): void {
    if (this.routes.length >= MAX_ROUTES) return

    // Group memories by race to form routes
    const raceMemories = this._raceMemoriesMap
    raceMemories.clear()
    for (const mem of this.memories) {
      const creature = em.getComponent<CreatureComponent>(mem.creatureId, 'creature')
      if (!creature) continue
      const race = creature.type ?? 'unknown'
      let mems = raceMemories.get(race)
      if (!mems) {
        mems = []
        raceMemories.set(race, mems)
      }
      mems.push(mem)
    }

    for (const [race, mems] of raceMemories) {
      if (mems.length < 3) continue

      const existingRoute = this.routes.find(r => r.raceType === race)
      if (existingRoute) {
        existingRoute.followers = mems.length
        existingRoute.age++
        continue
      }

      // Form new route from top quality memories
      const sorted = mems.sort((a, b) => b.quality - a.quality).slice(0, 5)
      this.routes.push({
        id: this.nextRouteId++,
        raceType: race,
        waypoints: sorted.map(m => ({ x: m.x, y: m.y, quality: m.quality })),
        followers: mems.length,
        age: 0,
      })
    }
  }

  private decayMemories(): void {
    for (let i = this.memories.length - 1; i >= 0; i--) {
      const m = this.memories[i]
      m.quality -= QUALITY_DECAY
      if (m.quality < MIN_QUALITY) {
        // Sync per-creature map
        const cm = this._creatureMemMap.get(m.creatureId)
        if (cm) {
          const idx = cm.indexOf(m)
          if (idx >= 0) cm.splice(idx, 1)
          if (cm.length === 0) this._creatureMemMap.delete(m.creatureId)
        }
        this.memories.splice(i, 1)
      }
    }
  }

  private pruneDeadCreatures(em: EntityManager): void {
    for (let i = this.memories.length - 1; i >= 0; i--) {
      const m = this.memories[i]
      if (!em.hasComponent(m.creatureId, 'creature')) {
        // Sync per-creature map
        const cm = this._creatureMemMap.get(m.creatureId)
        if (cm) {
          const idx = cm.indexOf(m)
          if (idx >= 0) cm.splice(idx, 1)
          if (cm.length === 0) this._creatureMemMap.delete(m.creatureId)
        }
        this.memories.splice(i, 1)
      }
    }
  }

  private _creatureMemsBuf: HabitatMemory[] = []
  getCreatureMemories(creatureId: number): HabitatMemory[] {
    const cached = this._creatureMemMap.get(creatureId)
    if (cached !== undefined) return cached
    // Lazy sync fallback: tests may push directly to memories array
    this._creatureMemsBuf.length = 0
    for (const m of this.memories) { if (m.creatureId === creatureId) this._creatureMemsBuf.push(m) }
    return this._creatureMemsBuf
  }
}
