import { TileType, TILE_SIZE } from '../utils/Constants'
import { World } from './World'
import { Camera } from './Camera'
import { EntityManager, PositionComponent, RenderComponent, VelocityComponent, NeedsComponent, AIComponent, CreatureComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { BuildingComponent, BUILDING_COLORS } from '../civilization/Civilization'
import { ParticleSystem } from '../systems/ParticleSystem'
import { ResourceSystem } from '../systems/ResourceSystem'
import { SpriteRenderer } from './SpriteRenderer'

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private minimapCanvas: HTMLCanvasElement
  private minimapCtx: CanvasRenderingContext2D
  private waterOffset: number = 0
  showTerritory: boolean = true
  private sprites: SpriteRenderer

  // Offscreen terrain cache
  private terrainCanvas: OffscreenCanvas
  private terrainCtx: OffscreenCanvasRenderingContext2D
  private terrainDirty: boolean = true
  private lastCameraX: number = -1
  private lastCameraY: number = -1
  private lastCameraZoom: number = -1

  constructor(canvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.minimapCanvas = minimapCanvas
    this.minimapCtx = minimapCanvas.getContext('2d')!

    this.terrainCanvas = new OffscreenCanvas(canvas.width || 1920, canvas.height || 1080)
    this.terrainCtx = this.terrainCanvas.getContext('2d')!
    this.sprites = new SpriteRenderer()
  }

  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.terrainCanvas = new OffscreenCanvas(width, height)
    this.terrainCtx = this.terrainCanvas.getContext('2d')!
    this.terrainDirty = true
  }

  render(world: World, camera: Camera, em?: EntityManager, civManager?: CivManager, particles?: ParticleSystem, fogAlpha?: number, resources?: ResourceSystem): void {
    const ctx = this.ctx
    const bounds = camera.getVisibleBounds()

    this.waterOffset += 0.02

    const tileSize = TILE_SIZE * camera.zoom
    const offsetX = -camera.x * camera.zoom
    const offsetY = -camera.y * camera.zoom

    // Check if camera moved or world changed
    const cameraChanged = camera.x !== this.lastCameraX || camera.y !== this.lastCameraY || camera.zoom !== this.lastCameraZoom
    if (cameraChanged || world.isDirty()) {
      this.terrainDirty = true
      this.lastCameraX = camera.x
      this.lastCameraY = camera.y
      this.lastCameraZoom = camera.zoom
    }

    // Redraw terrain cache if dirty
    if (this.terrainDirty) {
      this.renderTerrainToCache(world, camera, bounds, tileSize, offsetX, offsetY, civManager)
      world.clearDirty()
      this.terrainDirty = false
    }

    // Blit terrain cache to main canvas
    ctx.drawImage(this.terrainCanvas, 0, 0)

    // Water shimmer overlay (lightweight)
    this.renderWaterShimmer(world, bounds, tileSize, offsetX, offsetY)

    // Draw resource nodes
    if (resources) {
      this.renderResources(resources, camera, bounds, tileSize, offsetX, offsetY)
    }

    // Draw entities
    if (em) {
      this.renderEntities(em, camera, bounds, tileSize, offsetX, offsetY)
    }

    // Trade routes
    if (civManager) {
      this.renderTradeRoutes(civManager, camera)
    }

    // Draw particles
    if (particles) {
      this.renderParticles(particles, camera)
    }

    // Day/night overlay
    const brightness = world.getDayBrightness()
    if (brightness < 1.0) {
      const darkness = 1.0 - brightness
      ctx.fillStyle = `rgba(0, 0, 30, ${darkness})`
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    // Fog overlay
    if (fogAlpha && fogAlpha > 0) {
      ctx.fillStyle = `rgba(180, 190, 200, ${fogAlpha})`
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  // Terrain edge transition priority (higher = draws over lower)
  private static readonly TERRAIN_PRIORITY: Record<number, number> = {
    [TileType.DEEP_WATER]: 0,
    [TileType.SHALLOW_WATER]: 1,
    [TileType.SAND]: 2,
    [TileType.GRASS]: 3,
    [TileType.FOREST]: 4,
    [TileType.MOUNTAIN]: 5,
    [TileType.SNOW]: 6,
    [TileType.LAVA]: 7,
  }

  private renderTerrainToCache(
    world: World, camera: Camera, bounds: any,
    tileSize: number, offsetX: number, offsetY: number,
    civManager?: CivManager
  ): void {
    const ctx = this.terrainCtx
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, this.terrainCanvas.width, this.terrainCanvas.height)

    const tileSizeCeil = tileSize + 0.5
    const edgeSize = Math.max(1, tileSize * 0.3)

    // Pass 1: base tiles
    for (let y = bounds.startY; y < bounds.endY; y++) {
      for (let x = bounds.startX; x < bounds.endX; x++) {
        const tile = world.getTile(x, y)
        if (tile === null) continue

        const screenX = x * TILE_SIZE * camera.zoom + offsetX
        const screenY = y * TILE_SIZE * camera.zoom + offsetY

        if (tile === TileType.LAVA) {
          const glow = Math.sin(this.waterOffset * 2 + x * 0.8 + y * 0.6) * 20
          const r = Math.min(255, 255 + glow)
          const g = Math.min(255, 68 + glow * 2)
          ctx.fillStyle = `rgb(${r}, ${g}, 0)`
        } else {
          ctx.fillStyle = world.getColor(x, y)
        }

        ctx.fillRect(screenX, screenY, tileSizeCeil, tileSizeCeil)
      }
    }

    // Pass 2: edge transitions (blend neighboring tile colors at borders)
    if (tileSize >= 3) {
      ctx.globalAlpha = 0.35
      for (let y = bounds.startY; y < bounds.endY; y++) {
        for (let x = bounds.startX; x < bounds.endX; x++) {
          const tile = world.getTile(x, y)
          if (tile === null) continue
          const myPri = Renderer.TERRAIN_PRIORITY[tile] ?? 0

          const screenX = x * TILE_SIZE * camera.zoom + offsetX
          const screenY = y * TILE_SIZE * camera.zoom + offsetY

          // Check 4 neighbors: top, bottom, left, right
          const neighbors: [number, number, number, number, number, number][] = [
            // neighborTile check: dx, dy, drawX, drawY, drawW, drawH
          ]
          const top = world.getTile(x, y - 1)
          const bottom = world.getTile(x, y + 1)
          const left = world.getTile(x - 1, y)
          const right = world.getTile(x + 1, y)

          if (top !== null && top !== tile && (Renderer.TERRAIN_PRIORITY[top] ?? 0) > myPri) {
            ctx.fillStyle = world.getColor(x, y - 1)
            ctx.fillRect(screenX, screenY, tileSizeCeil, edgeSize)
          }
          if (bottom !== null && bottom !== tile && (Renderer.TERRAIN_PRIORITY[bottom] ?? 0) > myPri) {
            ctx.fillStyle = world.getColor(x, y + 1)
            ctx.fillRect(screenX, screenY + tileSizeCeil - edgeSize, tileSizeCeil, edgeSize)
          }
          if (left !== null && left !== tile && (Renderer.TERRAIN_PRIORITY[left] ?? 0) > myPri) {
            ctx.fillStyle = world.getColor(x - 1, y)
            ctx.fillRect(screenX, screenY, edgeSize, tileSizeCeil)
          }
          if (right !== null && right !== tile && (Renderer.TERRAIN_PRIORITY[right] ?? 0) > myPri) {
            ctx.fillStyle = world.getColor(x + 1, y)
            ctx.fillRect(screenX + tileSizeCeil - edgeSize, screenY, edgeSize, tileSizeCeil)
          }
        }
      }
      ctx.globalAlpha = 1
    }

    // Pass 3: territory overlay
    if (this.showTerritory && civManager) {
      for (let y = bounds.startY; y < bounds.endY; y++) {
        for (let x = bounds.startX; x < bounds.endX; x++) {
          const civColor = civManager.getCivColor(x, y)
          if (civColor) {
            const screenX = x * TILE_SIZE * camera.zoom + offsetX
            const screenY = y * TILE_SIZE * camera.zoom + offsetY
            ctx.fillStyle = civColor + '30'
            ctx.fillRect(screenX, screenY, tileSizeCeil, tileSizeCeil)
          }
        }
      }
    }
  }

  private renderWaterShimmer(
    world: World, bounds: any,
    tileSize: number, offsetX: number, offsetY: number
  ): void {
    const ctx = this.ctx
    const shimmerPhase = Math.floor(this.waterOffset * 5) % 3
    if (shimmerPhase !== 0) return

    ctx.globalAlpha = 0.08
    for (let y = bounds.startY; y < bounds.endY; y += 2) {
      for (let x = bounds.startX; x < bounds.endX; x += 2) {
        const tile = world.getTile(x, y)
        if (tile !== TileType.DEEP_WATER && tile !== TileType.SHALLOW_WATER) continue

        const wave = Math.sin(this.waterOffset + x * 0.5 + y * 0.3)
        if (wave < 0.3) continue

        const screenX = x * tileSize + offsetX
        const screenY = y * tileSize + offsetY
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(screenX, screenY, tileSize * 2 + 0.5, tileSize * 2 + 0.5)
      }
    }
    ctx.globalAlpha = 1
  }

  private renderEntities(
    em: EntityManager, camera: Camera, bounds: any,
    tileSize: number, offsetX: number, offsetY: number
  ): void {
    const ctx = this.ctx
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
        const sprite = this.sprites.getBuildingSprite(building.buildingType, building.level)
        const bSize = tileSize * 1.5
        ctx.drawImage(sprite, screenX + tileSize/2 - bSize/2, screenY + tileSize/2 - bSize/2, bSize, bSize)
      } else {
        const cx = screenX + tileSize / 2
        const cy = screenY + tileSize / 2

        const needs = em.getComponent<NeedsComponent>(id, 'needs')
        const ai = em.getComponent<AIComponent>(id, 'ai')
        const vel = em.getComponent<VelocityComponent>(id, 'velocity')

        // Determine facing direction from velocity
        let direction: 'up' | 'down' | 'left' | 'right' = 'down'
        if (vel) {
          direction = SpriteRenderer.directionFromVelocity(vel.vx, vel.vy)
        }

        // Creature sprite
        const creature = em.getComponent<CreatureComponent>(id, 'creature')
        if (creature) {
          const sprite = this.sprites.getCreatureSprite(creature.species, direction)
          const spriteSize = tileSize * 1.2
          ctx.drawImage(sprite, cx - spriteSize/2, cy - spriteSize/2, spriteSize, spriteSize)
        } else {
          // Fallback: draw circle for unknown entities
          ctx.fillStyle = render.color
          ctx.beginPath()
          ctx.arc(cx, cy, size, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'
          ctx.lineWidth = 0.5
          ctx.stroke()
        }

        // Hero aura
        const heroComp = em.getComponent<any>(id, 'hero')
        if (heroComp && camera.zoom > 0.3) {
          const auraColors: Record<string, string> = {
            warrior: '#ffd700',
            ranger: '#44ff44',
            healer: '#ffffff',
            berserker: '#ff4444'
          }
          const auraColor = auraColors[heroComp.ability] || '#ffd700'
          const pulse = Math.sin(performance.now() * 0.004 + id) * 0.3 + 0.5
          const spriteSize = tileSize * 1.2
          const auraRadius = spriteSize * 0.8 + pulse * 3 * camera.zoom

          // Outer glow
          ctx.strokeStyle = auraColor
          ctx.globalAlpha = pulse * 0.6
          ctx.lineWidth = 1.5 * camera.zoom
          ctx.beginPath()
          ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2)
          ctx.stroke()

          // Level stars
          ctx.globalAlpha = 0.9
          ctx.fillStyle = '#ffd700'
          ctx.font = `${Math.max(6, 8 * camera.zoom)}px monospace`
          ctx.textAlign = 'center'
          const stars = '★'.repeat(Math.min(heroComp.level, 5))
          ctx.fillText(stars, cx, cy + spriteSize * 0.7 + 4 * camera.zoom)
          ctx.globalAlpha = 1
        }

        // Health bar (only when damaged)
        if (needs && needs.health < 100 && camera.zoom > 0.5) {
          const barWidth = size * 3
          const barHeight = 2 * camera.zoom
          const barX = cx - barWidth / 2
          const barY = cy - size - 4 * camera.zoom

          ctx.fillStyle = 'rgba(0,0,0,0.6)'
          ctx.fillRect(barX, barY, barWidth, barHeight)
          const healthPct = needs.health / 100
          ctx.fillStyle = healthPct > 0.5 ? '#4f4' : healthPct > 0.25 ? '#ff4' : '#f44'
          ctx.fillRect(barX, barY, barWidth * healthPct, barHeight)
        }

        // State icon when zoomed in
        if (ai && camera.zoom > 0.8) {
          let icon = ''
          switch (ai.state) {
            case 'hungry': icon = '!'; break
            case 'fleeing': icon = '~'; break
            case 'attacking': icon = 'x'; break
          }
          if (icon) {
            ctx.fillStyle = ai.state === 'attacking' ? '#f44' : ai.state === 'fleeing' ? '#4af' : '#ff4'
            ctx.font = `${Math.max(8, 10 * camera.zoom)}px monospace`
            ctx.textAlign = 'center'
            ctx.fillText(icon, cx, cy - size - 6 * camera.zoom)
          }
        }
      }
    }
  }

  private renderResources(
    resources: ResourceSystem, camera: Camera, bounds: any,
    tileSize: number, offsetX: number, offsetY: number
  ): void {
    const ctx = this.ctx
    const fontSize = Math.max(6, Math.floor(tileSize * 1.2))
    ctx.font = `${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const node of resources.nodes) {
      if (node.x < bounds.startX - 1 || node.x > bounds.endX + 1 ||
          node.y < bounds.startY - 1 || node.y > bounds.endY + 1) continue

      const screenX = node.x * tileSize + offsetX + tileSize / 2
      const screenY = node.y * tileSize + offsetY + tileSize / 2
      const alpha = 0.5 + (node.amount / node.maxAmount) * 0.5

      ctx.globalAlpha = alpha
      ctx.fillStyle = resources.getColor(node.type)
      ctx.fillText(resources.getSymbol(node.type), screenX, screenY)
    }
    ctx.globalAlpha = 1
  }

  private renderParticles(particles: ParticleSystem, camera: Camera): void {
    const ctx = this.ctx
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

  private renderTradeRoutes(civManager: CivManager, camera: Camera): void {
    const ctx = this.ctx
    const routes = civManager.getAllTradeRoutes()
    const tileSize = TILE_SIZE * camera.zoom
    const offsetX = -camera.x * camera.zoom
    const offsetY = -camera.y * camera.zoom
    const time = performance.now() * 0.001

    for (const route of routes) {
      const x1 = route.from.x * tileSize + offsetX + tileSize / 2
      const y1 = route.from.y * tileSize + offsetY + tileSize / 2
      const x2 = route.to.x * tileSize + offsetX + tileSize / 2
      const y2 = route.to.y * tileSize + offsetY + tileSize / 2

      // Dashed line
      ctx.strokeStyle = route.color
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 1.5 * camera.zoom
      ctx.setLineDash([4 * camera.zoom, 4 * camera.zoom])
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.setLineDash([])

      // Animated dot moving along the route (trade caravan)
      const t = (time * 0.3) % 1
      const dotX = x1 + (x2 - x1) * t
      const dotY = y1 + (y2 - y1) * t
      ctx.globalAlpha = 0.8
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.arc(dotX, dotY, 2 * camera.zoom, 0, Math.PI * 2)
      ctx.fill()

      // Return trip dot
      const t2 = (time * 0.3 + 0.5) % 1
      const dot2X = x1 + (x2 - x1) * t2
      const dot2Y = y1 + (y2 - y1) * t2
      ctx.fillStyle = '#ffaa00'
      ctx.beginPath()
      ctx.arc(dot2X, dot2Y, 2 * camera.zoom, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = 1
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
