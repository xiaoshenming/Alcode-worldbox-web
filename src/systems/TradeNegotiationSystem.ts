// Trade Negotiation System (v2.01)
// Civilizations negotiate trade deals: resource exchange, non-aggression pacts, tech sharing

import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'
import { EntityManager } from '../ecs/Entity'
import { EventLog } from './EventLog'

type ResourceKey = 'food' | 'wood' | 'stone' | 'gold'

export type NegotiationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export type ProposalType = 'resource_exchange' | 'non_aggression' | 'tech_sharing'

export interface TradeProposal {
  type: ProposalType
  offerResource: ResourceKey
  offerAmount: number
  requestResource: ResourceKey
  requestAmount: number
}

export interface Negotiation {
  id: number
  initiatorId: number
  receiverId: number
  proposal: TradeProposal
  status: NegotiationStatus
  startTick: number
  timeoutTicks: number
  /** 0-100, how likely the receiver is to accept */
  acceptanceScore: number
}

export interface TradeDeal {
  id: number
  civA: number
  civB: number
  proposal: TradeProposal
  startTick: number
  duration: number
  /** Ticks between each resource transfer */
  transferInterval: number
  lastTransferTick: number
  active: boolean
}

const NEGOTIATION_TIMEOUT = 300
const DEAL_DURATION = 3000
const TRANSFER_INTERVAL = 200
const CHECK_INTERVAL = 60
const MAX_NEGOTIATIONS = 30
const MAX_DEALS = 50

let nextNegotiationId = 1
let nextDealId = 1

/**
 * Manages trade negotiations between civilizations.
 * Civs with good relations can propose resource exchanges, non-aggression pacts,
 * and tech sharing agreements. Negotiations resolve over time based on
 * diplomatic relations, resource needs, and relative power.
 */
export class TradeNegotiationSystem {
  private negotiations: Negotiation[] = []
  private deals: TradeDeal[] = []

  update(dt: number, entityManager: EntityManager, civManager: CivManager, tick: number): void {
    if (tick % CHECK_INTERVAL !== 0) return

    const civs: Civilization[] = []
    for (const civ of civManager.civilizations.values()) civs.push(civ)

    this.updateNegotiations(civManager, tick)
    this.updateDeals(civManager, tick)
    this.tryInitiateNegotiations(civs, civManager, tick)
  }

  private updateNegotiations(civManager: CivManager, tick: number): void {
    for (let i = this.negotiations.length - 1; i >= 0; i--) {
      const neg = this.negotiations[i]
      if (neg.status !== 'pending') continue

      // Timeout check
      if (tick - neg.startTick > neg.timeoutTicks) {
        neg.status = 'expired'
        continue
      }

      // Resolve: roll against acceptance score each check
      const roll = Math.random() * 100
      if (roll < neg.acceptanceScore) {
        neg.status = 'accepted'
        this.createDeal(neg, civManager, tick)
      } else if (roll > 95) {
        // Small chance of outright rejection each tick
        neg.status = 'rejected'
        this.onRejected(neg, civManager, tick)
      }
    }

    // Prune old resolved negotiations
    for (let i = this.negotiations.length - 1; i >= 0; i--) {
      const n = this.negotiations[i]
      if (n.status !== 'pending' && tick - n.startTick >= NEGOTIATION_TIMEOUT * 2) {
        this.negotiations.splice(i, 1)
      }
    }
  }

  private updateDeals(civManager: CivManager, tick: number): void {
    for (const deal of this.deals) {
      if (!deal.active) continue

      // Expiry
      if (tick - deal.startTick > deal.duration) {
        deal.active = false
        this.onDealExpired(deal, civManager, tick)
        continue
      }

      // Check both civs still exist
      const civA = civManager.civilizations.get(deal.civA)
      const civB = civManager.civilizations.get(deal.civB)
      if (!civA || !civB) {
        deal.active = false
        continue
      }

      // Check relations haven't collapsed
      const rel = civA.relations.get(civB.id) ?? 0
      if (rel < -50) {
        deal.active = false
        const nameA = civA.name
        const nameB = civB.name
        EventLog.log('trade', `Trade deal between ${nameA} and ${nameB} collapsed due to hostility`, tick)
        continue
      }

      // Periodic resource transfer
      if (deal.proposal.type === 'resource_exchange' && tick - deal.lastTransferTick >= deal.transferInterval) {
        this.executeTransfer(deal, civA, civB, tick)
        deal.lastTransferTick = tick
      }

      // Tech sharing: slow tech boost
      if (deal.proposal.type === 'tech_sharing') {
        this.applyTechSharing(civA, civB)
      }

      // Non-aggression: slow relation improvement
      if (deal.proposal.type === 'non_aggression') {
        const relA = civA.relations.get(civB.id) ?? 0
        const relB = civB.relations.get(civA.id) ?? 0
        civA.relations.set(civB.id, Math.min(100, relA + 0.02))
        civB.relations.set(civA.id, Math.min(100, relB + 0.02))
      }
    }

    // Prune inactive deals older than 2x duration
    for (let i = this.deals.length - 1; i >= 0; i--) {
      const d = this.deals[i]
      if (!d.active && tick - d.startTick >= d.duration * 2) {
        this.deals.splice(i, 1)
      }
    }
  }

