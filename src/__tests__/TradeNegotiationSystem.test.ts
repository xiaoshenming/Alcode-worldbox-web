import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TradeNegotiationSystem } from '../systems/TradeNegotiationSystem'
import type { Negotiation, TradeDeal, NegotiationStatus, ProposalType } from '../systems/TradeNegotiationSystem'

function makeSys(): TradeNegotiationSystem { return new TradeNegotiationSystem() }
let nextId = 100

function makeProposal(type: ProposalType = 'resource_exchange') {
  return { type, offerResource: 'food' as const, offerAmount: 10, requestResource: 'gold' as const, requestAmount: 5 }
}

function makeNeg(status: NegotiationStatus = 'pending', overrides: Partial<Negotiation> = {}): Negotiation {
  return {
    id: nextId++, initiatorId: 1, receiverId: 2,
    proposal: makeProposal(), status, startTick: 0,
    timeoutTicks: 300, acceptanceScore: 60, ...overrides,
  }
}

function makeDeal(overrides: Partial<TradeDeal> = {}): TradeDeal {
  return {
    id: nextId++, civA: 1, civB: 2,
    proposal: makeProposal(), startTick: 0, duration: 3000,
    transferInterval: 200, lastTransferTick: 0, active: true, ...overrides,
  }
}

// 构建满足 update() 调用条件的 mock civManager
function makeCivManager(civs: Record<number, any> = {}) {
  return { civilizations: new Map(Object.entries(civs).map(([k, v]) => [Number(k), v])) }
}

