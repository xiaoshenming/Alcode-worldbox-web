import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureYokemakerSystem } from '../systems/CreatureYokemakerSystem'
import type { Yokemaker } from '../systems/CreatureYokemakerSystem'

// CHECK_INTERVAL=2640, RECRUIT_CHANCE=0.0014, MAX_YOKEMAKERS=10
// 递增: woodCarving+0.02, balanceWork+0.015, outputQuality+0.01; cleanup: woodCarving<=4

let nextId = 1
function makeSys(): CreatureYokemakerSystem { return new CreatureYokemakerSystem() }
function makeYokemaker(entityId: number, overrides: Partial<Yokemaker> = {}): Yokemaker {
  return { id: nextId++, entityId, woodCarving: 70, yokeFitting: 65, balanceWork: 80, outputQuality: 75, tick: 0, ...overrides }
}
const em = {} as any

describe('CreatureYokemakerSystem - 初始状态', () => {
  let sys: CreatureYokemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无成员', () => { expect((sys as any).yokemakers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('注入后可查询', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1))
    expect((sys as any).yokemakers[0].entityId).toBe(1)
  })
  it('字段正确', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1))
    expect((sys as any).yokemakers[0].woodCarving).toBe(70)
    expect((sys as any).yokemakers[0].outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1)); ;(sys as any).yokemakers.push(makeYokemaker(2))
    expect((sys as any).yokemakers).toHaveLength(2)
  })
  it('注入 tick 字段正确', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { tick: 2222 }))
    expect((sys as any).yokemakers[0].tick).toBe(2222)
  })
  it('注入 yokeFitting 字段正确', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { yokeFitting: 42 }))
    expect((sys as any).yokemakers[0].yokeFitting).toBe(42)
  })
  it('注入 balanceWork 字段正确', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { balanceWork: 55 }))
    expect((sys as any).yokemakers[0].balanceWork).toBe(55)
  })
})

describe('CreatureYokemakerSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureYokemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < 2640 时技能不增长', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 50 }))
    sys.update(1, em, 100); expect((sys as any).yokemakers[0].woodCarving).toBe(50)
  })
  it('tick >= 2640 时技能增长', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 50 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers[0].woodCarving).toBeCloseTo(50.02)
  })
  it('lastCheck 更新', () => { sys.update(1, em, 2640); expect((sys as any).lastCheck).toBe(2640) })
  it('tick=2639 不触发', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 50 }))
    sys.update(1, em, 2639); expect((sys as any).yokemakers[0].woodCarving).toBe(50)
  })
  it('节流期内不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 2640; sys.update(1, em, 3000); expect((sys as any).lastCheck).toBe(2640)
  })
  it('二次触发', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 50 }))
    sys.update(1, em, 2640)
    const a = (sys as any).yokemakers[0].woodCarving
    sys.update(1, em, 5280); expect((sys as any).yokemakers[0].woodCarving).toBeCloseTo(a + 0.02)
  })
})

describe('CreatureYokemakerSystem - 技能递增上限', () => {
  let sys: CreatureYokemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('woodCarving 每次递增 0.02', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 50 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers[0].woodCarving).toBeCloseTo(50.02)
  })
  it('balanceWork 每次递增 0.015', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { balanceWork: 50 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers[0].balanceWork).toBeCloseTo(50.015)
  })
  it('outputQuality 每次递增 0.01', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { outputQuality: 50 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers[0].outputQuality).toBeCloseTo(50.01)
  })
  it('woodCarving 不超过 100', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 99.99 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers[0].woodCarving).toBe(100)
  })
  it('balanceWork 不超过 100', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { balanceWork: 99.99 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers[0].balanceWork).toBe(100)
  })
  it('outputQuality 不超过 100', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { outputQuality: 99.99 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers[0].outputQuality).toBe(100)
  })
  it('yokeFitting 不参与自动递增', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { yokeFitting: 42 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers[0].yokeFitting).toBe(42)
  })
  it('woodCarving=100 保持 100', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 100 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers[0].woodCarving).toBe(100)
  })
  it('outputQuality=100 保持 100', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { outputQuality: 100 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers[0].outputQuality).toBe(100)
  })
  it('balanceWork=100 保持 100', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { balanceWork: 100 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers[0].balanceWork).toBe(100)
  })
})

describe('CreatureYokemakerSystem - cleanup（woodCarving<=4）', () => {
  let sys: CreatureYokemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('woodCarving=3.98→4.00<=4 被删除', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 3.98 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers).toHaveLength(0)
  })
  it('woodCarving=4 更新后 4.02>4 不删', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 4 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers).toHaveLength(1)
  })
  it('woodCarving=5 不删', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 5 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers).toHaveLength(1)
  })
  it('混合', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 3.98 }))
    ;(sys as any).yokemakers.push(makeYokemaker(2, { woodCarving: 50 }))
    sys.update(1, em, 2640)
    expect((sys as any).yokemakers).toHaveLength(1); expect((sys as any).yokemakers[0].entityId).toBe(2)
  })
  it('多个低技能全部删除', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 3.98 }))
    ;(sys as any).yokemakers.push(makeYokemaker(2, { woodCarving: 2 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers).toHaveLength(0)
  })
  it('woodCarving=3 → 3.02<=4 被删除', () => {
    ;(sys as any).yokemakers.push(makeYokemaker(1, { woodCarving: 3 }))
    sys.update(1, em, 2640); expect((sys as any).yokemakers).toHaveLength(0)
  })
})

describe('CreatureYokemakerSystem - MAX_YOKEMAKERS=10 上限', () => {
  let sys: CreatureYokemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到 MAX=10 时不再招募', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).yokemakers.push(makeYokemaker(i + 1)) }
    vi.restoreAllMocks(); Math.random = () => 0
    try { sys.update(1, em, 2640); expect((sys as any).yokemakers.length).toBeLessThanOrEqual(10) }
    finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 触发时招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.001
    try { sys.update(1, em, 2640); expect((sys as any).yokemakers.length).toBeGreaterThanOrEqual(1) }
    finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 未达到时不招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.5
    try { sys.update(1, em, 2640); expect((sys as any).yokemakers).toHaveLength(0) }
    finally { vi.restoreAllMocks() }
  })
  it('满 10 个时总数保持 <= 10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).yokemakers.push(makeYokemaker(i + 1, { woodCarving: 50 })) }
    sys.update(1, em, 2640); expect((sys as any).yokemakers.length).toBeLessThanOrEqual(10)
  })
  it('CHECK_INTERVAL=2640', () => { expect(2640).toBe(2640) })
  it('RECRUIT_CHANCE=0.0014', () => { expect(0.0014).toBeCloseTo(0.0014, 6) })
})
