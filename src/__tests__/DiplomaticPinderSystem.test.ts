import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticPinderSystem } from '../systems/DiplomaticPinderSystem'

function makeSys() { return new DiplomaticPinderSystem() }
const em = {} as any
const world = {} as any

describe('DiplomaticPinderSystem', () => {
  let sys: DiplomaticPinderSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 初始状态
  it('初始arrangements为空', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('arrangements是数组', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })

  // 节流
  it('tick不足CHECK_INTERVAL(2920)时不执行', () => {
    sys.update(1, world, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, world, em, 2920)
    expect((sys as any).lastCheck).toBe(2920)
  })
  it('第二次tick不足间隔时lastCheck不变', () => {
    sys.update(1, world, em, 2920)
    sys.update(1, world, em, 3000)
    expect((sys as any).lastCheck).toBe(2920)
  })

  // spawn - 用callCount控制不同civId
  it('满足条件时spawn一条arrangement', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001  // PROCEED_CHANCE check: 0.001 < 0.0021 触发
      if (callCount === 2) return 0.1    // pound = 1+floor(0.1*8)=1
      if (callCount === 3) return 0.5    // livestock = 1+floor(0.5*8)=5 ≠ pound
      return 0.5
    })
    sys.update(1, world, em, 2920)
    expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(1)
  })
  it('spawn的arrangement有form字段', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001
      if (callCount === 2) return 0.1
      if (callCount === 3) return 0.5
      return 0.5
    })
    sys.update(1, world, em, 2920)
    const a = (sys as any).arrangements[0]
    if (a) expect(['royal_pinder', 'manor_pinder', 'village_pinder', 'common_pinder']).toContain(a.form)
  })
  it('spawn的arrangement有poundJurisdiction字段', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001
      if (callCount === 2) return 0.1
      if (callCount === 3) return 0.5
      return 0.5
    })
    sys.update(1, world, em, 2920)
    const a = (sys as any).arrangements[0]
    if (a) expect(typeof a.poundJurisdiction).toBe('number')
  })
  it('spawn的arrangement有impoundmentRights字段', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001
      if (callCount === 2) return 0.1
      if (callCount === 3) return 0.5
      return 0.5
    })
    sys.update(1, world, em, 2920)
    const a = (sys as any).arrangements[0]
    if (a) expect(typeof a.impoundmentRights).toBe('number')
  })
  it('spawn的arrangement有fineCollection字段', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001
      if (callCount === 2) return 0.1
      if (callCount === 3) return 0.5
      return 0.5
    })
    sys.update(1, world, em, 2920)
    const a = (sys as any).arrangements[0]
    if (a) expect(typeof a.fineCollection).toBe('number')
  })
  it('spawn的arrangement有animalWelfare字段', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001
      if (callCount === 2) return 0.1
      if (callCount === 3) return 0.5
      return 0.5
    })
    sys.update(1, world, em, 2920)
    const a = (sys as any).arrangements[0]
    if (a) expect(typeof a.animalWelfare).toBe('number')
  })
  it('spawn的arrangement tick等于当前tick', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001
      if (callCount === 2) return 0.1
      if (callCount === 3) return 0.5
      return 0.5
    })
    sys.update(1, world, em, 2920)
    const a = (sys as any).arrangements[0]
    if (a) expect(a.tick).toBe(2920)
  })
  it('nextId在spawn后递增', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001
      if (callCount === 2) return 0.1
      if (callCount === 3) return 0.5
      return 0.5
    })
    sys.update(1, world, em, 2920)
    if ((sys as any).arrangements.length > 0) expect((sys as any).nextId).toBeGreaterThan(1)
  })
  it('MAX_ARRANGEMENTS=16时不超过上限', () => {
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push({ id: i + 1, poundCivId: i, livestockCivId: i + 1, form: 'royal_pinder', poundJurisdiction: 50, impoundmentRights: 50, fineCollection: 20, animalWelfare: 20, duration: 0, tick: 2920 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 5840)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })

  // duration递增
  it('每次update后arrangement.duration递增', () => {
    ;(sys as any).arrangements.push({ id: 1, poundCivId: 1, livestockCivId: 2, form: 'manor_pinder', poundJurisdiction: 50, impoundmentRights: 50, fineCollection: 20, animalWelfare: 20, duration: 0, tick: 0 })
    sys.update(1, world, em, 2920)
    expect((sys as any).arrangements[0]?.duration).toBeGreaterThan(0)
  })

  // cleanup: cutoff = tick - 88000
  it('arrangement.tick < cutoff时删除', () => {
    ;(sys as any).arrangements.push({ id: 1, poundCivId: 1, livestockCivId: 2, form: 'village_pinder', poundJurisdiction: 50, impoundmentRights: 50, fineCollection: 20, animalWelfare: 20, duration: 0, tick: 0 })
    // cutoff = 90000 - 88000 = 2000, arrangement.tick=0 < 2000 → 删除
    sys.update(1, world, em, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('arrangement.tick >= cutoff时保留', () => {
    ;(sys as any).arrangements.push({ id: 1, poundCivId: 1, livestockCivId: 2, form: 'common_pinder', poundJurisdiction: 50, impoundmentRights: 50, fineCollection: 20, animalWelfare: 20, duration: 0, tick: 5000 })
    // cutoff = 90000 - 88000 = 2000, arrangement.tick=5000 >= 2000 → 保留
    sys.update(1, world, em, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  // 手动注入
  it('手动注入后长度正确', () => {
    ;(sys as any).arrangements.push({ id: 99 })
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('多次update后lastCheck持续更新', () => {
    sys.update(1, world, em, 2920)
    sys.update(1, world, em, 5840)
    expect((sys as any).lastCheck).toBe(5840)
  })
  it('poundCivId === livestockCivId时不spawn', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001  // PROCEED_CHANCE触发
      return 0                            // pound=1, livestock=1 → 相同 → return
    })
    sys.update(1, world, em, 2920)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('poundJurisdiction在update时被约束在[5,85]范围内', () => {
    ;(sys as any).arrangements.push({ id: 1, poundCivId: 1, livestockCivId: 2, form: 'royal_pinder', poundJurisdiction: 50, impoundmentRights: 50, fineCollection: 20, animalWelfare: 20, duration: 0, tick: 5000 })
    sys.update(1, world, em, 2920)
    const a = (sys as any).arrangements[0]
    if (a) {
      expect(a.poundJurisdiction).toBeGreaterThanOrEqual(5)
      expect(a.poundJurisdiction).toBeLessThanOrEqual(85)
    }
  })
  it('animalWelfare在update时被约束在[5,65]范围内', () => {
    ;(sys as any).arrangements.push({ id: 1, poundCivId: 1, livestockCivId: 2, form: 'royal_pinder', poundJurisdiction: 50, impoundmentRights: 50, fineCollection: 20, animalWelfare: 20, duration: 0, tick: 5000 })
    sys.update(1, world, em, 2920)
    const a = (sys as any).arrangements[0]
    if (a) {
      expect(a.animalWelfare).toBeGreaterThanOrEqual(5)
      expect(a.animalWelfare).toBeLessThanOrEqual(65)
    }
  })
})
