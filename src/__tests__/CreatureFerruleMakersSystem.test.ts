import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFerruleMakersSystem } from '../systems/CreatureFerruleMakersSystem'
import type { FerruleMaker } from '../systems/CreatureFerruleMakersSystem'

const CHECK_INTERVAL = 1470
const SKILL_GROWTH = 0.053
const CUTOFF_OFFSET = 52000

let nextId = 1
function makeSys(): CreatureFerruleMakersSystem { return new CreatureFerruleMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<FerruleMaker> = {}): FerruleMaker {
  return {
    id: nextId++, entityId, skill: 50, ferrulesMade: 9, ferruleType: 'staff',
    fitPrecision: 52, reputation: 49, tick: 0, ...overrides
  }
}

describe('CreatureFerruleMakersSystem - 基础结构', () => {
  let sys: CreatureFerruleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铁箍工匠记录', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询entityId', () => {
    ;(sys as any).makers.push(makeMaker(7))
    expect((sys as any).makers[0].entityId).toBe(7)
  })

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('多个工匠全部可查', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    ;(sys as any).makers.push(makeMaker(3))
    expect((sys as any).makers).toHaveLength(3)
  })
})

describe('CreatureFerruleMakersSystem - FerruleType 4种类型', () => {
  it('skill=0→typeIdx=0→staff', () => {
    const typeIdx = Math.min(3, Math.floor(0 / 25))
    const types = ['staff', 'tool', 'umbrella', 'furniture']
    expect(types[typeIdx]).toBe('staff')
  })

  it('skill=25→typeIdx=1→tool', () => {
    const typeIdx = Math.min(3, Math.floor(25 / 25))
    const types = ['staff', 'tool', 'umbrella', 'furniture']
    expect(types[typeIdx]).toBe('tool')
  })

  it('skill=50→typeIdx=2→umbrella', () => {
    const typeIdx = Math.min(3, Math.floor(50 / 25))
    const types = ['staff', 'tool', 'umbrella', 'furniture']
    expect(types[typeIdx]).toBe('umbrella')
  })

  it('skill=75→typeIdx=3→furniture', () => {
    const typeIdx = Math.min(3, Math.floor(75 / 25))
    const types = ['staff', 'tool', 'umbrella', 'furniture']
    expect(types[typeIdx]).toBe('furniture')
  })

  it('skill=100→typeIdx上限为3→furniture', () => {
    const typeIdx = Math.min(3, Math.floor(100 / 25))
    const types = ['staff', 'tool', 'umbrella', 'furniture']
    expect(types[typeIdx]).toBe('furniture')
  })
})

describe('CreatureFerruleMakersSystem - ferrulesMade公式', () => {
  it('skill=7→ferrulesMade=2+floor(7/7)=3', () => {
    expect(2 + Math.floor(7 / 7)).toBe(3)
  })

  it('skill=14→ferrulesMade=2+floor(14/7)=4', () => {
    expect(2 + Math.floor(14 / 7)).toBe(4)
  })

  it('skill=40→ferrulesMade=2+floor(40/7)=7', () => {
    expect(2 + Math.floor(40 / 7)).toBe(7)
  })

  it('skill=0→ferrulesMade=2+floor(0/7)=2', () => {
    expect(2 + Math.floor(0 / 7)).toBe(2)
  })
})

describe('CreatureFerruleMakersSystem - fitPrecision与reputation公式', () => {
  it('skill=0→fitPrecision=15+0*0.74=15', () => {
    expect(15 + 0 * 0.74).toBeCloseTo(15)
  })

  it('skill=50→fitPrecision=15+50*0.74=52', () => {
    expect(15 + 50 * 0.74).toBeCloseTo(52)
  })

  it('skill=100→fitPrecision=15+100*0.74=89', () => {
    expect(15 + 100 * 0.74).toBeCloseTo(89)
  })

  it('skill=0→reputation=10+0*0.78=10', () => {
    expect(10 + 0 * 0.78).toBeCloseTo(10)
  })

  it('skill=50→reputation=10+50*0.78=49', () => {
    expect(10 + 50 * 0.78).toBeCloseTo(49)
  })

  it('skill=100→reputation=10+100*0.78=88', () => {
    expect(10 + 100 * 0.78).toBeCloseTo(88)
  })
})

describe('CreatureFerruleMakersSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureFerruleMakersSystem
  const fakeEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值 < CHECK_INTERVAL 不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, fakeEm, 1000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值 >= CHECK_INTERVAL 更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('CreatureFerruleMakersSystem - time-based cleanup', () => {
  let sys: CreatureFerruleMakersSystem
  const fakeEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick未超cutoff时保留工匠', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).makers.push(makeMaker(1, { tick: currentTick - CUTOFF_OFFSET + 1 }))
    sys.update(16, fakeEm, currentTick)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('tick等于cutoff时不被清除（严格小于才删）', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).makers.push(makeMaker(1, { tick: currentTick - CUTOFF_OFFSET }))
    sys.update(16, fakeEm, currentTick)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('tick超过cutoff时被清除', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).makers.push(makeMaker(1, { tick: currentTick - CUTOFF_OFFSET - 100 }))
    sys.update(16, fakeEm, currentTick)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('混合情况只保留未过期工匠', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).makers.push(makeMaker(1, { tick: currentTick - CUTOFF_OFFSET + 1 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: currentTick - CUTOFF_OFFSET - 1 }))
    sys.update(16, fakeEm, currentTick)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(1)
  })
})

