import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureRiveterSystem } from '../systems/CreatureRiveterSystem'
import type { Riveter } from '../systems/CreatureRiveterSystem'

const CHECK_INTERVAL = 2640
const MAX_WORKERS = 10

let nextId = 1
function makeSys(): CreatureRiveterSystem { return new CreatureRiveterSystem() }
function makeWorker(entityId: number, overrides: Partial<Riveter> = {}): Riveter {
  return { id: nextId++, entityId, holeAlignment: 70, jointStrength: 65, hammerWork: 60, outputQuality: 75, tick: 0, ...overrides }
}
const emMock = { getEntitiesWithComponents: () => [] } as any

describe('CreatureRiveterSystem - 初始状态', () => {
  let sys: CreatureRiveterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无工匠', () => { expect((sys as any).riveters).toHaveLength(0) })
  it('注入后entityId可查询', () => {
    ;(sys as any).riveters.push(makeWorker(1))
    expect((sys as any).riveters[0].entityId).toBe(1)
  })
  it('返回内部引用一致', () => {
    ;(sys as any).riveters.push(makeWorker(1))
    expect((sys as any).riveters).toBe((sys as any).riveters)
  })
  it('字段holeAlignment正确', () => {
    ;(sys as any).riveters.push(makeWorker(2))
    expect((sys as any).riveters[0].holeAlignment).toBe(70)
  })
  it('字段outputQuality正确', () => {
    ;(sys as any).riveters.push(makeWorker(2))
    expect((sys as any).riveters[0].outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).riveters.push(makeWorker(1))
    ;(sys as any).riveters.push(makeWorker(2))
    expect((sys as any).riveters).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})

describe('CreatureRiveterSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureRiveterSystem
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
    const w = makeWorker(1, { holeAlignment: 50 })
    ;(sys as any).riveters.push(w)
    sys.update(0, emMock, CHECK_INTERVAL - 1)
    expect(w.holeAlignment).toBe(50)
  })
  it('触发后lastCheck更新为当前tick', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(0, emMock, 1000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(1000 + CHECK_INTERVAL)
  })
  it('连续两次间隔不足跳过第二次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, emMock, CHECK_INTERVAL)
    const snap = (sys as any).riveters.length
    sys.update(0, emMock, CHECK_INTERVAL + 1)
    expect((sys as any).riveters.length).toBe(snap)
  })
  it('两次均触发则技能增长两次', () => {
    const w = makeWorker(1, { holeAlignment: 50 })
    ;(sys as any).riveters.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    sys.update(0, emMock, CHECK_INTERVAL * 2)
    expect(w.holeAlignment).toBeCloseTo(50 + 0.02 * 2, 4)
  })
})

describe('CreatureRiveterSystem - 技能递增与上限', () => {
  let sys: CreatureRiveterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('holeAlignment每次+0.02', () => {
    const w = makeWorker(1, { holeAlignment: 50 })
    ;(sys as any).riveters.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.holeAlignment).toBeCloseTo(50 + 0.02, 5)
  })
  it('jointStrength每次+0.015', () => {
    const w = makeWorker(1, { jointStrength: 40 })
    ;(sys as any).riveters.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.jointStrength).toBeCloseTo(40 + 0.015, 5)
  })
  it('outputQuality每次+0.01', () => {
    const w = makeWorker(1, { outputQuality: 60 })
    ;(sys as any).riveters.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.outputQuality).toBeCloseTo(60 + 0.01, 5)
  })
  it('holeAlignment上限100不超过', () => {
    const w = makeWorker(1, { holeAlignment: 99.99 })
    ;(sys as any).riveters.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.holeAlignment).toBeLessThanOrEqual(100)
  })
  it('jointStrength上限100不超过', () => {
    const w = makeWorker(1, { jointStrength: 99.99 })
    ;(sys as any).riveters.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.jointStrength).toBeLessThanOrEqual(100)
  })
  it('outputQuality上限100不超过', () => {
    const w = makeWorker(1, { outputQuality: 99.99 })
    ;(sys as any).riveters.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.outputQuality).toBeLessThanOrEqual(100)
  })
  it('hammerWork不参与递增', () => {
    const w = makeWorker(1, { hammerWork: 60 })
    ;(sys as any).riveters.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.hammerWork).toBe(60)
  })
  it('多个工匠同时增长', () => {
    ;(sys as any).riveters.push(makeWorker(1, { holeAlignment: 50 }))
    ;(sys as any).riveters.push(makeWorker(2, { holeAlignment: 60 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters[0].holeAlignment).toBeCloseTo(50 + 0.02, 5)
    expect((sys as any).riveters[1].holeAlignment).toBeCloseTo(60 + 0.02, 5)
  })
  it('holeAlignment=100时保持不变', () => {
    const w = makeWorker(1, { holeAlignment: 100 })
    ;(sys as any).riveters.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.holeAlignment).toBe(100)
  })
})

