// World Whirlpool System (v2.95) - Whirlpools form in deep water regions
// They pull in nearby creatures and ships, dealing damage and displacing them

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager, PositionComponent } from '../ecs/Entity'

export interface Whirlpool {
  id: number
  x: number
  y: number
  radius: number
  strength: number    // 0-100, pull force
  rotation: number    // current rotation angle
  rotSpeed: number    // radians per tick
  duration: number
  maxDuration: number
  active: boolean
}

const CHECK_INTERVAL = 400
const MAX_WHIRLPOOLS = 5
const FORM_CHANCE = 0.015
const MIN_DEEP_TILES = 10
const PULL_FORCE = 0.4

export class WorldWhirlpoolSystem {
  private whirlpools: Whirlpool[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formWhirlpools(world)
    this.evolve()
    this.pullCreatures(em)
    this.cleanup()
  }

  private formWhirlpools(world: World): void {
    if (this.whirlpools.length >= MAX_WHIRLPOOLS) return
    if (Math.random() > FORM_CHANCE) return

    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 20; attempt++) {
      const x = 5 + Math.floor(Math.random() * (w - 10))
      const y = 5 + Math.floor(Math.random() * (h - 10))

      if (world.getTile(x, y) !== TileType.DEEP_WATER) continue

      let deepCount = 0
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          if (world.getTile(x + dx, y + dy) === TileType.DEEP_WATER) deepCount++
        }
      }
      if (deepCount < MIN_DEEP_TILES) continue

      this.whirlpools.push({
        id: this.nextId++,
        x, y,
        radius: 3 + Math.floor(Math.random() * 4),
        strength: 40 + Math.random() * 60,
        rotation: 0,
        rotSpeed: 0.05 + Math.random() * 0.1,
        duration: 0,
        maxDuration: 2000 + Math.floor(Math.random() * 3000),
        active: true,
      })
      break
    }
  }

  private evolve(): void {
    for (const wp of this.whirlpools) {
      wp.duration++
      wp.rotation += wp.rotSpeed

      // Strength fluctuates
      wp.strength += (Math.random() - 0.5) * 6
      wp.strength = Math.max(15, Math.min(100, wp.strength))

      if (wp.duration >= wp.maxDuration) {
        wp.active = false
      }
    }
  }

  private pullCreatures(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position')

    for (const wp of this.whirlpools) {
      if (!wp.active) continue

      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue

        const dx = wp.x - pos.x
        const dy = wp.y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > wp.radius || dist < 0.3) continue

        // Pull toward center with spiral motion
        const pullStr = PULL_FORCE * (wp.strength / 100) * (1 - dist / wp.radius)
        const angle = Math.atan2(dy, dx) + wp.rotSpeed * 2

        pos.x += Math.cos(angle) * pullStr
        pos.y += Math.sin(angle) * pullStr
      }
    }
  }

  private cleanup(): void {
    for (let i = this.whirlpools.length - 1; i >= 0; i--) {
      if (!this.whirlpools[i].active) {
        this.whirlpools.splice(i, 1)
      }
    }
  }

  private _activeWhirlpoolsBuf: Whirlpool[] = []
  getActiveWhirlpools(): Whirlpool[] {
    this._activeWhirlpoolsBuf.length = 0
    for (const w of this.whirlpools) { if (w.active) this._activeWhirlpoolsBuf.push(w) }
    return this._activeWhirlpoolsBuf
  }
}
