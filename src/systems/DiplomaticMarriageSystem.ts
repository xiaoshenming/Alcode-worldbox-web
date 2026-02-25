// Diplomatic Marriage System (v2.14) - Civilizations form alliances through marriage
// Royal marriages boost relations, create lasting bonds, and can trigger succession crises

import { EventLog } from './EventLog'

export interface Marriage {
  id: number
  civA: number
  civB: number
  tick: number
  relationBonus: number
  active: boolean
  dissolvedTick: number | null
}

type CivLike = { id: number; name: string; population: number; relations: Map<number, number> }
type CivManagerLike = { civilizations: Map<number, CivLike> }

const CHECK_INTERVAL = 4000
const MARRIAGE_CHANCE = 0.25
const RELATION_THRESHOLD = 15
const RELATION_BONUS = 25
const RELATION_DECAY_RATE = 0.1
const MAX_MARRIAGES = 8
const MAX_HISTORY = 15
const DISSOLUTION_CHANCE = 0.03
const WAR_DISSOLUTION_THRESHOLD = -40

let nextMarriageId = 1

export class DiplomaticMarriageSystem {
  private marriages: Marriage[] = []
  private history: Marriage[] = []
  private nextCheckTick = CHECK_INTERVAL
  private displayAlpha = 0

  getActiveMarriages(): Marriage[] {
    return this.marriages.filter(m => m.active)
  }

  areMarried(civA: number, civB: number): boolean {
    return this.marriages.some(m =>
      m.active && ((m.civA === civA && m.civB === civB) || (m.civA === civB && m.civB === civA))
    )
  }

  update(dt: number, civManager: CivManagerLike, tick: number): void {
    // Dissolve marriages where relations have collapsed
    for (const m of this.marriages) {
      if (!m.active) continue
      const civA = civManager.civilizations.get(m.civA)
      const civB = civManager.civilizations.get(m.civB)
      if (!civA || !civB) {
        m.active = false
        m.dissolvedTick = tick
        continue
      }

      const rel = civA.relations.get(m.civB) ?? 0
      if (rel < WAR_DISSOLUTION_THRESHOLD || Math.random() < DISSOLUTION_CHANCE * (dt / 1000)) {
        m.active = false
        m.dissolvedTick = tick
        this.history.push(m)
        if (this.history.length > MAX_HISTORY) this.history.shift()
        EventLog.log('diplomacy', `Marriage between ${civA.name} and ${civB.name} dissolved!`, tick)
      }
    }
    this.marriages = this.marriages.filter(m => m.active)

    // Apply ongoing relation bonus
    for (const m of this.marriages) {
      const civA = civManager.civilizations.get(m.civA)
      const civB = civManager.civilizations.get(m.civB)
      if (!civA || !civB) continue
      const relA = civA.relations.get(m.civB) ?? 0
      const relB = civB.relations.get(m.civA) ?? 0
      civA.relations.set(m.civB, Math.min(100, relA + RELATION_DECAY_RATE))
      civB.relations.set(m.civA, Math.min(100, relB + RELATION_DECAY_RATE))
    }

    // Try to arrange new marriages
    if (tick >= this.nextCheckTick) {
      this.nextCheckTick = tick + CHECK_INTERVAL
      if (this.marriages.length < MAX_MARRIAGES) {
        this.tryArrangeMarriage(civManager, tick)
      }
    }
  }

  private tryArrangeMarriage(civManager: CivManagerLike, tick: number): void {
    const civs = Array.from(civManager.civilizations.values())
    if (civs.length < 2) return

    for (let i = 0; i < civs.length; i++) {
      for (let j = i + 1; j < civs.length; j++) {
        const a = civs[i], b = civs[j]
        if (a.population < 10 || b.population < 10) continue
        if (this.areMarried(a.id, b.id)) continue

        const rel = a.relations.get(b.id) ?? 0
        if (rel < RELATION_THRESHOLD) continue
        if (Math.random() > MARRIAGE_CHANCE) continue

        const marriage: Marriage = {
          id: nextMarriageId++,
          civA: a.id,
          civB: b.id,
          tick,
          relationBonus: RELATION_BONUS,
          active: true,
          dissolvedTick: null,
        }
        this.marriages.push(marriage)

        a.relations.set(b.id, Math.min(100, rel + RELATION_BONUS))
        b.relations.set(a.id, Math.min(100, (b.relations.get(a.id) ?? 0) + RELATION_BONUS))

        EventLog.log('diplomacy', `Royal marriage between ${a.name} and ${b.name}! Relations improved.`, tick)
        return
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const active = this.getActiveMarriages()
    if (active.length === 0) {
      this.displayAlpha = Math.max(0, this.displayAlpha - 0.05)
      if (this.displayAlpha <= 0) return
    } else {
      this.displayAlpha = Math.min(1, this.displayAlpha + 0.05)
    }

    const x = 10, y = 500, w = 220, h = 26 + active.length * 20
    ctx.save()
    ctx.globalAlpha = this.displayAlpha * 0.85
    ctx.fillStyle = '#1a0a1a'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = '#f4a'
    ctx.strokeRect(x, y, w, h)

    ctx.globalAlpha = this.displayAlpha
    ctx.fillStyle = '#faf'
    ctx.font = 'bold 11px monospace'
    ctx.fillText('ROYAL MARRIAGES', x + 8, y + 16)

    ctx.font = '10px monospace'
    ctx.fillStyle = '#fce'
    for (let i = 0; i < active.length; i++) {
      const m = active[i]
      ctx.fillText(`#${m.id} Civ:${m.civA} <> Civ:${m.civB}`, x + 8, y + 32 + i * 20)
    }
    ctx.restore()
  }
}
