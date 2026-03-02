import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureClaustrophobiaSystem } from '../systems/CreatureClaustrophobiaSystem'
import type { Claustrophobe } from '../systems/CreatureClaustrophobiaSystem'

let nextId = 1
function makeSys(): CreatureClaustrophobiaSystem { return new CreatureClaustrophobiaSystem() }
function makeClaustrophobe(entityId: number, overrides: Partial<Claustrophobe> = {}): Claustrophobe {
  return { id: nextId++, entityId, severity: 50, panicLevel: 20, triggers: 3, tick: 0, ...overrides }
}

// 创建最小化 mock EntityManager（4参数版 update 需要 em）
function makeEm(entities: number[] = []) {
  return {
    getEntitiesWithComponents: () => entities,
    getComponent: () => null,
  } as any
}

describe('CreatureClaustrophobiaSystem', () => {
  let sys: CreatureClaustrophobiaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // --- 基础状态测试 ---

  it('初始无幽闭恐惧者', () => {
    expect((sys as any).claustrophobes).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).claustrophobes.push(makeClaustrophobe(1))
    expect((sys as any).claustrophobes[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).claustrophobes.push(makeClaustrophobe(1))
    ;(sys as any).claustrophobes.push(makeClaustrophobe(2))
    expect((sys as any).claustrophobes).toHaveLength(2)
  })

  it('severity 和 panicLevel 字段可注入自定义值', () => {
    const c = makeClaustrophobe(10, { severity: 90, panicLevel: 80 })
    ;(sys as any).claustrophobes.push(c)
    const r = (sys as any).claustrophobes[0]
    expect(r.severity).toBe(90)
    expect(r.panicLevel).toBe(80)
  })

  it('triggers 字段默认为注入值', () => {
    const c = makeClaustrophobe(5, { triggers: 7 })
    ;(sys as any).claustrophobes.push(c)
    expect((sys as any).claustrophobes[0].triggers).toBe(7)
  })

  // --- isClaustrophobe 方法测试 ---

  it('isClaustrophobe：_claustrophobeSet 中存在时返回 true', () => {
    ;(sys as any)._claustrophobeSet.add(42)
    expect((sys as any).isClaustrophobe(42)).toBe(true)
  })

  it('isClaustrophobe：_claustrophobeSet 中不存在时返回 false', () => {
    expect((sys as any).isClaustrophobe(99)).toBe(false)
  })

  // --- update 时序逻辑 ---

  it('tick 差值 < 700 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = makeEm([])
    sys.update(16, em, {}, 1600)  // 差值 600 < 700
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick 差值 >= 700 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = makeEm([])
    sys.update(16, em, {}, 1700)  // 差值 700 >= 700
    expect((sys as any).lastCheck).toBe(1700)
  })

  it('tick 差值恰好等于 CHECK_INTERVAL 边界时触发更新', () => {
    ;(sys as any).lastCheck = 0
    const em = makeEm([])
    sys.update(16, em, {}, 700)  // 差值 = 700
    expect((sys as any).lastCheck).toBe(700)
  })

  // --- decayPanic 方法测试 ---

  it('decayPanic：panicLevel 从 5 衰减 0.5 变 4.5', () => {
    const c = makeClaustrophobe(1, { panicLevel: 5 })
    ;(sys as any).claustrophobes.push(c)
    ;(sys as any).decayPanic()
    expect((sys as any).claustrophobes[0].panicLevel).toBeCloseTo(4.5)
  })

  it('decayPanic：panicLevel 不会低于 0（0.3 - 0.5 → 0）', () => {
    const c = makeClaustrophobe(1, { panicLevel: 0.3 })
    ;(sys as any).claustrophobes.push(c)
    ;(sys as any).decayPanic()
    expect((sys as any).claustrophobes[0].panicLevel).toBe(0)
  })

  it('decayPanic：panicLevel 已为 0 时保持 0', () => {
    const c = makeClaustrophobe(1, { panicLevel: 0 })
    ;(sys as any).claustrophobes.push(c)
    ;(sys as any).decayPanic()
    expect((sys as any).claustrophobes[0].panicLevel).toBe(0)
  })

  // --- cleanup 方法测试 ---

  it('cleanup：超出 MAX_CLAUSTROPHOBES(60) 时按 severity 降序截断', () => {
    // 注入 61 个，最低 severity 的应被截断
    for (let i = 0; i < 61; i++) {
      ;(sys as any).claustrophobes.push(makeClaustrophobe(i + 100, { severity: i + 1 }))
    }
    ;(sys as any).cleanup()
    expect((sys as any).claustrophobes).toHaveLength(60)
    // 最后一个应是 severity 最低的保留项（severity=2，因1被截断）
    const severities = (sys as any).claustrophobes.map((c: Claustrophobe) => c.severity)
    expect(Math.min(...severities)).toBe(2)
  })

  it('cleanup：未超出上限时不截断', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).claustrophobes.push(makeClaustrophobe(i + 1, { severity: 50 }))
    }
    ;(sys as any).cleanup()
    expect((sys as any).claustrophobes).toHaveLength(5)
  })
})
