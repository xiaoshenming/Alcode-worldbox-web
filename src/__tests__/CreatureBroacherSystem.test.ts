import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBroacherSystem } from '../systems/CreatureBroacherSystem'
import type { Broacher } from '../systems/CreatureBroacherSystem'

// ─── 工厂函数 ────────────────────────────────────────────────────────────────

let nextId = 1
function makeSys(): CreatureBroacherSystem { return new CreatureBroacherSystem() }
function makeBroacher(entityId: number, overrides: Partial<Broacher> = {}): Broacher {
  return {
    id: nextId++, entityId,
    broachingSkill: 30, toothAlignment: 25, internalShaping: 20, keywayCutting: 35, tick: 0,
    ...overrides,
  }
}

const noopEm = {} as any

// ─── 基础存在性 ──────────────────────────────────────────────────────────────

describe('CreatureBroacherSystem - 基础存在性', () => {
  let sys: CreatureBroacherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

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

  it('四���段数据完整（broachingSkill/toothAlignment/internalShaping/keywayCutting）', () => {
    const b = makeBroacher(10, { broachingSkill: 80, toothAlignment: 75, internalShaping: 70, keywayCutting: 65 })
    ;(sys as any).broachers.push(b)
    const r = (sys as any).broachers[0]
    expect(r.broachingSkill).toBe(80)
    expect(r.toothAlignment).toBe(75)
    expect(r.internalShaping).toBe(70)
    expect(r.keywayCutting).toBe(65)
  })

  it('id 字段正确存储', () => {
    const b = makeBroacher(5)
    ;(sys as any).broachers.push(b)
    expect((sys as any).broachers[0].id).toBe(b.id)
  })

  it('tick 字段默认为 0', () => {
    ;(sys as any).broachers.push(makeBroacher(1))
    expect((sys as any).broachers[0].tick).toBe(0)
  })

  it('tick 字段可自定义', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { tick: 777 }))
    expect((sys as any).broachers[0].tick).toBe(777)
  })

  it('entityId 字段正确', () => {
    ;(sys as any).broachers.push(makeBroacher(99))
    expect((sys as any).broachers[0].entityId).toBe(99)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

// ─── tick 节流逻辑（CHECK_INTERVAL = 2950）──────────────────────────────────

describe('CreatureBroacherSystem - tick 节流逻辑 (CHECK_INTERVAL=2950)', () => {
  let sys: CreatureBroacherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 2950 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 = 2949 时不更新', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2949)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 = 2950 时触发更新', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).lastCheck).toBe(2950)
  })

  it('tick 差值 > 2950 时触发更新', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 3500)
    expect((sys as any).lastCheck).toBe(3500)
  })

  it('lastCheck=1000，tick=3950 差值 2950 触发', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, noopEm, 3950)
    expect((sys as any).lastCheck).toBe(3950)
  })

  it('lastCheck=1000，tick=3949 差值 2949 不触发', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, noopEm, 3949)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('连续两次间隔不足时第二次不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)  // 触发，lastCheck=2950
    sys.update(1, noopEm, 3000)  // 差值 50，不触发
    expect((sys as any).lastCheck).toBe(2950)
  })

  it('连续两次间隔足够时第二次触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)  // lastCheck=2950
    sys.update(1, noopEm, 5900)  // 差值 2950，触发
    expect((sys as any).lastCheck).toBe(5900)
  })

  it('不触发时 broachers 技能不增长', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 100)  // 不触发
    expect((sys as any).broachers[0].broachingSkill).toBe(50)
  })
})

// ─── 技能增长 ────────────────────────────────────────────────────────────────

describe('CreatureBroacherSystem - 技能增长', () => {
  let sys: CreatureBroacherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

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

  it('toothAlignment 上限为 100（99.99 + 0.015 = 100）', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { toothAlignment: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].toothAlignment).toBe(100)
  })

  it('keywayCutting 上限为 100（99.99 + 0.01 = 100）', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { keywayCutting: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].keywayCutting).toBe(100)
  })

  it('broachingSkill 已为 100 时不超过 100', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].broachingSkill).toBe(100)
  })

  it('toothAlignment 已为 100 时不超过 100', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { toothAlignment: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].toothAlignment).toBe(100)
  })

  it('keywayCutting 已为 100 时不超过 100', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { keywayCutting: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].keywayCutting).toBe(100)
  })

  it('多个拉削师同时增长', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 50 }))
    ;(sys as any).broachers.push(makeBroacher(2, { broachingSkill: 70 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].broachingSkill).toBeCloseTo(50.02)
    expect((sys as any).broachers[1].broachingSkill).toBeCloseTo(70.02)
  })

  it('internalShaping 字段不受 update 增长（仅 broachingSkill/toothAlignment/keywayCutting 增长）', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { internalShaping: 25 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].internalShaping).toBe(25)
  })

  it('连续两次触发后 broachingSkill 累计增长 0.04', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)  // +0.02 → 50.02
    sys.update(1, noopEm, 5900)  // +0.02 → 50.04
    expect((sys as any).broachers[0].broachingSkill).toBeCloseTo(50.04)
  })

  it('keywayCutting 从 0 增长到 0.01', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { keywayCutting: 0, broachingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].keywayCutting).toBeCloseTo(0.01)
  })

  it('toothAlignment 从 0 增长到 0.015', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { toothAlignment: 0, broachingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].toothAlignment).toBeCloseTo(0.015)
  })
})

