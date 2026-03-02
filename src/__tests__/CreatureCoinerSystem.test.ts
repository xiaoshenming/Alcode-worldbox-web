import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCoinerSystem } from '../systems/CreatureCoinerSystem'
import type { Coiner } from '../systems/CreatureCoinerSystem'

let nextId = 1
function makeSys(): CreatureCoinerSystem { return new CreatureCoinerSystem() }
function makeCoiner(entityId: number, overrides: Partial<Coiner> = {}): Coiner {
  return { id: nextId++, entityId, coiningSkill: 30, dieStriking: 25, metalStamping: 20, reliefDepth: 35, tick: 0, ...overrides }
}

// 创建最小化 mock EntityManager（update 3 参数版）
function makeEm() {
  return {
    getEntitiesWithComponents: () => [],
    getComponent: () => null,
  } as any
}

describe('CreatureCoinerSystem', () => {
  let sys: CreatureCoinerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // --- 基础状态测试 ---

  it('初始无铸币工', () => {
    expect((sys as any).coiners).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).coiners.push(makeCoiner(1))
    expect((sys as any).coiners[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).coiners.push(makeCoiner(1))
    ;(sys as any).coiners.push(makeCoiner(2))
    expect((sys as any).coiners).toHaveLength(2)
  })

  it('四字段数据完整（coiningSkill/dieStriking/metalStamping/reliefDepth）', () => {
    const c = makeCoiner(10, { coiningSkill: 80, dieStriking: 75, metalStamping: 70, reliefDepth: 65 })
    ;(sys as any).coiners.push(c)
    const r = (sys as any).coiners[0]
    expect(r.coiningSkill).toBe(80)
    expect(r.dieStriking).toBe(75)
    expect(r.metalStamping).toBe(70)
    expect(r.reliefDepth).toBe(65)
  })

  // --- update 时序逻辑 ---

  it('tick 差值 < 3020 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = makeEm()
    sys.update(16, em, 4019)  // 差值 3019 < 3020
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick 差值 >= 3020 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = makeEm()
    sys.update(16, em, 4020)  // 差值 3020 >= 3020
    expect((sys as any).lastCheck).toBe(4020)
  })

  it('tick 差值恰好等于 CHECK_INTERVAL 边界时触发更新', () => {
    ;(sys as any).lastCheck = 0
    const em = makeEm()
    sys.update(16, em, 3020)  // 差值 = 3020
    expect((sys as any).lastCheck).toBe(3020)
  })

  // --- 技能递增测试 ---

  it('update 后 coiningSkill + 0.02', () => {
    ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 30 }))
    ;(sys as any).lastCheck = 0
    const em = makeEm()
    sys.update(16, em, 3020)
    expect((sys as any).coiners[0].coiningSkill).toBeCloseTo(30.02)
  })

  it('update 后 dieStriking + 0.015', () => {
    ;(sys as any).coiners.push(makeCoiner(1, { dieStriking: 25 }))
    ;(sys as any).lastCheck = 0
    const em = makeEm()
    sys.update(16, em, 3020)
    expect((sys as any).coiners[0].dieStriking).toBeCloseTo(25.015)
  })

  it('update 后 reliefDepth + 0.01', () => {
    ;(sys as any).coiners.push(makeCoiner(1, { reliefDepth: 35 }))
    ;(sys as any).lastCheck = 0
    const em = makeEm()
    sys.update(16, em, 3020)
    expect((sys as any).coiners[0].reliefDepth).toBeCloseTo(35.01)
  })

  // --- 上限测试 ---

  it('coiningSkill 上限为 100（99.99 + 0.02 → 100）', () => {
    ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 99.99 }))
    ;(sys as any).lastCheck = 0
    const em = makeEm()
    sys.update(16, em, 3020)
    expect((sys as any).coiners[0].coiningSkill).toBe(100)
  })

  // --- cleanup 测试 ---

  it('cleanup：coiningSkill <= 4 时删除（先递增后 cleanup：3.98 + 0.02 = 4.00 → 删除）', () => {
    // coiningSkill=3.98，update 后变 4.00，正好等于阈值 4，被删除
    ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 3.98 }))
    ;(sys as any).lastCheck = 0
    const em = makeEm()
    sys.update(16, em, 3020)
    // 3.98 + 0.02 = 4.00，<= 4，应被删除
    expect((sys as any).coiners).toHaveLength(0)
  })

  it('cleanup：coiningSkill > 4 的记录保留（entityId=2 保留）', () => {
    ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 3.98 }))  // 4.00 → 删除
    ;(sys as any).coiners.push(makeCoiner(2, { coiningSkill: 10 }))     // 10.02 → 保留
    ;(sys as any).lastCheck = 0
    const em = makeEm()
    sys.update(16, em, 3020)
    expect((sys as any).coiners).toHaveLength(1)
    expect((sys as any).coiners[0].entityId).toBe(2)
  })
})
