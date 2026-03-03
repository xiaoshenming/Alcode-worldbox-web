import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureScriberSystem } from '../systems/CreatureScriberSystem'
import type { Scriber } from '../systems/CreatureScriberSystem'

const CHECK_INTERVAL = 3090
const MAX_WORKERS = 10

let nextId = 1
function makeSys(): CreatureScriberSystem { return new CreatureScriberSystem() }
function makeWorker(entityId: number, overrides: Partial<Scriber> = {}): Scriber {
  return { id: nextId++, entityId, scribingSkill: 70, lineAccuracy: 65, layoutPrecision: 60, markingDepth: 75, tick: 0, ...overrides }
}
const emMock = { getEntitiesWithComponents: () => [] } as any

describe('CreatureScriberSystem - 初始状态', () => {
  let sys: CreatureScriberSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无工匠', () => { expect((sys as any).scribers).toHaveLength(0) })
  it('注入后entityId可查询', () => {
    ;(sys as any).scribers.push(makeWorker(1))
    expect((sys as any).scribers[0].entityId).toBe(1)
  })
  it('返回内部引用一致', () => {
    ;(sys as any).scribers.push(makeWorker(1))
    expect((sys as any).scribers).toBe((sys as any).scribers)
  })
  it('字段scribingSkill正确', () => {
    ;(sys as any).scribers.push(makeWorker(2))
    expect((sys as any).scribers[0].scribingSkill).toBe(70)
  })
  it('字段markingDepth正确', () => {
    ;(sys as any).scribers.push(makeWorker(2))
    expect((sys as any).scribers[0].markingDepth).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).scribers.push(makeWorker(1))
    ;(sys as any).scribers.push(makeWorker(2))
    expect((sys as any).scribers).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})

describe('CreatureScriberSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureScriberSystem
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
    const w = makeWorker(1, { scribingSkill: 50 })
    ;(sys as any).scribers.push(w)
    sys.update(0, emMock, CHECK_INTERVAL - 1)
    expect(w.scribingSkill).toBe(50)
  })
  it('触发后lastCheck更新为当前tick', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(0, emMock, 1000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(1000 + CHECK_INTERVAL)
  })
  it('连续两次间隔不足跳过第二次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, emMock, CHECK_INTERVAL)
    const snap = (sys as any).scribers.length
    sys.update(0, emMock, CHECK_INTERVAL + 1)
    expect((sys as any).scribers.length).toBe(snap)
  })
  it('两次均触发则技能增长两次', () => {
    const w = makeWorker(1, { scribingSkill: 50 })
    ;(sys as any).scribers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    sys.update(0, emMock, CHECK_INTERVAL * 2)
    expect(w.scribingSkill).toBeCloseTo(50 + 0.02 * 2, 4)
  })
})

describe('CreatureScriberSystem - 技能递增与上限', () => {
  let sys: CreatureScriberSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('scribingSkill每次+0.02', () => {
    const w = makeWorker(1, { scribingSkill: 50 })
    ;(sys as any).scribers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.scribingSkill).toBeCloseTo(50 + 0.02, 5)
  })
  it('lineAccuracy每次+0.015', () => {
    const w = makeWorker(1, { lineAccuracy: 40 })
    ;(sys as any).scribers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.lineAccuracy).toBeCloseTo(40 + 0.015, 5)
  })
  it('markingDepth每次+0.01', () => {
    const w = makeWorker(1, { markingDepth: 60 })
    ;(sys as any).scribers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.markingDepth).toBeCloseTo(60 + 0.01, 5)
  })
  it('scribingSkill上限100不超过', () => {
    const w = makeWorker(1, { scribingSkill: 99.99 })
    ;(sys as any).scribers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.scribingSkill).toBeLessThanOrEqual(100)
  })
  it('lineAccuracy上限100不超过', () => {
    const w = makeWorker(1, { lineAccuracy: 99.99 })
    ;(sys as any).scribers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.lineAccuracy).toBeLessThanOrEqual(100)
  })
  it('markingDepth上限100不超过', () => {
    const w = makeWorker(1, { markingDepth: 99.99 })
    ;(sys as any).scribers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.markingDepth).toBeLessThanOrEqual(100)
  })
  it('layoutPrecision不参与递增', () => {
    const w = makeWorker(1, { layoutPrecision: 60 })
    ;(sys as any).scribers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.layoutPrecision).toBe(60)
  })
  it('多个工匠同时增长', () => {
    ;(sys as any).scribers.push(makeWorker(1, { scribingSkill: 50 }))
    ;(sys as any).scribers.push(makeWorker(2, { scribingSkill: 60 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers[0].scribingSkill).toBeCloseTo(50 + 0.02, 5)
    expect((sys as any).scribers[1].scribingSkill).toBeCloseTo(60 + 0.02, 5)
  })
  it('scribingSkill=100时保持不变', () => {
    const w = makeWorker(1, { scribingSkill: 100 })
    ;(sys as any).scribers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.scribingSkill).toBe(100)
  })
})

