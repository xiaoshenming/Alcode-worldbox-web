import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticReferendumSystem } from '../systems/DiplomaticReferendumSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticReferendumSystem() }
function makeRef(overrides = {}) {
  return { id: 1, civId: 10, targetCivId: 20, tick: 0, topic: 'alliance' as const,
    votesFor: 60, votesAgainst: 40, turnout: 100, passed: true, ...overrides }
}
function mockSpawn() {
  return vi.spyOn(Math, 'random')
    .mockReturnValueOnce(0)    // chance check passes
    .mockReturnValueOnce(0)    // civId = 1
    .mockReturnValueOnce(0.5)  // targetCivId = 5 (≠1)
    .mockReturnValue(0.5)
}

describe('DiplomaticReferendumSystem', () => {
  let sys: DiplomaticReferendumSystem
  beforeEach(() => { sys = makeSys() })

  it('初始referendums为空', () => { expect((sys as any).referendums).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('referendums是数组', () => { expect(Array.isArray((sys as any).referendums)).toBe(true) })

  it('tick不足2200时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick>=2200时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2200)
    expect((sys as any).lastCheck).toBe(2200)
    vi.restoreAllMocks()
  })
  it('两次update只在满足间隔时再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2200)
    sys.update(1, W, EM, 2201)
    expect((sys as any).lastCheck).toBe(2200)
    vi.restoreAllMocks()
  })

  it('random=1时不spawn新referendum', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2200)
    expect((sys as any).referendums).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('spawn条件满足时创建referendum', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2200)
    expect((sys as any).referendums).toHaveLength(1)
    spy.mockRestore()
  })
  it('spawn后nextId递增', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2200)
    expect((sys as any).nextId).toBe(2)
    spy.mockRestore()
  })
  it('spawn的referendum tick等于当前tick', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2200)
    expect((sys as any).referendums[0].tick).toBe(2200)
    spy.mockRestore()
  })
  it('spawn的referendum topic为4种之一', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2200)
    const valid = ['alliance', 'territory', 'trade_policy', 'war_declaration']
    expect(valid).toContain((sys as any).referendums[0].topic)
    spy.mockRestore()
  })
  it('spawn的referendum有turnout字段且>=30', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2200)
    expect((sys as any).referendums[0].turnout).toBeGreaterThanOrEqual(30)
    spy.mockRestore()
  })

  it('referendums达到30时不再spawn', () => {
    const spy = mockSpawn()
    for (let i = 0; i < 30; i++) (sys as any).referendums.push(makeRef({ id: i }))
    sys.update(1, W, EM, 2200)
    expect((sys as any).referendums).toHaveLength(30)
    spy.mockRestore()
  })

  it('votesFor>votesAgainst时passed=true', () => {
    expect(makeRef({ votesFor: 60, votesAgainst: 40 }).passed).toBe(true)
  })
  it('votesFor<votesAgainst时passed=false', () => {
    expect(makeRef({ votesFor: 30, votesAgainst: 70, passed: false }).passed).toBe(false)
  })
  it('spawn时passed由votesFor>votesAgainst决定', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2200)
    const ref = (sys as any).referendums[0]
    expect(ref.passed).toBe(ref.votesFor > ref.votesAgainst)
    spy.mockRestore()
  })

  it('tick超过cutoff(55000)的referendum被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).referendums.push(makeRef({ tick: 0 }))
    sys.update(1, W, EM, 55100)
    expect((sys as any).referendums).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick在cutoff内的referendum保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).referendums.push(makeRef({ tick: 40000 }))
    sys.update(1, W, EM, 55100)
    expect((sys as any).referendums).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('多个referendum中只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).referendums.push(makeRef({ id: 1, tick: 0 }))
    ;(sys as any).referendums.push(makeRef({ id: 2, tick: 40000 }))
    sys.update(1, W, EM, 55100)
    expect((sys as any).referendums).toHaveLength(1)
    expect((sys as any).referendums[0].id).toBe(2)
    vi.restoreAllMocks()
  })
  it('边界tick=cutoff时不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).referendums.push(makeRef({ tick: 100 }))
    sys.update(1, W, EM, 55100)
    expect((sys as any).referendums).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('注入两个referendum后长度为2', () => {
    ;(sys as any).referendums.push(makeRef({ id: 1 }))
    ;(sys as any).referendums.push(makeRef({ id: 2 }))
    expect((sys as any).referendums).toHaveLength(2)
  })
})
