import { EventLog } from './EventLog'

export type SummitTopic = 'peace' | 'trade' | 'alliance' | 'territory'

interface CivLike {
  id: number
  name: string
  population: number
  relations: Map<number, number>
}

interface CivManagerLike {
  civilizations: Map<number, CivLike>
}

export interface Summit {
  id: number
  participants: number[]  // civ ids
  topic: SummitTopic
  startTick: number
  duration: number
  resolved: boolean
  outcome: string
}

const TOPIC_LABELS: Record<SummitTopic, string> = {
  peace: 'Peace Treaty',
  trade: 'Trade Agreement',
  alliance: 'Military Alliance',
  territory: 'Territorial Dispute',
}

const TOPIC_COLORS: Record<SummitTopic, string> = {
  peace: '#4af',
  trade: '#ffd700',
  alliance: '#f84',
  territory: '#f44',
}

const PEACE_THRESHOLD = -20
const TRADE_THRESHOLD = 10
const ALLIANCE_THRESHOLD = 40

const SUCCESS_BONUS = 15
const FAILURE_PENALTY = -10

const SUMMIT_INTERVAL = 3000
/** Pre-computed summit success base probabilities — avoids per-summit object literal creation */
const _SUMMIT_DIFFICULTY: Record<SummitTopic, number> = {
  peace: 0.5, trade: 0.6, alliance: 0.4, territory: 0.3,
}
const SUMMIT_DURATION = 120
const MAX_HISTORY = 30

let nextSummitId = 1

export class DiplomaticSummitSystem {
  private summits: Summit[] = []
  private activeSummit: Summit | null = null
  private nextSummitTick: number = SUMMIT_INTERVAL
  private displayAlpha: number = 0
  private _usedIdxSet: Set<number> = new Set()
  private _aliveCivsBuf: CivLike[] = []
  private _participantsBuf: CivLike[] = []
  private _resolveBuf: CivLike[] = []

  update(_dt: number, civManager: CivManagerLike, tick: number): void {
    if (this.activeSummit) {
      if (tick - this.activeSummit.startTick >= this.activeSummit.duration) {
        this.resolveSummit(this.activeSummit, civManager, tick)
        this.activeSummit = null
      }
      return
    }

    if (tick >= this.nextSummitTick) {
      this.tryStartSummit(civManager, tick)
      this.nextSummitTick = tick + SUMMIT_INTERVAL
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.activeSummit) {
      this.displayAlpha = Math.max(0, this.displayAlpha - 0.02)
      if (this.displayAlpha <= 0) return
    } else {
      this.displayAlpha = Math.min(1, this.displayAlpha + 0.05)
    }

    const summit = this.activeSummit ?? this.summits[this.summits.length - 1]
    if (!summit) return

    const w = ctx.canvas.width
    const bannerW = 340
    const bannerH = 60
    const x = (w - bannerW) / 2
    const y = 10

    ctx.save()
    ctx.globalAlpha = this.displayAlpha

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    ctx.beginPath()
    ctx.roundRect(x, y, bannerW, bannerH, 8)
    ctx.fill()

    const color = TOPIC_COLORS[summit.topic]
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x, y, bannerW, bannerH, 8)
    ctx.stroke()

    ctx.font = '18px serif'
    ctx.fillStyle = color
    ctx.fillText('\u2696', x + 12, y + 36)

    ctx.font = 'bold 13px monospace'
    ctx.fillStyle = '#fff'
    const label = summit.resolved ? 'Summit Concluded' : 'Summit in Progress'
    ctx.fillText(label, x + 38, y + 22)

    ctx.font = '11px monospace'
    ctx.fillStyle = color
    ctx.fillText(TOPIC_LABELS[summit.topic], x + 38, y + 40)

    ctx.fillStyle = '#aaa'
    ctx.font = '11px monospace'
    const info = summit.resolved
      ? summit.outcome
      : `${summit.participants.length} civilizations`
    const trimmed = info.length > 28 ? info.slice(0, 25) + '...' : info
    ctx.fillText(trimmed, x + 38, y + 54)

