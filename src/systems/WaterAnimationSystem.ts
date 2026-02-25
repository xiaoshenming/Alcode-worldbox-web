import { World } from '../game/World'
import { TileType, TILE_SIZE } from '../utils/Constants'

/** Foam particle at water-land boundary */
interface FoamParticle {
  x: number
  y: number
  age: number
  maxAge: number
  size: number
  dx: number
  dy: number
}

/** Cached per-tile wave offset to avoid recalculating every frame */
interface WaveCache {
  tick: number
  values: Float32Array
}

export class WaterAnimationSystem {
  // Animation time accumulator
  private time: number = 0

  // Foam particles along coastlines
  private foamParticles: FoamParticle[] = []
  private readonly MAX_FOAM = 512

  // Wave offset cache (regenerated every N ticks)
  private waveCache: WaveCache | null = null
  private readonly WAVE_CACHE_INTERVAL = 4

  // Coastline tile cache: set of "x,y" keys that are water tiles adjacent to land
  private coastTiles: Set<string> = new Set()
  private coastCacheTick: number = -1
  private readonly COAST_CACHE_INTERVAL = 120

  // Pre-computed sin table for performance
  private readonly SIN_TABLE: Float32Array
  private readonly SIN_TABLE_SIZE = 256

  constructor() {
    this.SIN_TABLE = new Float32Array(this.SIN_TABLE_SIZE)
    for (let i = 0; i < this.SIN_TABLE_SIZE; i++) {
      this.SIN_TABLE[i] = Math.sin((i / this.SIN_TABLE_SIZE) * Math.PI * 2)
    }
  }

  /** Fast sin approximation using lookup table */
  private fastSin(x: number): number {
    // Normalize x to [0, 2PI) then map to table index
    const normalized = ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    const index = (normalized / (Math.PI * 2)) * this.SIN_TABLE_SIZE
    const i = index | 0
    const frac = index - i
    const a = this.SIN_TABLE[i % this.SIN_TABLE_SIZE]
    const b = this.SIN_TABLE[(i + 1) % this.SIN_TABLE_SIZE]
    return a + (b - a) * frac
  }

  /** Update animation state each tick */
  update(tick: number, world: World): void {
    this.time = tick * 0.02

    // Rebuild coastline cache periodically
    if (tick - this.coastCacheTick >= this.COAST_CACHE_INTERVAL) {
      this.rebuildCoastCache(world)
      this.coastCacheTick = tick
    }

    // Spawn foam particles along coastlines
    this.spawnFoam(world, tick)

    // Age and remove dead foam particles
    for (let i = this.foamParticles.length - 1; i >= 0; i--) {
      const p = this.foamParticles[i]
      p.age++
      p.x += p.dx
      p.y += p.dy
      // Slow down over time
      p.dx *= 0.96
      p.dy *= 0.96
      if (p.age >= p.maxAge) {
        this.foamParticles.splice(i, 1)
      }
    }

    // Invalidate wave cache periodically
    if (this.waveCache && Math.abs(tick - this.waveCache.tick) >= this.WAVE_CACHE_INTERVAL) {
      this.waveCache = null
    }
  }

