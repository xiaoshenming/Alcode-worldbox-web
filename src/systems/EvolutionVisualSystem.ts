/** EvolutionVisualSystem - species evolution tree, mutation notifications, stat cards, timeline. */

export interface EvolutionNode {
  id: number
  species: string
  parentId: number | null
  appearTick: number
  population: number
  avgTraits: Record<string, number>
  mutations: string[]
  traitStr?: string  // pre-computed top-3 trait display string
  nodeInfoStr?: string  // pre-computed "pop:X t:Y" display string
}

export interface EvolutionEvent {
  tick: number
  species: string
  mutation: string
  description: string
}

interface LayoutNode { node: EvolutionNode; x: number; y: number; children: LayoutNode[] }
interface MutationNotif { event: EvolutionEvent; startTick: number; alpha: number; speciesMutStr: string }

const COLORS: Record<string, string> = { human: '#4488ff', elf: '#44cc66', dwarf: '#aa7744', orc: '#dd4444' }
const BG = 'rgba(10,10,20,0.88)', BORDER = 'rgba(100,140,255,0.5)'
const TXT = '#dde', DIM = '#889', CARD_BG = 'rgba(30,30,50,0.9)'
const NOTIF_DUR = 90, MAX_NOTIF = 3
const NW = 100, NH = 36, LVLGAP = 56, SIBGAP = 16, TL_H = 40

function col(s: string): string { return COLORS[s] ?? '#aaa' }
function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v }

export class EvolutionVisualSystem {
  private nodes: Map<number, EvolutionNode> = new Map()
  private events: EvolutionEvent[] = []
  private notifs: MutationNotif[] = []
  private visible = false
  private scrollY = 0
  private pr = { x: 0, y: 0, w: 0, h: 0 }
  private tlZoom = 1
  // Cached stat card map — cleared and reused each render call to avoid per-frame new Map()
  private _smCache = new Map<string, { total: number; nodes: EvolutionNode[]; totalStr: string; totalDisplayStr: string; evoStr: string; speciesUpper: string }>()
  /** Pre-computed min tick for timeline — updated in pushEvent, avoids O(N) scan each render */
  private _minT = Infinity
  private _minTStr = ''
  /** Pre-computed max tick for timeline — updated in pushEvent, avoids O(N) scan each render */
  private _maxT = -Infinity
  /** Pre-computed max-end tick string for timeline — rebuilt when maxT or zoom changes */
  private _prevMaxTEnd = -1
  private _maxTEndStr = ''
  /** Cached tree layout — rebuilt only when nodes change via addNode/updatePopulation */
  private _layoutDirty = true
  private _layoutCache: LayoutNode[] = []

  addNode(node: EvolutionNode): void {
    const stored = { ...node }
    // Pre-compute top-3 trait display string to avoid toFixed(0) in render loop
    const entries = Object.entries(node.avgTraits)
    let ts = ''
    const len = Math.min(3, entries.length)
    for (let ti = 0; ti < len; ti++) {
      if (ti > 0) ts += ' '
      ts += `${entries[ti][0].slice(0, 3)}:${entries[ti][1].toFixed(0)}`
    }
    stored.traitStr = ts
    stored.nodeInfoStr = `pop:${node.population} t:${node.appearTick}`
    this.nodes.set(node.id, stored)
    this._layoutDirty = true
  }

  updatePopulation(nodeId: number, population: number): void {
    const n = this.nodes.get(nodeId)
    if (n) {
      n.population = population
      n.nodeInfoStr = `pop:${population} t:${n.appearTick}`
      this._layoutDirty = true
    }
  }

  pushEvent(event: EvolutionEvent): void {
    this.events.push(event)
    if (event.tick < this._minT) { this._minT = event.tick; this._minTStr = `t:${event.tick}` }
    if (event.tick > this._maxT) { this._maxT = event.tick }
    if (this.notifs.length >= MAX_NOTIF) this.notifs.shift()
    this.notifs.push({ event, startTick: -1, alpha: 1, speciesMutStr: `${event.species}: ${event.mutation}` })
  }

