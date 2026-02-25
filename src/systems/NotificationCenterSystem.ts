// Notification Center System — centralized game event notifications with queue, history, and click-to-jump

/** Notification severity categories */
export type NotificationCategory = 'info' | 'warning' | 'danger' | 'success'

interface NotificationEntry {
  active: boolean
  message: string
  category: NotificationCategory
  x: number
  y: number
  hasPosition: boolean
  spawnTick: number
  alpha: number
}

const MAX_VISIBLE = 5
const MAX_HISTORY = 50
const POOL_SIZE = MAX_VISIBLE + MAX_HISTORY
const FADE_DURATION = 120
const DISPLAY_TICKS = 180
const NOTIF_W = 260
const NOTIF_H = 28
const NOTIF_PAD = 8
const NOTIF_GAP = 4
const HIST_LH = 22
const HIST_W = 320
const HIST_HDR = 32

const CAT_COLOR: Record<NotificationCategory, string> = {
  info: '#4a9eff', warning: '#ffaa00', danger: '#ff4444', success: '#44dd44',
}
const CAT_BG: Record<NotificationCategory, string> = {
  info: 'rgba(20,60,120,0.85)', warning: 'rgba(80,60,0,0.85)',
  danger: 'rgba(100,20,20,0.85)', success: 'rgba(20,80,20,0.85)',
}
const CAT_ICON: Record<NotificationCategory, string> = {
  info: 'i', warning: '!', danger: 'X', success: '+',
}

/**
 * Centralized notification system for game events.
 * Uses a pre-allocated object pool to avoid GC pressure in the hot path.
 * Supports visible queue (max 5), history (max 50), click-to-jump, and N-key history panel.
 */
export class NotificationCenterSystem {
  private pool: NotificationEntry[]
  private vis: number[] = []
  private hist: number[] = []
  private cursor: number = 0
  private histOpen: boolean = false
  private histScroll: number = 0

