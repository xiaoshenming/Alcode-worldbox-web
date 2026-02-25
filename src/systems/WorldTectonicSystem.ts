// World Tectonic System (v2.72) - Tectonic plates shift, causing earthquakes and mountain formation
// Plates drift slowly, collisions create mountains, separations create rifts/valleys

import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type PlateType = 'continental' | 'oceanic'
export type BoundaryType = 'convergent' | 'divergent' | 'transform'

export interface TectonicPlate {
  id: number
  centerX: number
  centerY: number
  radius: number
  type: PlateType
  driftX: number    // drift direction per cycle
  driftY: number
  stress: number    // 0-100, high stress = earthquake risk
}

export interface FaultLine {
  x1: number
  y1: number
  x2: number
  y2: number
  boundary: BoundaryType
  activity: number  // 0-100
}

const CHECK_INTERVAL = 1200
const MAX_PLATES = 8
const STRESS_BUILD_RATE = 3
const QUAKE_THRESHOLD = 75
const QUAKE_CHANCE = 0.1
const MOUNTAIN_FORM_CHANCE = 0.04

export class WorldTectonicSystem {
  private plates: TectonicPlate[] = []
  private faults: FaultLine[] = []
  private nextId = 1
  private lastCheck = 0
  private initialized = false

  update(dt: number, world: World, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!this.initialized) {
      this.initPlates(world)
      this.initialized = true
    }

    this.buildStress()
    this.processQuakes(world)
    this.updateFaults()
  }

  private initPlates(world: World): void {
    const w = world.width
    const h = world.height
    const count = 4 + Math.floor(Math.random() * (MAX_PLATES - 4))

    for (let i = 0; i < count; i++) {
      this.plates.push({
        id: this.nextId++,
        centerX: Math.floor(Math.random() * w),
        centerY: Math.floor(Math.random() * h),
        radius: 20 + Math.floor(Math.random() * 40),
        type: Math.random() < 0.6 ? 'continental' : 'oceanic',
        driftX: (Math.random() - 0.5) * 0.4,
        driftY: (Math.random() - 0.5) * 0.4,
        stress: Math.floor(Math.random() * 30),
      })
    }

    // Create fault lines between nearby plates
    for (let i = 0; i < this.plates.length; i++) {
      for (let j = i + 1; j < this.plates.length; j++) {
        const a = this.plates[i]
        const b = this.plates[j]
        const dx = a.centerX - b.centerX
        const dy = a.centerY - b.centerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < a.radius + b.radius) {
          const boundaries: BoundaryType[] = ['convergent', 'divergent', 'transform']
          this.faults.push({
            x1: a.centerX, y1: a.centerY,
            x2: b.centerX, y2: b.centerY,
            boundary: boundaries[Math.floor(Math.random() * boundaries.length)],
            activity: 20 + Math.floor(Math.random() * 40),
          })
        }
      }
    }
  }

  private buildStress(): void {
    for (const plate of this.plates) {
      plate.stress = Math.min(100, plate.stress + STRESS_BUILD_RATE)
      // Drift plates slowly
      plate.centerX += plate.driftX
      plate.centerY += plate.driftY
    }
  }

  private processQuakes(world: World): void {
    for (const plate of this.plates) {
      if (plate.stress < QUAKE_THRESHOLD) continue
      if (Math.random() > QUAKE_CHANCE) continue

      // Earthquake releases stress
      const magnitude = plate.stress / 20
      plate.stress = Math.max(0, plate.stress - 40)

      // Convergent boundaries form mountains
      for (const fault of this.faults) {
        if (fault.boundary === 'convergent' && Math.random() < MOUNTAIN_FORM_CHANCE * magnitude) {
          const mx = Math.floor((fault.x1 + fault.x2) / 2 + (Math.random() - 0.5) * 10)
          const my = Math.floor((fault.y1 + fault.y2) / 2 + (Math.random() - 0.5) * 10)
          if (mx >= 0 && mx < world.width && my >= 0 && my < world.height) {
            const tile = world.getTile(mx, my)
            if (tile === TileType.GRASS || tile === TileType.FOREST) {
              world.setTile(mx, my, TileType.MOUNTAIN)
            }
          }
        }
        fault.activity = Math.min(100, fault.activity + 5)
      }
    }
  }

  private updateFaults(): void {
    for (const fault of this.faults) {
      fault.activity = Math.max(0, fault.activity - 2)
    }
  }

  getPlates(): TectonicPlate[] { return this.plates }
  getFaults(): FaultLine[] { return this.faults }
  getPlateCount(): number { return this.plates.length }

  getStressLevel(): number {
    if (this.plates.length === 0) return 0
    let total = 0
    for (const p of this.plates) total += p.stress
    return total / this.plates.length
  }

  isOnFaultLine(x: number, y: number, threshold: number = 5): boolean {
    for (const f of this.faults) {
      // Point-to-line-segment distance
      const dx = f.x2 - f.x1
      const dy = f.y2 - f.y1
      const lenSq = dx * dx + dy * dy
      if (lenSq === 0) continue
      const t = Math.max(0, Math.min(1, ((x - f.x1) * dx + (y - f.y1) * dy) / lenSq))
      const px = f.x1 + t * dx
      const py = f.y1 + t * dy
      const distSq = (x - px) * (x - px) + (y - py) * (y - py)
      if (distSq <= threshold * threshold) return true
    }
    return false
  }
}
