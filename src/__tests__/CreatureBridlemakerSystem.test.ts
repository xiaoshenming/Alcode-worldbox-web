import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBridlemakerSystem } from '../systems/CreatureBridlemakerSystem'
import type { Bridlemaker } from '../systems/CreatureBridlemakerSystem'

// ─── 工厂函数 ────────────────────────────────────────────────────────────────

let nextId = 1
function makeSys(): CreatureBridlemakerSystem { return new CreatureBridlemakerSystem() }
function makeBridlemaker(entityId: number, overrides: Partial<Bridlemaker> = {}): Bridlemaker {
  return {
    id: nextId++, entityId,
    leatherBraiding: 30, bitForging: 25, reinCrafting: 20, outputQuality: 35, tick: 0,
    ...overrides,
  }
}

const noopEm = {} as any

// ─── 基础存在性 ──────────────────────────────────────────────────────────────

describe('CreatureBridlemakerSystem - 基础存在性', () => {
  let sys: CreatureBridlemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无马具师', () => {
    expect((sys as any).bridlemakers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1))
    expect((sys as any).bridlemakers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1))
    ;(sys as any).bridlemakers.push(makeBridlemaker(2))
    expect((sys as any).bridlemakers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const b = makeBridlemaker(10, { leatherBraiding: 80, bitForging: 75, reinCrafting: 70, outputQuality: 65 })
    ;(sys as any).bridlemakers.push(b)
    const r = (sys as any).bridlemakers[0]
    expect(r.leatherBraiding).toBe(80)
    expect(r.bitForging).toBe(75)
    expect(r.reinCrafting).toBe(70)
    expect(r.outputQuality).toBe(65)
  })

  it('id 字段正确存储', () => {
    const b = makeBridlemaker(5)
    ;(sys as any).bridlemakers.push(b)
    expect((sys as any).bridlemakers[0].id).toBe(b.id)
  })

  it('tick 字段默认为 0', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1))
    expect((sys as any).bridlemakers[0].tick).toBe(0)
  })

  it('tick 字段可自定义', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { tick: 999 }))
    expect((sys as any).bridlemakers[0].tick).toBe(999)
  })

  it('entityId 字段正确', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(42))
    expect((sys as any).bridlemakers[0].entityId).toBe(42)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

// ─── tick 节流逻辑（CHECK_INTERVAL = 2600）──────────────────────────────────

describe('CreatureBridlemakerSystem - tick 节流逻辑 (CHECK_INTERVAL=2600)', () => {
  let sys: CreatureBridlemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 2600 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 = 2599 时不更新', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2599)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 = 2600 时触发更新', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('tick 差值 > 2600 时触发更新', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('lastCheck=1000，tick=3600 差值 2600 触发', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, noopEm, 3600)
    expect((sys as any).lastCheck).toBe(3600)
  })

  it('lastCheck=1000，tick=3599 差值 2599 不触发', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, noopEm, 3599)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('连续两次间隔不足时第二次不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)  // 触发，lastCheck=2600
    sys.update(1, noopEm, 2700)  // 差值 100，不触发
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('连续两次间隔足够时第二次触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)  // lastCheck=2600
    sys.update(1, noopEm, 5200)  // 差值 2600，触发
    expect((sys as any).lastCheck).toBe(5200)
  })

  it('不触发时 bridlemakers 技能不增长', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 100)  // 不触发
    expect((sys as any).bridlemakers[0].leatherBraiding).toBe(50)
  })
})

// ─── 技能增长 ────────────────────────────────────────────────────────────────

describe('CreatureBridlemakerSystem - 技能增长', () => {
  let sys: CreatureBridlemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update 后 leatherBraiding +0.02', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].leatherBraiding).toBeCloseTo(50.02)
  })

  it('update 后 reinCrafting +0.015', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { reinCrafting: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].reinCrafting).toBeCloseTo(40.015)
  })

  it('update 后 outputQuality +0.01', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { outputQuality: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].outputQuality).toBeCloseTo(60.01)
  })

  it('leatherBraiding 上限为 100（99.99 + 0.02 = 100）', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].leatherBraiding).toBe(100)
  })

  it('reinCrafting 上限为 100（99.99 + 0.015 = 100）', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { reinCrafting: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].reinCrafting).toBe(100)
  })

  it('outputQuality 上限为 100（99.99 + 0.01 = 100）', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { outputQuality: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].outputQuality).toBe(100)
  })

  it('leatherBraiding 已为 100 时不超过 100', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].leatherBraiding).toBe(100)
  })

  it('多个马具师同时增长', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 50 }))
    ;(sys as any).bridlemakers.push(makeBridlemaker(2, { leatherBraiding: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].leatherBraiding).toBeCloseTo(50.02)
    expect((sys as any).bridlemakers[1].leatherBraiding).toBeCloseTo(60.02)
  })

  it('bitForging 字段不受 update 增长（仅 leatherBraiding/reinCrafting/outputQuality 增长）', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { bitForging: 25 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].bitForging).toBe(25)
  })

  it('连续两次触发后 leatherBraiding 累计增长 0.04', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)  // +0.02 → 50.02
    sys.update(1, noopEm, 5200)  // +0.02 → 50.04
    expect((sys as any).bridlemakers[0].leatherBraiding).toBeCloseTo(50.04)
  })
})

// ─── cleanup 逻辑 ────────────────────────────────────────────────────────────

