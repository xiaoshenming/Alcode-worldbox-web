import { describe, it, expect, beforeEach } from 'vitest'
import { TradeNegotiationSystem } from '../systems/TradeNegotiationSystem'
import type { Negotiation, TradeDeal, NegotiationStatus, ProposalType } from '../systems/TradeNegotiationSystem'

function makeSys(): TradeNegotiationSystem { return new TradeNegotiationSystem() }
let nextId = 1

function makeProposal(type: ProposalType = 'resource_exchange') {
  return { type, offerResource: 'food' as const, offerAmount: 10, requestResource: 'gold' as const, requestAmount: 5 }
}
function makeNeg(status: NegotiationStatus = 'pending'): Negotiation {
  return {
    id: nextId++, initiatorId: 1, receiverId: 2,
    proposal: makeProposal(), status, startTick: 0,
    timeoutTicks: 300, acceptanceScore: 60
  }
}
function makeDeal(): TradeDeal {
  return {
    id: nextId++, civA: 1, civB: 2,
    proposal: makeProposal(), startTick: 0, duration: 3000,
    transferInterval: 200, lastTransferTick: 0, active: true
  }
}

describe('TradeNegotiationSystem.getNegotiations', () => {
  let sys: TradeNegotiationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无谈判', () => { expect(sys.getNegotiations()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;sys.getNegotiations().push(makeNeg())
    expect(sys.getNegotiations()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    ;sys.getNegotiations().push(makeNeg())
    expect(sys.getNegotiations()).toBe(sys.getNegotiations())
  })
  it('支持4种谈判状态', () => {
    const statuses: NegotiationStatus[] = ['pending', 'accepted', 'rejected', 'expired']
    statuses.forEach(s => { ;sys.getNegotiations().push(makeNeg(s)) })
    expect(sys.getNegotiations()).toHaveLength(4)
  })
})

describe('TradeNegotiationSystem.getTradeDeals', () => {
  let sys: TradeNegotiationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无协议', () => { expect(sys.getTradeDeals()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).deals.push(makeDeal())
    expect(sys.getTradeDeals()).toHaveLength(1)
  })
  it('getDealsByCiv按文明过滤', () => {
    ;(sys as any).deals.push(makeDeal())  // civA=1, civB=2
    expect(sys.getDealsByCiv(1)).toHaveLength(1)
    expect(sys.getDealsByCiv(99)).toHaveLength(0)
  })
  it('支持3种提案类型', () => {
    const types: ProposalType[] = ['resource_exchange', 'non_aggression', 'tech_sharing']
    types.forEach(t => {
      const d = makeDeal()
      d.proposal.type = t
      ;(sys as any).deals.push(d)
    })
    expect(sys.getTradeDeals()).toHaveLength(3)
  })
})
