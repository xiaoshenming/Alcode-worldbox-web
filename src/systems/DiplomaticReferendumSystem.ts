// Diplomatic Referendum System (v3.225) - Civilizations hold referendums on major decisions
// Popular votes that determine policy changes, alliances, and territorial disputes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ReferendumTopic = 'alliance' | 'territory' | 'trade_policy' | 'war_declaration'

export interface Referendum {
  id: number
  civId: number
  topic: ReferendumTopic
  targetCivId: number
  votesFor: number
  votesAgainst: number
  turnout: number
  passed: boolean
  tick: number
}

const CHECK_INTERVAL = 2200
const REFERENDUM_CHANCE = 0.004
const MAX_REFERENDUMS = 30

const TOPICS: ReferendumTopic[] = ['alliance', 'territory', 'trade_policy', 'war_declaration']

export class DiplomaticReferendumSystem {
  private referendums: Referendum[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.referendums.length < MAX_REFERENDUMS && Math.random() < REFERENDUM_CHANCE) {
      const civId = 1 + Math.floor(Math.random() * 8)
      const targetCivId = 1 + Math.floor(Math.random() * 8)
      if (civId === targetCivId) return

      const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)]
      const turnout = 30 + Math.random() * 60
      const forPct = 20 + Math.random() * 60
      const votesFor = Math.floor(turnout * forPct / 100)
      const votesAgainst = Math.floor(turnout * (100 - forPct) / 100)

      this.referendums.push({
        id: this.nextId++,
        civId,
        topic,
        targetCivId,
        votesFor,
        votesAgainst,
        turnout,
        passed: votesFor > votesAgainst,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.referendums.length - 1; i >= 0; i--) {
      if (this.referendums[i].tick < cutoff) {
        this.referendums.splice(i, 1)
      }
    }
  }

  private _referendumsBuf: Referendum[] = []
  getReferendums(): readonly Referendum[] { return this.referendums }
  getByTopic(topic: ReferendumTopic): Referendum[] {
    this._referendumsBuf.length = 0
    for (const r of this.referendums) { if (r.topic === topic) this._referendumsBuf.push(r) }
    return this._referendumsBuf
  }
}
