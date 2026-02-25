// Toast notification system - Canvas-rendered floating notifications
import { EventLog, WorldEvent, EventType } from '../systems/EventLog'

export interface Toast {
  id: number
  type: 'info' | 'success' | 'warning' | 'danger' | 'legendary'
  icon: string
  title: string
  message: string
  duration: number
  createdAt: number
  alpha: number
  y: number
  targetY: number
}

type ToastType = Toast['type']

const TOAST_COLORS: Record<ToastType, { bg: string; bar: string; text: string }> = {
  info:      { bg: 'rgba(30,60,114,0.92)',  bar: '#4a9eff', text: '#cde4ff' },
  success:   { bg: 'rgba(20,80,40,0.92)',   bar: '#4caf50', text: '#c8ffc8' },
  warning:   { bg: 'rgba(100,60,10,0.92)',  bar: '#ff9800', text: '#ffe0b0' },
  danger:    { bg: 'rgba(100,20,20,0.92)',   bar: '#f44336', text: '#ffcccc' },
  legendary: { bg: 'rgba(60,50,10,0.95)',    bar: '#ffd700', text: '#fff8dc' },
}

const MAX_TOASTS = 5, TOAST_WIDTH = 280, TOAST_PAD_X = 12, TOAST_PAD_Y = 10
const TOAST_GAP = 8, TOAST_MARGIN_TOP = 60, TOAST_MARGIN_RIGHT = 16
const BAR_WIDTH = 4, CORNER_RADIUS = 6, FADE_IN_MS = 300, FADE_OUT_MS = 400, SLIDE_SPEED = 0.15

const EVENT_TO_TOAST: Partial<Record<EventType, { type: ToastType; icon: string }>> = {
  war: { type: 'danger', icon: '\u2694' }, disaster: { type: 'danger', icon: '\uD83C\uDF0B' },
  death: { type: 'warning', icon: '\uD83D\uDC80' }, combat: { type: 'warning', icon: '\u2694' },
  hero: { type: 'legendary', icon: '\u2B50' }, artifact: { type: 'legendary', icon: '\uD83D\uDC8E' },
  era: { type: 'legendary', icon: '\uD83C\uDFF0' }, building: { type: 'success', icon: '\uD83C\uDFE0' },
  tech: { type: 'success', icon: '\uD83D\uDD2C' }, trade: { type: 'info', icon: '\uD83D\uDCB0' },
  peace: { type: 'info', icon: '\u2618' }, diplomacy: { type: 'info', icon: '\uD83E\uDD1D' },
  civ_founded: { type: 'success', icon: '\uD83C\uDFF3' }, religion: { type: 'info', icon: '\u2721' },
}

// Low-priority events that should not generate toasts
const SUPPRESSED_EVENTS: Set<EventType> = new Set(['birth', 'weather', 'disease', 'mutation', 'world_event'])

// Dedup window: same event type within this ms will be merged
const DEDUP_WINDOW_MS = 3000

export class ToastSystem {
  private toasts: Toast[] = []
  private nextId = 0
  private lastEventTime: Map<string, number> = new Map()

  show(type: ToastType, icon: string, title: string, message: string, duration?: number): void {
    const dur = duration ?? (type === 'legendary' ? 5000 : 3500)
    const now = performance.now()

    // Evict oldest if at capacity
    if (this.toasts.length >= MAX_TOASTS) {
      this.toasts.pop()
    }

    const toast: Toast = {
      id: this.nextId++,
      type, icon, title, message,
      duration: dur,
      createdAt: now,
      alpha: 0,
      y: TOAST_MARGIN_TOP - 20, // start slightly above target for slide-in
      targetY: TOAST_MARGIN_TOP,
    }

    // Push existing toasts down
    this.toasts.unshift(toast)
    this.recalcTargets()
  }

  update(): void {
    const now = performance.now()
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i]
      const age = now - t.createdAt
      const remaining = t.duration - age

      // Alpha: fade in / sustain / fade out
      if (age < FADE_IN_MS) {
        t.alpha = age / FADE_IN_MS
      } else if (remaining > FADE_OUT_MS) {
        t.alpha = 1
      } else if (remaining > 0) {
        t.alpha = remaining / FADE_OUT_MS
      } else {
        this.toasts.splice(i, 1)
        this.recalcTargets()
        continue
      }

