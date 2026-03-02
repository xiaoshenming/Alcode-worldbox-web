import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureKnurlerSystem, Knurler } from '../systems/CreatureKnurlerSystem'

function makeEM() {
  return {} as any
}

function injectKnurler(sys: CreatureKnurlerSystem, overrides: Partial<Knurler> = {}): Knurler {
  const knurler: Knurler = {
    id: 1,
    entityId: 100,
    knurlingSkill: 20,
    patternPrecision: 25,
    surfaceTexture: 10,
    gripQuality: 20,
    tick: 0,
    ...overrides,
  }
  ;(sys as any).knurlers.push(knurler)
  return knurler
}

function triggerUpdate(sys: CreatureKnurlerSystem) {
  sys.update(1, makeEM(), 2930)
}

describe('CreatureKnurlerSystem', () => {
  let sys: CreatureKnurlerSystem

  beforeEach(() => {
    sys = new CreatureKnurlerSystem()
  })

  // 1. 初始无记录
  it('初始 knurlers 列表为空', () => {
    expect((sys as any).knurlers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入 knurler 后可从列表查询', () => {
    injectKnurler(sys, { entityId: 77 })
    expect((sys as any).knurlers).toHaveLength(1)
    expect((sys as any).knurlers[0].entityId).toBe(77)
  })

  // 3. 多个全部返回
  it('注入多个 knurler 全部可查询', () => {
    injectKnurler(sys, { id: 1, entityId: 1 })
    injectKnurler(sys, { id: 2, entityId: 2 })
    injectKnurler(sys, { id: 3, entityId: 3 })
    expect((sys as any).knurlers).toHaveLength(3)
  })

  // 4. Knurler 四字段完整
  it('Knurler 具备 knurlingSkill/patternPrecision/surfaceTexture/gripQuality 字段', () => {
    injectKnurler(sys)
    const k: Knurler = (sys as any).knurlers[0]
    expect(k).toHaveProperty('knurlingSkill')
    expect(k).toHaveProperty('patternPrecision')
    expect(k).toHaveProperty('surfaceTexture')
    expect(k).toHaveProperty('gripQuality')
  })

  // 5. tick 差值 < 2930 时不更新 lastCheck
  it('tick 差值 < 2930 时 lastCheck 保持 0', () => {
    sys.update(1, makeEM(), 2929)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 6. tick 差值 >= 2930 时更新 lastCheck
  it('tick >= 2930 时 lastCheck 更新', () => {
    sys.update(1, makeEM(), 2930)
    expect((sys as any).lastCheck).toBe(2930)
  })

  // 7. update 后 knurlingSkill 增加 0.02
  it('update 后 knurlingSkill 精确增加 0.02', () => {
    injectKnurler(sys, { knurlingSkill: 20 })
    triggerUpdate(sys)
    expect((sys as any).knurlers[0].knurlingSkill).toBeCloseTo(20.02, 5)
  })

  // 8. update 后 patternPrecision 增加 0.015
  it('update 后 patternPrecision 精确增加 0.015', () => {
    injectKnurler(sys, { patternPrecision: 25 })
    triggerUpdate(sys)
    expect((sys as any).knurlers[0].patternPrecision).toBeCloseTo(25.015, 5)
  })

  // 9. knurlingSkill 上限 100
  it('knurlingSkill 不超过 100', () => {
    injectKnurler(sys, { knurlingSkill: 99.99 })
    triggerUpdate(sys)
    expect((sys as any).knurlers[0].knurlingSkill).toBeLessThanOrEqual(100)
  })

  // 10. gripQuality 增加 0.01
  it('update 后 gripQuality 精确增加 0.01', () => {
    injectKnurler(sys, { gripQuality: 20 })
    triggerUpdate(sys)
    expect((sys as any).knurlers[0].gripQuality).toBeCloseTo(20.01, 5)
  })

  // 11. cleanup: knurlingSkill <= 4 时删除（边界 3.98 => 3.98+0.02=4.00 <= 4）
  it('cleanup: knurlingSkill <= 4 时 knurler 被删除（边界 3.98）', () => {
    injectKnurler(sys, { knurlingSkill: 3.98 })
    triggerUpdate(sys)
    // 3.98+0.02=4.00，4.00<=4 => 被删除
    expect((sys as any).knurlers).toHaveLength(0)
  })

  // 12. cleanup: knurlingSkill > 4 时保留
  it('cleanup: knurlingSkill > 4 时 knurler 保留', () => {
    injectKnurler(sys, { knurlingSkill: 10 })
    triggerUpdate(sys)
    expect((sys as any).knurlers).toHaveLength(1)
  })

  // 13. lastCheck 设定后差值不足时不再更新
  it('lastCheck 已设定后，差值不足 2930 时不再更新', () => {
    sys.update(1, makeEM(), 2930)
    sys.update(1, makeEM(), 4000)  // 4000-2930=1070 < 2930
    expect((sys as any).lastCheck).toBe(2930)
  })
})
