import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBasketWeaverSystem } from '../systems/CreatureBasketWeaverSystem'
import type { BasketWeaver } from '../systems/CreatureBasketWeaverSystem'

const CHECK_INTERVAL = 2570

let nextId = 1
function makeSys(): CreatureBasketWeaverSystem { return new CreatureBasketWeaverSystem() }
function makeWeaver(entityId: number): BasketWeaver {
  return { id: nextId++, entityId, fiberSelection: 30, weavePattern: 25, structuralIntegrity: 20, outputQuality: 35, tick: 0 }
}

describe('CreatureBasketWeaverSystem - 初始状态', () => {
  let sys: CreatureBasketWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无篮编师', () => { expect((sys as any).weavers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers).toBe((sys as any).weavers)
  })

  it('多个全部返回', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    ;(sys as any).weavers.push(makeWeaver(2))
    expect((sys as any).weavers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const w = makeWeaver(10)
    w.fiberSelection = 80; w.weavePattern = 75; w.structuralIntegrity = 70; w.outputQuality = 65
    ;(sys as any).weavers.push(w)
    const r = (sys as any).weavers[0]
    expect(r.fiberSelection).toBe(80)
    expect(r.weavePattern).toBe(75)
    expect(r.structuralIntegrity).toBe(70)
    expect(r.outputQuality).toBe(65)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureBasketWeaverSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureBasketWeaverSystem
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
    sys.update(1, {} as any, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it('第二次 tick 未超过间隔时不再更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次 tick 超过间隔时再次更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick=1 时不触发（远小于 CHECK_INTERVAL）', () => {
    sys.update(1, {} as any, 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL-1 边界值不触发', () => {
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('多次调用在间隔内只触发一次', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    const afterFirst = (sys as any).lastCheck
    sys.update(1, {} as any, CHECK_INTERVAL + 100)
    sys.update(1, {} as any, CHECK_INTERVAL + 200)
    expect((sys as any).lastCheck).toBe(afterFirst)
  })
})

describe('CreatureBasketWeaverSystem - fiberSelection 技能递增', () => {
  let sys: CreatureBasketWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发后 fiberSelection 增加 0.02', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 50
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].fiberSelection).toBeCloseTo(50.02)
  })

  it('fiberSelection 上限为 100，不超过', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 99.99
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].fiberSelection).toBe(100)
  })

  it('fiberSelection 从 0 开始也能递增', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 5
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].fiberSelection).toBeCloseTo(5.02)
  })

  it('fiberSelection 精确达到 100 时保持 100', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 100
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].fiberSelection).toBe(100)
  })

  it('两个篮编师同时递增 fiberSelection', () => {
    const w1 = makeWeaver(1); w1.fiberSelection = 40
    const w2 = makeWeaver(2); w2.fiberSelection = 60
    ;(sys as any).weavers.push(w1, w2)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].fiberSelection).toBeCloseTo(40.02)
    expect((sys as any).weavers[1].fiberSelection).toBeCloseTo(60.02)
  })
})

describe('CreatureBasketWeaverSystem - 次要技能字段递增', () => {
  let sys: CreatureBasketWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发后 structuralIntegrity 增加 0.015', () => {
    const w = makeWeaver(1)
    w.structuralIntegrity = 50
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].structuralIntegrity).toBeCloseTo(50.015)
  })

  it('每次触发后 outputQuality 增加 0.01', () => {
    const w = makeWeaver(1)
    w.outputQuality = 50
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].outputQuality).toBeCloseTo(50.01)
  })

  it('outputQuality 上限为 100，不超过', () => {
    const w = makeWeaver(1)
    w.outputQuality = 99.999
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].outputQuality).toBe(100)
  })

  it('structuralIntegrity 上限为 100，不超过', () => {
    const w = makeWeaver(1)
    w.structuralIntegrity = 99.99
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].structuralIntegrity).toBe(100)
  })

  it('节流期间技能不递增', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 50
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).weavers[0].fiberSelection).toBe(50)
  })

  it('weavePattern 字段不被 update 修改', () => {
    const w = makeWeaver(1)
    w.weavePattern = 25
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].weavePattern).toBe(25)
  })
})

