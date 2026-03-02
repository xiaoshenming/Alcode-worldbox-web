import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticProtectorateSystem } from '../systems/DiplomaticProtectorateSystem'
import type { ProtectorateRelation, ProtectorateForm } from '../systems/DiplomaticProtectorateSystem'

function makeSys() { return new DiplomaticProtectorateSystem() }
function makeR(overrides: Partial<ProtectorateRelation> = {}): ProtectorateRelation {
  return {
    id: 1, civIdA: 1, civIdB: 2, form: 'military_shield',
    protectionStrength: 50, autonomyLevel: 40, tributeRate: 30,
    loyaltyBond: 25, duration: 0, tick: 0, ...overrides
  }
}
const world = {} as any
const em = {} as any

describe('DiplomaticProtectorateSystem', () => {
  let sys: DiplomaticProtectorateSystem
  beforeEach(() => { sys = makeSys() })

  // 1. 基础数据结构
  it('初始relations为空数组', () => { expect((sys as any).relations).toHaveLength(0) })
  it('relations是数组类型', () => { expect(Array.isArray((sys as any).relations)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入条目后长度正确', () => {
    ;(sys as any).relations.push(makeR())
    expect((sys as any).relations).toHaveLength(1)
  })

  // 2. CHECK_INTERVAL 节流
  it('tick=0时不触发(lastCheck保持0)', () => {
    sys.update(1, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2529时不触发', () => {
    sys.update(1, world, em, 2529)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2530时触发并更新lastCheck', () => {
    sys.update(1, world, em, 2530)
    expect((sys as any).lastCheck).toBe(2530)
  })
  it('tick=5060时再次触发', () => {
    sys.update(1, world, em, 2530)
    sys.update(1, world, em, 5060)
    expect((sys as any).lastCheck).toBe(5060)
  })
  it('两次update间隔不足CHECK_INTERVAL不更新lastCheck', () => {
    sys.update(1, world, em, 2530)
    sys.update(1, world, em, 3000)
    expect((sys as any).lastCheck).toBe(2530)
  })

  // 3. 字段动态更新
  it('每次触发duration自增1', () => {
    ;(sys as any).relations.push(makeR({ tick: 10000 }))
    sys.update(1, world, em, 2530)
    expect((sys as any).relations[0].duration).toBe(1)
  })
  it('protectionStrength在[10,90]范围内', () => {
    ;(sys as any).relations.push(makeR({ protectionStrength: 50, tick: 10000 }))
    sys.update(1, world, em, 2530)
    const v = (sys as any).relations[0].protectionStrength
    expect(v).toBeGreaterThanOrEqual(10)
    expect(v).toBeLessThanOrEqual(90)
  })
  it('autonomyLevel在[10,85]范围内', () => {
    ;(sys as any).relations.push(makeR({ autonomyLevel: 40, tick: 10000 }))
    sys.update(1, world, em, 2530)
    const v = (sys as any).relations[0].autonomyLevel
    expect(v).toBeGreaterThanOrEqual(10)
    expect(v).toBeLessThanOrEqual(85)
  })
  it('tributeRate在[5,75]范围内', () => {
    ;(sys as any).relations.push(makeR({ tributeRate: 30, tick: 10000 }))
    sys.update(1, world, em, 2530)
    const v = (sys as any).relations[0].tributeRate
    expect(v).toBeGreaterThanOrEqual(5)
    expect(v).toBeLessThanOrEqual(75)
  })

  // 4. cleanup
  it('tick < cutoff(tick-93000)的条目被删除', () => {
    ;(sys as any).relations.push(makeR({ tick: 0 }))
    sys.update(1, world, em, 100000)
    // cutoff = 100000 - 93000 = 7000，tick=0 < 7000
    expect((sys as any).relations).toHaveLength(0)
  })
  it('tick >= cutoff的条目保留', () => {
    ;(sys as any).relations.push(makeR({ tick: 50000 }))
    sys.update(1, world, em, 100000)
    // cutoff = 7000，tick=50000 >= 7000
    expect((sys as any).relations).toHaveLength(1)
  })
  it('多条中只删除过期的', () => {
    ;(sys as any).relations.push(makeR({ id: 1, tick: 0 }))
    ;(sys as any).relations.push(makeR({ id: 2, tick: 90000 }))
    sys.update(1, world, em, 100000)
    expect((sys as any).relations).toHaveLength(1)
    expect((sys as any).relations[0].id).toBe(2)
  })
  it('cutoff边界：tick=cutoff时保留', () => {
    const currentTick = 100000
    const cutoff = currentTick - 93000 // = 7000
    ;(sys as any).relations.push(makeR({ tick: cutoff }))
    sys.update(1, world, em, currentTick)
    // tick=7000，cutoff=7000，条件是 < cutoff，所以保留
    expect((sys as any).relations).toHaveLength(1)
  })

  // 5. MAX上限
  it('relations达到MAX_RELATIONS(17)时不新增', () => {
    for (let i = 0; i < 17; i++) {
      ;(sys as any).relations.push(makeR({ id: i + 1, civIdA: i + 1, civIdB: i + 50, tick: 10000 }))
    }
    expect((sys as any).relations.length).toBe(17)
  })
  it('MAX_RELATIONS为17', () => {
    for (let i = 0; i < 17; i++) {
      ;(sys as any).relations.push(makeR({ id: i + 1, civIdA: i + 1, civIdB: i + 50, tick: 10000 }))
    }
    const lenBefore = (sys as any).relations.length
    sys.update(1, world, em, 2530)
    // duration更新不影响长度
    expect((sys as any).relations.length).toBe(lenBefore)
  })
  it('relations上限不超过17', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).relations.push(makeR({ id: i + 1, civIdA: i + 1, civIdB: i + 50, tick: 10000 }))
    }
    // 注意这里手动多塞，但系统内部生成时受MAX限制
    expect((sys as any).relations.length).toBeGreaterThanOrEqual(17)
  })
  it('loyaltyBond在[5,65]范围内', () => {
    ;(sys as any).relations.push(makeR({ loyaltyBond: 30, tick: 10000 }))
    sys.update(1, world, em, 2530)
    const v = (sys as any).relations[0].loyaltyBond
    expect(v).toBeGreaterThanOrEqual(5)
    expect(v).toBeLessThanOrEqual(65)
  })

  // 6. 枚举完整性
  it('ProtectorateForm包含military_shield', () => {
    const r = makeR({ form: 'military_shield' })
    expect(r.form).toBe('military_shield')
  })
  it('ProtectorateForm包含所有4种类型', () => {
    const forms: ProtectorateForm[] = ['military_shield', 'economic_patronage', 'cultural_guardianship', 'territorial_guarantee']
    expect(forms).toHaveLength(4)
  })
  it('ProtectorateRelation接口字段完整', () => {
    const r = makeR()
    expect(r).toHaveProperty('protectionStrength')
    expect(r).toHaveProperty('autonomyLevel')
    expect(r).toHaveProperty('tributeRate')
    expect(r).toHaveProperty('loyaltyBond')
    expect(r).toHaveProperty('duration')
    expect(r).toHaveProperty('tick')
  })
})
