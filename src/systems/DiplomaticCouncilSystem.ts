// Diplomatic Council System (v3.18) - Multi-civilization councils vote on major affairs
// Councils form between civs, vote on war, trade, territory, and alliances

import { EntityManager } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'

export type CouncilTopic = 'war_declaration' | 'trade_pact' | 'territory_dispute' | 'resource_sharing' | 'exile_vote' | 'alliance_formation'

export interface Council {
  id: number
  memberCivIds: number[]
  topic: CouncilTopic
  votes: Map<number, boolean>  // civId -> for/against
  resolved: boolean
  tick: number
}

const CHECK_INTERVAL = 1000
const COUNCIL_CHANCE = 0.008
const MAX_COUNCILS = 20

const TOPICS: CouncilTopic[] = [
  'war_declaration', 'trade_pact', 'territory_dispute',
  'resource_sharing', 'exile_vote', 'alliance_formation',
]

const TOPIC_WEIGHTS: Record<CouncilTopic, number> = {
  war_declaration: 0.15,
  trade_pact: 0.25,
  territory_dispute: 0.15,
  resource_sharing: 0.2,
  exile_vote: 0.1,
  alliance_formation: 0.15,
}

export class DiplomaticCouncilSystem {
  private councils: Council[] = []
  private nextId = 1
  private lastCheck = 0
  private resolvedCount = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formCouncils(em, tick)
    this.conductVotes()
    this.resolveCouncils()
    this.pruneOld()
  }

  private formCouncils(em: EntityManager, tick: number): void {
    if (this.councils.length >= MAX_COUNCILS) return
    if (Math.random() > COUNCIL_CHANCE) return

    // Gather civ IDs from creatures with civMember component
    const civIds = new Set<number>()
    const entities = em.getEntitiesWithComponents('creature', 'civMember')
    for (const eid of entities) {
      const member = em.getComponent<CivMemberComponent>(eid, 'civMember')
      if (member) civIds.add(member.civId)
    }

    const civArray = [...civIds]
    if (civArray.length < 2) return

    // Pick 2-5 random civs for the council
    const count = 2 + Math.floor(Math.random() * Math.min(4, civArray.length - 1))
    const shuffled = civArray.sort(() => Math.random() - 0.5)
    const members = shuffled.slice(0, count)

    const topic = this.pickTopic()
    this.councils.push({
      id: this.nextId++,
      memberCivIds: members,
      topic,
      votes: new Map(),
      resolved: false,
      tick,
    })
  }

  private pickTopic(): CouncilTopic {
    const r = Math.random()
    let cum = 0
    for (const t of TOPICS) {
      cum += TOPIC_WEIGHTS[t]
      if (r <= cum) return t
    }
    return 'trade_pact'
  }

  private conductVotes(): void {
    for (const council of this.councils) {
      if (council.resolved) continue
      if (council.votes.size >= council.memberCivIds.length) continue

      for (const civId of council.memberCivIds) {
        if (council.votes.has(civId)) continue
        // Each civ has a chance to vote each tick
        if (Math.random() > 0.4) continue
        const voteFor = Math.random() < this.getVoteBias(council.topic)
        council.votes.set(civId, voteFor)
      }
    }
  }

  private getVoteBias(topic: CouncilTopic): number {
    switch (topic) {
      case 'trade_pact': return 0.7
      case 'alliance_formation': return 0.6
      case 'resource_sharing': return 0.55
      case 'territory_dispute': return 0.45
      case 'exile_vote': return 0.4
      case 'war_declaration': return 0.35
    }
  }

  private resolveCouncils(): void {
    for (const council of this.councils) {
      if (council.resolved) continue
      if (council.votes.size < council.memberCivIds.length) continue

      // Majority vote
      let forCount = 0
      let againstCount = 0
      for (const vote of council.votes.values()) {
        if (vote) forCount++
        else againstCount++
      }
      council.resolved = true
      this.resolvedCount++
    }
  }

  private pruneOld(): void {
    if (this.councils.length <= MAX_COUNCILS) return
    for (let _i = this.councils.length - 1; _i >= 0; _i--) { if (!((c) => !c.resolved)(this.councils[_i])) this.councils.splice(_i, 1) }
    if (this.councils.length > MAX_COUNCILS) {
      this.councils.splice(0, this.councils.length - MAX_COUNCILS)
    }
  }

  private _activeCouncilsBuf: Council[] = []
  getCouncils(): Council[] { return this.councils }
  getActiveCouncils(): Council[] {
    this._activeCouncilsBuf.length = 0
    for (const c of this.councils) { if (!c.resolved) this._activeCouncilsBuf.push(c) }
    return this._activeCouncilsBuf
  }
  getResolvedCount(): number { return this.resolvedCount }
}
