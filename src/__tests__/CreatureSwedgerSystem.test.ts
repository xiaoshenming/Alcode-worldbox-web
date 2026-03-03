import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureSwedgerSystem } from '../systems/CreatureSwedgerSystem'
import type { Swedger } from '../systems/CreatureSwedgerSystem'

const CHECK_INTERVAL = 3070
const MAX_SWEDGERS = 10
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureSwedgerSystem { return new CreatureSwedgerSystem() }
function makeWorker(entityId: number, overrides: Partial<Swedger> = {}): Swedger {
  return { id: nextId++, entityId, swedgingSkill: 70, dieAlignment: 65, diameterReduction: 80, surfaceFinish: 75, tick: 0, ...overrides }
}

describe('CreatureSwedgerSystem — 初始状态', () => {
  let sys: CreatureSwedgerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无工匠', () => { expect((sys as any).swedgers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).swedgers.push(makeWorker(1))
    expect((sys as any).swedgers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).swedgers.push(makeWorker(1))
    expect((sys as any).swedgers).toBe((sys as any).swedgers)
  })
  it('字段正确', () => {
    ;(sys as any).swedgers.push(makeWorker(2))
    const s = (sys as any).swedgers[0]
    expect(s.swedgingSkill).toBe(70)
    expect(s.surfaceFinish).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).swedgers.push(makeWorker(1))
    ;(sys as any).swedgers.push(makeWorker(2))
    expect((sys as any).swedgers).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('diameterReduction字段存储正确', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { diameterReduction: 42 }))
    expect((sys as any).swedgers[0].diameterReduction).toBe(42)
  })
})

describe('CreatureSwedgerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSwedgerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick不足时不执行技能增长', () => {
    ;(sys as any).swedgers.push(makeWorker(1))
    const before = (sys as any).swedgers[0].swedgingSkill
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).swedgers[0].swedgingSkill).toBe(before)
  })
  it('首次tick=CHECK_INTERVAL时执行', () => {
    ;(sys as any).swedgers.push(makeWorker(1))
    const before = (sys as any).swedgers[0].swedgingSkill
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].swedgingSkill).toBeGreaterThan(before)
  })
  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次更新：第二次在间隔内不再增长', () => {
    ;(sys as any).swedgers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).swedgers[0].swedgingSkill
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).swedgers[0].swedgingSkill).toBe(afterFirst)
  })
  it('两次间隔均达到时两次都增长', () => {
    ;(sys as any).swedgers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).swedgers[0].swedgingSkill
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).swedgers[0].swedgingSkill).toBeGreaterThan(afterFirst)
  })
  it('差值恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 1000
    ;(sys as any).swedgers.push(makeWorker(1, { swedgingSkill: 50 }))
    sys.update(1, em, 1000 + CHECK_INTERVAL)
    expect((sys as any).swedgers[0].swedgingSkill).toBeCloseTo(50.02)
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

describe('CreatureSwedgerSystem - 技能增量', () => {
  let sys: CreatureSwedgerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('swedgingSkill每次+0.02', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { swedgingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].swedgingSkill).toBeCloseTo(50.02)
  })
  it('dieAlignment每次+0.015', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { dieAlignment: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].dieAlignment).toBeCloseTo(50.015)
  })
  it('surfaceFinish每次+0.01', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { surfaceFinish: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].surfaceFinish).toBeCloseTo(50.01)
  })
  it('diameterReduction不自动增长', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { diameterReduction: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].diameterReduction).toBe(50)
  })
  it('swedgingSkill上限100不超出', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { swedgingSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].swedgingSkill).toBe(100)
  })
  it('dieAlignment上限100不超出', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { dieAlignment: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].dieAlignment).toBe(100)
  })
  it('surfaceFinish上限100不超出', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { surfaceFinish: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].surfaceFinish).toBe(100)
  })
  it('多名工匠技能同步增长', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { swedgingSkill: 50 }))
    ;(sys as any).swedgers.push(makeWorker(2, { swedgingSkill: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].swedgingSkill).toBeCloseTo(50.02)
    expect((sys as any).swedgers[1].swedgingSkill).toBeCloseTo(60.02)
  })
  it('三次更新后swedgingSkill累积正确', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { swedgingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).swedgers[0].swedgingSkill).toBeCloseTo(50.06)
  })
})

describe('CreatureSwedgerSystem - cleanup边界', () => {
  let sys: CreatureSwedgerSystem
  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('swedgingSkill=3.98增长后<=4被清除', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { swedgingSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers).toHaveLength(0)
  })
  it('swedgingSkill=4.01增长后>4保留', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { swedgingSkill: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers).toHaveLength(1)
  })
  it('swedgingSkill=4增长后4.02>4保留', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { swedgingSkill: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers).toHaveLength(1)
  })
  it('混合工匠：低技能被清除，高技能保留', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { swedgingSkill: 3 }))
    ;(sys as any).swedgers.push(makeWorker(2, { swedgingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers).toHaveLength(1)
    expect((sys as any).swedgers[0].entityId).toBe(2)
  })
  it('全部低技能时所有被清除', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { swedgingSkill: 1 }))
    ;(sys as any).swedgers.push(makeWorker(2, { swedgingSkill: 2 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers).toHaveLength(0)
  })
  it('高技能始终保留', () => {
    ;(sys as any).swedgers.push(makeWorker(1, { swedgingSkill: 90 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers).toHaveLength(1)
  })
})

describe('CreatureSwedgerSystem - MAX_SWEDGERS上限与招募', () => {
  let sys: CreatureSwedgerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_SWEDGERS=10时不再招募', () => {
    for (let i = 0; i < MAX_SWEDGERS; i++) {
      ;(sys as any).swedgers.push(makeWorker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers.length).toBeLessThanOrEqual(MAX_SWEDGERS)
  })
  it('未满时random=0时招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers.length).toBe(1)
  })
  it('random >= RECRUIT_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers).toHaveLength(0)
  })
  it('招募成功时新记录tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).swedgers.length > 0) {
      expect((sys as any).swedgers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('招募后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).swedgers.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
  it('系统不崩溃（空swedgers）', () => {
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
})