function makeEntityManager() {
  return { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
}

// 构造文明对象（最小化）
function makeCiv(id: number, overrides: any = {}) {
  return {
    id,
    name: `Civ-${id}`,
    resources: { food: 100, wood: 80, stone: 60, gold: 40 },
    relations: new Map<number, number>(),
    techLevel: 1,
    population: 100,
    diplomaticStance: 'neutral' as const,
    research: { progress: 0 },
    ...overrides,
  }
}

describe('TradeNegotiationSystem — 初始化', () => {
  let sys: TradeNegotiationSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('初始negotiations为空', () => { expect(sys.getNegotiations()).toHaveLength(0) })
  it('初始deals为空（getTradeDeals）', () => { expect(sys.getTradeDeals()).toHaveLength(0) })
  it('初始getDealsByCiv(1)为空', () => { expect(sys.getDealsByCiv(1)).toHaveLength(0) })
  it('getNegotiations返回数组', () => { expect(Array.isArray(sys.getNegotiations())).toBe(true) })
  it('getTradeDeals返回数组', () => { expect(Array.isArray(sys.getTradeDeals())).toBe(true) })
  it('getDealsByCiv返回数组', () => { expect(Array.isArray(sys.getDealsByCiv(99))).toBe(true) })
})

describe('TradeNegotiationSystem — getNegotiations()', () => {
  let sys: TradeNegotiationSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('注入一个谈判后可查询', () => {
    sys.getNegotiations().push(makeNeg())
    expect(sys.getNegotiations()).toHaveLength(1)
  })

  it('注入多个谈判后数量正确', () => {
    for (let i = 0; i < 5; i++) sys.getNegotiations().push(makeNeg())
    expect(sys.getNegotiations()).toHaveLength(5)
  })

  it('返回内部引用（同一对象）', () => {
    sys.getNegotiations().push(makeNeg())
    expect(sys.getNegotiations()).toBe(sys.getNegotiations())
  })

  it('支持 pending 状态', () => {
    sys.getNegotiations().push(makeNeg('pending'))
    expect(sys.getNegotiations()[0].status).toBe('pending')
  })

  it('支持 accepted 状态', () => {
    sys.getNegotiations().push(makeNeg('accepted'))
    expect(sys.getNegotiations()[0].status).toBe('accepted')
  })

  it('支持 rejected 状态', () => {
    sys.getNegotiations().push(makeNeg('rejected'))
    expect(sys.getNegotiations()[0].status).toBe('rejected')
  })

  it('支持 expired 状态', () => {
    sys.getNegotiations().push(makeNeg('expired'))
    expect(sys.getNegotiations()[0].status).toBe('expired')
  })

  it('四种状态全部注入后数量为4', () => {
    const statuses: NegotiationStatus[] = ['pending', 'accepted', 'rejected', 'expired']
    statuses.forEach(s => { sys.getNegotiations().push(makeNeg(s)) })
    expect(sys.getNegotiations()).toHaveLength(4)
  })

  it('谈判对象字段完整', () => {
    const neg = makeNeg('pending', { initiatorId: 5, receiverId: 7 })
    sys.getNegotiations().push(neg)
    const result = sys.getNegotiations()[0]
    expect(result.initiatorId).toBe(5)
    expect(result.receiverId).toBe(7)
    expect(result.status).toBe('pending')
    expect(result.timeoutTicks).toBe(300)
    expect(result.acceptanceScore).toBe(60)
  })

  it('谈判proposal字段可正确存储', () => {
    const p = { type: 'tech_sharing' as ProposalType, offerResource: 'gold' as const, offerAmount: 0, requestResource: 'gold' as const, requestAmount: 0 }
    sys.getNegotiations().push(makeNeg('pending', { proposal: p }))
    expect(sys.getNegotiations()[0].proposal.type).toBe('tech_sharing')
  })
})

describe('TradeNegotiationSystem — getTradeDeals()', () => {
  let sys: TradeNegotiationSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无协议', () => { expect(sys.getTradeDeals()).toHaveLength(0) })

  it('注入一个active deal后getTradeDeals返回1条', () => {
    ;(sys as any).deals.push(makeDeal({ active: true }))
    expect(sys.getTradeDeals()).toHaveLength(1)
  })

  it('inactive的deal不出现在getTradeDeals', () => {
    ;(sys as any).deals.push(makeDeal({ active: false }))
    expect(sys.getTradeDeals()).toHaveLength(0)
  })

  it('混合active/inactive时只返回active', () => {
    ;(sys as any).deals.push(makeDeal({ active: true }))
    ;(sys as any).deals.push(makeDeal({ active: false }))
    ;(sys as any).deals.push(makeDeal({ active: true }))
    expect(sys.getTradeDeals()).toHaveLength(2)
  })

  it('getTradeDeals返回数组每次调用长度一致', () => {
    ;(sys as any).deals.push(makeDeal({ active: true }))
    expect(sys.getTradeDeals()).toHaveLength(1)
    expect(sys.getTradeDeals()).toHaveLength(1)
  })

  it('deal字段：civA/civB正确', () => {
    ;(sys as any).deals.push(makeDeal({ civA: 3, civB: 7, active: true }))
    const deal = sys.getTradeDeals()[0]
    expect(deal.civA).toBe(3)
    expect(deal.civB).toBe(7)
  })

  it('deal字段：active为true时返回', () => {
    ;(sys as any).deals.push(makeDeal({ active: true }))
    expect(sys.getTradeDeals()[0].active).toBe(true)
  })

  it('deal字段：duration正确', () => {
    ;(sys as any).deals.push(makeDeal({ duration: 5000, active: true }))
    expect(sys.getTradeDeals()[0].duration).toBe(5000)
  })

  it('deal字段：transferInterval正确', () => {
    ;(sys as any).deals.push(makeDeal({ transferInterval: 150, active: true }))
    expect(sys.getTradeDeals()[0].transferInterval).toBe(150)
  })

  it('支持 resource_exchange 提案类型', () => {
    const d = makeDeal({ active: true })
    d.proposal.type = 'resource_exchange'
    ;(sys as any).deals.push(d)
    expect(sys.getTradeDeals()[0].proposal.type).toBe('resource_exchange')
  })

  it('支持 non_aggression 提案类型', () => {
    const d = makeDeal({ active: true })
    d.proposal.type = 'non_aggression'
    ;(sys as any).deals.push(d)
    expect(sys.getTradeDeals()[0].proposal.type).toBe('non_aggression')
  })

  it('支持 tech_sharing 提案类型', () => {
    const d = makeDeal({ active: true })
    d.proposal.type = 'tech_sharing'
    ;(sys as any).deals.push(d)
    expect(sys.getTradeDeals()[0].proposal.type).toBe('tech_sharing')
  })
})

describe('TradeNegotiationSystem — getDealsByCiv()', () => {
  let sys: TradeNegotiationSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('civA=1时getDealsByCiv(1)返回该deal', () => {
    ;(sys as any).deals.push(makeDeal({ civA: 1, civB: 2, active: true }))
    expect(sys.getDealsByCiv(1)).toHaveLength(1)
  })

  it('civB=2时getDealsByCiv(2)返回该deal', () => {
    ;(sys as any).deals.push(makeDeal({ civA: 1, civB: 2, active: true }))
    expect(sys.getDealsByCiv(2)).toHaveLength(1)
  })

  it('无关文明查询返回空', () => {
    ;(sys as any).deals.push(makeDeal({ civA: 1, civB: 2, active: true }))
    expect(sys.getDealsByCiv(99)).toHaveLength(0)
  })

  it('inactive deal不出现在getDealsByCiv', () => {
    ;(sys as any).deals.push(makeDeal({ civA: 1, civB: 2, active: false }))
    expect(sys.getDealsByCiv(1)).toHaveLength(0)
  })

  it('同一文明有多个deal时全部返回', () => {
    ;(sys as any).deals.push(makeDeal({ civA: 1, civB: 2, active: true }))
    ;(sys as any).deals.push(makeDeal({ civA: 1, civB: 3, active: true }))
    ;(sys as any).deals.push(makeDeal({ civA: 4, civB: 5, active: true }))
    expect(sys.getDealsByCiv(1)).toHaveLength(2)
  })

  it('civB匹配也算作该文明的deal', () => {
    ;(sys as any).deals.push(makeDeal({ civA: 3, civB: 1, active: true }))
    expect(sys.getDealsByCiv(1)).toHaveLength(1)
  })

  it('空deals时getDealsByCiv返回空', () => {
    expect(sys.getDealsByCiv(1)).toHaveLength(0)
  })

  it('getDealsByCiv返回的deal均为active', () => {
    ;(sys as any).deals.push(makeDeal({ civA: 1, civB: 2, active: true }))
    ;(sys as any).deals.push(makeDeal({ civA: 1, civB: 3, active: false }))
    const result = sys.getDealsByCiv(1)
    expect(result.every(d => d.active)).toBe(true)
  })
})

describe('TradeNegotiationSystem — update() 超时处理', () => {
  let sys: TradeNegotiationSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('tick不是CHECK_INTERVAL(60)的倍数时update()不处理谈判', () => {
    sys.getNegotiations().push(makeNeg('pending', { startTick: 0 }))
    const cm = makeCivManager()
    const em = makeEntityManager()
    sys.update(1, em as any, cm as any, 1) // tick=1 不是60的倍数
    expect(sys.getNegotiations()[0].status).toBe('pending')
  })

  it('tick=60时update()触发超时判断', () => {
    // startTick=0, timeoutTicks=1, tick=60 => 超时
    sys.getNegotiations().push(makeNeg('pending', { startTick: 0, timeoutTicks: 1 }))
    const cm = makeCivManager()
    const em = makeEntityManager()
    sys.update(1, em as any, cm as any, 60)
    expect(sys.getNegotiations()[0].status).toBe('expired')
  })

  it('未超时的pending谈判保持pending', () => {
    // acceptanceScore=60，random=0.62 => 62*1不小于60且不大于95，pending不变
    sys.getNegotiations().push(makeNeg('pending', { startTick: 0, timeoutTicks: 1000, acceptanceScore: 60 }))
    const cm = makeCivManager()
    const em = makeEntityManager()
    // random=0.62: roll=62, 62 >= 60 (not accepted), 62 <= 95 (not rejected)
    vi.spyOn(Math, 'random').mockReturnValue(0.62)
    sys.update(1, em as any, cm as any, 60)
    expect(sys.getNegotiations()[0].status).toBe('pending')
  })

  it('random < acceptanceScore/100时谈判变为accepted', () => {
    // acceptanceScore=60，random=0.5(50 < 60)，应accepted
    sys.getNegotiations().push(makeNeg('pending', { startTick: 0, timeoutTicks: 1000, acceptanceScore: 60 }))
    const cm = makeCivManager()
    const em = makeEntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 50 < 60
    sys.update(1, em as any, cm as any, 60)
    expect(sys.getNegotiations()[0].status).toBe('accepted')
  })

  it('random > 0.95时谈判变为rejected', () => {
    sys.getNegotiations().push(makeNeg('pending', { startTick: 0, timeoutTicks: 1000, acceptanceScore: 0 }))
    const cm = makeCivManager()
    const em = makeEntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0.96) // 96 > 95
    sys.update(1, em as any, cm as any, 60)
    expect(sys.getNegotiations()[0].status).toBe('rejected')
  })

  it('update()空civManager不崩溃', () => {
    const cm = makeCivManager()
    const em = makeEntityManager()
    expect(() => sys.update(1, em as any, cm as any, 60)).not.toThrow()
  })

  it('多次调用update()不崩溃', () => {
    const cm = makeCivManager()
    const em = makeEntityManager()
    for (let i = 0; i < 5; i++) {
      expect(() => sys.update(1, em as any, cm as any, i * 60)).not.toThrow()
    }
  })
})

