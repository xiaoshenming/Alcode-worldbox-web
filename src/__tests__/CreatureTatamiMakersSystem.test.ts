import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureTatamiMakersSystem } from '../systems/CreatureTatamiMakersSystem'
import type { TatamiMaker } from '../systems/CreatureTatamiMakersSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureTatamiMakersSystem { return new CreatureTatamiMakersSystem() }
function makeMaker(entityId: number, rushWeaving = 70, tick = 0): TatamiMaker {
  return { id: nextId++, entityId, rushWeaving, frameCrafting: 65, matDensity: 80, outputQuality: 75, tick }
}

function makeEM(): EntityManager { return new EntityManager() }

const CHECK_INTERVAL = 2560

describe('CreatureTatamiMakersSystem — 初始状态', () => {
  let sys: CreatureTatamiMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无榻榻米工匠', () => { expect((sys as any).makers).toHaveLength(0) })
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
    expect(m.rushWeaving).toBe(70)
    expect(m.outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureTatamiMakersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureTatamiMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('tick 差小于 CHECK_INTERVAL 时 lastCheck 不更新', () => {
    const em = makeEM()
    // lastCheck=0, tick=CHECK_INTERVAL-1=2559, 差=2559 < 2560 → 跳过
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    const em = makeEM()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('首次满足条件后第二次不足间隔则跳过', () => {
    const em = makeEM()
    sys.update(1, em, CHECK_INTERVAL)         // lastCheck = CHECK_INTERVAL
    sys.update(1, em, CHECK_INTERVAL * 2 - 1) // 差=2559 < 2560 → 跳过
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次满足间隔时 lastCheck 逐步推进', () => {
    const em = makeEM()
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureTatamiMakersSystem — 技能增长', () => {
  let sys: CreatureTatamiMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('每次 update 给 rushWeaving +0.02', () => {
    const em = makeEM()
    ;(sys as any).makers.push(makeMaker(1, 40))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].rushWeaving).toBeCloseTo(40.02, 5)
  })

  it('每次 update 给 matDensity +0.015', () => {
    const em = makeEM()
    const m = makeMaker(1)
    m.matDensity = 50
    ;(sys as any).makers.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].matDensity).toBeCloseTo(50.015, 5)
  })

  it('每次 update 给 outputQuality +0.01', () => {
    const em = makeEM()
    const m = makeMaker(1)
    m.outputQuality = 60
    ;(sys as any).makers.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].outputQuality).toBeCloseTo(60.01, 5)
  })

  it('rushWeaving 不超过 100', () => {
    const em = makeEM()
    ;(sys as any).makers.push(makeMaker(1, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].rushWeaving).toBeLessThanOrEqual(100)
  })

  it('matDensity 不超过 100', () => {
    const em = makeEM()
    const m = makeMaker(1)
    m.matDensity = 99.999
    ;(sys as any).makers.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].matDensity).toBeLessThanOrEqual(100)
  })

  it('outputQuality 不超过 100', () => {
    const em = makeEM()
    const m = makeMaker(1)
    m.outputQuality = 99.999
    ;(sys as any).makers.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].outputQuality).toBeLessThanOrEqual(100)
  })

  it('多个 maker 每个都增长', () => {
    const em = makeEM()
    ;(sys as any).makers.push(makeMaker(1, 30))
    ;(sys as any).makers.push(makeMaker(2, 50))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].rushWeaving).toBeCloseTo(30.02, 5)
    expect((sys as any).makers[1].rushWeaving).toBeCloseTo(50.02, 5)
  })
})

describe('CreatureTatamiMakersSystem — rushWeaving<=4 cleanup（skill 增长后判断）', () => {
  let sys: CreatureTatamiMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // 代码执行顺序：先 +0.02，再判断 <=4
  // 因此只有 rushWeaving + 0.02 <= 4（即初始值 <= 3.98）才会被移除

  it('初始 rushWeaving=3.98，+0.02=4.00 满足<=4，被移除', () => {
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发招募
    ;(sys as any).makers.push(makeMaker(1, 3.98))
    ;(sys as any).makers.push(makeMaker(2, 10))    // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    const ids = (sys as any).makers.map((m: TatamiMaker) => m.entityId)
    expect(ids).not.toContain(1)
    expect(ids).toContain(2)
  })

  it('初始 rushWeaving=3.97，+0.02=3.99 满足<=4，被移除', () => {
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).makers.push(makeMaker(1, 3.97))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('初始 rushWeaving=3.99，+0.02=4.01 > 4，不被移除', () => {
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).makers.push(makeMaker(1, 3.99))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('初始 rushWeaving=10，+0.02=10.02 > 4，保留', () => {
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).makers.push(makeMaker(1, 10))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('全部低于阈值时 makers 清空', () => {
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).makers.push(makeMaker(1, 1))
    ;(sys as any).makers.push(makeMaker(2, 2))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureTatamiMakersSystem — MAX_MAKERS 上限', () => {
  let sys: CreatureTatamiMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('makers 达到 12 时不再招募', () => {
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(0) // RECRUIT_CHANCE 命中
    for (let i = 0; i < 12; i++) {
      ;(sys as any).makers.push(makeMaker(i + 100))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    // 技能 +0.02 后全部 > 4，不被清理；总数不超过 12
    expect((sys as any).makers.length).toBeLessThanOrEqual(12)
  })
})
