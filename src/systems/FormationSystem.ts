import { EntityManager, PositionComponent } from '../ecs/Entity'
import { TILE_SIZE } from '../utils/Constants'
import { World } from '../game/World'

export type FormationType = 'line' | 'wedge' | 'circle' | 'square' | 'scatter'

export interface Formation {
  id: number
  civId: number
  type: FormationType
  centerX: number
  centerY: number
  members: number[]  // entity IDs
  morale: number     // 0-100
  facing: number     // radians
}

export interface FormationBonus {
  attack: number
  defense: number
  speed: number
}

const FORMATION_BONUSES: Record<FormationType, FormationBonus> = {
  line:    { attack: 1.2, defense: 1.1, speed: 1.0 },
  wedge:   { attack: 1.3, defense: 1.0, speed: 1.1 },
  circle:  { attack: 1.0, defense: 1.3, speed: 1.0 },
  square:  { attack: 1.1, defense: 1.2, speed: 1.0 },
  scatter: { attack: 1.0, defense: 0.9, speed: 1.2 },
}

const UNIT_SPACING = TILE_SIZE * 1.5
const MORALE_DECAY_RATE = 0.005
const MORALE_RECOVERY_RATE = 0.02
const MORALE_MIN = 0
const MORALE_MAX = 100

export class FormationSystem {
  private formations: Map<number, Formation> = new Map()
  private nextId = 1
  private _lastZoom = -1
  private _iconFont = ''
  private _formationsBuf: Formation[] = []

  createFormation(civId: number, type: FormationType, members: number[]): number {
    if (members.length === 0) return -1
    const id = this.nextId++
    this.formations.set(id, {
      id,
      civId,
      type,
      centerX: 0,
      centerY: 0,
      members: [...members],
      morale: MORALE_MAX,
      facing: 0,
    })
    return id
  }

  dissolveFormation(id: number): void {
    this.formations.delete(id)
  }

  setFormationType(id: number, type: FormationType): void {
    const f = this.formations.get(id)
    if (f) f.type = type
  }

  update(em: EntityManager, _world: World, _tick: number): void {
    for (const f of this.formations.values()) {
      // Remove dead members (entities that no longer exist in the EntityManager)
      for (let i = f.members.length - 1; i >= 0; i--) {
        if (!em.hasComponent(f.members[i], 'position')) f.members.splice(i, 1)
      }

      // Auto-dissolve if too few members remain
      if (f.members.length === 0) {
        this.formations.delete(f.id)
        continue
      }

      // Compute center position from living members
      let sumX = 0
      let sumY = 0
      let count = 0
      for (const eid of f.members) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (pos) {
          sumX += pos.x
          sumY += pos.y
          count++
        }
      }
      if (count > 0) {
        f.centerX = sumX / count
        f.centerY = sumY / count
      }

      // Compute facing from center toward the average forward direction
      // Use the first member as the "leader" reference for facing
      if (f.members.length >= 2) {
        const leaderPos = em.getComponent<PositionComponent>(f.members[0], 'position')
        if (leaderPos) {
          const dx = leaderPos.x - f.centerX
          const dy = leaderPos.y - f.centerY
          if (dx !== 0 || dy !== 0) {
            f.facing = Math.atan2(dy, dx)
          }
        }
      }

      // Calculate target positions for each member and nudge them toward it
      for (let i = 0; i < f.members.length; i++) {
        const target = this.calcMemberTarget(f, i)
        const pos = em.getComponent<PositionComponent>(f.members[i], 'position')
        if (pos && target) {
          const dx = target.x - pos.x
          const dy = target.y - pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 1) {
            const step = Math.min(dist, 0.5)
            pos.x += (dx / dist) * step
            pos.y += (dy / dist) * step
          }
        }
      }

      // Update morale: decay in combat (members with low health), recover otherwise
      let inCombat = false
      for (const eid of f.members) {
        const needs = em.getComponent<{ type: string; health: number }>(eid, 'needs')
        if (needs && needs.health < 50) {
          inCombat = true
          break
        }
      }

