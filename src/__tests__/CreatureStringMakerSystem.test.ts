import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureStringMakerSystem } from '../systems/CreatureStringMakerSystem'
import type { StringMaker } from '../systems/CreatureStringMakerSystem'

// Constants mirrored from source
const CHECK_INTERVAL = 2580
const MAX_STRINGMAKERS = 10

let nextId = 1
function makeSys(): CreatureStringMakerSystem { return new CreatureStringMakerSystem() }
function makeMaker(entityId: number, overrides: Partial<StringMaker> = {}): StringMaker {
  return {
    id: nextId++,
    entityId,
    fiberTwisting: 70,
    cordStrength: 65,
    lengthControl: 80,
    outputQuality: 75,
    tick: 0,
    ...overrides,
  }
}
function makeEM() { return { getEntitiesWithComponent: () => [] } as any }

describe('CreatureStringMakerSystem — 基础数据结构', () => {
  let sys: CreatureStringMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无弦线工', () => { expect((sys as any).stringMakers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).stringMakers.push(makeMaker(1))
    expect((sys as any).stringMakers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).stringMakers.push(makeMaker(1))
    expect((sys as any).stringMakers).toBe((sys as any).stringMakers)
  })
  it('字段正确', () => {
    ;(sys as any).stringMakers.push(makeMaker(2))
    const m = (sys as any).stringMakers[0]
    expect(m.fiberTwisting).toBe(70)
    expect(m.outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).stringMakers.push(makeMaker(1))
    ;(sys as any).stringMakers.push(makeMaker(2))
    expect((sys as any).stringMakers).toHaveLength(2)
  })
})

describe('CreatureStringMakerSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureStringMakerSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('tick=0 时不触发任何更新', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 50 }))
    sys.update(1, em, 0)
    expect((sys as any).stringMakers[0].fiberTwisting).toBe(50)
  })

  it('tick < CHECK_INTERVAL 时跳过逻辑', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 50 }))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).stringMakers[0].fiberTwisting).toBe(50)
  })

  it('tick == CHECK_INTERVAL 时触发技能递增', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].fiberTwisting).toBeCloseTo(50.02)
  })

  it('tick > CHECK_INTERVAL 时触发技能递增', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 50 }))
    sys.update(1, em, CHECK_INTERVAL + 100)
    expect((sys as any).stringMakers[0].fiberTwisting).toBeCloseTo(50.02)
  })

  it('连续两次调用：第二次因 lastCheck 节流而跳过', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 50 }))
    sys.update(1, em, CHECK_INTERVAL)       // 触发，lastCheck=CHECK_INTERVAL
    sys.update(1, em, CHECK_INTERVAL + 1)   // 差值=1 < CHECK_INTERVAL，跳过
    expect((sys as any).stringMakers[0].fiberTwisting).toBeCloseTo(50.02)
  })

  it('第二个完整周期再次触发', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).stringMakers[0].fiberTwisting).toBeCloseTo(50.04)
  })
})

describe('CreatureStringMakerSystem — 技能递增上限', () => {
  let sys: CreatureStringMakerSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('fiberTwisting 每次 +0.02', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].fiberTwisting).toBeCloseTo(50.02)
  })

  it('lengthControl 每次 +0.015', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { lengthControl: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].lengthControl).toBeCloseTo(50.015)
  })

  it('outputQuality 每次 +0.01', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { outputQuality: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].outputQuality).toBeCloseTo(50.01)
  })

  it('fiberTwisting 不超过 100', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].fiberTwisting).toBe(100)
  })

  it('lengthControl 不超过 100', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { lengthControl: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].lengthControl).toBe(100)
  })

  it('outputQuality 不超过 100', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { outputQuality: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers[0].outputQuality).toBe(100)
  })
})

describe('CreatureStringMakerSystem — cleanup 边界', () => {
  let sys: CreatureStringMakerSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('fiberTwisting > 4 时保留', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 5 + 0.02 = 5.02 > 4，保留
    expect((sys as any).stringMakers).toHaveLength(1)
  })

  it('先递增再 cleanup：3.98 + 0.02 = 4.00 恰好 <= 4，应移除', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 3.98 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00，条件 <= 4 为真，移除
    expect((sys as any).stringMakers).toHaveLength(0)
  })

  it('fiberTwisting <= 4 且递增后仍 <= 4 时验证清除', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 70 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)  // 70 -> 70.02
    ;(sys as any).stringMakers[0].fiberTwisting = 3
    sys.update(1, em, CHECK_INTERVAL * 2)  // 3 + 0.02 = 3.02 <= 4，移除
    expect((sys as any).stringMakers).toHaveLength(0)
  })

  it('混合：一个保留一个移除', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 50 }))
    ;(sys as any).stringMakers.push(makeMaker(2, { fiberTwisting: 3.98 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers).toHaveLength(1)
    expect((sys as any).stringMakers[0].entityId).toBe(1)
  })

  it('多个均低于阈值时全部移除', () => {
    ;(sys as any).stringMakers.push(makeMaker(1, { fiberTwisting: 3.98 }))
    ;(sys as any).stringMakers.push(makeMaker(2, { fiberTwisting: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stringMakers).toHaveLength(0)
  })
})

describe('CreatureStringMakerSystem — MAX_STRINGMAKERS 上限', () => {
  let sys: CreatureStringMakerSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('达到 MAX_STRINGMAKERS 时不再招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 < 0.0015，触发招募
    for (let i = 0; i < MAX_STRINGMAKERS; i++) {
      ;(sys as any).stringMakers.push(makeMaker(i + 1))
    }
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).stringMakers).toHaveLength(MAX_STRINGMAKERS)
  })
})