describe('TradeNegotiationSystem — update() 协议管理', () => {
  let sys: TradeNegotiationSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('超时deal变为inactive', () => {
    // duration=50, tick=60: 60-0=60 > 50 => 超时inactive; 60 < 50*2=100 => 未被prune
    ;(sys as any).deals.push(makeDeal({ civA: 1, civB: 2, startTick: 0, duration: 50, active: true }))
    const civA = makeCiv(1)
    const civB = makeCiv(2)
    civA.relations.set(2, 60)
    civB.relations.set(1, 60)
    const cm = makeCivManager({ 1: civA, 2: civB })
    const em = makeEntityManager()
    sys.update(1, em as any, cm as any, 60) // tick=60 > duration=50
    expect((sys as any).deals[0].active).toBe(false)
  })

  it('文明不存在时deal变为inactive', () => {
    ;(sys as any).deals.push(makeDeal({ civA: 1, civB: 2, startTick: 0, duration: 9999, active: true }))
    const cm = makeCivManager({}) // 无文明
    const em = makeEntityManager()
    sys.update(1, em as any, cm as any, 60)
    expect((sys as any).deals[0].active).toBe(false)
  })

  it('关系崩溃时deal变为inactive', () => {
    ;(sys as any).deals.push(makeDeal({ civA: 1, civB: 2, startTick: 0, duration: 9999, active: true }))
    const civA = makeCiv(1)
    const civB = makeCiv(2)
    civA.relations.set(2, -60) // 关系 < -50
    civB.relations.set(1, 60)
    const cm = makeCivManager({ 1: civA, 2: civB })
    const em = makeEntityManager()
    sys.update(1, em as any, cm as any, 60)
    expect((sys as any).deals[0].active).toBe(false)
  })

  it('non_aggression deal缓慢提升关系', () => {
    const d = makeDeal({ civA: 1, civB: 2, startTick: 0, duration: 9999, active: true })
    d.proposal.type = 'non_aggression'
    ;(sys as any).deals.push(d)
    const civA = makeCiv(1)
    const civB = makeCiv(2)
    civA.relations.set(2, 10)
    civB.relations.set(1, 10)
    const cm = makeCivManager({ 1: civA, 2: civB })
    const em = makeEntityManager()
    sys.update(1, em as any, cm as any, 60)
    expect(civA.relations.get(2)!).toBeGreaterThan(10)
    expect(civB.relations.get(1)!).toBeGreaterThan(10)
  })

  it('tech_sharing deal给techLevel低的文明加research', () => {
    const d = makeDeal({ civA: 1, civB: 2, startTick: 0, duration: 9999, active: true })
    d.proposal.type = 'tech_sharing'
    ;(sys as any).deals.push(d)
    const civA = makeCiv(1, { techLevel: 1, research: { progress: 0 } })
    const civB = makeCiv(2, { techLevel: 3, research: { progress: 0 } })
    civA.relations.set(2, 60)
    civB.relations.set(1, 60)
    const cm = makeCivManager({ 1: civA, 2: civB })
    const em = makeEntityManager()
    sys.update(1, em as any, cm as any, 60)
    expect(civA.research.progress).toBeGreaterThan(0)
  })
})

