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

}
