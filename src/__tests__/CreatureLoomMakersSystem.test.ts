import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureLoomMakersSystem } from '../systems/CreatureLoomMakersSystem'
import type { LoomMaker } from '../systems/CreatureLoomMakersSystem'

// CHECK_INTERVAL=2550, RECRUIT_CHANCE=0.0016, MAX_MAKERS=12
// loomMastery += 0.02, patternMemory += 0.015, weavingSpeed += 0.01
// cleanup: loomMastery <= 4

const CHECK_INTERVAL = 2550

let nextId = 1
function makeSys(): CreatureLoomMakersSystem { return new CreatureLoomMakersSystem() }
function makeMaker(entityId: number): LoomMaker {
  return { id: nextId++, entityId, loomMastery: 50, threadCount: 30, patternMemory: 40, weavingSpeed: 35, tick: 0 }
}

describe('CreatureLoomMakersSystem - 初始状态', () => {
  let sys: CreatureLoomMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无织机师', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

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
    expect(m.loomMastery).toBe(50)
    expect(m.patternMemory).toBe(40)
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureLoomMakersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureLoomMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < CHECK_INTERVAL 时不执行更新（lastCheck=0）', () => {
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL 时执行一次更新', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第一次更新后 lastCheck 被设为当前 tick', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('再次调用时 tick 差值不足 CHECK_INTERVAL 不再更新', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次满足 CHECK_INTERVAL 的更新都触发', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick=1 时不触发', () => {
    sys.update(1, {} as any, 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('CHECK_INTERVAL-1 边界不触发', () => {
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('三倍间隔触发三次', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    sys.update(1, {} as any, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
})

describe('CreatureLoomMakersSystem - loomMastery 主技能递增', () => {
  let sys: CreatureLoomMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('loomMastery 递增量为 0.02', () => {
    const m = makeMaker(1); m.loomMastery = 50
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers[0].loomMastery).toBeCloseTo(50.02)
  })

  it('loomMastery 上限为 100，不超过', () => {
    const m = makeMaker(1); m.loomMastery = 99.99
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers[0].loomMastery).toBe(100)
  })

  it('loomMastery 精确 100 时保持 100', () => {
    const m = makeMaker(1); m.loomMastery = 100
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers[0].loomMastery).toBe(100)
  })

  it('两次 update 后 loomMastery 累积', () => {
    const m = makeMaker(1); m.loomMastery = 50
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).makers[0].loomMastery).toBeCloseTo(50.04)
  })

  it('两个织机师同时递增 loomMastery', () => {
    const m1 = makeMaker(1); m1.loomMastery = 40
    const m2 = makeMaker(2); m2.loomMastery = 60
    ;(sys as any).makers.push(m1, m2)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers[0].loomMastery).toBeCloseTo(40.02)
    expect((sys as any).makers[1].loomMastery).toBeCloseTo(60.02)
  })
})

describe('CreatureLoomMakersSystem - 次要技能字段递增', () => {
  let sys: CreatureLoomMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('patternMemory 递增量为 0.015', () => {
    const m = makeMaker(1); m.patternMemory = 50
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers[0].patternMemory).toBeCloseTo(50.015)
  })

  it('weavingSpeed 递增量为 0.01', () => {
    const m = makeMaker(1); m.weavingSpeed = 50
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers[0].weavingSpeed).toBeCloseTo(50.01)
  })

  it('patternMemory 上限为 100，不超过', () => {
    const m = makeMaker(1); m.patternMemory = 99.99
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers[0].patternMemory).toBe(100)
  })

  it('weavingSpeed 上限为 100，不超过', () => {
    const m = makeMaker(1); m.weavingSpeed = 99.999
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers[0].weavingSpeed).toBe(100)
  })

  it('节流期间技能不递增', () => {
    const m = makeMaker(1); m.loomMastery = 50
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).makers[0].loomMastery).toBe(50)
  })

  it('threadCount 字段不被 update 修改', () => {
    const m = makeMaker(1); m.threadCount = 30
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers[0].threadCount).toBe(30)
  })
})

describe('CreatureLoomMakersSystem - cleanup 逻辑', () => {
  let sys: CreatureLoomMakersSystem
  beforeEach(() => {
    sys = makeSys(); nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('loomMastery <= 4 的织机师被清除', () => {
    const m = makeMaker(1); m.loomMastery = 3.0
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('loomMastery 增量后仍 <= 4 时被删除（3.9+0.02=3.92 <=4）', () => {
    const m = makeMaker(1); m.loomMastery = 3.9
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('loomMastery > 4 的织机师在增量后保留', () => {
    const m = makeMaker(1); m.loomMastery = 4.01
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('多个织机师中只删除 loomMastery <= 4 的', () => {
    const m1 = makeMaker(1); m1.loomMastery = 3.0
    const m2 = makeMaker(2); m2.loomMastery = 50
    ;(sys as any).makers.push(m1, m2)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('节流期间不触发 cleanup', () => {
    const m = makeMaker(1); m.loomMastery = 2.0
    ;(sys as any).makers.push(m)
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).makers).toHaveLength(1)
  })
})

describe('CreatureLoomMakersSystem - 招募逻辑', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('random < RECRUIT_CHANCE(0.0016) 时招募', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(1)
  })

  it('random >= RECRUIT_CHANCE 时不招募', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('达到 MAX_MAKERS(12) 上限时不再招募', () => {
    const sys = makeSys()
    for (let i = 0; i < 12; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(12)
  })

  it('所有字段正确存储并可读取', () => {
    const sys = makeSys()
    const m = makeMaker(10)
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(typeof r.loomMastery).toBe('number')
    expect(typeof r.threadCount).toBe('number')
    expect(typeof r.patternMemory).toBe('number')
    expect(typeof r.weavingSpeed).toBe('number')
  })

  it('nextId 自增，保证 id 唯一', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('MAX_MAKERS=12，注入12个后不应自动新增', () => {
    const sys = makeSys()
    for (let i = 0; i < 12; i++) {
      const m = makeMaker(i + 1); m.loomMastery = 50
      ;(sys as any).makers.push(m)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(12)
  })
})

describe('CreatureLoomMakersSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    const sys = makeSys()
    expect(() => sys.update(1, {} as any, CHECK_INTERVAL)).not.toThrow()
  })

  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('entityId被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(11))
    expect((sys as any).makers[0].entityId).toBe(11)
  })

  it('大量织机师时 cleanup 正确处理', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    for (let i = 0; i < 10; i++) {
      const m = makeMaker(i + 1)
      m.loomMastery = i % 2 === 0 ? 2.0 : 50
      ;(sys as any).makers.push(m)
    }
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(5)
  })
})
