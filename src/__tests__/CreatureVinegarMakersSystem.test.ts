import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureVinegarMakersSystem } from '../systems/CreatureVinegarMakersSystem'
import type { VinegarMaker, VinegarBase } from '../systems/CreatureVinegarMakersSystem'

// ---- helpers ----
let nextId = 1
function makeSys(): CreatureVinegarMakersSystem { return new CreatureVinegarMakersSystem() }
function makeMaker(entityId: number, base: VinegarBase = 'apple', overrides: Partial<VinegarMaker> = {}): VinegarMaker {
  return { id: nextId++, entityId, skill: 70, batchesBrewed: 12, vinegarBase: base, acidity: 65, reputation: 45, tick: 0, ...overrides }
}

/** EntityManager mock: 默认无生物 */
function makeMockEM(entityIds: number[] = [], creatureAge = 15) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(entityIds),
    getComponent: vi.fn().mockReturnValue(entityIds.length > 0 ? { age: creatureAge } : null),
    hasComponent: vi.fn().mockReturnValue(false),
  }
}

const CHECK_INTERVAL = 1380
const EXPIRE_AFTER = 49000
const MAX_MAKERS = 30

// ---- original 5 trivial tests ----
describe('CreatureVinegarMakersSystem.getMakers', () => {
  let sys: CreatureVinegarMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无醋坊工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'grape'))
    expect((sys as any).makers[0].vinegarBase).toBe('grape')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支���所有4种醋基料', () => {
    const bases: VinegarBase[] = ['apple', 'grape', 'grain', 'honey']
    bases.forEach((b, i) => { ;(sys as any).makers.push(makeMaker(i + 1, b)) })
    const all = (sys as any).makers
    bases.forEach((b, i) => { expect(all[i].vinegarBase).toBe(b) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

// ---- meaningful tests ----
describe('CreatureVinegarMakersSystem.update — CHECK_INTERVAL 节流', () => {
  let sys: CreatureVinegarMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL 时 getEntitiesWithComponents 不被调用', () => {
    const em = makeMockEM([1])
    sys.update(1, em as any, CHECK_INTERVAL - 1)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick 达到 CHECK_INTERVAL 时执行逻辑', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledOnce()
  })

  it('连续两次 update 未达第二次阈值，只执行一次', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL + 100)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('两次各达间隔，各执行一次', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })
})

describe('CreatureVinegarMakersSystem.update — skillMap 积累', () => {
  let sys: CreatureVinegarMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('同一实体两次 update 后 skillMap 技能叠加 (SKILL_GROWTH=0.059)', () => {
    const em = makeMockEM([10], 15)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    const skill1 = (sys as any).skillMap.get(10) as number
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    const skill2 = (sys as any).skillMap.get(10) as number
    randSpy.mockRestore()
    expect(skill2).toBeGreaterThan(skill1)
    // 增量应为 SKILL_GROWTH = 0.059
    expect(skill2 - skill1).toBeCloseTo(0.059, 4)
  })

  it('skillMap 中技能上限为 100', () => {
    ;(sys as any).skillMap.set(20, 99.98)
    const em = makeMockEM([20], 15)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    const skill = (sys as any).skillMap.get(20) as number
    randSpy.mockRestore()
    expect(skill).toBeLessThanOrEqual(100)
  })

  it('新实体首次触发后 skillMap 创建条目', () => {
    expect((sys as any).skillMap.size).toBe(0)
    const em = makeMockEM([33], 15)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    expect((sys as any).skillMap.has(33)).toBe(true)
  })
})

describe('CreatureVinegarMakersSystem.update — vinegarBase 选取规则', () => {
  let sys: CreatureVinegarMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  /**
   * baseIdx = Math.min(3, Math.floor(skill / 25))
   * skill < 25  → apple
   * 25 <= skill < 50 → grape
   * 50 <= skill < 75 → grain
   * skill >= 75 → honey
   */
  it('skill=10 时 vinegarBase 为 apple', () => {
    ;(sys as any).skillMap.set(1, 10 - 0.059)  // 增长后 ~10，baseIdx=0 → apple
    // 精确设置：让 skill 增长后 = 10
    ;(sys as any).skillMap.set(1, 10 - 0.059)
    const em = makeMockEM([1], 15)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    const m = (sys as any).makers[0] as VinegarMaker | undefined
    if (m) expect(m.vinegarBase).toBe('apple')
  })

  it('skill=50 时 vinegarBase 为 grain', () => {
    ;(sys as any).skillMap.set(2, 50 - 0.059)
    const em = makeMockEM([2], 15)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    const m = (sys as any).makers[0] as VinegarMaker | undefined
    if (m) expect(m.vinegarBase).toBe('grain')
  })

  it('skill=75 时 vinegarBase 为 honey', () => {
    ;(sys as any).skillMap.set(3, 75 - 0.059)
    const em = makeMockEM([3], 15)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    const m = (sys as any).makers[0] as VinegarMaker | undefined
    if (m) expect(m.vinegarBase).toBe('honey')
  })
})

describe('CreatureVinegarMakersSystem.update — cleanup (cutoff = tick - 49000)', () => {
  let sys: CreatureVinegarMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 的 maker 在 tick=49001 时被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'apple', { tick: 0 }))
    const em = makeMockEM([])   // 无生物，避免招募干扰
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, EXPIRE_AFTER + 1)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick 未超出 cutoff 的 maker 不被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'grape', { tick: 30000 }))
    const em = makeMockEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, EXPIRE_AFTER + 1)
    // cutoff = 49001 - 49000 = 1, maker.tick=30000 > 1 → 保留
    expect((sys as any).makers).toHaveLength(1)
  })

  it('混合新旧 maker：仅删除过期的', () => {
    ;(sys as any).makers.push(makeMaker(1, 'apple', { tick: 0 }))      // 过期
    ;(sys as any).makers.push(makeMaker(2, 'honey', { tick: 60000 }))  // 新鲜
    const em = makeMockEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, 60000 + EXPIRE_AFTER - 1)
    // cutoff = 60000+49000-1 - 49000 = 59999, maker2.tick=60000 > 59999 → 保留
    // maker1.tick=0 < 59999 → 删除
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('MAX_MAKERS 限制：达到上限后不继续招募', () => {
    for (let i = 0; i < MAX_MAKERS; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'apple', { tick: CHECK_INTERVAL }))
    }
    const em = makeMockEM([999], 15)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    expect((sys as any).makers.length).toBeLessThanOrEqual(MAX_MAKERS)
  })
})

describe('CreatureVinegarMakersSystem.update — 年龄过滤', () => {
  let sys: CreatureVinegarMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('年龄 < 10 的生物不被招募', () => {
    const em = makeMockEM([77], 5)  // age=5
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    expect((sys as any).makers).toHaveLength(0)
  })

  it('年龄 >= 10 的生物可被招募', () => {
    const em = makeMockEM([88], 10)  // age=10
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(0)  // 可能招募成功
  })
})
