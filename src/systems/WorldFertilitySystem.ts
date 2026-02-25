// World Fertility System (v2.40) - Soil fertility map affecting growth
// Fertile areas boost crop yields and forest growth
// Fertility changes over time based on usage, weather, and disasters

const FERTILITY_UPDATE_INTERVAL = 600
const DECAY_RATE = 0.02
const REGEN_RATE = 0.01
const MAX_FERTILITY = 100
const MIN_FERTILITY = 0

export class WorldFertilitySystem {
  private fertility: Float32Array = new Float32Array(0)
  private worldWidth = 0
  private worldHeight = 0
  private lastUpdate = 0
  private initialized = false

  init(width: number, height: number, tiles: number[][]): void {
    this.worldWidth = width
    this.worldHeight = height
    this.fertility = new Float32Array(width * height)
    // Initialize fertility based on terrain
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        const tile = tiles[y]?.[x] ?? 0
        switch (tile) {
          case 3: this.fertility[idx] = 60 + Math.random() * 30; break  // grass
          case 4: this.fertility[idx] = 70 + Math.random() * 25; break  // forest
          case 2: this.fertility[idx] = 30 + Math.random() * 20; break  // sand
          case 5: this.fertility[idx] = 20 + Math.random() * 15; break  // mountain
          case 6: this.fertility[idx] = 40 + Math.random() * 20; break  // snow
          default: this.fertility[idx] = 0; break  // water, lava
        }
      }
    }
    this.initialized = true
  }

  update(dt: number, tiles: number[][], tick: number): void {
    if (!this.initialized) return
    if (tick - this.lastUpdate < FERTILITY_UPDATE_INTERVAL) return
    this.lastUpdate = tick
    // Sample update for performance (every 4th tile)
    for (let y = 0; y < this.worldHeight; y += 2) {
      for (let x = 0; x < this.worldWidth; x += 2) {
        const idx = y * this.worldWidth + x
        const tile = tiles[y]?.[x] ?? 0
        // Water and lava have no fertility
        if (tile <= 1 || tile === 7) {
          this.fertility[idx] = 0
          continue
        }
        // Natural regeneration
        if (this.fertility[idx] < MAX_FERTILITY) {
          let regen = REGEN_RATE
          // Forest tiles regenerate faster
          if (tile === 4) regen *= 2
          // Grass near water regenerates faster
          if (tile === 3) regen *= 1.5
          this.fertility[idx] = Math.min(MAX_FERTILITY, this.fertility[idx] + regen)
        }
        // Slight random variation
        if (Math.random() < 0.01) {
          this.fertility[idx] += (Math.random() - 0.5) * 3
          this.fertility[idx] = Math.max(MIN_FERTILITY, Math.min(MAX_FERTILITY, this.fertility[idx]))
        }
      }
    }
  }

  getFertility(x: number, y: number): number {
    if (x < 0 || x >= this.worldWidth || y < 0 || y >= this.worldHeight) return 0
    return this.fertility[y * this.worldWidth + x]
  }

  setFertility(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.worldWidth || y < 0 || y >= this.worldHeight) return
    this.fertility[y * this.worldWidth + x] = Math.max(MIN_FERTILITY, Math.min(MAX_FERTILITY, value))
  }

  deplete(x: number, y: number, amount: number): void {
    if (x < 0 || x >= this.worldWidth || y < 0 || y >= this.worldHeight) return
    const idx = y * this.worldWidth + x
    this.fertility[idx] = Math.max(MIN_FERTILITY, this.fertility[idx] - amount)
  }

  getAverageFertility(): number {
    if (!this.initialized) return 0
    let sum = 0, count = 0
    for (let i = 0; i < this.fertility.length; i += 4) {
      if (this.fertility[i] > 0) { sum += this.fertility[i]; count++ }
    }
    return count > 0 ? sum / count : 0
  }

  isInitialized(): boolean {
    return this.initialized
  }
}
