import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureStamperSystem } from '../systems/CreatureStamperSystem'
import type { Stamper } from '../systems/CreatureStamperSystem'

const CHECK_INTERVAL = 2890
const MAX_STAMPERS = 10
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureStamperSystem { return new CreatureStamperSystem() }
function makeWorker(entityId: number, overrides: Partial<Stamper> = {}): Stamper {
  return { id: nextId++, entityId, stampingSkill: 70, pressAlignment: 65, dieSelection: 80, outputConsistency: 75, tick: 0, ...overrides }
}

describe('CreatureStamperSystem — 初始状态', () => {
  let sys: CreatureStamperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无工匠', () => { expect((sys as any).stampers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).stampers.push(makeWorker(1))
    expect((sys as any).stampers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).stampers.push(makeWorker(1))
    expect((sys as any).stampers).toBe((sys as any).stampers)
  })
  it('字段正确', () => {
    ;(sys as any).stampers.push(makeWorker(2))
    const s = (sys as any).stampers[0]
    expect(s.stampingSkill).toBe(70)
    expect(s.outputConsistency).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).stampers.push(makeWorker(1))
    ;(sys as any).stampers.push(makeWorker(2))
    expect((sys as any).stampers).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('dieSelection字段存储正确', () => {
    ;(sys as any).stampers.push(makeWorker(1, { dieSelection: 42 }))
    expect((sys as any).stampers[0].dieSelection).toBe(42)
  })
})

describe('CreatureStamperSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureStamperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick不足时不执行技能增长', () => {
    ;(sys as any).stampers.push(makeWorker(1))
    const before = (sys as any).stampers[0].stampingSkill
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).stampers[0].stampingSkill).toBe(before)
  })
  it('首次tick=CHECK_INTERVAL时执行', () => {
    ;(sys as any).stampers.push(makeWorker(1))
    const before = (sys as any).stampers[0].stampingSkill
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].stampingSkill).toBeGreaterThan(before)
  })
  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次更新：第二次在间隔内不再增长', () => {
    ;(sys as any).stampers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).stampers[0].stampingSkill
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).stampers[0].stampingSkill).toBe(afterFirst)
  })
  it('两次间隔均达到时两次都增长', () => {
    ;(sys as any).stampers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).stampers[0].stampingSkill
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).stampers[0].stampingSkill).toBeGreaterThan(afterFirst)
  })
  it('差值恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 1000
    ;(sys as any).stampers.push(makeWorker(1, { stampingSkill: 50 }))
    sys.update(1, em, 1000 + CHECK_INTERVAL)
    expect((sys as any).stampers[0].stampingSkill).toBeCloseTo(50.02)
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

describe('CreatureStamperSystem - 技能增量', () => {
  let sys: CreatureStamperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('stampingSkill每次+0.02', () => {
    ;(sys as any).stampers.push(makeWorker(1, { stampingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].stampingSkill).toBeCloseTo(50.02)
  })
  it('pressAlignment每次+0.015', () => {
    ;(sys as any).stampers.push(makeWorker(1, { pressAlignment: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].pressAlignment).toBeCloseTo(50.015)
  })
  it('outputConsistency每次+0.01', () => {
    ;(sys as any).stampers.push(makeWorker(1, { outputConsistency: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].outputConsistency).toBeCloseTo(50.01)
  })
  it('dieSelection不自动增长', () => {
    ;(sys as any).stampers.push(makeWorker(1, { dieSelection: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].dieSelection).toBe(50)
  })
  it('stampingSkill上限100不超出', () => {
    ;(sys as any).stampers.push(makeWorker(1, { stampingSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].stampingSkill).toBe(100)
  })
  it('pressAlignment上限100不超出', () => {
    ;(sys as any).stampers.push(makeWorker(1, { pressAlignment: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].pressAlignment).toBe(100)
  })
  it('outputConsistency上限100不超出', () => {
    ;(sys as any).stampers.push(makeWorker(1, { outputConsistency: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].outputConsistency).toBe(100)
  })
  it('多名工匠技能同步增长', () => {
    ;(sys as any).stampers.push(makeWorker(1, { stampingSkill: 50 }))
    ;(sys as any).stampers.push(makeWorker(2, { stampingSkill: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].stampingSkill).toBeCloseTo(50.02)
    expect((sys as any).stampers[1].stampingSkill).toBeCloseTo(60.02)
  })
  it('三次更新后stampingSkill累积正确', () => {
    ;(sys as any).stampers.push(makeWorker(1, { stampingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).stampers[0].stampingSkill).toBeCloseTo(50.06)
  })
})

describe('CreatureStamperSystem - cleanup边界', () => {
  let sys: CreatureStamperSystem
  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('stampingSkill=3.98增长后<=4被清除', () => {
    ;(sys as any).stampers.push(makeWorker(1, { stampingSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers).toHaveLength(0)
  })
  it('stampingSkill=4.01增长后>4保留', () => {
    ;(sys as any).stampers.push(makeWorker(1, { stampingSkill: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers).toHaveLength(1)
  })
  it('stampingSkill=4增长后4.02>4保留', () => {
    ;(sys as any).stampers.push(makeWorker(1, { stampingSkill: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers).toHaveLength(1)
  })
  it('混合工匠：低技能被清除，高技能保留', () => {
    ;(sys as any).stampers.push(makeWorker(1, { stampingSkill: 3 }))
    ;(sys as any).stampers.push(makeWorker(2, { stampingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers).toHaveLength(1)
    expect((sys as any).stampers[0].entityId).toBe(2)
  })
  it('全部低技能时所有被清除', () => {
    ;(sys as any).stampers.push(makeWorker(1, { stampingSkill: 1 }))
    ;(sys as any).stampers.push(makeWorker(2, { stampingSkill: 2 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers).toHaveLength(0)
  })
  it('高技能始终保留', () => {
    ;(sys as any).stampers.push(makeWorker(1, { stampingSkill: 90 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers).toHaveLength(1)
  })
})

describe('CreatureStamperSystem - MAX_STAMPERS上限与招募', () => {
  let sys: CreatureStamperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_STAMPERS=10时不再招募', () => {
    for (let i = 0; i < MAX_STAMPERS; i++) {
      ;(sys as any).stampers.push(makeWorker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers.length).toBeLessThanOrEqual(MAX_STAMPERS)
  })
  it('未满时random=0时招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers.length).toBe(1)
  })
  it('random >= RECRUIT_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers).toHaveLength(0)
  })
  it('招募成功时新记录tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).stampers.length > 0) {
      expect((sys as any).stampers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('招募后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).stampers.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
  it('系统不崩溃（空stampers）', () => {
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
})
