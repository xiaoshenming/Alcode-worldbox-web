import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureReedCuttersSystem } from '../systems/CreatureReedCuttersSystem'
import type { ReedCutter, ReedProduct } from '../systems/CreatureReedCuttersSystem'

let nextId = 1
function makeSys(): CreatureReedCuttersSystem { return new CreatureReedCuttersSystem() }
function makeCutter(entityId: number, product: ReedProduct = 'thatch', overrides: Partial<ReedCutter> = {}): ReedCutter {
  return { id: nextId++, entityId, skill: 70, bundlesHarvested: 40, product, efficiency: 65, reputation: 45, tick: 0, ...overrides }
}

/**
 * 构造满足 ReedCuttersSystem 的 EntityManager mock。
 * getEntitiesWithComponents 返回 ids；
 * getComponent 返回带 age 的 creature 对象；
 * hasComponent 用于 pruneDeadEntities。
 */
function makeEm(
  ids: number[] = [],
  age = 10,
  hasComponentFn?: (id: number, type: string) => boolean,
) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue(ids),
    getEntitiesWithComponents: vi.fn().mockReturnValue(ids),
    getComponent: vi.fn().mockReturnValue({ type: 'creature', age }),
    hasComponent: vi.fn().mockImplementation(hasComponentFn ?? (() => true)),
  } as any
}

const CHECK_INTERVAL = 1400
const EXPIRE_AFTER = 50000

describe('CreatureReedCuttersSystem — 基础状态', () => {
  let sys: CreatureReedCuttersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无芦苇割工', () => { expect((sys as any).cutters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).cutters.push(makeCutter(1, 'basket'))
    expect((sys as any).cutters[0].product).toBe('basket')
  })
  it('返回内部引用', () => {
    ;(sys as any).cutters.push(makeCutter(1))
    expect((sys as any).cutters).toBe((sys as any).cutters)
  })
  it('支持所有4种产品', () => {
    const products: ReedProduct[] = ['thatch', 'basket', 'mat', 'rope']
    products.forEach((p, i) => { ;(sys as any).cutters.push(makeCutter(i + 1, p)) })
    const all = (sys as any).cutters
    products.forEach((p, i) => { expect(all[i].product).toBe(p) })
  })
  it('多个全部返回', () => {
    ;(sys as any).cutters.push(makeCutter(1))
    ;(sys as any).cutters.push(makeCutter(2))
    expect((sys as any).cutters).toHaveLength(2)
  })
})

describe('CreatureReedCuttersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureReedCuttersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 未达 CHECK_INTERVAL 时 lastCheck 不更新', () => {
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发更新', () => {
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('间隔不足时第二次 update 不触发', () => {
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('间隔满足时 lastCheck 持续推进', () => {
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureReedCuttersSystem — skillMap 技能增长与上限', () => {
  let sys: CreatureReedCuttersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('新生物首次处理后 skillMap 中有对应条目', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // CRAFT_CHANCE 概率通过
    const em = makeEm([42], 15)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).skillMap.has(42)).toBe(true)
  })

  it('skillMap 中技能值不超过 100', () => {
    // 预先设置技能接近上限
    ;(sys as any).skillMap.set(1, 99.95)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], 15)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).skillMap.get(1)).toBeLessThanOrEqual(100)
  })

  it('同一实体再次被处理，技能在原有基础上增长 SKILL_GROWTH(0.065)', () => {
    ;(sys as any).skillMap.set(5, 30)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([5], 15)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    const newSkill = (sys as any).skillMap.get(5)
    expect(newSkill).toBeCloseTo(30.065, 5)
  })

  it('age < 8 的生物不被招募进 skillMap', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // age=5，低于阈值
    const em = makeEm([10], 5)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    // 不应在 cutters 中产生记录
    expect((sys as any).cutters).toHaveLength(0)
  })
})

