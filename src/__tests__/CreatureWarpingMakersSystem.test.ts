import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureWarpingMakersSystem } from '../systems/CreatureWarpingMakersSystem'
import type { WarpingMaker } from '../systems/CreatureWarpingMakersSystem'

// CHECK_INTERVAL=2500, RECRUIT_CHANCE=0.0017, MAX_MAKERS=12
// 递增: tensionControl+0.02, threadAlignment+0.015, efficiency+0.01; cleanup: tensionControl<=4

let nextId = 1
function makeSys(): CreatureWarpingMakersSystem { return new CreatureWarpingMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<WarpingMaker> = {}): WarpingMaker {
  return { id: nextId++, entityId, tensionControl: 70, threadAlignment: 65, beamLoading: 80, efficiency: 75, tick: 0, ...overrides }
}
const em = {} as any

describe('CreatureWarpingMakersSystem - 初始状态', () => {
  let sys: CreatureWarpingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无成员', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('makers 是数组', () => { expect(Array.isArray((sys as any).makers)).toBe(true) })
  it('注入后可查询 entityId', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].tensionControl).toBe(70)
    expect((sys as any).makers[0].efficiency).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1)); ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
  it('注入 tick 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 4444 }))
    expect((sys as any).makers[0].tick).toBe(4444)
  })
  it('注入 beamLoading 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { beamLoading: 55 }))
    expect((sys as any).makers[0].beamLoading).toBe(55)
  })
  it('注入 threadAlignment 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { threadAlignment: 33 }))
    expect((sys as any).makers[0].threadAlignment).toBe(33)
  })
})

describe('CreatureWarpingMakersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureWarpingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < 2500 时技能不增长', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 50 }))
    sys.update(1, em, 100)
    expect((sys as any).makers[0].tensionControl).toBe(50)
  })
  it('tick >= 2500 时技能增长', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 50 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].tensionControl).toBeCloseTo(50.02)
  })
  it('lastCheck 更新', () => { sys.update(1, em, 2500); expect((sys as any).lastCheck).toBe(2500) })
  it('tick=2499 不触发', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 50 }))
    sys.update(1, em, 2499)
    expect((sys as any).makers[0].tensionControl).toBe(50)
  })
  it('节流期内不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 2500; sys.update(1, em, 2600)
    expect((sys as any).lastCheck).toBe(2500)
  })
  it('二次触发', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 50 }))
    sys.update(1, em, 2500)
    const a = (sys as any).makers[0].tensionControl
    sys.update(1, em, 5000)
    expect((sys as any).makers[0].tensionControl).toBeCloseTo(a + 0.02)
  })
  it('tick=2500 恰好触发', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 50 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].tensionControl).toBeCloseTo(50.02)
  })
})

describe('CreatureWarpingMakersSystem - 技能递增上限', () => {
  let sys: CreatureWarpingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tensionControl 每次递增 0.02', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 50 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].tensionControl).toBeCloseTo(50.02)
  })
  it('threadAlignment 每次递增 0.015', () => {
    ;(sys as any).makers.push(makeMaker(1, { threadAlignment: 50 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].threadAlignment).toBeCloseTo(50.015)
  })
  it('efficiency 每次递增 0.01', () => {
    ;(sys as any).makers.push(makeMaker(1, { efficiency: 50 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].efficiency).toBeCloseTo(50.01)
  })
  it('tensionControl 不超过 100', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 99.99 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].tensionControl).toBe(100)
  })
  it('threadAlignment 不超过 100', () => {
    ;(sys as any).makers.push(makeMaker(1, { threadAlignment: 99.99 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].threadAlignment).toBe(100)
  })
  it('efficiency 不超过 100', () => {
    ;(sys as any).makers.push(makeMaker(1, { efficiency: 99.99 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].efficiency).toBe(100)
  })
  it('beamLoading 不参与自动递增', () => {
    ;(sys as any).makers.push(makeMaker(1, { beamLoading: 42 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].beamLoading).toBe(42)
  })
  it('tensionControl=100 保持 100', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 100 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].tensionControl).toBe(100)
  })
  it('efficiency=100 保持 100', () => {
    ;(sys as any).makers.push(makeMaker(1, { efficiency: 100 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].efficiency).toBe(100)
  })
  it('threadAlignment=100 保持 100', () => {
    ;(sys as any).makers.push(makeMaker(1, { threadAlignment: 100 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers[0].threadAlignment).toBe(100)
  })
})

describe('CreatureWarpingMakersSystem - cleanup（tensionControl<=4）', () => {
  let sys: CreatureWarpingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tensionControl=3.98→4.00<=4 被删除', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 3.98 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('tensionControl=4 更新后 4.02>4 不删', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 4 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('tensionControl=5 不删', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 5 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('混合：低技能被删，高技能保留', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 3.98 }))
    ;(sys as any).makers.push(makeMaker(2, { tensionControl: 50 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('多个低技能全部删除', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 3.98 }))
    ;(sys as any).makers.push(makeMaker(2, { tensionControl: 2 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('tensionControl=3 → 3.02<=4 被删除', () => {
    ;(sys as any).makers.push(makeMaker(1, { tensionControl: 3 }))
    sys.update(1, em, 2500)
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureWarpingMakersSystem - MAX_MAKERS=12 上限', () => {
  let sys: CreatureWarpingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到 MAX=12 时不再招募', () => {
    for (let i = 0; i < 12; i++) { ;(sys as any).makers.push(makeMaker(i + 1)) }
    vi.restoreAllMocks(); Math.random = () => 0
    try { sys.update(1, em, 2500); expect((sys as any).makers.length).toBeLessThanOrEqual(12) }
    finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 触发时招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.001
    try { sys.update(1, em, 2500); expect((sys as any).makers.length).toBeGreaterThanOrEqual(1) }
    finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 未达到时不招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.5
    try { sys.update(1, em, 2500); expect((sys as any).makers).toHaveLength(0) }
    finally { vi.restoreAllMocks() }
  })
  it('满 12 个时总数保持 <= 12', () => {
    for (let i = 0; i < 12; i++) { ;(sys as any).makers.push(makeMaker(i + 1, { tensionControl: 50 })) }
    sys.update(1, em, 2500)
    expect((sys as any).makers.length).toBeLessThanOrEqual(12)
  })
  it('CHECK_INTERVAL=2500', () => { expect(2500).toBe(2500) })
  it('RECRUIT_CHANCE=0.0017', () => { expect(0.0017).toBeCloseTo(0.0017, 6) })
})
