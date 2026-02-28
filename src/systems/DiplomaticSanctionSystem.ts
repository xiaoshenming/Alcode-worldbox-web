// Diplomatic Sanction System (v2.19) - Civilizations impose economic sanctions
// Sanctions reduce trade income and resource flow between hostile civilizations

import { EventLog } from './EventLog'

export interface Sanction {
  id: number
  imposerId: number       // civ that imposed
  targetId: number        // civ being sanctioned
  reason: string
  severity: SanctionSeverity
  startTick: number
  duration: number
  active: boolean
}

export type SanctionSeverity = 'light' | 'moderate' | 'severe' | 'total'

type CivLike = { id: number; name: string; resources: { gold: number; food: number }; relations: Map<number, number> }
type CivManagerLike = { civilizations: Map<number, CivLike> }

const CHECK_INTERVAL = 1000
const EFFECT_INTERVAL = 500
const MAX_SANCTIONS = 10
const SANCTION_DURATION = 8000
const HOSTILITY_THRESHOLD = -40

const SEVERITY_IMPACT: Record<SanctionSeverity, number> = {
  light: 0.1,
  moderate: 0.25,
  severe: 0.5,
  total: 0.8,
}

const REASONS = [
  'military aggression',
  'border violations',
  'trade fraud',
  'espionage activities',
  'treaty violations',
  'resource hoarding',
]

let nextSanctionId = 1

export class DiplomaticSanctionSystem {
  private _civsBuf: CivLike[] = []
  private sanctions: Sanction[] = []
  private nextCheckTick = CHECK_INTERVAL
  private nextEffectTick = EFFECT_INTERVAL
  private _activeBuf: Sanction[] = []
  private _onCivBuf: Sanction[] = []
  private _sanctionMap: Map<number, number> = new Map()

  getSanctions(): Sanction[] { return this.sanctions }

  getActiveSanctions(): Sanction[] {
    this._activeBuf.length = 0
    for (const s of this.sanctions) { if (s.active) this._activeBuf.push(s) }
    return this._activeBuf
  }

  getSanctionsOn(civId: number): Sanction[] {
    this._onCivBuf.length = 0
    for (const s of this.sanctions) { if (s.targetId === civId && s.active) this._onCivBuf.push(s) }
    return this._onCivBuf
  }

  update(dt: number, civManager: CivManagerLike, tick: number): void {
    // Expire old sanctions
    for (const s of this.sanctions) {
      if (s.active && tick >= s.startTick + s.duration) {
        s.active = false
        const imposer = civManager.civilizations.get(s.imposerId)
        const target = civManager.civilizations.get(s.targetId)
        if (imposer && target) {
          EventLog.log('diplomacy', `${imposer.name}'s sanctions on ${target.name} have expired`, tick)
        }
      }
    }

    // Clean up inactive
    if (this.sanctions.length > MAX_SANCTIONS * 2) {
      for (let _i = this.sanctions.length - 1; _i >= 0; _i--) { if (!((s) => s.active)(this.sanctions[_i])) this.sanctions.splice(_i, 1) }
    }

    // Impose new sanctions
    if (tick >= this.nextCheckTick) {
      this.nextCheckTick = tick + CHECK_INTERVAL
      this.tryImposeSanction(civManager, tick)
    }

    // Apply economic effects
    if (tick >= this.nextEffectTick) {
      this.nextEffectTick = tick + EFFECT_INTERVAL
      this.applyEffects(civManager)
    }
  }

  private tryImposeSanction(civManager: CivManagerLike, tick: number): void {
    let activeCount = 0
    for (const s of this.sanctions) { if (s.active) activeCount++ }
    if (activeCount >= MAX_SANCTIONS) return

    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    // Pick a random civ to consider imposing sanctions
    const imposer = civs[Math.floor(Math.random() * civs.length)]

    // Find hostile target
    let targetId = -1
    let worstRelation = HOSTILITY_THRESHOLD
    for (const [civId, rel] of imposer.relations) {
      if (rel < worstRelation && civManager.civilizations.has(civId)) {
        // Check not already sanctioned by this imposer
        let alreadySanctioned = false
        for (const s of this.sanctions) {
          if (s.active && s.imposerId === imposer.id && s.targetId === civId) { alreadySanctioned = true; break }
        }
        if (!alreadySanctioned) {
          worstRelation = rel
          targetId = civId
        }
      }
    }
    if (targetId < 0) return

    const target = civManager.civilizations.get(targetId)
    if (!target) return

    // Severity based on hostility level
    const hostility = Math.abs(worstRelation)
    let severity: SanctionSeverity = 'light'
    if (hostility > 80) severity = 'total'
    else if (hostility > 60) severity = 'severe'
    else if (hostility > 45) severity = 'moderate'

    const reason = REASONS[Math.floor(Math.random() * REASONS.length)]
    const sanction: Sanction = {
      id: nextSanctionId++,
      imposerId: imposer.id,
      targetId,
      reason,
      severity,
      startTick: tick,
      duration: SANCTION_DURATION,
      active: true,
    }
    this.sanctions.push(sanction)
    EventLog.log('diplomacy', `${imposer.name} imposed ${severity} sanctions on ${target.name} for ${reason}`, tick)
  }

  private applyEffects(civManager: CivManagerLike): void {
    // Aggregate sanctions per target (only active)
    const sanctionMap = this._sanctionMap
    sanctionMap.clear()
    let hasActive = false
    for (const s of this.sanctions) {
      if (!s.active) continue
      hasActive = true
      const impact = SEVERITY_IMPACT[s.severity]
      const current = sanctionMap.get(s.targetId) ?? 0
      sanctionMap.set(s.targetId, Math.min(0.9, current + impact))
    }
    if (!hasActive) return
    for (const [civId, totalImpact] of sanctionMap) {
      const civ = civManager.civilizations.get(civId)
      if (!civ) continue
      const drain = Math.floor(civ.resources.gold * totalImpact * 0.01)
      civ.resources.gold = Math.max(0, civ.resources.gold - drain)
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const active = this.getActiveSanctions()
    if (active.length === 0) return

    const x = 10, y = 540, w = 240, h = 26 + active.length * 20
    ctx.save()
    ctx.globalAlpha = 0.85
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = '#66a'
    ctx.strokeRect(x, y, w, h)

    ctx.fillStyle = '#aaf'
    ctx.font = 'bold 11px monospace'
    ctx.fillText('SANCTIONS', x + 8, y + 16)

    ctx.font = '9px monospace'
    const severityColors: Record<SanctionSeverity, string> = {
      light: '#8a8', moderate: '#aa8', severe: '#a86', total: '#f66',
    }
    for (let i = 0; i < active.length; i++) {
      const s = active[i]
      ctx.fillStyle = severityColors[s.severity]
      ctx.fillText(`#${s.id} [${s.severity}] - ${s.reason}`, x + 8, y + 32 + i * 20)
    }
    ctx.restore()
  }
}
