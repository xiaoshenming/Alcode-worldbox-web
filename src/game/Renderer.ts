import { TileType, TILE_SIZE } from '../utils/Constants'
import { World } from './World'
import { Camera } from './Camera'
import { EntityManager, PositionComponent, RenderComponent, VelocityComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { BuildingComponent, BUILDING_COLORS } from '../civilization/Civilization'
import { ParticleSystem } from '../systems/ParticleSystem'

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private minimapCanvas: HTMLCanvasElement
  private minimapCtx: CanvasRenderingContext2D
  private waterOffset: number = 0
  showTerritory: boolean = true

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

  render(world: World, camera: Camera, em?: EntityManager, civManager?: CivManager, particles?: ParticleSystem): void {
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

        // Lava glow
        if (tile === TileType.LAVA) {
          const glow = Math.sin(this.waterOffset * 2 + x * 0.8 + y * 0.6) * 20
          const r = Math.min(255, 255 + glow)
          const g = Math.min(255, 68 + glow * 2)
          color = `rgb(${r}, ${g}, 0)`
        }

        ctx.fillStyle = color
        ctx.fillRect(screenX, screenY, tileSize + 0.5, tileSize + 0.5)

        // Territory overlay
        if (this.showTerritory && civManager) {
          const civColor = civManager.getCivColor(x, y)
          if (civColor) {
            ctx.fillStyle = civColor + '30' // 30 = ~19% opacity
            ctx.fillRect(screenX, screenY, tileSize + 0.5, tileSize + 0.5)
          }
        }
      }
    }

    // Draw entities (buildings + creatures)
    if (em) {
      const entities = em.getEntitiesWithComponents('position', 'render')
      for (const id of entities) {
        const pos = em.getComponent<PositionComponent>(id, 'position')!
        const render = em.getComponent<RenderComponent>(id, 'render')!

        if (pos.x < bounds.startX - 1 || pos.x > bounds.endX + 1 ||
            pos.y < bounds.startY - 1 || pos.y > bounds.endY + 1) continue

        const screenX = pos.x * TILE_SIZE * camera.zoom + offsetX
        const screenY = pos.y * TILE_SIZE * camera.zoom + offsetY
        const size = render.size * camera.zoom

        const building = em.getComponent<BuildingComponent>(id, 'building')

        if (building) {
          // Draw building as rectangle
          const bColor = BUILDING_COLORS[building.buildingType] || render.color
          const bSize = size * 2
          ctx.fillStyle = bColor
          ctx.fillRect(screenX - bSize / 2 + tileSize / 2, screenY - bSize / 2 + tileSize / 2, bSize, bSize)
          ctx.strokeStyle = render.color // civ color border
          ctx.lineWidth = 1.5
          ctx.strokeRect(screenX - bSize / 2 + tileSize / 2, screenY - bSize / 2 + tileSize / 2, bSize, bSize)
        } else {
          // Draw creature as circle with direction indicator
          const cx = screenX + tileSize / 2
          const cy = screenY + tileSize / 2
          ctx.fillStyle = render.color
          ctx.beginPath()
          ctx.arc(cx, cy, size, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'
          ctx.lineWidth = 0.5
          ctx.stroke()

          // Direction triangle based on velocity
          const vel = em.getComponent<VelocityComponent>(id, 'velocity')
          if (vel && (vel.vx !== 0 || vel.vy !== 0)) {
            const angle = Math.atan2(vel.vy, vel.vx)
            const triSize = size * 0.8
            ctx.fillStyle = 'rgba(255,255,255,0.7)'
            ctx.beginPath()
            ctx.moveTo(cx + Math.cos(angle) * (size + triSize * 0.5), cy + Math.sin(angle) * (size + triSize * 0.5))
            ctx.lineTo(cx + Math.cos(angle + 2.4) * triSize, cy + Math.sin(angle + 2.4) * triSize)
            ctx.lineTo(cx + Math.cos(angle - 2.4) * triSize, cy + Math.sin(angle - 2.4) * triSize)
            ctx.closePath()
            ctx.fill()
          }
        }
      }
    }

    // Draw particles
    if (particles) {
      const tileSize = TILE_SIZE * camera.zoom
      const offsetX = -camera.x * camera.zoom
      const offsetY = -camera.y * camera.zoom

      for (const p of particles.particles) {
        const screenX = p.x * tileSize + offsetX + tileSize / 2
        const screenY = p.y * tileSize + offsetY + tileSize / 2
        const alpha = p.life / p.maxLife

        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(screenX, screenY, p.size * camera.zoom, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    // Day/night overlay
    const brightness = world.getDayBrightness()
    if (brightness < 1.0) {
      const darkness = 1.0 - brightness
      ctx.fillStyle = `rgba(0, 0, 30, ${darkness})`
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  renderBrushOutline(camera: Camera, mouseX: number, mouseY: number, brushSize: number): void {
    const ctx = this.ctx
    const world = camera.screenToWorld(mouseX, mouseY)
    const tileSize = TILE_SIZE * camera.zoom
    const offsetX = -camera.x * camera.zoom
    const offsetY = -camera.y * camera.zoom

    const centerX = world.x * tileSize + offsetX + tileSize / 2
    const centerY = world.y * tileSize + offsetY + tileSize / 2
    const radius = (brushSize / 2) * tileSize

    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
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
