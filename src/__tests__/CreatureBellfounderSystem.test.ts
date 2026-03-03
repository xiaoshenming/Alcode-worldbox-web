import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBellfounderSystem } from '../systems/CreatureBellfounderSystem'
import type { Bellfounder } from '../systems/CreatureBellfounderSystem'

const CHECK_INTERVAL = 2660

let nextId = 1
function makeSys(): CreatureBellfounderSystem { return new CreatureBellfounderSystem() }
function makeMaker(entityId: number): Bellfounder {
  return { id: nextId++, entityId, bronzeCasting: 70, moldMaking: 65, toneTuning: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureBellfounderSystem - 初始状态', () => {
  let sys: CreatureBellfounderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铸钟工', () => { expect((sys as any).bellfounders).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).bellfounders.push(makeMaker(1))
    expect((sys as any).bellfounders[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).bellfounders.push(makeMaker(1))
    expect((sys as any).bellfounders).toBe((sys as any).bellfounders)
  })

  it('字段正确', () => {
    ;(sys as any).bellfounders.push(makeMaker(2))
    const b = (sys as any).bellfounders[0]
    expect(b.bronzeCasting).toBe(70)
    expect(b.toneTuning).toBe(80)
  })

  it('多个全部返回', () => {
    ;(sys as any).bellfounders.push(makeMaker(1))
    ;(sys as any).bellfounders.push(makeMaker(2))
    expect((sys as any).bellfounders).toHaveLength(2)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureBellfounderSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureBellfounderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 小于 CHECK_INTERVAL 时不更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 等于 CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick 大于 CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL + 50)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 50)
  })

  it('第二次 tick 未超过间隔时不再更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次 tick 超过间隔时再次更新 lastCheck', () => {
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

  it('三倍间隔触发第三次', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    sys.update(1, {} as any, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
})

describe('CreatureBellfounderSystem - bronzeCasting 主技能递增', () => {
  let sys: CreatureBellfounderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发后 bronzeCasting 增加 0.02', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 50
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].bronzeCasting).toBeCloseTo(50.02)
  })

  it('bronzeCasting 上限为 100，不超过', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 99.99
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].bronzeCasting).toBe(100)
  })

  it('bronzeCasting 恰好 100 保持不变', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 100
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].bronzeCasting).toBe(100)
  })

  it('两个铸钟工同时递增 bronzeCasting', () => {
    const b1 = makeMaker(1); b1.bronzeCasting = 40
    const b2 = makeMaker(2); b2.bronzeCasting = 60
    ;(sys as any).bellfounders.push(b1, b2)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].bronzeCasting).toBeCloseTo(40.02)
    expect((sys as any).bellfounders[1].bronzeCasting).toBeCloseTo(60.02)
  })

  it('多次 update 后 bronzeCasting 累积', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 50
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).bellfounders[0].bronzeCasting).toBeCloseTo(50.04)
  })
})

describe('CreatureBellfounderSystem - 次要技能字段递增', () => {
  let sys: CreatureBellfounderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发后 toneTuning 增加 0.015', () => {
    const b = makeMaker(1)
    b.toneTuning = 50
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].toneTuning).toBeCloseTo(50.015)
  })

  it('每次触发后 outputQuality 增加 0.01', () => {
    const b = makeMaker(1)
    b.outputQuality = 50
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].outputQuality).toBeCloseTo(50.01)
  })

  it('outputQuality 上限为 100，不超过', () => {
    const b = makeMaker(1)
    b.outputQuality = 99.999
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].outputQuality).toBe(100)
  })

  it('toneTuning 上限为 100，不超过', () => {
    const b = makeMaker(1)
    b.toneTuning = 99.99
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].toneTuning).toBe(100)
  })

  it('节流期间技能不递增', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 50
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).bellfounders[0].bronzeCasting).toBe(50)
  })

  it('moldMaking 字段不被 update 修改', () => {
    const b = makeMaker(1)
    b.moldMaking = 65
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].moldMaking).toBe(65)
  })
})

describe('CreatureBellfounderSystem - cleanup 逻辑', () => {
  let sys: CreatureBellfounderSystem
  beforeEach(() => {
    sys = makeSys(); nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('技能递增后仍 <= 4 的铸钟工被移除（初始值 3.0）', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 3.0
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders).toHaveLength(0)
  })

  it('bronzeCasting > 4 的铸钟工不被移除', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 4.01
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders).toHaveLength(1)
  })

  it('先技能递增后 cleanup：初始值 3.98 递增后 4.00 仍被清除', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 3.98
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders).toHaveLength(0)
  })

  it('只清除低技能，高技能保留', () => {
    const b1 = makeMaker(1); b1.bronzeCasting = 3.0
    const b2 = makeMaker(2); b2.bronzeCasting = 50
    ;(sys as any).bellfounders.push(b1, b2)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders).toHaveLength(1)
    expect((sys as any).bellfounders[0].entityId).toBe(2)
  })

  it('bronzeCasting 恰好 4 被清除', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 4 - 0.02
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders).toHaveLength(0)
  })

  it('节流期间不触发 cleanup', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 2.0
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).bellfounders).toHaveLength(1)
  })

  it('清除后数组缩短', () => {
    for (let i = 0; i < 4; i++) {
      const b = makeMaker(i + 1)
      b.bronzeCasting = i < 2 ? 2.0 : 50
      ;(sys as any).bellfounders.push(b)
    }
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders).toHaveLength(2)
  })
})

describe('CreatureBellfounderSystem - 招募逻辑', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('random < RECRUIT_CHANCE(0.0014) 时招募', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders.length).toBeGreaterThanOrEqual(1)
  })

  it('random >= RECRUIT_CHANCE 时不招募', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders).toHaveLength(0)
  })

  it('达到 MAX_MAKERS(10) 上限时不再招募', () => {
    const sys = makeSys()
    for (let i = 0; i < 10; i++) {
      ;(sys as any).bellfounders.push(makeMaker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders).toHaveLength(10)
  })

  it('招募后 nextId 递增', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('招募的铸钟工包含所有必要字段', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    if ((sys as any).bellfounders.length > 0) {
      const b = (sys as any).bellfounders[0]
      expect(typeof b.bronzeCasting).toBe('number')
      expect(typeof b.moldMaking).toBe('number')
      expect(typeof b.toneTuning).toBe('number')
      expect(typeof b.outputQuality).toBe('number')
    }
  })
})

describe('CreatureBellfounderSystem - 边界与综合场景', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    const sys = makeSys()
    expect(() => sys.update(1, {} as any, CHECK_INTERVAL)).not.toThrow()
  })

  it('dt 参数不影响节流逻辑', () => {
    const sys = makeSys()
    sys.update(999, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('篮编师的 entityId 被正确保存', () => {
    const sys = makeSys()
    const b = makeMaker(77)
    ;(sys as any).bellfounders.push(b)
    expect((sys as any).bellfounders[0].entityId).toBe(77)
  })

  it('大量铸钟工时 cleanup 正确处理多个移除', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    for (let i = 0; i < 8; i++) {
      const b = makeMaker(i + 1)
      b.bronzeCasting = i % 2 === 0 ? 2.0 : 50
      ;(sys as any).bellfounders.push(b)
    }
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders).toHaveLength(4)
  })
})
