// Sprite renderer - generates and caches OffscreenCanvas sprites
// Data definitions are in SpriteData.ts

import {
  Direction,
  PixelGrid,
  SpriteDef,
  PALETTES,
  CREATURE_SPRITES,
  BUILDING_PALETTES,
  BUILDING_SPRITES,
  BUILDING_LEVEL_OVERLAYS,
  LEVEL_OVERLAY_PALETTE,
} from './SpriteData'
import { BuildingType } from '../civilization/Civilization'

// ============================================================
// SpriteRenderer class
// ============================================================
export class SpriteRenderer {
  private spriteCache: Map<string, OffscreenCanvas> = new Map()

  constructor() {
    this.generateAllSprites()
  }

  /**
   * Get a creature sprite for the given species and direction.
   * Falls back to 'down' if the direction is unavailable.
   */
  getCreatureSprite(species: string, direction: Direction): OffscreenCanvas {
    const key = `creature_${species}_${direction}`
    const cached = this.spriteCache.get(key)
    if (cached) return cached

    // Fallback chain: requested -> down -> first available
    const fallbackKey = `creature_${species}_down`
    return this.spriteCache.get(fallbackKey) || this.createEmptySprite()
  }

  /**
   * Get a building sprite for the given type and level.
   * Level affects overlay decorations (flags, golden trim).
   */
  getBuildingSprite(buildingType: BuildingType, level: number): OffscreenCanvas {
    const clampedLevel = Math.min(level, 3)
    const key = `building_${buildingType}_${clampedLevel}`
    const cached = this.spriteCache.get(key)
    if (cached) return cached

    // Fallback to level 1
    const fallbackKey = `building_${buildingType}_1`
    return this.spriteCache.get(fallbackKey) || this.createEmptySprite()
  }

  /**
   * Get a ship sprite for the given ship type and direction.
   */
  getShipSprite(shipType: string, direction: Direction): OffscreenCanvas {
    const key = `ship_${shipType}_${direction}`
    const cached = this.spriteCache.get(key)
    if (cached) return cached

    const fallbackKey = `ship_${shipType}_down`
    return this.spriteCache.get(fallbackKey) || this.createEmptySprite()
  }

  /**
   * Generate all sprites and cache them.
   */
  private generateAllSprites(): void {
    this.generateCreatureSprites()
    this.generateBuildingSprites()
    this.generateShipSprites()
  }

  private generateCreatureSprites(): void {
    const speciesList = Object.keys(CREATURE_SPRITES)

    for (const species of speciesList) {
      const def = CREATURE_SPRITES[species]
      const palette = PALETTES[species]
      if (!palette) continue

      // Generate 'down' sprite
      if (def.down) {
        const canvas = this.createSprite(8, 8)
        this.drawPixelArt(canvas, def.down, palette)
        this.spriteCache.set(`creature_${species}_down`, canvas)
      }

      // Generate 'left' sprite
      if (def.left) {
        const canvas = this.createSprite(8, 8)
        this.drawPixelArt(canvas, def.left, palette)
        this.spriteCache.set(`creature_${species}_left`, canvas)
      }

      // Generate 'right' sprite (mirror of left)
      if (def.right) {
        const canvas = this.createSprite(8, 8)
        this.drawPixelArt(canvas, def.right, palette)
        this.spriteCache.set(`creature_${species}_right`, canvas)
      } else if (def.left) {
        const canvas = this.createSprite(8, 8)
        this.drawPixelArtMirrored(canvas, def.left, palette)
        this.spriteCache.set(`creature_${species}_right`, canvas)
      }

      // Generate 'up' sprite
      if (def.up) {
        const canvas = this.createSprite(8, 8)
        this.drawPixelArt(canvas, def.up, palette)
        this.spriteCache.set(`creature_${species}_up`, canvas)
      } else if (def.down) {
        // Use down as fallback for up (already cached)
        const downCanvas = this.spriteCache.get(`creature_${species}_down`)
        if (downCanvas) {
          this.spriteCache.set(`creature_${species}_up`, downCanvas)
        }
      }
    }
  }

