import { CivManager } from '../civilization/CivManager'
import { TECHNOLOGIES, Technology, TECH_TREE } from '../civilization/Civilization'

const ERA_NAMES: Record<number, string> = {
  1: 'Stone Age',
  2: 'Bronze Age',
  3: 'Iron Age',
  4: 'Medieval',
  5: 'Renaissance',
}

const NODE_W = 80
const NODE_H = 35
const H_GAP = 20
const V_GAP = 50
const LEFT_MARGIN = 90
const TOP_MARGIN = 50

export class TechTreePanel {
  private element: HTMLElement
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private civManager: CivManager
  private selectedCivId: number | null = null
  private visible: boolean = false
  private selectorRow: HTMLElement
  private animTick: number = 0
  // Pre-computed static layout (TECHNOLOGIES is constant)
  private levelGroups: Map<number, Technology[]> = new Map()
  private nodePositions: Map<string, { x: number; y: number }> = new Map()

  constructor(elementId: string, civManager: CivManager) {
    this.element = document.getElementById(elementId)!
    this.civManager = civManager

    // Civ selector row
    this.selectorRow = document.createElement('div')
    this.selectorRow.style.cssText = 'display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap'
    this.element.appendChild(this.selectorRow)

    // Canvas
    this.canvas = document.createElement('canvas')
    this.canvas.width = 480
    this.canvas.height = 340
    this.canvas.style.cssText = 'background:#111;border-radius:6px;width:100%'
    this.element.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')!

    // Pre-compute level groups and node positions (static data)
    for (const tech of TECHNOLOGIES) {
      if (!this.levelGroups.has(tech.level)) this.levelGroups.set(tech.level, [])
      this.levelGroups.get(tech.level)!.push(tech)
    }
    const w = this.canvas.width
    for (let level = 1; level <= 5; level++) {
      const techs = this.levelGroups.get(level) || []
      const totalWidth = techs.length * NODE_W + (techs.length - 1) * H_GAP
      const startX = LEFT_MARGIN + (w - LEFT_MARGIN - totalWidth) / 2
      const y = TOP_MARGIN + (level - 1) * (NODE_H + V_GAP)
      for (let i = 0; i < techs.length; i++) {
        this.nodePositions.set(techs[i].name, { x: startX + i * (NODE_W + H_GAP), y })
      }
    }
  }

  toggle(): void {
    if (this.visible) this.hide()
    else this.show()
  }

  show(): void {
    this.visible = true
    this.element.style.display = 'block'
    // Auto-select first civ if none selected
    if (this.selectedCivId === null || !this.civManager.civilizations.has(this.selectedCivId)) {
      const first = this.civManager.civilizations.keys().next()
      this.selectedCivId = first.done ? null : first.value
    }
    this.render()
  }

  hide(): void {
    this.visible = false
    this.element.style.display = 'none'
  }

  isVisible(): boolean {
    return this.visible
  }

  render(): void {
    this.animTick++
    this.renderCivSelector()
    this.renderTree()
  }

  private renderCivSelector(): void {
    while (this.selectorRow.firstChild) {
      this.selectorRow.removeChild(this.selectorRow.firstChild)
    }

    const label = document.createElement('span')
    label.style.cssText = 'color:#aaa;font-size:10px;line-height:24px;margin-right:4px'
    label.textContent = 'Civilization:'
    this.selectorRow.appendChild(label)

    for (const [id, civ] of this.civManager.civilizations) {
      const btn = document.createElement('button')
      btn.textContent = civ.name
      const isActive = id === this.selectedCivId
      btn.style.cssText = [
        'padding:2px 8px',
        'cursor:pointer',
        'font-size:10px',
        `border:1px solid ${isActive ? civ.color : '#4a4a6a'}`,
        'border-radius:4px',
        `background:${isActive ? civ.color + '33' : '#2a2a4a'}`,
        `color:${isActive ? '#fff' : '#aaa'}`,
      ].join(';')
      btn.addEventListener('click', () => {
        this.selectedCivId = id
        this.render()
      })
      this.selectorRow.appendChild(btn)
    }
  }

