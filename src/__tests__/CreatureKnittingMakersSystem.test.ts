import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureKnittingMakersSystem, KnittingMaker } from '../systems/CreatureKnittingMakersSystem'

function makeEM() {
  return {} as any
}

// 向系统内部直接注入一个 maker，返回该 maker 引用
function injectMaker(sys: CreatureKnittingMakersSystem, overrides: Partial<KnittingMaker> = {}): KnittingMaker {
  const maker: KnittingMaker = {
    id: 1,
    entityId: 100,
    skillLevel: 20,
    yarnQuality: 30,
    patternComplexity: 10,
    outputRate: 0.5,
    tick: 0,
    ...overrides,
  }
  ;(sys as any).makers.push(maker)
  return maker
}

// 强制触发 update 路径（tick 从 0 跳到 2520）
function triggerUpdate(sys: CreatureKnittingMakersSystem) {
  sys.update(1, makeEM(), 2520)
}

describe('CreatureKnittingMakersSystem', () => {
  let sys: CreatureKnittingMakersSystem

  beforeEach(() => {
    sys = new CreatureKnittingMakersSystem()
  })

  // 1. 初始无记录
  it('初始 makers 列表为空', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入 maker 后可从列表查询', () => {
    injectMaker(sys, { entityId: 42 })
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(42)
  })

  // 3. 多个 maker 全部返回
  it('注入多个 maker 全部可查询', () => {
    injectMaker(sys, { id: 1, entityId: 1 })
    injectMaker(sys, { id: 2, entityId: 2 })
    injectMaker(sys, { id: 3, entityId: 3 })
    expect((sys as any).makers).toHaveLength(3)
  })

  // 4. KnittingMaker 四字段完整
  it('KnittingMaker 具备 skillLevel/yarnQuality/patternComplexity/outputRate ��段', () => {
    injectMaker(sys)
    const m: KnittingMaker = (sys as any).makers[0]
    expect(m).toHaveProperty('skillLevel')
    expect(m).toHaveProperty('yarnQuality')
    expect(m).toHaveProperty('patternComplexity')
    expect(m).toHaveProperty('outputRate')
  })

  // 5. tick 差值 < 2520 不更新 lastCheck
  it('tick 差值 < 2520 时 lastCheck 保持 0', () => {
    sys.update(1, makeEM(), 2519)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 6. tick 差值 >= 2520 更新 lastCheck
  it('tick >= 2520 时 lastCheck 更新', () => {
    sys.update(1, makeEM(), 2520)
    expect((sys as any).lastCheck).toBe(2520)
  })

  // 7. update 后 skillLevel 增加 0.02
  it('update 后 skillLevel 精确增加 0.02', () => {
    const m = injectMaker(sys, { skillLevel: 20 })
    triggerUpdate(sys)
    expect((sys as any).makers[0].skillLevel).toBeCloseTo(20.02, 5)
  })

  // 8. update 后 yarnQuality 增加 0.01
  it('update 后 yarnQuality 精确增加 0.01', () => {
    const m = injectMaker(sys, { yarnQuality: 30 })
    triggerUpdate(sys)
    expect((sys as any).makers[0].yarnQuality).toBeCloseTo(30.01, 5)
  })

  // 9. skillLevel 上限 100（Math.min 钳制）
  it('skillLevel 不超过 100', () => {
    injectMaker(sys, { skillLevel: 99.99 })
    triggerUpdate(sys)
    expect((sys as any).makers[0].skillLevel).toBeLessThanOrEqual(100)
  })

  // 10. cleanup: skillLevel <= 5 时删除（根据源码阈值为 5）
  it('cleanup: skillLevel <= 5 时 maker 被删除', () => {
    injectMaker(sys, { skillLevel: 4.99 })
    triggerUpdate(sys)
    // skillLevel 4.99 + 0.02 = 5.01 > 5，不删除
    // 但如果直接 <= 5 就应该删除，我们测试初始刚好在边界
    // 注入 skillLevel=4.98 => 4.98+0.02=5.00，等于 5，满足 <=5 则删除
    sys = new CreatureKnittingMakersSystem()
    injectMaker(sys, { skillLevel: 4.98 })
    sys.update(1, makeEM(), 2520)
    // 4.98+0.02=5.00，5.00<=5 => 被删除
    expect((sys as any).makers).toHaveLength(0)
  })

  // 11. cleanup: skillLevel > 5 时保留
  it('cleanup: skillLevel > 5 时 maker 保留', () => {
    injectMaker(sys, { skillLevel: 10 })
    triggerUpdate(sys)
    expect((sys as any).makers).toHaveLength(1)
  })

  // 12. outputRate 上限 1（Math.min(1, ...)）
  it('outputRate 不超过 1', () => {
    injectMaker(sys, { skillLevel: 10, outputRate: 0.999 })
    triggerUpdate(sys)
    expect((sys as any).makers[0].outputRate).toBeLessThanOrEqual(1)
  })
})
