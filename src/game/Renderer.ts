import { TileType, TILE_SIZE } from '../utils/Constants'
import { World } from './World'
import { Camera } from './Camera'
import { EntityManager, PositionComponent, RenderComponent } from '../ecs/Entity'

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

  render(world: World, camera: Camera, em?: EntityManager): void {
    const ctx = this.ctx
    const bounds = camera.getVisibleBounds()

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.waterOffset += 0.02

    const tileSize = TILE_SIZE * camera.zoom
    const offsetX = -camera.x * camera.zoom
    const offsetY = -camera.y * camera.zoom

    // Draw tiles
    for (let y = bounds.startY; y < bounds.endY; y++) {
      for (let x = bounds.startX; x < bounds.endX; x++) {
        const tile = world.getTile(x, y)
        if (tile === null) continue

        const screenX = x * TILE_SIZE * camera.zoom + offsetX
        const screenY = y * TILE_SIZE * camera.zoom + offsetY

        let color = world.getColor(x, y)

        // Water animation
        if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER) {
          const wave = Math.sin(this.waterOffset + x * 0.5 + y * 0.3) * 10
          const r = parseInt(color.slice(1, 3), 16)
          const g = parseInt(color.slice(3, 5), 16)
          const b = parseInt(color.slice(5, 7), 16)
          color = `rgb(${Math.min(255, r + wave)}, ${Math.min(255, g + wave)}, ${Math.min(255, b + wave)})`
        }

        // Lava glow animation
        if (tile === TileType.LAVA) {
          const glow = Math.sin(this.waterOffset * 2 + x * 0.8 + y * 0.6) * 20
          const r = Math.min(255, 255 + glow)
          const g = Math.min(255, 68 + glow * 2)
          color = `rgb(${r}, ${g}, 0)`
        }

        ctx.fillStyle = color
        ctx.fillRect(screenX, screenY, tileSize + 0.5, tileSize + 0.5)
      }
    }

    // Draw entities
    if (em) {
      const entities = em.getEntitiesWithComponents('position', 'render')
      for (const id of entities) {
        const pos = em.getComponent<PositionComponent>(id, 'position')!
        const render = em.getComponent<RenderComponent>(id, 'render')!

        // Check if visible
        if (pos.x < bounds.startX - 1 || pos.x > bounds.endX + 1 ||
            pos.y < bounds.startY - 1 || pos.y > bounds.endY + 1) continue

        const screenX = pos.x * TILE_SIZE * camera.zoom + offsetX
        const screenY = pos.y * TILE_SIZE * camera.zoom + offsetY
        const size = render.size * camera.zoom

        // Draw creature body
        ctx.fillStyle = render.color
        ctx.beginPath()
        ctx.arc(screenX + tileSize / 2, screenY + tileSize / 2, size, 0, Math.PI * 2)
        ctx.fill()

        // Draw outline
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }
  }

  renderMinimap(world: World, camera: Camera): void {
    const ctx = this.minimapCtx
    const scale = this.minimapCanvas.width / world.width

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height)

    for (let y = 0; y < world.height; y += 2) {
      for (let x = 0; x < world.width; x += 2) {
        ctx.fillStyle = world.getColor(x, y)
        ctx.fillRect(x * scale, y * scale, scale * 2, scale * 2)
      }
    }

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
