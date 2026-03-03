import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureSawyerSystem } from '../systems/CreatureSawyerSystem'
import type { Sawyer } from '../systems/CreatureSawyerSystem'

const CHECK_INTERVAL = 2660
const MAX_WORKERS = 10

let nextId = 1
function makeSys(): CreatureSawyerSystem { return new CreatureSawyerSystem() }
function makeWorker(entityId: number, overrides: Partial<Sawyer> = {}): Sawyer {
  return { id: nextId++, entityId, sawingSkill: 70, bladeControl: 65, timberGrading: 60, outputQuality: 75, tick: 0, ...overrides }
}
const emMock = { getEntitiesWithComponents: () => [] } as any

describe('CreatureSawyerSystem - 初始状态', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无工匠', () => { expect((sys as any).sawyers).toHaveLength(0) })
  it('注入后entityId可查询', () => {
    ;(sys as any).sawyers.push(makeWorker(1))
    expect((sys as any).sawyers[0].entityId).toBe(1)
  })
  it('返回内部引用一致', () => {
    ;(sys as any).sawyers.push(makeWorker(1))
    expect((sys as any).sawyers).toBe((sys as any).sawyers)
  })
  it('字段sawingSkill正确', () => {
    ;(sys as any).sawyers.push(makeWorker(2))
    expect((sys as any).sawyers[0].sawingSkill).toBe(70)
  })
  it('字段outputQuality正确', () => {
    ;(sys as any).sawyers.push(makeWorker(2))
    expect((sys as any).sawyers[0].outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).sawyers.push(makeWorker(1))
    ;(sys as any).sawyers.push(makeWorker(2))
    expect((sys as any).sawyers).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})

describe('CreatureSawyerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差不足CHECK_INTERVAL时不执行，lastCheck不变', () => {
    sys.update(0, emMock, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick差=CHECK_INTERVAL时触发，lastCheck更新', () => {
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick差=CHECK_INTERVAL-1不触发', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(0, emMock, 5000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('tick差=CHECK_INTERVAL精确触发', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(0, emMock, 5000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(5000 + CHECK_INTERVAL)
  })
  it('未触发时技能不增长', () => {
    const w = makeWorker(1, { sawingSkill: 50 })
    ;(sys as any).sawyers.push(w)
    sys.update(0, emMock, CHECK_INTERVAL - 1)
    expect(w.sawingSkill).toBe(50)
  })
  it('触发后lastCheck更新为当前tick', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(0, emMock, 1000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(1000 + CHECK_INTERVAL)
  })
  it('连续两次间隔不足跳过第二次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, emMock, CHECK_INTERVAL)
    const snap = (sys as any).sawyers.length
    sys.update(0, emMock, CHECK_INTERVAL + 1)
    expect((sys as any).sawyers.length).toBe(snap)
  })
  it('两次均触发则技能增长两次', () => {
    const w = makeWorker(1, { sawingSkill: 50 })
    ;(sys as any).sawyers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    sys.update(0, emMock, CHECK_INTERVAL * 2)
    expect(w.sawingSkill).toBeCloseTo(50 + 0.02 * 2, 4)
  })
})

describe('CreatureSawyerSystem - 技能递增与上限', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('sawingSkill每次+0.02', () => {
    const w = makeWorker(1, { sawingSkill: 50 })
    ;(sys as any).sawyers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.sawingSkill).toBeCloseTo(50 + 0.02, 5)
  })
  it('bladeControl每次+0.015', () => {
    const w = makeWorker(1, { bladeControl: 40 })
    ;(sys as any).sawyers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.bladeControl).toBeCloseTo(40 + 0.015, 5)
  })
  it('outputQuality每次+0.01', () => {
    const w = makeWorker(1, { outputQuality: 60 })
    ;(sys as any).sawyers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.outputQuality).toBeCloseTo(60 + 0.01, 5)
  })
  it('sawingSkill上限100不超过', () => {
    const w = makeWorker(1, { sawingSkill: 99.99 })
    ;(sys as any).sawyers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.sawingSkill).toBeLessThanOrEqual(100)
  })
  it('bladeControl上限100不超过', () => {
    const w = makeWorker(1, { bladeControl: 99.99 })
    ;(sys as any).sawyers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.bladeControl).toBeLessThanOrEqual(100)
  })
  it('outputQuality上限100不超过', () => {
    const w = makeWorker(1, { outputQuality: 99.99 })
    ;(sys as any).sawyers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.outputQuality).toBeLessThanOrEqual(100)
  })
  it('timberGrading不参与递增', () => {
    const w = makeWorker(1, { timberGrading: 60 })
    ;(sys as any).sawyers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.timberGrading).toBe(60)
  })
  it('多个工匠同时增长', () => {
    ;(sys as any).sawyers.push(makeWorker(1, { sawingSkill: 50 }))
    ;(sys as any).sawyers.push(makeWorker(2, { sawingSkill: 60 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers[0].sawingSkill).toBeCloseTo(50 + 0.02, 5)
    expect((sys as any).sawyers[1].sawingSkill).toBeCloseTo(60 + 0.02, 5)
  })
  it('sawingSkill=100时保持不变', () => {
    const w = makeWorker(1, { sawingSkill: 100 })
    ;(sys as any).sawyers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.sawingSkill).toBe(100)
  })
})

