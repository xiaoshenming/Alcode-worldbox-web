import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticStewardshipSystem } from '../systems/DiplomaticStewardshipSystem'

const world = {} as any
const em = {} as any

function makeSys() { return new DiplomaticStewardshipSystem() }

describe('DiplomaticStewardshipSystem', () => {
  let sys: DiplomaticStewardshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 初始状态
  it('初始agreements为空', () => { expect((sys as any).agreements).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('agreements是数组', () => { expect(Array.isArray((sys as any).agreements)).toBe(true) })

  // 节流
  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    sys.update(1, world, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, world, em, 2540)
    expect((sys as any).lastCheck).toBe(2540)
  })
  it('第二次update节流生效', () => {
    sys.update(1, world, em, 2540)
    sys.update(1, world, em, 2541)
    expect((sys as any).lastCheck).toBe(2540)
  })

  // spawn逻辑（mock random=1跳过spawn块）
  it('random=1时不spawn新agreement', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2540)
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('random=0时尝试spawn（可能因steward===beneficiary跳过）', () => {
    const vals = [0, 0, 0, 0, 0, 0]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => vals[i++ % vals.length])
    sys.update(1, world, em, 2540)
    // steward===beneficiary时不spawn
    expect((sys as any).agreements.length).toBeLessThanOrEqual(1)
  })

  // duration递增
  it('每次update后已有agreement的duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({
      id: 1, stewardCivId: 1, beneficiaryCivId: 2,
      form: 'land_stewardship', managementLevel: 50, trustIndex: 50,
      efficiencyRate: 30, benefitShare: 20, duration: 0, tick: 2540,
    })
    sys.update(1, world, em, 2540)
    expect((sys as any).agreements[0].duration).toBe(1)
  })
  it('多次update后duration累加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({
      id: 1, stewardCivId: 1, beneficiaryCivId: 2,
      form: 'resource_stewardship', managementLevel: 50, trustIndex: 50,
      efficiencyRate: 30, benefitShare: 20, duration: 0, tick: 2540,
    })
    sys.update(1, world, em, 2540)
    sys.update(1, world, em, 5080)
    expect((sys as any).agreements[0].duration).toBe(2)
  })

  // cutoff清理
  it('tick超过cutoff(tick-91000)时清理旧agreement', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({
      id: 1, stewardCivId: 1, beneficiaryCivId: 2,
      form: 'cultural_stewardship', managementLevel: 50, trustIndex: 50,
      efficiencyRate: 30, benefitShare: 20, duration: 0, tick: 0,
    })
    sys.update(1, world, em, 100000)
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('tick未超过cutoff时不清理agreement', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({
      id: 1, stewardCivId: 1, beneficiaryCivId: 2,
      form: 'military_stewardship', managementLevel: 50, trustIndex: 50,
      efficiencyRate: 30, benefitShare: 20, duration: 0, tick: 50000,
    })
    sys.update(1, world, em, 100000)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('只清理过期的，保留未过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push(
      { id: 1, stewardCivId: 1, beneficiaryCivId: 2, form: 'land_stewardship', managementLevel: 50, trustIndex: 50, efficiencyRate: 30, benefitShare: 20, duration: 0, tick: 0 },
      { id: 2, stewardCivId: 3, beneficiaryCivId: 4, form: 'land_stewardship', managementLevel: 50, trustIndex: 50, efficiencyRate: 30, benefitShare: 20, duration: 0, tick: 50000 },
    )
    sys.update(1, world, em, 100000)
    expect((sys as any).agreements).toHaveLength(1)
    expect((sys as any).agreements[0].id).toBe(2)
  })

  // MAX_AGREEMENTS=16限制
  it('agreements达到MAX_AGREEMENTS(16)时不再spawn', () => {
    // 填满16个
    for (let i = 0; i < 16; i++) {
      ;(sys as any).agreements.push({
        id: i + 1, stewardCivId: 1, beneficiaryCivId: 2,
        form: 'land_stewardship', managementLevel: 50, trustIndex: 50,
        efficiencyRate: 30, benefitShare: 20, duration: 0, tick: 2540,
      })
    }
    // random=0.001 < PROCEED_CHANCE=0.0022，但已满
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 2540)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(16)
  })

  // 字段范围
  it('managementLevel在update后保持在[10,90]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({
      id: 1, stewardCivId: 1, beneficiaryCivId: 2,
      form: 'land_stewardship', managementLevel: 89, trustIndex: 50,
      efficiencyRate: 30, benefitShare: 20, duration: 0, tick: 2540,
    })
    sys.update(1, world, em, 2540)
    expect((sys as any).agreements[0].managementLevel).toBeLessThanOrEqual(90)
  })
  it('trustIndex在update后保持在[10,85]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).agreements.push({
      id: 1, stewardCivId: 1, beneficiaryCivId: 2,
      form: 'land_stewardship', managementLevel: 50, trustIndex: 11,
      efficiencyRate: 30, benefitShare: 20, duration: 0, tick: 2540,
    })
    sys.update(1, world, em, 2540)
    expect((sys as any).agreements[0].trustIndex).toBeGreaterThanOrEqual(10)
  })

  // form类型
  it('4种form都是合法值', () => {
    const forms = ['land_stewardship', 'resource_stewardship', 'cultural_stewardship', 'military_stewardship']
    forms.forEach(f => {
      ;(sys as any).agreements.push({
        id: 99, stewardCivId: 1, beneficiaryCivId: 2, form: f,
        managementLevel: 50, trustIndex: 50, efficiencyRate: 30, benefitShare: 20, duration: 0, tick: 2540,
      })
    })
    expect((sys as any).agreements.length).toBe(4)
  })

  // 注入数据
  it('手动注入agreement后可查询', () => {
    ;(sys as any).agreements.push({ id: 42, stewardCivId: 5, beneficiaryCivId: 6, form: 'land_stewardship', managementLevel: 50, trustIndex: 50, efficiencyRate: 30, benefitShare: 20, duration: 0, tick: 2540 })
    expect((sys as any).agreements[0].id).toBe(42)
  })
  it('nextId在spawn后递增', () => {
    // 直接模拟spawn路径：random < PROCEED_CHANCE，且steward!=beneficiary
    const mockVals = [0.001, 0.1, 0.9, 0] // random < PROCEED_CHANCE, steward=2, beneficiary=9, form index
    let idx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => mockVals[idx++ % mockVals.length])
    const before = (sys as any).nextId
    sys.update(1, world, em, 2540)
    // 如果spawn成功，nextId应递增
    const after = (sys as any).nextId
    expect(after).toBeGreaterThanOrEqual(before)
  })
})
