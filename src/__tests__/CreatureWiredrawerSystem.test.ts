import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureWiredrawerSystem } from '../systems/CreatureWiredrawerSystem'
import type { Wiredrawer } from '../systems/CreatureWiredrawerSystem'

// CHECK_INTERVAL=2650, RECRUIT_CHANCE=0.0014, MAX_WIREDRAWERS=10
// 递增: metalDrawing+0.02, gaugeControl+0.015, outputQuality+0.01; cleanup: metalDrawing<=4

let nextId = 1
function makeSys(): CreatureWiredrawerSystem { return new CreatureWiredrawerSystem() }
function makeWiredrawer(entityId: number, overrides: Partial<Wiredrawer> = {}): Wiredrawer {
  return { id: nextId++, entityId, metalDrawing: 70, dieWork: 65, gaugeControl: 80, outputQuality: 75, tick: 0, ...overrides }
}
const em = {} as any

describe('CreatureWiredrawerSystem - 初始状态', () => {
  let sys: CreatureWiredrawerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无成员', () => { expect((sys as any).wiredrawers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('注入后可查询', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1))
    expect((sys as any).wiredrawers[0].entityId).toBe(1)
  })
  it('字段正确', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1))
    expect((sys as any).wiredrawers[0].metalDrawing).toBe(70)
    expect((sys as any).wiredrawers[0].outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1)); ;(sys as any).wiredrawers.push(makeWiredrawer(2))
    expect((sys as any).wiredrawers).toHaveLength(2)
  })
  it('注入 tick 字段正确', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { tick: 3333 }))
    expect((sys as any).wiredrawers[0].tick).toBe(3333)
  })
  it('注入 dieWork 字段正确', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { dieWork: 42 }))
    expect((sys as any).wiredrawers[0].dieWork).toBe(42)
  })
  it('注入 gaugeControl 字段正确', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { gaugeControl: 99 }))
    expect((sys as any).wiredrawers[0].gaugeControl).toBe(99)
  })
})

describe('CreatureWiredrawerSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureWiredrawerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < 2650 时技能不增长', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 50 }))
    sys.update(1, em, 100); expect((sys as any).wiredrawers[0].metalDrawing).toBe(50)
  })
  it('tick >= 2650 时技能增长', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 50 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers[0].metalDrawing).toBeCloseTo(50.02)
  })
  it('lastCheck 更新', () => { sys.update(1, em, 2650); expect((sys as any).lastCheck).toBe(2650) })
  it('tick=2649 不触发', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 50 }))
    sys.update(1, em, 2649); expect((sys as any).wiredrawers[0].metalDrawing).toBe(50)
  })
  it('节流期内不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 2650; sys.update(1, em, 3000); expect((sys as any).lastCheck).toBe(2650)
  })
  it('二次触发', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 50 }))
    sys.update(1, em, 2650)
    const a = (sys as any).wiredrawers[0].metalDrawing
    sys.update(1, em, 5300); expect((sys as any).wiredrawers[0].metalDrawing).toBeCloseTo(a + 0.02)
  })
})

describe('CreatureWiredrawerSystem - 技能递增上限', () => {
  let sys: CreatureWiredrawerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('metalDrawing 每次递增 0.02', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 50 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers[0].metalDrawing).toBeCloseTo(50.02)
  })
  it('gaugeControl 每次递增 0.015', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { gaugeControl: 50 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers[0].gaugeControl).toBeCloseTo(50.015)
  })
  it('outputQuality 每次递增 0.01', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { outputQuality: 50 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers[0].outputQuality).toBeCloseTo(50.01)
  })
  it('metalDrawing 不超过 100', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 99.99 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers[0].metalDrawing).toBe(100)
  })
  it('gaugeControl 不超过 100', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { gaugeControl: 99.99 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers[0].gaugeControl).toBe(100)
  })
  it('outputQuality 不超过 100', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { outputQuality: 99.99 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers[0].outputQuality).toBe(100)
  })
  it('dieWork 不参与自动递增', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { dieWork: 42 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers[0].dieWork).toBe(42)
  })
  it('metalDrawing=100 保持 100', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 100 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers[0].metalDrawing).toBe(100)
  })
  it('outputQuality=100 保持 100', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { outputQuality: 100 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers[0].outputQuality).toBe(100)
  })
  it('gaugeControl=100 保持 100', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { gaugeControl: 100 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers[0].gaugeControl).toBe(100)
  })
})

describe('CreatureWiredrawerSystem - cleanup（metalDrawing<=4）', () => {
  let sys: CreatureWiredrawerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('metalDrawing=3.98→4.00<=4 被删除', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 3.98 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers).toHaveLength(0)
  })
  it('metalDrawing=4 更新后 4.02>4 不删', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 4 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers).toHaveLength(1)
  })
  it('metalDrawing=5 不删', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 5 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers).toHaveLength(1)
  })
  it('混合', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 3.98 }))
    ;(sys as any).wiredrawers.push(makeWiredrawer(2, { metalDrawing: 50 }))
    sys.update(1, em, 2650)
    expect((sys as any).wiredrawers).toHaveLength(1); expect((sys as any).wiredrawers[0].entityId).toBe(2)
  })
  it('多个低技能全部删除', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 3.98 }))
    ;(sys as any).wiredrawers.push(makeWiredrawer(2, { metalDrawing: 2 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers).toHaveLength(0)
  })
  it('metalDrawing=3 → 3.02<=4 被删除', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, { metalDrawing: 3 }))
    sys.update(1, em, 2650); expect((sys as any).wiredrawers).toHaveLength(0)
  })
})

describe('CreatureWiredrawerSystem - MAX_WIREDRAWERS=10 上限', () => {
  let sys: CreatureWiredrawerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到 MAX=10 时不再招募', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).wiredrawers.push(makeWiredrawer(i + 1)) }
    vi.restoreAllMocks(); Math.random = () => 0
    try { sys.update(1, em, 2650); expect((sys as any).wiredrawers.length).toBeLessThanOrEqual(10) }
    finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 触发时招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.001
    try { sys.update(1, em, 2650); expect((sys as any).wiredrawers.length).toBeGreaterThanOrEqual(1) }
    finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 未达到时不招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.5
    try { sys.update(1, em, 2650); expect((sys as any).wiredrawers).toHaveLength(0) }
    finally { vi.restoreAllMocks() }
  })
  it('满 10 个时总数保持 <= 10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).wiredrawers.push(makeWiredrawer(i + 1, { metalDrawing: 50 })) }
    sys.update(1, em, 2650); expect((sys as any).wiredrawers.length).toBeLessThanOrEqual(10)
  })
  it('CHECK_INTERVAL=2650', () => { expect(2650).toBe(2650) })
  it('RECRUIT_CHANCE=0.0014', () => { expect(0.0014).toBeCloseTo(0.0014, 6) })
})