describe('CreatureReedCuttersSystem — product 与 bundlesHarvested 映射', () => {
  let sys: CreatureReedCuttersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill < 25 时 product 为 thatch（索引 0）', () => {
    ;(sys as any).skillMap.set(1, 10)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], 15)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    const c = (sys as any).cutters[0] as ReedCutter
    expect(c.product).toBe('thatch')
  })

  it('skill >= 75 时 product 为 rope（索引 3）', () => {
    ;(sys as any).skillMap.set(2, 75)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([2], 15)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    const c = (sys as any).cutters[0] as ReedCutter
    expect(c.product).toBe('rope')
  })

  it('bundlesHarvested 随 skill 增加', () => {
    ;(sys as any).skillMap.set(3, 10)
    ;(sys as any).skillMap.set(4, 60)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([3, 4], 15)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    const cutters = (sys as any).cutters as ReedCutter[]
    const low = cutters.find(c => c.entityId === 3)!
    const high = cutters.find(c => c.entityId === 4)!
    expect(high.bundlesHarvested).toBeGreaterThan(low.bundlesHarvested)
  })
})

describe('CreatureReedCuttersSystem — time-based cleanup（tick 过期移除）', () => {
  let sys: CreatureReedCuttersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 过期（< cutoff）的 cutter 被移除', () => {
    const currentTick = EXPIRE_AFTER + CHECK_INTERVAL
    // 插入一个 tick=0 的 cutter（0 < currentTick - EXPIRE_AFTER = CHECK_INTERVAL）
    ;(sys as any).cutters.push(makeCutter(1, 'thatch', { tick: 0 }))
    // 让 getEntitiesWithComponents 返回空，避免招募逻辑干扰
    const em = makeEm([], 10)
    sys.update(1, em, currentTick)
    expect((sys as any).cutters).toHaveLength(0)
  })

  it('tick 未过期的 cutter 保留', () => {
    const currentTick = CHECK_INTERVAL
    // cutter.tick = CHECK_INTERVAL，cutoff = CHECK_INTERVAL - EXPIRE_AFTER < 0，不会过期
    ;(sys as any).cutters.push(makeCutter(1, 'mat', { tick: CHECK_INTERVAL }))
    const em = makeEm([], 10)
    sys.update(1, em, currentTick)
    expect((sys as any).cutters).toHaveLength(1)
  })

  it('部分过期：旧的移除，新的保留', () => {
    const currentTick = EXPIRE_AFTER + CHECK_INTERVAL
    const cutoff = currentTick - EXPIRE_AFTER // = CHECK_INTERVAL
    // tick < cutoff => 移除
    ;(sys as any).cutters.push(makeCutter(1, 'thatch', { tick: cutoff - 1 }))
    // tick >= cutoff => 保留
    ;(sys as any).cutters.push(makeCutter(2, 'basket', { tick: cutoff }))
    const em = makeEm([], 10)
    sys.update(1, em, currentTick)
    const cutters = (sys as any).cutters as ReedCutter[]
    expect(cutters).toHaveLength(1)
    expect(cutters[0].entityId).toBe(2)
  })

  it('所有 cutter 均未过期时不移除任何', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).cutters.push(makeCutter(1, 'rope', { tick: currentTick }))
    ;(sys as any).cutters.push(makeCutter(2, 'mat', { tick: currentTick }))
    const em = makeEm([], 10)
    sys.update(1, em, currentTick)
    expect((sys as any).cutters).toHaveLength(2)
  })
})

describe('CreatureReedCuttersSystem — MAX_CUTTERS 上限', () => {
  let sys: CreatureReedCuttersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已达 MAX_CUTTERS(32) 时不再新增', () => {
    // 直接填满 cutters（tick 设为当前 tick，不会过期）
    const currentTick = CHECK_INTERVAL
    for (let i = 1; i <= 32; i++) {
      ;(sys as any).cutters.push(makeCutter(i, 'thatch', { tick: currentTick }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 提供若干实体，理论上可以被招募
    const em = makeEm([100, 101, 102], 15)
    sys.update(1, em, currentTick)
    vi.restoreAllMocks()
    // cutter 数量不超过 32（招募逻辑 break 保证）
    expect((sys as any).cutters.length).toBeLessThanOrEqual(32)
  })
})