  toggle(): void { this.visible = !this.visible }
  isVisible(): boolean { return this.visible }

  update(tick: number): void {
    for (let i = this.notifs.length - 1; i >= 0; i--) {
      const n = this.notifs[i]
      if (n.startTick < 0) n.startTick = tick
      const el = tick - n.startTick
      if (el >= NOTIF_DUR) { this.notifs.splice(i, 1); continue }
      if (el > NOTIF_DUR - 30) n.alpha = (NOTIF_DUR - el) / 30
    }
  }

  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    this.renderNotifs(ctx, screenWidth, screenHeight)
    if (!this.visible) return
    const pw = Math.min(720, screenWidth - 40), ph = Math.min(560, screenHeight - 40)
    const px = (screenWidth - pw) / 2, py = (screenHeight - ph) / 2
    const pr = this.pr; pr.x = px; pr.y = py; pr.w = pw; pr.h = ph
    ctx.save()
    // Panel bg
    ctx.fillStyle = BG
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 8); ctx.fill()
    ctx.strokeStyle = BORDER; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 8); ctx.stroke()
    // Title
    ctx.fillStyle = TXT; ctx.font = 'bold 15px monospace'; ctx.textBaseline = 'top'
    ctx.fillText('Evolution Tree', px + 14, py + 10)
    // Clip content
    const cY = py + 32, cH = ph - 32 - TL_H - 8
    ctx.save(); ctx.beginPath(); ctx.rect(px + 4, cY, pw - 8, cH); ctx.clip()
    this.renderTree(ctx, px + 4, cY)
    this.renderCards(ctx, px + pw - 180, cY + 4, 172, cH - 8)
    ctx.restore()
    // Timeline
    this.renderTimeline(ctx, px + 8, py + ph - TL_H - 4, pw - 16, TL_H)
    ctx.restore()
  }

  handleClick(x: number, y: number): boolean {
    if (!this.visible) return false
    const { x: px, y: py, w: pw, h: ph } = this.pr
    if (x < px || x > px + pw || y < py || y > py + ph) { this.visible = false; return true }
    return true
  }

  // --- Tree layout & render ---

  private buildLayout(): LayoutNode[] {
    const cm = new Map<number | null, EvolutionNode[]>()
    for (const nd of this.nodes.values()) {
      if (!cm.has(nd.parentId)) cm.set(nd.parentId, [])
      const group = cm.get(nd.parentId)
      if (group) group.push(nd)
    }
    const build = (pid: number | null, d: number, xo: number): { r: LayoutNode[]; w: number } => {
      const ch = cm.get(pid) ?? []
      if (!ch.length) return { r: [], w: 0 }
      const res: LayoutNode[] = []
      let tw = 0
      for (const c of ch) {
        const sub = build(c.id, d + 1, xo + tw)
        const nw = Math.max(NW, sub.w)
        res.push({ node: c, x: xo + tw + nw / 2 - NW / 2, y: d * LVLGAP, children: sub.r })
        tw += nw + SIBGAP
      }
      if (tw > 0) tw -= SIBGAP
      return { r: res, w: tw }
    }
    return build(null, 0, 0).r
  }

  private renderTree(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    if (this._layoutDirty) { this._layoutCache = this.buildLayout(); this._layoutDirty = false }
    const roots = this._layoutCache
    if (!roots.length) {
      ctx.fillStyle = DIM; ctx.font = '12px monospace'
      ctx.fillText('No evolution data yet', ox + 12, oy + 24)
      return
    }
    const draw = (ln: LayoutNode): void => {
      const nx = ox + ln.x + 10, ny = oy + ln.y + 4 - this.scrollY
      const c = col(ln.node.species)
      // Lines to children
      ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5
      for (const ch of ln.children) {
        ctx.beginPath()
        ctx.moveTo(nx + NW / 2, ny + NH)
        ctx.lineTo(ox + ch.x + 10 + NW / 2, oy + ch.y + 4 - this.scrollY)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      // Node box
      ctx.fillStyle = CARD_BG
      ctx.beginPath(); ctx.roundRect(nx, ny, NW, NH, 4); ctx.fill()
      ctx.strokeStyle = c; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.roundRect(nx, ny, NW, NH, 4); ctx.stroke()
      // Text
      ctx.fillStyle = c; ctx.font = 'bold 10px monospace'; ctx.textBaseline = 'top'
      ctx.fillText(ln.node.species, nx + 4, ny + 3)
      ctx.fillStyle = DIM; ctx.font = '9px monospace'
      ctx.fillText(ln.node.nodeInfoStr!, nx + 4, ny + 18)
      for (const ch of ln.children) draw(ch)
    }
    for (const r of roots) draw(r)
  }

  // --- Stat cards ---

  private renderCards(ctx: CanvasRenderingContext2D, ox: number, oy: number, w: number, maxH: number): void {
    const sm = this._smCache
    // Reset cached entries without allocating new objects
    for (const entry of sm.values()) { entry.total = 0; entry.nodes.length = 0; entry.evoStr = '' }
    for (const nd of this.nodes.values()) {
      let e = sm.get(nd.species)
      if (!e) { e = { total: 0, nodes: [], totalStr: '0', totalDisplayStr: 'Total: 0', evoStr: '', speciesUpper: nd.species.toUpperCase() }; sm.set(nd.species, e) }
      e.total += nd.population; e.nodes.push(nd)
    }
    // Pre-compute totalStr after accumulation
    for (const entry of sm.values()) {
      entry.totalStr = String(entry.total)
      entry.totalDisplayStr = `Total: ${entry.totalStr}`
      let evo = 0; for (const n of entry.nodes) evo += n.mutations.length
      entry.evoStr = `Evolutions: ${evo}`
    }
    let cy = oy
    for (const [sp, data] of sm) {
      if (cy - oy > maxH - 60) break
      const c = col(sp), cardH = 56
      ctx.fillStyle = CARD_BG
      ctx.beginPath(); ctx.roundRect(ox, cy, w, cardH, 4); ctx.fill()
      ctx.strokeStyle = c; ctx.lineWidth = 1
      ctx.beginPath(); ctx.roundRect(ox, cy, w, cardH, 4); ctx.stroke()
      ctx.fillStyle = c; ctx.font = 'bold 10px monospace'; ctx.textBaseline = 'top'
      ctx.fillText(data.speciesUpper, ox + 6, cy + 4)
      ctx.fillStyle = TXT; ctx.font = '9px monospace'
      ctx.fillText(data.totalDisplayStr, ox + 6, cy + 18)
      ctx.fillStyle = DIM
      // 手动拼接前3个trait，消除slice+map+join临时数组
      let traitStr = data.nodes[0].traitStr ?? ''
      if (!traitStr) {
        const traits = Object.entries(data.nodes[0].avgTraits)
        for (let ti = 0; ti < Math.min(3, traits.length); ti++) {
          if (ti > 0) traitStr += ' '
          traitStr += `${traits[ti][0].slice(0, 3)}:${traits[ti][1].toFixed(0)}`
        }
      }
      ctx.fillText(traitStr, ox + 6, cy + 32)
      ctx.fillText(data.evoStr, ox + 6, cy + 44)
      cy += cardH + 6
    }
  }

  // --- Mutation notifications + DNA helix ---

  private renderNotifs(ctx: CanvasRenderingContext2D, sw: number, sh: number): void {
    if (!this.notifs.length) return
    ctx.save()
    for (let i = 0; i < this.notifs.length; i++) {
      const n = this.notifs[i]
      if (n.startTick < 0 && n.alpha <= 0) continue
      const cx = sw / 2, cy = sh * 0.25 + i * 80
      ctx.globalAlpha = clamp(n.alpha, 0, 1)
      const c = col(n.event.species)
      this.drawHelix(ctx, cx, cy, n)
      ctx.fillStyle = c; ctx.font = 'bold 18px monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Evolution!', cx, cy - 20)
      ctx.fillStyle = TXT; ctx.font = '12px monospace'
      ctx.fillText(n.speciesMutStr, cx, cy + 4)
      ctx.fillStyle = DIM; ctx.font = '10px monospace'
      ctx.fillText(n.event.description, cx, cy + 20)
    }
    ctx.textAlign = 'left'
    ctx.restore()
  }

  private drawHelix(ctx: CanvasRenderingContext2D, cx: number, cy: number, n: MutationNotif): void {
    const phase = (n.startTick >= 0 ? (n.alpha < 1 ? NOTIF_DUR - 30 : 0) : 0) * 0.1 % (Math.PI * 2)
    const hw = 60, hh = 50, steps = 20
    const c = col(n.event.species)
    // Strand 1
    ctx.lineWidth = 2; ctx.strokeStyle = c; ctx.beginPath()
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, a = t * Math.PI * 4 + phase
      const px = cx - hw / 2 + t * hw, py = cy + Math.sin(a) * hh / 4
      s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()
    // Strand 2
    ctx.globalAlpha = clamp(n.alpha * 0.6, 0, 1); ctx.beginPath()
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, a = t * Math.PI * 4 + phase + Math.PI
      const px = cx - hw / 2 + t * hw, py = cy + Math.sin(a) * hh / 4
      s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()
    // Base pairs
    ctx.globalAlpha = clamp(n.alpha * 0.3, 0, 1)
    ctx.strokeStyle = TXT; ctx.lineWidth = 1
    for (let s = 0; s <= steps; s += 4) {
      const t = s / steps, a = t * Math.PI * 4 + phase
      const px = cx - hw / 2 + t * hw
      ctx.beginPath()
      ctx.moveTo(px, cy + Math.sin(a) * hh / 4)
      ctx.lineTo(px, cy + Math.sin(a + Math.PI) * hh / 4)
      ctx.stroke()
    }
    ctx.globalAlpha = clamp(n.alpha, 0, 1)
  }

  // --- Timeline ---

  private renderTimeline(ctx: CanvasRenderingContext2D, ox: number, oy: number, w: number, h: number): void {
    if (!this.events.length) return
    ctx.save()
    ctx.fillStyle = 'rgba(20,20,40,0.8)'
    ctx.beginPath(); ctx.roundRect(ox, oy, w, h, 4); ctx.fill()
    const minT = this._minT
    const maxT = this._maxT
    const range = Math.max(1, (maxT - minT) * this.tlZoom)
    const ay = oy + h / 2, uw = w - 16
    ctx.strokeStyle = DIM; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(ox + 4, ay); ctx.lineTo(ox + w - 4, ay); ctx.stroke()
    for (const e of this.events) {
      const t = (e.tick - minT) / range
      if (t < 0 || t > 1) continue
      const ex = ox + 8 + t * uw
      ctx.fillStyle = col(e.species)
      ctx.beginPath()
      ctx.moveTo(ex, ay - 6); ctx.lineTo(ex + 4, ay)
      ctx.lineTo(ex, ay + 6); ctx.lineTo(ex - 4, ay)
      ctx.closePath(); ctx.fill()
    }
    ctx.fillStyle = DIM; ctx.font = '8px monospace'; ctx.textBaseline = 'top'
    ctx.textAlign = 'left'; ctx.fillText(this._minTStr, ox + 4, oy + h - 12)
    const maxTEnd = Math.round(minT + range)
    if (maxTEnd !== this._prevMaxTEnd) { this._prevMaxTEnd = maxTEnd; this._maxTEndStr = `t:${maxTEnd}` }
    ctx.textAlign = 'right'; ctx.fillText(this._maxTEndStr, ox + w - 4, oy + h - 12)
    ctx.textAlign = 'left'
    ctx.restore()
  }
}