  constructor() {
    this.pool = new Array<NotificationEntry>(POOL_SIZE)
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool[i] = { active: false, message: '', category: 'info', x: 0, y: 0, hasPosition: false, spawnTick: 0, alpha: 0 }
    }
  }

  /** Push a new notification. Provide x/y for click-to-jump support. */
  push(message: string, category: NotificationCategory, x?: number, y?: number): void {
    const idx = this.cursor
    this.cursor = (this.cursor + 1) % POOL_SIZE
    const e = this.pool[idx]
    e.active = true; e.message = message; e.category = category
    e.x = x ?? 0; e.y = y ?? 0; e.hasPosition = x !== undefined && y !== undefined
    e.spawnTick = -1; e.alpha = 1
    this.rmIdx(this.vis, idx); this.rmIdx(this.hist, idx)
    this.vis.unshift(idx)
    if (this.vis.length > MAX_VISIBLE) this.vis.pop()
    this.hist.unshift(idx)
    if (this.hist.length > MAX_HISTORY) this.hist.pop()
  }

  /** Process fade-out animation for visible notifications. */
  update(tick: number): void {
    for (let i = this.vis.length - 1; i >= 0; i--) {
      const e = this.pool[this.vis[i]]
      if (!e.active) { this.vis.splice(i, 1); continue }
      if (e.spawnTick < 0) e.spawnTick = tick
      const age = tick - e.spawnTick
      if (age > DISPLAY_TICKS) { e.active = false; this.vis.splice(i, 1) }
      else if (age > DISPLAY_TICKS - FADE_DURATION) e.alpha = 1 - (age - (DISPLAY_TICKS - FADE_DURATION)) / FADE_DURATION
      else e.alpha = 1
    }
  }

  /** Render active notifications (top-right) and history panel (if open). */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (this.vis.length > 0) this.renderVis(ctx, screenW)
    if (this.histOpen) this.renderHist(ctx, screenW, screenH)
  }

  toggleHistory(): void { this.histOpen = !this.histOpen; this.histScroll = 0 }
  isHistoryOpen(): boolean { return this.histOpen }

  /** Returns jump target if a visible notification with position was clicked, else null. */
  getClickedNotification(clickX: number, clickY: number, screenW: number): { x: number; y: number } | null {
    const bx = screenW - NOTIF_W - NOTIF_PAD
    let by = NOTIF_PAD
    for (const idx of this.vis) {
      const e = this.pool[idx]
      if (e.active && e.hasPosition &&
          clickX >= bx && clickX <= bx + NOTIF_W && clickY >= by && clickY <= by + NOTIF_H) {
        return { x: e.x, y: e.y }
      }
      by += NOTIF_H + NOTIF_GAP
    }
    return null
  }

  /** Clear all notifications and history. */
  clear(): void {
    for (let i = 0; i < POOL_SIZE; i++) this.pool[i].active = false
    this.vis.length = 0; this.hist.length = 0; this.histScroll = 0
  }

  private renderVis(ctx: CanvasRenderingContext2D, screenW: number): void {
    const bx = screenW - NOTIF_W - NOTIF_PAD
    let y = NOTIF_PAD
    ctx.textBaseline = 'middle'
    for (const idx of this.vis) {
      const e = this.pool[idx]
      if (!e.active) continue
      ctx.globalAlpha = e.alpha
      ctx.fillStyle = CAT_BG[e.category]
      ctx.fillRect(bx, y, NOTIF_W, NOTIF_H)
      ctx.fillStyle = CAT_COLOR[e.category]
      ctx.fillRect(bx, y, 3, NOTIF_H)
      // Icon
      const ix = bx + 14, iy = y + NOTIF_H / 2
      ctx.beginPath(); ctx.arc(ix, iy, 8, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#000'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'
      ctx.fillText(CAT_ICON[e.category], ix, iy + 1)
      // Text
      ctx.fillStyle = '#eee'; ctx.font = '11px monospace'; ctx.textAlign = 'left'
      const text = this.truncate(ctx, e.message, NOTIF_W - 36)
      ctx.fillText(text, bx + 28, iy + 1)
      // Position dot
      if (e.hasPosition) {
        ctx.fillStyle = CAT_COLOR[e.category]; ctx.font = '9px monospace'; ctx.textAlign = 'right'
        ctx.fillText('\u25C9', bx + NOTIF_W - 6, iy + 1)
      }
      y += NOTIF_H + NOTIF_GAP
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left'
  }

  private renderHist(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    const ph = screenH * 0.6
    const px = (screenW - HIST_W) / 2, py = (screenH - ph) / 2
    ctx.globalAlpha = 0.92; ctx.fillStyle = '#111'
    ctx.fillRect(px, py, HIST_W, ph)
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.strokeRect(px, py, HIST_W, ph)
    ctx.globalAlpha = 1
    // Header
    ctx.fillStyle = '#222'; ctx.fillRect(px, py, HIST_W, HIST_HDR)
    ctx.fillStyle = '#ddd'; ctx.font = 'bold 13px monospace'
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
    ctx.fillText('Notification History [N]', px + HIST_W / 2, py + HIST_HDR / 2)
    // Entries (clipped)
    ctx.save()
    ctx.beginPath(); ctx.rect(px, py + HIST_HDR, HIST_W, ph - HIST_HDR); ctx.clip()
    ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    let ey = py + HIST_HDR + 4 - this.histScroll
    for (const idx of this.hist) {
      const e = this.pool[idx]
      if (ey + HIST_LH < py + HIST_HDR) { ey += HIST_LH; continue }
      if (ey > py + ph) break
      ctx.fillStyle = CAT_COLOR[e.category]
      ctx.beginPath(); ctx.arc(px + 12, ey + HIST_LH / 2, 4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = e.active ? '#ccc' : '#888'
      ctx.fillText(this.truncate(ctx, e.message, HIST_W - 30), px + 22, ey + HIST_LH / 2)
      ey += HIST_LH
    }
    ctx.restore(); ctx.textAlign = 'left'
  }

  private truncate(ctx: CanvasRenderingContext2D, msg: string, maxW: number): string {
    if (ctx.measureText(msg).width <= maxW) return msg
    let t = msg
    while (t.length > 3 && ctx.measureText(t + '...').width > maxW) t = t.slice(0, -1)
    return t + '...'
  }

  private rmIdx(arr: number[], val: number): void {
    const i = arr.indexOf(val)
    if (i !== -1) arr.splice(i, 1)
  }
}
