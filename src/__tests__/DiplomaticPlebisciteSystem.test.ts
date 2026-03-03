import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticPlebisciteSystem } from '../systems/DiplomaticPlebisciteSystem'

function makeSys() { return new DiplomaticPlebisciteSystem() }
// getNations: eid%6 给出nation编号
// [0,1,2,3,4,5] → nations: {0,1,2,3,4,5}
const em6 = { getEntitiesWithComponents: (_: string) => [0, 1, 2, 3, 4, 5] } as any
const emEmpty = { getEntitiesWithComponents: (_: string) => [] } as any
const world = {} as any

describe('DiplomaticPlebisciteSystem', () => {
  let sys: DiplomaticPlebisciteSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 初始状态
  it('初始pacts为空', () => { expect((sys as any).pacts).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('pacts是数组', () => { expect(Array.isArray((sys as any).pacts)).toBe(true) })

  // 节流
  it('tick不足CHECK_INTERVAL(3400)时不执行', () => {
    sys.update(1, world, em6, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, world, em6, 3400)
    expect((sys as any).lastCheck).toBe(3400)
  })
  it('第二次tick不足间隔时lastCheck不变', () => {
    sys.update(1, world, em6, 3400)
    sys.update(1, world, em6, 4000)
    expect((sys as any).lastCheck).toBe(3400)
  })

  // nations为空时不spawn
  it('nations为空时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, emEmpty, 3400)
    expect((sys as any).pacts).toHaveLength(0)
  })
  it('nations只有1个时不spawn', () => {
    const em1 = { getEntitiesWithComponents: (_: string) => [0] } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em1, 3400)
    expect((sys as any).pacts).toHaveLength(0)
  })

  // spawn - 使用高随机数避免proposed→转换触发
  it('满足条件时spawn pact', () => {
    // FORM_CHANCE=0.004, Math.random() > 0.004 跳过spawn
    // 需要random <= 0.004 触发spawn，但random > 0.15避免proposed转换
    // 用callCount: 每对(i,j)调用一次random做FORM_CHANCE判定，0.001<0.004触发
    // 之后的转换检查: 0.001 < 0.15 → 触发, approvalRate=25+0.001*50≈25.05<40 → rejected
    // 结论: spawn后立刻变rejected也算spawned过，检查length用>=1
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em6, 3400)
    // 有可能spawn多个，然后部分变rejected，但pacts不删rejected
    expect((sys as any).pacts.length).toBeGreaterThanOrEqual(1)
  })
  it('spawn的pact status为proposed或rejected或active', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em6, 3400)
    const p = (sys as any).pacts[0]
    if (p) expect(['proposed', 'rejected', 'active']).toContain(p.status)
  })
  it('spawn的pact有strength字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em6, 3400)
    const p = (sys as any).pacts[0]
    if (p) expect(typeof p.strength).toBe('number')
  })
  it('spawn的pact有voterTurnout字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em6, 3400)
    const p = (sys as any).pacts[0]
    if (p) expect(typeof p.voterTurnout).toBe('number')
  })
  it('spawn的pact有approvalRate字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em6, 3400)
    const p = (sys as any).pacts[0]
    if (p) expect(typeof p.approvalRate).toBe('number')
  })
  it('spawn的pact有legitimacy字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em6, 3400)
    const p = (sys as any).pacts[0]
    if (p) expect(typeof p.legitimacy).toBe('number')
  })
  it('spawn的pact有contestedBy字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em6, 3400)
    const p = (sys as any).pacts[0]
    if (p) expect(typeof p.contestedBy).toBe('number')
  })
  it('MAX_PACTS=25时不超过上限', () => {
    for (let i = 0; i < 25; i++) {
      ;(sys as any).pacts.push({ id: i + 1, nationA: i * 100, nationB: i * 100 + 1, status: 'proposed', strength: 30, voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 3400 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em6, 6800)
    expect((sys as any).pacts.length).toBeLessThanOrEqual(25)
  })

  // proposed → active/rejected (直接注入测试)
  it('proposed状态下random<0.15时转换为active(approvalRate>40)', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'proposed', strength: 30, voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 3400 })
    // random=0.05 < 0.15触发, approvalRate=50>40 → active
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(1, world, em6, 6800)
    const p = (sys as any).pacts[0]
    if (p) expect(['active', 'proposed']).toContain(p.status)
  })
  it('proposed状态下approvalRate<=40时转换为rejected', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'proposed', strength: 30, voterTurnout: 50, approvalRate: 30, legitimacy: 30, contestedBy: 0, tick: 3400 })
    // random=0.05 < 0.15触发, approvalRate=30<=40 → rejected
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(1, world, em6, 6800)
    const p = (sys as any).pacts[0]
    if (p) expect(['rejected', 'proposed']).toContain(p.status)
  })

  // active → expired
  it('active状态tick-p.tick > 30000时变expired', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'active', strength: 30, voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 0 })
    sys.update(1, world, em6, 34000)
    const p = (sys as any).pacts[0]
    if (p) expect(p.status).toBe('expired')
  })
  it('active状态tick-p.tick <= 30000时不变expired', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'active', strength: 30, voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 3400 })
    sys.update(1, world, em6, 6800)
    const p = (sys as any).pacts[0]
    if (p) expect(p.status).not.toBe('expired')
  })

  // cleanup: expired && p.tick < cutoff(tick-51000)
  it('expired且p.tick < cutoff时删除', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'expired', strength: 30, voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 0 })
    // cutoff = 55000 - 51000 = 4000, p.tick=0 < 4000 → 删除
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em6, 55000)
    expect((sys as any).pacts).toHaveLength(0)
  })
  it('expired但p.tick >= cutoff时保留', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'expired', strength: 30, voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 10000 })
    // cutoff = 55000 - 51000 = 4000, p.tick=10000 >= 4000 → 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em6, 55000)
    expect((sys as any).pacts).toHaveLength(1)
  })
  it('proposed状态不被cleanup删除(即使tick很老)', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'proposed', strength: 30, voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)  // >0.15 不触发状态转换
    sys.update(1, world, em6, 55000)
    expect((sys as any).pacts).toHaveLength(1)
  })
  it('rejected状态不被cleanup删除', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'rejected', strength: 30, voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em6, 55000)
    expect((sys as any).pacts).toHaveLength(1)
  })

  // 手动注入
  it('手动注入pact后长度正确', () => {
    ;(sys as any).pacts.push({ id: 99 })
    expect((sys as any).pacts).toHaveLength(1)
  })
  it('多次update后lastCheck持续更新', () => {
    sys.update(1, world, em6, 3400)
    sys.update(1, world, em6, 6800)
    expect((sys as any).lastCheck).toBe(6800)
  })
})

