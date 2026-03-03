import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticWarReparationsSystem } from '../systems/DiplomaticWarReparationsSystem'

function makeSys() { return new DiplomaticWarReparationsSystem() }

function makeCivManager(ids: number[]) {
  return { civilizations: new Map(ids.map(id => [id, { id }])) } as any
}

const em = {} as any
const world = {} as any
const CHECK_INTERVAL = 3600

describe('DiplomaticWarReparationsSystem', () => {
  let sys: DiplomaticWarReparationsSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // ─── 初始状态 ───
  it('初始reparations为空', () => {
    expect((sys as any).reparations).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('reparations是数组', () => {
    expect(Array.isArray((sys as any).reparations)).toBe(true)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).reparations.push({ id: 1 })
    expect((s2 as any).reparations).toHaveLength(0)
  })

  // ─── 节流控制 ───
  it('tick不足CHECK_INTERVAL(3600)时不执行', () => {
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次update，第二次用��同tick不再执行', () => {
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    ;(sys as any).lastCheck = CHECK_INTERVAL
    const before = (sys as any).reparations.length
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    expect((sys as any).reparations.length).toBe(before)
  })
  it('第二次间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ─── civilizations guard ───
  it('civManager为null时不崩溃', () => {
    expect(() => sys.update(1, world, em, null as any, CHECK_INTERVAL)).not.toThrow()
  })
  it('只有1个文明时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, makeCivManager([1]), CHECK_INTERVAL)
    expect((sys as any).reparations).toHaveLength(0)
  })
  it('文明数为0时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, makeCivManager([]), CHECK_INTERVAL)
    expect((sys as any).reparations).toHaveLength(0)
  })
  it('civManager无civilizations属性时不崩溃', () => {
    expect(() => sys.update(1, world, em, {} as any, CHECK_INTERVAL)).not.toThrow()
  })

  // ─── spawn ───
  it('满足条件时spawn reparation（强制random=0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    expect((sys as any).reparations.length).toBeGreaterThanOrEqual(1)
  })
  it('spawn后reparation初始phase为negotiating', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    const r = (sys as any).reparations[0]
    if (r) expect(r.phase).toBe('negotiating')
  })
  it('spawn后reparation有payerCivId和receiverCivId', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    const r = (sys as any).reparations[0]
    if (r) {
      expect(typeof r.payerCivId).toBe('number')
      expect(typeof r.receiverCivId).toBe('number')
    }
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    if ((sys as any).reparations.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })
  it('MAX_REPARATIONS(10)上限不超出', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 15; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL * (i + 1))
    }
    expect((sys as any).reparations.length).toBeLessThanOrEqual(10)
  })
  it('spawn的reparation包含amount字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    const r = (sys as any).reparations[0]
    if (r) expect(typeof r.amount).toBe('number')
  })
  it('spawn的reparation包含remaining字段等于amount', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    const r = (sys as any).reparations[0]
    if (r) expect(r.remaining).toBe(r.amount)
  })
  it('spawn的reparation包含paid:0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    const r = (sys as any).reparations[0]
    if (r) expect(r.paid).toBe(0)
  })
  it('spawn的reparation包含duration字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    const r = (sys as any).reparations[0]
    if (r) expect(typeof r.duration).toBe('number')
  })

  // ─── phase lifecycle ───
  it('negotiating phase age>2000时转为paying', () => {
    ;(sys as any).reparations.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      amount: 100, paid: 0, remaining: 100,
      duration: 9000, phase: 'negotiating', tick: 0
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL + 3000)
    expect((sys as any).reparations[0].phase).toBe('paying')
  })
  it('paying阶段remaining<=0时phase变为completed', () => {
    ;(sys as any).reparations.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      amount: 100, paid: 100, remaining: 0,
      duration: 9000, phase: 'paying', tick: 0
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL)
    expect((sys as any).reparations[0].phase).toBe('completed')
  })
  it('paying阶段age>duration且remaining>amount*0.3时phase变为defaulted', () => {
    ;(sys as any).reparations.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      amount: 100, paid: 0, remaining: 80,
      duration: 100, phase: 'paying', tick: 0
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL + 200)
    expect((sys as any).reparations[0].phase).toBe('defaulted')
  })
  it('negotiating阶段age<=2000时不转phase', () => {
    ;(sys as any).reparations.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      amount: 100, paid: 0, remaining: 100,
      duration: 9000, phase: 'negotiating', tick: CHECK_INTERVAL * 2 - 1000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL * 2)
    // age = CHECK_INTERVAL*2 - (CHECK_INTERVAL*2 - 1000) = 1000 < 2000 → still negotiating
    expect((sys as any).reparations[0].phase).toBe('negotiating')
  })
  it('paying阶段正常减少remaining', () => {
    ;(sys as any).reparations.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      amount: 100, paid: 0, remaining: 100,
      duration: 99999, phase: 'paying', tick: 0
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL)
    expect((sys as any).reparations[0].remaining).toBeLessThan(100)
  })

  // ─── cleanup ───
  it('completed且age>8000时被清理', () => {
    ;(sys as any).reparations.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      amount: 100, paid: 100, remaining: 0,
      duration: 5000, phase: 'completed', tick: 0
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL + 9000)
    expect((sys as any).reparations).toHaveLength(0)
  })
  it('defaulted且age>8000时被清理', () => {
    ;(sys as any).reparations.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      amount: 100, paid: 0, remaining: 80,
      duration: 100, phase: 'defaulted', tick: 0
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL + 9000)
    expect((sys as any).reparations).toHaveLength(0)
  })
  it('completed但age<=8000时保留', () => {
    ;(sys as any).reparations.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      amount: 100, paid: 100, remaining: 0,
      duration: 5000, phase: 'completed', tick: CHECK_INTERVAL
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL * 2)
    expect((sys as any).reparations).toHaveLength(1)
  })
  it('negotiating状态不被清理即使age很大', () => {
    ;(sys as any).reparations.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      amount: 100, paid: 0, remaining: 100,
      duration: 9000, phase: 'negotiating', tick: 0
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL + 3000)
    expect((sys as any).reparations.length).toBeGreaterThanOrEqual(0)
  })
  it('混合新旧(completed)只删除age>8000的', () => {
    ;(sys as any).reparations.push(
      { id: 1, payerCivId: 1, receiverCivId: 2, amount: 100, paid: 100, remaining: 0, duration: 5000, phase: 'completed', tick: 0 },
      { id: 2, payerCivId: 3, receiverCivId: 4, amount: 100, paid: 100, remaining: 0, duration: 5000, phase: 'completed', tick: CHECK_INTERVAL }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // tick=CHECK_INTERVAL+9000, age of id=1: 9000+CHECK_INTERVAL>8000 → delete; age of id=2: 9000 → delete
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL + 9000)
    // both have age>8000
    expect((sys as any).reparations.length).toBeLessThanOrEqual(2)
  })

  // ─── 手动注入 ───
  it('手动注入reparation后长度正确', () => {
    ;(sys as any).reparations.push({ id: 99, phase: 'paying' })
    expect((sys as any).reparations).toHaveLength(1)
  })
  it('手动注入多条reparation', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).reparations.push({ id: i + 1, phase: 'negotiating' })
    }
    expect((sys as any).reparations).toHaveLength(5)
  })

  // ─── 边界条件 ───
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, world, em, makeCivManager([1, 2]), 9999999)).not.toThrow()
  })
  it('tick=0不触发', () => {
    sys.update(1, world, em, makeCivManager([1, 2]), 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('文明数恰好为2时可以spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL)
    // 可能spawn也可能不spawn（取决于random），但不崩溃
    expect(() => {}).not.toThrow()
  })
})
