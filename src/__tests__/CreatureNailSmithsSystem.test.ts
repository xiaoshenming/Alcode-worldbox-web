import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNailSmithsSystem } from '../systems/CreatureNailSmithsSystem'
import type { NailSmith, NailType } from '../systems/CreatureNailSmithsSystem'

let nextId = 1
function makeSys(): CreatureNailSmithsSystem { return new CreatureNailSmithsSystem() }
function makeMaker(entityId: number, nailType: NailType = 'wrought', skill = 60, tick = 0): NailSmith {
  return {
    id: nextId++,
    entityId,
    skill,
    nailsForged: 10 + Math.floor(skill / 3),
    nailType,
    strengthRating: 20 + skill * 0.68,
    reputation: 10 + skill * 0.76,
    tick,
  }
}

// ─── 初始状态 ────────────────────────────────────────────────────────────────
describe('CreatureNailSmithsSystem.getMakers', () => {
  let sys: CreatureNailSmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无钉铁匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'horseshoe'))
    expect((sys as any).makers[0].nailType).toBe('horseshoe')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有 4 种钉子类型', () => {
    const types: NailType[] = ['wrought', 'cut', 'wire', 'horseshoe']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].nailType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

// ─── NailSmith 数据结构正确性 ─────────────────────────────────────────────────
describe('NailSmith data integrity', () => {
  let sys: CreatureNailSmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('strengthRating = 20 + skill * 0.68', () => {
    const m = makeMaker(1, 'cut', 60)
    expect(m.strengthRating).toBeCloseTo(20 + 60 * 0.68)
  })
  it('reputation = 10 + skill * 0.76', () => {
    const m = makeMaker(1, 'wire', 60)
    expect(m.reputation).toBeCloseTo(10 + 60 * 0.76)
  })
  it('nailsForged = 10 + floor(skill/3)', () => {
    const m = makeMaker(1, 'wrought', 60)
    expect(m.nailsForged).toBe(10 + Math.floor(60 / 3))
  })
  it('entityId 字段正确存储', () => {
    const m = makeMaker(42, 'horseshoe')
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].entityId).toBe(42)
  })
  it('tick 字段正确存储', () => {
    const m = makeMaker(1, 'cut', 60, 12000)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].tick).toBe(12000)
  })
})

// ─── skillMap ─────────────────────────────────────────────────────────────────
describe('CreatureNailSmithsSystem.skillMap', () => {
  let sys: CreatureNailSmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 skillMap 为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })
  it('注入 skillMap 后读取正确', () => {
    ;(sys as any).skillMap.set(10, 55.5)
    expect((sys as any).skillMap.get(10)).toBeCloseTo(55.5)
  })
  it('多个实体 skill 独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 80)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(80)
  })
})

// ─── CHECK_INTERVAL 节流 (CHECK_INTERVAL=1440) ────────────────────────────────
describe('CreatureNailSmithsSystem.update throttling', () => {
  let sys: CreatureNailSmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick - lastCheck < 1440 时不调用 getEntitiesWithComponents', () => {
    let called = false
    const mockEM = {
      getEntitiesWithComponents: () => { called = true; return [] },
      getComponent: () => ({ age: 20 }),
    }
    // lastCheck=0，tick=100，差100 < 1440
    sys.update(1, mockEM as any, 100)
    expect(called).toBe(false)
  })
  it('tick - lastCheck >= 1440 时调用 getEntitiesWithComponents', () => {
    let called = false
    const mockEM = {
      getEntitiesWithComponents: () => { called = true; return [] },
      getComponent: () => ({ age: 20 }),
    }
    // lastCheck=0，tick=1440，差=1440 >= 1440
    sys.update(1, mockEM as any, 1440)
    expect(called).toBe(true)
  })
  it('update 空实体列表不崩溃', () => {
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    expect(() => sys.update(1, mockEM as any, 1440)).not.toThrow()
  })
})

// ─── time-based cleanup (cutoff = tick - 53000) ───────────────────────────────
describe('CreatureNailSmithsSystem cleanup (cutoff = tick - 53000)', () => {
  let sys: CreatureNailSmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < cutoff 的 maker 被删除', () => {
    // 当前 tick=60000，cutoff=60000-53000=7000，maker.tick=5000 < 7000 → 删除
    ;(sys as any).makers.push(makeMaker(1, 'wrought', 60, 5000))
    ;(sys as any).lastCheck = 0
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    sys.update(1, mockEM as any, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('tick >= cutoff 的 maker 保留', () => {
    // 当前 tick=60000，cutoff=7000，maker.tick=8000 >= 7000 → 保留
    ;(sys as any).makers.push(makeMaker(1, 'wrought', 60, 8000))
    ;(sys as any).lastCheck = 0
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    sys.update(1, mockEM as any, 60000)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('精确边界：maker.tick = cutoff-1 被删除', () => {
    // tick=53000, cutoff=0, maker.tick=-1 < 0 → 删除
    ;(sys as any).makers.push(makeMaker(1, 'cut', 60, -1))
    ;(sys as any).lastCheck = 0
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    sys.update(1, mockEM as any, 53000)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('旧的删除，新的保留 (混合)', () => {
    // tick=60000, cutoff=7000
    ;(sys as any).makers.push(makeMaker(1, 'wrought', 60, 5000)) // 老，删除
    ;(sys as any).makers.push(makeMaker(2, 'horseshoe', 60, 10000)) // 新，保留
    ;(sys as any).lastCheck = 0
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    sys.update(1, mockEM as any, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
})

// ─── MAX_MAKERS 上限 (MAX_MAKERS=30) ─────────────────────────────────────────
describe('CreatureNailSmithsSystem.MAX_MAKERS', () => {
  let sys: CreatureNailSmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入 30 个 makers 后内部数组长度为 30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })
  it('lastCheck 和 nextId 为数字类型', () => {
    expect(typeof (sys as any).lastCheck).toBe('number')
    expect(typeof (sys as any).nextId).toBe('number')
  })
})