// ─── cleanup 逻辑 ────────────────────────────────────────────────────────────

describe('CreatureBroacherSystem - cleanup 逻辑', () => {
  let sys: CreatureBroacherSystem
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys = makeSys(); nextId = 1
  })
  afterEach(() => vi.restoreAllMocks())

  it('broachingSkill <= 4（3.98+0.02=4.00）时被删除', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 3.98 }))
    ;(sys as any).broachers.push(makeBroacher(2, { broachingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    const remaining = (sys as any).broachers
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  it('broachingSkill > 4（5.0+0.02=5.02）时不被删除', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 5.0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers).toHaveLength(1)
  })

  it('broachingSkill 远低于 4（3.0+0.02=3.02）时也被删除', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 3.0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers).toHaveLength(0)
  })

  it('broachingSkill = 4.01 时不被删除（4.01+0.02=4.03 > 4）', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 4.01 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers).toHaveLength(1)
  })

  it('多个低技能拉削师同时被删除', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 2 }))
    ;(sys as any).broachers.push(makeBroacher(2, { broachingSkill: 3 }))
    ;(sys as any).broachers.push(makeBroacher(3, { broachingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    const remaining = (sys as any).broachers
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(3)
  })

  it('全部低技能时全部被删除', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 2 }))
    ;(sys as any).broachers.push(makeBroacher(2, { broachingSkill: 1 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers).toHaveLength(0)
  })

  it('cleanup 后剩余元素保留正确', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).broachers.push(makeBroacher(i, { broachingSkill: i < 3 ? 2 : 50 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    // i=1(bs=2 删除),i=2(bs=2 删除),i=3~5(bs=50 保留)
    expect((sys as any).broachers).toHaveLength(3)
  })

  it('broachingSkill = 0 时也被删除（0+0.02=0.02 <= 4）', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers).toHaveLength(0)
  })

  it('不触发时不执行 cleanup', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 2 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 100)  // 不触发
    expect((sys as any).broachers).toHaveLength(1)
  })
})

// ─── 多���例独立性 ────────────────────────────────────────────────────────────

describe('CreatureBroacherSystem - 多实例独立性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('两个实例 broachers 互不影响', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).broachers.push(makeBroacher(1))
    expect((s2 as any).broachers.length).toBe(0)
  })

  it('两个实例 lastCheck 独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).lastCheck = 9999
    expect((s2 as any).lastCheck).toBe(0)
  })

  it('两个实例 nextId 独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).nextId = 77
    expect((s2 as any).nextId).toBe(1)
  })
})

// ─── 边界条件 ────────────────────────────────────────────────────────────────

describe('CreatureBroacherSystem - 边界条件', () => {
  let sys: CreatureBroacherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无拉削师时 update 不抛出异常', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, noopEm, 2950)).not.toThrow()
  })

  it('broachingSkill 字段类型为 number', () => {
    const b = makeBroacher(1)
    expect(typeof b.broachingSkill).toBe('number')
  })

  it('toothAlignment 字段类型为 number', () => {
    const b = makeBroacher(1)
    expect(typeof b.toothAlignment).toBe('number')
  })

  it('internalShaping 字段类型为 number', () => {
    const b = makeBroacher(1)
    expect(typeof b.internalShaping).toBe('number')
  })

  it('keywayCutting 字段类型为 number', () => {
    const b = makeBroacher(1)
    expect(typeof b.keywayCutting).toBe('number')
  })

  it('broachers 数组元素顺序与插入顺序一致', () => {
    ;(sys as any).broachers.push(makeBroacher(10))
    ;(sys as any).broachers.push(makeBroacher(20))
    ;(sys as any).broachers.push(makeBroacher(30))
    expect((sys as any).broachers[0].entityId).toBe(10)
    expect((sys as any).broachers[1].entityId).toBe(20)
    expect((sys as any).broachers[2].entityId).toBe(30)
  })

  it('不触发 update 时技能不变化', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 50, toothAlignment: 40, keywayCutting: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 100)  // 不触发
    expect((sys as any).broachers[0].broachingSkill).toBe(50)
    expect((sys as any).broachers[0].toothAlignment).toBe(40)
    expect((sys as any).broachers[0].keywayCutting).toBe(60)
  })

  it('CHECK_INTERVAL 边界（2950）以上才触发技能增长', () => {
    ;(sys as any).broachers.push(makeBroacher(1, { broachingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2950)
    expect((sys as any).broachers[0].broachingSkill).toBeCloseTo(50.02)
  })
})
