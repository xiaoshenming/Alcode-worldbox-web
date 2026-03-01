// World Crystal Formation System (v2.47) - Crystal formations grow in caves/mountains
// Crystals are harvestable for trade and magic, grow slowly over time
// Different crystal types have different properties

export type CrystalType = 'quartz' | 'amethyst' | 'ruby' | 'sapphire' | 'emerald' | 'obsidian'

export interface CrystalFormation {
  id: number
  x: number
  y: number
  type: CrystalType
  size: number          // 1-10
  purity: number        // 0-100
  harvestable: boolean
  age: number
}

const GROW_INTERVAL = 1200
const SPAWN_INTERVAL = 2500
const MAX_FORMATIONS = 20
const GROWTH_RATE = 0.3

const CRYSTAL_TYPES: CrystalType[] = ['quartz', 'amethyst', 'ruby', 'sapphire', 'emerald', 'obsidian']

let nextCrystalId = 1

export class WorldCrystalFormationSystem {
  private formations: CrystalFormation[] = []
  private lastGrow = 0
  private lastSpawn = 0

  update(dt: number, world: { width: number; height: number; getTile: (x: number, y: number) => number | null }, tick: number): void {
    if (tick - this.lastSpawn >= SPAWN_INTERVAL) {
      this.lastSpawn = tick
      this.spawnFormation(world)
    }
    if (tick - this.lastGrow >= GROW_INTERVAL) {
      this.lastGrow = tick
      this.growCrystals()
    }
  }

  private spawnFormation(world: { width: number; height: number; getTile: (x: number, y: number) => number | null }): void {
    if (this.formations.length >= MAX_FORMATIONS) return
    if (Math.random() > 0.3) return
    const x = Math.floor(Math.random() * world.width)
    const y = Math.floor(Math.random() * world.height)
    const tile = world.getTile(x, y)
    // Only spawn on mountain (5) or snow (6) tiles
    if (tile !== 5 && tile !== 6) return
    // Check distance from existing formations
    for (const f of this.formations) {
      const dx = f.x - x, dy = f.y - y
      if (dx * dx + dy * dy < 100) return
    }
    this.formations.push({
      id: nextCrystalId++,
      x, y,
      type: CRYSTAL_TYPES[Math.floor(Math.random() * CRYSTAL_TYPES.length)],
      size: 1,
      purity: 30 + Math.floor(Math.random() * 50),
      harvestable: false,
      age: 0,
    })
  }

  private growCrystals(): void {
    for (const f of this.formations) {
      f.age++
      if (f.size < 10) {
        f.size = Math.min(10, f.size + GROWTH_RATE)
      }
      if (f.purity < 100 && Math.random() < 0.1) {
        f.purity = Math.min(100, f.purity + 1)
      }
      f.harvestable = f.size >= 3
    }
  }

  getFormations(): CrystalFormation[] {
    return this.formations
  }

  getFormationCount(): number {
    return this.formations.length
  }
}
