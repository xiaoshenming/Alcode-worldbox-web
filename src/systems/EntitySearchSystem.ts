/** EntitySearchSystem — search entities by name/type with highlight support. */

interface SearchResult {
  entityId: number
  label: string
  x: number
  y: number
  /** Pre-computed "(x,y)" coordinate string — computed in search() */
  coordStr: string
}

export class EntitySearchSystem {
  private query = ''
  private results: SearchResult[] = []
  private selectedIdx = -1
  private panelOpen = false

  constructor() { /* no-op */ }

  /** Open/close the search panel. */
  togglePanel(): void { this.panelOpen = !this.panelOpen; if (!this.panelOpen) this.clear() }
  isPanelOpen(): boolean { return this.panelOpen }

  /** Set search query and trigger search. */
  setQuery(q: string): void { this.query = q.toLowerCase() }

  /** Run search against entity manager. Call after setQuery. */
  search(entities: Array<{ id: number; label: string; x: number; y: number }>): void {
    if (!this.query) { this.results = []; return }
    this.results = entities
      .filter(e => e.label.toLowerCase().includes(this.query))
      .slice(0, 20)
      .map(e => ({ entityId: e.id, label: e.label, x: e.x, y: e.y, coordStr: `(${e.x},${e.y})` }))
    this.selectedIdx = this.results.length > 0 ? 0 : -1
  }


  selectNext(): void {
    if (this.results.length === 0) return
    this.selectedIdx = (this.selectedIdx + 1) % this.results.length
  }

  selectPrev(): void {
    if (this.results.length === 0) return
    this.selectedIdx = (this.selectedIdx - 1 + this.results.length) % this.results.length
  }

  clear(): void { this.query = ''; this.results = []; this.selectedIdx = -1 }

  /** Render search panel overlay. */
  render(ctx: CanvasRenderingContext2D, screenW: number, _screenH: number): void {
    if (!this.panelOpen) return

    const pw = 280, ph = 30 + Math.min(this.results.length, 10) * 24 + 8
    const px = (screenW - pw) / 2, py = 60

    ctx.save()

    // Panel bg
    ctx.fillStyle = 'rgba(16,18,26,0.92)'
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(px, py, pw, ph, 6)
    ctx.fill()
    ctx.stroke()

    // Search input area
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(px + 8, py + 6, pw - 16, 20)
    ctx.fillStyle = '#ccc'
    ctx.font = '11px monospace'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    const displayText = this.query || 'Search entities...'
    ctx.fillStyle = this.query ? '#eee' : '#666'
    ctx.fillText(displayText, px + 14, py + 16)

    // Results
    let ry = py + 32
    for (let i = 0; i < Math.min(this.results.length, 10); i++) {
      const r = this.results[i]
      const selected = i === this.selectedIdx
      if (selected) {
        ctx.fillStyle = 'rgba(79,195,247,0.15)'
        ctx.fillRect(px + 4, ry - 2, pw - 8, 22)
      }
      ctx.fillStyle = selected ? '#4fc3f7' : '#aaa'
      ctx.font = '11px monospace'
      ctx.fillText(r.label, px + 14, ry + 10)
      ctx.fillStyle = '#666'
      ctx.font = '9px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(r.coordStr, px + pw - 14, ry + 10)
      ctx.textAlign = 'left'
      ry += 24
    }

    ctx.restore()
  }
}
