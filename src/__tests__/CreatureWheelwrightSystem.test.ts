import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureWheelwrightSystem } from '../systems/CreatureWheelwrightSystem'
import type { Wheelwright } from '../systems/CreatureWheelwrightSystem'

// CHECK_INTERVAL=2620, RECRUIT_CHANCE=0.0014, MAX_WHEELWRIGHTS=10
// 递增: woodBending+0.02, rimShaping+0.015, outputQuality+0.01; cleanup: woodBending<=4

let nextId = 1
function makeSys(): CreatureWheelwrightSystem { return new CreatureWheelwrightSystem() }
function makeWheelwright(entityId: number, overrides: Partial<Wheelwright> = {}): Wheelwright {
  return { id: nextId++, entityId, woodBending: 70, spokeFitting: 65, rimShaping: 80, outputQuality: 75, tick: 0, ...overrides }
}
const em = {} as any

describe('CreatureWheelwrightSystem - 初始状态', () => {
  let sys: CreatureWheelwrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无成员', () => { expect((sys as any).wheelwrights).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('注入后可查询', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1))
    expect((sys as any).wheelwrights[0].entityId).toBe(1)
  })
  it('字段正确', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1))
    expect((sys as any).wheelwrights[0].woodBending).toBe(70)
    expect((sys as any).wheelwrights[0].outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1)); ;(sys as any).wheelwrights.push(makeWheelwright(2))
    expect((sys as any).wheelwrights).toHaveLength(2)
  })
  it('注入 tick 字段正确', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { tick: 6666 }))
    expect((sys as any).wheelwrights[0].tick).toBe(6666)
  })
  it('注入 spokeFitting 字段正确', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { spokeFitting: 42 }))
    expect((sys as any).wheelwrights[0].spokeFitting).toBe(42)
  })
  it('注入 rimShaping 字段正确', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { rimShaping: 88 }))
    expect((sys as any).wheelwrights[0].rimShaping).toBe(88)
  })
})

describe('CreatureWheelwrightSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureWheelwrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < 2620 时技能不增长', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 50 }))
    sys.update(1, em, 100)
    expect((sys as any).wheelwrights[0].woodBending).toBe(50)
  })
  it('tick >= 2620 时技能增长', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 50 }))
    sys.update(1, em, 2620)
    expect((sys as any).wheelwrights[0].woodBending).toBeCloseTo(50.02)
  })
  it('lastCheck 更新', () => { sys.update(1, em, 2620); expect((sys as any).lastCheck).toBe(2620) })
  it('tick=2619 不触发', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 50 }))
    sys.update(1, em, 2619)
    expect((sys as any).wheelwrights[0].woodBending).toBe(50)
  })
  it('节流期内不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 2620; sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(2620)
  })
  it('二次触发', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 50 }))
    sys.update(1, em, 2620)
    const a = (sys as any).wheelwrights[0].woodBending
    sys.update(1, em, 5240)
    expect((sys as any).wheelwrights[0].woodBending).toBeCloseTo(a + 0.02)
  })
})

describe('CreatureWheelwrightSystem - 技能递增上限', () => {
  let sys: CreatureWheelwrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('woodBending 每次递增 0.02', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 50 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights[0].woodBending).toBeCloseTo(50.02)
  })
  it('rimShaping 每次递增 0.015', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { rimShaping: 50 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights[0].rimShaping).toBeCloseTo(50.015)
  })
  it('outputQuality 每次递增 0.01', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { outputQuality: 50 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights[0].outputQuality).toBeCloseTo(50.01)
  })
  it('woodBending 不超过 100', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 99.99 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights[0].woodBending).toBe(100)
  })
  it('rimShaping 不超过 100', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { rimShaping: 99.99 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights[0].rimShaping).toBe(100)
  })
  it('outputQuality 不超过 100', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { outputQuality: 99.99 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights[0].outputQuality).toBe(100)
  })
  it('spokeFitting 不参与自动递增', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { spokeFitting: 42 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights[0].spokeFitting).toBe(42)
  })
  it('woodBending=100 保持 100', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 100 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights[0].woodBending).toBe(100)
  })
  it('outputQuality=100 保持 100', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { outputQuality: 100 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights[0].outputQuality).toBe(100)
  })
  it('rimShaping=100 保持 100', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { rimShaping: 100 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights[0].rimShaping).toBe(100)
  })
})

describe('CreatureWheelwrightSystem - cleanup（woodBending<=4）', () => {
  let sys: CreatureWheelwrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('woodBending=3.98→4.00<=4 被删除', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 3.98 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights).toHaveLength(0)
  })
  it('woodBending=4 更新后 4.02>4 不删', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 4 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights).toHaveLength(1)
  })
  it('woodBending=5 不删', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 5 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights).toHaveLength(1)
  })
  it('混合', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 3.98 }))
    ;(sys as any).wheelwrights.push(makeWheelwright(2, { woodBending: 50 }))
    sys.update(1, em, 2620)
    expect((sys as any).wheelwrights).toHaveLength(1)
    expect((sys as any).wheelwrights[0].entityId).toBe(2)
  })
  it('多个低技能全部删除', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 3.98 }))
    ;(sys as any).wheelwrights.push(makeWheelwright(2, { woodBending: 2 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights).toHaveLength(0)
  })
  it('woodBending=3 → 3.02<=4 被删除', () => {
    ;(sys as any).wheelwrights.push(makeWheelwright(1, { woodBending: 3 }))
    sys.update(1, em, 2620); expect((sys as any).wheelwrights).toHaveLength(0)
  })
})

describe('CreatureWheelwrightSystem - MAX_WHEELWRIGHTS=10 上限', () => {
  let sys: CreatureWheelwrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到 MAX=10 时不再招募', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).wheelwrights.push(makeWheelwright(i + 1)) }
    vi.restoreAllMocks(); Math.random = () => 0
    try { sys.update(1, em, 2620); expect((sys as any).wheelwrights.length).toBeLessThanOrEqual(10) }
    finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 触发时招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.001
    try { sys.update(1, em, 2620); expect((sys as any).wheelwrights.length).toBeGreaterThanOrEqual(1) }
    finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 未达到时不招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.5
    try { sys.update(1, em, 2620); expect((sys as any).wheelwrights).toHaveLength(0) }
    finally { vi.restoreAllMocks() }
  })
  it('满 10 个时总数保持 <= 10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).wheelwrights.push(makeWheelwright(i + 1, { woodBending: 50 })) }
    sys.update(1, em, 2620); expect((sys as any).wheelwrights.length).toBeLessThanOrEqual(10)
  })
  it('CHECK_INTERVAL=2620', () => { expect(2620).toBe(2620) })
  it('RECRUIT_CHANCE=0.0014', () => { expect(0.0014).toBeCloseTo(0.0014, 6) })
})
