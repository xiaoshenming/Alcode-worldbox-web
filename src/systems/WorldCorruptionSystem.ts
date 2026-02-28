/**
 * WorldCorruptionSystem - Evil forces corrupt terrain from sources (battlefields, mass death).
 * Purple/dark overlay, damages creatures, purifiable by religion/god powers.
 * Spread rate modulated by weather and season.
 */
import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

interface WorldData { tiles: number[][]; width: number; height: number; tick: number }
interface CorruptionSource { x: number; y: number; strength: number; tick: number }

type WeatherType = 'clear' | 'rain' | 'snow' | 'storm' | 'fog' | 'tornado' | 'drought' | 'heatwave'
type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter'

const SPREAD_INTERVAL = 30
// Pre-allocated neighbor offsets — avoids creating 40000 sub-arrays per spread tick
const NB_DX = [-1, 1, 0, 0] as const
const NB_DY = [0, 0, -1, 1] as const
const DAMAGE_INTERVAL = 60
const BASE_SPREAD_RATE = 0.008
const DECAY_RATE = 0.001
const SOURCE_EMIT_RATE = 0.04
const SOURCE_RADIUS = 3
const PURIFY_RADIUS = 5
const PURIFY_RATE = 0.03
const DAMAGE_PER_TICK = 2
const CORRUPTION_THRESHOLD = 0.15
const MAX_SOURCES = 200

const WEATHER_MULT: Record<WeatherType, number> = {
  clear: 1.0, rain: 0.5, snow: 0.6, storm: 1.5,
  fog: 1.2, tornado: 1.3, drought: 1.4, heatwave: 1.3,
}
const SEASON_MULT: Record<SeasonType, number> = {
  spring: 0.8, summer: 1.2, autumn: 1.0, winter: 0.6,
}

const LOW_R = 80, LOW_G = 20, LOW_B = 120, LOW_A = 0.12
const HIGH_R = 50, HIGH_G = 0, HIGH_B = 80, HIGH_A = 0.55

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }
function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v }

// Pre-computed corruption overlay colors (t quantized to 100 steps)
const CORRUPTION_COLORS: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) {
    const t = i / 100
    const r = Math.round(lerp(LOW_R, HIGH_R, t))
    const g = Math.round(lerp(LOW_G, HIGH_G, t))
    const b = Math.round(lerp(LOW_B, HIGH_B, t))
    const a = lerp(LOW_A, HIGH_A, t)
    cols.push(`rgba(${r},${g},${b},${a.toFixed(2)})`)
  }
  return cols
})()

export class WorldCorruptionSystem {
  private corruptionMap: Float32Array
  private _snapBuf: Float32Array  // pre-allocated snapshot buffer for diffusion step
  private sources: CorruptionSource[] = []
  private purifiers: Array<{ x: number; y: number }> = []
  private weather: WeatherType = 'clear'
  private season: SeasonType = 'spring'

  constructor() {
    this.corruptionMap = new Float32Array(WORLD_WIDTH * WORLD_HEIGHT)
    this._snapBuf = new Float32Array(WORLD_WIDTH * WORLD_HEIGHT)
  }

  /** Register a new corruption source (battlefield, mass death, etc.) */
  addCorruptionSource(x: number, y: number, strength: number): void {
    if (this.sources.length >= MAX_SOURCES) return
    this.sources.push({ x: Math.floor(x), y: Math.floor(y), strength: clamp01(strength), tick: 0 })
  }

  /** Register a purifier location (temple, holy site) */
  addPurifier(x: number, y: number): void {
    this.purifiers.push({ x: Math.floor(x), y: Math.floor(y) })
  }

  /** Remove a purifier (building destroyed) */
  removePurifier(x: number, y: number): void {
    const fx = Math.floor(x), fy = Math.floor(y)
    const idx = this.purifiers.findIndex(p => p.x === fx && p.y === fy)
    if (idx !== -1) {
      this.purifiers[idx] = this.purifiers[this.purifiers.length - 1]
      this.purifiers.pop()
    }
  }

  /** Update weather/season modifiers from external systems */
  setModifiers(weather: WeatherType, season: SeasonType): void {
    this.weather = weather
    this.season = season
  }