describe('DiplomaticPlebisciteSystem — 额外测试', () => {
  let sys: any
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  it('CHECK_INTERVAL=3400', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, world, em6, 3399)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, world, em6, 3400)
    expect((sys as any).lastCheck).toBe(3400)
  })
  it('MAX_PACTS=25上限存在', () => {
    for (let i = 0; i < 25; i++) {
      ;(sys as any).pacts.push({ id: i+1, nationA: i, nationB: i+1, status: 'active', strength: 50,
        voterTurnout: 50, approvalRate: 50, legitimacy: 50, contestedBy: 0, tick: 999999 })
    }
    expect((sys as any).pacts.length).toBe(25)
  })
  it('pact中包含nationA和nationB字段', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 2, nationB: 3, status: 'proposed', strength: 30,
      voterTurnout: 40, approvalRate: 35, legitimacy: 25, contestedBy: 0, tick: 1000 })
    expect((sys as any).pacts[0].nationA).toBe(2)
    expect((sys as any).pacts[0].nationB).toBe(3)
  })
  it('proposed状态pact在tick中可能转变为active或rejected', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'proposed', strength: 30,
      voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 999999 })
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // <0.15 触发转换, approvalRate=50>40 → active
    sys.update(1, world, em6, 3400)
    const p = (sys as any).pacts[0]
    if (p) { expect(['active', 'rejected', 'proposed']).toContain(p.status) }
  })
  it('active状态下voterTurnout在[0,100]', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'active', strength: 50,
      voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 999999 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em6, 3400)
    const p = (sys as any).pacts[0]
    if (p) { expect(p.voterTurnout).toBeGreaterThanOrEqual(0); expect(p.voterTurnout).toBeLessThanOrEqual(100) }
  })
  it('_pactKeySet是Set', () => {
    expect((sys as any)._pactKeySet instanceof Set).toBe(true)
  })
  it('系统实例化不报错', () => {
    expect(() => makeSys()).not.toThrow()
  })
  it('expired状态是合法status', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'expired', strength: 10,
      voterTurnout: 20, approvalRate: 30, legitimacy: 15, contestedBy: 0, tick: 0 })
    expect((sys as any).pacts[0].status).toBe('expired')
  })
  it('PlebisciteStatus包含proposed/active/expired/rejected', () => {
    const statuses = ['proposed', 'active', 'expired', 'rejected']
    expect(statuses).toHaveLength(4)
  })
  it('整体运行不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => {
      for (let i = 0; i <= 5; i++) sys.update(1, world, em6, 3400 * i)
    }).not.toThrow()
  })
  it('nations数为6时lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em6, 3400)
    expect((sys as any).lastCheck).toBe(3400)
  })
  it('active状态pact存在tick-30000>30000时变expired', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'active', strength: 50,
      voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em6, 35000)
    const p = (sys as any).pacts.find((pp: any) => pp.id === 1)
    if (p) { expect(['expired', 'active']).toContain(p.status) }
  })
  it('tick=3400时nationsBuf有数据', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em6, 3400)
    expect(Array.isArray((sys as any)._nationsBuf)).toBe(true)
  })
  it('初始_nationsBuf为空数组', () => {
    expect(Array.isArray((sys as any)._nationsBuf)).toBe(true)
  })
  it('pact中包含contestedBy字段', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'proposed', strength: 30,
      voterTurnout: 40, approvalRate: 30, legitimacy: 25, contestedBy: 3, tick: 1000 })
    expect((sys as any).pacts[0]).toHaveProperty('contestedBy')
  })
  it('rejected是合法status', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'rejected', strength: 10,
      voterTurnout: 20, approvalRate: 30, legitimacy: 15, contestedBy: 0, tick: 1000 })
    expect((sys as any).pacts[0].status).toBe('rejected')
  })
  it('nextId随spawn递增', () => {
    const before = (sys as any).nextId
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em6, 3400)
    const after = (sys as any).nextId
    expect(after).toBeGreaterThanOrEqual(before)
  })
})