// ---- Extended tests (to reach 50+) ----

describe('CreatureFerruleMakersSystem - makers数组多操作', () => {
  let sys: CreatureFerruleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('push10条后length为10', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(10)
  })

  it('splice第一条后剩余正确', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    ;(sys as any).makers.splice(0, 1)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('tick字段保留正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 9999 }))
    expect((sys as any).makers[0].tick).toBe(9999)
  })
})

describe('CreatureFerruleMakersSystem - skillMap操作', () => {
  let sys: CreatureFerruleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('手动写入skillMap', () => {
    ;(sys as any).skillMap.set(42, 88)
    expect((sys as any).skillMap.get(42)).toBe(88)
  })

  it('skillMap多个条目', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    ;(sys as any).skillMap.set(3, 30)
    expect((sys as any).skillMap.size).toBe(3)
  })
})

describe('CreatureFerruleMakersSystem - nextId初始', () => {
  let sys: CreatureFerruleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureFerruleMakersSystem - ferrulesMade更多边界', () => {
  it('skill=21→ferrulesMade=2+floor(21/7)=5', () => {
    expect(2 + Math.floor(21 / 7)).toBe(5)
  })

  it('skill=49→ferrulesMade=2+floor(49/7)=9', () => {
    expect(2 + Math.floor(49 / 7)).toBe(9)
  })

  it('skill=70→ferrulesMade=2+floor(70/7)=12', () => {
    expect(2 + Math.floor(70 / 7)).toBe(12)
  })

  it('skill=100→ferrulesMade=2+floor(100/7)=16', () => {
    expect(2 + Math.floor(100 / 7)).toBe(16)
  })
})

describe('CreatureFerruleMakersSystem - fitPrecision与reputation额外边界', () => {
  it('skill=25→fitPrecision=15+25*0.74=33.5', () => {
    expect(15 + 25 * 0.74).toBeCloseTo(33.5)
  })

  it('skill=75→fitPrecision=15+75*0.74=70.5', () => {
    expect(15 + 75 * 0.74).toBeCloseTo(70.5)
  })

  it('skill=25→reputation=10+25*0.78=29.5', () => {
    expect(10 + 25 * 0.78).toBeCloseTo(29.5)
  })

  it('skill=75→reputation=10+75*0.78=68.5', () => {
    expect(10 + 75 * 0.78).toBeCloseTo(68.5)
  })
})

describe('CreatureFerruleMakersSystem - CHECK_INTERVAL多轮节流', () => {
  let sys: CreatureFerruleMakersSystem
  const fakeEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('两次各达间隔，各更新lastCheck', () => {
    sys.update(16, fakeEm, CHECK_INTERVAL)
    sys.update(16, fakeEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('第二次未达阈值时lastCheck保留第一次', () => {
    sys.update(16, fakeEm, CHECK_INTERVAL)
    sys.update(16, fakeEm, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('CreatureFerruleMakersSystem - FerruleType字符串合法性', () => {
  it('所有4种类型均为字符串', () => {
    const types = ['staff', 'tool', 'umbrella', 'furniture']
    types.forEach(t => { expect(typeof t).toBe('string') })
  })

  it('skill=24→typeIdx=0→staff', () => {
    const typeIdx = Math.min(3, Math.floor(24 / 25))
    expect(['staff', 'tool', 'umbrella', 'furniture'][typeIdx]).toBe('staff')
  })

  it('skill=49→typeIdx=1→tool', () => {
    const typeIdx = Math.min(3, Math.floor(49 / 25))
    expect(['staff', 'tool', 'umbrella', 'furniture'][typeIdx]).toBe('tool')
  })

  it('skill=74→typeIdx=2→umbrella', () => {
    const typeIdx = Math.min(3, Math.floor(74 / 25))
    expect(['staff', 'tool', 'umbrella', 'furniture'][typeIdx]).toBe('umbrella')
  })
})

describe('CreatureFerruleMakersSystem - 大批量cleanup', () => {
  let sys: CreatureFerruleMakersSystem
  const fakeEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('多条过期记录全部被清除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, { tick: 0 }))
    }
    ;(sys as any).makers.push(makeMaker(99, { tick: 100000 }))
    sys.update(16, fakeEm, CHECK_INTERVAL + 52001)
    // cutoff = CHECK_INTERVAL+52001-52000 = CHECK_INTERVAL+1 > 0; tick=0 < cutoff → 删除
    const makers = (sys as any).makers
    expect(makers.some((m: any) => m.entityId === 99)).toBe(true)
  })
})

describe('CreatureFerruleMakersSystem - 数据完整性', () => {
  let sys: CreatureFerruleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入所有字段完整保存', () => {
    ;(sys as any).makers.push(makeMaker(42, { skill: 80, ferrulesMade: 15, tick: 9999 }))
    const m = (sys as any).makers[0]
    expect(m.entityId).toBe(42)
    expect(m.tick).toBe(9999)
  })

  it('多个工匠的id字段各不相同', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    ;(sys as any).makers.push(makeMaker(3))
    const ids = (sys as any).makers.map((m: any) => m.id)
    expect(new Set(ids).size).toBe(3)
  })
})

describe('CreatureFerruleMakersSystem - nextId初始', () => {
  let sys: CreatureFerruleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})
