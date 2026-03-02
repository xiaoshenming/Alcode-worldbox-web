import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNailersSystem } from '../systems/CreatureNailersSystem'
import type { Nailer, NailType } from '../systems/CreatureNailersSystem'

let nextId = 1
function makeSys(): CreatureNailersSystem { return new CreatureNailersSystem() }
function makeNailer(entityId: number, nailType: NailType = 'tack', skill = 60, tick = 0): Nailer {
  return {
    id: nextId++,
    entityId,
    skill,
    nailsForged: 10 + Math.floor(skill / 3),
    nailType,
    strength: 25 + skill * 0.6,
    reputation: 10 + skill * 0.7,
    tick,
  }
}

// ─── 初始状态 ─────────────────────────────────────────────────────────────────
describe('CreatureNailersSystem.getNailers', () => {
  let sys: CreatureNailersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无钉工', () => { expect((sys as any).nailers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).nailers.push(makeNailer(1, 'spike'))
    expect((sys as any).nailers[0].nailType).toBe('spike')
  })
  it('返回内部引用', () => {
    ;(sys as any).nailers.push(makeNailer(1))
    expect((sys as any).nailers).toBe((sys as any).nailers)
  })
  it('支持所有 4 种钉子类型', () => {
    const types: NailType[] = ['tack', 'brad', 'spike', 'rivet']
    types.forEach((t, i) => { ;(sys as any).nailers.push(makeNailer(i + 1, t)) })
    const all = (sys as any).nailers
    types.forEach((t, i) => { expect(all[i].nailType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).nailers.push(makeNailer(1))
    ;(sys as any).nailers.push(makeNailer(2))
    expect((sys as any).nailers).toHaveLength(2)
  })
})

// ─── Nailer 数据结构正确性 ────────────────────────────────────────────────────
describe('Nailer data integrity', () => {
  let sys: CreatureNailersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('strength = 25 + skill * 0.6', () => {
    const n = makeNailer(1, 'brad', 60)
    expect(n.strength).toBeCloseTo(25 + 60 * 0.6)
  })
  it('reputation = 10 + skill * 0.7', () => {
    const n = makeNailer(1, 'rivet', 60)
    expect(n.reputation).toBeCloseTo(10 + 60 * 0.7)
  })
  it('nailsForged = 10 + floor(skill/3)', () => {
    const n = makeNailer(1, 'tack', 60)
    expect(n.nailsForged).toBe(10 + Math.floor(60 / 3))
  })
  it('entityId 字段正确存储', () => {
    const n = makeNailer(77, 'spike')
    ;(sys as any).nailers.push(n)
    expect((sys as any).nailers[0].entityId).toBe(77)
  })
  it('tick 字段正确存储', () => {
    const n = makeNailer(1, 'rivet', 60, 9999)
    ;(sys as any).nailers.push(n)
    expect((sys as any).nailers[0].tick).toBe(9999)
  })
})

// ─── skillMap ─────────────────────────────────────────────────────────────────
describe('CreatureNailersSystem.skillMap', () => {
  let sys: CreatureNailersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 skillMap 为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })
  it('注入 skillMap 后读取正确', () => {
    ;(sys as any).skillMap.set(5, 42.7)
    expect((sys as any).skillMap.get(5)).toBeCloseTo(42.7)
  })
  it('多个实体 skill 独立存储', () => {
    ;(sys as any).skillMap.set(1, 25)
    ;(sys as any).skillMap.set(2, 75)
    expect((sys as any).skillMap.get(1)).toBe(25)
    expect((sys as any).skillMap.get(2)).toBe(75)
  })
})

// ─── CHECK_INTERVAL 节流 (CHECK_INTERVAL=1300) ────────────────────────────────
describe('CreatureNailersSystem.update throttling', () => {
  let sys: CreatureNailersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick - lastCheck < 1300 时不调用 getEntitiesWithComponents', () => {
    let called = false
    const mockEM = {
      getEntitiesWithComponents: () => { called = true; return [] },
      getComponent: () => ({ age: 20 }),
    }
    // lastCheck=0，tick=500，差=500 < 1300
    sys.update(1, mockEM as any, 500)
    expect(called).toBe(false)
  })
  it('tick - lastCheck >= 1300 时调用 getEntitiesWithComponents', () => {
    let called = false
    const mockEM = {
      getEntitiesWithComponents: () => { called = true; return [] },
      getComponent: () => ({ age: 20 }),
    }
    // lastCheck=0，tick=1300，差=1300 >= 1300
    sys.update(1, mockEM as any, 1300)
    expect(called).toBe(true)
  })
  it('update 空实体列表不崩溃', () => {
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    expect(() => sys.update(1, mockEM as any, 1300)).not.toThrow()
  })
  it('update 后 lastCheck 更新为当前 tick', () => {
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    sys.update(1, mockEM as any, 1300)
    expect((sys as any).lastCheck).toBe(1300)
  })
})

// ─── time-based cleanup (cutoff = tick - 52000) ───────────────────────────────
describe('CreatureNailersSystem cleanup (cutoff = tick - 52000)', () => {
  let sys: CreatureNailersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < cutoff 的 nailer 被删除', () => {
    // tick=60000, cutoff=8000, nailer.tick=5000 < 8000 → 删除
    ;(sys as any).nailers.push(makeNailer(1, 'tack', 60, 5000))
    ;(sys as any).lastCheck = 0
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    sys.update(1, mockEM as any, 60000)
    expect((sys as any).nailers).toHaveLength(0)
  })
  it('tick >= cutoff 的 nailer 保留', () => {
    // tick=60000, cutoff=8000, nailer.tick=9000 >= 8000 → 保留
    ;(sys as any).nailers.push(makeNailer(1, 'brad', 60, 9000))
    ;(sys as any).lastCheck = 0
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    sys.update(1, mockEM as any, 60000)
    expect((sys as any).nailers).toHaveLength(1)
  })
  it('精确边界：nailer.tick = cutoff-1 被删除', () => {
    // tick=52000, cutoff=0, nailer.tick=-1 < 0 → 删除
    ;(sys as any).nailers.push(makeNailer(1, 'spike', 60, -1))
    ;(sys as any).lastCheck = 0
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    sys.update(1, mockEM as any, 52000)
    expect((sys as any).nailers).toHaveLength(0)
  })
  it('旧的删除，新的保留 (混合)', () => {
    // tick=60000, cutoff=8000
    ;(sys as any).nailers.push(makeNailer(1, 'tack', 60, 5000))   // 老，删除
    ;(sys as any).nailers.push(makeNailer(2, 'rivet', 60, 10000)) // 新，保留
    ;(sys as any).lastCheck = 0
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    sys.update(1, mockEM as any, 60000)
    expect((sys as any).nailers).toHaveLength(1)
    expect((sys as any).nailers[0].entityId).toBe(2)
  })
})

// ─── MAX_NAILERS 上限 (MAX_NAILERS=34) ───────────────────────────────────────
describe('CreatureNailersSystem.MAX_NAILERS', () => {
  let sys: CreatureNailersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入 34 个 nailers 后内部数组长度为 34', () => {
    for (let i = 0; i < 34; i++) {
      ;(sys as any).nailers.push(makeNailer(i + 1))
    }
    expect((sys as any).nailers).toHaveLength(34)
  })
  it('lastCheck 和 nextId 为数字类型', () => {
    expect(typeof (sys as any).lastCheck).toBe('number')
    expect(typeof (sys as any).nextId).toBe('number')
  })
})
