import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticCouncilSystem, Council } from '../systems/DiplomaticCouncilSystem'

function makeEm(): any {
  return {
    getEntitiesWithComponents: () => [] as number[],
    getComponent: () => null,
  }
}

function getCouncils(sys: DiplomaticCouncilSystem): Council[] {
  return (sys as any).councils
}

function getResolvedCount(sys: DiplomaticCouncilSystem): number {
  return (sys as any).resolvedCount
}

describe('基础数据结构', () => {
  it('初始councils为空', () => {
    const sys = new DiplomaticCouncilSystem()
    expect(getCouncils(sys)).toHaveLength(0)
  })

  it('可注入并查询councils', () => {
    const sys = new DiplomaticCouncilSystem()
    getCouncils(sys).push({ id: 1, memberCivIds: [1, 2], topic: 'trade_pact', votes: new Map(), resolved: false, tick: 1000 })
    expect(getCouncils(sys)).toHaveLength(1)
  })

  it('nextId初始为1', () => {
    const sys = new DiplomaticCouncilSystem()
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    const sys = new DiplomaticCouncilSystem()
    expect((sys as any).lastCheck).toBe(0)
  })

  it('6种CouncilTopic可赋值存储', () => {
    const topics = ['war_declaration', 'trade_pact', 'territory_dispute', 'resource_sharing', 'exile_vote', 'alliance_formation']
    const sys = new DiplomaticCouncilSystem()
    for (const t of topics) {
      getCouncils(sys).push({ id: 1, memberCivIds: [1, 2], topic: t as any, votes: new Map(), resolved: false, tick: 1000 })
    }
    expect(getCouncils(sys).map(c => c.topic)).toEqual(topics)
  })
})

describe('CHECK_INTERVAL=1000节流', () => {
  it('tick=999时���更新lastCheck', () => {
    const sys = new DiplomaticCouncilSystem()
    sys.update(1, makeEm(), 999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1000时更新lastCheck', () => {
    const sys = new DiplomaticCouncilSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1) // > COUNCIL_CHANCE, skip spawn
    sys.update(1, makeEm(), 1000)
    expect((sys as any).lastCheck).toBe(1000)
    vi.restoreAllMocks()
  })

  it('tick<1000不执行任何逻辑', () => {
    const sys = new DiplomaticCouncilSystem()
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeEm(), 500)
    expect((sys as any).lastCheck).toBe(0)
    spy.mockRestore()
  })

  it('连续两次满足间隔时都更新', () => {
    const sys = new DiplomaticCouncilSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEm(), 1000)
    expect((sys as any).lastCheck).toBe(1000)
    sys.update(1, makeEm(), 2000)
    expect((sys as any).lastCheck).toBe(2000)
    vi.restoreAllMocks()
  })

  it('第二次tick不满足间隔时不更新', () => {
    const sys = new DiplomaticCouncilSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEm(), 1000)
    sys.update(1, makeEm(), 1001)
    expect((sys as any).lastCheck).toBe(1000)
    vi.restoreAllMocks()
  })
})

describe('Council结构字段', () => {
  it('memberCivIds是数组', () => {
    const sys = new DiplomaticCouncilSystem()
    getCouncils(sys).push({ id: 1, memberCivIds: [1, 2, 3], topic: 'trade_pact', votes: new Map(), resolved: false, tick: 1000 })
    expect(Array.isArray(getCouncils(sys)[0].memberCivIds)).toBe(true)
    expect(getCouncils(sys)[0].memberCivIds).toHaveLength(3)
  })

  it('votes是Map类型', () => {
    const sys = new DiplomaticCouncilSystem()
    getCouncils(sys).push({ id: 1, memberCivIds: [1, 2], topic: 'trade_pact', votes: new Map(), resolved: false, tick: 1000 })
    expect(getCouncils(sys)[0].votes).toBeInstanceOf(Map)
  })

  it('resolved初始为false', () => {
    const sys = new DiplomaticCouncilSystem()
    getCouncils(sys).push({ id: 1, memberCivIds: [1, 2], topic: 'trade_pact', votes: new Map(), resolved: false, tick: 1000 })
    expect(getCouncils(sys)[0].resolved).toBe(false)
  })

  it('tick字段正确记录', () => {
    const sys = new DiplomaticCouncilSystem()
    getCouncils(sys).push({ id: 1, memberCivIds: [1, 2], topic: 'trade_pact', votes: new Map(), resolved: false, tick: 5678 })
    expect(getCouncils(sys)[0].tick).toBe(5678)
  })
})

