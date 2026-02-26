/** EnhancedTooltipSystem - rich hover tooltips for creatures, buildings, tiles */
import { EntityManager, PositionComponent, CreatureComponent, NeedsComponent, HeroComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { World } from '../game/World'
import { Camera } from '../game/Camera'

const TILE_NAMES = ['Deep Water', 'Shallow Water', 'Sand', 'Grass', 'Forest', 'Mountain', 'Snow', 'Lava']

export class EnhancedTooltipSystem {
  private el: HTMLDivElement
  private visible = false
  private lastX = -1
  private lastY = -1

  constructor() {
    this.el = document.createElement('div')
    this.el.id = 'enhancedTooltip'
    Object.assign(this.el.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(10,10,30,0.92)', color: '#ddd',
      border: '1px solid #555', borderRadius: '6px',
      padding: '6px 10px', fontSize: '11px', fontFamily: 'monospace',
      zIndex: '200', maxWidth: '220px', lineHeight: '1.5',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    })
    document.body.appendChild(this.el)
  }

  update(
    screenX: number, screenY: number,
    camera: Camera, world: World,
    em: EntityManager, civManager: CivManager
  ): void {
    const wp = camera.screenToWorld(screenX, screenY)
    const wx = Math.floor(wp.x)
    const wy = Math.floor(wp.y)

    if (wx === this.lastX && wy === this.lastY && this.visible) {
      this.position(screenX, screenY)
      return
    }
    this.lastX = wx
    this.lastY = wy

    const tile = world.getTile(wx, wy)
    if (tile === null) {
      this.hide()
      return
    }

    // Build tooltip content using DOM (no innerHTML)
    this.el.textContent = ''

    const creature = this.findCreatureAt(wx, wy, em)
    if (creature) {
      const c = em.getComponent<CreatureComponent>(creature, 'creature')
      if (!c) {
        this.hide()
        return
      }
      const needs = em.getComponent<NeedsComponent>(creature, 'needs')
      const hero = em.getComponent<HeroComponent>(creature, 'hero')

      this.addLine(c.name, '#7ec8e3', true)
      this.addLine(`${c.species} · Age ${c.age}`, '#aaa')

      if (needs) {
        const hpColor = needs.health > 60 ? '#4f4' : needs.health > 30 ? '#ff4' : '#f44'
        this.addLine(`HP ${Math.round(needs.health)} · Hunger ${Math.round(needs.hunger)}`, hpColor)
      }

      if (hero) {
        this.addLine(`★ ${hero.title} Lv.${hero.level}`, '#ffd700')
      }

      const civMember = em.getComponent(creature, 'civMember') as { civId: number } | undefined
      if (civMember) {
        const civ = civManager.civilizations.get(civMember.civId)
        if (civ) this.addLine(`⚑ ${civ.name}`, civ.color)
      }

      this.addLine(`ATK ${c.damage} · SPD ${c.speed.toFixed(1)}`, '#666')
    }

    const building = this.findBuildingAt(wx, wy, em)
    if (building) {
      const b = em.getComponent(building, 'building') as { buildingType?: string; civId?: number } | undefined
      if (b) {
        if (creature) this.addSeparator()
        this.addLine(`🏠 ${b.buildingType || 'Building'}`, '#c8a87e')
        if (b.civId !== undefined) {
          const civ = civManager.civilizations.get(b.civId)
          if (civ) this.addLine(`⚑ ${civ.name}`, civ.color)
        }
      }
    }

    if (creature || building) this.addSeparator()
    this.addLine(`${TILE_NAMES[tile]} (${wx}, ${wy})`, '#888')

    this.show(screenX, screenY)
  }

  hide(): void {
    this.el.style.display = 'none'
    this.visible = false
    this.lastX = -1
    this.lastY = -1
  }

  private addLine(text: string, color: string, bold = false): void {
    const div = document.createElement('div')
    div.textContent = text
    div.style.color = color
    if (bold) div.style.fontWeight = 'bold'
    this.el.appendChild(div)
  }

  private addSeparator(): void {
    const div = document.createElement('div')
    Object.assign(div.style, { borderTop: '1px solid #444', margin: '3px 0' })
    this.el.appendChild(div)
  }

  private show(sx: number, sy: number): void {
    this.el.style.display = 'block'
    this.visible = true
    this.position(sx, sy)
  }

  private position(sx: number, sy: number): void {
    const pad = 15
    const w = this.el.offsetWidth
    const h = this.el.offsetHeight
    let x = sx + pad
    let y = sy + pad
    if (x + w > window.innerWidth) x = sx - w - pad
    if (y + h > window.innerHeight) y = sy - h - pad
    this.el.style.left = x + 'px'
    this.el.style.top = y + 'px'
  }

  private findCreatureAt(wx: number, wy: number, em: EntityManager): number | null {
    const entities = em.getEntitiesWithComponents('position', 'creature')
    let closest: number | null = null
    let closestDist = 1.5
    for (const id of entities) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const dx = pos.x - (wx + 0.5)
      const dy = pos.y - (wy + 0.5)
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < closestDist) {
        closestDist = dist
        closest = id
      }
    }
    return closest
  }

  private findBuildingAt(wx: number, wy: number, em: EntityManager): number | null {
    const entities = em.getEntitiesWithComponents('position', 'building')
    for (const id of entities) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      if (Math.floor(pos.x) === wx && Math.floor(pos.y) === wy) return id
    }
    return null
  }
}
