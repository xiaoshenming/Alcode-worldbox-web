import { TileType, TILE_SIZE } from '../utils/Constants'
import { World } from './World'
import { Camera } from './Camera'

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private minimapCanvas: HTMLCanvasElement
  private minimapCtx: CanvasRenderingContext2D
  private waterOffset: number = 0

  constructor(canvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.minimapCanvas = minimapCanvas
    this.minimapCtx = minimapCanvas.getContext('2d')!
  }

  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  render(world: World, camera: Camera): void {
    const ctx = this.ctx
    const bounds = camera.getVisibleBounds()

    // Clear
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Water animation offset
    this.waterOffset += 0.02

    // Draw tiles
    const tileSize = TILE_SIZE * camera.zoom
    const offsetX = -camera.x * camera.zoom
    const offsetY = -camera.y * camera.zoom

    for (let y = bounds.startY; y < bounds.endY; y++) {
      for (let x = bounds.startX; x < bounds.endX; x++) {
        const tile = world.getTile(x, y)
        if (tile === null) continue

        const screenX = x * TILE_SIZE * camera.zoom + offsetX
        const screenY = y * TILE_SIZE * camera.zoom + offsetY

        // Get base color
        let color = world.getColor(x, y)

        // Water animation effect
        if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER) {
          const wave = Math.sin(this.waterOffset + x * 0.5 + y * 0.3) * 10
          const r = parseInt(color.slice(1, 3), 16)
          const g = parseInt(color.slice(3, 5), 16)
          const b = parseInt(color.slice(5, 7), 16)
          color = `rgb(${Math.min(255, r + wave)}, ${Math.min(255, g + wave)}, ${Math.min(255, b + wave)})`
        }

        ctx.fillStyle = color
        ctx.fillRect(screenX, screenY, tileSize + 0.5, tileSize + 0.5)
      }
    }
  }

  renderMinimap(world: World, camera: Camera): void {
    const ctx = this.minimapCtx
    const scale = this.minimapCanvas.width / world.width

    // Clear
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height)

    // Draw tiles (skip every other for performance)
    for (let y = 0; y < world.height; y += 2) {
      for (let x = 0; x < world.width; x += 2) {
        ctx.fillStyle = world.getColor(x, y)
        ctx.fillRect(x * scale, y * scale, scale * 2, scale * 2)
      }
    }

    // Draw viewport rectangle
    const bounds = camera.getVisibleBounds()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.strokeRect(
      bounds.startX * scale,
      bounds.startY * scale,
      (bounds.endX - bounds.startX) * scale,
      (bounds.endY - bounds.startY) * scale
    )
  }
}