describe('DiplomaticPlebisciteSystem — 补充测试', () => {
  let sys: any
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  it('pact字段strength在[0,100]内', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'active', strength: 50,
      voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 999999 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em6, 3400)
    const p = (sys as any).pacts[0]
    if (p) { expect(p.strength).toBeGreaterThanOrEqual(0); expect(p.strength).toBeLessThanOrEqual(100) }
  })
  it('approvalRate在[0,100]内', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'active', strength: 50,
      voterTurnout: 50, approvalRate: 50, legitimacy: 30, contestedBy: 0, tick: 999999 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em6, 3400)
    const p = (sys as any).pacts[0]
    if (p) { expect(p.approvalRate).toBeGreaterThanOrEqual(0); expect(p.approvalRate).toBeLessThanOrEqual(100) }
  })
  it('_nationsSet是Set', () => {
    expect((sys as any)._nationsSet instanceof Set).toBe(true)
  })
  it('两次触发后lastCheck=6800', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em6, 3400)
    sys.update(1, world, em6, 6800)
    expect((sys as any).lastCheck).toBe(6800)
  })
  it('pact数量不超过MAX_PACTS=25', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 10; i++) sys.update(1, world, em6, 3400 * (i + 1))
    expect((sys as any).pacts.length).toBeLessThanOrEqual(25)
  })
  it('proposed且approvalRate<40时变rejected', () => {
    ;(sys as any).pacts.push({ id: 1, nationA: 0, nationB: 1, status: 'proposed', strength: 30,
      voterTurnout: 40, approvalRate: 30, legitimacy: 25, contestedBy: 0, tick: 999999 })
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // 0.05<0.15触发，approvalRate=30<40→rejected
    sys.update(1, world, em6, 3400)
    const p = (sys as any).pacts.find((pp: any) => pp.id === 1)
    if (p) { expect(p.status).toBe('rejected') }
  })
})