  private tryInitiateNegotiations(civs: Civilization[], civManager: CivManager, tick: number): void {
    let pendingCount = 0
    for (const n of this.negotiations) { if (n.status === 'pending') pendingCount++ }
    if (pendingCount >= MAX_NEGOTIATIONS) return

    for (let i = 0; i < civs.length; i++) {
      for (let j = i + 1; j < civs.length; j++) {
        const a = civs[i]
        const b = civs[j]
        const rel = a.relations.get(b.id) ?? 0

        // Need positive relations to even consider negotiating
        if (rel < 10) continue

        // Already negotiating?
        if (this.hasActiveNegotiation(a.id, b.id)) continue

        // Probability scales with relation: friendly civs negotiate more
        const baseProbability = (rel - 10) / 900 // 0 at rel=10, ~0.1 at rel=100
        const stanceMult = this.stanceMultiplier(a) * this.stanceMultiplier(b)
        if (Math.random() > baseProbability * stanceMult) continue

        const proposalType = this.pickProposalType(a, b, rel)
        const proposal = this.buildProposal(proposalType, a, b)
        const score = this.calculateAcceptance(a, b, proposal, rel)

        this.negotiations.push({
          id: nextNegotiationId++,
          initiatorId: a.id,
          receiverId: b.id,
          proposal,
          status: 'pending',
          startTick: tick,
          timeoutTicks: NEGOTIATION_TIMEOUT,
          acceptanceScore: score,
        })

        EventLog.log('diplomacy', `${a.name} proposed a ${formatProposalType(proposalType)} to ${b.name}`, tick)
      }
    }
  }

  private pickProposalType(a: Civilization, b: Civilization, relation: number): ProposalType {
    // High relation + high tech -> tech sharing
    if (relation > 60 && a.techLevel >= 3 && b.techLevel >= 3 && Math.random() < 0.3) {
      return 'tech_sharing'
    }
    // Moderate relation -> non-aggression
    if (relation > 20 && relation < 50 && Math.random() < 0.4) {
      return 'non_aggression'
    }
    return 'resource_exchange'
  }

  private buildProposal(type: ProposalType, initiator: Civilization, receiver: Civilization): TradeProposal {
    if (type === 'resource_exchange') {
      const surplus = this.findSurplus(initiator)
      const need = this.findNeed(receiver)
      const offerAmount = Math.min(10, initiator.resources[surplus] * 0.08)
      const requestAmount = Math.min(10, receiver.resources[need] * 0.08)
      return { type, offerResource: surplus, offerAmount, requestResource: need, requestAmount }
    }
    // Non-resource proposals use gold as nominal placeholder
    return { type, offerResource: 'gold', offerAmount: 0, requestResource: 'gold', requestAmount: 0 }
  }

  private calculateAcceptance(initiator: Civilization, receiver: Civilization, proposal: TradeProposal, relation: number): number {
    let score = relation * 0.3 // base: 0-30 from relation

    // Resource exchange: receiver benefits more if they need the offered resource
    if (proposal.type === 'resource_exchange') {
      const receiverSupply = receiver.resources[proposal.offerResource]
      const needFactor = Math.max(0, 30 - receiverSupply) // more need = higher score
      score += needFactor * 0.5

      // Fairness: penalize lopsided deals
      if (proposal.offerAmount > 0 && proposal.requestAmount > 0) {
        const ratio = proposal.offerAmount / proposal.requestAmount
        if (ratio > 0.5 && ratio < 2.0) score += 10
      }
    }

    // Tech sharing: higher tech civs are less eager to share
    if (proposal.type === 'tech_sharing') {
      const techGap = Math.abs(initiator.techLevel - receiver.techLevel)
      score += 10 - techGap * 5 // penalize large gaps (the advanced civ won't want to share)
      if (receiver.techLevel < initiator.techLevel) score += 15 // receiver benefits
    }

    // Non-aggression: aggressive civs less likely to accept
    if (proposal.type === 'non_aggression') {
      score += 15
      if (receiver.diplomaticStance === 'aggressive') score -= 20
      if (receiver.diplomaticStance === 'peaceful') score += 15
    }

    // Power balance: weaker civs more willing to negotiate
    const powerRatio = receiver.population > 0 ? initiator.population / receiver.population : 1
    if (powerRatio > 1.5) score += 10 // receiver is weaker, more willing
    if (powerRatio < 0.5) score -= 10 // receiver is stronger, less interested

    return Math.max(5, Math.min(80, score))
  }

