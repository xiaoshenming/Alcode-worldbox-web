// Diplomatic Federation System (v2.63) - Multi-civilization federations
// Civilizations can form federations for mutual defense and trade
// Federations have shared policies, rotating leadership, and collective decisions

import { CivManager } from '../civilization/CivManager'

export type FederationPolicy = 'mutual_defense' | 'free_trade' | 'shared_research' | 'open_borders' | 'collective_war'

export interface Federation {
  id: number
  name: string
  members: number[]       // civ ids
  leader: number          // current leader civ id
  policies: FederationPolicy[]
  foundedTick: number
  stability: number       // 0-100
  leaderRotationTick: number
}

const CHECK_INTERVAL = 1200
const MAX_FEDERATIONS = 5
const ROTATION_INTERVAL = 3000
const FORM_CHANCE = 0.02
const DISSOLVE_THRESHOLD = 15

const FEDERATION_NAMES = [
  'United Realms', 'Grand Alliance', 'Covenant of Peace', 'Northern Pact',
  'Southern League', 'Eastern Coalition', 'Western Accord', 'Iron Compact',
  'Silver Federation', 'Golden Union', 'Emerald Treaty', 'Crimson Alliance',
]

const ALL_POLICIES: FederationPolicy[] = ['mutual_defense', 'free_trade', 'shared_research', 'open_borders', 'collective_war']

export class DiplomaticFederationSystem {
  private federations: Federation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.tryFormFederation(civManager, tick)
    this.updateFederations(civManager, tick)
    this.checkDissolution()
  }

  private tryFormFederation(civManager: CivManager, tick: number): void {
    if (this.federations.length >= MAX_FEDERATIONS) return
    if (Math.random() > FORM_CHANCE) return

    const civIds = [...civManager.civilizations.keys()]
    if (civIds.length < 3) return

    // Find civs not already in a federation
    const fedMembers = new Set(this.federations.flatMap(f => f.members))
    const available = civIds.filter(id => !fedMembers.has(id))
    if (available.length < 2) return

    // Pick 2-4 civs with good relations
    const founder = available[Math.floor(Math.random() * available.length)]
    const founderCiv = civManager.civilizations.get(founder)
    if (!founderCiv) return

    const allies: number[] = [founder]
    for (const cid of available) {
      if (cid === founder) continue
      if (allies.length >= 4) break
      const rel = founderCiv.relations.get(cid) ?? 0
      if (rel > 20) allies.push(cid)
    }

    if (allies.length < 2) return

    // Pick random policies
    const numPolicies = 1 + Math.floor(Math.random() * 3)
    const shuffled = [...ALL_POLICIES].sort(() => Math.random() - 0.5)
    const policies = shuffled.slice(0, numPolicies)

    this.federations.push({
      id: this.nextId++,
      name: FEDERATION_NAMES[Math.floor(Math.random() * FEDERATION_NAMES.length)],
      members: allies,
      leader: founder,
      policies,
      foundedTick: tick,
      stability: 60 + Math.floor(Math.random() * 30),
      leaderRotationTick: tick + ROTATION_INTERVAL,
    })
  }

  private updateFederations(civManager: CivManager, tick: number): void {
    for (const fed of this.federations) {
      // Rotate leadership
      if (tick >= fed.leaderRotationTick && fed.members.length > 1) {
        const currentIdx = fed.members.indexOf(fed.leader)
        fed.leader = fed.members[(currentIdx + 1) % fed.members.length]
        fed.leaderRotationTick = tick + ROTATION_INTERVAL
      }

      // Stability fluctuation based on member relations
      let avgRelation = 0
      let count = 0
      for (const m1 of fed.members) {
        const civ = civManager.civilizations.get(m1)
        if (!civ) continue
        for (const m2 of fed.members) {
          if (m1 === m2) continue
          avgRelation += civ.relations.get(m2) ?? 0
          count++
        }
      }
      if (count > 0) {
        avgRelation /= count
        fed.stability += avgRelation > 0 ? 1 : -2
        fed.stability = Math.max(0, Math.min(100, fed.stability))
      }

      // Remove dead civs
      fed.members = fed.members.filter(m => civManager.civilizations.has(m))
      if (fed.members.length > 0 && !fed.members.includes(fed.leader)) {
        fed.leader = fed.members[0]
      }
    }
  }

  private checkDissolution(): void {
    this.federations = this.federations.filter(f =>
      f.members.length >= 2 && f.stability > DISSOLVE_THRESHOLD
    )
  }

  getFederations(): Federation[] { return this.federations }
  getFederationOf(civId: number): Federation | undefined {
    return this.federations.find(f => f.members.includes(civId))
  }
  getFederationCount(): number { return this.federations.length }
}
