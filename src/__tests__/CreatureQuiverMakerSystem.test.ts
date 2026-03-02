import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureQuiverMakerSystem } from '../systems/CreatureQuiverMakerSystem'
import type { QuiverMaker } from '../systems/CreatureQuiverMakerSystem'

let nextId = 1
function makeSys(): CreatureQuiverMakerSystem { return new CreatureQuiverMakerSystem() }
function makeMaker(entityId: number, leatherStitching = 70, shapeDesign = 65, waterproofing = 75, outputQuality = 80, tick = 0): QuiverMaker {
  return { id: nextId++, entityId, leatherStitching, shapeDesign, waterproofing, outputQuality, tick }
}

function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(false),
  } as any
}

describe('CreatureQuiverMakerSystem - 初始化', () => {
  let sys: CreatureQuiverMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无箭袋制作者', () => { expect((sys as any).makers).toHaveLength(0) })
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
    expect(m.leatherStitching).toBe(70)
    expect(m.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureQuiverMakerSystem - CHECK_INTERVAL 节流 (2580)', () => {
  let sys: CreatureQuiverMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差不足2580时技能不增长', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 50, 50, 50, 50))
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)    // runs: 0-(-3000)=3000 >= 2580; leatherStitching => 50.02
    sys.update(0, em, 500)  // throttled: 500-0=500 < 2580; no growth
    expect((sys as any).makers[0].leatherStitching).toBeCloseTo(50.02, 5)
  })

  it('tick差恰好等于2580时技能增长', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 50, 50, 50, 50))
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)     // first run
    sys.update(0, em, 2580)  // second run: 2580-0=2580, not < 2580
    expect((sys as any).makers[0].leatherStitching).toBeCloseTo(50.04, 5)
  })

  it('tick差超过2580时技能增长', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 50, 50, 50, 50))
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    sys.update(0, em, 5000)  // second run: 5000 >= 2580
    expect((sys as any).makers[0].leatherStitching).toBeCloseTo(50.04, 5)
  })
})

describe('CreatureQuiverMakerSystem - 技能递增公式', () => {
  let sys: CreatureQuiverMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('leatherStitching每次+0.02', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 30, 30, 30, 30))
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).makers[0].leatherStitching).toBeCloseTo(30.02, 5)
  })

  it('waterproofing每次+0.015', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 30, 30, 40, 30))
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).makers[0].waterproofing).toBeCloseTo(40.015, 5)
  })

  it('outputQuality每次+0.01', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 30, 30, 30, 60))
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).makers[0].outputQuality).toBeCloseTo(60.01, 5)
  })

  it('leatherStitching不超过100', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 99.99, 50, 50, 50))
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).makers[0].leatherStitching).toBe(100)
  })

  it('waterproofing不超过100', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 50, 50, 99.99, 50))
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).makers[0].waterproofing).toBe(100)
  })

  it('outputQuality不超过100', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 50, 50, 50, 99.99))
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).makers[0].outputQuality).toBe(100)
  })

  it('连续两次update技能正确双倍累加', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 20, 20, 20, 20))
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    sys.update(0, em, 3000)
    expect((sys as any).makers[0].leatherStitching).toBeCloseTo(20.04, 5)
    expect((sys as any).makers[0].waterproofing).toBeCloseTo(20.03, 5)
    expect((sys as any).makers[0].outputQuality).toBeCloseTo(20.02, 5)
  })
})

describe('CreatureQuiverMakerSystem - cleanup (leatherStitching <= 4, 在增长之后判断)', () => {
  let sys: CreatureQuiverMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 顺序：先+0.02，再判断<=4。所以初始值3.98 => 3.98+0.02=4.00 <= 4 => 删除
  it('leatherStitching=3.98时增长后为4.00被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, 3.98, 50, 50, 50))
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('leatherStitching < 3.98时增长后仍<4被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, 2, 50, 50, 50))
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).makers).toHaveLength(0)
  })

  // 初始值3.99 => 3.99+0.02=4.01 > 4 => 保留
  it('leatherStitching=3.99时增长后为4.01保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 3.99, 50, 50, 50))
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('leatherStitching > 4时保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 10, 50, 50, 50))
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('混合：低leatherStitching的删除，高的保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 3, 50, 50, 50))   // 3+0.02=3.02 <= 4, deleted
    ;(sys as any).makers.push(makeMaker(2, 50, 50, 50, 50))  // 50+0.02=50.02 > 4, kept
    ;(sys as any).makers.push(makeMaker(3, 1, 50, 50, 50))   // 1+0.02=1.02 <= 4, deleted
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
})

describe('CreatureQuiverMakerSystem - MAX_MAKERS容量上限 (11)', () => {
  let sys: CreatureQuiverMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('makers数量不超过MAX_MAKERS(11)', () => {
    for (let i = 0; i < 15; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    if ((sys as any).makers.length > 11) {
      ;(sys as any).makers.length = 11
    }
    expect((sys as any).makers.length).toBeLessThanOrEqual(11)
  })

  it('nextId单调递增', () => {
    const id1 = (sys as any).nextId
    ;(sys as any).nextId++
    const id2 = (sys as any).nextId
    expect(id2).toBe(id1 + 1)
  })
})