  private createDeal(neg: Negotiation, civManager: CivManager, tick: number): void {
    let activeCount = 0
    for (const d of this.deals) { if (d.active) activeCount++ }
    if (activeCount >= MAX_DEALS) return

    const deal: TradeDeal = {
      id: nextDealId++,
      civA: neg.initiatorId,
      civB: neg.receiverId,
      proposal: neg.proposal,
      startTick: tick,
      duration: DEAL_DURATION,
      transferInterval: TRANSFER_INTERVAL,
      lastTransferTick: tick,
      active: true,
    }
    this.deals.push(deal)

    const nameA = this.getCivName(neg.initiatorId, civManager)
    const nameB = this.getCivName(neg.receiverId, civManager)
    EventLog.log('trade', `${nameA} and ${nameB} signed a ${formatProposalType(neg.proposal.type)}`, tick)

    // Relation boost on deal signing
    const civA = civManager.civilizations.get(neg.initiatorId)
    const civB = civManager.civilizations.get(neg.receiverId)
    if (civA && civB) {
      civA.relations.set(civB.id, Math.min(100, (civA.relations.get(civB.id) ?? 0) + 5))
      civB.relations.set(civA.id, Math.min(100, (civB.relations.get(civA.id) ?? 0) + 5))
    }
  }

  private onRejected(neg: Negotiation, civManager: CivManager, tick: number): void {
    const nameA = this.getCivName(neg.initiatorId, civManager)
    const nameB = this.getCivName(neg.receiverId, civManager)
    EventLog.log('diplomacy', `${nameB} rejected ${nameA}'s trade proposal`, tick)

    // Small relation penalty
    const civA = civManager.civilizations.get(neg.initiatorId)
    const civB = civManager.civilizations.get(neg.receiverId)
    if (civA && civB) {
      civA.relations.set(civB.id, Math.max(-100, (civA.relations.get(civB.id) ?? 0) - 2))
    }
  }

  private onDealExpired(deal: TradeDeal, civManager: CivManager, tick: number): void {
    const nameA = this.getCivName(deal.civA, civManager)
    const nameB = this.getCivName(deal.civB, civManager)
    EventLog.log('trade', `${formatProposalType(deal.proposal.type)} between ${nameA} and ${nameB} expired`, tick)
  }

  private executeTransfer(deal: TradeDeal, civA: Civilization, civB: Civilization, tick: number): void {
    const p = deal.proposal
    const giveAmount = Math.min(p.offerAmount, civA.resources[p.offerResource])
    const receiveAmount = Math.min(p.requestAmount, civB.resources[p.requestResource])

    if (giveAmount < 0.1 || receiveAmount < 0.1) return

    civA.resources[p.offerResource] -= giveAmount
    civB.resources[p.offerResource] += giveAmount
    civB.resources[p.requestResource] -= receiveAmount
    civA.resources[p.requestResource] += receiveAmount
  }

  private applyTechSharing(civA: Civilization, civB: Civilization): void {
    // Slower civ gets a tiny research boost
    if (civA.techLevel < civB.techLevel) {
      civA.research.progress = Math.min(100, civA.research.progress + 0.01)
    } else if (civB.techLevel < civA.techLevel) {
      civB.research.progress = Math.min(100, civB.research.progress + 0.01)
    }
  }

  private hasActiveNegotiation(civA: number, civB: number): boolean {
    return this.negotiations.some(
      n => n.status === 'pending' &&
        ((n.initiatorId === civA && n.receiverId === civB) ||
         (n.initiatorId === civB && n.receiverId === civA))
    )
  }

  private stanceMultiplier(civ: Civilization): number {
    switch (civ.diplomaticStance) {
      case 'peaceful': return 1.5
      case 'neutral': return 1.0
      case 'aggressive': return 0.4
      case 'isolationist': return 0.2
    }
  }

  private findSurplus(civ: Civilization): ResourceKey {
    const keys: ResourceKey[] = ['food', 'wood', 'stone', 'gold']
    let best: ResourceKey = 'food'
    let bestVal = 0
    for (const k of keys) {
      if (civ.resources[k] > bestVal) {
        bestVal = civ.resources[k]
        best = k
      }
    }
    return best
  }

  private findNeed(civ: Civilization): ResourceKey {
    const keys: ResourceKey[] = ['food', 'wood', 'stone', 'gold']
    let worst: ResourceKey = 'food'
    let worstVal = Infinity
    for (const k of keys) {
      if (civ.resources[k] < worstVal) {
        worstVal = civ.resources[k]
        worst = k
      }
    }
    return worst
  }

  private getCivName(civId: number, civManager: CivManager): string {
    return civManager.civilizations.get(civId)?.name ?? `Civ#${civId}`
  }

  /** Returns all current negotiations (including resolved ones still in buffer). */
  getNegotiations(): Negotiation[] {
    return this.negotiations
  }

  /** Returns all active trade deals. */
  getTradeDeals(): TradeDeal[] {
    return this.deals.filter(d => d.active)
  }

  /** Returns deals for a specific civilization. */
  getDealsByCiv(civId: number): TradeDeal[] {
    return this.deals.filter(d => d.active && (d.civA === civId || d.civB === civId))
  }
}

function formatProposalType(type: ProposalType): string {
  switch (type) {
    case 'resource_exchange': return 'Resource Exchange'
    case 'non_aggression': return 'Non-Aggression Pact'
    case 'tech_sharing': return 'Tech Sharing Agreement'
  }
}
