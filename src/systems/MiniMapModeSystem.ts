/** MiniMapModeSystem — cycle minimap between Normal / Political / Resource / Population heatmap modes. */

export type MinimapMode = 'normal' | 'political' | 'resource' | 'population'

const MODES: MinimapMode[] = ['normal', 'political', 'resource', 'population']
const MODE_LABELS: Record<MinimapMode, string> = {
  normal: 'Normal',
  political: 'Political',
  resource: 'Resources',
  population: 'Population',
}
const MODE_COLORS: Record<MinimapMode, string> = {
  normal: '#aaa',
  political: '#4fc3f7',
  resource: '#66bb6a',
  population: '#ff7043',
}

const BTN_W = 80
const BTN_H = 20

export class MiniMapModeSystem {
  private mode: MinimapMode = 'normal'
  private modeIdx = 0
  // Cache for renderHeatmapOverlay color palette (keyed by r<<16|g<<8|b)
  private _heatColorKey = -1
  private _heatPalette: string[] = []

  getMode(): MinimapMode { return this.mode }

  /** Cycle to next mode. */
  cycleMode(): void {
    this.modeIdx = (this.modeIdx + 1) % MODES.length
    this.mode = MODES[this.modeIdx]
  }

  /** Set a specific mode. */
  setMode(m: MinimapMode): void {
    this.mode = m
    this.modeIdx = MODES.indexOf(m)
  }

  /** Check if click is on the mode button. */
  handleClick(mx: number, my: number, minimapX: number, minimapY: number): boolean {
    const bx = minimapX, by = minimapY - BTN_H - 4
    if (mx >= bx && mx <= bx + BTN_W && my >= by && my <= by + BTN_H) {
      this.cycleMode()
      return true
    }
    return false
  }

  /** Render mode button below minimap. */
  renderModeButton(ctx: CanvasRenderingContext2D, minimapX: number, minimapY: number): void {
    const bx = minimapX, by = minimapY - BTN_H - 4

    ctx.save()
    ctx.fillStyle = 'rgba(16,18,26,0.85)'
    ctx.strokeStyle = MODE_COLORS[this.mode]
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(bx, by, BTN_W, BTN_H, 4)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = MODE_COLORS[this.mode]
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(MODE_LABELS[this.mode], bx + BTN_W / 2, by + BTN_H / 2)
    ctx.restore()
  }

  /**
   * Generate heatmap overlay data for population mode.
   * Returns a flat Float32Array of alpha values (0-1) for each tile.
   */
  generatePopulationHeatmap(
    worldW: number, worldH: number,
    entities: Array<{ x: number; y: number }>
  ): Float32Array {
    const heat = new Float32Array(worldW * worldH)
    const radius = 5
    for (const e of entities) {
      const cx = Math.floor(e.x), cy = Math.floor(e.y)
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const tx = cx + dx, ty = cy + dy
          if (tx < 0 || tx >= worldW || ty < 0 || ty >= worldH) continue
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= radius) {
            heat[ty * worldW + tx] += 1 - dist / radius
          }
        }
      }
    }
    // Normalize to 0-1
    let max = 0
    for (let i = 0; i < heat.length; i++) if (heat[i] > max) max = heat[i]
    if (max > 0) for (let i = 0; i < heat.length; i++) heat[i] /= max
    return heat
  }

  /**
   * Render heatmap overlay on minimap canvas.
   * Draws colored semi-transparent pixels based on heat values.
   */
  renderHeatmapOverlay(
    ctx: CanvasRenderingContext2D,
    heat: Float32Array,
    worldW: number, worldH: number,
    canvasW: number, canvasH: number,
    color: [number, number, number]
  ): void {
    const colorKey = (color[0] << 16) | (color[1] << 8) | color[2]
    if (colorKey !== this._heatColorKey) {
      this._heatColorKey = colorKey
      this._heatPalette = []
      for (let i = 0; i <= 100; i++) {
        const v = i / 100
        this._heatPalette.push(`rgba(${color[0]},${color[1]},${color[2]},${(v * 0.7).toFixed(2)})`)
      }
    }
    const palette = this._heatPalette
    const sx = canvasW / worldW, sy = canvasH / worldH
    ctx.save()
    for (let y = 0; y < worldH; y++) {
      for (let x = 0; x < worldW; x++) {
        const v = heat[y * worldW + x]
        if (v < 0.05) continue
        ctx.fillStyle = palette[Math.round(v * 100)]
        ctx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy))
      }
    }
    ctx.restore()
  }
}
