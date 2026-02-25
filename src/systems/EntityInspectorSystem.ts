/** EntityInspectorSystem — detailed entity property tree panel for debugging/inspection. */

interface PropNode {
  key: string
  value: string
  children: PropNode[]
  expanded: boolean
}

const PANEL_W = 320
const PANEL_PAD = 10
const ROW_H = 20
const HEADER_H = 32
const MAX_ROWS = 20

export class EntityInspectorSystem {
  private panelOpen = false
  private entityId: number | null = null
  private tree: PropNode[] = []
  private scrollOffset = 0

  togglePanel(): void { this.panelOpen = !this.panelOpen }
  isPanelOpen(): boolean { return this.panelOpen }

  /** Set the entity to inspect. Pass components as key-value record. */
  inspect(entityId: number, components: Record<string, Record<string, unknown>>): void {
    this.entityId = entityId
    this.tree = this.buildTree(components)
    this.scrollOffset = 0
    this.panelOpen = true
  }

  /** Close inspector. */
  close(): void {
    this.panelOpen = false
    this.entityId = null
    this.tree = []
  }

  /** Toggle expand/collapse of a node at given flat index. */
  toggleNode(flatIdx: number): void {
    let count = 0
    const toggle = (nodes: PropNode[]): boolean => {
      for (const n of nodes) {
        if (count === flatIdx) { n.expanded = !n.expanded; return true }
        count++
        if (n.expanded && n.children.length > 0) {
          if (toggle(n.children)) return true
        }
      }
      return false
    }
    toggle(this.tree)
  }

  handleClick(mx: number, my: number, screenW: number, _screenH: number): boolean {
    if (!this.panelOpen) return false
    const px = screenW - PANEL_W - 20, py = 60
    if (mx < px || mx > px + PANEL_W) return false

    // Close button
    if (mx > px + PANEL_W - 24 && my >= py && my <= py + HEADER_H) {
      this.close()
      return true
    }

    // Row click → toggle
    const rowY = my - py - HEADER_H + this.scrollOffset
    if (rowY >= 0) {
      const idx = Math.floor(rowY / ROW_H)
      this.toggleNode(idx)
      return true
    }
    return true
  }

  handleScroll(delta: number): void {
    if (!this.panelOpen) return
    this.scrollOffset = Math.max(0, this.scrollOffset + delta * 20)
  }

  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.panelOpen || this.entityId === null) return

    const flatRows = this.flatten(this.tree)
    const visibleRows = Math.min(flatRows.length, MAX_ROWS)
    const ph = HEADER_H + visibleRows * ROW_H + PANEL_PAD
    const px = screenW - PANEL_W - 20
    const py = 60

    ctx.save()

    // Panel bg
    ctx.fillStyle = 'rgba(12,14,22,0.94)'
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(px, py, PANEL_W, Math.min(ph, screenH - 80), 6)
    ctx.fill()
    ctx.stroke()

    // Header
    ctx.fillStyle = '#ddd'
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`Entity #${this.entityId}`, px + PANEL_PAD, py + HEADER_H / 2)

    // Close btn
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.textAlign = 'right'
    ctx.fillText('✕', px + PANEL_W - PANEL_PAD, py + HEADER_H / 2)

    // Rows (clipped)
    ctx.beginPath()
    ctx.rect(px, py + HEADER_H, PANEL_W, Math.min(visibleRows * ROW_H, screenH - 80 - HEADER_H))
    ctx.clip()

    ctx.textAlign = 'left'
    ctx.font = '10px monospace'
    let ry = py + HEADER_H - this.scrollOffset
    for (const row of flatRows) {
      if (ry + ROW_H < py + HEADER_H) { ry += ROW_H; continue }
      if (ry > py + ph) break

      const indent = row.depth * 12 + PANEL_PAD
      const hasChildren = row.node.children.length > 0

      // Expand indicator
      if (hasChildren) {
        ctx.fillStyle = '#4fc3f7'
        ctx.fillText(row.node.expanded ? '▼' : '▶', px + indent - 10, ry + ROW_H / 2)
      }

      // Key
      ctx.fillStyle = '#8bb8e8'
      ctx.fillText(row.node.key, px + indent, ry + ROW_H / 2)

      // Value (if leaf)
      if (!hasChildren) {
        const keyW = ctx.measureText(row.node.key + ': ').width
        ctx.fillStyle = '#ccc'
        const valText = row.node.value.length > 30 ? row.node.value.slice(0, 30) + '...' : row.node.value
        ctx.fillText(': ' + valText, px + indent + keyW - 2, ry + ROW_H / 2)
      }

      ry += ROW_H
    }

    ctx.restore()
  }

  private buildTree(obj: Record<string, unknown>, depth = 0): PropNode[] {
    const nodes: PropNode[] = []
    for (const [key, val] of Object.entries(obj)) {
      if (val === null || val === undefined) {
        nodes.push({ key, value: String(val), children: [], expanded: false })
      } else if (typeof val === 'object' && !Array.isArray(val)) {
        nodes.push({
          key,
          value: '',
          children: this.buildTree(val as Record<string, unknown>, depth + 1),
          expanded: depth < 1,
        })
      } else if (Array.isArray(val)) {
        const children = val.slice(0, 10).map((item, i) => {
          if (typeof item === 'object' && item !== null) {
            return { key: `[${i}]`, value: '', children: this.buildTree(item as Record<string, unknown>, depth + 2), expanded: false }
          }
          return { key: `[${i}]`, value: String(item), children: [], expanded: false }
        })
        nodes.push({ key: `${key} (${val.length})`, value: '', children, expanded: false })
      } else {
        nodes.push({ key, value: String(val), children: [], expanded: false })
      }
    }
    return nodes
  }

  private flatten(nodes: PropNode[], depth = 0): Array<{ node: PropNode; depth: number }> {
    const result: Array<{ node: PropNode; depth: number }> = []
    for (const n of nodes) {
      result.push({ node: n, depth })
      if (n.expanded && n.children.length > 0) {
        result.push(...this.flatten(n.children, depth + 1))
      }
    }
    return result
  }
}
