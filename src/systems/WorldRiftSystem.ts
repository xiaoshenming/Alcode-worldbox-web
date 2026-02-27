// World Rift System (v2.90) - Dimensional rifts tear open in the world
// Rifts spawn anomalies, warp nearby terrain, and attract/repel creatures

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager, PositionComponent } from '../ecs/Entity'

export type RiftStage = 'forming' | 'stable' | 'unstable' | 'collapsing'

export interface DimensionalRift {
  id: number
  x: number
  y: number
  radius: number
  stage: RiftStage
  energy: number       // 0-100
  age: number
  maxAge: number
  warpsPerformed: number
}

const CHECK_INTERVAL = 600
const MAX_RIFTS = 5
const FORM_CHANCE = 0.012
const WARP_RANGE = 8
const WARP_CHANCE = 0.15
const ENERGY_DECAY = 0.4
const MAX_WARPS = 20

const WARP_TILES = [TileType.GRASS, TileType.FOREST, TileType.SAND, TileType.SNOW] as const

export class WorldRiftSystem {
  private rifts: DimensionalRift[] = []
  private _activeBuf: DimensionalRift[] = []
  private _stableBuf: DimensionalRift[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formRifts(world)
    this.updateRifts(world)
    this.affectCreatures(em)
    this.cleanup()
  }

  private formRifts(world: World): void {
    if (this.rifts.length >= MAX_RIFTS) return
    if (Math.random() > FORM_CHANCE) return

    const w = world.width
    const h = world.height

    for (let a = 0; a < 10; a++) {
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))

      const tile = world.getTile(x, y)
      if (tile === TileType.DEEP_WATER || tile === TileType.LAVA) continue

      // Not too close to existing rifts
      const tooClose = this.rifts.some(r => {
        const dx = r.x - x
        const dy = r.y - y
        return dx * dx + dy * dy < 225
      })
      if (tooClose) continue

      this.rifts.push({
        id: this.nextId++,
        x, y,
        radius: 2 + Math.floor(Math.random() * 3),
        stage: 'forming',
        energy: 80 + Math.random() * 20,
        age: 0,
        maxAge: 5000 + Math.floor(Math.random() * 5000),
        warpsPerformed: 0,
      })
      break
    }
  }

  private updateRifts(world: World): void {
    for (const rift of this.rifts) {
      rift.age++

      // Stage transitions
      const lifeRatio = rift.age / rift.maxAge
      if (lifeRatio < 0.1) {
        rift.stage = 'forming'
      } else if (lifeRatio < 0.6) {
        rift.stage = 'stable'
      } else if (lifeRatio < 0.9) {
        rift.stage = 'unstable'
      } else {
        rift.stage = 'collapsing'
      }

      // Energy decay
      rift.energy = Math.max(0, rift.energy - ENERGY_DECAY)

      // Warp nearby terrain when stable/unstable
      if ((rift.stage === 'stable' || rift.stage === 'unstable') &&
          rift.warpsPerformed < MAX_WARPS && Math.random() < WARP_CHANCE) {
        const wx = rift.x + Math.floor((Math.random() - 0.5) * WARP_RANGE * 2)
        const wy = rift.y + Math.floor((Math.random() - 0.5) * WARP_RANGE * 2)

        if (wx >= 0 && wx < world.width && wy >= 0 && wy < world.height) {
          const newTile = WARP_TILES[Math.floor(Math.random() * WARP_TILES.length)]
          world.setTile(wx, wy, newTile)
          rift.warpsPerformed++
        }
      }
    }
  }

  private affectCreatures(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position')

    for (const rift of this.rifts) {
      if (rift.stage === 'forming' || rift.stage === 'collapsing') continue

      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue

        const dx = rift.x - pos.x
        const dy = rift.y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > WARP_RANGE || dist < 0.5) continue

        // Unstable rifts repel, stable rifts attract slightly
        const force = (rift.energy / 100) * (1 - dist / WARP_RANGE) * 0.2
        if (rift.stage === 'stable') {
          pos.x += dx / dist * force
          pos.y += dy / dist * force
        } else {
          pos.x -= dx / dist * force * 1.5
          pos.y -= dy / dist * force * 1.5
        }
      }
    }
  }

  private cleanup(): void {
    for (let i = this.rifts.length - 1; i >= 0; i--) {
      if (this.rifts[i].age >= this.rifts[i].maxAge) {
        this.rifts.splice(i, 1)
      }
    }
  }

  getRifts(): DimensionalRift[] { return this.rifts }
  getActiveRifts(): DimensionalRift[] {
    this._activeBuf.length = 0
    for (const r of this.rifts) { if (r.stage !== 'collapsing') this._activeBuf.push(r) }
    return this._activeBuf
  }
  getStableRifts(): DimensionalRift[] {
    this._stableBuf.length = 0
    for (const r of this.rifts) { if (r.stage === 'stable') this._stableBuf.push(r) }
    return this._stableBuf
  }
}
