// World Avalanche System (v2.92) - Avalanches trigger in snowy mountain regions
// Heavy snow accumulation causes avalanches that destroy buildings and push creatures downhill

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager, PositionComponent } from '../ecs/Entity'

export interface Avalanche {
  id: number
  startX: number
  startY: number
  x: number
  y: number
  direction: number   // radians, downhill
  speed: number
  width: number       // tiles wide
  power: number       // 0-100
  duration: number
  maxDuration: number
  active: boolean
}

const CHECK_INTERVAL = 800
const MAX_AVALANCHES = 3
const TRIGGER_CHANCE = 0.012
const MIN_SNOW_TILES = 6
const PUSH_FORCE = 0.8

export class WorldAvalancheSystem {
  private avalanches: Avalanche[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.tryTrigger(world)
    this.advance(world)
    this.affectCreatures(em)
    this.cleanup()
  }

  private tryTrigger(world: World): void {
    if (this.avalanches.length >= MAX_AVALANCHES) return
    if (Math.random() > TRIGGER_CHANCE) return

    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 20; attempt++) {
      const x = 5 + Math.floor(Math.random() * (w - 10))
      const y = 5 + Math.floor(Math.random() * (h - 10))

      if (world.getTile(x, y) !== TileType.MOUNTAIN && world.getTile(x, y) !== TileType.SNOW) continue

      let snowCount = 0
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const t = world.getTile(x + dx, y + dy)
          if (t === TileType.SNOW || t === TileType.MOUNTAIN) snowCount++
        }
      }
      if (snowCount < MIN_SNOW_TILES) continue

      // Find downhill direction (toward lower terrain)
      const dir = this.findDownhill(world, x, y)

      this.avalanches.push({
        id: this.nextId++,
        startX: x,
        startY: y,
        x, y,
        direction: dir,
        speed: 0.6 + Math.random() * 0.4,
        width: 2 + Math.floor(Math.random() * 3),
        power: 60 + Math.random() * 40,
        duration: 0,
        maxDuration: 1500 + Math.floor(Math.random() * 2000),
        active: true,
      })
      break
    }
  }

  private findDownhill(world: World, x: number, y: number): number {
    const TERRAIN_HEIGHT: Partial<Record<TileType, number>> = {
      [TileType.MOUNTAIN]: 5,
      [TileType.SNOW]: 4,
      [TileType.FOREST]: 2,
      [TileType.GRASS]: 1,
      [TileType.SAND]: 0,
      [TileType.SHALLOW_WATER]: -1,
      [TileType.DEEP_WATER]: -2,
    }

    let bestDir = Math.random() * Math.PI * 2
    let bestDrop = 0
    const currentTile = world.getTile(x, y)
    const currentH = currentTile !== null ? (TERRAIN_HEIGHT[currentTile] ?? 1) : 1

    for (let angle = 0; angle < 8; angle++) {
      const a = (angle / 8) * Math.PI * 2
      const nx = x + Math.round(Math.cos(a) * 3)
      const ny = y + Math.round(Math.sin(a) * 3)
      const nTile = world.getTile(nx, ny)
      const nh = nTile !== null ? (TERRAIN_HEIGHT[nTile] ?? 1) : 1
      const drop = currentH - nh
      if (drop > bestDrop) {
        bestDrop = drop
        bestDir = a
      }
    }
    return bestDir
  }

  private advance(world: World): void {
    for (const av of this.avalanches) {
      av.duration++
      av.x += Math.cos(av.direction) * av.speed
      av.y += Math.sin(av.direction) * av.speed

      av.x = Math.max(1, Math.min(world.width - 1, av.x))
      av.y = Math.max(1, Math.min(world.height - 1, av.y))

      // Power decays over time
      av.power *= 0.998

      if (av.duration >= av.maxDuration || av.power < 10) {
        av.active = false
      }
    }
  }

  private affectCreatures(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position')

    for (const av of this.avalanches) {
      if (!av.active) continue

      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue

        const dx = pos.x - av.x
        const dy = pos.y - av.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > av.width) continue

        const force = PUSH_FORCE * (av.power / 100) * (1 - dist / av.width)
        pos.x += Math.cos(av.direction) * force
        pos.y += Math.sin(av.direction) * force
      }
    }
  }

  private cleanup(): void {
    for (let i = this.avalanches.length - 1; i >= 0; i--) {
      if (!this.avalanches[i].active) {
        this.avalanches.splice(i, 1)
      }
    }
  }

  getAvalanches(): Avalanche[] { return this.avalanches }
  getActiveAvalanches(): Avalanche[] { return this.avalanches.filter(a => a.active) }
}