  /** Render water surface effects for visible tiles */
  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    zoom: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    world: World,
    dayNightCycle: number
  ): void {
    const sz = TILE_SIZE * zoom
    const time = this.time

    // Clamp to world bounds
    const x0 = Math.max(0, startX)
    const y0 = Math.max(0, startY)
    const x1 = Math.min(world.width - 1, endX)
    const y1 = Math.min(world.height - 1, endY)

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const tile = world.tiles[ty][tx]
        if (tile !== TileType.DEEP_WATER && tile !== TileType.SHALLOW_WATER) continue

        const screenX = (tx * TILE_SIZE - cameraX) * zoom
        const screenY = (ty * TILE_SIZE - cameraY) * zoom
        const isDeep = tile === TileType.DEEP_WATER

        // 1. Wave ripple overlay
        this.renderWave(ctx, screenX, screenY, sz, tx, ty, time, isDeep)

        // 2. Depth-based color gradient
        this.renderDepthGradient(ctx, screenX, screenY, sz, tx, ty, time, isDeep)

        // 3. Reflection / shimmer
        this.renderReflection(ctx, screenX, screenY, sz, tx, ty, time, dayNightCycle)

        // 4. Coastline foam edge
        if (this.coastTiles.has(`${tx},${ty}`)) {
          this.renderCoastFoamEdge(ctx, screenX, screenY, sz, tx, ty, time, world)
        }
      }
    }

    // 5. Foam particles
    this.renderFoamParticles(ctx, cameraX, cameraY, zoom)

    // Restore alpha
    ctx.globalAlpha = 1
  }

  // ── Wave ripple: sine-based undulation with per-tile phase offset ──

  private renderWave(
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number, sz: number,
    tx: number, ty: number,
    time: number, isDeep: boolean
  ): void {
    // Two overlapping sine waves at different frequencies create organic motion
    const freq1 = isDeep ? 0.4 : 0.6
    const freq2 = isDeep ? 0.25 : 0.35
    const phase = tx * 0.7 + ty * 0.5

    const wave1 = this.fastSin(phase + time * freq1)
    const wave2 = this.fastSin(phase * 1.3 - time * freq2 + 1.5)
    const combined = (wave1 + wave2) * 0.5 // -1..1

    // Translate wave value to a subtle brightness overlay
    const alpha = 0.04 + combined * 0.04 // 0..0.08
    if (alpha <= 0) return

    ctx.globalAlpha = alpha
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(sx, sy, sz, sz)

    // Horizontal wave line for visual texture
    const lineY = sy + sz * (0.5 + combined * 0.2)
    ctx.globalAlpha = isDeep ? 0.06 : 0.04
    ctx.fillStyle = '#a0c8ff'
    ctx.fillRect(sx, lineY, sz, Math.max(1, sz * 0.12))

    ctx.globalAlpha = 1
  }

  // ── Depth gradient: deeper water gets a darker tint that shifts over time ──

  private renderDepthGradient(
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number, sz: number,
    tx: number, ty: number,
    time: number, isDeep: boolean
  ): void {
    // Slow color pulse based on position + time
    const pulse = this.fastSin(tx * 0.3 + ty * 0.2 + time * 0.15) * 0.5 + 0.5 // 0..1

    if (isDeep) {
      // Deep water: dark blue-green tint that breathes
      ctx.globalAlpha = 0.08 + pulse * 0.06
      ctx.fillStyle = '#0a1e3c'
    } else {
      // Shallow water: lighter teal tint
      ctx.globalAlpha = 0.05 + pulse * 0.04
      ctx.fillStyle = '#1a4a6a'
    }

    ctx.fillRect(sx, sy, sz, sz)
    ctx.globalAlpha = 1
  }

  // ── Reflection: sun/moon glint on water surface ──

  private renderReflection(
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number, sz: number,
    tx: number, ty: number,
    time: number, dayNightCycle: number
  ): void {
    // Sparse highlights: only some tiles shimmer at any given moment
    const phase = this.fastSin(tx * 3.7 + ty * 2.3 + time * 0.7)
    if (phase < 0.55) return

    const intensity = (phase - 0.55) / 0.45 // 0..1

    // Brightness depends on time of day
    // dayNightCycle: 0=midnight, 0.5=noon
    // Sun angle mapped via sine: brightest at noon
    const sunAngle = Math.sin(dayNightCycle * Math.PI)
    const isDay = dayNightCycle > 0.2 && dayNightCycle < 0.8
    const baseBrightness = isDay ? 0.22 * sunAngle : 0.06

    ctx.globalAlpha = intensity * baseBrightness

    // Day: warm white-yellow glint. Night: cool blue-white glint
    ctx.fillStyle = isDay ? '#fffde0' : '#8ca8ff'

    // Small dot that drifts slightly
    const dotSize = sz * 0.18
    const ox = (this.fastSin(tx * 1.3 + time * 0.4) * 0.3 + 0.5) * sz
    const oy = (this.fastSin(ty * 1.7 + time * 0.5 + 2.0) * 0.3 + 0.5) * sz

    ctx.beginPath()
    ctx.arc(sx + ox, sy + oy, dotSize, 0, Math.PI * 2)
    ctx.fill()

    // Secondary smaller glint nearby for sparkle
    if (intensity > 0.5) {
      ctx.globalAlpha = (intensity - 0.5) * 2 * baseBrightness * 0.5
      const ox2 = (this.fastSin(tx * 2.1 + time * 0.3 + 1.0) * 0.25 + 0.5) * sz
      const oy2 = (this.fastSin(ty * 2.5 + time * 0.35 + 3.0) * 0.25 + 0.5) * sz
      ctx.beginPath()
      ctx.arc(sx + ox2, sy + oy2, dotSize * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1
  }

  // ── Coast foam edge: white fringe where water meets land ──

  private renderCoastFoamEdge(
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number, sz: number,
    tx: number, ty: number,
    time: number, world: World
  ): void {
    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]

    for (const [dx, dy] of dirs) {
      const nx = tx + dx
      const ny = ty + dy
      if (nx < 0 || nx >= world.width || ny < 0 || ny >= world.height) continue

      const neighbor = world.tiles[ny][nx]
      if (neighbor === TileType.DEEP_WATER || neighbor === TileType.SHALLOW_WATER) continue

      // This edge borders land — draw animated foam strip
      const foamWave = this.fastSin(time * 1.2 + tx * 2.1 + ty * 1.7)
      const foamAlpha = 0.25 + foamWave * 0.15
      ctx.globalAlpha = foamAlpha
      ctx.fillStyle = '#e8f4ff'

      const thick = sz * (0.15 + foamWave * 0.05)
      if (dx === -1) ctx.fillRect(sx, sy, thick, sz)
      else if (dx === 1) ctx.fillRect(sx + sz - thick, sy, thick, sz)
      else if (dy === -1) ctx.fillRect(sx, sy, sz, thick)
      else ctx.fillRect(sx, sy + sz - thick, sz, thick)
    }

    ctx.globalAlpha = 1
  }

  // ── Foam particles: small dots drifting near coastlines ──

  private renderFoamParticles(
    ctx: CanvasRenderingContext2D,
    cameraX: number, cameraY: number, zoom: number
  ): void {
    ctx.fillStyle = '#ffffff'

    for (const p of this.foamParticles) {
      const progress = p.age / p.maxAge
      const alpha = (1 - progress) * 0.4
      if (alpha <= 0.01) continue

      const screenX = (p.x - cameraX) * zoom
      const screenY = (p.y - cameraY) * zoom
      const radius = p.size * zoom * (1 - progress * 0.5)

      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1
  }

  // ── Coastline cache: find water tiles adjacent to land ──

  private rebuildCoastCache(world: World): void {
    this.coastTiles.clear()

    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.tiles[y][x]
        if (tile !== TileType.DEEP_WATER && tile !== TileType.SHALLOW_WATER) continue

        // Check 4-neighbors for land
        if (this.hasLandNeighbor(x, y, world)) {
          this.coastTiles.add(`${x},${y}`)
        }
      }
    }
  }

  private hasLandNeighbor(x: number, y: number, world: World): boolean {
    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    for (const [dx, dy] of dirs) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= world.width || ny < 0 || ny >= world.height) continue
      const n = world.tiles[ny][nx]
      if (n !== TileType.DEEP_WATER && n !== TileType.SHALLOW_WATER) return true
    }
    return false
  }

  // ── Foam particle spawning along coastlines ──

  private spawnFoam(world: World, tick: number): void {
    // Spawn a few particles each tick (throttled)
    if (tick % 3 !== 0) return
    if (this.foamParticles.length >= this.MAX_FOAM) return

    // Pick random coast tiles to spawn from
    const coastArray = Array.from(this.coastTiles)
    if (coastArray.length === 0) return

    const spawnCount = Math.min(4, this.MAX_FOAM - this.foamParticles.length)
    for (let i = 0; i < spawnCount; i++) {
      const key = coastArray[(Math.random() * coastArray.length) | 0]
      const [cx, cy] = key.split(',').map(Number)

      // Spawn at pixel position with slight random offset
      const px = cx * TILE_SIZE + Math.random() * TILE_SIZE
      const py = cy * TILE_SIZE + Math.random() * TILE_SIZE

      // Drift direction: away from nearest land
      let driftX = 0
      let driftY = 0
      const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      for (const [dx, dy] of dirs) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || nx >= world.width || ny < 0 || ny >= world.height) continue
        const n = world.tiles[ny][nx]
        if (n !== TileType.DEEP_WATER && n !== TileType.SHALLOW_WATER) {
          driftX -= dx * 0.15
          driftY -= dy * 0.15
        }
      }

      this.foamParticles.push({
        x: px,
        y: py,
        age: 0,
        maxAge: 30 + (Math.random() * 30) | 0,
        size: 0.5 + Math.random() * 1.0,
        dx: driftX + (Math.random() - 0.5) * 0.1,
        dy: driftY + (Math.random() - 0.5) * 0.1
      })
    }
  }
}
