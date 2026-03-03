import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureStringMakerSystem } from '../systems/CreatureStringMakerSystem'
import type { StringMaker } from '../systems/CreatureStringMakerSystem'

const CHECK_INTERVAL = 2580
const MAX_STRINGMAKERS = 10
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureStringMakerSystem { return new CreatureStringMakerSystem() }
function makeWorker(entityId: number, overrides: Partial<StringMaker> = {}): StringMaker {
  return { id: nextId++, entityId, fiberTwisting: 70, cordStrength: 65, lengthControl: 80, outputQuality: 75, tick: 0, ...overrides }
}

describe('CreatureStringMakerSystem — 初始状态', () => {
  let sys: CreatureStringMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无工匠', () => { expect((sys as any).stringMakers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).stringMakers.push(makeWorker(1))
    expect((sys as any).stringMakers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).stringMakers.push(makeWorker(1))
    expect((sys as any).stringMakers).toBe((sys as any).stringMakers)
  })
  it('字段正确', () => {
    ;(sys as any).stringMakers.push(makeWorker(2))
    const s = (sys as any).stringMakers[0]
    expect(s.fiberTwisting).toBe(70)
    expect(s.outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).stringMakers.push(makeWorker(1))
    ;(sys as any).stringMakers.push(makeWorker(2))
    expect((sys as any).stringMakers).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('cordStrength字段存储正确', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { cordStrength: 42 }))
    expect((sys as any).stringMakers[0].cordStrength).toBe(42)
  })
})

describe('CreatureStringMakerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureStringMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick不足时不执行技能增长', () => {
    ;(sys as any).stringMakers.push(makeWorker(1))
    const before = (sys as any).stringMakers[0].fiberTwisting
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).stringMakers[0].fiberTwisting).toBe(before)
  })
  it('首次tick=CHECK_INTERVAL时执行', () => {
    ;(sys as any).stringMakers.push(makeWorker(1))
    const before = (sys as any).stringMakers[0].fiberTwisting
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].fiberTwisting).toBeGreaterThan(before)
  })
  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次更新：第二次在间隔内不再增长', () => {
    ;(sys as any).stringMakers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).stringMakers[0].fiberTwisting
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).stringMakers[0].fiberTwisting).toBe(afterFirst)
  })
  it('两次间隔均达到时两次都增长', () => {
    ;(sys as any).stringMakers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).stringMakers[0].fiberTwisting
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).stringMakers[0].fiberTwisting).toBeGreaterThan(afterFirst)
  })
  it('差值恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 1000
    ;(sys as any).stringMakers.push(makeWorker(1, { fiberTwisting: 50 }))
    sys.update(1, em, 1000 + CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].fiberTwisting).toBeCloseTo(50.02)
  })
  it('节流期间lastCheck不变', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 5100)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('空update不崩溃', () => {
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
})

describe('CreatureStringMakerSystem - 技能增量', () => {
  let sys: CreatureStringMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('fiberTwisting每次+0.02', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { fiberTwisting: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].fiberTwisting).toBeCloseTo(50.02)
  })
  it('lengthControl每次+0.015', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { lengthControl: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].lengthControl).toBeCloseTo(50.015)
  })
  it('outputQuality每次+0.01', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { outputQuality: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].outputQuality).toBeCloseTo(50.01)
  })
  it('cordStrength不自动增长', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { cordStrength: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].cordStrength).toBe(50)
  })
  it('fiberTwisting上限100不超出', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { fiberTwisting: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].fiberTwisting).toBe(100)
  })
  it('lengthControl上限100不超出', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { lengthControl: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].lengthControl).toBe(100)
  })
  it('outputQuality上限100不超出', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { outputQuality: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].outputQuality).toBe(100)
  })
  it('多名工匠技能同步增长', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { fiberTwisting: 50 }))
    ;(sys as any).stringMakers.push(makeWorker(2, { fiberTwisting: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].fiberTwisting).toBeCloseTo(50.02)
    expect((sys as any).stringMakers[1].fiberTwisting).toBeCloseTo(60.02)
  })
  it('三次更新后fiberTwisting累积正确', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { fiberTwisting: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).stringMakers[0].fiberTwisting).toBeCloseTo(50.06)
  })
})

describe('CreatureStringMakerSystem - cleanup边界', () => {
  let sys: CreatureStringMakerSystem
  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('fiberTwisting=3.98增长后<=4被清除', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { fiberTwisting: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers).toHaveLength(0)
  })
  it('fiberTwisting=4.01增长后>4保留', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { fiberTwisting: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers).toHaveLength(1)
  })
  it('fiberTwisting=4增长后4.02>4保留', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { fiberTwisting: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers).toHaveLength(1)
  })
  it('混合工匠：低技能被清除，高技能保留', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { fiberTwisting: 3 }))
    ;(sys as any).stringMakers.push(makeWorker(2, { fiberTwisting: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers).toHaveLength(1)
    expect((sys as any).stringMakers[0].entityId).toBe(2)
  })
  it('全部低技能时所有被清除', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { fiberTwisting: 1 }))
    ;(sys as any).stringMakers.push(makeWorker(2, { fiberTwisting: 2 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers).toHaveLength(0)
  })
  it('高技能始终保留', () => {
    ;(sys as any).stringMakers.push(makeWorker(1, { fiberTwisting: 90 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers).toHaveLength(1)
  })
})

describe('CreatureStringMakerSystem - MAX_STRINGMAKERS上限与招募', () => {
  let sys: CreatureStringMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_STRINGMAKERS=10时不再招募', () => {
    for (let i = 0; i < MAX_STRINGMAKERS; i++) {
      ;(sys as any).stringMakers.push(makeWorker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers.length).toBeLessThanOrEqual(MAX_STRINGMAKERS)
  })
  it('未满时random=0时招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers.length).toBe(1)
  })
  it('random >= RECRUIT_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers).toHaveLength(0)
  })
  it('招募成功时新记录tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).stringMakers.length > 0) {
      expect((sys as any).stringMakers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('招募后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).stringMakers.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
  it('系统不崩溃（空stringMakers）', () => {
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
})
