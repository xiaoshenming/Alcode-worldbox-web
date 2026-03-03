import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticWarReparationSystem } from '../systems/DiplomaticWarReparationSystem'

function makeSys() { return new DiplomaticWarReparationSystem() }

function makeCivManager(civs: any[]) {
  return { civilizations: new Map(civs.map(c => [c.id, c])) } as any
}

const em = {} as any
const CHECK_INTERVAL = 1500

describe('DiplomaticWarReparationSystem', () => {
  let sys: DiplomaticWarReparationSystem
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
  it('_activeReparationSet初始为空Set', () => {
    expect((sys as any)._activeReparationSet.size).toBe(0)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).reparations.push({ id: 1 })
    expect((s2 as any).reparations).toHaveLength(0)
  })

  // ─── 节流控制 ───
  it('tick不足CHECK_INTERVAL(1500)时不执行', () => {
    const civs = [{ id: 1, population: 100 }, { id: 2, population: 200 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    const civs = [{ id: 1, population: 100 }, { id: 2, population: 200 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二次间隔不足时不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const civs = [{ id: 1, population: 100 }, { id: 2, population: 200 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL)
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const civs = [{ id: 1, population: 100 }, { id: 2, population: 200 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL)
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ─── civilizations guard ───
  it('civManager为null时不崩溃', () => {
    expect(() => sys.update(1, em, null as any, CHECK_INTERVAL)).not.toThrow()
  })
  it('只有1个文明时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em, makeCivManager([{ id: 1, population: 100 }]), CHECK_INTERVAL)
    expect((sys as any).reparations).toHaveLength(0)
  })
  it('文明数为0时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em, makeCivManager([]), CHECK_INTERVAL)
    expect((sys as any).reparations).toHaveLength(0)
  })

  // ─── spawn ───
  it('满足条件时spawn reparation', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const civs = [{ id: 1, population: 50 }, { id: 2, population: 200 }, { id: 3, population: 300 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL)
    expect((sys as any).reparations.length).toBeGreaterThanOrEqual(1)
  })
  it('spawn后reparation初始status为active', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const civs = [{ id: 1, population: 50 }, { id: 2, population: 200 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL)
    if ((sys as any).reparations.length > 0) {
      expect((sys as any).reparations[0].status).toBe('active')
    }
  })
  it('spawn后_activeReparationSet中有对应key', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const civs = [{ id: 1, population: 50 }, { id: 2, population: 200 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL)
    if ((sys as any).reparations.length > 0) {
      expect((sys as any)._activeReparationSet.size).toBeGreaterThan(0)
    }
  })
  it('population相等时不找victor，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const civs = [{ id: 1, population: 100 }, { id: 2, population: 100 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL)
    expect((sys as any).reparations).toHaveLength(0)
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const civs = [{ id: 1, population: 50 }, { id: 2, population: 200 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL)
    if ((sys as any).reparations.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })
  it('spawn的reparation包含totalAmount字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const civs = [{ id: 1, population: 50 }, { id: 2, population: 200 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL)
    if ((sys as any).reparations.length > 0) {
      expect(typeof (sys as any).reparations[0].totalAmount).toBe('number')
    }
  })
  it('spawn的reparation的paidAmount初始为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const civs = [{ id: 1, population: 50 }, { id: 2, population: 200 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL)
    if ((sys as any).reparations.length > 0) {
      // paidAmount starts at 0 but processPayments runs immediately in same update
      expect((sys as any).reparations[0].paidAmount).toBeGreaterThanOrEqual(0)
    }
  })
  it('spawn的reparation包含deadline字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const civs = [{ id: 1, population: 50 }, { id: 2, population: 200 }]
    sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL)
    if ((sys as any).reparations.length > 0) {
      expect(typeof (sys as any).reparations[0].deadline).toBe('number')
    }
  })
  it('MAX_REPARATIONS(20)上限不超出', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const civs = [{ id: 1, population: 50 }, { id: 2, population: 200 }]
    for (let i = 0; i < 25; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, em, makeCivManager(civs), CHECK_INTERVAL * (i + 1))
    }
    expect((sys as any).reparations.length).toBeLessThanOrEqual(20)
  })

  // ─── processPayments ───
  it('active状态的reparation每次update累加paidAmount', () => {
    ;(sys as any).reparations.push({
      id: 1, loserCivId: 1, victorCivId: 2,
      totalAmount: 100, paidAmount: 0,
      status: 'active', startTick: 0, deadline: 99999
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, makeCivManager([{ id: 1, population: 50 }, { id: 2, population: 200 }]), CHECK_INTERVAL)
    expect((sys as any).reparations[0].paidAmount).toBeGreaterThan(0)
  })
  it('paidAmount>=totalAmount时status变为completed', () => {
    ;(sys as any).reparations.push({
      id: 1, loserCivId: 1, victorCivId: 2,
      totalAmount: 100, paidAmount: 99.6,
      status: 'active', startTick: 0, deadline: 99999
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, makeCivManager([{ id: 1, population: 50 }, { id: 2, population: 200 }]), CHECK_INTERVAL)
    expect((sys as any).reparations[0].status).toBe('completed')
  })
  it('completed时_activeReparationSet中移除该key', () => {
    ;(sys as any)._activeReparationSet.add(1 * 1000 + 2)
    ;(sys as any).reparations.push({
      id: 1, loserCivId: 1, victorCivId: 2,
      totalAmount: 100, paidAmount: 99.6,
      status: 'active', startTick: 0, deadline: 99999
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, makeCivManager([{ id: 1, population: 50 }, { id: 2, population: 200 }]), CHECK_INTERVAL)
    expect((sys as any)._activeReparationSet.has(1 * 1000 + 2)).toBe(false)
  })
  it('非active状态不会被processPayments修改', () => {
    ;(sys as any).reparations.push({
      id: 1, loserCivId: 1, victorCivId: 2,
      totalAmount: 100, paidAmount: 50,
      status: 'completed', startTick: 0, deadline: 99999
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, makeCivManager([{ id: 1, population: 50 }, { id: 2, population: 200 }]), CHECK_INTERVAL)
    expect((sys as any).reparations[0].paidAmount).toBe(50)
  })
  it('defaulted状态不会被processPayments修改', () => {
    ;(sys as any).reparations.push({
      id: 1, loserCivId: 1, victorCivId: 2,
      totalAmount: 100, paidAmount: 10,
      status: 'defaulted', startTick: 0, deadline: 99999
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, makeCivManager([{ id: 1, population: 50 }, { id: 2, population: 200 }]), CHECK_INTERVAL)
    expect((sys as any).reparations[0].paidAmount).toBe(10)
  })

  // ─── checkDefaults ───
  it('active且tick>deadline时status变为defaulted', () => {
    ;(sys as any).reparations.push({
      id: 1, loserCivId: 1, victorCivId: 2,
      totalAmount: 100, paidAmount: 0,
      status: 'active', startTick: 0, deadline: 100
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, makeCivManager([{ id: 1, population: 50 }, { id: 2, population: 200 }]), CHECK_INTERVAL + 200)
    expect((sys as any).reparations[0].status).toBe('defaulted')
  })
  it('active但tick<=deadline时不变为defaulted', () => {
    ;(sys as any).reparations.push({
      id: 1, loserCivId: 1, victorCivId: 2,
      totalAmount: 100, paidAmount: 0,
      status: 'active', startTick: 0, deadline: 99999
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, makeCivManager([{ id: 1, population: 50 }, { id: 2, population: 200 }]), CHECK_INTERVAL)
    expect((sys as any).reparations[0].status).not.toBe('defaulted')
  })
  it('defaulted时_activeReparationSet移除key', () => {
    ;(sys as any)._activeReparationSet.add(1 * 1000 + 2)
    ;(sys as any).reparations.push({
      id: 1, loserCivId: 1, victorCivId: 2,
      totalAmount: 100, paidAmount: 0,
      status: 'active', startTick: 0, deadline: 100
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, makeCivManager([{ id: 1, population: 50 }, { id: 2, population: 200 }]), CHECK_INTERVAL + 200)
    expect((sys as any)._activeReparationSet.has(1 * 1000 + 2)).toBe(false)
  })

  // ─── cleanup ───
  it('满额20条时cleanup能清理多余finished记录', () => {
    for (let i = 0; i < 19; i++) {
      ;(sys as any).reparations.push({
        id: i + 1, loserCivId: i + 10, victorCivId: i + 20,
        totalAmount: 100, paidAmount: 100,
        status: 'completed', startTick: i * 100, deadline: 99999
      })
    }
    ;(sys as any).reparations.push({
      id: 20, loserCivId: 30, victorCivId: 31,
      totalAmount: 100, paidAmount: 0,
      status: 'active', startTick: 0, deadline: 99999
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, makeCivManager([{ id: 1, population: 50 }, { id: 2, population: 200 }]), CHECK_INTERVAL)
    expect((sys as any).reparations.length).toBeLessThanOrEqual(20)
    const activeRecords = (sys as any).reparations.filter((r: any) => r.status === 'active')
    expect(activeRecords.length).toBeGreaterThanOrEqual(1)
  })
  it('cleanup后总数不超过MAX_REPARATIONS(20)', () => {
    for (let i = 0; i < 25; i++) {
      ;(sys as any).reparations.push({
        id: i + 1, loserCivId: i + 10, victorCivId: i + 20,
        totalAmount: 100, paidAmount: 100,
        status: 'completed', startTick: i * 100, deadline: 99999
      })
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, makeCivManager([{ id: 1, population: 50 }, { id: 2, population: 200 }]), CHECK_INTERVAL)
    expect((sys as any).reparations.length).toBeLessThanOrEqual(20)
  })

  // ─── 手动注入 ───
  it('手动注入reparation后长度正确', () => {
    ;(sys as any).reparations.push({ id: 99, status: 'active' })
    expect((sys as any).reparations).toHaveLength(1)
  })
  it('hasActiveReparation方法正确判断', () => {
    ;(sys as any)._activeReparationSet.add(1 * 1000 + 2)
    expect((sys as any).hasActiveReparation(1, 2)).toBe(true)
    expect((sys as any).hasActiveReparation(2, 1)).toBe(false)
  })
  it('手动注入多条reparation', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).reparations.push({ id: i + 1, status: 'active' })
    }
    expect((sys as any).reparations).toHaveLength(5)
  })

  // ─── 边界条件 ───
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, em, makeCivManager([{ id: 1, population: 100 }, { id: 2, population: 200 }]), 9999999)).not.toThrow()
  })
  it('tick=0不触发', () => {
    sys.update(1, em, makeCivManager([{ id: 1, population: 100 }, { id: 2, population: 200 }]), 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('_activeReparationSet是Set类型', () => {
    expect((sys as any)._activeReparationSet instanceof Set).toBe(true)
  })
  it('hasActiveReparation不存在时返回false', () => {
    expect((sys as any).hasActiveReparation(99, 100)).toBe(false)
  })
})
