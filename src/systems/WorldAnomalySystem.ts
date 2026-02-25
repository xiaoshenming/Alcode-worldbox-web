// World Anomaly System (v2.17) - Strange anomalies appear across the world
// Anomalies warp terrain, mutate creatures, and create unpredictable effects

import { EntityManager, EntityId, PositionComponent, CreatureComponent, NeedsComponent } from '../ecs/Entity'
import { EventLog } from './EventLog'

export type AnomalyType = 'rift' | 'vortex' | 'mirage' | 'crystal_storm' | 'void_zone'

export interface WorldAnomaly {
  id: number
  type: AnomalyType
  x: number
  y: number
  radius: number
  intensity: number       // 0.1 - 1.0
  duration: number        // ticks remaining
  createdTick: number
  affectedCount: number
}

interface WorldLike {
  tick: number
  width: number
  height: number
  getTile(x: number, y: number): number | null
  setTile(x: number, y: number, tile: number): void
}

const SPAWN_INTERVAL = 4000
const EFFECT_INTERVAL = 300
const MAX_ANOMALIES = 6
const MIN_DURATION = 2000
const MAX_DURATION = 8000

const ANOMALY_TYPES: AnomalyType[] = ['rift', 'vortex', 'mirage', 'crystal_storm', 'void_zone']

const ANOMALY_COLORS: Record<AnomalyType, string> = {
  rift: '#f0f',
  vortex: '#0ff',
  mirage: '#ff8',
  crystal_storm: '#8ff',
  void_zone: '#808',
}

const ANOMALY_LABELS: Record<AnomalyType, string> = {
  rift: 'Dimensional Rift',
  vortex: 'Arcane Vortex',
  mirage: 'Reality Mirage',
  crystal_storm: 'Crystal Storm',
  void_zone: 'Void Zone',
}

let nextAnomalyId = 1

export class WorldAnomalySystem {
  private anomalies: WorldAnomaly[] = []
  private nextSpawnTick = SPAWN_INTERVAL
  private nextEffectTick = EFFECT_INTERVAL

  getAnomalies(): WorldAnomaly[] { return this.anomalies }
  getActiveCount(): number { return this.anomalies.length }

  update(dt: number, em: EntityManager, world: WorldLike): void {
    const tick = world.tick

    // Decay and remove expired anomalies
    for (let i = this.anomalies.length - 1; i >= 0; i--) {
      this.anomalies[i].duration -= dt
      if (this.anomalies[i].duration <= 0) {
        EventLog.log('world_event', `${ANOMALY_LABELS[this.anomalies[i].type]} has dissipated`, tick)
        this.anomalies.splice(i, 1)
      }
    }

    // Spawn new anomalies
    if (tick >= this.nextSpawnTick && this.anomalies.length < MAX_ANOMALIES) {
      this.nextSpawnTick = tick + SPAWN_INTERVAL
      this.spawnAnomaly(world, tick)
    }

    // Apply effects
    if (tick >= this.nextEffectTick) {
      this.nextEffectTick = tick + EFFECT_INTERVAL
      this.applyEffects(em, world)
    }
  }

