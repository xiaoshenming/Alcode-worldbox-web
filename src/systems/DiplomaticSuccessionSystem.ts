// Diplomatic Succession System (v3.03) - Leadership succession in civilizations
// When leaders die or are deposed, succession crises can trigger civil wars

import { EntityManager } from '../ecs/Entity'

export type SuccessionType = 'hereditary' | 'election' | 'conquest' | 'council' | 'divine_right'
export type CrisisStatus = 'stable' | 'contested' | 'civil_war' | 'resolved'

export interface SuccessionEvent {
  id: number
  civilization: string
  type: SuccessionType
  status: CrisisStatus
  claimants: number
  stability: number    // 0-100
  tick: number
  resolveTick: number
}

const CHECK_INTERVAL = 1500
const CRISIS_CHANCE = 0.01
const MAX_EVENTS = 40
const RESOLVE_DELAY = 2000

const SUCCESSION_WEIGHTS: Record<SuccessionType, number> = {
  hereditary: 0.3, election: 0.2, conquest: 0.15,
  council: 0.2, divine_right: 0.15,
}

const TYPES = Object.keys(SUCCESSION_WEIGHTS) as SuccessionType[]
/** Pre-computed civ pool — avoids per-call literal array in generateCrises */
const _CIV_POOL = ['human', 'elf', 'dwarf', 'orc'] as const

export class DiplomaticSuccessionSystem {
  private events: SuccessionEvent[] = []
  private nextId = 1
  private lastCheck = 0
  private _crisesBuf: SuccessionEvent[] = []

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.generateCrises(tick)
    this.resolveCrises(tick)
    this.pruneOld()
  }

  private generateCrises(tick: number): void {
    if (Math.random() > CRISIS_CHANCE) return

    const civs = _CIV_POOL
    const civ = civs[Math.floor(Math.random() * civs.length)]
    const type = this.pickType()

    this.events.push({
      id: this.nextId++,
      civilization: civ,
      type,
      status: Math.random() < 0.4 ? 'contested' : 'stable',
      claimants: 2 + Math.floor(Math.random() * 4),
      stability: 20 + Math.random() * 60,
      tick,
      resolveTick: tick + RESOLVE_DELAY,
    })
  }

  private pickType(): SuccessionType {
    const r = Math.random()
    let cum = 0
    for (const t of TYPES) {
      cum += SUCCESSION_WEIGHTS[t]
      if (r <= cum) return t
    }
    return 'hereditary'
  }

  private resolveCrises(tick: number): void {
    for (const ev of this.events) {
      if (ev.status === 'resolved' || ev.status === 'stable') continue
      if (tick < ev.resolveTick) continue

      if (ev.status === 'contested') {
        ev.status = Math.random() < 0.3 ? 'civil_war' : 'resolved'
        if (ev.status === 'civil_war') {
          ev.resolveTick = tick + RESOLVE_DELAY
        }
      } else if (ev.status === 'civil_war') {
        ev.status = 'resolved'
      }
    }
  }

  private pruneOld(): void {
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS)
    }
  }

  getEvents(): SuccessionEvent[] { return this.events }
  getActiveCrises(): SuccessionEvent[] {
    this._crisesBuf.length = 0
    for (const e of this.events) { if (e.status === 'contested' || e.status === 'civil_war') this._crisesBuf.push(e) }
    return this._crisesBuf
  }
}
