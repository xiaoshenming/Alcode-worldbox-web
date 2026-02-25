/** CameraBookmarkSystem — save/restore camera positions with Ctrl+1-9 / 1-9 (when Alt held). */

interface Bookmark {
  x: number
  y: number
  zoom: number
  label: string
}

const MAX_BOOKMARKS = 9
const STORAGE_KEY = 'worldbox_cam_bookmarks'
const TOAST_TICKS = 90
const PANEL_W = 200
const ROW_H = 22

export class CameraBookmarkSystem {
  private bookmarks: (Bookmark | null)[] = new Array(MAX_BOOKMARKS).fill(null)
  private toastMsg = ''
  private toastTimer = 0
  private panelOpen = false

  constructor() { this.load() }

  /** Save current camera position to slot (0-8). */
  save(slot: number, x: number, y: number, zoom: number): void {
    if (slot < 0 || slot >= MAX_BOOKMARKS) return
    this.bookmarks[slot] = { x, y, zoom, label: `Bookmark ${slot + 1}` }
    this.persist()
    this.showToast(`Saved bookmark ${slot + 1}`)
  }

  /** Get bookmark at slot, or null. */
  get(slot: number): Bookmark | null {
    return this.bookmarks[slot] ?? null
  }

  /** Delete bookmark at slot. */
  remove(slot: number): void {
    this.bookmarks[slot] = null
    this.persist()
  }

  togglePanel(): void { this.panelOpen = !this.panelOpen }
  isPanelOpen(): boolean { return this.panelOpen }

  update(): void {
    if (this.toastTimer > 0) this.toastTimer--
  }

  /** Render bookmark list panel and toast. */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    // Toast
    if (this.toastTimer > 0) {
      const alpha = Math.min(1, this.toastTimer / 30)
      ctx.save()
      ctx.globalAlpha = alpha * 0.9
      ctx.font = '11px monospace'
      const tw = ctx.measureText(this.toastMsg).width
      const tx = (screenW - tw) / 2 - 10
      const ty = screenH - 50
      ctx.fillStyle = 'rgba(16,18,26,0.9)'
      ctx.beginPath()
      ctx.roundRect(tx, ty, tw + 20, 24, 4)
      ctx.fill()
      ctx.fillStyle = '#4fc3f7'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillText(this.toastMsg, screenW / 2, ty + 12)
      ctx.restore()
    }

    if (!this.panelOpen) return

    // Panel
    const count = this.bookmarks.filter(b => b !== null).length
    const ph = 30 + Math.max(count, 1) * ROW_H + 8
    const px = screenW - PANEL_W - 20, py = 80

    ctx.save()
    ctx.fillStyle = 'rgba(16,18,26,0.92)'
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(px, py, PANEL_W, ph, 6)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ddd'
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('Camera Bookmarks [B]', px + PANEL_W / 2, py + 8)

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    let ry = py + 30
    let hasAny = false
    for (let i = 0; i < MAX_BOOKMARKS; i++) {
      const b = this.bookmarks[i]
      if (!b) continue
      hasAny = true
      ctx.fillStyle = '#aaa'
      ctx.font = '10px monospace'
      ctx.fillText(`[${i + 1}] ${b.label}`, px + 10, ry + ROW_H / 2)
      ctx.fillStyle = '#666'
      ctx.textAlign = 'right'
      ctx.fillText(`(${Math.round(b.x)},${Math.round(b.y)})`, px + PANEL_W - 10, ry + ROW_H / 2)
      ctx.textAlign = 'left'
      ry += ROW_H
    }
    if (!hasAny) {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('No bookmarks. Ctrl+1-9 to save.', px + 10, ry + ROW_H / 2)
    }
    ctx.restore()
  }

  private showToast(msg: string): void {
    this.toastMsg = msg
    this.toastTimer = TOAST_TICKS
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bookmarks))
    } catch { /* ignore */ }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (Array.isArray(data)) {
        for (let i = 0; i < MAX_BOOKMARKS && i < data.length; i++) {
          this.bookmarks[i] = data[i]
        }
      }
    } catch { /* ignore */ }
  }
}
