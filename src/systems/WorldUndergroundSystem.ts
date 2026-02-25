// World Underground System (v2.57) - Subterranean cave networks
// Caves form naturally under mountains, contain resources and dangers
// Creatures can discover cave entrances and explore underground

import { World } from '../game/World'

export type CaveType = 'shallow' | 'deep' | 'crystal' | 'lava' | 'flooded' | 'ancient'

export interface CaveNode {
  id: number
  x: number
  y: number
  type: CaveType
  depth: number         // 1-5 levels deep
  resources: number     // 0-100
  danger: number        // 0-100
  discovered: boolean
  connectedTo: number[] // other cave node ids
}

const CHECK_INTERVAL = 1500
const MAX_CAVES = 60
const CAVE_CHANCE = 0.008

const CAVE_TYPES: CaveType[] = ['shallow', 'deep', 'crystal', 'lava', 'flooded', 'ancient']

const CAVE_RESOURCES: Record<CaveType, [number, number]> = {
  shallow: [10, 40],
  deep: [30, 70],
  crystal: [50, 90],
  lava: [20, 50],
  flooded: [15, 45],
  ancient: [60, 100],
}

const CAVE_DANGER: Record<CaveType, [number, number]> = {
  shallow: [5, 20],
  deep: [30, 60],
  crystal: [10, 30],
  lava: [60, 90],
  flooded: [40, 70],
  ancient: [50, 80],
}

export class WorldUndergroundSystem {
  private caves: CaveNode[] = []
  private nextId = 1
  private lastCheck = 0
  private totalDiscovered = 0

  update(dt: number, world: World, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.generateCaves(world)
      this.connectCaves()
    }
  }

  private generateCaves(world: World): void {
    if (this.caves.length >= MAX_CAVES) return
    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 10; attempt++) {
      if (this.caves.length >= MAX_CAVES) break
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Caves form under mountains and forests
      if (tile !== 5 && tile !== 4 && Math.random() > CAVE_CHANCE) continue
      if (this.caves.some(c => Math.abs(c.x - x) < 5 && Math.abs(c.y - y) < 5)) continue

      const type = tile === 5
        ? (Math.random() < 0.3 ? 'lava' : Math.random() < 0.5 ? 'deep' : 'crystal')
        : CAVE_TYPES[Math.floor(Math.random() * CAVE_TYPES.length)]

      const [minR, maxR] = CAVE_RESOURCES[type]
      const [minD, maxD] = CAVE_DANGER[type]

      this.caves.push({
        id: this.nextId++,
        x, y,
        type,
        depth: 1 + Math.floor(Math.random() * 5),
        resources: minR + Math.floor(Math.random() * (maxR - minR + 1)),
        danger: minD + Math.floor(Math.random() * (maxD - minD + 1)),
        discovered: false,
        connectedTo: [],
      })
    }
  }

  private connectCaves(): void {
    for (const cave of this.caves) {
      if (cave.connectedTo.length >= 3) continue
      for (const other of this.caves) {
        if (cave.id === other.id) continue
        if (cave.connectedTo.includes(other.id)) continue
        const dist = Math.abs(cave.x - other.x) + Math.abs(cave.y - other.y)
        if (dist < 20 && Math.random() < 0.3) {
          cave.connectedTo.push(other.id)
          if (!other.connectedTo.includes(cave.id)) {
            other.connectedTo.push(cave.id)
          }
        }
        if (cave.connectedTo.length >= 3) break
      }
    }
  }

  discoverCave(x: number, y: number): CaveNode | null {
    for (const cave of this.caves) {
      if (!cave.discovered && Math.abs(cave.x - x) < 3 && Math.abs(cave.y - y) < 3) {
        cave.discovered = true
        this.totalDiscovered++
        return cave
      }
    }
    return null
  }

  getCaves(): CaveNode[] { return this.caves }
  getDiscoveredCaves(): CaveNode[] { return this.caves.filter(c => c.discovered) }
  getTotalDiscovered(): number { return this.totalDiscovered }
}