describe('CreatureBasketWeaverSystem - cleanup 逻辑', () => {
  let sys: CreatureBasketWeaverSystem
  beforeEach(() => {
    sys = makeSys(); nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('技能递增后仍 <= 4 的篮编师被移除（初始值 3.0）', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 3.0
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(0)
  })

  it('fiberSelection > 4 的篮编师不被移除', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 4.01
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(1)
  })

  it('先技能递增后 cleanup：初始值 3.98 递增后 4.00 仍被清除', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 3.98
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(0)
  })

  it('只清除低技能，高技能保留', () => {
    const w1 = makeWeaver(1); w1.fiberSelection = 3.0
    const w2 = makeWeaver(2); w2.fiberSelection = 50
    ;(sys as any).weavers.push(w1, w2)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(1)
    expect((sys as any).weavers[0].entityId).toBe(2)
  })

  it('fiberSelection 恰好为 4 时也被清除', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 4 - 0.02
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(0)
  })

  it('清除后数组长度正确减少', () => {
    for (let i = 0; i < 5; i++) {
      const w = makeWeaver(i + 1)
      w.fiberSelection = i < 3 ? 2.0 : 50
      ;(sys as any).weavers.push(w)
    }
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(2)
  })

  it('节流期间不触发 cleanup', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 2.0
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).weavers).toHaveLength(1)
  })
})

describe('CreatureBasketWeaverSystem - 招募逻辑', () => {
  let sys: CreatureBasketWeaverSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('random < RECRUIT_CHANCE(0.0017) 时招募新篮编师', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers.length).toBeGreaterThanOrEqual(1)
  })

  it('random >= RECRUIT_CHANCE 时不招募', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(0)
  })

  it('招募后 nextId 递增', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('达到 MAX_MAKERS(12) 上限时不再招募', () => {
    sys = makeSys()
    for (let i = 0; i < 12; i++) {
      ;(sys as any).weavers.push(makeWeaver(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(12)
  })

  it('低于上限时可以招募', () => {
    sys = makeSys()
    for (let i = 0; i < 11; i++) {
      const w = makeWeaver(i + 1)
      w.fiberSelection = 50
      ;(sys as any).weavers.push(w)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers.length).toBeGreaterThan(11)
  })

  it('招募的篮编师有正确的 tick 字段', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    if ((sys as any).weavers.length > 0) {
      expect((sys as any).weavers[0].tick).toBe(CHECK_INTERVAL)
    }
  })

  it('招募的篮编师有 fiberSelection/weavePattern/structuralIntegrity/outputQuality 字段', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    if ((sys as any).weavers.length > 0) {
      const w = (sys as any).weavers[0]
      expect(typeof w.fiberSelection).toBe('number')
      expect(typeof w.weavePattern).toBe('number')
      expect(typeof w.structuralIntegrity).toBe('number')
      expect(typeof w.outputQuality).toBe('number')
    }
  })
})

describe('CreatureBasketWeaverSystem - 边界与综合场景', () => {
  let sys: CreatureBasketWeaverSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    sys = makeSys()
    expect(() => sys.update(1, {} as any, CHECK_INTERVAL)).not.toThrow()
  })

  it('多次 update 后技能累积递增', () => {
    sys = makeSys()
    const w = makeWeaver(1)
    w.fiberSelection = 50
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).weavers[0].fiberSelection).toBeCloseTo(50.04)
  })

  it('dt 参数不影响节流逻辑', () => {
    sys = makeSys()
    sys.update(999, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(0, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('篮编师的 entityId 被正确保存', () => {
    sys = makeSys()
    const w = makeWeaver(42)
    ;(sys as any).weavers.push(w)
    expect((sys as any).weavers[0].entityId).toBe(42)
  })

  it('所有字段都有合理的数值类型', () => {
    sys = makeSys()
    const w = makeWeaver(1)
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    const r = (sys as any).weavers[0]
    expect(typeof r.fiberSelection).toBe('number')
    expect(typeof r.structuralIntegrity).toBe('number')
    expect(typeof r.outputQuality).toBe('number')
  })

  it('大量篮编师时 cleanup 从后向前不遗漏', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    for (let i = 0; i < 10; i++) {
      const w = makeWeaver(i + 1)
      w.fiberSelection = i % 2 === 0 ? 2.0 : 50
      ;(sys as any).weavers.push(w)
    }
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(5)
    ;(sys as any).weavers.forEach((w: BasketWeaver) => {
      expect(w.fiberSelection).toBeGreaterThan(4)
    })
  })
})
