// World Beacon System (v2.70) - Signal beacons and lighthouses for navigation and communication
// Beacons built on high ground/coasts, need fuel to stay lit, relay signals across the map

import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type BeaconType = 'watchtower' | 'lighthouse' | 'signal_fire' | 'smoke_signal' | 'war_beacon' | 'trade_marker'

export interface Beacon {
  id: number
  x: number
  y: number
  type: BeaconType
  range: number
  lit: boolean
  fuel: number        // 0-100
  builtTick: number
  lastLitTick: number
}

const CHECK_INTERVAL = 800
const MAX_BEACONS = 25
const SPAWN_CHANCE = 0.012
const FUEL_CONSUME_RATE = 2
const FUEL_IGNITE_THRESHOLD = 10
const RELAY_RANGE = 20

const BEACON_RANGES: Record<BeaconType, [number, number]> = {
  watchtower: [8, 14],
  lighthouse: [12, 20],
  signal_fire: [6, 10],
  smoke_signal: [5, 8],
  war_beacon: [10, 16],
  trade_marker: [4, 7],
}

const TERRAIN_TYPES: Record<number, BeaconType[]> = {
  [TileType.MOUNTAIN]: ['watchtower', 'signal_fire', 'war_beacon', 'smoke_signal'],
  [TileType.SAND]: ['lighthouse', 'trade_marker'],
  [TileType.FOREST]: ['watchtower', 'smoke_signal'],
  [TileType.GRASS]: ['trade_marker', 'signal_fire'],
}

export class WorldBeaconSystem {
  private beacons: Beacon[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.spawnBeacons(world, tick)
    this.updateFuel(tick)
    this.relaySignals()
  }

  private spawnBeacons(world: World, tick: number): void {
    if (this.beacons.length >= MAX_BEACONS) return
    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 6; attempt++) {
      if (this.beacons.length >= MAX_BEACONS) break
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)
      if (tile === null) continue

      const allowed = TERRAIN_TYPES[tile as number]
      if (!allowed) continue
      if (Math.random() > SPAWN_CHANCE) continue

      // Not too close to existing beacons
      if (this.beacons.some(b => Math.abs(b.x - x) < 8 && Math.abs(b.y - y) < 8)) continue

      const type = allowed[Math.floor(Math.random() * allowed.length)]
      const [minR, maxR] = BEACON_RANGES[type]

      this.beacons.push({
        id: this.nextId++,
        x, y,
        type,
        range: minR + Math.floor(Math.random() * (maxR - minR + 1)),
        lit: false,
        fuel: 40 + Math.floor(Math.random() * 60),
        builtTick: tick,
        lastLitTick: 0,
      })
    }
  }

  private updateFuel(tick: number): void {
    for (const beacon of this.beacons) {
      if (beacon.lit) {
        beacon.fuel = Math.max(0, beacon.fuel - FUEL_CONSUME_RATE)
        if (beacon.fuel <= 0) beacon.lit = false
      } else if (beacon.fuel >= FUEL_IGNITE_THRESHOLD && Math.random() < 0.15) {
        beacon.lit = true
        beacon.lastLitTick = tick
      }

      // Passive fuel regeneration for unlit beacons
      if (!beacon.lit && beacon.fuel < 100) beacon.fuel = Math.min(100, beacon.fuel + 1)
    }
  }

  private relaySignals(): void {
    for (const source of this.beacons) {
      if (!source.lit) continue
      for (const target of this.beacons) {
        if (target.lit || target.fuel < FUEL_IGNITE_THRESHOLD) continue
        const dx = source.x - target.x
        const dy = source.y - target.y
        if (dx * dx + dy * dy <= RELAY_RANGE * RELAY_RANGE && Math.random() < 0.08) {
          target.lit = true
          target.lastLitTick = this.lastCheck
        }
      }
    }
  }

  getBeacons(): Beacon[] { return this.beacons }
  getBeaconCount(): number { return this.beacons.length }
  getLitBeacons(): Beacon[] { return this.beacons.filter(b => b.lit) }

  getBeaconAt(x: number, y: number): Beacon | null {
    return this.beacons.find(b => b.x === x && b.y === y) ?? null
  }

  isInBeaconRange(x: number, y: number): boolean {
    for (const b of this.beacons) {
      if (!b.lit) continue
      const dx = b.x - x
      const dy = b.y - y
      if (dx * dx + dy * dy <= b.range * b.range) return true
    }
    return false
  }
}
