// World Crystal Cave System (v3.67) - Crystal caves form underground in mountains
// Crystals provide rare resources, attract creatures, and emit magical energy

import { EntityManager, PositionComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type CrystalType = 'quartz' | 'amethyst' | 'emerald' | 'ruby' | 'sapphire' | 'diamond'

export interface CrystalCave {
  id: number
  x: number
  y: number
  crystalType: CrystalType
  richness: number       // 0-100
  magicEmission: number
  explored: boolean
  resourcesHarvested: number
  startTick: number
}

const CHECK_INTERVAL = 1400
const FORM_CHANCE = 0.003
const MAX_CAVES = 10
const GROWTH_RATE = 0.02

const CRYSTALS: CrystalType[] = ['quartz', 'amethyst', 'emerald', 'ruby', 'sapphire', 'diamond']

const VALUE_MAP: Record<CrystalType, number> = {
  quartz: 10,
  amethyst: 25,
  emerald: 45,
  ruby: 55,
  sapphire: 65,
  diamond: 90,
}

export class WorldCrystalCaveSystem {
  private caves: CrystalCave[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Form caves in mountain regions
    if (this.caves.length < MAX_CAVES && Math.random() < FORM_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SNOW) {
        const crystal = CRYSTALS[Math.floor(Math.random() * CRYSTALS.length)]
        this.caves.push({
          id: this.nextId++,
          x, y,
          crystalType: crystal,
          richness: 30 + Math.random() * 40,
          magicEmission: VALUE_MAP[crystal] * 0.3,
          explored: false,
          resourcesHarvested: 0,
          startTick: tick,
        })
      }
    }

    // Update caves
    for (let i = this.caves.length - 1; i >= 0; i--) {
      const c = this.caves[i]

      // Crystals grow slowly
      c.richness = Math.min(100, c.richness + GROWTH_RATE)
      c.magicEmission = VALUE_MAP[c.crystalType] * (c.richness / 100) * 0.5

      // Check if creatures explore
      const creatures = em.getEntitiesWithComponents('creature', 'position')
      for (const eid of creatures) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        const dx = pos.x - c.x
        const dy = pos.y - c.y
        if (dx * dx + dy * dy < 4) {
          c.explored = true
          c.resourcesHarvested += 0.1
          c.richness = Math.max(0, c.richness - 0.05)
        }
      }

      // Depleted caves collapse
      if (c.richness <= 0) {
        this.caves.splice(i, 1)
      }
    }
  }

  getCaves(): readonly CrystalCave[] { return this.caves }
}
