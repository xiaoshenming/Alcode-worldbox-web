import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBroacherSystem } from '../systems/CreatureBroacherSystem'
import type { Broacher } from '../systems/CreatureBroacherSystem'

let nextId = 1
function makeSys(): CreatureBroacherSystem { return new CreatureBroacherSystem() }
function makeBroacher(entityId: number, overrides: Partial<Broacher> = {}): Broacher {
  return {
    id: nextId++, entityId,
    broachingSkill: 30, toothAlignment: 25, internalShaping: 20, keywayCutting: 35, tick: 0,
    ...overrides
  }
}

const noopEm = {} as any

describe('CreatureBroacherSystem', () => {
  let sys: CreatureBroacherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // --- 基础存在性 ---
  it('初始无拉削师', () => {
    expect((sys as any).broachers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).broachers.push(makeBroacher(1))
    expect((sys as any).broachers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).broachers.push(makeBroacher(1))
    ;(sys as any).broachers.push(makeBroacher(2))
    expect((sys as any).broachers).toHaveLength(2)
  })

  it('四字段数据完整（broachingSkill/toothAlignment/internalShaping/keywayCutting）', () => {
    const b = makeBroacher(10, { broachingSkill: 80, toothAlignment: 75, internalShaping: 70, keywayCutting: 65 })
    ;(sys as any).broachers.push(b)
    const r = (sys as any).broachers[0]
    expect(r.broachingSkill).toBe(80)
    expect(r.toothAlignment).toBe(75)
    expect(r.internalShaping).toBe(70)
    expect(r.keywayCutting).toBe(65)
  })

  // --- tick 节流逻辑（CHECK_INTERVAL = 2950）---
  it('tick 差值 < 2950 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 >= 2950 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).lastCheck).toBe(2950)
  })

  it('tick 差值恰好等于 2950 时触发更新', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, noopEm, 3950)
    expect((sys as any).lastCheck).toBe(3950)
  })

  // --- 技能增长 ---
  it('update 后 broachingSkill +0.02', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].broachingSkill).toBeCloseTo(50.02)
  })

  it('update 后 toothAlignment +0.015', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { toothAlignment: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].toothAlignment).toBeCloseTo(40.015)
  })

  it('update 后 keywayCutting +0.01', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { keywayCutting: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].keywayCutting).toBeCloseTo(60.01)
  })

  it('broachingSkill 上限为 100（99.99 + 0.02 = 100）', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].broachingSkill).toBe(100)
  })

  // --- cleanup 逻辑 ---
  it('broachingSkill <= 4 时被删除（先递增后 cleanup，3.98 + 0.02 = 4.00 恰好删除）', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 3.98 }))
    ;(sys as any).broachers.push(makeBroacher(2, { broachingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    const remaining = (sys as any).broachers
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  it('broachingSkill > 4 时不被删除（5.0 + 0.02 = 5.02 > 4）', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 5.0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers).toHaveLength(1)
  })

  it('broachingSkill 远低于 4 时也被删除（3.0 + 0.02 = 3.02 <= 4）', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 3.0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers).toHaveLength(0)
  })
})
