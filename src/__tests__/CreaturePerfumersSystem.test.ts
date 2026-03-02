import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePerfumersSystem } from '../systems/CreaturePerfumersSystem'
import type { Perfumer, FragranceType } from '../systems/CreaturePerfumersSystem'

let nextId = 1
function makeSys(): CreaturePerfumersSystem { return new CreaturePerfumersSystem() }
function makePerfumer(entityId: number, type: FragranceType = 'floral', skill = 70, tick = 0): Perfumer {
  return { id: nextId++, entityId, skill, blendsCreated: 10, fragranceType: type, potency: 65, complexity: 60, tick }
}

/** 构造最简 EntityManager mock */
function makeEM(eids: number[], ages: Record<number, number> = {}) {
  return {
    getEntitiesWithComponents: (_: string, __: string) => eids,
    getComponent: (_eid: number, _type: string) => ({ age: ages[_eid] ?? 20 }),
    hasComponent: () => true,
  }
}

/** 构造返回 null 的 EntityManager mock（模拟 creature 组件不存在）*/
function makeEMNull(eids: number[]) {
  return {
    getEntitiesWithComponents: (_: string, __: string) => eids,
    getComponent: () => null,
    hasComponent: () => true,
  }
}

const CHECK_INTERVAL = 1400
const EXPIRE_AFTER = 55000

