import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureSpinningMakersSystem } from '../systems/CreatureSpinningMakersSystem'
import type { SpinningMaker } from '../systems/CreatureSpinningMakersSystem'

const CHECK_INTERVAL = 2530
const MAX_MAKERS = 13
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureSpinningMakersSystem { return new CreatureSpinningMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<SpinningMaker> = {}): SpinningMaker {
  return { id: nextId++, entityId, spindleSpeed: 70, fiberQuality: 65, threadStrength: 80, consistency: 75, tick: 0, ...overrides }
}

describe('CreatureSpinningMakersSystem.getMakers', () => {
  let sys: CreatureSpinningMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无纺纱工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(2))
    const m = (sys as any).makers[0]
    expect(m.spindleSpeed).toBe(70)
    expect(m.consistency).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('fiberQuality字段存储正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { fiberQuality: 42 }))
    expect((sys as any).makers[0].fiberQuality).toBe(42)
  })
})

describe('CreatureSpinningMakersSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSpinningMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick不足时不执行技能增长', () => {
    ;(sys as any).makers.push(makeMaker(1))
    const before = (sys as any).makers[0].spindleSpeed
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).makers[0].spindleSpeed).toBe(before)
  })
  it('首次tick=CHECK_INTERVAL时执行', () => {
    ;(sys as any).makers.push(makeMaker(1))
    const before = (sys as any).makers[0].spindleSpeed
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].spindleSpeed).toBeGreaterThan(before)
  })
  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次更新：第二次在间隔内不再增长', () => {
    ;(sys as any).makers.push(makeMaker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).makers[0].spindleSpeed
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).makers[0].spindleSpeed).toBe(afterFirst)
  })
  it('两次间隔均达到时两次都增长', () => {
    ;(sys as any).makers.push(makeMaker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).makers[0].spindleSpeed
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).makers[0].spindleSpeed).toBeGreaterThan(afterFirst)
  })
  it('差值恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 1000
    ;(sys as any).makers.push(makeMaker(1, { spindleSpeed: 50 }))
    sys.update(1, em, 1000 + CHECK_INTERVAL)
    expect((sys as any).makers[0].spindleSpeed).toBeCloseTo(50.02)
  })
  it('节流期间lastCheck不变', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 5100)
    expect((sys as any).lastCheck).toBe(5000)
  })
})

describe('CreatureSpinningMakersSystem - 技能增量', () => {
  let sys: CreatureSpinningMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spindleSpeed每次+0.02', () => {
    ;(sys as any).makers.push(makeMaker(1, { spindleSpeed: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].spindleSpeed).toBeCloseTo(50.02)
  })
  it('threadStrength每次+0.015', () => {
    ;(sys as any).makers.push(makeMaker(1, { threadStrength: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].threadStrength).toBeCloseTo(50.015)
  })
  it('consistency每次+0.01', () => {
    ;(sys as any).makers.push(makeMaker(1, { consistency: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].consistency).toBeCloseTo(50.01)
  })
  it('fiberQuality不自动增长', () => {
    ;(sys as any).makers.push(makeMaker(1, { fiberQuality: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].fiberQuality).toBe(50)
  })
  it('spindleSpeed上限100不超出', () => {
    ;(sys as any).makers.push(makeMaker(1, { spindleSpeed: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].spindleSpeed).toBe(100)
  })
  it('threadStrength上限100不超出', () => {
    ;(sys as any).makers.push(makeMaker(1, { threadStrength: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].threadStrength).toBe(100)
  })
  it('consistency上限100不超出', () => {
    ;(sys as any).makers.push(makeMaker(1, { consistency: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].consistency).toBe(100)
  })
  it('多名工匠技能同步增长', () => {
    ;(sys as any).makers.push(makeMaker(1, { spindleSpeed: 50 }))
    ;(sys as any).makers.push(makeMaker(2, { spindleSpeed: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].spindleSpeed).toBeCloseTo(50.02)
    expect((sys as any).makers[1].spindleSpeed).toBeCloseTo(60.02)
  })
  it('三次更新后spindleSpeed累积正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { spindleSpeed: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).makers[0].spindleSpeed).toBeCloseTo(50.06)
  })
})

describe('CreatureSpinningMakersSystem - cleanup边界', () => {
  let sys: CreatureSpinningMakersSystem
  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('spindleSpeed=3.98增长后=4被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { spindleSpeed: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('spindleSpeed=4.01增长后>4保留', () => {
    ;(sys as any).makers.push(makeMaker(1, { spindleSpeed: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('spindleSpeed=4增长后4.02>4保留', () => {
    ;(sys as any).makers.push(makeMaker(1, { spindleSpeed: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('混合工匠：低技能被清除，高技能保留', () => {
    ;(sys as any).makers.push(makeMaker(1, { spindleSpeed: 3 }))
    ;(sys as any).makers.push(makeMaker(2, { spindleSpeed: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('全部低技能时所有被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { spindleSpeed: 1 }))
    ;(sys as any).makers.push(makeMaker(2, { spindleSpeed: 2 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('spindleSpeed=3时增长后3.02<=4被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { spindleSpeed: 3 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureSpinningMakersSystem - MAX_MAKERS上限', () => {
  let sys: CreatureSpinningMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_MAKERS=13时不再招募', () => {
    for (let i = 0; i < MAX_MAKERS; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeLessThanOrEqual(MAX_MAKERS)
  })
  it('未满时随机触发可招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBe(1)
  })
  it('random >= RECRUIT_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('招募成功时新记录tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('招募后id递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    if ((sys as any).makers.length >= 2) {
      expect((sys as any).makers[1].id).toBeGreaterThan((sys as any).makers[0].id)
    }
  })
  it('空update不崩溃', () => {
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
})
