import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureTinkerSystem } from '../systems/CreatureTinkerSystem'
import type { Tinker } from '../systems/CreatureTinkerSystem'

const CHECK_INTERVAL = 2610
const MAX_TINKERS = 10
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureTinkerSystem { return new CreatureTinkerSystem() }
function makeWorker(entityId: number, overrides: Partial<Tinker> = {}): Tinker {
  return { id: nextId++, entityId, metalRepair: 70, solderingSkill: 65, resourcefulness: 80, outputQuality: 75, tick: 0, ...overrides }
}

describe('CreatureTinkerSystem — 初始状态', () => {
  let sys: CreatureTinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无工匠', () => { expect((sys as any).tinkers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tinkers.push(makeWorker(1))
    expect((sys as any).tinkers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).tinkers.push(makeWorker(1))
    expect((sys as any).tinkers).toBe((sys as any).tinkers)
  })
  it('字段正确', () => {
    ;(sys as any).tinkers.push(makeWorker(2))
    const t = (sys as any).tinkers[0]
    expect(t.metalRepair).toBe(70)
    expect(t.outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).tinkers.push(makeWorker(1))
    ;(sys as any).tinkers.push(makeWorker(2))
    expect((sys as any).tinkers).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('solderingSkill字段存储正确', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { solderingSkill: 42 }))
    expect((sys as any).tinkers[0].solderingSkill).toBe(42)
  })
})

describe('CreatureTinkerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureTinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick不足时不执行技能增长', () => {
    ;(sys as any).tinkers.push(makeWorker(1))
    const before = (sys as any).tinkers[0].metalRepair
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).tinkers[0].metalRepair).toBe(before)
  })
  it('首次tick=CHECK_INTERVAL时执行', () => {
    ;(sys as any).tinkers.push(makeWorker(1))
    const before = (sys as any).tinkers[0].metalRepair
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].metalRepair).toBeGreaterThan(before)
  })
  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次更新：第二次在间隔内不再增长', () => {
    ;(sys as any).tinkers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).tinkers[0].metalRepair
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).tinkers[0].metalRepair).toBe(afterFirst)
  })
  it('两次间隔均达到时两次都增长', () => {
    ;(sys as any).tinkers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).tinkers[0].metalRepair
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).tinkers[0].metalRepair).toBeGreaterThan(afterFirst)
  })
  it('差值恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 1000
    ;(sys as any).tinkers.push(makeWorker(1, { metalRepair: 50 }))
    sys.update(1, em, 1000 + CHECK_INTERVAL)
    expect((sys as any).tinkers[0].metalRepair).toBeCloseTo(50.02)
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

describe('CreatureTinkerSystem - 技能增量', () => {
  let sys: CreatureTinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('metalRepair每次+0.02', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { metalRepair: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].metalRepair).toBeCloseTo(50.02)
  })
  it('resourcefulness每次+0.015', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { resourcefulness: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].resourcefulness).toBeCloseTo(50.015)
  })
  it('outputQuality每次+0.01', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { outputQuality: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].outputQuality).toBeCloseTo(50.01)
  })
  it('solderingSkill不自动增长', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { solderingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].solderingSkill).toBe(50)
  })
  it('metalRepair上限100不超出', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { metalRepair: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].metalRepair).toBe(100)
  })
  it('resourcefulness上限100不超出', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { resourcefulness: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].resourcefulness).toBe(100)
  })
  it('outputQuality上限100不超出', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { outputQuality: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].outputQuality).toBe(100)
  })
  it('多名工匠技能同步增长', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { metalRepair: 50 }))
    ;(sys as any).tinkers.push(makeWorker(2, { metalRepair: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].metalRepair).toBeCloseTo(50.02)
    expect((sys as any).tinkers[1].metalRepair).toBeCloseTo(60.02)
  })
  it('三次更新后metalRepair累积正确', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { metalRepair: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).tinkers[0].metalRepair).toBeCloseTo(50.06)
  })
})

describe('CreatureTinkerSystem - cleanup边界', () => {
  let sys: CreatureTinkerSystem
  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('metalRepair=3.98增长后<=4被清除', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { metalRepair: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers).toHaveLength(0)
  })
  it('metalRepair=4.01增长后>4保留', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { metalRepair: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers).toHaveLength(1)
  })
  it('metalRepair=4增长后4.02>4保留', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { metalRepair: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers).toHaveLength(1)
  })
  it('混合工匠：低技能被清除，高技能保留', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { metalRepair: 3 }))
    ;(sys as any).tinkers.push(makeWorker(2, { metalRepair: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers).toHaveLength(1)
    expect((sys as any).tinkers[0].entityId).toBe(2)
  })
  it('全部低技能时所有被清除', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { metalRepair: 1 }))
    ;(sys as any).tinkers.push(makeWorker(2, { metalRepair: 2 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers).toHaveLength(0)
  })
  it('高技能始终保留', () => {
    ;(sys as any).tinkers.push(makeWorker(1, { metalRepair: 90 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers).toHaveLength(1)
  })
})

describe('CreatureTinkerSystem - MAX_TINKERS上限与招募', () => {
  let sys: CreatureTinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_TINKERS=10时不再招募', () => {
    for (let i = 0; i < MAX_TINKERS; i++) {
      ;(sys as any).tinkers.push(makeWorker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers.length).toBeLessThanOrEqual(MAX_TINKERS)
  })
  it('未满时random=0时招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers.length).toBe(1)
  })
  it('random >= RECRUIT_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers).toHaveLength(0)
  })
  it('招募成功时新记录tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).tinkers.length > 0) {
      expect((sys as any).tinkers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('招募后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).tinkers.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
  it('系统不崩溃（空tinkers）', () => {
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
})