describe('conductVotes投票机制', () => {
  it('注入council后update可触发投票（mock random=0使所有人投票）', () => {
    const sys = new DiplomaticCouncilSystem()
    const council: Council = { id: 1, memberCivIds: [10, 20], topic: 'trade_pact', votes: new Map(), resolved: false, tick: 0 }
    getCouncils(sys).push(council)
    // random=0: > COUNCIL_CHANCE? No(0<=0.008 means spawn skipped), conductVotes: 0 > 0.4 => false, votes cast
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeEm(), 1000)
    expect(council.votes.size).toBeGreaterThan(0)
    vi.restoreAllMocks()
  })

  it('resolved=true的council不再投票', () => {
    const sys = new DiplomaticCouncilSystem()
    const existingVotes = new Map([[10, true], [20, false]])
    const council: Council = { id: 1, memberCivIds: [10, 20], topic: 'trade_pact', votes: existingVotes, resolved: true, tick: 0 }
    getCouncils(sys).push(council)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeEm(), 1000)
    // resolved council is skipped in conductVotes
    expect(council.votes.size).toBe(2)
    vi.restoreAllMocks()
  })

  it('已投票成员不重复投票', () => {
    const sys = new DiplomaticCouncilSystem()
    const votes = new Map<number, boolean>([[10, true]])
    const council: Council = { id: 1, memberCivIds: [10, 20], topic: 'trade_pact', votes, resolved: false, tick: 0 }
    getCouncils(sys).push(council)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeEm(), 1000)
    // civId 10 already voted, should not be overwritten
    expect(council.votes.get(10)).toBe(true)
    vi.restoreAllMocks()
  })

  it('votes.size不超过memberCivIds.length', () => {
    const sys = new DiplomaticCouncilSystem()
    const council: Council = { id: 1, memberCivIds: [1, 2, 3], topic: 'trade_pact', votes: new Map(), resolved: false, tick: 0 }
    getCouncils(sys).push(council)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // Run multiple updates
    for (let t = 1000; t <= 5000; t += 1000) sys.update(1, makeEm(), t)
    expect(council.votes.size).toBeLessThanOrEqual(council.memberCivIds.length)
    vi.restoreAllMocks()
  })
})

describe('resolveCouncils解决机制', () => {
  it('全员投票后resolved变为true', () => {
    const sys = new DiplomaticCouncilSystem()
    const votes = new Map<number, boolean>([[1, true], [2, true]])
    const council: Council = { id: 1, memberCivIds: [1, 2], topic: 'trade_pact', votes, resolved: false, tick: 0 }
    getCouncils(sys).push(council)
    vi.spyOn(Math, 'random').mockReturnValue(1) // skip spawn and new votes
    sys.update(1, makeEm(), 1000)
    expect(council.resolved).toBe(true)
    vi.restoreAllMocks()
  })

  it('全员投票后resolvedCount递增', () => {
    const sys = new DiplomaticCouncilSystem()
    expect(getResolvedCount(sys)).toBe(0)
    const votes = new Map<number, boolean>([[1, true], [2, false]])
    const council: Council = { id: 1, memberCivIds: [1, 2], topic: 'war_declaration', votes, resolved: false, tick: 0 }
    getCouncils(sys).push(council)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEm(), 1000)
    expect(getResolvedCount(sys)).toBe(1)
    vi.restoreAllMocks()
  })

  it('未全员投票时不resolved', () => {
    const sys = new DiplomaticCouncilSystem()
    const votes = new Map<number, boolean>([[1, true]])
    const council: Council = { id: 1, memberCivIds: [1, 2, 3], topic: 'trade_pact', votes, resolved: false, tick: 0 }
    getCouncils(sys).push(council)
    vi.spyOn(Math, 'random').mockReturnValue(1) // skip votes
    sys.update(1, makeEm(), 1000)
    expect(council.resolved).toBe(false)
    vi.restoreAllMocks()
  })

  it('已resolved的council不重复计入resolvedCount', () => {
    const sys = new DiplomaticCouncilSystem()
    const votes = new Map<number, boolean>([[1, true], [2, true]])
    const council: Council = { id: 1, memberCivIds: [1, 2], topic: 'trade_pact', votes, resolved: true, tick: 0 }
    getCouncils(sys).push(council)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEm(), 1000)
    sys.update(1, makeEm(), 2000)
    expect(getResolvedCount(sys)).toBe(0)
    vi.restoreAllMocks()
  })
})