      // Smooth slide toward targetY
      t.y += (t.targetY - t.y) * SLIDE_SPEED
    }
  }

  render(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
    if (this.toasts.length === 0) return

    ctx.save()
    const x = canvasWidth - TOAST_WIDTH - TOAST_MARGIN_RIGHT

    for (const t of this.toasts) {
      if (t.alpha <= 0) continue
      const colors = TOAST_COLORS[t.type]
      const h = this.measureHeight(ctx, t)

      ctx.globalAlpha = t.alpha

      // Legendary glow
      if (t.type === 'legendary') {
        ctx.shadowColor = '#ffd700'
        ctx.shadowBlur = 12 + Math.sin(performance.now() * 0.004) * 4
      }

      // Background
      ctx.fillStyle = colors.bg
      this.roundRect(ctx, x, t.y, TOAST_WIDTH, h, CORNER_RADIUS)
      ctx.fill()

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      // Left color bar
      ctx.fillStyle = colors.bar
      this.roundRect(ctx, x, t.y, BAR_WIDTH, h, CORNER_RADIUS, true)
      ctx.fill()

      // Icon
      ctx.font = '16px serif'
      ctx.fillStyle = '#fff'
      ctx.textBaseline = 'top'
      ctx.fillText(t.icon, x + BAR_WIDTH + 8, t.y + TOAST_PAD_Y)

      // Title
      ctx.font = 'bold 12px sans-serif'
      ctx.fillStyle = '#fff'
      ctx.fillText(t.title, x + BAR_WIDTH + 28, t.y + TOAST_PAD_Y + 1)

      // Message
      ctx.font = '11px sans-serif'
      ctx.fillStyle = colors.text
      const lines = this.wrapText(ctx, t.message, TOAST_WIDTH - BAR_WIDTH - 28 - TOAST_PAD_X)
      let ly = t.y + TOAST_PAD_Y + 18
      for (const line of lines) {
        ctx.fillText(line, x + BAR_WIDTH + 28, ly)
        ly += 14
      }
    }

    ctx.globalAlpha = 1
    ctx.restore()
  }

  setupEventListeners(): void {
    EventLog.onEvent((e: WorldEvent) => {
      if (SUPPRESSED_EVENTS.has(e.type)) return

      const mapping = EVENT_TO_TOAST[e.type]
      if (!mapping) return

      // Dedup: skip if same type fired recently
      const now = performance.now()
      const key = e.type
      const last = this.lastEventTime.get(key)
      if (last && now - last < DEDUP_WINDOW_MS) return
      this.lastEventTime.set(key, now)

      // Extract a short title from the event type
      const title = this.eventTitle(e.type)
      // Truncate message if too long
      const msg = e.message.length > 80 ? e.message.slice(0, 77) + '...' : e.message

      this.show(mapping.type, mapping.icon, title, msg)
    })
  }

  // --- private helpers ---

  private recalcTargets(): void {
    let y = TOAST_MARGIN_TOP
    for (const t of this.toasts) {
      t.targetY = y
      // Estimate height (we don't have ctx here, use rough calc)
      y += 48 + TOAST_GAP // base height estimate; render will use actual
    }
  }

  private measureHeight(ctx: CanvasRenderingContext2D, t: Toast): number {
    ctx.font = '11px sans-serif'
    const lines = this.wrapText(ctx, t.message, TOAST_WIDTH - BAR_WIDTH - 28 - TOAST_PAD_X)
    return TOAST_PAD_Y * 2 + 18 + lines.length * 14
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur)
        cur = w
      } else {
        cur = test
      }
    }
    if (cur) lines.push(cur)
    return lines.length ? lines : ['']
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    r: number, leftOnly = false
  ): void {
    const tr = leftOnly ? 0 : r
    const br = leftOnly ? 0 : r
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - tr, y)
    ctx.arcTo(x + w, y, x + w, y + tr, tr)
    ctx.lineTo(x + w, y + h - br)
    ctx.arcTo(x + w, y + h, x + w - br, y + h, br)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }

  private eventTitle(type: EventType): string {
    const t: Partial<Record<EventType, string>> = {
      war: 'War', disaster: 'Disaster', death: 'Death', combat: 'Battle',
      hero: 'Hero Born', artifact: 'Artifact', era: 'New Era',
      building: 'Construction', tech: 'Research', trade: 'Trade',
      peace: 'Peace', diplomacy: 'Diplomacy', civ_founded: 'Civilization', religion: 'Religion',
    }
    return t[type] ?? 'Event'
  }
}
