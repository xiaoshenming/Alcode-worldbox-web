import { TileType, TILE_SIZE } from '../utils/Constants'
import { World } from './World'
import { Camera } from './Camera'
import { EntityManager, PositionComponent, RenderComponent, VelocityComponent, NeedsComponent, AIComponent, CreatureComponent, ArtifactComponent, InventoryComponent, DiseaseComponent, HeroComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { BuildingComponent, BuildingType } from '../civilization/Civilization'
import { ParticleSystem } from '../systems/ParticleSystem'
import { ResourceSystem } from '../systems/ResourceSystem'
import { CaravanSystem } from '../systems/CaravanSystem'
import { SpriteRenderer } from './SpriteRenderer'
import { CropSystem, CropStage } from '../systems/CropSystem'

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private minimapCanvas: HTMLCanvasElement
  private minimapCtx: CanvasRenderingContext2D
  private static readonly _EMPTY_DASH: number[] = []
  private waterOffset: number = 0
  showTerritory: boolean = true
  minimapMode: 'normal' | 'territory' | 'heatmap' = 'normal'
  private sprites: SpriteRenderer

  // Offscreen terrain cache
  private terrainCanvas: OffscreenCanvas
  private terrainCtx: OffscreenCanvasRenderingContext2D
  private terrainDirty: boolean = true
  private lastCameraX: number = -1
  private lastCameraY: number = -1
  private lastCameraZoom: number = -1

  // Minimap terrain cache
  private minimapTerrainCanvas: OffscreenCanvas | null = null
  private minimapTerrainCtx: OffscreenCanvasRenderingContext2D | null = null
  private minimapTerrainDirty: boolean = true

  // Reusable batch arrays to reduce GC in renderEntities
  private _buildingBatch: number[] = []
  private _creatureBatch: number[] = []
  private _artifactBatch: number[] = []
  private _fallbackByColor: Map<string, { id: number; cx: number; cy: number; size: number }[]> = new Map()
  private _fallbackBucketPool: { id: number; cx: number; cy: number; size: number }[][] = []

  // Static constants for renderWarBorders
  private static readonly WAR_NEIGHBORS: readonly number[][] = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  private _warPairs: Set<number> = new Set()

  // Static hero aura colors
  private static readonly AURA_COLORS: Record<string, string> = {
    warrior: '#ffd700', ranger: '#44ff44', healer: '#ffffff', berserker: '#ff4444'
  }

  // Territory color cache: civColor → civColor + '30'
  private _territoryColorCache: Map<string, string> = new Map()
  private _particleByColor: Map<string, { sx: number; sy: number; r: number; alpha: number }[]> = new Map()
  private _particleBucketPool: { sx: number; sy: number; r: number; alpha: number }[][] = []

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
    this.minimapTerrainDirty = true
  }

  render(world: World, camera: Camera, em?: EntityManager, civManager?: CivManager, particles?: ParticleSystem, fogAlpha?: number, resources?: ResourceSystem, caravanSystem?: CaravanSystem, cropSystem?: CropSystem): void {
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
      if (world.isDirty()) this.minimapTerrainDirty = true
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

    // Draw crop fields
    if (cropSystem) {
      this.renderCrops(cropSystem, camera, bounds, tileSize, offsetX, offsetY)
    }

    // Draw entities
    if (em) {
      this.renderEntities(em, camera, bounds, tileSize, offsetX, offsetY)
    }

    // War border overlay
    if (civManager && camera.zoom > 0.3) {
      this.renderWarBorders(civManager, camera, bounds, tileSize, offsetX, offsetY)
    }

    // Trade routes and caravans
    if (civManager) {
      this.renderTradeRoutes(civManager, camera, caravanSystem)
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
      const terColorCache = this._territoryColorCache
      for (let y = bounds.startY; y < bounds.endY; y++) {
        for (let x = bounds.startX; x < bounds.endX; x++) {
          const civColor = civManager.getCivColor(x, y)
          if (civColor) {
            const screenX = x * TILE_SIZE * camera.zoom + offsetX
            const screenY = y * TILE_SIZE * camera.zoom + offsetY
            let cached = terColorCache.get(civColor)
            if (!cached) { cached = civColor + '30'; terColorCache.set(civColor, cached) }
            ctx.fillStyle = cached
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

    // --- Batch pass: group simple fallback entities by color to reduce fillStyle switches ---
    const buildingBatch = this._buildingBatch; buildingBatch.length = 0
    const creatureBatch = this._creatureBatch; creatureBatch.length = 0
    const artifactBatch = this._artifactBatch; artifactBatch.length = 0
    // Return fallback buckets to pool and clear map
    for (const bucket of this._fallbackByColor.values()) {
      bucket.length = 0
      this._fallbackBucketPool.push(bucket)
    }
    this._fallbackByColor.clear()
    const fallbackByColor = this._fallbackByColor

    for (const id of entities) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      const render = em.getComponent<RenderComponent>(id, 'render')
      if (!pos || !render) continue

      // Viewport culling
      if (pos.x < bounds.startX - 1 || pos.x > bounds.endX + 1 ||
          pos.y < bounds.startY - 1 || pos.y > bounds.endY + 1) continue

      const building = em.getComponent<BuildingComponent>(id, 'building')
      if (building) {
        buildingBatch.push(id)
      } else if (em.getComponent<CreatureComponent>(id, 'creature')) {
        creatureBatch.push(id)
      } else {
        const artifact = em.getComponent<ArtifactComponent>(id, 'artifact')
        if (artifact && !artifact.claimed) {
          artifactBatch.push(id)
        } else {
          // Fallback circles — batch by color
          const screenX = pos.x * TILE_SIZE * camera.zoom + offsetX
          const screenY = pos.y * TILE_SIZE * camera.zoom + offsetY
          const cx = screenX + tileSize / 2
          const cy = screenY + tileSize / 2
          const size = render.size * camera.zoom
          let bucket = fallbackByColor.get(render.color)
          if (!bucket) { bucket = this._fallbackBucketPool.pop() || []; fallbackByColor.set(render.color, bucket) }
          bucket.push({ id, cx, cy, size })
        }
      }
    }

    const now = performance.now()

    // Draw buildings
    for (const id of buildingBatch) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      const building = em.getComponent<BuildingComponent>(id, 'building')
      if (!pos || !building) continue
      const screenX = pos.x * TILE_SIZE * camera.zoom + offsetX
      const screenY = pos.y * TILE_SIZE * camera.zoom + offsetY
      const sprite = this.sprites.getBuildingSprite(building.buildingType, building.level)
      const bSize = tileSize * 1.5
      ctx.drawImage(sprite, screenX + tileSize/2 - bSize/2, screenY + tileSize/2 - bSize/2, bSize, bSize)

      // Damaged building: health bar + red tint (merged from renderBattleEffects)
      if (building.health < building.maxHealth) {
        const barWidth = bSize * 0.8
        const barHeight = Math.max(2, 3 * camera.zoom)
        const barX = screenX + tileSize / 2 - barWidth / 2
        const barY = screenY + tileSize / 2 + bSize / 2 + 2 * camera.zoom

        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.fillRect(barX, barY, barWidth, barHeight)
        const hpPct = Math.max(0, building.health / building.maxHealth)
        ctx.fillStyle = hpPct > 0.5 ? '#ff8800' : '#ff2200'
        ctx.fillRect(barX, barY, barWidth * hpPct, barHeight)

        // Red tint overlay on heavily damaged building
        if (hpPct < 0.5) {
          const flash = Math.sin(now * 0.006 + id) * 0.1 + 0.15
          ctx.fillStyle = `rgba(255, 0, 0, ${flash})`
          ctx.fillRect(screenX + tileSize / 2 - bSize / 2, screenY + tileSize / 2 - bSize / 2, bSize, bSize)
        }
      }
    }

    // Draw creatures (sprites + overlays)
    const heroFont = `${Math.max(6, 8 * camera.zoom)}px monospace`
    const artFont = `${Math.max(6, 7 * camera.zoom)}px monospace`
    const stateFont = `${Math.max(8, 10 * camera.zoom)}px monospace`
    for (const id of creatureBatch) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      const render = em.getComponent<RenderComponent>(id, 'render')
      if (!pos || !render) continue
      const screenX = pos.x * TILE_SIZE * camera.zoom + offsetX
      const screenY = pos.y * TILE_SIZE * camera.zoom + offsetY
      const size = render.size * camera.zoom
      const cx = screenX + tileSize / 2
      const cy = screenY + tileSize / 2

      const vel = em.getComponent<VelocityComponent>(id, 'velocity')
      let direction: 'up' | 'down' | 'left' | 'right' = 'down'
      if (vel) direction = SpriteRenderer.directionFromVelocity(vel.vx, vel.vy)

      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!creature) continue
      const sprite = this.sprites.getCreatureSprite(creature.species, direction)
      const spriteSize = tileSize * 1.2
      ctx.drawImage(sprite, cx - spriteSize/2, cy - spriteSize/2, spriteSize, spriteSize)

      // Hero aura (skip getComponent when zoomed out)
      const heroComp = camera.zoom > 0.3 ? em.getComponent<HeroComponent>(id, 'hero') : null
      if (heroComp) {
        const auraColor = Renderer.AURA_COLORS[heroComp.ability] || '#ffd700'
        const pulse = Math.sin(now * 0.004 + id) * 0.3 + 0.5
        const auraRadius = spriteSize * 0.8 + pulse * 3 * camera.zoom

        ctx.strokeStyle = auraColor
        ctx.globalAlpha = pulse * 0.6
        ctx.lineWidth = 1.5 * camera.zoom
        ctx.beginPath()
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2)
        ctx.stroke()

        ctx.globalAlpha = 0.9
        ctx.fillStyle = '#ffd700'
        ctx.font = heroFont
        ctx.textAlign = 'center'
        const stars = '\u2605'.repeat(Math.min(heroComp.level, 5))
        ctx.fillText(stars, cx, cy + spriteSize * 0.7 + 4 * camera.zoom)
        ctx.globalAlpha = 1

        const heroInv = em.getComponent<InventoryComponent>(id, 'inventory')
        if (heroInv && heroInv.artifacts.length > 0 && camera.zoom > 0.4) {
          const artPulse = Math.sin(now * 0.003 + id) * 0.2 + 0.8
          ctx.globalAlpha = artPulse
          ctx.fillStyle = '#ffd700'
          ctx.font = artFont
          ctx.textAlign = 'center'
          const artSymbols = '\u25C6'.repeat(heroInv.artifacts.length)
          ctx.fillText(artSymbols, cx, cy - spriteSize * 0.7 - 6 * camera.zoom)
          ctx.globalAlpha = 1
        }
      }

      // Health bar (only when damaged, skip getComponent when zoomed out)
      const needs = camera.zoom > 0.5 ? em.getComponent<NeedsComponent>(id, 'needs') : null
      if (needs && needs.health < 100) {
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

      // Disease indicator (skip getComponent when zoomed out)
      const diseaseComp = camera.zoom > 0.3 ? em.getComponent<DiseaseComponent>(id, 'disease') : null
      if (diseaseComp && !diseaseComp.immune) {
        const pulse = Math.sin(now * 0.006 + id * 2) * 0.3 + 0.7
        const dotRadius = Math.max(1.5, 2.5 * camera.zoom) * pulse
        const dotY = cy - size - 8 * camera.zoom
        ctx.globalAlpha = pulse * 0.9
        ctx.fillStyle = diseaseComp.diseaseType === 'plague' ? '#4a0'
          : diseaseComp.diseaseType === 'fever' ? '#f44'
          : diseaseComp.diseaseType === 'blight' ? '#8a4'
          : '#ddd'
        ctx.beginPath()
        ctx.arc(cx, dotY, dotRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // State icon when zoomed in (skip getComponent when zoomed out)
      const ai = camera.zoom > 0.3 ? em.getComponent<AIComponent>(id, 'ai') : null
      if (ai && camera.zoom > 0.8) {
        let icon = ''
        switch (ai.state) {
          case 'hungry': icon = '!'; break
          case 'fleeing': icon = '~'; break
          case 'attacking': icon = 'x'; break
        }
        if (icon) {
          ctx.fillStyle = ai.state === 'attacking' ? '#f44' : ai.state === 'fleeing' ? '#4af' : '#ff4'
          ctx.font = stateFont
          ctx.textAlign = 'center'
          ctx.fillText(icon, cx, cy - size - 6 * camera.zoom)
        }
      }

      // Attacking creature: red crossed swords spark (merged from renderBattleEffects)
      if (ai && ai.state === 'attacking' && camera.zoom > 0.3 && camera.zoom <= 0.8) {
        const sparkSize = Math.max(3, 5 * camera.zoom)
        const pulse = Math.sin(now * 0.01 + id * 3) * 0.4 + 0.6

        ctx.globalAlpha = pulse
        ctx.strokeStyle = '#ff3300'
        ctx.lineWidth = Math.max(1, 1.5 * camera.zoom)

        const s = sparkSize
        const sparkY = cy - tileSize * 0.5 - 2 * camera.zoom
        ctx.beginPath()
        ctx.moveTo(cx - s, sparkY - s)
        ctx.lineTo(cx + s, sparkY + s)
        ctx.moveTo(cx + s, sparkY - s)
        ctx.lineTo(cx - s, sparkY + s)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    // Draw artifacts
    for (const id of artifactBatch) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      const artifact = em.getComponent<ArtifactComponent>(id, 'artifact')
      if (!pos || !artifact) continue
      const screenX = pos.x * TILE_SIZE * camera.zoom + offsetX
      const screenY = pos.y * TILE_SIZE * camera.zoom + offsetY
      const cx = screenX + tileSize / 2
      const cy = screenY + tileSize / 2

      const pulse = Math.sin(now * 0.005 + id * 2) * 0.3 + 0.7
      const diamondSize = Math.max(3, tileSize * 0.6) * pulse
      const glowSize = diamondSize * 1.8

      ctx.globalAlpha = pulse * 0.3
      ctx.fillStyle = artifact.rarity === 'mythic' ? '#ffdd44' : '#ffaa00'
      ctx.beginPath()
      ctx.moveTo(cx, cy - glowSize)
      ctx.lineTo(cx + glowSize * 0.6, cy)
      ctx.lineTo(cx, cy + glowSize)
      ctx.lineTo(cx - glowSize * 0.6, cy)
      ctx.closePath()
      ctx.fill()

      ctx.globalAlpha = pulse * 0.9
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.moveTo(cx, cy - diamondSize)
      ctx.lineTo(cx + diamondSize * 0.6, cy)
      ctx.lineTo(cx, cy + diamondSize)
      ctx.lineTo(cx - diamondSize * 0.6, cy)
      ctx.closePath()
      ctx.fill()

      ctx.globalAlpha = pulse
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(cx, cy, diamondSize * 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      if (camera.zoom > 0.6) {
        ctx.globalAlpha = 0.85
        ctx.fillStyle = '#ffd700'
        ctx.font = `${Math.max(6, 7 * camera.zoom)}px monospace`
        ctx.textAlign = 'center'
        ctx.fillText(artifact.name, cx, cy + diamondSize + 6 * camera.zoom)
        ctx.globalAlpha = 1
      }
    }

    // Draw fallback entities batched by color (minimizes fillStyle switches)
    for (const [color, bucket] of fallbackByColor) {
      ctx.fillStyle = color
      ctx.beginPath()
      for (const { cx, cy, size } of bucket) {
        ctx.moveTo(cx + size, cy)
        ctx.arc(cx, cy, size, 0, Math.PI * 2)
      }
      ctx.fill()
      // Single stroke pass per color group
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (const { cx, cy, size } of bucket) {
        ctx.moveTo(cx + size, cy)
        ctx.arc(cx, cy, size, 0, Math.PI * 2)
      }
      ctx.stroke()
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

  private static readonly CROP_COLORS: Record<CropStage, string> = {
    planted: '#5a7a3a',
    growing: '#6aaa3a',
    mature: '#daa520',
    harvested: '#8b7355',
    dead: '#4a3a2a',
  }

  private renderCrops(
    cropSystem: CropSystem, camera: Camera, bounds: any,
    tileSize: number, offsetX: number, offsetY: number
  ): void {
    const ctx = this.ctx
    const fields = cropSystem.getCropFields()
    if (fields.length === 0) return

    const cropSize = Math.max(2, tileSize * 0.5)
    const cropOffset = (tileSize - cropSize) / 2

    for (const field of fields) {
      if (field.x < bounds.startX - 1 || field.x > bounds.endX + 1 ||
          field.y < bounds.startY - 1 || field.y > bounds.endY + 1) continue

      const screenX = field.x * tileSize + offsetX + cropOffset
      const screenY = field.y * tileSize + offsetY + cropOffset

      // Base crop color by stage
      ctx.fillStyle = Renderer.CROP_COLORS[field.stage]
      ctx.globalAlpha = 0.85
      ctx.fillRect(screenX, screenY, cropSize, cropSize)

      // Growth progress indicator: small inner bar for growing crops
      if (field.stage === 'growing' && tileSize >= 4) {
        const barW = cropSize * (field.growth / 100)
        ctx.fillStyle = '#aadd44'
        ctx.globalAlpha = 0.6
        ctx.fillRect(screenX, screenY + cropSize - 1, barW, 1)
      }

      // Mature shimmer
      if (field.stage === 'mature') {
        const shimmer = Math.sin(performance.now() * 0.004 + field.x * 3 + field.y * 5) * 0.2 + 0.3
        ctx.fillStyle = '#ffee88'
        ctx.globalAlpha = shimmer
        ctx.fillRect(screenX, screenY, cropSize, cropSize)
      }
    }
    ctx.globalAlpha = 1
  }

  private renderParticles(particles: ParticleSystem, camera: Camera): void {
    const ctx = this.ctx
    const tileSize = TILE_SIZE * camera.zoom
    const offsetX = -camera.x * camera.zoom
    const offsetY = -camera.y * camera.zoom
    const canvasW = this.canvas.width
    const canvasH = this.canvas.height

    // Reuse class-level Map and bucket pool to avoid GC allocations
    for (const bucket of this._particleByColor.values()) {
      bucket.length = 0
      this._particleBucketPool.push(bucket)
    }
    this._particleByColor.clear()
    const byColor = this._particleByColor

    for (const p of particles.particles) {
      const screenX = p.x * tileSize + offsetX + tileSize / 2
      const screenY = p.y * tileSize + offsetY + tileSize / 2

      // Viewport culling — skip particles outside screen
      if (screenX < -10 || screenX > canvasW + 10 || screenY < -10 || screenY > canvasH + 10) continue

      const alpha = p.life / p.maxLife
      let bucket = byColor.get(p.color)
      if (!bucket) { bucket = this._particleBucketPool.pop() || []; byColor.set(p.color, bucket) }
      bucket.push({ sx: screenX, sy: screenY, r: p.size * camera.zoom, alpha })
    }

    for (const [color, bucket] of byColor) {
      ctx.fillStyle = color
      for (const { sx, sy, r, alpha } of bucket) {
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  private renderTradeRoutes(civManager: CivManager, camera: Camera, caravanSystem?: CaravanSystem): void {
    if (!this.showTerritory) return

    const ctx = this.ctx
    const tileSize = TILE_SIZE * camera.zoom
    const offsetX = -camera.x * camera.zoom
    const offsetY = -camera.y * camera.zoom
    const time = performance.now() * 0.001

    // Draw trade route dashed lines
    const routes = civManager.getAllTradeRoutes()
    for (const route of routes) {
      const x1 = route.from.x * tileSize + offsetX + tileSize / 2
      const y1 = route.from.y * tileSize + offsetY + tileSize / 2
      const x2 = route.to.x * tileSize + offsetX + tileSize / 2
      const y2 = route.to.y * tileSize + offsetY + tileSize / 2

      // Animated dashed line
      const dashOffset = time * 8 * camera.zoom
      ctx.strokeStyle = route.color
      ctx.globalAlpha = 0.3
      ctx.lineWidth = 1.5 * camera.zoom
      ctx.setLineDash([4 * camera.zoom, 4 * camera.zoom])
      ctx.lineDashOffset = -dashOffset
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.setLineDash(Renderer._EMPTY_DASH)
      ctx.lineDashOffset = 0

      // Port markers (small diamonds at endpoints)
      ctx.globalAlpha = 0.6
      ctx.fillStyle = route.color
      const markerSize = 2.5 * camera.zoom
      for (const [px, py] of [[x1, y1], [x2, y2]]) {
        ctx.beginPath()
        ctx.moveTo(px, py - markerSize)
        ctx.lineTo(px + markerSize, py)
        ctx.lineTo(px, py + markerSize)
        ctx.lineTo(px - markerSize, py)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Draw caravans from CaravanSystem
    if (caravanSystem) {
      const caravans = caravanSystem.getCaravans()
      for (const c of caravans) {
        const screenX = c.x * tileSize + offsetX + tileSize / 2
        const screenY = c.y * tileSize + offsetY + tileSize / 2

        // Trail particles (3 fading dots behind the caravan)
        const dx = c.returning
          ? c.fromPort.x - c.toPort.x
          : c.toPort.x - c.fromPort.x
        const dy = c.returning
          ? c.fromPort.y - c.toPort.y
          : c.toPort.y - c.fromPort.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const nx = dx / dist
        const ny = dy / dist

        for (let t = 1; t <= 3; t++) {
          const trailX = screenX - nx * t * 2.5 * camera.zoom
          const trailY = screenY - ny * t * 2.5 * camera.zoom
          ctx.globalAlpha = 0.4 - t * 0.1
          ctx.fillStyle = c.color
          ctx.beginPath()
          ctx.arc(trailX, trailY, (1.5 - t * 0.3) * camera.zoom, 0, Math.PI * 2)
          ctx.fill()
        }

        // Caravan body (3x3 pixel square)
        const size = 1.5 * camera.zoom
        ctx.globalAlpha = 0.9
        ctx.fillStyle = c.returning ? '#ffaa00' : '#ffd700'
        ctx.fillRect(screenX - size, screenY - size, size * 2, size * 2)

        // Dark outline
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(screenX - size, screenY - size, size * 2, size * 2)
      }
    }

    ctx.globalAlpha = 1
  }

  private renderWarBorders(
    civManager: CivManager, camera: Camera, bounds: any,
    tileSize: number, offsetX: number, offsetY: number
  ): void {
    const ctx = this.ctx
    const tileSizeCeil = tileSize + 0.5

    // Build set of warring civ pairs
    const warPairs = this._warPairs
    warPairs.clear()
    for (const [idA, civA] of civManager.civilizations) {
      for (const [idB] of civManager.civilizations) {
        if (idA >= idB) continue
        const relation = civA.relations.get(idB) ?? 0
        if (relation <= -50) {
          warPairs.add(idA * 100000 + idB)
        }
      }
    }
    if (warPairs.size === 0) return

    ctx.globalAlpha = 0.15
    ctx.fillStyle = '#ff0000'

    for (let y = bounds.startY; y < bounds.endY; y++) {
      for (let x = bounds.startX; x < bounds.endX; x++) {
        const civId = civManager.territoryMap[y]?.[x]
        if (!civId) continue

        let isBorderWar = false
        for (const [dx, dy] of Renderer.WAR_NEIGHBORS) {
          const nx = x + dx, ny = y + dy
          const neighborCivId = civManager.territoryMap[ny]?.[nx]
          if (neighborCivId && neighborCivId !== civId) {
            const lo = Math.min(civId, neighborCivId)
            const hi = Math.max(civId, neighborCivId)
            if (warPairs.has(lo * 100000 + hi)) {
              isBorderWar = true
              break
            }
          }
        }

        if (isBorderWar) {
          const screenX = x * TILE_SIZE * camera.zoom + offsetX
          const screenY = y * TILE_SIZE * camera.zoom + offsetY
          ctx.fillRect(screenX, screenY, tileSizeCeil, tileSizeCeil)
        }
      }
    }
    ctx.globalAlpha = 1
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
    ctx.setLineDash(Renderer._EMPTY_DASH)
  }

  renderMinimap(world: World, camera: Camera, em?: EntityManager, civManager?: CivManager): void {
    const ctx = this.minimapCtx
    const mw = this.minimapCanvas.width
    const mh = this.minimapCanvas.height
    const scale = mw / world.width

    // Initialize minimap terrain cache if needed
    if (!this.minimapTerrainCanvas || this.minimapTerrainCanvas.width !== mw) {
      this.minimapTerrainCanvas = new OffscreenCanvas(mw, mh)
      this.minimapTerrainCtx = this.minimapTerrainCanvas.getContext('2d')!
      this.minimapTerrainDirty = true
    }

    // Rebuild terrain cache only when dirty
    if (this.minimapTerrainDirty) {
      const tctx = this.minimapTerrainCtx!
      tctx.fillStyle = '#000'
      tctx.fillRect(0, 0, mw, mh)
      for (let y = 0; y < world.height; y += 2) {
        for (let x = 0; x < world.width; x += 2) {
          tctx.fillStyle = world.getColor(x, y)
          tctx.fillRect(x * scale, y * scale, scale * 2, scale * 2)
        }
      }
      this.minimapTerrainDirty = false
    }

    // Draw cached terrain
    ctx.drawImage(this.minimapTerrainCanvas!, 0, 0)

    // Territory overlay (sample every 3rd tile for performance)
    if (civManager) {
      const territoryAlpha = this.minimapMode === 'territory' ? 0.5 : 0.3
      ctx.globalAlpha = territoryAlpha
      for (let y = 0; y < world.height; y += 3) {
        for (let x = 0; x < world.width; x += 3) {
          const civId = civManager.territoryMap[y]?.[x]
          if (civId) {
            const civ = civManager.civilizations.get(civId)
            if (civ) {
              ctx.fillStyle = civ.color
              ctx.fillRect(x * scale, y * scale, scale * 3, scale * 3)
            }
          }
        }
      }
      ctx.globalAlpha = 1
    }

    // Heatmap overlay
    if (this.minimapMode === 'heatmap' && em) {
      const gridSize = 10
      const gridW = Math.ceil(world.width / gridSize)
      const gridH = Math.ceil(world.height / gridSize)
      const density: number[][] = []
      for (let gy = 0; gy < gridH; gy++) {
        density[gy] = []
        for (let gx = 0; gx < gridW; gx++) {
          density[gy][gx] = 0
        }
      }
      const entities = em.getEntitiesWithComponents('position')
      for (const id of entities) {
        const pos = em.getComponent<PositionComponent>(id, 'position')
        if (!pos) continue
        const gx = Math.floor(pos.x / gridSize)
        const gy = Math.floor(pos.y / gridSize)
        if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) {
          density[gy][gx]++
        }
      }
      ctx.globalAlpha = 0.5
      for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          const count = density[gy][gx]
          if (count === 0) {
            ctx.fillStyle = '#003'
          } else if (count <= 3) {
            ctx.fillStyle = '#0a0'
          } else if (count <= 8) {
            ctx.fillStyle = '#aa0'
          } else {
            ctx.fillStyle = '#f00'
          }
          ctx.fillRect(gx * gridSize * scale, gy * gridSize * scale, gridSize * scale, gridSize * scale)
        }
      }
      ctx.globalAlpha = 1
    }

    // Building icons
    if (em) {
      const buildings = em.getEntitiesWithComponents('position', 'building')
      for (const id of buildings) {
        const pos = em.getComponent<PositionComponent>(id, 'position')
        const building = em.getComponent<BuildingComponent>(id, 'building')
        if (!pos || !building) continue
        if (building.buildingType === BuildingType.CASTLE) {
          ctx.fillStyle = '#fff'
        } else if (building.buildingType === BuildingType.BARRACKS) {
          ctx.fillStyle = '#f44'
        } else {
          ctx.fillStyle = '#a86'
        }
        ctx.fillRect(pos.x * scale - 1, pos.y * scale - 1, 3, 3)
      }
    }

    // Entity dots
    if (em && this.minimapMode !== 'heatmap') {
      const entities = em.getEntitiesWithComponents('position', 'render')
      const skip = entities.length > 200 ? 2 : 1
      for (let i = 0; i < entities.length; i += skip) {
        const id = entities[i]
        const pos = em.getComponent<PositionComponent>(id, 'position')
        const render = em.getComponent<RenderComponent>(id, 'render')
        if (!pos || !render) continue
        ctx.fillStyle = render.color
        ctx.fillRect(pos.x * scale, pos.y * scale, 2, 2)
      }
    }

    // Border
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, mw, mh)

    // Viewport rectangle (brighter, thicker)
    const bounds = camera.getVisibleBounds()
    ctx.strokeStyle = '#ffcc00'
    ctx.lineWidth = 2
    ctx.strokeRect(
      bounds.startX * scale,
      bounds.startY * scale,
      (bounds.endX - bounds.startX) * scale,
      (bounds.endY - bounds.startY) * scale
    )
  }
}