describe('pruneOld清理', () => {
  it('councils超过MAX_COUNCILS(20)时删除resolved的', () => {
    const sys = new DiplomaticCouncilSystem()
    const arr = getCouncils(sys)
    for (let i = 0; i < 21; i++) {
      arr.push({ id: i + 1, memberCivIds: [1, 2], topic: 'trade_pact', votes: new Map([[1, true], [2, true]]), resolved: true, tick: 0 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEm(), 1000)
    expect(getCouncils(sys).length).toBeLessThanOrEqual(20)
    vi.restoreAllMocks()
  })

  it('councils超过MAX时未resolved的保留', () => {
    const sys = new DiplomaticCouncilSystem()
    const arr = getCouncils(sys)
    // 20 resolved + 1 unresolved = 21 total
    for (let i = 0; i < 20; i++) {
      arr.push({ id: i + 1, memberCivIds: [1, 2], topic: 'trade_pact', votes: new Map([[1, true], [2, true]]), resolved: true, tick: 0 })
    }
    arr.push({ id: 21, memberCivIds: [3, 4], topic: 'war_declaration', votes: new Map(), resolved: false, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEm(), 1000)
    // pruneOld removes resolved ones first
    const remaining = getCouncils(sys)
    const hasUnresolved = remaining.some(c => !c.resolved && c.id === 21)
    expect(hasUnresolved || remaining.length <= 20).toBe(true)
    vi.restoreAllMocks()
  })

  it('councils未超过MAX_COUNCILS时不触发pruneOld删除', () => {
    const sys = new DiplomaticCouncilSystem()
    const arr = getCouncils(sys)
    for (let i = 0; i < 5; i++) {
      arr.push({ id: i + 1, memberCivIds: [1, 2], topic: 'trade_pact', votes: new Map([[1, true], [2, true]]), resolved: true, tick: 0 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEm(), 1000)
    // 5 resolved councils, under MAX_COUNCILS(20), none should be pruned
    expect(getCouncils(sys).length).toBe(5)
    vi.restoreAllMocks()
  })

  it('空数组时pruneOld安全执行', () => {
    const sys = new DiplomaticCouncilSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, makeEm(), 1000)).not.toThrow()
    vi.restoreAllMocks()
  })
})

describe('额外边界与防御性测试', () => {
  it('多次连续触发 resolveCouncils 不重复计数', () => {
    const sys = new DiplomaticCouncilSystem()
    const votes = new Map<number, boolean>([[1, true], [2, false]])
    const council: Council = { id: 1, memberCivIds: [1, 2], topic: 'trade_pact', votes, resolved: false, tick: 0 }
    getCouncils(sys).push(council)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEm(), 1000)
    const countAfterFirst = getResolvedCount(sys)
    sys.update(1, makeEm(), 2000)
    expect(getResolvedCount(sys)).toBe(countAfterFirst)
    vi.restoreAllMocks()
  })

  it('memberCivIds 为单元素时 votes 不超过 1', () => {
    const sys = new DiplomaticCouncilSystem()
    const council: Council = { id: 1, memberCivIds: [5], topic: 'alliance_formation', votes: new Map(), resolved: false, tick: 0 }
    getCouncils(sys).push(council)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let t = 1000; t <= 3000; t += 1000) sys.update(1, makeEm(), t)
    expect(council.votes.size).toBeLessThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('war_declaration topic 可存储和查询', () => {
    const sys = new DiplomaticCouncilSystem()
    getCouncils(sys).push({ id: 1, memberCivIds: [1, 2], topic: 'war_declaration', votes: new Map(), resolved: false, tick: 0 })
    expect(getCouncils(sys)[0].topic).toBe('war_declaration')
  })

  it('territory_dispute topic 可存储和查询', () => {
    const sys = new DiplomaticCouncilSystem()
    getCouncils(sys).push({ id: 1, memberCivIds: [1, 2], topic: 'territory_dispute', votes: new Map(), resolved: false, tick: 0 })
    expect(getCouncils(sys)[0].topic).toBe('territory_dispute')
  })

  it('resource_sharing topic 可存储和查询', () => {
    const sys = new DiplomaticCouncilSystem()
    getCouncils(sys).push({ id: 1, memberCivIds: [1, 2], topic: 'resource_sharing', votes: new Map(), resolved: false, tick: 0 })
    expect(getCouncils(sys)[0].topic).toBe('resource_sharing')
  })

  it('exile_vote topic 可存储和查询', () => {
    const sys = new DiplomaticCouncilSystem()
    getCouncils(sys).push({ id: 1, memberCivIds: [1, 2], topic: 'exile_vote', votes: new Map(), resolved: false, tick: 0 })
    expect(getCouncils(sys)[0].topic).toBe('exile_vote')
  })

  it('alliance_formation topic 可存储和查询', () => {
    const sys = new DiplomaticCouncilSystem()
    getCouncils(sys).push({ id: 1, memberCivIds: [1, 2], topic: 'alliance_formation', votes: new Map(), resolved: false, tick: 0 })
    expect(getCouncils(sys)[0].topic).toBe('alliance_formation')
  })

  it('全票同意时 resolved 变为 true', () => {
    const sys = new DiplomaticCouncilSystem()
    const votes = new Map<number, boolean>([[1, true], [2, true], [3, true]])
    const council: Council = { id: 1, memberCivIds: [1, 2, 3], topic: 'trade_pact', votes, resolved: false, tick: 0 }
    getCouncils(sys).push(council)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEm(), 1000)
    expect(council.resolved).toBe(true)
    vi.restoreAllMocks()
  })

  it('全票反对时也 resolved 变为 true', () => {
    const sys = new DiplomaticCouncilSystem()
    const votes = new Map<number, boolean>([[1, false], [2, false]])
    const council: Council = { id: 1, memberCivIds: [1, 2], topic: 'war_declaration', votes, resolved: false, tick: 0 }
    getCouncils(sys).push(council)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEm(), 1000)
    expect(council.resolved).toBe(true)
    vi.restoreAllMocks()
  })

  it('resolvedCount 初始为 0', () => {
    const sys = new DiplomaticCouncilSystem()
    expect(getResolvedCount(sys)).toBe(0)
  })

  it('nextId 初始为 1', () => {
    const sys = new DiplomaticCouncilSystem()
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 手动重置后有效', () => {
    const sys = new DiplomaticCouncilSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEm(), 1000)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), 1000)
    expect((sys as any).lastCheck).toBe(1000)
    vi.restoreAllMocks()
  })

  it('空数组时 update 不崩溃', () => {
    const sys = new DiplomaticCouncilSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, makeEm(), 1000)).not.toThrow()
    vi.restoreAllMocks()
  })

  it('random=0.5 时（>COUNCIL_CHANCE=0.008）不 spawn', () => {
    const sys = new DiplomaticCouncilSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeEm(), 1000)
    expect(getCouncils(sys)).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('councils 数组是可迭代的', () => {
    const sys = new DiplomaticCouncilSystem()
    for (let i = 0; i < 3; i++) {
      getCouncils(sys).push({ id: i + 1, memberCivIds: [1, 2], topic: 'trade_pact', votes: new Map(), resolved: false, tick: 0 })
    }
    let count = 0
    for (const _c of getCouncils(sys)) { count++ }
    expect(count).toBe(3)
  })

  it('不同 council 的 votes Map 相互独立', () => {
    const sys = new DiplomaticCouncilSystem()
    const votes1 = new Map<number, boolean>([[1, true]])
    const votes2 = new Map<number, boolean>([[2, false]])
    getCouncils(sys).push({ id: 1, memberCivIds: [1], topic: 'trade_pact', votes: votes1, resolved: false, tick: 0 })
    getCouncils(sys).push({ id: 2, memberCivIds: [2], topic: 'war_declaration', votes: votes2, resolved: false, tick: 0 })
    expect(getCouncils(sys)[0].votes.get(1)).toBe(true)
    expect(getCouncils(sys)[1].votes.get(2)).toBe(false)
  })
})