      if (inCombat) {
        f.morale = Math.max(MORALE_MIN, f.morale - MORALE_DECAY_RATE * 100)
      } else {
        f.morale = Math.min(MORALE_MAX, f.morale + MORALE_RECOVERY_RATE * 10)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, zoom: number): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._iconFont = `${Math.max(8, 10 * zoom)}px monospace`
    }
    for (const f of this.formations.values()) {
      const sx = (f.centerX * TILE_SIZE - cameraX) * zoom
      const sy = (f.centerY * TILE_SIZE - cameraY) * zoom

      ctx.save()

      // Render formation outline
      const positions: { x: number; y: number }[] = []
      for (let i = 0; i < f.members.length; i++) {
        const target = this.calcMemberTarget(f, i)
        if (target) {
          positions.push({
            x: (target.x * TILE_SIZE - cameraX) * zoom,
            y: (target.y * TILE_SIZE - cameraY) * zoom,
          })
        }
      }

      ctx.globalAlpha = 0.35
      ctx.strokeStyle = f.morale > 50 ? '#4fc3f7' : '#ff8a65'
      ctx.lineWidth = 1.5

      if (positions.length > 1 && f.type !== 'scatter') {
        ctx.beginPath()
        if (f.type === 'circle') {
          const radius = Math.max(UNIT_SPACING, f.members.length * UNIT_SPACING / (2 * Math.PI)) * TILE_SIZE * zoom
          ctx.arc(sx, sy, radius, 0, Math.PI * 2)
        } else {
          ctx.moveTo(positions[0].x, positions[0].y)
          for (let i = 1; i < positions.length; i++) {
            ctx.lineTo(positions[i].x, positions[i].y)
          }
          ctx.closePath()
        }
        ctx.stroke()
      }

      // Formation type icon (small label)
      ctx.globalAlpha = 0.8
      ctx.fillStyle = '#fff'
      ctx.font = this._iconFont
      ctx.textAlign = 'center'
      const icons: Record<FormationType, string> = {
        line: '=',
        wedge: 'V',
        circle: 'O',
        square: '#',
        scatter: '~',
      }
      ctx.fillText(icons[f.type], sx, sy - 10 * zoom)

      // Morale bar
      const barW = 24 * zoom
      const barH = 3 * zoom
      const barX = sx - barW / 2
      const barY = sy - 6 * zoom
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#333'
      ctx.fillRect(barX, barY, barW, barH)
      const moraleRatio = f.morale / MORALE_MAX
      ctx.fillStyle = moraleRatio > 0.5 ? '#4caf50' : moraleRatio > 0.25 ? '#ff9800' : '#f44336'
      ctx.fillRect(barX, barY, barW * moraleRatio, barH)

      // Facing direction arrow
      ctx.globalAlpha = 0.6
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      const arrowLen = 14 * zoom
      const ax = sx + Math.cos(f.facing) * arrowLen
      const ay = sy + Math.sin(f.facing) * arrowLen
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ax, ay)
      ctx.stroke()

      const headLen = 4 * zoom
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(ax - Math.cos(f.facing - 0.4) * headLen, ay - Math.sin(f.facing - 0.4) * headLen)
      ctx.moveTo(ax, ay)
      ctx.lineTo(ax - Math.cos(f.facing + 0.4) * headLen, ay - Math.sin(f.facing + 0.4) * headLen)
      ctx.stroke()

      ctx.restore()
    }
  }

  getFormationBonus(id: number): { attack: number; defense: number; speed: number } {
    const f = this.formations.get(id)
    if (!f) return { attack: 1, defense: 1, speed: 1 }
    const base = FORMATION_BONUSES[f.type]
    // Scale bonus by morale: at 0 morale bonuses are reduced to 70%
    const moraleScale = 0.7 + 0.3 * (f.morale / MORALE_MAX)
    return {
      attack: base.attack * moraleScale,
      defense: base.defense * moraleScale,
      speed: base.speed,
    }
  }

  getFormations(): Formation[] {
    this._formationsBuf.length = 0
    for (const f of this.formations.values()) this._formationsBuf.push(f)
    return this._formationsBuf
  }

  getFormationForEntity(entityId: number): Formation | null {
    for (const f of this.formations.values()) {
      if (f.members.includes(entityId)) return f
    }
    return null
  }

  // --- Internal helpers ---

  private calcMemberTarget(f: Formation, index: number): { x: number; y: number } | null {
    const count = f.members.length
    if (count === 0) return null

    const cos = Math.cos(f.facing)
    const sin = Math.sin(f.facing)
    let lx = 0
    let ly = 0

    switch (f.type) {
      case 'line': {
        // Members in a row perpendicular to facing
        const half = (count - 1) / 2
        lx = 0
        ly = (index - half) * UNIT_SPACING
        break
      }
      case 'wedge': {
        // V-shape, leader at front
        if (index === 0) {
          lx = 0
          ly = 0
        } else {
          const row = Math.ceil(index / 2)
          const side = index % 2 === 1 ? -1 : 1
          lx = -row * UNIT_SPACING
          ly = side * row * UNIT_SPACING * 0.6
        }
        break
      }
      case 'circle': {
        if (count === 1) {
          lx = 0
          ly = 0
        } else {
          const angle = (2 * Math.PI * index) / count
          const radius = Math.max(UNIT_SPACING, count * UNIT_SPACING / (2 * Math.PI))
          lx = Math.cos(angle) * radius
          ly = Math.sin(angle) * radius
        }
        break
      }
      case 'square': {
        const cols = Math.ceil(Math.sqrt(count))
        const row = Math.floor(index / cols)
        const col = index % cols
        const rows = Math.ceil(count / cols)
        const halfC = (cols - 1) / 2
        const halfR = (rows - 1) / 2
        lx = -(row - halfR) * UNIT_SPACING
        ly = (col - halfC) * UNIT_SPACING
        break
      }
      case 'scatter': {
        // Deterministic pseudo-random spread
        const seed = f.id * 1000 + index
        const pseudoRand = (n: number) => ((Math.sin(n) * 43758.5453) % 1 + 1) % 1 - 0.5
        const spread = Math.max(UNIT_SPACING * 2, count * 2)
        lx = pseudoRand(seed) * spread
        ly = pseudoRand(seed + 7) * spread
        break
      }
    }

    // Rotate by facing and offset from center
    return {
      x: f.centerX + lx * cos - ly * sin,
      y: f.centerY + lx * sin + ly * cos,
    }
  }
}