    ctx.restore()
  }

  getActiveSummit(): Summit | null {
    return this.activeSummit
  }

  getSummitHistory(): Summit[] {
    return this.summits
  }

  // ── Private ──────────────────────────────────────────────

  private getAliveCivs(civManager: CivManagerLike): CivLike[] {
    const result = this._aliveCivsBuf; result.length = 0
    for (const civ of civManager.civilizations.values()) {
      if (civ.population > 0) result.push(civ)
    }
    return result
  }

  private tryStartSummit(civManager: CivManagerLike, tick: number): void {
    const civs = this.getAliveCivs(civManager)
    if (civs.length < 2) return

    const count = Math.min(civs.length, 2 + Math.floor(Math.random() * 3))
    // Random sampling without shuffle
    const usedIdx = this._usedIdxSet; usedIdx.clear()
    const participants = this._participantsBuf; participants.length = 0
    while (participants.length < count) {
      const idx = Math.floor(Math.random() * civs.length)
      if (!usedIdx.has(idx)) { usedIdx.add(idx); participants.push(civs[idx]) }
    }

    const participantIds: number[] = []
    let names = ''
    for (let i = 0; i < participants.length; i++) {
      participantIds.push(participants[i].id)
      if (i > 0) names += ', '
      names += participants[i].name
    }

    const topic = this.pickTopic(participants)

    const summit: Summit = {
      id: nextSummitId++,
      participants: participantIds,
      topic,
      startTick: tick,
      duration: SUMMIT_DURATION,
      resolved: false,
      outcome: '',
    }

    this.activeSummit = summit
    EventLog.log(
      'diplomacy',
      `Diplomatic summit on ${TOPIC_LABELS[topic]} begins: ${names}`,
      tick,
    )
  }

  private pickTopic(civs: CivLike[]): SummitTopic {
    let totalRelation = 0
    let pairs = 0
    for (let i = 0; i < civs.length; i++) {
      for (let j = i + 1; j < civs.length; j++) {
        totalRelation += civs[i].relations.get(civs[j].id) ?? 0
        pairs++
      }
    }
    const avg = pairs > 0 ? totalRelation / pairs : 0

    if (avg < PEACE_THRESHOLD) return 'peace'
    if (avg < TRADE_THRESHOLD) return 'territory'
    if (avg < ALLIANCE_THRESHOLD) return 'trade'
    return 'alliance'
  }

  private resolveSummit(
    summit: Summit,
    civManager: CivManagerLike,
    tick: number,
  ): void {
    const participants = this._resolveBuf; participants.length = 0
    for (const id of summit.participants) {
      const civ = civManager.civilizations.get(id)
      if (civ && civ.population > 0) participants.push(civ)
    }

    if (participants.length < 2) {
      summit.resolved = true
      summit.outcome = 'Summit collapsed — not enough participants'
      this.pushHistory(summit)
      EventLog.log('diplomacy', summit.outcome, tick)
      return
    }

    const success = this.evaluateSuccess(participants, summit.topic)
    summit.resolved = true

    if (success) {
      summit.outcome = this.applySuccess(participants, summit.topic)
    } else {
      summit.outcome = this.applyFailure(participants, summit.topic)
    }

    this.pushHistory(summit)
    EventLog.log('diplomacy', `Summit result: ${summit.outcome}`, tick)
  }

  private evaluateSuccess(participants: CivLike[], topic: SummitTopic): boolean {
    let totalRel = 0
    let pairs = 0
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        totalRel += participants[i].relations.get(participants[j].id) ?? 0
        pairs++
      }
    }
    const avgRel = pairs > 0 ? totalRel / pairs : 0

    const base = _SUMMIT_DIFFICULTY[topic]
    const relationBonus = avgRel / 200
    const chance = Math.max(0.1, Math.min(0.9, base + relationBonus))

    return Math.random() < chance
  }

  private applySuccess(participants: CivLike[], topic: SummitTopic): string {
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const a = participants[i]
        const b = participants[j]
        a.relations.set(b.id, Math.min(100, (a.relations.get(b.id) ?? 0) + SUCCESS_BONUS))
        b.relations.set(a.id, Math.min(100, (b.relations.get(a.id) ?? 0) + SUCCESS_BONUS))
      }
    }
    let names = ''
    for (let i = 0; i < participants.length; i++) {
      if (i > 0) names += ', '
      names += participants[i].name
    }
    return `${TOPIC_LABELS[topic]} agreed by ${names}`
  }

  private applyFailure(participants: CivLike[], topic: SummitTopic): string {
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const a = participants[i]
        const b = participants[j]
        a.relations.set(b.id, Math.max(-100, (a.relations.get(b.id) ?? 0) + FAILURE_PENALTY))
        b.relations.set(a.id, Math.max(-100, (b.relations.get(a.id) ?? 0) + FAILURE_PENALTY))
      }
    }
    let names = ''
    for (let i = 0; i < participants.length; i++) {
      if (i > 0) names += ', '
      names += participants[i].name
    }
    return `${TOPIC_LABELS[topic]} talks failed between ${names}`
  }

  private pushHistory(summit: Summit): void {
    this.summits.push(summit)
    if (this.summits.length > MAX_HISTORY) {
      this.summits.shift()
    }
  }
}
