// World Erosion System (v2.45) - Terrain erodes over time
// Water and weather reshape the landscape gradually
// Mountains erode to hills, coastlines shift, rivers widen

const EROSION_INTERVAL = 1500
const SAMPLES_PER_TICK = 50

export class WorldErosionSystem {
  private worldWidth = 200
  private worldHeight = 200
  private lastUpdate = 0
  private totalErosions = 0

  setWorldSize(w: number, h: number): void {
    this.worldWidth = w
    this.worldHeight = h
  }

  update(dt: number, world: { getTile: (x: number, y: number) => number | null; setTile?: (x: number, y: number, t: number) => void; width: number; height: number }, tick: number): void {
    if (tick - this.lastUpdate < EROSION_INTERVAL) return
    this.lastUpdate = tick
    this.erode(world)
  }

  private erode(world: { getTile: (x: number, y: number) => number | null; setTile?: (x: number, y: number, t: number) => void; width: number; height: number }): void {
    for (let i = 0; i < SAMPLES_PER_TICK; i++) {
      const x = Math.floor(Math.random() * this.worldWidth)
      const y = Math.floor(Math.random() * this.worldHeight)
      const tile = world.getTile(x, y)
      if (tile === null) continue

      // Count adjacent water tiles
      let waterCount = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= this.worldWidth || ny < 0 || ny >= this.worldHeight) continue
          const nt = world.getTile(nx, ny)
          if (nt === 0 || nt === 1) waterCount++
        }
      }

      // Erosion rules (very rare to avoid rapid terrain change)
      if (!world.setTile) continue

      // Mountain near water erodes to grass
      if (tile === 5 && waterCount >= 2 && Math.random() < 0.03) {
        world.setTile(x, y, 3) // mountain -> grass
        this.totalErosions++
      }
      // Sand near lots of water becomes shallow water
      else if (tile === 2 && waterCount >= 4 && Math.random() < 0.02) {
        world.setTile(x, y, 1) // sand -> shallow water
        this.totalErosions++
      }
      // Grass near lots of water becomes sand
      else if (tile === 3 && waterCount >= 5 && Math.random() < 0.01) {
        world.setTile(x, y, 2) // grass -> sand
        this.totalErosions++
      }
    }
  }

  getTotalErosions(): number {
    return this.totalErosions
  }
}
