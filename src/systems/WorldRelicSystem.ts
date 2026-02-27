// World Relic System (v2.15) - Ancient relics scattered across the world
// Relics provide area-of-effect buffs to nearby creatures and civilizations

import { EntityManager, PositionComponent, CreatureComponent, NeedsComponent } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'
import { EventLog } from './EventLog'

export type RelicType = 'wisdom' | 'war' | 'nature' | 'arcane' | 'prosperity'

export interface Relic {
  id: number
  type: RelicType
  x: number
  y: number
  power: number          // 0.1 - 1.0
  discoveredBy: number | null  // civ id
  discoveredTick: number | null
  active: boolean
}

const RELIC_LABELS: Record<RelicType, string> = {
  wisdom: 'Tome of Wisdom',
  war: 'Blade of Ancients',
  nature: 'Seed of Life',
  arcane: 'Arcane Crystal',
  prosperity: 'Golden Chalice',
}

const RELIC_COLORS: Record<RelicType, string> = {
  wisdom: '#88f',
  war: '#f44',
  nature: '#4f4',
  arcane: '#c4f',
  prosperity: '#ffd700',
}

const SPAWN_INTERVAL = 5000
const MAX_RELICS = 10
const EFFECT_RADIUS = 15
const EFFECT_INTERVAL = 400
const DISCOVERY_RANGE = 3

const RELIC_TYPES: RelicType[] = ['wisdom', 'war', 'nature', 'arcane', 'prosperity']

let nextRelicId = 1

interface WorldLike {
  tick: number
  width: number
  height: number
  getTile(x: number, y: number): number | null
}

export class WorldRelicSystem {
  private relics: Relic[] = []
  private nextSpawnTick = SPAWN_INTERVAL
  private nextEffectTick = EFFECT_INTERVAL
  private _lastZoom = -1
  private _nameFont = ''

  getRelics(): Relic[] { return this.relics }

  getDiscoveredRelics(): Relic[] {
    return this.relics.filter(r => r.discoveredBy !== null)
  }

  update(dt: number, em: EntityManager, world: WorldLike): void {
    const tick = world.tick

    // Spawn new relics
    if (tick >= this.nextSpawnTick && this.relics.length < MAX_RELICS) {
      this.nextSpawnTick = tick + SPAWN_INTERVAL
      this.spawnRelic(world, tick)
    }

    // Check discovery
    this.checkDiscovery(em, tick)

    // Apply effects
    if (tick >= this.nextEffectTick) {
      this.nextEffectTick = tick + EFFECT_INTERVAL
      this.applyEffects(em)
    }
  }

  private spawnRelic(world: WorldLike, tick: number): void {
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)
      if (tile === null || tile < 3 || tile > 5) continue

      const tooClose = this.relics.some(r => {
        const dx = r.x - x, dy = r.y - y
        return dx * dx + dy * dy < 400
      })
      if (tooClose) continue

      const type = RELIC_TYPES[Math.floor(Math.random() * RELIC_TYPES.length)]
      const relic: Relic = {
        id: nextRelicId++,
        type,
        x, y,
        power: 0.3 + Math.random() * 0.7,
        discoveredBy: null,
        discoveredTick: null,
        active: true,
      }
      this.relics.push(relic)
      EventLog.log('world_event', `An ancient ${RELIC_LABELS[type]} appeared at (${x},${y})`, tick)
      return
    }
  }

  private checkDiscovery(em: EntityManager, tick: number): void {
    const undiscovered = this.relics.filter(r => r.discoveredBy === null)
    if (undiscovered.length === 0) return

    const entities = em.getEntitiesWithComponents('position', 'creature', 'civMember')
    for (const relic of undiscovered) {
      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        const cc = em.getComponent<CreatureComponent>(eid, 'creature')
        const cm = em.getComponent<CivMemberComponent>(eid, 'civMember')
        if (!pos || !cc || !cm) continue

        const dx = pos.x - relic.x, dy = pos.y - relic.y
        if (dx * dx + dy * dy < DISCOVERY_RANGE * DISCOVERY_RANGE) {
          relic.discoveredBy = cm.civId
          relic.discoveredTick = tick
          EventLog.log('world_event', `${cc.name} discovered ${RELIC_LABELS[relic.type]}!`, tick)
          break
        }
      }
    }
  }

  private applyEffects(em: EntityManager): void {
    const discovered = this.relics.filter(r => r.discoveredBy !== null && r.active)
    if (discovered.length === 0) return

    const entities = em.getEntitiesWithComponents('position', 'creature', 'needs')
    for (const relic of discovered) {
      const r2 = EFFECT_RADIUS * EFFECT_RADIUS
      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        const cc = em.getComponent<CreatureComponent>(eid, 'creature')
        const needs = em.getComponent<NeedsComponent>(eid, 'needs')
        if (!pos || !cc || !needs) continue

        const dx = pos.x - relic.x, dy = pos.y - relic.y
        if (dx * dx + dy * dy > r2) continue

        switch (relic.type) {
          case 'war':
            cc.damage = Math.max(cc.damage, cc.damage + Math.floor(relic.power * 2))
            break
          case 'nature':
            needs.health = Math.min(100, needs.health + Math.floor(relic.power * 3))
            break
          default:
            break
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (this.relics.length === 0) return
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._nameFont = `${Math.max(8, 10 * zoom)}px monospace`
    }
    ctx.save()
    for (const relic of this.relics) {
      const sx = (relic.x * 16 - camX) * zoom
      const sy = (relic.y * 16 - camY) * zoom
      const size = 8 * zoom

      if (sx < -50 || sy < -50 || sx > ctx.canvas.width + 50 || sy > ctx.canvas.height + 50) continue

      const color = RELIC_COLORS[relic.type]

      // Glow effect
      ctx.globalAlpha = 0.3
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(sx, sy, size * 2, 0, Math.PI * 2)
      ctx.fill()

      // Relic icon
      ctx.globalAlpha = relic.discoveredBy !== null ? 1.0 : 0.5
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(sx, sy, size, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#fff'
      ctx.font = this._nameFont
      ctx.textAlign = 'center'
      ctx.fillText(relic.type[0].toUpperCase(), sx, sy + 3 * zoom)

      // Effect radius ring for discovered relics
      if (relic.discoveredBy !== null) {
        ctx.globalAlpha = 0.15
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(sx, sy, EFFECT_RADIUS * 16 * zoom, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.restore()
  }
}
