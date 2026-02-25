import { BuildingType } from '../civilization/Civilization'

export type Direction = 'up' | 'down' | 'left' | 'right'

// Palette indices: 0 = transparent, 1+ = color from palette
type PixelGrid = number[][]

interface SpriteDef {
  down: PixelGrid
  left: PixelGrid
  up?: PixelGrid    // optional, derived from down if missing
  right?: PixelGrid // optional, mirrored from left if missing
}

// ============================================================
// Creature palettes (index 0 is always transparent)
// ============================================================
const PALETTES: Record<string, string[]> = {
  human:  ['', '#e8b88a', '#3355aa', '#5544aa', '#222222'],
  //            skin      shirt     pants     hair
  elf:    ['', '#c8e8a8', '#226622', '#44aa44', '#ffffcc'],
  //            skin       tunic     cloak     hair
  dwarf:  ['', '#d4a574', '#884422', '#aa6633', '#664422'],
  //            skin       armor     beard     boots
  orc:    ['', '#5a8a3a', '#554433', '#443322', '#882222'],
  //            skin       armor     loincloth  eyes
  sheep:  ['', '#f0f0f0', '#dddddd', '#333333', '#ffaaaa'],
  //            wool       body      face      nose
  wolf:   ['', '#888888', '#666666', '#333333', '#aa3333'],
  //            fur        dark fur  nose/eye  tongue
  dragon: ['', '#cc2222', '#ff4444', '#ffaa00', '#222222'],
  //            body       wing      fire/eye  claw
}