  private renderTree(): void {
    const ctx = this.ctx
    const w = this.canvas.width
    const h = this.canvas.height

    ctx.clearRect(0, 0, w, h)

    if (this.selectedCivId === null) {
      ctx.fillStyle = '#888'
      ctx.font = '13px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('No civilizations yet', w / 2, h / 2)
      ctx.textAlign = 'start'
      return
    }

    const civ = this.civManager.civilizations.get(this.selectedCivId)
    if (!civ) return

    const completed = new Set(civ.research.completed)
    const currentTech = civ.research.currentTech
    const progress = civ.research.progress

    const levels = this.levelGroups
    const nodePositions = this.nodePositions

    // Draw dependency lines (connect each tech to all techs in the next level)
    ctx.lineWidth = 1
    for (let level = 1; level < 5; level++) {
      const parentTechs = levels.get(level) || []
      const childTechs = levels.get(level + 1) || []
      for (const parent of parentTechs) {
        const pPos = nodePositions.get(parent.name)
        for (const child of childTechs) {
          const cPos = nodePositions.get(child.name)
          if (!pPos || !cPos) continue
          const bothDone = completed.has(parent.name) && completed.has(child.name)
          ctx.strokeStyle = bothDone ? 'rgba(46,204,113,0.4)' : 'rgba(100,100,120,0.3)'
          ctx.beginPath()
          ctx.moveTo(pPos.x + NODE_W / 2, pPos.y + NODE_H)
          ctx.lineTo(cPos.x + NODE_W / 2, cPos.y)
          ctx.stroke()
        }
      }
    }

    // Draw era labels on the left
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'right'
    for (let level = 1; level <= 5; level++) {
      const y = TOP_MARGIN + (level - 1) * (NODE_H + V_GAP) + NODE_H / 2
      const eraName = ERA_NAMES[level] || `Level ${level}`
      const isCurrentEra = civ.techLevel === level
      ctx.fillStyle = isCurrentEra ? '#f1c40f' : '#666'
      ctx.fillText(eraName, LEFT_MARGIN - 10, y + 4)
    }
    ctx.textAlign = 'start'

    // Draw tech nodes
    for (const tech of TECHNOLOGIES) {
      const pos = nodePositions.get(tech.name)
      if (!pos) continue
      const isDone = completed.has(tech.name)
      const isResearching = currentTech === tech.name

      // Node background color
      let bgColor = '#555'
      if (isDone) {
        bgColor = '#2ecc71'
      } else if (isResearching) {
        // Pulsing yellow
        const pulse = Math.sin(this.animTick * 0.15) * 0.3 + 0.7
        bgColor = `rgba(241,196,15,${pulse})`
      }

      // Rounded rect
      ctx.fillStyle = bgColor
      ctx.beginPath()
      this.roundRect(ctx, pos.x, pos.y, NODE_W, NODE_H, 6)
      ctx.fill()

      // Border
      ctx.strokeStyle = isDone ? '#27ae60' : isResearching ? '#f39c12' : '#444'
      ctx.lineWidth = isDone || isResearching ? 2 : 1
      ctx.beginPath()
      this.roundRect(ctx, pos.x, pos.y, NODE_W, NODE_H, 6)
      ctx.stroke()

      // Tech name text
      ctx.fillStyle = isDone || isResearching ? '#fff' : '#999'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(tech.name, pos.x + NODE_W / 2, pos.y + NODE_H / 2 + 4, NODE_W - 8)

      // Progress bar under researching node
      if (isResearching) {
        const barY = pos.y + NODE_H + 3
        const barW = NODE_W
        const barH = 5
        // Background
        ctx.fillStyle = '#333'
        ctx.beginPath()
        this.roundRect(ctx, pos.x, barY, barW, barH, 2)
        ctx.fill()
        // Fill
        ctx.fillStyle = '#f1c40f'
        ctx.beginPath()
        this.roundRect(ctx, pos.x, barY, barW * (progress / 100), barH, 2)
        ctx.fill()
        // Percentage text
        ctx.fillStyle = '#fff'
        ctx.font = '8px sans-serif'
        ctx.fillText(`${Math.round(progress)}%`, pos.x + NODE_W / 2, barY + barH + 10)
      }
    }

    ctx.textAlign = 'start'

    // Title bar at top
    ctx.fillStyle = '#ccc'
    ctx.font = 'bold 12px sans-serif'
    const civObj = this.civManager.civilizations.get(this.selectedCivId)
    if (civObj) {
      const eraName = TECH_TREE[civObj.techLevel]?.name ?? `Level ${civObj.techLevel}`
      ctx.fillText(`${civObj.name} - Tech Tree (${eraName})`, 10, 16)

      // Completed count
      const totalTechs = TECHNOLOGIES.length
      const doneTechs = civObj.research.completed.length
      ctx.fillStyle = '#888'
      ctx.font = '10px sans-serif'
      ctx.fillText(`${doneTechs}/${totalTechs} researched`, 10, 32)
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }
}