describe('TradeNegotiationSystem — Negotiation 数据结构', () => {
  let sys: TradeNegotiationSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('谈判id字段为数字', () => {
    const neg = makeNeg()
    expect(typeof neg.id).toBe('number')
  })

  it('谈判acceptanceScore在合理范围', () => {
    const neg = makeNeg('pending', { acceptanceScore: 75 })
    expect(neg.acceptanceScore).toBe(75)
  })

  it('谈判startTick字段可设置', () => {
    const neg = makeNeg('pending', { startTick: 1234 })
    expect(neg.startTick).toBe(1234)
  })

  it('谈判timeoutTicks字段可设置', () => {
    const neg = makeNeg('pending', { timeoutTicks: 500 })
    expect(neg.timeoutTicks).toBe(500)
  })

  it('Proposal的offerAmount可为小数', () => {
    const p = { type: 'resource_exchange' as ProposalType, offerResource: 'food' as const, offerAmount: 3.5, requestResource: 'gold' as const, requestAmount: 1.2 }
    const neg = makeNeg('pending', { proposal: p })
    expect(neg.proposal.offerAmount).toBeCloseTo(3.5)
  })
})

describe('TradeNegotiationSystem — TradeDeal 数据结构', () => {
  let sys: TradeNegotiationSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('deal.id为数字', () => {
    const d = makeDeal()
    expect(typeof d.id).toBe('number')
  })

  it('deal.active初始为true', () => {
    const d = makeDeal({ active: true })
    expect(d.active).toBe(true)
  })

  it('deal.lastTransferTick初始为0', () => {
    const d = makeDeal({ lastTransferTick: 0 })
    expect(d.lastTransferTick).toBe(0)
  })

  it('deal.proposal字段存储正确', () => {
    const d = makeDeal()
    expect(d.proposal.offerResource).toBe('food')
    expect(d.proposal.requestResource).toBe('gold')
  })

  it('三种提案类型都可存储在deal中', () => {
    const types: ProposalType[] = ['resource_exchange', 'non_aggression', 'tech_sharing']
    types.forEach(t => {
      const d = makeDeal({ active: true })
      d.proposal.type = t
      ;(sys as any).deals.push(d)
    })
    expect((sys as any).deals).toHaveLength(3)
  })
})