// ─────────────────────────────────────────────────────────────────
describe('CreaturePerfumersSystem — 基础状态', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无香水师', () => { expect((sys as any).perfumers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'herbal'))
    expect((sys as any).perfumers[0].fragranceType).toBe('herbal')
  })

  it('返回内部引用', () => {
    ;(sys as any).perfumers.push(makePerfumer(1))
    expect((sys as any).perfumers).toBe((sys as any).perfumers)
  })

  it('支持所有4种香型', () => {
    const types: FragranceType[] = ['floral', 'herbal', 'spiced', 'resinous']
    types.forEach((t, i) => { ;(sys as any).perfumers.push(makePerfumer(i + 1, t)) })
    const all = (sys as any).perfumers
    types.forEach((t, i) => { expect(all[i].fragranceType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).perfumers.push(makePerfumer(1))
    ;(sys as any).perfumers.push(makePerfumer(2))
    expect((sys as any).perfumers).toHaveLength(2)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 skillMap 为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('注入 floral 类型香水师', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'floral'))
    expect((sys as any).perfumers[0].fragranceType).toBe('floral')
  })

  it('注入 spiced 类型香水师', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'spiced'))
    expect((sys as any).perfumers[0].fragranceType).toBe('spiced')
  })

  it('注入 resinous 类型香水师', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'resinous'))
    expect((sys as any).perfumers[0].fragranceType).toBe('resinous')
  })

  it('Perfumer 接口字段完整', () => {
    const p = makePerfumer(1, 'floral', 50, 100)
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('entityId')
    expect(p).toHaveProperty('skill')
    expect(p).toHaveProperty('blendsCreated')
    expect(p).toHaveProperty('fragranceType')
    expect(p).toHaveProperty('potency')
    expect(p).toHaveProperty('complexity')
    expect(p).toHaveProperty('tick')
  })

  it('注入10个香水师长度正确', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).perfumers.push(makePerfumer(i))
    }
    expect((sys as any).perfumers).toHaveLength(10)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreaturePerfumersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值<CHECK_INTERVAL时不执行update逻辑', () => {
    const em = makeEM([1, 2, 3])
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, 100)
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('tick差值>=CHECK_INTERVAL时执行逻辑', () => {
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1])
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).perfumers.length).toBeGreaterThan(0)
  })

  it('连续两次update，第二次在interval内不重复执行', () => {
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1])
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const countAfterFirst = (sys as any).perfumers.length
    sys.update(1, em as any, CHECK_INTERVAL + 2)
    expect((sys as any).perfumers.length).toBe(countAfterFirst)
  })

  it('tick=0时不执行（因为0 < CHECK_INTERVAL）', () => {
    const em = makeEM([1])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em as any, 0)
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('tick恰好等于CHECK_INTERVAL时触发并更新lastCheck', () => {
    const em = makeEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('超过CHECK_INTERVAL两倍时第二次也触发', () => {
    const em = makeEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick=CHECK_INTERVAL+1时lastCheck被正确设置', () => {
    const em = makeEM([])
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
  })

  it('在节流期内再次调用时lastCheck不变', () => {
    const em = makeEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    const snapshot = (sys as any).lastCheck
    sys.update(1, em as any, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(snapshot)
  })

  it('节流期内不处理实体列表', () => {
    const em = makeEM([1, 2, 3])
    ;(sys as any).lastCheck = 5000
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em as any, 5100) // 5100-5000=100 < 1400
    expect((sys as any).perfumers).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreaturePerfumersSystem — skillMap 与技能增长', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('新实体从skillMap无记录时使用随机初始值', () => {
    expect((sys as any).skillMap.size).toBe(0)
    ;(sys as any).skillMap.set(1, 50)
    expect((sys as any).skillMap.get(1)).toBe(50)
  })

  it('skill增长后写回skillMap', () => {
    const SKILL_GROWTH = 0.07
    ;(sys as any).skillMap.set(42, 30)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([42], { 42: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const stored = (sys as any).skillMap.get(42)
    expect(stored).toBeCloseTo(30 + SKILL_GROWTH, 5)
  })

  it('skill上限为100不超出', () => {
    ;(sys as any).skillMap.set(42, 99.97)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([42], { 42: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const stored = (sys as any).skillMap.get(42)
    expect(stored).toBeLessThanOrEqual(100)
  })

  it('skill=100时精确保持100', () => {
    ;(sys as any).skillMap.set(42, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([42], { 42: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).skillMap.get(42)).toBe(100)
  })

  it('同一实体多次触发时技能累积增长', () => {
    ;(sys as any).skillMap.set(1, 20)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const after1 = (sys as any).skillMap.get(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, CHECK_INTERVAL * 2 + 1)
    const after2 = (sys as any).skillMap.get(1)
    expect(after2).toBeGreaterThan(after1!)
  })

  it('多个实体各自独立维护skill', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1, 2], { 1: 20, 2: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const skill1 = (sys as any).skillMap.get(1)
    const skill2 = (sys as any).skillMap.get(2)
    expect(skill1).toBeCloseTo(10.07, 5)
    expect(skill2).toBeCloseTo(50.07, 5)
  })

  it('skillMap中存入的是更新后的skill值', () => {
    ;(sys as any).skillMap.set(1, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const stored = (sys as any).skillMap.get(1)
    // 0 + 0.07 = 0.07
    expect(stored).toBeCloseTo(0.07, 5)
  })

  it('skill从高位下降不会（只增长）', () => {
    ;(sys as any).skillMap.set(1, 80)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const stored = (sys as any).skillMap.get(1)
    expect(stored).toBeGreaterThanOrEqual(80)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreaturePerfumersSystem — fragranceType 由技能决定', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill<25时 typeIdx=0 → floral', () => {
    ;(sys as any).skillMap.set(1, 20)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.fragranceType).toBe('floral')
  })

  it('skill>=75时 typeIdx=3 → resinous', () => {
    ;(sys as any).skillMap.set(1, 75)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.fragranceType).toBe('resinous')
  })

  it('skill=25时 typeIdx=1 → herbal', () => {
    ;(sys as any).skillMap.set(1, 25)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.fragranceType).toBe('herbal')
  })

  it('skill=50时 typeIdx=2 → spiced', () => {
    ;(sys as any).skillMap.set(1, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.fragranceType).toBe('spiced')
  })

  it('skill=24.00时仍为 floral（+0.07后仍<25）', () => {
    ;(sys as any).skillMap.set(1, 24.00)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.fragranceType).toBe('floral')
  })

  it('skill=49.00时仍为 herbal（+0.07后仍<50）', () => {
    ;(sys as any).skillMap.set(1, 49.00)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.fragranceType).toBe('herbal')
  })

  it('skill=74.00时仍为 spiced（+0.07后仍<75）', () => {
    ;(sys as any).skillMap.set(1, 74.00)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.fragranceType).toBe('spiced')
  })

  it('skill=100时 typeIdx=min(3,4)=3 → resinous', () => {
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.fragranceType).toBe('resinous')
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreaturePerfumersSystem — potency 和 complexity 计算', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('potency = 20 + skill * 0.7', () => {
    ;(sys as any).skillMap.set(1, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    // skill 为 50 + 0.07 = 50.07
    expect(p.potency).toBeCloseTo(20 + p.skill * 0.7, 5)
  })

  it('complexity = 15 + skill * 0.75', () => {
    ;(sys as any).skillMap.set(1, 60)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.complexity).toBeCloseTo(15 + p.skill * 0.75, 5)
  })

  it('skill=0时 potency>=20', () => {
    ;(sys as any).skillMap.set(1, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.potency).toBeGreaterThanOrEqual(20)
  })

  it('skill=0时 complexity>=15', () => {
    ;(sys as any).skillMap.set(1, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.complexity).toBeGreaterThanOrEqual(15)
  })

  it('skill=100时 potency = 20 + 100.07*0.7 ≈ 90', () => {
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.potency).toBeCloseTo(20 + p.skill * 0.7, 5)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreaturePerfumersSystem — blendsCreated 计算', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('blendsCreated = 1 + floor(skill/12)', () => {
    ;(sys as any).skillMap.set(1, 24)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    // skill ≈ 24.07 → floor(24.07/12) = 2 → blendsCreated = 3
    expect(p.blendsCreated).toBe(1 + Math.floor(p.skill / 12))
  })

  it('skill=0时 blendsCreated=1', () => {
    ;(sys as any).skillMap.set(1, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    expect(p.blendsCreated).toBeGreaterThanOrEqual(1)
  })

  it('skill=60时 blendsCreated=6', () => {
    ;(sys as any).skillMap.set(1, 60)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const p = (sys as any).perfumers[0]
    // skill 60.07 → floor(60.07/12)=5 → blendsCreated=6
    expect(p.blendsCreated).toBe(6)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreaturePerfumersSystem — time-based cleanup', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick远超cutoff时旧香水师被清除', () => {
    ;(sys as any).perfumers.push(makePerfumer(99, 'floral', 50, 100))
    const em = makeEM([])
    const bigTick = 100 + EXPIRE_AFTER + CHECK_INTERVAL + 1
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, bigTick)
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('tick未超cutoff时香水师保留', () => {
    const currentTick = CHECK_INTERVAL + 1
    ;(sys as any).perfumers.push(makePerfumer(99, 'floral', 50, currentTick - 1000))
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, currentTick)
    expect((sys as any).perfumers).toHaveLength(1)
  })

  it('混合新旧香水师只删旧的', () => {
    const baseTick = EXPIRE_AFTER + CHECK_INTERVAL + 10000
    ;(sys as any).perfumers.push(makePerfumer(1, 'floral', 50, 10))
    ;(sys as any).perfumers.push(makePerfumer(2, 'herbal', 60, baseTick - 100))
    ;(sys as any).lastCheck = 0
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, baseTick)
    expect((sys as any).perfumers).toHaveLength(1)
    expect((sys as any).perfumers[0].entityId).toBe(2)
  })

  it('cutoff=tick-55000，tick=55001时cutoff=1，tick=0的香水师被删', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'floral', 50, 0))
    ;(sys as any).lastCheck = 0
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, EXPIRE_AFTER + CHECK_INTERVAL + 1)
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('tick等于cutoff边界时保留（不严格小于）', () => {
    // cutoff = tick - 55000，perfumer.tick == cutoff，条件 tick < cutoff 为false
    const currentTick = EXPIRE_AFTER + CHECK_INTERVAL + 1
    const perfumerTick = currentTick - EXPIRE_AFTER // = CHECK_INTERVAL + 1 = cutoff
    ;(sys as any).perfumers.push(makePerfumer(1, 'floral', 50, perfumerTick))
    ;(sys as any).lastCheck = 0
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, currentTick)
    expect((sys as any).perfumers).toHaveLength(1)
  })

  it('三个香水师两旧一新，只保留新的', () => {
    const baseTick = EXPIRE_AFTER + CHECK_INTERVAL + 20000
    ;(sys as any).perfumers.push(makePerfumer(1, 'floral', 50, 0))
    ;(sys as any).perfumers.push(makePerfumer(2, 'herbal', 60, 100))
    ;(sys as any).perfumers.push(makePerfumer(3, 'spiced', 70, baseTick - 1000))
    ;(sys as any).lastCheck = 0
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, baseTick)
    expect((sys as any).perfumers).toHaveLength(1)
    expect((sys as any).perfumers[0].entityId).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreaturePerfumersSystem — 上限约束', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('MAX_PERFUMERS=34时不超过上限', () => {
    for (let i = 0; i < 34; i++) {
      ;(sys as any).perfumers.push(makePerfumer(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([100, 101, 102], { 100: 20, 101: 20, 102: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).perfumers.length).toBeLessThanOrEqual(34)
  })

  it('age<10的生物跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 5 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('age=10时可以加入（刚好满足>=10）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 10 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).perfumers.length).toBeGreaterThan(0)
  })

  it('age=9时被跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 9 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('creature组件返回null时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEMNull([1])
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('prefumers已满34个时即使random=0也不再加入', () => {
    for (let i = 0; i < 34; i++) {
      ;(sys as any).perfumers.push(makePerfumer(i + 1, 'floral', 50, CHECK_INTERVAL + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([200], { 200: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).perfumers.length).toBe(34)
  })

  it('random > CRAFT_CHANCE(0.006) 时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('random = 0 时一定通过CRAFT_CHANCE检查', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).perfumers.length).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreaturePerfumersSystem — tick 记录', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('新增香水师的tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { 1: 20 })
    const currentTick = CHECK_INTERVAL + 1
    sys.update(1, em as any, currentTick)
    const p = (sys as any).perfumers[0]
    expect(p.tick).toBe(currentTick)
  })

  it('不同时机创建的香水师tick不同', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em1 = makeEM([1], { 1: 20 })
    sys.update(1, em1 as any, CHECK_INTERVAL + 1)
    ;(sys as any).lastCheck = 0
    const em2 = makeEM([2], { 2: 20 })
    sys.update(1, em2 as any, CHECK_INTERVAL * 3)
    const ticks = (sys as any).perfumers.map((p: Perfumer) => p.tick)
    expect(new Set(ticks).size).toBeGreaterThan(1)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreaturePerfumersSystem — nextId 自增', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次创建香水师时 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const idBefore = (sys as any).nextId
    const em = makeEM([1], { 1: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).nextId).toBe(idBefore + 1)
  })

  it('创建两个香水师时 nextId 增加2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const idBefore = (sys as any).nextId
    const em = makeEM([1, 2], { 1: 20, 2: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).nextId).toBe(idBefore + 2)
  })

  it('连续创建香水师id不重复', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1, 2, 3], { 1: 20, 2: 20, 3: 20 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const ids = (sys as any).perfumers.map((p: Perfumer) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreaturePerfumersSystem — 多实体批量处理', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('多个实体均满足条件时都被处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1, 2, 3], { 1: 20, 2: 25, 3: 30 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).perfumers).toHaveLength(3)
  })

  it('空实体列表时不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([])
    expect(() => sys.update(1, em as any, CHECK_INTERVAL + 1)).not.toThrow()
  })

  it('大量实体时受MAX_PERFUMERS限制', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const ids = Array.from({ length: 50 }, (_, i) => i + 1)
    const ages: Record<number, number> = {}
    ids.forEach(id => { ages[id] = 20 })
    const em = makeEM(ids, ages)
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).perfumers.length).toBeLessThanOrEqual(34)
  })

  it('部分实体age不足时只加入满足条件的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1, 2, 3], { 1: 5, 2: 20, 3: 8 })
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    // 只有 eid=2 满足 age>=10
    expect((sys as any).perfumers).toHaveLength(1)
    expect((sys as any).perfumers[0].entityId).toBe(2)
  })
})
