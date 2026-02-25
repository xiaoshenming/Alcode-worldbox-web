// Creature Reputation System (v2.23) - Individual creature reputation
// Creatures build reputation through actions, affecting social interactions

import { EntityManager, EntityId, PositionComponent, CreatureComponent } from '../ecs/Entity'
import { EventLog } from './EventLog'

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

export class CreatureReputationSystem {
  private reputations = new Map<EntityId, CreatureReputation>()
  private nextUpdateTick = UPDATE_INTERVAL
  private nextDecayTick = DECAY_INTERVAL

  getReputation(eid: EntityId): CreatureReputation | undefined {
    return this.reputations.get(eid)
  }

  getTier(eid: EntityId): ReputationTier {
    const rep = this.reputations.get(eid)
    return rep ? rep.tier : 'neutral'
  }

  getTopReputation(count: number): CreatureReputation[] {
    return Array.from(this.reputations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
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
      const sorted = Array.from(this.reputations.entries())
        .sort((a, b) => Math.abs(b[1].score) - Math.abs(a[1].score))
      this.reputations = new Map(sorted.slice(0, MAX_TRACKED))
    }

    // Simulate reputation events
    if (tick >= this.nextUpdateTick) {
      this.nextUpdateTick = tick + UPDATE_INTERVAL
      const entities = em.getEntitiesWithComponents('position', 'creature')
      for (const eid of entities) {
        if (this.reputations.size >= MAX_TRACKED) break
        if (Math.random() < 0.05 && !this.reputations.has(eid)) {
          const actions = ['trade', 'build', 'heal'] as const
          const action = actions[Math.floor(Math.random() * actions.length)]
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
      ctx.font = `${Math.max(6, 8 * zoom)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(rep.tier[0].toUpperCase(), sx, sy - 6 * zoom)
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

    top.forEach((r, i) => {
      ctx.fillStyle = TIER_COLORS[r.tier]
      ctx.fillText(`#${r.entityId} ${r.tier} (${r.score})`, x + 8, y + 32 + i * 18)
    })
  }
}
