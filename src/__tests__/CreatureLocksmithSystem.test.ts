import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLocksmithSystem } from '../systems/CreatureLocksmithSystem'
import type { Locksmith } from '../systems/CreatureLocksmithSystem'

// CHECK_INTERVAL=2600, MAX_LOCKSMITHS=10, RECRUIT_CHANCE=0.0014
// 技能递增：precisionWork+0.02, keyFitting+0.015, outputQuality+0.01 每次update
// cleanup: precisionWork<=4 时删除

let nextId = 1
function makeSys(): CreatureLocksmithSystem { return new CreatureLocksmithSystem() }
function makeLocksmith(entityId: number, overrides: Partial<Locksmith> = {}): Locksmith {
  return { id: nextId++, entityId, precisionWork: 70, mechanismDesign: 65, keyFitting: 80, outputQuality: 75, tick: 0, ...overrides }
}

const em = {} as any

describe('CreatureLocksmithSystem.getLocksmiths', () => {
  let sys: CreatureLocksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锁匠', () => { expect((sys as any).locksmiths).toHaveLength(0) })
  it('注入后可查询', () => {
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
})

describe('CreatureLocksmithSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureLocksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick<CHECK_INTERVAL时技能不增长', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 50 }))
    sys.update(1, em, 100)
    expect((sys as any).locksmiths[0].precisionWork).toBe(50)
  })

  it('tick>=CHECK_INTERVAL时技能增长', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 50 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths[0].precisionWork).toBeCloseTo(50.02)
  })

  it('lastCheck更新为当前tick', () => {
    sys.update(1, em, 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('lastCheck在节流期内不更新', () => {
    ;(sys as any).lastCheck = 2600
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('连续两次触发：需间隔>=CHECK_INTERVAL', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 50 }))
    sys.update(1, em, 2600)
    const after1 = (sys as any).locksmiths[0].precisionWork
    // 距第一次不足 2600，不更新
    sys.update(1, em, 3000)
    expect((sys as any).locksmiths[0].precisionWork).toBe(after1)
    // 距第一次恰好 2600，触发
    sys.update(1, em, 5200)
    expect((sys as any).locksmiths[0].precisionWork).toBeCloseTo(after1 + 0.02)
  })
})

describe('CreatureLocksmithSystem - 技能递增上限', () => {
  let sys: CreatureLocksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

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
})

describe('CreatureLocksmithSystem - cleanup（precisionWork<=4 删除）', () => {
  let sys: CreatureLocksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('precisionWork=3.98+0.02=4.00<=4 => 被删除', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 3.98 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths).toHaveLength(0)
  })

  it('precisionWork=4 精确边界（更新后4.02>4）=> 不删除', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 4 }))
    sys.update(1, em, 2600)
    // 源码先增长后cleanup：4+0.02=4.02>4 => 不删
    expect((sys as any).locksmiths).toHaveLength(1)
  })

  it('precisionWork=5（更新后5.02>4）=> 不删除', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 5 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths).toHaveLength(1)
  })

  it('混合：低precisionWork被删，高precisionWork保留', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 3.98 }))
    ;(sys as any).locksmiths.push(makeLocksmith(2, { precisionWork: 50 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths).toHaveLength(1)
    expect((sys as any).locksmiths[0].entityId).toBe(2)
  })

  it('多个低precisionWork锁匠全部删除', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1, { precisionWork: 3.98 }))
    ;(sys as any).locksmiths.push(makeLocksmith(2, { precisionWork: 2 }))
    ;(sys as any).locksmiths.push(makeLocksmith(3, { precisionWork: 1 }))
    sys.update(1, em, 2600)
    expect((sys as any).locksmiths).toHaveLength(0)
  })
})

describe('CreatureLocksmithSystem - MAX_LOCKSMITHS上限', () => {
  let sys: CreatureLocksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('达到 MAX_LOCKSMITHS=10 时不再招募', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).locksmiths.push(makeLocksmith(i + 1))
    }
    const origRandom = Math.random
    Math.random = () => 0
    try {
      sys.update(1, em, 2600)
      expect((sys as any).locksmiths.length).toBeLessThanOrEqual(10)
    } finally {
      Math.random = origRandom
    }
  })

  it('RECRUIT_CHANCE 触发时招募新锁匠', () => {
    const origRandom = Math.random
    Math.random = () => 0.001
    try {
      sys.update(1, em, 2600)
      expect((sys as any).locksmiths.length).toBeGreaterThanOrEqual(1)
    } finally {
      Math.random = origRandom
    }
  })

  it('RECRUIT_CHANCE 未达到时不招募', () => {
    const origRandom = Math.random
    Math.random = () => 0.5
    try {
      sys.update(1, em, 2600)
      expect((sys as any).locksmiths).toHaveLength(0)
    } finally {
      Math.random = origRandom
    }
  })
})