  private spawnAnomaly(world: WorldLike, tick: number): void {
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = 5 + Math.floor(Math.random() * (world.width - 10))
      const y = 5 + Math.floor(Math.random() * (world.height - 10))
      const tile = world.getTile(x, y)
      if (tile === null) continue

      const tooClose = this.anomalies.some(a => {
        const dx = a.x - x, dy = a.y - y
        return dx * dx + dy * dy < 900
      })
      if (tooClose) continue

      const type = ANOMALY_TYPES[Math.floor(Math.random() * ANOMALY_TYPES.length)]
      const anomaly: WorldAnomaly = {
        id: nextAnomalyId++,
        type,
        x, y,
        radius: 6 + Math.floor(Math.random() * 10),
        intensity: 0.3 + Math.random() * 0.7,
        duration: MIN_DURATION + Math.floor(Math.random() * (MAX_DURATION - MIN_DURATION)),
        createdTick: tick,
        affectedCount: 0,
      }
      this.anomalies.push(anomaly)
      EventLog.log('world_event', `A ${ANOMALY_LABELS[type]} appeared at (${x},${y})!`, tick)
      return
    }
  }

  private applyEffects(em: EntityManager, world: WorldLike): void {
    if (this.anomalies.length === 0) return
    const entities = em.getEntitiesWithComponents('position', 'creature', 'needs')

    for (const anomaly of this.anomalies) {
      const r2 = anomaly.radius * anomaly.radius
      let affected = 0

      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        const needs = em.getComponent<NeedsComponent>(eid, 'needs')
        const cc = em.getComponent<CreatureComponent>(eid, 'creature')
        if (!pos || !needs || !cc) continue

        const dx = pos.x - anomaly.x, dy = pos.y - anomaly.y
        if (dx * dx + dy * dy > r2) continue

        affected++
        switch (anomaly.type) {
          case 'rift':
            // Teleport creatures randomly within radius
            if (Math.random() < 0.05 * anomaly.intensity) {
              pos.x = anomaly.x + (Math.random() - 0.5) * anomaly.radius * 2
              pos.y = anomaly.y + (Math.random() - 0.5) * anomaly.radius * 2
              pos.x = Math.max(0, Math.min(world.width - 1, pos.x))
              pos.y = Math.max(0, Math.min(world.height - 1, pos.y))
            }
            break
          case 'vortex':
            // Pull creatures toward center
            pos.x += (anomaly.x - pos.x) * 0.02 * anomaly.intensity
            pos.y += (anomaly.y - pos.y) * 0.02 * anomaly.intensity
            break
          case 'crystal_storm':
            // Damage creatures
            needs.health -= Math.floor(anomaly.intensity * 2)
            break
          case 'void_zone':
            // Drain hunger rapidly
            needs.hunger = Math.min(100, needs.hunger + Math.floor(anomaly.intensity * 3))
            break
          default:
            break
        }
      }
      anomaly.affectedCount = affected

      // Terrain warping for rift type
      if (anomaly.type === 'rift' && Math.random() < 0.02) {
        const tx = anomaly.x + Math.floor((Math.random() - 0.5) * anomaly.radius)
        const ty = anomaly.y + Math.floor((Math.random() - 0.5) * anomaly.radius)
        const current = world.getTile(tx, ty)
        if (current !== null && current >= 2 && current <= 6) {
          const newTile = 2 + Math.floor(Math.random() * 5)
          world.setTile(tx, ty, newTile)
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (this.anomalies.length === 0) return
    ctx.save()

    const time = Date.now() * 0.002

    for (const anomaly of this.anomalies) {
      const sx = (anomaly.x * 16 - camX) * zoom
      const sy = (anomaly.y * 16 - camY) * zoom
      const sr = anomaly.radius * 16 * zoom
      if (sx < -sr || sy < -sr || sx > ctx.canvas.width + sr || sy > ctx.canvas.height + sr) continue

      const color = ANOMALY_COLORS[anomaly.type]
      const pulse = 0.4 + 0.3 * Math.sin(time + anomaly.id * 2)

      // Outer distortion ring
      ctx.globalAlpha = 0.1 * pulse
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(sx, sy, sr, 0, Math.PI * 2)
      ctx.fill()

      // Inner core
      ctx.globalAlpha = 0.4 * pulse
      ctx.beginPath()
      ctx.arc(sx, sy, sr * 0.3, 0, Math.PI * 2)
      ctx.fill()

      // Rotating particles
      ctx.globalAlpha = 0.6
      ctx.fillStyle = color
      for (let i = 0; i < 4; i++) {
        const angle = time * (1 + anomaly.id * 0.3) + (i * Math.PI / 2)
        const dist = sr * 0.5
        const px = sx + Math.cos(angle) * dist
        const py = sy + Math.sin(angle) * dist
        ctx.beginPath()
        ctx.arc(px, py, 2 * zoom, 0, Math.PI * 2)
        ctx.fill()
      }

      // Label
      ctx.globalAlpha = 0.7
      ctx.fillStyle = '#fff'
      ctx.font = `${Math.max(7, 8 * zoom)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(ANOMALY_LABELS[anomaly.type], sx, sy - sr - 4 * zoom)
    }
    ctx.restore()
  }
}