// ============================================================
// Creature sprite data (8x8 grids)
// ============================================================
const CREATURE_SPRITES: Record<string, SpriteDef> = {
  // ---- HUMAN ----
  human: {
    down: [
      [0,0,5,5,5,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,2,2,2,2,2,0,0],
      [0,0,2,2,2,0,0,0],
      [0,0,3,3,3,0,0,0],
      [0,0,3,0,3,0,0,0],
      [0,0,4,0,4,0,0,0],
    ],
    left: [
      [0,0,5,5,0,0,0,0],
      [0,0,1,1,0,0,0,0],
      [0,0,1,1,0,0,0,0],
      [0,1,2,2,0,0,0,0],
      [0,0,2,2,0,0,0,0],
      [0,0,3,3,0,0,0,0],
      [0,0,3,3,0,0,0,0],
      [0,0,4,4,0,0,0,0],
    ],
    up: [
      [0,0,5,5,5,0,0,0],
      [0,0,5,5,5,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,2,2,2,2,2,0,0],
      [0,0,2,2,2,0,0,0],
      [0,0,3,3,3,0,0,0],
      [0,0,3,0,3,0,0,0],
      [0,0,4,0,4,0,0,0],
    ],
  },

  // ---- ELF ----
  elf: {
    down: [
      [0,4,0,0,0,4,0,0],
      [0,4,1,1,1,4,0,0],
      [0,0,1,1,1,0,0,0],
      [0,2,2,2,2,2,0,0],
      [0,0,3,3,3,0,0,0],
      [0,0,2,2,2,0,0,0],
      [0,0,2,0,2,0,0,0],
      [0,0,2,0,2,0,0,0],
    ],
    left: [
      [0,4,4,0,0,0,0,0],
      [0,1,1,4,0,0,0,0],
      [0,1,1,0,0,0,0,0],
      [1,2,2,3,0,0,0,0],
      [0,3,3,0,0,0,0,0],
      [0,2,2,0,0,0,0,0],
      [0,2,2,0,0,0,0,0],
      [0,2,2,0,0,0,0,0],
    ],
    up: [
      [0,4,0,0,0,4,0,0],
      [0,4,4,4,4,4,0,0],
      [0,0,1,1,1,0,0,0],
      [0,2,2,2,2,2,0,0],
      [0,0,3,3,3,0,0,0],
      [0,0,2,2,2,0,0,0],
      [0,0,2,0,2,0,0,0],
      [0,0,2,0,2,0,0,0],
    ],
  },

  // ---- DWARF ----
  dwarf: {
    down: [
      [0,0,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,3,3,3,3,3,0,0],
      [0,2,2,2,2,2,0,0],
      [0,2,2,2,2,2,0,0],
      [0,0,2,2,2,0,0,0],
      [0,0,4,0,4,0,0,0],
      [0,0,4,0,4,0,0,0],
    ],
    left: [
      [0,0,1,1,0,0,0,0],
      [0,0,1,1,0,0,0,0],
      [0,3,3,3,0,0,0,0],
      [0,2,2,2,0,0,0,0],
      [0,2,2,2,0,0,0,0],
      [0,0,2,2,0,0,0,0],
      [0,0,4,4,0,0,0,0],
      [0,0,4,4,0,0,0,0],
    ],
    up: [
      [0,0,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,2,2,2,2,2,0,0],
      [0,2,2,2,2,2,0,0],
      [0,0,2,2,2,0,0,0],
      [0,0,4,0,4,0,0,0],
      [0,0,4,0,4,0,0,0],
    ],
  },

  // ---- ORC ----
  orc: {
    down: [
      [0,0,1,1,1,0,0,0],
      [0,1,4,1,4,1,0,0],
      [0,1,1,1,1,1,0,0],
      [0,2,2,2,2,2,0,0],
      [1,2,2,2,2,2,1,0],
      [0,0,3,3,3,0,0,0],
      [0,0,3,0,3,0,0,0],
      [0,0,2,0,2,0,0,0],
    ],
    left: [
      [0,0,1,1,0,0,0,0],
      [0,4,1,1,0,0,0,0],
      [0,1,1,1,0,0,0,0],
      [1,2,2,2,0,0,0,0],
      [0,2,2,2,1,0,0,0],
      [0,3,3,0,0,0,0,0],
      [0,3,3,0,0,0,0,0],
      [0,2,2,0,0,0,0,0],
    ],
    up: [
      [0,0,1,1,1,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,0,0],
      [0,2,2,2,2,2,0,0],
      [1,2,2,2,2,2,1,0],
      [0,0,3,3,3,0,0,0],
      [0,0,3,0,3,0,0,0],
      [0,0,2,0,2,0,0,0],
    ],
  },

  // ---- SHEEP ----
  sheep: {
    down: [
      [0,0,0,0,0,0,0,0],
      [0,0,3,3,3,0,0,0],
      [0,0,3,4,3,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,1,2,2,2,1,0,0],
      [0,1,1,1,1,1,0,0],
      [0,0,3,0,3,0,0,0],
      [0,0,3,0,3,0,0,0],
    ],
    left: [
      [0,0,0,0,0,0,0,0],
      [0,3,3,0,0,0,0,0],
      [0,3,4,0,0,0,0,0],
      [1,1,1,1,0,0,0,0],
      [1,2,2,1,0,0,0,0],
      [1,1,1,1,0,0,0,0],
      [0,3,0,3,0,0,0,0],
      [0,3,0,3,0,0,0,0],
    ],
    up: [
      [0,0,0,0,0,0,0,0],
      [0,0,3,3,3,0,0,0],
      [0,0,3,3,3,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,1,2,2,2,1,0,0],
      [0,1,1,1,1,1,0,0],
      [0,0,3,0,3,0,0,0],
      [0,0,3,0,3,0,0,0],
    ],
  },

  // ---- WOLF ----
  wolf: {
    down: [
      [0,1,0,0,0,1,0,0],
      [0,1,1,1,1,1,0,0],
      [0,2,3,1,3,2,0,0],
      [0,1,1,4,1,1,0,0],
      [0,0,1,1,1,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,2,0,0,0,2,0,0],
      [0,2,0,0,0,2,0,0],
    ],
    left: [
      [0,1,0,0,0,0,0,0],
      [0,1,1,1,1,0,0,0],
      [3,1,1,1,1,0,0,0],
      [0,1,1,1,2,2,0,0],
      [0,1,1,1,1,0,0,0],
      [0,2,0,2,0,0,0,0],
      [0,2,0,2,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    up: [
      [0,1,0,0,0,1,0,0],
      [0,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,0,0],
      [0,0,1,1,1,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,2,0,0,0,2,0,0],
      [0,2,0,0,0,2,0,0],
    ],
  },

  // ---- DRAGON ----
  dragon: {
    down: [
      [0,0,1,1,1,0,0,0],
      [0,1,3,1,3,1,0,0],
      [0,1,1,1,1,1,0,0],
      [2,1,1,1,1,1,2,0],
      [2,0,1,1,1,0,2,0],
      [0,0,1,1,1,0,0,0],
      [0,0,4,0,4,0,0,0],
      [0,0,4,0,4,0,0,0],
    ],
    left: [
      [0,0,1,1,0,0,0,0],
      [0,3,1,1,0,0,0,0],
      [0,1,1,1,0,0,0,0],
      [0,1,1,1,2,0,0,0],
      [0,1,1,1,2,0,0,0],
      [0,1,1,3,0,0,0,0],
      [0,4,4,0,0,0,0,0],
      [0,4,0,0,0,0,0,0],
    ],
    up: [
      [0,0,1,1,1,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,0,0],
      [2,1,1,1,1,1,2,0],
      [2,0,1,1,1,0,2,0],
      [0,0,1,1,1,0,0,0],
      [0,0,4,0,4,0,0,0],
      [0,0,4,0,4,0,0,0],
    ],
  },
}

// ============================================================
// Building sprite data (8x8 grids)
// ============================================================
const BUILDING_PALETTES: Partial<Record<BuildingType, string[]>> = {
  [BuildingType.HUT]:      ['', '#8B7355', '#A0896A', '#665533', '#554422'],
  [BuildingType.HOUSE]:    ['', '#A0522D', '#C06030', '#884420', '#663311'],
  [BuildingType.FARM]:     ['', '#DAA520', '#CCBB44', '#88AA22', '#667722'],
  [BuildingType.BARRACKS]: ['', '#696969', '#888888', '#555555', '#AA3333'],
  [BuildingType.TOWER]:    ['', '#808080', '#999999', '#666666', '#AAAAAA'],
  [BuildingType.CASTLE]:   ['', '#B8860B', '#D4A830', '#8B6508', '#FFD700'],
  [BuildingType.MINE]:     ['', '#4A4A4A', '#666666', '#333333', '#AA8833'],
  [BuildingType.PORT]:     ['', '#5F9EA0', '#7BB8BA', '#447788', '#8B6914'],
}

const BUILDING_SPRITES: Partial<Record<BuildingType, PixelGrid>> = {
  // HUT - small triangular roof hut
  [BuildingType.HUT]: [
    [0,0,0,1,1,0,0,0],
    [0,0,1,3,3,1,0,0],
    [0,1,3,3,3,3,1,0],
    [1,3,3,3,3,3,3,1],
    [0,2,2,2,2,2,2,0],
    [0,2,2,4,4,2,2,0],
    [0,2,2,4,4,2,2,0],
    [0,1,1,1,1,1,1,0],
  ],
  // HOUSE - two-story house
  [BuildingType.HOUSE]: [
    [0,0,1,1,1,1,0,0],
    [0,1,3,3,3,3,1,0],
    [1,3,3,3,3,3,3,1],
    [0,2,2,2,2,2,2,0],
    [0,2,4,2,2,4,2,0],
    [0,2,4,2,2,4,2,0],
    [0,2,2,4,4,2,2,0],
    [0,1,1,1,1,1,1,0],
  ],
  // FARM - field with crops
  [BuildingType.FARM]: [
    [0,0,0,0,0,0,0,0],
    [0,3,0,3,0,3,0,0],
    [0,4,0,4,0,4,0,0],
    [0,3,0,3,0,3,0,0],
    [0,4,0,4,0,4,0,0],
    [0,3,0,3,0,3,0,0],
    [1,1,1,1,1,1,1,0],
    [2,2,2,2,2,2,2,0],
  ],
  // BARRACKS - military building with flag
  [BuildingType.BARRACKS]: [
    [0,0,4,4,0,0,0,0],
    [0,0,3,0,0,0,0,0],
    [0,1,1,1,1,1,0,0],
    [0,1,2,2,2,1,0,0],
    [0,1,2,2,2,1,0,0],
    [0,1,2,4,2,1,0,0],
    [0,1,1,4,1,1,0,0],
    [0,3,3,3,3,3,0,0],
  ],
  // TOWER - tall stone tower
  [BuildingType.TOWER]: [
    [0,0,4,4,4,0,0,0],
    [0,0,3,1,3,0,0,0],
    [0,0,1,1,1,0,0,0],
    [0,0,1,3,1,0,0,0],
    [0,0,1,1,1,0,0,0],
    [0,0,1,3,1,0,0,0],
    [0,0,1,1,1,0,0,0],
    [0,1,1,1,1,1,0,0],
  ],
  // CASTLE - grand castle with towers
  [BuildingType.CASTLE]: [
    [0,4,0,4,4,0,4,0],
    [0,1,0,1,1,0,1,0],
    [0,1,1,1,1,1,1,0],
    [0,1,3,1,1,3,1,0],
    [0,2,2,2,2,2,2,0],
    [0,2,2,4,4,2,2,0],
    [0,2,2,4,4,2,2,0],
    [1,1,1,1,1,1,1,1],
  ],
  // MINE - mine entrance in hillside
  [BuildingType.MINE]: [
    [0,0,0,3,3,0,0,0],
    [0,0,3,3,3,3,0,0],
    [0,3,3,3,3,3,3,0],
    [3,3,3,2,2,3,3,3],
    [3,3,2,1,1,2,3,3],
    [0,0,2,1,1,2,0,0],
    [0,0,4,4,4,4,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  // PORT - dock with boat
  [BuildingType.PORT]: [
    [0,0,0,4,0,0,0,0],
    [0,0,0,4,0,0,0,0],
    [0,0,4,4,4,0,0,0],
    [0,1,1,1,1,1,0,0],
    [1,2,2,2,2,2,1,0],
    [0,1,1,1,1,1,0,0],
    [0,3,3,3,3,3,0,0],
    [0,0,3,3,3,0,0,0],
  ],
}

// ============================================================
// Level 2+ building overlays (small additions to show upgrade)
// ============================================================
const BUILDING_LEVEL_OVERLAYS: Record<number, PixelGrid> = {
  // Level 2: add a small banner/flag
  2: [
    [0,0,0,0,0,0,1,0],
    [0,0,0,0,0,0,1,0],
    [0,0,0,0,0,1,1,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  // Level 3: add golden trim at bottom
  3: [
    [0,0,0,0,0,0,1,0],
    [0,0,0,0,0,0,1,0],
    [0,0,0,0,0,1,1,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1],
  ],
}

const LEVEL_OVERLAY_PALETTE = ['', '#FFD700']

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
   * Generate all sprites and cache them.
   */
  private generateAllSprites(): void {
    this.generateCreatureSprites()
    this.generateBuildingSprites()
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
