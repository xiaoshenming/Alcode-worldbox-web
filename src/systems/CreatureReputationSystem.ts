// Creature Reputation System (v2.23) - Individual creature reputation
// Creatures build reputation through actions, affecting social interactions

import { EntityManager, EntityId, PositionComponent } from '../ecs/Entity'

export type ReputationTier = 'infamous' | 'disliked' | 'neutral' | 'respected' | 'legendary'

export interface CreatureReputation {
  entityId: EntityId
  score: number           // -100 to 100
  tier: ReputationTier
  kills: number
  heals: number
  trades: number
  builds: number
  lastAction: string
  lastActionTick: number
}

const UPDATE_INTERVAL = 600
const DECAY_INTERVAL = 3000
const DECAY_AMOUNT = 1
const MAX_TRACKED = 200

/** Pre-computed action pool — avoids per-entity literal array in update loop */
const _REPUTATION_ACTIONS = ['trade', 'build', 'heal'] as const
type _ReputationAction = typeof _REPUTATION_ACTIONS[number]

const TIER_THRESHOLDS: [number, ReputationTier][] = [
  [-60, 'infamous'],
  [-20, 'disliked'],
  [20, 'neutral'],
  [60, 'respected'],
  [100, 'legendary'],
]

const TIER_COLORS: Record<ReputationTier, string> = {
  infamous: '#f44',
  disliked: '#f84',
  neutral: '#aaa',
  respected: '#4cf',
  legendary: '#fc4',
}
// Pre-computed first-char uppercase for each tier — avoids per-entity string allocation in render
const TIER_LABEL: Record<ReputationTier, string> = {
  infamous: 'I', disliked: 'D', neutral: 'N', respected: 'R', legendary: 'L',
}

export class CreatureReputationSystem {
  private reputations = new Map<EntityId, CreatureReputation>()
  private nextUpdateTick = UPDATE_INTERVAL
  private nextDecayTick = DECAY_INTERVAL
  private _lastZoom = -1
  private _tierFont = ''
  private _repBuf: CreatureReputation[] = []

  getReputation(eid: EntityId): CreatureReputation | undefined {
    return this.reputations.get(eid)
  }

  getTier(eid: EntityId): ReputationTier {
    const rep = this.reputations.get(eid)
    return rep ? rep.tier : 'neutral'
  }

  getTopReputation(count: number): CreatureReputation[] {
    this._repBuf.length = 0
    for (const rep of this.reputations.values()) this._repBuf.push(rep)
    this._repBuf.sort((a, b) => b.score - a.score)
    if (this._repBuf.length > count) this._repBuf.length = count
    return this._repBuf
  }

  addReputation(eid: EntityId, amount: number, action: string, tick: number): void {
    let rep = this.reputations.get(eid)
    if (!rep) {
      rep = {
        entityId: eid,
        score: 0,
        tier: 'neutral',
        kills: 0,
        heals: 0,
        trades: 0,
        builds: 0,
        lastAction: '',
        lastActionTick: 0,
      }
      this.reputations.set(eid, rep)
    }
    rep.score = Math.max(-100, Math.min(100, rep.score + amount))
    rep.lastAction = action
    rep.lastActionTick = tick
    rep.tier = this.calcTier(rep.score)
  }

  recordKill(eid: EntityId, tick: number): void {
    this.addReputation(eid, -5, 'kill', tick)
    const rep = this.reputations.get(eid)
    if (rep) rep.kills++
  }

  recordHeal(eid: EntityId, tick: number): void {
    this.addReputation(eid, 3, 'heal', tick)
    const rep = this.reputations.get(eid)
    if (rep) rep.heals++
  }

  recordTrade(eid: EntityId, tick: number): void {
    this.addReputation(eid, 2, 'trade', tick)
    const rep = this.reputations.get(eid)
    if (rep) rep.trades++
  }

  recordBuild(eid: EntityId, tick: number): void {
    this.addReputation(eid, 4, 'build', tick)
    const rep = this.reputations.get(eid)
    if (rep) rep.builds++
  }

  update(dt: number, em: EntityManager, tick: number): void {
    // Clean dead entities
    for (const [eid] of this.reputations) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) this.reputations.delete(eid)
    }

    // Cap tracked reputations
    if (this.reputations.size > MAX_TRACKED) {
      this._repBuf.length = 0
      for (const rep of this.reputations.values()) this._repBuf.push(rep)
      this._repBuf.sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      for (let _ri = MAX_TRACKED; _ri < this._repBuf.length; _ri++) {
        this.reputations.delete(this._repBuf[_ri].entityId)
      }
      this._repBuf.length = 0
    }

    // Simulate reputation events
    if (tick >= this.nextUpdateTick) {
      this.nextUpdateTick = tick + UPDATE_INTERVAL
      const entities = em.getEntitiesWithComponents('position', 'creature')
      for (const eid of entities) {
        if (this.reputations.size >= MAX_TRACKED) break
        if (Math.random() < 0.05 && !this.reputations.has(eid)) {
          const action = _REPUTATION_ACTIONS[Math.floor(Math.random() * _REPUTATION_ACTIONS.length)]
          if (action === 'trade') this.recordTrade(eid, tick)
          else if (action === 'build') this.recordBuild(eid, tick)
          else this.recordHeal(eid, tick)
        }
      }
    }

    // Decay toward neutral
    if (tick >= this.nextDecayTick) {
      this.nextDecayTick = tick + DECAY_INTERVAL
      for (const [, rep] of this.reputations) {
        if (rep.score > 0) rep.score = Math.max(0, rep.score - DECAY_AMOUNT)
        else if (rep.score < 0) rep.score = Math.min(0, rep.score + DECAY_AMOUNT)
        rep.tier = this.calcTier(rep.score)
      }
    }
  }

  private calcTier(score: number): ReputationTier {
    for (const [threshold, tier] of TIER_THRESHOLDS) {
      if (score <= threshold) return tier
    }
    return 'legendary'
  }

  render(ctx: CanvasRenderingContext2D, em: EntityManager, camX: number, camY: number, zoom: number): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._tierFont = `${Math.max(6, 8 * zoom)}px monospace`
    }
    for (const [eid, rep] of this.reputations) {
      if (rep.tier === 'neutral') continue
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue
      const sx = (pos.x - camX) * zoom
      const sy = (pos.y - camY) * zoom
      if (sx < -20 || sy < -20 || sx > ctx.canvas.width + 20 || sy > ctx.canvas.height + 20) continue

      const color = TIER_COLORS[rep.tier]
      ctx.fillStyle = color
      ctx.globalAlpha = 0.8
      ctx.font = this._tierFont
      ctx.textAlign = 'center'
      ctx.fillText(TIER_LABEL[rep.tier], sx, sy - 6 * zoom)
      ctx.globalAlpha = 1
    }
  }

  renderPanel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const top = this.getTopReputation(5)
    if (top.length === 0) return

    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(x, y, 200, 20 + top.length * 18)
    ctx.fillStyle = '#fc4'
    ctx.font = '12px monospace'
    ctx.fillText(`Reputation (${this.reputations.size})`, x + 8, y + 14)

    for (let i = 0; i < top.length; i++) {
      const r = top[i]
      ctx.fillStyle = TIER_COLORS[r.tier]
      ctx.fillText(`#${r.entityId} ${r.tier} (${r.score})`, x + 8, y + 32 + i * 18)
    }
  }
}