  /** Get corruption level at a tile (0-1) */
  getCorruption(x: number, y: number): number {
    if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) return 0
    return this.corruptionMap[y * WORLD_WIDTH + x]
  }

  /** Directly purify a circular area (god power) */
  purifyArea(cx: number, cy: number, radius: number): void {
    const r2 = radius * radius
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue
        const tx = cx + dx, ty = cy + dy
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
        this.corruptionMap[ty * WORLD_WIDTH + tx] = 0
      }
    }
    for (let i = this.sources.length - 1; i >= 0; i--) {
      const s = this.sources[i]
      if ((s.x - cx) ** 2 + (s.y - cy) ** 2 <= r2) {
        this.sources[i] = this.sources[this.sources.length - 1]
        this.sources.pop()
      }
    }
  }

  /** Count of tiles with corruption above threshold */
  getCorruptedTileCount(): number {
    let count = 0
    for (let i = 0; i < this.corruptionMap.length; i++) {
      if (this.corruptionMap[i] >= CORRUPTION_THRESHOLD) count++
    }
    return count
  }

  update(dt: number, world: WorldData, em: EntityManager, tick: number): void {
    if (tick % SPREAD_INTERVAL === 0) {
      this.spreadCorruption(world)
      this.applyPurifiers()
      this.decaySources()
    }
    if (tick % DAMAGE_INTERVAL === 0) {
      this.damageCreatures(em)
    }
  }

  private spreadCorruption(world: WorldData): void {
    const mult = WEATHER_MULT[this.weather] * SEASON_MULT[this.season]
    const spreadRate = BASE_SPREAD_RATE * mult
    const w = WORLD_WIDTH, h = WORLD_HEIGHT

    // Phase 1: Sources emit corruption in radius
    for (const src of this.sources) {
      for (let dy = -SOURCE_RADIUS; dy <= SOURCE_RADIUS; dy++) {
        for (let dx = -SOURCE_RADIUS; dx <= SOURCE_RADIUS; dx++) {
          const tx = src.x + dx, ty = src.y + dy
          if (tx < 0 || tx >= w || ty < 0 || ty >= h) continue
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > SOURCE_RADIUS) continue
          const falloff = 1 - dist / (SOURCE_RADIUS + 1)
          const idx = ty * w + tx
          this.corruptionMap[idx] = clamp01(
            this.corruptionMap[idx] + SOURCE_EMIT_RATE * src.strength * falloff * mult
          )
        }
      }
    }

    // Phase 2: Neighbor-based diffusion (snapshot to avoid read-write hazard)
    const snap = this._snapBuf
    snap.set(this.corruptionMap)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x
        const cur = snap[idx]
        if (cur < CORRUPTION_THRESHOLD) continue
        const tile = world.tiles[y]?.[x] ?? 0
        if (tile <= 1) continue // water blocks spread
        // Spread to 4-connected neighbors
        for (let n = 0; n < 4; n++) {
          const nx = x + NB_DX[n], ny = y + NB_DY[n]
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          if ((world.tiles[ny]?.[nx] ?? 0) <= 1) continue
          const nIdx = ny * w + nx
          if (this.corruptionMap[nIdx] < cur) {
            this.corruptionMap[nIdx] = clamp01(
              this.corruptionMap[nIdx] + (cur - this.corruptionMap[nIdx]) * spreadRate
            )
          }
        }
        // Natural decay
        this.corruptionMap[idx] = clamp01(cur - DECAY_RATE)
      }
    }
  }

  private applyPurifiers(): void {
    const r2 = PURIFY_RADIUS * PURIFY_RADIUS
    for (const p of this.purifiers) {
      for (let dy = -PURIFY_RADIUS; dy <= PURIFY_RADIUS; dy++) {
        for (let dx = -PURIFY_RADIUS; dx <= PURIFY_RADIUS; dx++) {
          if (dx * dx + dy * dy > r2) continue
          const tx = p.x + dx, ty = p.y + dy
          if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
          const idx = ty * WORLD_WIDTH + tx
          this.corruptionMap[idx] = Math.max(0, this.corruptionMap[idx] - PURIFY_RATE)
        }
      }
    }
  }

  private decaySources(): void {
    for (let i = this.sources.length - 1; i >= 0; i--) {
      this.sources[i].strength -= 0.001
      if (this.sources[i].strength <= 0.01) {
        this.sources[i] = this.sources[this.sources.length - 1]
        this.sources.pop()
      }
    }
  }

  private damageCreatures(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position', 'needs')
    for (const id of entities) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      const needs = em.getComponent<NeedsComponent>(id, 'needs')
      if (!pos || !needs) continue
      const corruption = this.getCorruption(Math.floor(pos.x), Math.floor(pos.y))
      if (corruption >= CORRUPTION_THRESHOLD) {
        needs.health = Math.max(0, needs.health - DAMAGE_PER_TICK * corruption)
      }
    }
  }

  /** Render corruption overlay on the canvas */
  renderOverlay(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number, tileSize: number): void {
    ctx.save()
    const tileScreen = tileSize * zoom
    const startX = Math.max(0, Math.floor(camX / tileSize))
    const startY = Math.max(0, Math.floor(camY / tileSize))
    const endX = Math.min(WORLD_WIDTH, Math.ceil((camX + ctx.canvas.width / zoom) / tileSize) + 1)
    const endY = Math.min(WORLD_HEIGHT, Math.ceil((camY + ctx.canvas.height / zoom) / tileSize) + 1)

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const corruption = this.corruptionMap[y * WORLD_WIDTH + x]
        if (corruption < CORRUPTION_THRESHOLD) continue
        const t = clamp01((corruption - CORRUPTION_THRESHOLD) / (1 - CORRUPTION_THRESHOLD))
        const sx = (x * tileSize - camX) * zoom
        const sy = (y * tileSize - camY) * zoom
        ctx.fillStyle = CORRUPTION_COLORS[Math.round(t * 100)]
        ctx.fillRect(sx, sy, tileScreen, tileScreen)
      }
    }
    ctx.restore()
  }
}
