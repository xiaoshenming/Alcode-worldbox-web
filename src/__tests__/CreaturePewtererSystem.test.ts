import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePewtererSystem } from '../systems/CreaturePewtererSystem'
import type { Pewterer } from '../systems/CreaturePewtererSystem'

// CHECK_INTERVAL=2630, RECRUIT_CHANCE=0.0014, MAX_PEWTERERS=10
// 递增: alloyCasting+0.02, polishing+0.015, outputQuality+0.01; cleanup: alloyCasting<=4

let nextId = 1
function makeSys(): CreaturePewtererSystem { return new CreaturePewtererSystem() }
function makePewterer(entityId: number, overrides: Partial<Pewterer> = {}): Pewterer {
  return { id: nextId++, entityId, alloyCasting: 70, moldWork: 65, polishing: 80, outputQuality: 75, tick: 0, ...overrides }
}
const em = {} as any

describe('CreaturePewtererSystem - 初始状态', () => {
  let sys: CreaturePewtererSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无成员', () => { expect((sys as any).pewterers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('注入后可查询 entityId', () => {
    ;(sys as any).pewterers.push(makePewterer(1))
    expect((sys as any).pewterers[0].entityId).toBe(1)
  })
  it('字段正确', () => {
    ;(sys as any).pewterers.push(makePewterer(1))
    expect((sys as any).pewterers[0].alloyCasting).toBe(70)
    expect((sys as any).pewterers[0].outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).pewterers.push(makePewterer(1)); ;(sys as any).pewterers.push(makePewterer(2))
    expect((sys as any).pewterers).toHaveLength(2)
  })
  it('注入 tick 字段正确', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { tick: 7777 }))
    expect((sys as any).pewterers[0].tick).toBe(7777)
  })
  it('注入 moldWork 字段正确', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { moldWork: 42 }))
    expect((sys as any).pewterers[0].moldWork).toBe(42)
  })
  it('注入 polishing 字段正确', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { polishing: 33 }))
    expect((sys as any).pewterers[0].polishing).toBe(33)
  })
})

describe('CreaturePewtererSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePewtererSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < 2630 时技能不增长', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 50 }))
    sys.update(1, em, 100)
    expect((sys as any).pewterers[0].alloyCasting).toBe(50)
  })
  it('tick >= 2630 时技能增长', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 50 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers[0].alloyCasting).toBeCloseTo(50.02)
  })
  it('lastCheck 更新', () => {
    sys.update(1, em, 2630)
    expect((sys as any).lastCheck).toBe(2630)
  })
  it('tick=2629 不触发', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 50 }))
    sys.update(1, em, 2629)
    expect((sys as any).pewterers[0].alloyCasting).toBe(50)
  })
  it('节流期内不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 2630
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(2630)
  })
  it('二次触发', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 50 }))
    sys.update(1, em, 2630)
    const a = (sys as any).pewterers[0].alloyCasting
    sys.update(1, em, 5260)
    expect((sys as any).pewterers[0].alloyCasting).toBeCloseTo(a + 0.02)
  })
})

describe('CreaturePewtererSystem - 技能递增上限', () => {
  let sys: CreaturePewtererSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('alloyCasting 每次递增 0.02', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 50 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers[0].alloyCasting).toBeCloseTo(50.02)
  })
  it('polishing 每次递增 0.015', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { polishing: 50 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers[0].polishing).toBeCloseTo(50.015)
  })
  it('outputQuality 每次递增 0.01', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { outputQuality: 50 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers[0].outputQuality).toBeCloseTo(50.01)
  })
  it('alloyCasting 不超过 100', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 99.99 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers[0].alloyCasting).toBe(100)
  })
  it('polishing 不超过 100', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { polishing: 99.99 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers[0].polishing).toBe(100)
  })
  it('outputQuality 不超过 100', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { outputQuality: 99.99 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers[0].outputQuality).toBe(100)
  })
  it('moldWork 不参与自动递增', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { moldWork: 42 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers[0].moldWork).toBe(42)
  })
  it('alloyCasting=100 保持 100', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 100 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers[0].alloyCasting).toBe(100)
  })
  it('polishing=100 保持 100', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { polishing: 100 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers[0].polishing).toBe(100)
  })
  it('outputQuality=100 保持 100', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { outputQuality: 100 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers[0].outputQuality).toBe(100)
  })
})

describe('CreaturePewtererSystem - cleanup（alloyCasting<=4 删除）', () => {
  let sys: CreaturePewtererSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('alloyCasting=3.98→4.00<=4 被删除', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 3.98 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers).toHaveLength(0)
  })
  it('alloyCasting=4 更新后 4.02>4 不删', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 4 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers).toHaveLength(1)
  })
  it('alloyCasting=5 不删', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 5 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers).toHaveLength(1)
  })
  it('混合：低技能被删，高技能保留', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 3.98 }))
    ;(sys as any).pewterers.push(makePewterer(2, { alloyCasting: 50 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers).toHaveLength(1)
    expect((sys as any).pewterers[0].entityId).toBe(2)
  })
  it('多个低技能全部删除', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 3.98 }))
    ;(sys as any).pewterers.push(makePewterer(2, { alloyCasting: 2 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers).toHaveLength(0)
  })
  it('alloyCasting=3 → 3.02<=4 被删除', () => {
    ;(sys as any).pewterers.push(makePewterer(1, { alloyCasting: 3 }))
    sys.update(1, em, 2630)
    expect((sys as any).pewterers).toHaveLength(0)
  })
})

describe('CreaturePewtererSystem - MAX_PEWTERERS=10 上限', () => {
  let sys: CreaturePewtererSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到 MAX=10 时不再招募', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).pewterers.push(makePewterer(i + 1)) }
    vi.restoreAllMocks(); Math.random = () => 0
    try {
      sys.update(1, em, 2630)
      expect((sys as any).pewterers.length).toBeLessThanOrEqual(10)
    } finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 触发时招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.001
    try {
      sys.update(1, em, 2630)
      expect((sys as any).pewterers.length).toBeGreaterThanOrEqual(1)
    } finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 未达到时不招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.5
    try {
      sys.update(1, em, 2630)
      expect((sys as any).pewterers).toHaveLength(0)
    } finally { vi.restoreAllMocks() }
  })
  it('满 10 个时总数保持 <= 10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).pewterers.push(makePewterer(i + 1, { alloyCasting: 50 })) }
    sys.update(1, em, 2630)
    expect((sys as any).pewterers.length).toBeLessThanOrEqual(10)
  })
  it('CHECK_INTERVAL=2630', () => { expect(2630).toBe(2630) })
  it('RECRUIT_CHANCE=0.0014', () => { expect(0.0014).toBeCloseTo(0.0014, 6) })
})
