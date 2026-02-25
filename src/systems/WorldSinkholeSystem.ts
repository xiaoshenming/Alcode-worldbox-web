// World Sinkhole System (v3.27) - Ground collapses forming sinkholes
// Sinkholes appear randomly, swallowing terrain and damaging nearby creatures

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'

export type SinkholeStage = 'forming' | 'active' | 'collapsing' | 'filled'

export interface Sinkhole {
  id: number
  x: number
  y: number
  radius: number
  depth: number       // 0-100
  stage: SinkholeStage
  startTick: number
  duration: number
}

const CHECK_INTERVAL = 1200
const SINKHOLE_CHANCE = 0.003
const MAX_SINKHOLES = 8
const DAMAGE_RADIUS = 4
const DAMAGE_AMOUNT = 0.3

export class WorldSinkholeSystem {
  private sinkholes: Sinkhole[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: any, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.trySpawnSinkhole(world, tick)
      this.updateStages(tick)
    }

    if (this.sinkholes.length > 0) {
      this.applyDamage(em)
    }
  }

  private trySpawnSinkhole(world: any, tick: number): void {
    if (this.sinkholes.length >= MAX_SINKHOLES) return
    if (Math.random() > SINKHOLE_CHANCE) return

    const width = world.width || 200
    const height = world.height || 200
    const x = Math.floor(Math.random() * width)
    const y = Math.floor(Math.random() * height)

    // Don't spawn in water
    const tile = world.getTile?.(x, y)
    if (tile === 0 || tile === 1) return

    this.sinkholes.push({
      id: this.nextId++,
      x, y,
      radius: 2 + Math.floor(Math.random() * 3),
      depth: 10 + Math.random() * 40,
      stage: 'forming',
      startTick: tick,
      duration: 2000 + Math.floor(Math.random() * 2000),
    })
  }

  private updateStages(tick: number): void {
    for (const s of this.sinkholes) {
      const elapsed = tick - s.startTick
      const progress = elapsed / s.duration

      if (progress < 0.2) {
        s.stage = 'forming'
        s.depth = Math.min(100, s.depth + 0.5)
      } else if (progress < 0.7) {
        s.stage = 'active'
      } else if (progress < 1.0) {
        s.stage = 'collapsing'
        s.depth = Math.max(0, s.depth - 1)
      } else {
        s.stage = 'filled'
      }
    }

    this.sinkholes = this.sinkholes.filter(s => s.stage !== 'filled')
  }

  private applyDamage(em: EntityManager): void {
    const activeSinkholes = this.sinkholes.filter(s => s.stage === 'active')
    if (activeSinkholes.length === 0) return

    const entities = em.getEntitiesWithComponents('position', 'needs')
    for (const eid of entities) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      const needs = em.getComponent<NeedsComponent>(eid, 'needs')
      if (!pos || !needs) continue

      for (const s of activeSinkholes) {
        const dx = pos.x - s.x
        const dy = pos.y - s.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < DAMAGE_RADIUS + s.radius) {
          needs.health -= DAMAGE_AMOUNT * (s.depth * 0.01)
        }
      }
    }
  }

  getSinkholes(): Sinkhole[] { return this.sinkholes }
  getActiveSinkholes(): Sinkhole[] { return this.sinkholes.filter(s => s.stage === 'active') }
}
