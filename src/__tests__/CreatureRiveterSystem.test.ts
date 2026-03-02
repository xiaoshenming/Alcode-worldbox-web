import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureRiveterSystem } from '../systems/CreatureRiveterSystem'
import type { Riveter } from '../systems/CreatureRiveterSystem'

let nextId = 1
function makeSys(): CreatureRiveterSystem { return new CreatureRiveterSystem() }
function makeRiveter(entityId: number, overrides: Partial<Riveter> = {}): Riveter {
  return {
    id: nextId++,
    entityId,
    holeAlignment: 70,
    hammerWork: 65,
    jointStrength: 75,
    outputQuality: 80,
    tick: 0,
    ...overrides,
  }
}

const fakeEm = {
  getEntitiesWithComponents: () => [],
  getComponent: () => null,
} as any

describe('CreatureRiveterSystem - 基础状态', () => {
  let sys: CreatureRiveterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铆接工', () => { expect((sys as any).riveters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).riveters.push(makeRiveter(1))
    expect((sys as any).riveters[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).riveters.push(makeRiveter(1))
    expect((sys as any).riveters).toBe((sys as any).riveters)
  })
  it('字段正确', () => {
    ;(sys as any).riveters.push(makeRiveter(2))
    const r = (sys as any).riveters[0]
    expect(r.holeAlignment).toBe(70)
    expect(r.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).riveters.push(makeRiveter(1))
    ;(sys as any).riveters.push(makeRiveter(2))
    expect((sys as any).riveters).toHaveLength(2)
  })
})

describe('CreatureRiveterSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureRiveterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL 时 update 不执行技能增长', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 50 }))
    sys.update(1, fakeEm, 100)   // lastCheck=0, 100 < 2640
    expect((sys as any).riveters[0].holeAlignment).toBe(50)
  })

  it('tick 达到 CHECK_INTERVAL 时 update 执行技能增长', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 50 }))
    sys.update(1, fakeEm, 2640)  // 2640 - 0 >= 2640
    expect((sys as any).riveters[0].holeAlignment).toBeGreaterThan(50)
  })

  it('第一次 update 后 lastCheck 更新', () => {
    sys.update(1, fakeEm, 2640)
    expect((sys as any).lastCheck).toBe(2640)
  })

  it('连续两次 update，间隔不足时第二次跳过', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 50 }))
    sys.update(1, fakeEm, 2640)
    const afterFirst = (sys as any).riveters[0].holeAlignment
    sys.update(1, fakeEm, 2700)  // 2700 - 2640 = 60 < 2640
    expect((sys as any).riveters[0].holeAlignment).toBe(afterFirst)
  })

  it('两次 update 间隔满足 CHECK_INTERVAL 时均执行', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 50 }))
    sys.update(1, fakeEm, 2640)
    const afterFirst = (sys as any).riveters[0].holeAlignment
    sys.update(1, fakeEm, 5280)  // 5280 - 2640 = 2640
    expect((sys as any).riveters[0].holeAlignment).toBeGreaterThan(afterFirst)
  })
})

describe('CreatureRiveterSystem - 技能增长', () => {
  let sys: CreatureRiveterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('holeAlignment 每次 update 增加 0.02', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 50 }))
    sys.update(1, fakeEm, 2640)
    expect((sys as any).riveters[0].holeAlignment).toBeCloseTo(50.02, 5)
  })

  it('jointStrength 每次 update 增加 0.015', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { jointStrength: 50 }))
    sys.update(1, fakeEm, 2640)
    expect((sys as any).riveters[0].jointStrength).toBeCloseTo(50.015, 5)
  })

  it('outputQuality 每次 update 增加 0.01', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { outputQuality: 50 }))
    sys.update(1, fakeEm, 2640)
    expect((sys as any).riveters[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('holeAlignment 不超过 100 上限', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 100 }))
    sys.update(1, fakeEm, 2640)
    expect((sys as any).riveters[0].holeAlignment).toBe(100)
  })

  it('jointStrength 不超过 100 上限', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { jointStrength: 100 }))
    sys.update(1, fakeEm, 2640)
    expect((sys as any).riveters[0].jointStrength).toBe(100)
  })

  it('outputQuality 不超过 100 上限', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { outputQuality: 100 }))
    sys.update(1, fakeEm, 2640)
    expect((sys as any).riveters[0].outputQuality).toBe(100)
  })

  it('接近上限时精确截断：holeAlignment=99.99 增长后 = 100', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 99.99 }))
    sys.update(1, fakeEm, 2640)
    expect((sys as any).riveters[0].holeAlignment).toBe(100)
  })
})

describe('CreatureRiveterSystem - cleanup', () => {
  let sys: CreatureRiveterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('holeAlignment 增长后仍 <= 4 时被移除（holeAlignment=3，增长后 3.02 <= 4）', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 3 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, fakeEm, 2640)
    expect((sys as any).riveters).toHaveLength(0)
  })

  it('holeAlignment = 0 也被移除', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, fakeEm, 2640)
    expect((sys as any).riveters).toHaveLength(0)
  })

  it('holeAlignment 刚好在清除边界 3.98 处：update 后 3.98+0.02=4.00 仍被清除', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 3.98 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, fakeEm, 2640)
    // 3.98 + 0.02 = 4.00, 条件 <= 4，仍触发
    expect((sys as any).riveters).toHaveLength(0)
  })

  it('holeAlignment > 4 的铆接工被保留', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, fakeEm, 2640)
    expect((sys as any).riveters).toHaveLength(1)
  })

  it('混合情况：低值被移除、高值被保留', () => {
    ;(sys as any).riveters.push(makeRiveter(1, { holeAlignment: 3 }))
    ;(sys as any).riveters.push(makeRiveter(2, { holeAlignment: 50 }))
    ;(sys as any).riveters.push(makeRiveter(3, { holeAlignment: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, fakeEm, 2640)
    expect((sys as any).riveters).toHaveLength(1)
    expect((sys as any).riveters[0].entityId).toBe(2)
  })
})
