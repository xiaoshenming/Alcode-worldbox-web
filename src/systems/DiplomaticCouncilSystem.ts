// Diplomatic Council System (v2.39) - Multi-civ councils vote on world policies
// Councils form between allied civs, vote on trade agreements, war declarations, sanctions
// Council decisions affect all member civs

export type CouncilPolicy = 'free_trade' | 'mutual_defense' | 'war_declaration' | 'resource_sharing' | 'border_open'

export interface Council {
  id: number
  name: string
  memberCivIds: number[]
  foundedAt: number
  policies: CouncilPolicy[]
  votingPower: Map<number, number>  // civId -> votes
  lastVote: number
}

export interface CouncilVote {
  councilId: number
  policy: CouncilPolicy
  proposer: number
  votesFor: number
  votesAgainst: number
  passed: boolean
  tick: number
}

const CHECK_INTERVAL = 1500
const VOTE_INTERVAL = 2000
const MAX_COUNCILS = 5
const MIN_MEMBERS = 2
const MAX_MEMBERS = 6

const COUNCIL_NAMES = [
  'Grand Assembly', 'High Council', 'Elder Circle',
  'Unity Pact', 'Alliance Forum', 'World Senate',
]

const POLICY_LIST: CouncilPolicy[] = ['free_trade', 'mutual_defense', 'war_declaration', 'resource_sharing', 'border_open']

let nextCouncilId = 1

export class DiplomaticCouncilSystem {
  private councils: Council[] = []
  private voteHistory: CouncilVote[] = []
  private lastCheck = 0
  private lastVote = 0

  update(dt: number, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.formCouncils(civManager, tick)
      this.maintainCouncils(civManager)
    }
    if (tick - this.lastVote >= VOTE_INTERVAL) {
      this.lastVote = tick
      this.holdVotes(civManager, tick)
    }
  }

  private formCouncils(civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (this.councils.length >= MAX_COUNCILS) return
    const civs = [...civManager.civilizations.entries()]
    // Find groups of allied civs
    for (const [idA, civA] of civs) {
      if (this.isInCouncil(idA)) continue
      const allies: number[] = [idA]
      for (const [idB, civB] of civs) {
        if (idA === idB || this.isInCouncil(idB)) continue
        const rel = civA.relations?.get(idB) ?? 0
        if (rel > 20 && allies.length < MAX_MEMBERS) {
          allies.push(idB)
        }
      }
      if (allies.length >= MIN_MEMBERS && Math.random() < 0.1) {
        const votingPower = new Map<number, number>()
        for (const id of allies) {
          const pop = civManager.civilizations.get(id)?.population ?? 1
          votingPower.set(id, Math.max(1, Math.floor(pop / 5)))
        }
        this.councils.push({
          id: nextCouncilId++,
          name: COUNCIL_NAMES[Math.floor(Math.random() * COUNCIL_NAMES.length)],
          memberCivIds: allies,
          foundedAt: tick,
          policies: [],
          votingPower,
          lastVote: tick,
        })
        if (this.councils.length >= MAX_COUNCILS) return
      }
    }
  }

  private maintainCouncils(civManager: { civilizations: Map<number, any> }): void {
    this.councils = this.councils.filter(c => {
      // Remove dead civs
      c.memberCivIds = c.memberCivIds.filter(id => civManager.civilizations.has(id))
      return c.memberCivIds.length >= MIN_MEMBERS
    })
  }

  private holdVotes(civManager: { civilizations: Map<number, any> }, tick: number): void {
    for (const council of this.councils) {
      if (Math.random() > 0.2) continue
      const policy = POLICY_LIST[Math.floor(Math.random() * POLICY_LIST.length)]
      if (council.policies.includes(policy)) continue
      const proposer = council.memberCivIds[Math.floor(Math.random() * council.memberCivIds.length)]
      let votesFor = 0, votesAgainst = 0
      for (const civId of council.memberCivIds) {
        const power = council.votingPower.get(civId) ?? 1
        if (Math.random() < 0.6) votesFor += power
        else votesAgainst += power
      }
      const passed = votesFor > votesAgainst
      if (passed) council.policies.push(policy)
      this.voteHistory.push({ councilId: council.id, policy, proposer, votesFor, votesAgainst, passed, tick })
      council.lastVote = tick
      // Keep history manageable
      if (this.voteHistory.length > 50) this.voteHistory.shift()
    }
  }

  private isInCouncil(civId: number): boolean {
    return this.councils.some(c => c.memberCivIds.includes(civId))
  }

  getCouncils(): Council[] {
    return this.councils
  }

  getVoteHistory(): CouncilVote[] {
    return this.voteHistory
  }

  getCouncilCount(): number {
    return this.councils.length
  }
}
