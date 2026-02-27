// World Miasma System (v2.65) - Toxic miasma zones
// Miasma forms in swamps, battlefields, and polluted areas
// Damages creatures, reduces visibility, and corrupts terrain over time

import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type MiasmaSource = 'swamp' | 'battlefield' | 'pollution' | 'cursed' | 'volcanic' | 'plague'

export interface MiasmaZone {
  id: number
  x: number
  y: number
  radius: number        // tiles
  intensity: number     // 0-100
  source: MiasmaSource
  spreadRate: number    // 0-1
  decayRate: number     // 0-1
  createdTick: number
}

const CHECK_INTERVAL = 1100
const MAX_ZONES = 30
const SPAWN_CHANCE = 0.015

const INTENSITY_BY_SOURCE: Record<MiasmaSource, [number, number]> = {
  swamp: [20, 50],
  battlefield: [30, 60],
  pollution: [40, 70],
  cursed: [60, 90],
  volcanic: [50, 80],
  plague: [45, 75],
}

export class WorldMiasmaSystem {
  private zones: MiasmaZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.spawnZones(world, tick)
    this.updateZones()
  }

  private spawnZones(world: World, tick: number): void {
    if (this.zones.length >= MAX_ZONES) return
    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 6; attempt++) {
      if (this.zones.length >= MAX_ZONES) break
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Miasma forms in specific terrain
      let source: MiasmaSource
      if (tile === TileType.SHALLOW_WATER || tile === TileType.SAND) {
        source = 'swamp'
      } else if (tile === TileType.LAVA) {
        source = 'volcanic'
      } else if (tile === TileType.GRASS && Math.random() < 0.3) {
        source = Math.random() < 0.5 ? 'battlefield' : 'pollution'
      } else {
        continue
      }

      if (Math.random() > SPAWN_CHANCE) continue
      if (this.zones.some(z => Math.abs(z.x - x) < 8 && Math.abs(z.y - y) < 8)) continue

      const [minI, maxI] = INTENSITY_BY_SOURCE[source]

      this.zones.push({
        id: this.nextId++,
        x, y,
        radius: 3 + Math.floor(Math.random() * 5),
        intensity: minI + Math.floor(Math.random() * (maxI - minI + 1)),
        source,
        spreadRate: 0.01 + Math.random() * 0.04,
        decayRate: 0.02 + Math.random() * 0.03,
        createdTick: tick,
      })
    }
  }

  private updateZones(): void {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i]

      // Spread slowly
      if (Math.random() < zone.spreadRate) {
        zone.radius = Math.min(12, zone.radius + 0.5)
      }

      // Decay intensity
      zone.intensity -= zone.decayRate * 10
      if (zone.intensity <= 0) {
        this.zones.splice(i, 1)
      }
    }
  }

  isInMiasma(x: number, y: number): boolean {
    for (const zone of this.zones) {
      const dx = zone.x - x, dy = zone.y - y
      if (dx * dx + dy * dy <= zone.radius * zone.radius) return true
    }
    return false
  }

  getMiasmaIntensity(x: number, y: number): number {
    let maxIntensity = 0
    for (const zone of this.zones) {
      const dx = zone.x - x, dy = zone.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= zone.radius) {
        const falloff = 1 - dist / zone.radius
        maxIntensity = Math.max(maxIntensity, zone.intensity * falloff)
      }
    }
    return maxIntensity
  }

  private _toxicZonesBuf: MiasmaZone[] = []
  getZones(): MiasmaZone[] { return this.zones }
  getZoneCount(): number { return this.zones.length }
  getToxicZones(): MiasmaZone[] {
    this._toxicZonesBuf.length = 0
    for (const z of this.zones) { if (z.intensity > 60) this._toxicZonesBuf.push(z) }
    return this._toxicZonesBuf
  }
}
