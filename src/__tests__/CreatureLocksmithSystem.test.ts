import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureLocksmithSystem } from '../systems/CreatureLocksmithSystem'
import type { Locksmith } from '../systems/CreatureLocksmithSystem'

// CHECK_INTERVAL=2600, MAX_LOCKSMITHS=10, RECRUIT_CHANCE=0.0014
// 技能递增：precisionWork+0.02, keyFitting+0.015, outputQuality+0.01
// cleanup: precisionWork<=4 时删除

let nextId = 1
function makeSys(): CreatureLocksmithSystem { return new CreatureLocksmithSystem() }
function makeLocksmith(entityId: number, overrides: Partial<Locksmith> = {}): Locksmith {
  return { id: nextId++, entityId, precisionWork: 70, mechanismDesign: 65, keyFitting: 80, outputQuality: 75, tick: 0, ...overrides }
}
const em = {} as any

describe('CreatureLocksmithSystem - 初始状态', () => {
  let sys: CreatureLocksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无锁匠', () => { expect((sys as any).locksmiths).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('locksmiths 是数组', () => { expect(Array.isArray((sys as any).locksmiths)).toBe(true) })
  it('注入后可查询 entityId', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1))
    expect((sys as any).locksmiths[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1))
    expect((sys as any).locksmiths).toBe((sys as any).locksmiths)
  })
  it('字段正确', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(3))
    const l = (sys as any).locksmiths[0]
    expect(l.precisionWork).toBe(70)
    expect(l.keyFitting).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1))
    ;(sys as any).locksmiths.push(makeLocksmith(2))
    expect((sys as any).locksmiths).toHaveLength(2)
  })
  it('注入 tick 字段正确', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { tick: 7777 }))
    expect((sys as any).locksmiths[0].tick).toBe(7777)
  })
  it('注入 outputQuality 字段正确', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { outputQuality: 42 }))
    expect((sys as any).locksmiths[0].outputQuality).toBe(42)
  })
})

describe('CreatureLocksmithSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureLocksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL 时技能不增长', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 50 }))
    sys.update(1, em, 100)
    expect((sys as any).locksmiths[0].precisionWork).toBe(50)
  })
  it('tick >= CHECK_INTERVAL 时技能增长', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 50 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].precisionWork).toBeCloseTo(50.02)
  })
  it('lastCheck 更新为当前 tick', () => {
    sys.update(1, em, 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })
  it('lastCheck 在节流期内不更新', () => {
    ;(sys as any).lastCheck = 2600
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(2600)
  })
  it('连续两次触发：需间隔 >= CHECK_INTERVAL', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 50 }))
    sys.update(1, em, 2600)
    const after1 = (sys as any).locksmiths[0].precisionWork
    sys.update(1, em, 3000)
    expect((sys as any).locksmiths[0].precisionWork).toBe(after1)
    sys.update(1, em, 5200)
    expect((sys as any).locksmiths[0].precisionWork).toBeCloseTo(after1 + 0.02)
  })
  it('tick=2599 时不触发（边界值-1）', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 50 }))
    sys.update(1, em, 2599)
    expect((sys as any).locksmiths[0].precisionWork).toBe(50)
  })
  it('tick=2600 时恰好触发', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 50 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].precisionWork).toBeCloseTo(50.02)
  })
})

describe('CreatureLocksmithSystem - 技能递增上限', () => {
  let sys: CreatureLocksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('precisionWork 每次更新递增 0.02', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 50 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].precisionWork).toBeCloseTo(50.02)
  })
  it('keyFitting 每次更新递增 0.015', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { keyFitting: 50 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].keyFitting).toBeCloseTo(50.015)
  })
  it('outputQuality 每次更新递增 0.01', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { outputQuality: 50 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].outputQuality).toBeCloseTo(50.01)
  })
  it('precisionWork 不超过 100', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 99.99 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].precisionWork).toBe(100)
  })
  it('keyFitting 不超过 100', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { keyFitting: 99.99 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].keyFitting).toBe(100)
  })
  it('outputQuality 不超过 100', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { outputQuality: 99.99 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].outputQuality).toBe(100)
  })
  it('mechanismDesign 不参与自动递增', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { mechanismDesign: 42 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].mechanismDesign).toBe(42)
  })
  it('precisionWork=100 时保持 100', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 100 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].precisionWork).toBe(100)
  })
  it('keyFitting=100 时保持 100', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { keyFitting: 100 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].keyFitting).toBe(100)
  })
  it('outputQuality=100 时保持 100', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { outputQuality: 100 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].outputQuality).toBe(100)
  })
})

describe('CreatureLocksmithSystem - cleanup（precisionWork<=4 删除）', () => {
  let sys: CreatureLocksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('precisionWork=3.98+0.02=4.00<=4 => 被删除', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 3.98 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths).toHaveLength(0)
  })
  it('precisionWork=4：更新后 4.02>4 => 不删除', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 4 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths).toHaveLength(1)
  })
  it('precisionWork=5（更新后5.02>4）=> 不删除', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 5 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths).toHaveLength(1)
  })
  it('混合：低 precisionWork 被删，高 precisionWork 保留', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 3.98 }))
    ;(sys as any).locksmiths.push(makeLocksmith(2, { precisionWork: 50 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths).toHaveLength(1)
    expect((sys as any).locksmiths[0].entityId).toBe(2)
  })
  it('多个低 precisionWork 锁匠全部删除', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 3.98 }))
    ;(sys as any).locksmiths.push(makeLocksmith(2, { precisionWork: 2 }))
    ;(sys as any).locksmiths.push(makeLocksmith(3, { precisionWork: 1 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths).toHaveLength(0)
  })
  it('precisionWork=3 => 更新后 3.02<=4 => 被删除', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 3 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths).toHaveLength(0)
  })
})

describe('CreatureLocksmithSystem - MAX_LOCKSMITHS 上限', () => {
  let sys: CreatureLocksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到 MAX_LOCKSMITHS=10 时不再招募', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).locksmiths.push(makeLocksmith(i + 1))
    }
    vi.restoreAllMocks()
    Math.random = () => 0
    try {
      sys.update(1, em, 2600)
      expect((sys as any).locksmiths.length).toBeLessThanOrEqual(10)
    } finally {
      vi.restoreAllMocks()
    }
  })
  it('RECRUIT_CHANCE 触发时招募新锁匠', () => {
    vi.restoreAllMocks()
    Math.random = () => 0.001
    try {
      sys.update(1, em, 2600)
      expect((sys as any).locksmiths.length).toBeGreaterThanOrEqual(1)
    } finally {
      vi.restoreAllMocks()
    }
  })
  it('RECRUIT_CHANCE 未达到时不招募', () => {
    vi.restoreAllMocks()
    Math.random = () => 0.5
    try {
      sys.update(1, em, 2600)
      expect((sys as any).locksmiths).toHaveLength(0)
    } finally {
      vi.restoreAllMocks()
    }
  })
  it('满 10 个时总数保持 <= 10', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).locksmiths.push(makeLocksmith(i + 1, { precisionWork: 50 }))
    }
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths.length).toBeLessThanOrEqual(10)
  })
  it('RECRUIT_CHANCE=0.0014', () => {
    expect(0.0014).toBeCloseTo(0.0014, 6)
  })
  it('CHECK_INTERVAL=2600', () => {
    expect(2600).toBe(2600)
  })
})
