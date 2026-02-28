/** MapMarkerSystem - player-placed map markers with persistence */

const STORAGE_KEY = 'worldbox_markers'
const MAX_MARKERS = 100
const HIT_RADIUS = 12

const MARKER_ICONS: Record<string, string> = {
  pin: '\u{1F4CD}',
  star: '\u2B50',
  warning: '\u26A0\uFE0F',
  flag: '\u{1F6A9}',
}

function initPool(): (MarkerData | null)[] {
  const arr: (MarkerData | null)[] = []
  for (let i = 0; i < MAX_MARKERS; i++) arr.push(null)
  return arr
}

export interface MarkerData {
  id: number
  x: number
  y: number
  type: string
  label: string
  created: number
}

export class MapMarkerSystem {
  /** Pre-allocated marker slots */
  private pool: (MarkerData | null)[] = initPool()
  private nextId = 1
  private _lastZoom = -1
  private _sansFont = ''
  private _monoFont = ''
  private count = 0

  constructor() {
    this.load()
  }

  /** Place a new marker, returns its ID or -1 if pool is full */
  addMarker(worldX: number, worldY: number, type: string, label: string): number {
    if (this.count >= MAX_MARKERS) return -1
    const slot = this.findFreeSlot()
    if (slot === -1) return -1
    const id = this.nextId++
    this.pool[slot] = { id, x: worldX, y: worldY, type, label, created: Date.now() }
    this.count++
    this.save()
    return id
  }

  removeMarker(id: number): void {
    const idx = this.findSlot(id)
    if (idx === -1) return
    this.pool[idx] = null
    this.count--
    this.save()
  }

  updateMarkerLabel(id: number, label: string): void {
    const m = this.getById(id)
    if (m) { m.label = label; this.save() }
  }

  moveMarker(id: number, worldX: number, worldY: number): void {
    const m = this.getById(id)
    if (m) { m.x = worldX; m.y = worldY; this.save() }
  }

  getMarkers(): MarkerData[] {
    const out: MarkerData[] = []
    for (let i = 0; i < MAX_MARKERS; i++) {
      if (this.pool[i]) out.push(this.pool[i]!)
    }
    return out
  }

  update(_tick: number): void {
    // Reserved for future animation / expiry logic
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    const baseSize = 14
    const minScale = 0.5
    const scale = Math.max(minScale, Math.min(zoom, 2))
    const fontSize = Math.round(baseSize * scale)

    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._sansFont = `${fontSize}px sans-serif`
      this._monoFont = `${Math.round(10 * scale)}px monospace`
    }

    ctx.save()
    ctx.font = this._sansFont
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'

    for (let i = 0; i < MAX_MARKERS; i++) {
      const m = this.pool[i]
      if (!m) continue
      const sx = (m.x - camX) * zoom
      const sy = (m.y - camY) * zoom

      // Icon
      const icon = MARKER_ICONS[m.type] || m.type
      ctx.fillText(icon, sx, sy)

      // Label below icon
      if (m.label && zoom > 0.4) {
        const labelSize = Math.round(10 * scale)
        ctx.font = this._monoFont
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        ctx.strokeText(m.label, sx, sy + labelSize + 2)
        ctx.fillText(m.label, sx, sy + labelSize + 2)
        ctx.font = this._sansFont
      }
    }
    ctx.restore()
  }

  /** Returns the marker ID at screen-space position, or null */
  handleClick(worldX: number, worldY: number): number | null {
    let bestId: number | null = null
    let bestDistSq = HIT_RADIUS * HIT_RADIUS
    for (let i = 0; i < MAX_MARKERS; i++) {
      const m = this.pool[i]
      if (!m) continue
      const dx = m.x - worldX
      const dy = m.y - worldY
      const distSq = dx * dx + dy * dy
      if (distSq < bestDistSq) {
        bestDistSq = distSq
        bestId = m.id
      }
    }
    return bestId
  }

  save(): void {
    const data = this.getMarkers()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch { /* quota exceeded — silently ignore */ }
  }

  load(): void {
    let raw: string | null = null
    try { raw = localStorage.getItem(STORAGE_KEY) } catch { return }
    if (!raw) return
    let arr: MarkerData[]
    try { arr = JSON.parse(raw) } catch { return }
    if (!Array.isArray(arr)) return

    // Reset pool
    for (let i = 0; i < MAX_MARKERS; i++) this.pool[i] = null
    this.count = 0
    this.nextId = 1

    const limit = Math.min(arr.length, MAX_MARKERS)
    for (let i = 0; i < limit; i++) {
      const m = arr[i]
      if (!m || typeof m.id !== 'number') continue
      this.pool[i] = { id: m.id, x: m.x, y: m.y, type: m.type, label: m.label, created: m.created }
      this.count++
      if (m.id >= this.nextId) this.nextId = m.id + 1
    }
  }

  // -- internal helpers --

  private findFreeSlot(): number {
    for (let i = 0; i < MAX_MARKERS; i++) {
      if (!this.pool[i]) return i
    }
    return -1
  }

  private findSlot(id: number): number {
    for (let i = 0; i < MAX_MARKERS; i++) {
      if (this.pool[i]?.id === id) return i
    }
    return -1
  }

  private getById(id: number): MarkerData | null {
    const idx = this.findSlot(id)
    return idx === -1 ? null : this.pool[idx]
  }
}
