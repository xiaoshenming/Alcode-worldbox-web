// World Events & Prophecies - dramatic random global events
// v0.95

import { EntityManager, CreatureComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { CivManager } from '../civilization/CivManager'
import { ParticleSystem } from './ParticleSystem'
import { TimelineSystem } from './TimelineSystem'
import {
  EventContext,
  WorldEventDef,
  ActiveEvent,
  EventBanner,
  RARITY_WEIGHTS,
  RARITY_COLORS,
  RARITY_UPPER,
  EVENT_DEFINITIONS,
} from './WorldEventDefinitions'

// --- Main System ---

export class WorldEventSystem {
  private activeEvents: ActiveEvent[] = []
  private eventCooldowns: Map<string, number> = new Map()
  private eventHistory: { id: string; name: string; tick: number }[] = []
  private banner: EventBanner | null = null
  private nextEventTick: number = 2000 + Math.floor(Math.random() * 2000)
  private _availEventsBuf: WorldEventDef[] = []
  private checkInterval: number = 120  // only check every 120 ticks for performance

  // Screen overlay for Blood Moon / Eclipse
  private screenOverlay: { color: string; alpha: number } | null = null

  // Blood Moon buff tracking
  private bloodMoonBuffs: Map<number, { origDamage: number; origSpeed: number }> = new Map()

  update(em: EntityManager, world: World, civManager: CivManager, particles: ParticleSystem, timeline: TimelineSystem): void {
    const tick = world.tick

    // Performance: only run logic every checkInterval ticks
    if (tick % this.checkInterval !== 0) {
      // Still need to update overlay for active events
      this.updateOverlay()
      return
    }

    // Apply ongoing Blood Moon buffs
    this.applyBloodMoonBuffs(em)

    // Check if it's time to trigger a new event
    if (tick >= this.nextEventTick) {
      this.tryTriggerRandomEvent(em, world, civManager, particles, timeline, tick)
      // Next event in 2000-4000 ticks
      this.nextEventTick = tick + 2000 + Math.floor(Math.random() * 2000)
    }

    // Update active events
    for (let i = this.activeEvents.length - 1; i >= 0; i--) {
      const active = this.activeEvents[i]
      active.remainingTicks -= this.checkInterval

      if (active.remainingTicks <= 0) {
        // Event expired
        if (active.def.onEnd) {
          const ctx: EventContext = { em, world, civManager, particles, timeline, tick }
          active.def.onEnd(ctx)
        }
        // Clean up Blood Moon buffs
        if (active.def.id === 'blood_moon') {
          this.removeBloodMoonBuffs(em)
        }
        this.activeEvents.splice(i, 1)
      }
    }

    // Update cooldowns
    for (const [id, cd] of this.eventCooldowns) {
      const newCd = cd - this.checkInterval
      if (newCd <= 0) {
        this.eventCooldowns.delete(id)
      } else {
        this.eventCooldowns.set(id, newCd)
      }
    }

    // Update screen overlay based on active events
    this.updateOverlay()
  }

  private tryTriggerRandomEvent(
    em: EntityManager, world: World, civManager: CivManager,
    particles: ParticleSystem, timeline: TimelineSystem, tick: number
  ): void {
    // Filter available events (not on cooldown, not already active)
    this._availEventsBuf.length = 0
    for (const def of EVENT_DEFINITIONS) {
      if (this.eventCooldowns.has(def.id)) continue
      if (this.activeEvents.some(a => a.def.id === def.id)) continue
      this._availEventsBuf.push(def)
    }
    const available = this._availEventsBuf

    if (available.length === 0) return

    // Weighted random selection by rarity
    let totalWeight = 0; for (const def of available) totalWeight += RARITY_WEIGHTS[def.rarity]
    let roll = Math.random() * totalWeight
    let selected: WorldEventDef | null = null

    for (const def of available) {
      roll -= RARITY_WEIGHTS[def.rarity]
      if (roll <= 0) {
        selected = def
        break
      }
    }

    if (!selected) selected = available[available.length - 1]

    this.triggerEvent(selected.id, em, world, civManager, particles, timeline, tick)
  }

  triggerEvent(
    eventId: string,
    em: EntityManager, world: World, civManager: CivManager,
    particles: ParticleSystem, timeline: TimelineSystem, tick: number
  ): boolean {
    const def = EVENT_DEFINITIONS.find(d => d.id === eventId)
    if (!def) return false

    const ctx: EventContext = { em, world, civManager, particles, timeline, tick }

    // Create active event
    const active: ActiveEvent = {
      def,
      startTick: tick,
      remainingTicks: def.duration,
      data: {},
      headerLabel: `${def.icon} ${def.name}`,
    }

    // Hack to let effect store data on the active event
    const ctxWithData = ctx as unknown as { _eventData: Record<string, unknown> }
    ctxWithData._eventData = active.data

    // Execute effect
    def.effect(ctx)

    // Copy back any data stored by the effect
    if (ctxWithData._eventData !== active.data) {
      Object.assign(active.data, ctxWithData._eventData)
    }

    // Apply Blood Moon buffs immediately
    if (def.id === 'blood_moon') {
      this.applyBloodMoonBuffsInitial(em)
    }

    this.activeEvents.push(active)
    this.eventCooldowns.set(def.id, def.cooldown)
    this.eventHistory.push({ id: def.id, name: def.name, tick })
    if (this.eventHistory.length > 100) this.eventHistory.splice(0, this.eventHistory.length - 100)

    // Show banner
    this.banner = {
      text: `${def.name} - ${def.description}`,
      icon: def.icon,
      rarity: def.rarity,
      startTime: performance.now(),
      duration: 4000,
    }

    return true
  }

  private applyBloodMoonBuffsInitial(em: EntityManager): void {
    this.bloodMoonBuffs.clear()
    const creatures = em.getEntitiesWithComponents('creature')
    for (const eid of creatures) {
      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c) continue
      if (c.isHostile) {
        this.bloodMoonBuffs.set(eid, { origDamage: c.damage, origSpeed: c.speed })
        c.damage *= 1.5
        c.speed *= 1.3
      }
    }
  }

  private applyBloodMoonBuffs(em: EntityManager): void {
    // Buff any new hostile creatures that spawned during blood moon
    if (!this.activeEvents.some(a => a.def.id === 'blood_moon')) return
    const creatures = em.getEntitiesWithComponents('creature')
    for (const eid of creatures) {
      if (this.bloodMoonBuffs.has(eid)) continue
      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c) continue
      if (c.isHostile) {
        this.bloodMoonBuffs.set(eid, { origDamage: c.damage, origSpeed: c.speed })
        c.damage *= 1.5
        c.speed *= 1.3
      }
    }
  }

  private removeBloodMoonBuffs(em: EntityManager): void {
    for (const [eid, orig] of this.bloodMoonBuffs) {
      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (c) {
        c.damage = orig.origDamage
        c.speed = orig.origSpeed
      }
    }
    this.bloodMoonBuffs.clear()
  }

  private updateOverlay(): void {
    this.screenOverlay = null

    for (const active of this.activeEvents) {
      if (active.def.id === 'blood_moon') {
        this.screenOverlay = { color: 'rgba(180, 0, 0, 0.15)', alpha: 0.15 }
        break
      }
      if (active.def.id === 'eclipse') {
        this.screenOverlay = { color: 'rgba(0, 0, 30, 0.45)', alpha: 0.45 }
        break
      }
    }
  }

  getScreenOverlay(): { color: string; alpha: number } | null {
    return this.screenOverlay
  }

  getActiveEvents(): { id: string; name: string; icon: string; remaining: number; rarity: string }[] {
    return this.activeEvents.map(a => ({
      id: a.def.id,
      name: a.def.name,
      icon: a.def.icon,
      remaining: a.remainingTicks,
      rarity: a.def.rarity,
    }))
  }

  getEventHistory(): { id: string; name: string; tick: number }[] {
    return this.eventHistory
  }

  // --- Banner Rendering ---

  renderEventBanner(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
    if (!this.banner) return

    const elapsed = performance.now() - this.banner.startTime
    if (elapsed > this.banner.duration) {
      this.banner = null
      return
    }

    // Fade in (0-500ms), hold, fade out (last 800ms)
    let alpha = 1.0
    const fadeIn = 500
    const fadeOut = 800
    if (elapsed < fadeIn) {
      alpha = elapsed / fadeIn
    } else if (elapsed > this.banner.duration - fadeOut) {
      alpha = (this.banner.duration - elapsed) / fadeOut
    }

    const y = 60
    const bannerHeight = 50
    const rarityColor = RARITY_COLORS[this.banner.rarity] || '#88ccff'

    // Background
    ctx.save()
    ctx.globalAlpha = alpha * 0.85
    ctx.fillStyle = '#111122'
    const bw = Math.min(canvasWidth * 0.7, 600)
    const bx = (canvasWidth - bw) / 2
    ctx.beginPath()
    ctx.roundRect(bx, y, bw, bannerHeight, 8)
    ctx.fill()

    // Border glow
    ctx.strokeStyle = rarityColor
    ctx.lineWidth = 2
    ctx.globalAlpha = alpha * 0.9
    ctx.beginPath()
    ctx.roundRect(bx, y, bw, bannerHeight, 8)
    ctx.stroke()

    // Icon
    ctx.globalAlpha = alpha
    ctx.font = '22px serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(this.banner.icon, bx + 14, y + bannerHeight / 2)

    // Text
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = rarityColor
    ctx.fillText(this.banner.text, bx + 44, y + bannerHeight / 2)

    // Rarity tag
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = rarityColor
    ctx.globalAlpha = alpha * 0.7
    ctx.fillText(RARITY_UPPER[this.banner.rarity], bx + bw - 12, y + bannerHeight / 2)

    ctx.restore()
  }

  // Render screen overlay (Blood Moon / Eclipse tint)
  renderScreenOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.screenOverlay) return
    ctx.save()
    ctx.fillStyle = this.screenOverlay.color
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }

  // Render active event indicators in top-right corner
  renderActiveIndicators(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
    if (this.activeEvents.length === 0) return

    ctx.save()
    const x = canvasWidth - 180
    let y = 100

    for (const active of this.activeEvents) {
      const progress = active.remainingTicks / active.def.duration
      const rarityColor = RARITY_COLORS[active.def.rarity] || '#88ccff'

      // Background pill
      ctx.globalAlpha = 0.75
      ctx.fillStyle = '#111122'
      ctx.beginPath()
      ctx.roundRect(x, y, 170, 28, 6)
      ctx.fill()

      // Progress bar
      ctx.fillStyle = rarityColor
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.roundRect(x, y, 170 * progress, 28, 6)
      ctx.fill()

      // Icon + name
      ctx.globalAlpha = 0.9
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(active.headerLabel, x + 8, y + 14)

      y += 34
    }

    ctx.restore()
  }
}
