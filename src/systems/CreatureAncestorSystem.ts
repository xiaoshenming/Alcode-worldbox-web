// Creature Ancestor System (v2.16) - Creatures worship legendary ancestors
// Dead heroes become ancestor spirits that buff their descendants and civilization

import { EntityManager, EntityId, PositionComponent, CreatureComponent, NeedsComponent } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'
import { EventLog } from './EventLog'

export interface AncestorSpirit {
  id: number
  name: string
  species: string
  civId: number
  x: number
  y: number
  power: number           // 0.1 - 1.0
  domain: AncestorDomain
  worshippers: number
  createdTick: number
  shrineBuilt: boolean
}

export type AncestorDomain = 'valor' | 'harvest' | 'healing' | 'craft' | 'wisdom'

type CivLike = { id: number; name: string; resources: { gold: number } }
type CivManagerLike = { civilizations: Map<number, CivLike> }

const CHECK_INTERVAL = 800
const BUFF_INTERVAL = 500
const BUFF_RADIUS = 20
const MAX_ANCESTORS_PER_CIV = 3
const MAX_TOTAL = 15
const WORSHIP_THRESHOLD = 5
const DOMAINS: AncestorDomain[] = ['valor', 'harvest', 'healing', 'craft', 'wisdom']

const DOMAIN_COLORS: Record<AncestorDomain, string> = {
  valor: '#f55',
  harvest: '#8c4',
  healing: '#5cf',
  craft: '#fa0',
  wisdom: '#c8f',
}

let nextAncestorId = 1

export class CreatureAncestorSystem {
  private ancestors: AncestorSpirit[] = []
  private nextCheckTick = CHECK_INTERVAL
  private nextBuffTick = BUFF_INTERVAL
  private deadHeroes: Array<{ name: string; species: string; civId: number; x: number; y: number; power: number }> = []

  getAncestors(): AncestorSpirit[] { return this.ancestors }

  getAncestorsForCiv(civId: number): AncestorSpirit[] {
    return this.ancestors.filter(a => a.civId === civId)
  }

  /** Called when a hero dies - candidate for ancestor worship */
  notifyHeroDeath(name: string, species: string, civId: number, x: number, y: number, level: number): void {
    if (level >= 3) {
      this.deadHeroes.push({ name, species, civId, x, y, power: Math.min(1.0, level * 0.15) })
    }
  }

  update(dt: number, em: EntityManager, civManager: CivManagerLike, tick: number): void {
    // Process dead heroes into ancestors
    if (tick >= this.nextCheckTick) {
      this.nextCheckTick = tick + CHECK_INTERVAL
      this.processDeadHeroes(civManager, tick)
      this.updateWorshippers(em)
    }

    // Apply ancestor buffs
    if (tick >= this.nextBuffTick) {
      this.nextBuffTick = tick + BUFF_INTERVAL
      this.applyBuffs(em)
    }
  }

  private processDeadHeroes(civManager: CivManagerLike, tick: number): void {
    while (this.deadHeroes.length > 0 && this.ancestors.length < MAX_TOTAL) {
      const hero = this.deadHeroes.shift()!
      const civAncestors = this.ancestors.filter(a => a.civId === hero.civId)
      if (civAncestors.length >= MAX_ANCESTORS_PER_CIV) continue

      const civ = civManager.civilizations.get(hero.civId)
      if (!civ) continue

      const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)]
      const ancestor: AncestorSpirit = {
        id: nextAncestorId++,
        name: hero.name,
        species: hero.species,
        civId: hero.civId,
        x: hero.x,
        y: hero.y,
        power: hero.power,
        domain,
        worshippers: 0,
        createdTick: tick,
        shrineBuilt: false,
      }
      this.ancestors.push(ancestor)
      EventLog.log('culture', `${civ.name} now worships the spirit of ${hero.name} (${domain})`, tick)
    }
    this.deadHeroes.length = Math.min(this.deadHeroes.length, 10)
  }

  private updateWorshippers(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position', 'civMember')
    for (const ancestor of this.ancestors) {
      let count = 0
      const r2 = BUFF_RADIUS * BUFF_RADIUS
      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        const cm = em.getComponent<CivMemberComponent>(eid, 'civMember')
        if (!pos || !cm || cm.civId !== ancestor.civId) continue
        const dx = pos.x - ancestor.x, dy = pos.y - ancestor.y
        if (dx * dx + dy * dy < r2) count++
      }
      ancestor.worshippers = count
      if (count >= WORSHIP_THRESHOLD && !ancestor.shrineBuilt) {
        ancestor.shrineBuilt = true
        ancestor.power = Math.min(1.0, ancestor.power + 0.2)
        EventLog.log('culture', `A shrine was built for ancestor ${ancestor.name}`, 0)
      }
    }
  }

  private applyBuffs(em: EntityManager): void {
    if (this.ancestors.length === 0) return
    const entities = em.getEntitiesWithComponents('position', 'creature', 'needs', 'civMember')
    const r2 = BUFF_RADIUS * BUFF_RADIUS

    for (const ancestor of this.ancestors) {
      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        const cm = em.getComponent<CivMemberComponent>(eid, 'civMember')
        if (!pos || !cm || cm.civId !== ancestor.civId) continue

        const dx = pos.x - ancestor.x, dy = pos.y - ancestor.y
        if (dx * dx + dy * dy > r2) continue

        const needs = em.getComponent<NeedsComponent>(eid, 'needs')
        const cc = em.getComponent<CreatureComponent>(eid, 'creature')
        if (!needs || !cc) continue
        const strength = ancestor.power * (ancestor.shrineBuilt ? 1.5 : 1.0)

        switch (ancestor.domain) {
          case 'valor':
            cc.damage = Math.max(cc.damage, cc.damage + Math.floor(strength * 2))
            break
          case 'healing':
            needs.health = Math.min(100, needs.health + Math.floor(strength * 2))
            break
          case 'harvest':
            needs.hunger = Math.max(0, needs.hunger - Math.floor(strength * 3))
            break
          default:
            break
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (this.ancestors.length === 0) return
    ctx.save()

    for (const ancestor of this.ancestors) {
      const sx = (ancestor.x * 16 - camX) * zoom
      const sy = (ancestor.y * 16 - camY) * zoom
      if (sx < -60 || sy < -60 || sx > ctx.canvas.width + 60 || sy > ctx.canvas.height + 60) continue

      const color = DOMAIN_COLORS[ancestor.domain]
      const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.003 + ancestor.id)

      // Spirit glow
      ctx.globalAlpha = 0.2 * pulse
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(sx, sy, 12 * zoom, 0, Math.PI * 2)
      ctx.fill()

      // Shrine marker
      if (ancestor.shrineBuilt) {
        ctx.globalAlpha = 0.8
        ctx.fillStyle = color
        const s = 5 * zoom
        ctx.fillRect(sx - s, sy - s, s * 2, s * 2)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(sx - s, sy - s, s * 2, s * 2)
      }

      // Spirit icon
      ctx.globalAlpha = 0.6 + 0.3 * pulse
      ctx.fillStyle = '#fff'
      ctx.font = `${Math.max(8, 9 * zoom)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(ancestor.domain[0].toUpperCase(), sx, sy + 3 * zoom)

      // Worshipper count
      if (ancestor.worshippers > 0) {
        ctx.globalAlpha = 0.7
        ctx.fillStyle = color
        ctx.font = `${Math.max(6, 7 * zoom)}px monospace`
        ctx.fillText(`${ancestor.worshippers}`, sx, sy - 8 * zoom)
      }
    }
    ctx.restore()
  }
}