describe('CreatureRiveterSystem - cleanup: holeAlignment<=4时删除', () => {
  let sys: CreatureRiveterSystem
  beforeEach(() => {
    sys = makeSys(); nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('holeAlignment=4时更新后>4，保留', () => {
    ;(sys as any).riveters.push(makeWorker(1, { holeAlignment: 4 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters).toHaveLength(1)
  })
  it('holeAlignment=3.98时更新后<=4，删除', () => {
    ;(sys as any).riveters.push(makeWorker(1, { holeAlignment: 3.98 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters).toHaveLength(0)
  })
  it('holeAlignment=3.99时更新后>4，保留', () => {
    ;(sys as any).riveters.push(makeWorker(1, { holeAlignment: 3.99 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters).toHaveLength(1)
  })
  it('高技能工匠不被删除', () => {
    ;(sys as any).riveters.push(makeWorker(1, { holeAlignment: 50 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters).toHaveLength(1)
  })
  it('多个低技能全部删除', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).riveters.push(makeWorker(i, { holeAlignment: 2 }))
    }
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters).toHaveLength(0)
  })
  it('混合：低技能删除高技能保留', () => {
    ;(sys as any).riveters.push(makeWorker(1, { holeAlignment: 2 }))
    ;(sys as any).riveters.push(makeWorker(2, { holeAlignment: 50 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters).toHaveLength(1)
    expect((sys as any).riveters[0].entityId).toBe(2)
  })
  it('holeAlignment=1时必然被删除', () => {
    ;(sys as any).riveters.push(makeWorker(1, { holeAlignment: 1 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters).toHaveLength(0)
  })
  it('holeAlignment=3.97时更新后<4被删除', () => {
    ;(sys as any).riveters.push(makeWorker(1, { holeAlignment: 3.97 }))
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters).toHaveLength(0)
  })
})

describe('CreatureRiveterSystem - MAX_WORKERS上限与招募', () => {
  let sys: CreatureRiveterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('已达MAX_WORKERS时不再招募', () => {
    for (let i = 0; i < MAX_WORKERS; i++) {
      ;(sys as any).riveters.push(makeWorker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters.length).toBeLessThanOrEqual(MAX_WORKERS)
  })
  it('数量<MAX且random<RECRUIT_CHANCE时招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters.length).toBeGreaterThanOrEqual(1)
  })
  it('random=1时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters).toHaveLength(0)
  })
  it('招募后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    if ((sys as any).riveters.length > 0) {
      expect((sys as any).riveters[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('多次招募id递增唯一', () => {
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys2.update(0, emMock, CHECK_INTERVAL)
    sys2.update(0, emMock, CHECK_INTERVAL * 2)
    const workers = (sys2 as any).riveters
    if (workers.length >= 2) {
      expect(workers[1].id).toBeGreaterThan(workers[0].id)
    }
  })
  it('招募时holeAlignment在[10,35]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, emMock, CHECK_INTERVAL)
    if ((sys as any).riveters.length > 0) {
      const v = (sys as any).riveters[0].holeAlignment
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThanOrEqual(35)
    }
  })
  it('招募的entityId在[0,499]范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, emMock, CHECK_INTERVAL)
    if ((sys as any).riveters.length > 0) {
      const eid = (sys as any).riveters[0].entityId
      expect(eid).toBeGreaterThanOrEqual(0)
      expect(eid).toBeLessThanOrEqual(499)
    }
  })
})

describe('CreatureRiveterSystem - 边界与综合场景', () => {
  let sys: CreatureRiveterSystem
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
    const w = makeWorker(1, { holeAlignment: 50 })
    ;(sys as any).riveters.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let t = 1; t <= 3; t++) {
      sys.update(0, emMock, CHECK_INTERVAL * t)
    }
    expect(w.holeAlignment).toBeCloseTo(50 + 0.02 * 3, 4)
  })
  it('系统update返回undefined', () => {
    expect(sys.update(0, emMock, CHECK_INTERVAL)).toBeUndefined()
  })
  it('tick=0不触发', () => {
    sys.update(0, emMock, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入5个工匠后长度为5', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).riveters.push(makeWorker(i)) }
    expect((sys as any).riveters).toHaveLength(5)
  })
  it('大量工匠同时更新不抛出', () => {
    for (let i = 1; i <= 8; i++) {
      ;(sys as any).riveters.push(makeWorker(i, { holeAlignment: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(0, emMock, CHECK_INTERVAL)).not.toThrow()
  })
  it('holeAlignment和outputQuality同时增长验证', () => {
    const w = makeWorker(1, { holeAlignment: 50, outputQuality: 60 })
    ;(sys as any).riveters.push(w)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect(w.holeAlignment).toBeCloseTo(50 + 0.02, 5)
    expect(w.outputQuality).toBeCloseTo(60 + 0.01, 5)
  })
})

describe('CreatureRiveterSystem - 额外边界验证', () => {
  let sys: CreatureRiveterSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('holeAlignment=4.00时更新后4.02>4保留', () => {
    ;(sys as any).riveters.push({ id: 99, entityId: 99, holeAlignment: 4.00, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, emMock, CHECK_INTERVAL)
    expect((sys as any).riveters).toHaveLength(1)
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