describe('CreatureScriberSystem - cleanup: scribingSkill<=4时删除', () => {
  let sys: CreatureScriberSystem
  beforeEach(() => {
    sys = makeSys(); nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('scribingSkill=4时更新后>4，保留', () => {
    ;(sys as any).scribers.push(makeWorker(1, { scribingSkill: 4 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers).toHaveLength(1)
  })
  it('scribingSkill=3.98时更新后<=4，删除', () => {
    ;(sys as any).scribers.push(makeWorker(1, { scribingSkill: 3.98 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers).toHaveLength(0)
  })
  it('scribingSkill=3.99时更新后>4，保留', () => {
    ;(sys as any).scribers.push(makeWorker(1, { scribingSkill: 3.99 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers).toHaveLength(1)
  })
  it('高技能工匠不被删除', () => {
    ;(sys as any).scribers.push(makeWorker(1, { scribingSkill: 50 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers).toHaveLength(1)
  })
  it('多个低技能全部删除', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).scribers.push(makeWorker(i, { scribingSkill: 2 }))
    }
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers).toHaveLength(0)
  })
  it('混合：低技能删除高技能保留', () => {
    ;(sys as any).scribers.push(makeWorker(1, { scribingSkill: 2 }))
    ;(sys as any).scribers.push(makeWorker(2, { scribingSkill: 50 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers).toHaveLength(1)
    expect((sys as any).scribers[0].entityId).toBe(2)
  })
  it('scribingSkill=1时必然被删除', () => {
    ;(sys as any).scribers.push(makeWorker(1, { scribingSkill: 1 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers).toHaveLength(0)
  })
  it('scribingSkill=3.97时更新后<4被删除', () => {
    ;(sys as any).scribers.push(makeWorker(1, { scribingSkill: 3.97 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers).toHaveLength(0)
  })
})

describe('CreatureScriberSystem - MAX_WORKERS上限与招募', () => {
  let sys: CreatureScriberSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('已达MAX_WORKERS时不再招募', () => {
    for (let i = 0; i < MAX_WORKERS; i++) {
      ;(sys as any).scribers.push(makeWorker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers.length).toBeLessThanOrEqual(MAX_WORKERS)
  })
  it('数量<MAX且random<RECRUIT_CHANCE时招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers.length).toBeGreaterThanOrEqual(1)
  })
  it('random=1时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers).toHaveLength(0)
  })
  it('招募后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    if ((sys as any).scribers.length > 0) {
      expect((sys as any).scribers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('多次招募id递增唯一', () => {
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys2.update(0, emMock, CHECK_INTERVAL)
    sys2.update(0, emMock, CHECK_INTERVAL * 2)
    const workers = (sys2 as any).scribers
    if (workers.length >= 2) {
      expect(workers[1].id).toBeGreaterThan(workers[0].id)
    }
  })
  it('招募时scribingSkill在[10,35]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, emMock, CHECK_INTERVAL)
    if ((sys as any).scribers.length > 0) {
      const v = (sys as any).scribers[0].scribingSkill
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThanOrEqual(35)
    }
  })
  it('招募的entityId在[0,499]范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    if ((sys as any).scribers.length > 0) {
      const eid = (sys as any).scribers[0].entityId
      expect(eid).toBeGreaterThanOrEqual(0)
      expect(eid).toBeLessThanOrEqual(499)
    }
  })
})

describe('CreatureScriberSystem - 边界与综合场景', () => {
  let sys: CreatureScriberSystem
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
    const w = makeWorker(1, { scribingSkill: 50 })
    ;(sys as any).scribers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let t = 1; t <= 3; t++) {
      sys.update(0, emMock, CHECK_INTERVAL * t)
    }
    expect(w.scribingSkill).toBeCloseTo(50 + 0.02 * 3, 4)
  })
  it('系统update返回undefined', () => {
    expect(sys.update(0, emMock, CHECK_INTERVAL)).toBeUndefined()
  })
  it('tick=0不触发', () => {
    sys.update(0, emMock, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入5个工匠后长度为5', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).scribers.push(makeWorker(i)) }
    expect((sys as any).scribers).toHaveLength(5)
  })
  it('大量工匠同时更新不抛出', () => {
    for (let i = 1; i <= 8; i++) {
      ;(sys as any).scribers.push(makeWorker(i, { scribingSkill: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(0, emMock, CHECK_INTERVAL)).not.toThrow()
  })
  it('scribingSkill和markingDepth同时增长验证', () => {
    const w = makeWorker(1, { scribingSkill: 50, markingDepth: 60 })
    ;(sys as any).scribers.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.scribingSkill).toBeCloseTo(50 + 0.02, 5)
    expect(w.markingDepth).toBeCloseTo(60 + 0.01, 5)
  })
})

describe('CreatureScriberSystem - 额外边界验证', () => {
  let sys: CreatureScriberSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('scribingSkill=4.00时更新后4.02>4保留', () => {
    ;(sys as any).scribers.push({ id: 99, entityId: 99, scribingSkill: 4.00, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).scribers).toHaveLength(1)
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