  private generateBuildingSprites(): void {
    const buildingTypes = [
      BuildingType.HUT, BuildingType.HOUSE, BuildingType.FARM,
      BuildingType.BARRACKS, BuildingType.TOWER, BuildingType.CASTLE,
      BuildingType.MINE, BuildingType.PORT,
    ]

    for (const bt of buildingTypes) {
      const pixels = BUILDING_SPRITES[bt]
      const palette = BUILDING_PALETTES[bt]
      if (!pixels || !palette) continue

      // Level 1: base sprite
      const base = this.createSprite(8, 8)
      this.drawPixelArt(base, pixels, palette)
      this.spriteCache.set(`building_${bt}_1`, base)

      // Level 2 and 3: base + overlay
      for (const lvl of [2, 3]) {
        const overlay = BUILDING_LEVEL_OVERLAYS[lvl]
        if (!overlay) {
          // No overlay defined, reuse base
          this.spriteCache.set(`building_${bt}_${lvl}`, base)
          continue
        }
        const canvas = this.createSprite(8, 8)
        // Draw base first
        this.drawPixelArt(canvas, pixels, palette)
        // Draw overlay on top
        this.drawPixelArt(canvas, overlay, LEVEL_OVERLAY_PALETTE)
        this.spriteCache.set(`building_${bt}_${lvl}`, canvas)
      }
    }
  }

  private generateShipSprites(): void {
    const shipTypes = ['warship', 'trader', 'explorer', 'fishing']
    const shipColors: Record<string, string[]> = {
      warship: ['#8a4a4a', '#aa3333', '#cc4444', '#666666'],
      trader: ['#8a7a4a', '#aa9933', '#ccbb44', '#886644'],
      explorer: ['#4a6a8a', '#3366aa', '#4488cc', '#556666'],
      fishing: ['#6a8a6a', '#448844', '#66aa66', '#887766'],
    }
    for (const st of shipTypes) {
      const colors = shipColors[st] || ['#888', '#aaa', '#ccc', '#666']
      for (const dir of ['down', 'up', 'left', 'right'] as const) {
        const canvas = this.createSprite(8, 8)
        const ctx = canvas.getContext('2d')!
        // Simple ship shape
        ctx.fillStyle = colors[0]
        if (dir === 'down' || dir === 'up') {
          ctx.fillRect(2, 1, 4, 6) // hull
          ctx.fillStyle = colors[1]
          ctx.fillRect(3, 0, 2, 1) // bow
          ctx.fillStyle = colors[2]
          ctx.fillRect(3, 3, 2, 1) // mast
        } else {
          ctx.fillRect(1, 2, 6, 4) // hull
          ctx.fillStyle = colors[1]
          ctx.fillRect(0, 3, 1, 2) // bow
          ctx.fillStyle = colors[2]
          ctx.fillRect(3, 3, 1, 2) // mast
        }
        this.spriteCache.set(`ship_${st}_${dir}`, canvas)
      }
    }
  }

  /**
   * Create an empty OffscreenCanvas of the given size.
   */
  private createSprite(w: number, h: number): OffscreenCanvas {
    return new OffscreenCanvas(w, h)
  }

  /**
   * Create a 1x1 transparent fallback sprite.
   */
  private createEmptySprite(): OffscreenCanvas {
    return new OffscreenCanvas(1, 1)
  }

  /**
   * Draw pixel art onto an OffscreenCanvas from a 2D grid and palette.
   * Index 0 in the grid means transparent (skip).
   */
  private drawPixelArt(canvas: OffscreenCanvas, pixels: PixelGrid, palette: string[]): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    for (let y = 0; y < pixels.length; y++) {
      const row = pixels[y]
      for (let x = 0; x < row.length; x++) {
        const idx = row[x]
        if (idx === 0) continue // transparent
        const color = palette[idx]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  /**
   * Draw pixel art horizontally mirrored (for generating 'right' from 'left').
   */
  private drawPixelArtMirrored(canvas: OffscreenCanvas, pixels: PixelGrid, palette: string[]): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = pixels[0]?.length || 8

    for (let y = 0; y < pixels.length; y++) {
      const row = pixels[y]
      for (let x = 0; x < row.length; x++) {
        const idx = row[x]
        if (idx === 0) continue
        const color = palette[idx]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(width - 1 - x, y, 1, 1)
      }
    }
  }

  /**
   * Determine the direction a creature is facing based on velocity.
   */
  static directionFromVelocity(vx: number, vy: number): Direction {
    if (vx === 0 && vy === 0) return 'down' // idle default

    // Pick dominant axis
    if (Math.abs(vx) > Math.abs(vy)) {
      return vx > 0 ? 'right' : 'left'
    } else {
      return vy > 0 ? 'down' : 'up'
    }
  }
}