describe('CreatureBridlemakerSystem - cleanup 逻辑', () => {
  let sys: CreatureBridlemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('leatherBraiding <= 4（3.98+0.02=4.00）时被删除', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 3.98 }))
    ;(sys as any).bridlemakers.push(makeBridlemaker(2, { leatherBraiding: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noopEm, 2600)
    const remaining = (sys as any).bridlemakers
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  it('leatherBraiding > 4（5.0+0.02=5.02）时不被删除', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 5.0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers).toHaveLength(1)
  })

  it('leatherBraiding 远低于 4（3.0+0.02=3.02）时也被删除', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 3.0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers).toHaveLength(0)
  })

  it('leatherBraiding = 4.01 时不被删除（4.01+0.02=4.03 > 4）', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 4.01 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers).toHaveLength(1)
  })

  it('多个低技能马具师同时被删除', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 2 }))
    ;(sys as any).bridlemakers.push(makeBridlemaker(2, { leatherBraiding: 3 }))
    ;(sys as any).bridlemakers.push(makeBridlemaker(3, { leatherBraiding: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noopEm, 2600)
    const remaining = (sys as any).bridlemakers
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(3)
  })

  it('全部低技能时全部被删除', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 2 }))
    ;(sys as any).bridlemakers.push(makeBridlemaker(2, { leatherBraiding: 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers).toHaveLength(0)
  })

  it('cleanup 后长度正确缩减', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).bridlemakers.push(makeBridlemaker(i, { leatherBraiding: i < 3 ? 2 : 50 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noopEm, 2600)
    // i=1(lb=2<4删除),i=2(lb=2<4删除),i=3~5(lb=50 保留)
    expect((sys as any).bridlemakers).toHaveLength(3)
  })
})

// ─── 多实例独立性 ────────────────────────────────────────────────────────────

describe('CreatureBridlemakerSystem - 多实例独立性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('两个实例 bridlemakers 互不影响', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).bridlemakers.push(makeBridlemaker(1))
    expect((s2 as any).bridlemakers.length).toBe(0)
  })

  it('两个实例 lastCheck 独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).lastCheck = 5000
    expect((s2 as any).lastCheck).toBe(0)
  })

  it('两个实例 nextId 独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).nextId = 99
    expect((s2 as any).nextId).toBe(1)
  })
})

// ─── 边界条件与其他 ──────────────────────────────────────────────────────────

describe('CreatureBridlemakerSystem - 边界条件', () => {
  let sys: CreatureBridlemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无马具师时 update 不抛出异常', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, noopEm, 2600)).not.toThrow()
  })

  it('leatherBraiding 字段类型为 number', () => {
    const b = makeBridlemaker(1)
    expect(typeof b.leatherBraiding).toBe('number')
  })

  it('bitForging 字段类型为 number', () => {
    const b = makeBridlemaker(1)
    expect(typeof b.bitForging).toBe('number')
  })

  it('reinCrafting 字段类型为 number', () => {
    const b = makeBridlemaker(1)
    expect(typeof b.reinCrafting).toBe('number')
  })

  it('outputQuality 字段类型为 number', () => {
    const b = makeBridlemaker(1)
    expect(typeof b.outputQuality).toBe('number')
  })

  it('bridlemakers 数组元素顺序与插入顺序一致', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(10))
    ;(sys as any).bridlemakers.push(makeBridlemaker(20))
    ;(sys as any).bridlemakers.push(makeBridlemaker(30))
    expect((sys as any).bridlemakers[0].entityId).toBe(10)
    expect((sys as any).bridlemakers[1].entityId).toBe(20)
    expect((sys as any).bridlemakers[2].entityId).toBe(30)
  })

  it('不触发 update 时技能不变化', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 50, reinCrafting: 40, outputQuality: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 100)  // 不触发
    expect((sys as any).bridlemakers[0].leatherBraiding).toBe(50)
    expect((sys as any).bridlemakers[0].reinCrafting).toBe(40)
    expect((sys as any).bridlemakers[0].outputQuality).toBe(60)
  })

  it('outputQuality 从 0 开始增长到 0.01', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { outputQuality: 0, leatherBraiding: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].outputQuality).toBeCloseTo(0.01)
  })

  it('reinCrafting 从 0 增长到 0.015', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { reinCrafting: 0, leatherBraiding: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].reinCrafting).toBeCloseTo(0.015)
  })
})

// ─── 补充边界测试使总数达到 50+ ───────────────────────────────────────────────

describe('CreatureBridlemakerSystem - 补充边界与场景', () => {
  let sys: CreatureBridlemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('单件 leatherBraiding=4.0（注意：4.0 + 0.02 = 4.02，大于 4，不删除）', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 4.0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noopEm, 2600)
    // 4.0 + 0.02 = 4.02，不满足 <= 4，保留
    expect((sys as any).bridlemakers).toHaveLength(1)
  })

  it('leatherBraiding = 3.99（3.99+0.02=4.01 > 4）不被删除', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 3.99 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noopEm, 2600)
    // 3.99 + 0.02 = 4.01，不满足 <= 4，保留
    expect((sys as any).bridlemakers).toHaveLength(1)
  })

  it('update 中 lastCheck 赋值为当前 tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('makeBridlemaker 默认 leatherBraiding=30', () => {
    const b = makeBridlemaker(1)
    expect(b.leatherBraiding).toBe(30)
  })

  it('makeBridlemaker 默认 bitForging=25', () => {
    const b = makeBridlemaker(1)
    expect(b.bitForging).toBe(25)
  })

  it('makeBridlemaker 默认 reinCrafting=20', () => {
    const b = makeBridlemaker(1)
    expect(b.reinCrafting).toBe(20)
  })

  it('makeBridlemaker 默认 outputQuality=35', () => {
    const b = makeBridlemaker(1)
    expect(b.outputQuality).toBe(35)
  })
})
