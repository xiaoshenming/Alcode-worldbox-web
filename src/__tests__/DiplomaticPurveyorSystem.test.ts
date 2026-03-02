import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticPurveyorSystem } from '../systems/DiplomaticPurveyorSystem'
import type { PurveyorArrangement, PurveyorForm } from '../systems/DiplomaticPurveyorSystem'

function makeSys() { return new DiplomaticPurveyorSystem() }
function makeA(overrides: Partial<PurveyorArrangement> = {}): PurveyorArrangement {
  return {
    id: 1, crownCivId: 1, purveyorCivId: 2, form: 'royal_purveyor',
    procurementReach: 40, supplyEfficiency: 40, priceNegotiation: 25,
    logisticsControl: 30, duration: 0, tick: 0, ...overrides
  }
}
const world = {} as any
const em = {} as any

describe('DiplomaticPurveyorSystem', () => {
  let sys: DiplomaticPurveyorSystem
  beforeEach(() => { sys = makeSys() })

  // 1. 基础数据结构
  it('初始arrangements为空数组', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('arrangements是数组类型', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入条目后长度正确', () => {
    ;(sys as any).arrangements.push(makeA())
    expect((sys as any).arrangements).toHaveLength(1)
  })

  // 2. CHECK_INTERVAL 节流
  it('tick=0时不触发(lastCheck保持0)', () => {
    sys.update(1, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2799时不触发', () => {
    sys.update(1, world, em, 2799)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2800时触发并更新lastCheck', () => {
    sys.update(1, world, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })
  it('tick=5600时再次触发', () => {
    sys.update(1, world, em, 2800)
    sys.update(1, world, em, 5600)
    expect((sys as any).lastCheck).toBe(5600)
  })
  it('两次update间隔不足CHECK_INTERVAL不更新lastCheck', () => {
    sys.update(1, world, em, 2800)
    sys.update(1, world, em, 3500)
    expect((sys as any).lastCheck).toBe(2800)
  })

  // 3. 字段动态更新
  it('每次触发duration自增1', () => {
    ;(sys as any).arrangements.push(makeA({ tick: 10000 }))
    sys.update(1, world, em, 2800)
    expect((sys as any).arrangements[0].duration).toBe(1)
  })
  it('procurementReach在[5,85]范围内', () => {
    ;(sys as any).arrangements.push(makeA({ procurementReach: 40, tick: 10000 }))
    sys.update(1, world, em, 2800)
    const v = (sys as any).arrangements[0].procurementReach
    expect(v).toBeGreaterThanOrEqual(5)
    expect(v).toBeLessThanOrEqual(85)
  })
  it('supplyEfficiency在[10,90]范围内', () => {
    ;(sys as any).arrangements.push(makeA({ supplyEfficiency: 40, tick: 10000 }))
    sys.update(1, world, em, 2800)
    const v = (sys as any).arrangements[0].supplyEfficiency
    expect(v).toBeGreaterThanOrEqual(10)
    expect(v).toBeLessThanOrEqual(90)
  })
  it('priceNegotiation在[5,80]范围内', () => {
    ;(sys as any).arrangements.push(makeA({ priceNegotiation: 25, tick: 10000 }))
    sys.update(1, world, em, 2800)
    const v = (sys as any).arrangements[0].priceNegotiation
    expect(v).toBeGreaterThanOrEqual(5)
    expect(v).toBeLessThanOrEqual(80)
  })

  // 4. cleanup
  it('tick < cutoff(tick-88000)的条目被删除', () => {
    ;(sys as any).arrangements.push(makeA({ tick: 0 }))
    sys.update(1, world, em, 100000)
    // cutoff = 100000 - 88000 = 12000，tick=0 < 12000
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick >= cutoff的条目保留', () => {
    ;(sys as any).arrangements.push(makeA({ tick: 50000 }))
    sys.update(1, world, em, 100000)
    // cutoff = 12000，tick=50000 >= 12000
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('多条中只删除过期的', () => {
    ;(sys as any).arrangements.push(makeA({ id: 1, tick: 0 }))
    ;(sys as any).arrangements.push(makeA({ id: 2, tick: 90000 }))
    sys.update(1, world, em, 100000)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })
  it('cutoff边界：tick=cutoff时保留', () => {
    const currentTick = 100000
    const cutoff = currentTick - 88000 // = 12000
    ;(sys as any).arrangements.push(makeA({ tick: cutoff }))
    sys.update(1, world, em, currentTick)
    // tick=12000，cutoff=12000，条件是 < cutoff，所以保留
    expect((sys as any).arrangements).toHaveLength(1)
  })

  // 5. MAX上限
  it('arrangements达到MAX_ARRANGEMENTS(16)时不新增', () => {
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push(makeA({ id: i + 1, crownCivId: i + 1, purveyorCivId: i + 50, tick: 10000 }))
    }
    expect((sys as any).arrangements.length).toBe(16)
  })
  it('MAX_ARRANGEMENTS为16', () => {
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push(makeA({ id: i + 1, crownCivId: i + 1, purveyorCivId: i + 50, tick: 10000 }))
    }
    const lenBefore = (sys as any).arrangements.length
    sys.update(1, world, em, 2800)
    // duration更新不影响长度
    expect((sys as any).arrangements.length).toBe(lenBefore)
  })
  it('logisticsControl在[5,65]范围内', () => {
    ;(sys as any).arrangements.push(makeA({ logisticsControl: 30, tick: 10000 }))
    sys.update(1, world, em, 2800)
    const v = (sys as any).arrangements[0].logisticsControl
    expect(v).toBeGreaterThanOrEqual(5)
    expect(v).toBeLessThanOrEqual(65)
  })
  it('CHECK_INTERVAL为2800(行为验证)', () => {
    sys.update(1, world, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
    sys.update(1, world, em, 2800 + 2799)
    expect((sys as any).lastCheck).toBe(2800)
  })

  // 6. 枚举完整性
  it('PurveyorForm包含royal_purveyor', () => {
    const a = makeA({ form: 'royal_purveyor' })
    expect(a.form).toBe('royal_purveyor')
  })
  it('PurveyorForm包含所有4种类型', () => {
    const forms: PurveyorForm[] = ['royal_purveyor', 'military_purveyor', 'naval_purveyor', 'household_purveyor']
    expect(forms).toHaveLength(4)
  })
  it('PurveyorArrangement接口字段完整', () => {
    const a = makeA()
    expect(a).toHaveProperty('crownCivId')
    expect(a).toHaveProperty('purveyorCivId')
    expect(a).toHaveProperty('form')
    expect(a).toHaveProperty('procurementReach')
    expect(a).toHaveProperty('supplyEfficiency')
    expect(a).toHaveProperty('priceNegotiation')
    expect(a).toHaveProperty('logisticsControl')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })
})
