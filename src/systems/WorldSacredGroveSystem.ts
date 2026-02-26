// World Sacred Grove System (v2.32) - Sacred groves spawn on the map
// Groves provide spiritual buffs to nearby creatures
// Protected by nature spirits that attack intruders

export interface SacredGrove {
  id: number
  x: number
  y: number
  radius: number
  power: number          // spiritual strength 1-10
  spiritCount: number    // guardian spirits
  age: number
  blessingType: 'healing' | 'wisdom' | 'strength' | 'fertility' | 'protection'
  discoveredBy: Set<number>  // civIds
}

const SPAWN_INTERVAL = 2500
const BLESSING_INTERVAL = 600
const MAX_GROVES = 10
const GROVE_RADIUS = 10
const MIN_DISTANCE = 25

const BLESSING_TYPES: SacredGrove['blessingType'][] = ['healing', 'wisdom', 'strength', 'fertility', 'protection']

let nextGroveId = 1

export class WorldSacredGroveSystem {
  private groves: SacredGrove[] = []
  private lastSpawn = 0
  private lastBlessing = 0

  update(dt: number, world: { width: number; height: number; getTile: (x: number, y: number) => number | null }, tick: number): void {
    if (tick - this.lastSpawn >= SPAWN_INTERVAL) {
      this.lastSpawn = tick
      this.trySpawnGrove(world)
    }
    if (tick - this.lastBlessing >= BLESSING_INTERVAL) {
      this.lastBlessing = tick
      this.updateGroves()
    }
  }

  private trySpawnGrove(world: { width: number; height: number; getTile: (x: number, y: number) => number | null }): void {
    if (this.groves.length >= MAX_GROVES) return
    const x = 10 + Math.floor(Math.random() * (world.width - 20))
    const y = 10 + Math.floor(Math.random() * (world.height - 20))
    const tile = world.getTile(x, y)
    // Only spawn on forest tiles (type 4 = FOREST)
    if (tile !== 4) return
    // Check distance from existing groves
    for (const g of this.groves) {
      const dx = g.x - x, dy = g.y - y
      if (dx * dx + dy * dy < MIN_DISTANCE * MIN_DISTANCE) return
    }
    this.groves.push({
      id: nextGroveId++,
      x, y,
      radius: GROVE_RADIUS,
      power: 2 + Math.floor(Math.random() * 5),
      spiritCount: 1 + Math.floor(Math.random() * 3),
      age: 0,
      blessingType: BLESSING_TYPES[Math.floor(Math.random() * BLESSING_TYPES.length)],
      discoveredBy: new Set(),
    })
  }

  private updateGroves(): void {
    for (const grove of this.groves) {
      grove.age++
      // Power grows with age
      if (grove.age % 10 === 0 && grove.power < 10) {
        grove.power = Math.min(10, grove.power + 1)
      }
      // Spirits may increase
      if (grove.age % 20 === 0 && grove.spiritCount < 5 && Math.random() < 0.2) {
        grove.spiritCount++
      }
    }
  }

  getGroves(): SacredGrove[] {
    return this.groves
  }

  getGroveAt(x: number, y: number): SacredGrove | undefined {
    for (const g of this.groves) {
      const dx = g.x - x, dy = g.y - y
      if (dx * dx + dy * dy <= g.radius * g.radius) return g
    }
    return undefined
  }

  getGroveCount(): number {
    return this.groves.length
  }
}
