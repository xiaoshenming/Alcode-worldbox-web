// Crop farming system - crops planted near FARM buildings, grow by season, harvested for food

import { World, Season } from '../game/World'
import { CivManager } from '../civilization/CivManager'
import { BuildingType, BuildingComponent } from '../civilization/Civilization'
import { EntityManager, PositionComponent } from '../ecs/Entity'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'

export type CropType = 'wheat' | 'corn' | 'rice' | 'potato'
export type CropStage = 'planted' | 'growing' | 'mature' | 'harvested' | 'dead'

// Pre-allocated offsets array for tryPlantCrops (avoids new array per farm per tick)
const FARM_OFFSETS: readonly [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1], [-2, 0], [2, 0], [0, -2], [0, 2]]

export interface CropField {
  x: number
  y: number
  civId: number
  cropType: CropType
  growth: number       // 0-100
  stage: CropStage
  plantedSeason: Season
  yield: number        // food when harvested
}

const CROP_INFO: Record<CropType, { growthRate: number; baseYield: number }> = {
  wheat:  { growthRate: 1.0, baseYield: 8 },
  corn:   { growthRate: 0.8, baseYield: 12 },
  rice:   { growthRate: 1.2, baseYield: 6 },
  potato: { growthRate: 0.6, baseYield: 15 },
}

const CROP_TYPES: CropType[] = ['wheat', 'corn', 'rice', 'potato']

// Season growth multipliers
const SEASON_GROWTH: Record<Season, number> = {
  spring: 1.2,
  summer: 1.0,
  autumn: 0.3,
  winter: 0,
}

export class CropSystem {
  private fields: CropField[] = []
  private plantCooldown: number = 0

  update(world: World, civManager: CivManager, em: EntityManager, particles: ParticleSystem): void {
    const season = world.season

    // Try planting new crops near farms periodically
    this.plantCooldown--
    if (this.plantCooldown <= 0) {
      this.plantCooldown = 120 // check every ~2 seconds
      this.tryPlantCrops(civManager, em, season)
    }

    // Update existing crop fields
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const field = this.fields[i]

      // Skip harvested/dead
      if (field.stage === 'harvested' || field.stage === 'dead') {
        // Remove after a delay (re-plantable next spring)
        this.fields.splice(i, 1)
        continue
      }

      // Winter kills non-potato crops that aren't mature
      if (season === 'winter' && field.cropType !== 'potato' && field.stage !== 'mature') {
        field.stage = 'dead'
        continue
      }

      // Growth
      const seasonMult = SEASON_GROWTH[season]
      const info = CROP_INFO[field.cropType]
      const growthDelta = info.growthRate * seasonMult * 0.15

      if (field.stage === 'planted' || field.stage === 'growing') {
        field.growth = Math.min(100, field.growth + growthDelta)

        if (field.growth >= 20 && field.stage === 'planted') {
          field.stage = 'growing'
        }

        if (field.growth >= 100) {
          field.stage = 'mature'
        }
      }

      // Auto-harvest mature crops in autumn or when fully grown
      if (field.stage === 'mature') {
        const civ = civManager.civilizations.get(field.civId)
        if (civ) {
          civ.resources.food += field.yield
          field.stage = 'harvested'

          // Harvest particles
          particles.spawn(field.x, field.y, 4, '#daa520', 0.8)

          // Log first harvest per civ occasionally
          if (Math.random() < 0.05) {
            EventLog.log('building', `${civ.name} harvested ${field.cropType} (+${field.yield} food)`, world.tick)
          }
        }
      }
    }
  }

  private tryPlantCrops(civManager: CivManager, em: EntityManager, season: Season): void {
    // Only plant in spring and summer
    if (season !== 'spring' && season !== 'summer') return

    for (const [, civ] of civManager.civilizations) {
      // Find FARM buildings for this civ
      for (const buildingId of civ.buildings) {
        const b = em.getComponent<BuildingComponent>(buildingId, 'building')
        const pos = em.getComponent<PositionComponent>(buildingId, 'position')
        if (!b || !pos || b.buildingType !== BuildingType.FARM) continue

        const farmX = Math.floor(pos.x)
        const farmY = Math.floor(pos.y)

        // Check if we already have enough crops near this farm
        let nearbyCount = 0
        for (const f of this.fields) {
          if (f.civId === civ.id && Math.abs(f.x - farmX) <= 3 && Math.abs(f.y - farmY) <= 3 &&
              f.stage !== 'harvested' && f.stage !== 'dead') nearbyCount++
        }

        // Max 4 crop fields per farm (scaled by level)
        const maxCrops = 3 + b.level
        if (nearbyCount >= maxCrops) continue

        // Find an empty spot near the farm
        for (const [dx, dy] of FARM_OFFSETS) {
          const cx = farmX + dx
          const cy = farmY + dy

          // Check not already occupied by a crop
          const occupied = this.fields.some(f => f.x === cx && f.y === cy && f.stage !== 'harvested' && f.stage !== 'dead')
          if (occupied) continue

          const cropType = CROP_TYPES[Math.floor(Math.random() * CROP_TYPES.length)]
          const info = CROP_INFO[cropType]

          this.fields.push({
            x: cx,
            y: cy,
            civId: civ.id,
            cropType,
            growth: 0,
            stage: 'planted',
            plantedSeason: season,
            yield: info.baseYield + Math.floor(Math.random() * 4),
          })
          break // one new crop per farm per cycle
        }
      }
    }
  }

  getCropFields(): CropField[] {
    return this.fields
  }
}
