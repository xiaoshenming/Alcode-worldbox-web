// World Tidal System (v2.35) - Tidal cycles affect coastal tiles
// High tide floods coastal land, low tide reveals new land
// Affects fishing, naval movement, and coastal settlements

export interface TidalState {
  phase: number          // 0-1 cycle position
  level: number          // -3 to +3 tile offset
  direction: 'rising' | 'falling'
  floodedTiles: Set<number>  // packed coords of temporarily flooded tiles
}

const CYCLE_INTERVAL = 100
const TIDE_PERIOD = 4000     // full cycle in ticks
const MAX_FLOOD_DEPTH = 3
const COASTAL_SCAN_INTERVAL = 800

export class WorldTidalSystem {
  private state: TidalState = {
    phase: 0,
    level: 0,
    direction: 'rising',
    floodedTiles: new Set(),
  }
  private coastalTiles: number[] = []  // packed coords
  private lastCycle = 0
  private lastScan = 0
  private worldWidth = 200
  private worldHeight = 200

  setWorldSize(w: number, h: number): void {
    this.worldWidth = w
    this.worldHeight = h
  }

  update(dt: number, world: { getTile: (x: number, y: number) => number | null; setTile?: (x: number, y: number, t: number) => void }, tick: number): void {
    // Scan for coastal tiles periodically
    if (tick - this.lastScan >= COASTAL_SCAN_INTERVAL) {
      this.lastScan = tick
      this.scanCoastalTiles(world)
    }
    if (tick - this.lastCycle >= CYCLE_INTERVAL) {
      this.lastCycle = tick
      this.updateTide(tick)
    }
  }

  private scanCoastalTiles(world: { getTile: (x: number, y: number) => number | null }): void {
    this.coastalTiles = []
    // Sample every 3rd tile for performance
    for (let y = 0; y < this.worldHeight; y += 3) {
      for (let x = 0; x < this.worldWidth; x += 3) {
        const tile = world.getTile(x, y)
        if (tile === null) continue
        // Check if land tile adjacent to water
        if (tile > 1) { // not water
          let nearWater = false
          for (let dy = -1; dy <= 1 && !nearWater; dy++) {
            for (let dx = -1; dx <= 1 && !nearWater; dx++) {
              if (dx === 0 && dy === 0) continue
              const nx = x + dx, ny = y + dy
              if (nx < 0 || nx >= this.worldWidth || ny < 0 || ny >= this.worldHeight) continue
              const nt = world.getTile(nx, ny)
              if (nt === 0 || nt === 1) nearWater = true // deep or shallow water
            }
          }
          if (nearWater) {
            this.coastalTiles.push(y * this.worldWidth + x)
          }
        }
      }
    }
  }

  private updateTide(tick: number): void {
    this.state.phase = (tick % TIDE_PERIOD) / TIDE_PERIOD
    const sineVal = Math.sin(this.state.phase * Math.PI * 2)
    this.state.level = sineVal * MAX_FLOOD_DEPTH
    this.state.direction = Math.cos(this.state.phase * Math.PI * 2) > 0 ? 'rising' : 'falling'
    // Update flooded tiles based on tide level
    this.state.floodedTiles.clear()
    if (this.state.level > 0.5) {
      const floodChance = (this.state.level - 0.5) / MAX_FLOOD_DEPTH
      for (const packed of this.coastalTiles) {
        if (Math.random() < floodChance * 0.3) {
          this.state.floodedTiles.add(packed)
        }
      }
    }
  }

  getTidalState(): TidalState {
    return this.state
  }

  getTideLevel(): number {
    return this.state.level
  }

  getCoastalTileCount(): number {
    return this.coastalTiles.length
  }

  getFloodedCount(): number {
    return this.state.floodedTiles.size
  }
}
