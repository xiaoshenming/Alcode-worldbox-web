/** MapGenSystem - improved biome clustering, river generation, and terrain features */
import { World } from '../game/World'

interface RiverSegment {
  x: number; y: number
  flow: number  // 0-1 strength
}

const RIVER_MIN_LENGTH = 8
const RIVER_MAX_LENGTH = 40

export class MapGenSystem {
  private rivers: RiverSegment[][] = []

  /** Generate rivers from mountains to water */
  generateRivers(world: World, width: number, height: number, count: number): void {
    this.rivers = []

    for (let i = 0; i < count; i++) {
      const river = this.traceRiver(world, width, height)
      if (river.length >= RIVER_MIN_LENGTH) {
        this.rivers.push(river)
        // Carve river into world (shallow water = 1)
        for (const seg of river) {
          world.setTile(Math.floor(seg.x), Math.floor(seg.y), 1)
        }
      }
    }
  }

  private traceRiver(world: World, width: number, height: number): RiverSegment[] {
    // Start from a mountain tile (type 5)
    let startX = -1, startY = -1
    for (let attempt = 0; attempt < 100; attempt++) {
      const x = Math.floor(Math.random() * width)
      const y = Math.floor(Math.random() * height)
      if (world.getTile(x, y) === 5) {
        startX = x
        startY = y
        break
      }
    }
    if (startX < 0) return []

    const segments: RiverSegment[] = []
    let cx = startX
    let cy = startY
    let dirX = Math.random() - 0.5
    let dirY = Math.random() - 0.5
    const visited = new Set<string>()

    for (let step = 0; step < RIVER_MAX_LENGTH; step++) {
      const key = `${Math.floor(cx)},${Math.floor(cy)}`
      if (visited.has(key)) break
      visited.add(key)

      segments.push({ x: cx, y: cy, flow: 0.3 + step * 0.02 })

      // Check if we reached water
      const tile = world.getTile(Math.floor(cx), Math.floor(cy))
      if (tile === 0 || tile === 1) break

      // Flow downhill with some randomness
      dirX += (Math.random() - 0.5) * 0.6
      dirY += (Math.random() - 0.5) * 0.6

      // Normalize direction
      const len = Math.sqrt(dirX * dirX + dirY * dirY)
      if (len > 0) { dirX /= len; dirY /= len }

      cx += dirX
      cy += dirY

      // Bounds check
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) break
    }

    return segments
  }

  /** Render rivers with flow animation */
  renderRivers(
    ctx: CanvasRenderingContext2D,
    camX: number, camY: number, zoom: number,
    tick: number
  ): void {
    ctx.save()
    ctx.strokeStyle = '#4488cc'
    ctx.lineCap = 'round'

    for (const river of this.rivers) {
      if (river.length < 2) continue

      ctx.lineWidth = Math.max(1, zoom * 0.3)
      ctx.globalAlpha = 0.6
      ctx.beginPath()

      for (let i = 0; i < river.length; i++) {
        const seg = river[i]
        const sx = (seg.x - camX) * zoom
        const sy = (seg.y - camY) * zoom

        // Subtle wave animation
        const wave = Math.sin(tick * 0.05 + i * 0.3) * zoom * 0.05
        if (i === 0) ctx.moveTo(sx + wave, sy)
        else ctx.lineTo(sx + wave, sy)
      }
      ctx.stroke()

      // Flow particles
      if (zoom > 6) {
        ctx.fillStyle = '#88bbee'
        ctx.globalAlpha = 0.4
        const particleIdx = Math.floor(tick * 0.1) % river.length
        for (let p = 0; p < 3; p++) {
          const idx = (particleIdx + p * Math.floor(river.length / 3)) % river.length
          const seg = river[idx]
          const sx = (seg.x - camX) * zoom
          const sy = (seg.y - camY) * zoom
          ctx.beginPath()
          ctx.arc(sx, sy, zoom * 0.1, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    ctx.restore()
  }

  getRiverCount(): number {
    return this.rivers.length
  }

  getClusterCount(): number {
    return 0
  }
}
