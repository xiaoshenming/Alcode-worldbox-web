import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from '../utils/Constants'

export class Camera {
  x: number = 0
  y: number = 0
  zoom: number = 1
  minZoom: number = 0.25
  maxZoom: number = 4
  targetZoom: number = 1

  // Panning state
  private isDragging: boolean = false
  private lastMouseX: number = 0
  private lastMouseY: number = 0

  constructor(canvasWidth: number, canvasHeight: number) {
    // Center camera on world
    this.x = (WORLD_WIDTH * TILE_SIZE) / 2 - canvasWidth / 2
    this.y = (WORLD_HEIGHT * TILE_SIZE) / 2 - canvasHeight / 2
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    this._worldPos.x = Math.floor((screenX / this.zoom + this.x) / TILE_SIZE)
    this._worldPos.y = Math.floor((screenY / this.zoom + this.y) / TILE_SIZE)
    return this._worldPos
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    this._worldPos.x = (worldX * TILE_SIZE - this.x) * this.zoom
    this._worldPos.y = (worldY * TILE_SIZE - this.y) * this.zoom
    return this._worldPos
  }

  pan(dx: number, dy: number): void {
    this.x -= dx / this.zoom
    this.y -= dy / this.zoom

    // Clamp to world bounds
    const maxPanX = WORLD_WIDTH * TILE_SIZE
    const maxPanY = WORLD_HEIGHT * TILE_SIZE
    this.x = Math.max(-200, Math.min(maxPanX, this.x))
    this.y = Math.max(-200, Math.min(maxPanY, this.y))
  }

  zoomTo(target: number, centerX: number, centerY: number): void {
    const oldZoom = this.zoom
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, target))

    // Zoom towards cursor position
    const factor = this.zoom / oldZoom
    this.x = centerX / factor - (centerX / oldZoom - this.x)
    this.y = centerY / factor - (centerY / oldZoom - this.y)
  }

  startDrag(x: number, y: number): void {
    this.isDragging = true
    this.lastMouseX = x
    this.lastMouseY = y
  }

  drag(x: number, y: number): void {
    if (this.isDragging) {
      const dx = x - this.lastMouseX
      const dy = y - this.lastMouseY
      this.pan(dx, dy)
      this.lastMouseX = x
      this.lastMouseY = y
    }
  }

  endDrag(): void {
    this.isDragging = false
  }

  getDragging(): boolean {
    return this.isDragging
  }

  // Reusable bounds object to avoid GC in hot path
  private _bounds = { startX: 0, startY: 0, endX: 0, endY: 0 }
  // Reusable world position object for screenToWorld/worldToScreen
  private readonly _worldPos = { x: 0, y: 0 }

  getVisibleBounds(): { startX: number; startY: number; endX: number; endY: number } {
    this._bounds.startX = Math.max(0, Math.floor(this.x / TILE_SIZE))
    this._bounds.startY = Math.max(0, Math.floor(this.y / TILE_SIZE))
    this._bounds.endX = Math.min(WORLD_WIDTH, Math.ceil((this.x + window.innerWidth / this.zoom) / TILE_SIZE))
    this._bounds.endY = Math.min(WORLD_HEIGHT, Math.ceil((this.y + window.innerHeight / this.zoom) / TILE_SIZE))
    return this._bounds
  }
}