describe('CreatureSawyerSystem - cleanup: sawingSkill<=4时删除', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => {
    sys = makeSys(); nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('sawingSkill=4时更新后>4，保留', () => {
    ;(sys as any).sawyers.push(makeWorker(1, { sawingSkill: 4 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers).toHaveLength(1)
  })
  it('sawingSkill=3.98时更新后<=4，删除', () => {
    ;(sys as any).sawyers.push(makeWorker(1, { sawingSkill: 3.98 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers).toHaveLength(0)
  })
  it('sawingSkill=3.99时更新后>4，保留', () => {
    ;(sys as any).sawyers.push(makeWorker(1, { sawingSkill: 3.99 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers).toHaveLength(1)
  })
  it('高技能工匠不被删除', () => {
    ;(sys as any).sawyers.push(makeWorker(1, { sawingSkill: 50 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers).toHaveLength(1)
  })
  it('多个低技能全部删除', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).sawyers.push(makeWorker(i, { sawingSkill: 2 }))
    }
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers).toHaveLength(0)
  })
  it('混合：低技能删除高技能保留', () => {
    ;(sys as any).sawyers.push(makeWorker(1, { sawingSkill: 2 }))
    ;(sys as any).sawyers.push(makeWorker(2, { sawingSkill: 50 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers).toHaveLength(1)
    expect((sys as any).sawyers[0].entityId).toBe(2)
  })
  it('sawingSkill=1时必然被删除', () => {
    ;(sys as any).sawyers.push(makeWorker(1, { sawingSkill: 1 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers).toHaveLength(0)
  })
  it('sawingSkill=3.97时更新后<4被删除', () => {
    ;(sys as any).sawyers.push(makeWorker(1, { sawingSkill: 3.97 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers).toHaveLength(0)
  })
})

describe('CreatureSawyerSystem - MAX_WORKERS上限与招募', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('已达MAX_WORKERS时不再招募', () => {
    for (let i = 0; i < MAX_WORKERS; i++) {
      ;(sys as any).sawyers.push(makeWorker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers.length).toBeLessThanOrEqual(MAX_WORKERS)
  })
  it('数量<MAX且random<RECRUIT_CHANCE时招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers.length).toBeGreaterThanOrEqual(1)
  })
  it('random=1时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers).toHaveLength(0)
  })
  it('招募后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    if ((sys as any).sawyers.length > 0) {
      expect((sys as any).sawyers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('多次招募id递增唯一', () => {
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys2.update(0, emMock, CHECK_INTERVAL)
    sys2.update(0, emMock, CHECK_INTERVAL * 2)
    const workers = (sys2 as any).sawyers
    if (workers.length >= 2) {
      expect(workers[1].id).toBeGreaterThan(workers[0].id)
    }
  })
  it('招募时sawingSkill在[10,35]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, emMock, CHECK_INTERVAL)
    if ((sys as any).sawyers.length > 0) {
      const v = (sys as any).sawyers[0].sawingSkill
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThanOrEqual(35)
    }
  })
  it('招募的entityId在[0,499]范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    if ((sys as any).sawyers.length > 0) {
      const eid = (sys as any).sawyers[0].entityId
      expect(eid).toBeGreaterThanOrEqual(0)
      expect(eid).toBeLessThanOrEqual(499)
    }
  })
})

describe('CreatureSawyerSystem - 边界与综合场景', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('空系统更新不抛出异常', () => {
    expect(() => sys.update(0, emMock, CHECK_INTERVAL)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    sys.update(999, emMock, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('多次更新技能累积', () => {
    const w = makeWorker(1, { sawingSkill: 50 })
    ;(sys as any).sawyers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let t = 1; t <= 3; t++) {
      sys.update(0, emMock, CHECK_INTERVAL * t)
    }
    expect(w.sawingSkill).toBeCloseTo(50 + 0.02 * 3, 4)
  })
  it('系统update返回undefined', () => {
    expect(sys.update(0, emMock, CHECK_INTERVAL)).toBeUndefined()
  })
  it('tick=0不触发', () => {
    sys.update(0, emMock, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入5个工匠后长度为5', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).sawyers.push(makeWorker(i)) }
    expect((sys as any).sawyers).toHaveLength(5)
  })
  it('大量工匠同时更新不抛出', () => {
    for (let i = 1; i <= 8; i++) {
      ;(sys as any).sawyers.push(makeWorker(i, { sawingSkill: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(0, emMock, CHECK_INTERVAL)).not.toThrow()
  })
  it('sawingSkill和outputQuality同时增长验证', () => {
    const w = makeWorker(1, { sawingSkill: 50, outputQuality: 60 })
    ;(sys as any).sawyers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.sawingSkill).toBeCloseTo(50 + 0.02, 5)
    expect(w.outputQuality).toBeCloseTo(60 + 0.01, 5)
  })
})

describe('CreatureSawyerSystem - 额外边界验证', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('sawingSkill=4.00时更新后4.02>4保留', () => {
    ;(sys as any).sawyers.push({ id: 99, entityId: 99, sawingSkill: 4.00, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).sawyers).toHaveLength(1)
  })
  it('tick负值时不触发', () => {
    sys.update(0, emMock, -1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('两次相同tick只触发一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    const check1 = (sys as any).lastCheck
    sys.update(0, emMock, CHECK_INTERVAL) // same tick, difference=0
    expect((sys as any).lastCheck).toBe(check1)
  })
})
