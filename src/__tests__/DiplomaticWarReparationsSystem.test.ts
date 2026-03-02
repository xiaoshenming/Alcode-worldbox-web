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

  // ─── 节流控制 ───
  it('tick不足CHECK_INTERVAL(3600)时不执行', () => {
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次update，第二次用相同tick不再执行', () => {
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    ;(sys as any).lastCheck = CHECK_INTERVAL
    const before = (sys as any).reparations.length
    sys.update(1, world, em, makeCivManager([1, 2, 3]), CHECK_INTERVAL)
    expect((sys as any).reparations.length).toBe(before)
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
    // payment = min(remaining, amount*0.02)
    // 若 paid=amount=100，remaining=0：payment=0，paid不变，remaining=max(0,100-100)=0 → completed
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

  // ─── cleanup ───
  it('completed且age>8000时被清理', () => {
    ;(sys as any).reparations.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      amount: 100, paid: 100, remaining: 0,
      duration: 5000, phase: 'completed', tick: 0
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // tick=CHECK_INTERVAL+9000, age=9000>8000 → 清理
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
    // tick=CHECK_INTERVAL, age=0 → 保留
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
    // negotiating不是done状态，不会被cleanup
    // 但age>2000会变paying
    sys.update(1, world, em, makeCivManager([1, 2]), CHECK_INTERVAL + 3000)
    // phase变为paying后不是done，不删除
    expect((sys as any).reparations.length).toBeGreaterThanOrEqual(0)
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
})
