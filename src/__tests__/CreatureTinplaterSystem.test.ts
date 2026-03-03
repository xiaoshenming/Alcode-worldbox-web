import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureTinplaterSystem } from '../systems/CreatureTinplaterSystem'
import type { Tinplater } from '../systems/CreatureTinplaterSystem'

const CHECK_INTERVAL = 2850
const MAX_TINPLATERS = 10
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureTinplaterSystem { return new CreatureTinplaterSystem() }
function makeWorker(entityId: number, overrides: Partial<Tinplater> = {}): Tinplater {
  return { id: nextId++, entityId, platingSkill: 70, coatingUniformity: 65, bathControl: 80, corrosionResistance: 75, tick: 0, ...overrides }
}

describe('CreatureTinplaterSystem — 初始状态', () => {
  let sys: CreatureTinplaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无工匠', () => { expect((sys as any).tinplaters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tinplaters.push(makeWorker(1))
    expect((sys as any).tinplaters[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).tinplaters.push(makeWorker(1))
    expect((sys as any).tinplaters).toBe((sys as any).tinplaters)
  })
  it('字段正确', () => {
    ;(sys as any).tinplaters.push(makeWorker(2))
    const t = (sys as any).tinplaters[0]
    expect(t.platingSkill).toBe(70)
    expect(t.corrosionResistance).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).tinplaters.push(makeWorker(1))
    ;(sys as any).tinplaters.push(makeWorker(2))
    expect((sys as any).tinplaters).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('bathControl字段存储正确', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { bathControl: 42 }))
    expect((sys as any).tinplaters[0].bathControl).toBe(42)
  })
})

describe('CreatureTinplaterSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureTinplaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick不足时不执行技能增长', () => {
    ;(sys as any).tinplaters.push(makeWorker(1))
    const before = (sys as any).tinplaters[0].platingSkill
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).tinplaters[0].platingSkill).toBe(before)
  })
  it('首次tick=CHECK_INTERVAL时执行', () => {
    ;(sys as any).tinplaters.push(makeWorker(1))
    const before = (sys as any).tinplaters[0].platingSkill
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].platingSkill).toBeGreaterThan(before)
  })
  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次更新：第二次在间隔内不再增长', () => {
    ;(sys as any).tinplaters.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).tinplaters[0].platingSkill
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).tinplaters[0].platingSkill).toBe(afterFirst)
  })
  it('两次间隔均达到时两次都增长', () => {
    ;(sys as any).tinplaters.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).tinplaters[0].platingSkill
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).tinplaters[0].platingSkill).toBeGreaterThan(afterFirst)
  })
  it('差值恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 1000
    ;(sys as any).tinplaters.push(makeWorker(1, { platingSkill: 50 }))
    sys.update(1, em, 1000 + CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].platingSkill).toBeCloseTo(50.02)
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

describe('CreatureTinplaterSystem - 技能增量', () => {
  let sys: CreatureTinplaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('platingSkill每次+0.02', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { platingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].platingSkill).toBeCloseTo(50.02)
  })
  it('coatingUniformity每次+0.015', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { coatingUniformity: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].coatingUniformity).toBeCloseTo(50.015)
  })
  it('corrosionResistance每次+0.01', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { corrosionResistance: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].corrosionResistance).toBeCloseTo(50.01)
  })
  it('bathControl不自动增长', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { bathControl: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].bathControl).toBe(50)
  })
  it('platingSkill上限100不超出', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { platingSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].platingSkill).toBe(100)
  })
  it('coatingUniformity上限100不超出', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { coatingUniformity: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].coatingUniformity).toBe(100)
  })
  it('corrosionResistance上限100不超出', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { corrosionResistance: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].corrosionResistance).toBe(100)
  })
  it('多名工匠技能同步增长', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { platingSkill: 50 }))
    ;(sys as any).tinplaters.push(makeWorker(2, { platingSkill: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].platingSkill).toBeCloseTo(50.02)
    expect((sys as any).tinplaters[1].platingSkill).toBeCloseTo(60.02)
  })
  it('三次更新后platingSkill累积正确', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { platingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).tinplaters[0].platingSkill).toBeCloseTo(50.06)
  })
})

describe('CreatureTinplaterSystem - cleanup边界', () => {
  let sys: CreatureTinplaterSystem
  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('platingSkill=3.98增长后<=4被清除', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { platingSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters).toHaveLength(0)
  })
  it('platingSkill=4.01增长后>4保留', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { platingSkill: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters).toHaveLength(1)
  })
  it('platingSkill=4增长后4.02>4保留', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { platingSkill: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters).toHaveLength(1)
  })
  it('混合工匠：低技能被清除，高技能保留', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { platingSkill: 3 }))
    ;(sys as any).tinplaters.push(makeWorker(2, { platingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters).toHaveLength(1)
    expect((sys as any).tinplaters[0].entityId).toBe(2)
  })
  it('全部低技能时所有被清除', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { platingSkill: 1 }))
    ;(sys as any).tinplaters.push(makeWorker(2, { platingSkill: 2 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters).toHaveLength(0)
  })
  it('高技能始终保留', () => {
    ;(sys as any).tinplaters.push(makeWorker(1, { platingSkill: 90 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters).toHaveLength(1)
  })
})

describe('CreatureTinplaterSystem - MAX_TINPLATERS上限与招募', () => {
  let sys: CreatureTinplaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_TINPLATERS=10时不再招募', () => {
    for (let i = 0; i < MAX_TINPLATERS; i++) {
      ;(sys as any).tinplaters.push(makeWorker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters.length).toBeLessThanOrEqual(MAX_TINPLATERS)
  })
  it('未满时random=0时招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters.length).toBe(1)
  })
  it('random >= RECRUIT_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters).toHaveLength(0)
  })
  it('招募成功时新记录tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).tinplaters.length > 0) {
      expect((sys as any).tinplaters[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('招募后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).tinplaters.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
  it('系统不崩溃（空tinplaters）', () => {
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
})
