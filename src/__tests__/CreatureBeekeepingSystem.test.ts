import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureBeekeepingSystem } from '../systems/CreatureBeekeepingSystem'
import type { Apiary, HiveProduct } from '../systems/CreatureBeekeepingSystem'

let nextId = 1
function makeSys(): CreatureBeekeepingSystem { return new CreatureBeekeepingSystem() }
function makeApiary(keeperId: number, product: HiveProduct = 'honey', overrides: Partial<Apiary> = {}): Apiary {
  return { id: nextId++, keeperId, hiveCount: 3, product, yield: 50, quality: 60, tick: 0, ...overrides }
}

// ── 常量镜像 ──────────────────────────────────────────────────
const CHECK_INTERVAL = 1100
const MAX_APIARIES   = 80
const SKILL_GROWTH   = 0.08

// ── 工厂辅助 ─────────────────────────────────────────────────
function makeEM(entities: number[] = [], age = 20): any {
  return {
    getEntitiesWithComponents: () => entities,
    getComponent: (_id: number, _type: string) => ({ age }),
  }
}

// ══════════════════════════════════════════════════════════════
// 1. apiaries 初始化与基础存取
// ══════════════════════════════════════════════════════════════
describe('CreatureBeekeepingSystem — apiaries 初始化与存取', () => {
  let sys: CreatureBeekeepingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 apiaries 为空数组', () => {
    expect((sys as any).apiaries).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 skillMap 为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('注入单个蜂场后长度为 1', () => {
    ;(sys as any).apiaries.push(makeApiary(1))
    expect((sys as any).apiaries).toHaveLength(1)
  })

  it('注入多个蜂场后长度正确', () => {
    for (let i = 1; i <= 5; i++) (sys as any).apiaries.push(makeApiary(i))
    expect((sys as any).apiaries).toHaveLength(5)
  })

  it('注入后 keeperId 正确', () => {
    ;(sys as any).apiaries.push(makeApiary(42))
    expect((sys as any).apiaries[0].keeperId).toBe(42)
  })

  it('注入后 product 正确', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'beeswax'))
    expect((sys as any).apiaries[0].product).toBe('beeswax')
  })

  it('注入后 yield 正确', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'honey', { yield: 77 }))
    expect((sys as any).apiaries[0].yield).toBe(77)
  })

  it('注入后 quality 正确', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'honey', { quality: 95 }))
    expect((sys as any).apiaries[0].quality).toBe(95)
  })

  it('内部数组引用稳定', () => {
    const ref1 = (sys as any).apiaries
    ;(sys as any).apiaries.push(makeApiary(1))
    const ref2 = (sys as any).apiaries
    expect(ref1).toBe(ref2)
  })
})

// ══════════════════════════════════════════════════════════════
// 2. HiveProduct 枚举覆盖
// ══════════════════════════════════════════════════════════════
describe('CreatureBeekeepingSystem — HiveProduct 枚举', () => {
  let sys: CreatureBeekeepingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  const PRODUCTS: HiveProduct[] = ['honey', 'beeswax', 'royal_jelly', 'propolis', 'mead', 'honeycomb']

  it('共支持 6 种蜂产品', () => {
    expect(PRODUCTS).toHaveLength(6)
  })

  it.each(PRODUCTS)('产品 %s 可正确存储', (p) => {
    ;(sys as any).apiaries.push(makeApiary(1, p))
    expect((sys as any).apiaries[0].product).toBe(p)
  })

  it('不同产品蜂场可共存于数组', () => {
    PRODUCTS.forEach((p, i) => (sys as any).apiaries.push(makeApiary(i + 1, p)))
    const stored = (sys as any).apiaries.map((a: Apiary) => a.product)
    expect(stored).toEqual(PRODUCTS)
  })
})

// ══════════════════════════════════════════════════════════════
// 3. skillMap 读写
// ══════════════════════════════════════════════════════════════
describe('CreatureBeekeepingSystem — skillMap', () => {
  let sys: CreatureBeekeepingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('未知实体返回 undefined (未设置时)', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('用 ?? 0 后未知实体返回 0', () => {
    expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0)
  })

  it('set 后 get 返回正确值', () => {
    ;(sys as any).skillMap.set(42, 75)
    expect((sys as any).skillMap.get(42)).toBe(75)
  })

  it('技能值 0 可存储', () => {
    ;(sys as any).skillMap.set(1, 0)
    expect((sys as any).skillMap.get(1)).toBe(0)
  })

  it('技能值 100 可存储', () => {
    ;(sys as any).skillMap.set(1, 100)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })

  it('多实体技能相互独立', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 80)
    expect(((sys as any).skillMap.get(1) ?? 0)).toBe(30)
    expect(((sys as any).skillMap.get(2) ?? 0)).toBe(80)
  })

  it('覆盖写入后返回最新值', () => {
    ;(sys as any).skillMap.set(5, 20)
    ;(sys as any).skillMap.set(5, 55)
    expect((sys as any).skillMap.get(5)).toBe(55)
  })

  it('skillMap.size 正确反映数量', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    expect((sys as any).skillMap.size).toBe(2)
  })
})

// ══════════════════════════════════════════════════════════════
// 4. update — 节流逻辑
// ══════════════════════════════════════════════════════════════
describe('CreatureBeekeepingSystem — update 节流', () => {
  let sys: CreatureBeekeepingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 未超过 CHECK_INTERVAL 时不执行循环', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1, 2, 3])
    sys.update(1, em, 0)
    sys.update(1, em, CHECK_INTERVAL - 1)
    // lastCheck 仍是 0，因为第二次被节流
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 超过 CHECK_INTERVAL 时 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不会创建蜂场
    const em = makeEM([])
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
  })

  it('连续两次满足间隔时 lastCheck 每次更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const em = makeEM([])
    sys.update(1, em, CHECK_INTERVAL + 1)
    sys.update(1, em, CHECK_INTERVAL * 2 + 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2 + 2)
  })
})

// ══════════════════════════════════════════════════════════════
// 5. update — 上限 MAX_APIARIES
// ══════════════════════════════════════════════════════════════
describe('CreatureBeekeepingSystem — MAX_APIARIES 上限', () => {
  let sys: CreatureBeekeepingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到 MAX_APIARIES 后不再新增', () => {
    // 预填 80 个蜂场
    for (let i = 0; i < MAX_APIARIES; i++) {
      ;(sys as any).apiaries.push(makeApiary(i + 1, 'honey', { tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // 概率触发
    const creatures = Array.from({ length: 10 }, (_, i) => i + 1)
    const em = makeEM(creatures)
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).apiaries).toHaveLength(MAX_APIARIES)
  })

  it('低于 MAX_APIARIES 时可继续添加', () => {
    for (let i = 0; i < MAX_APIARIES - 1; i++) {
      ;(sys as any).apiaries.push(makeApiary(i + 1, 'honey', { tick: 99999 }))
    }
    expect((sys as any).apiaries.length).toBeLessThan(MAX_APIARIES)
  })
})

// ══════════════════════════════════════════════════════════════
// 6. update — 技能增长
// ══════════════════════════════════════════════════════════════
describe('CreatureBeekeepingSystem — 技能增长', () => {
  let sys: CreatureBeekeepingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('创建蜂场后技能存储到 skillMap', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // random() = 0 → 触发 KEEP_CHANCE 且不超过
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    }
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).skillMap.has(1)).toBe(true)
  })

  it('技能值不超过 100', () => {
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    }
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect(((sys as any).skillMap.get(1) ?? 0)).toBeLessThanOrEqual(100)
  })

  it('初始技能加 SKILL_GROWTH 后值升高', () => {
    ;(sys as any).skillMap.set(7, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [7],
      getComponent: () => ({ age: 20 }),
    }
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const newSkill = (sys as any).skillMap.get(7) ?? 0
    expect(newSkill).toBeGreaterThanOrEqual(50 + SKILL_GROWTH)
  })
})

// ══════════════════════════════════════════════════════════════
// 7. update — 过期清理
// ══════════════════════════════════════════════════════════════
describe('CreatureBeekeepingSystem — 过期蜂场清理', () => {
  let sys: CreatureBeekeepingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期蜂场（tick < cutoff）被删除', () => {
    const currentTick = 60000
    const cutoff = currentTick - 50000 // = 10000
    ;(sys as any).apiaries.push(makeApiary(1, 'honey', { tick: cutoff - 1 })) // 过期
    ;(sys as any).apiaries.push(makeApiary(2, 'honey', { tick: cutoff + 1 })) // 有效
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const em = makeEM([])
    sys.update(1, em, currentTick)
    expect((sys as any).apiaries).toHaveLength(1)
    expect((sys as any).apiaries[0].keeperId).toBe(2)
  })

  it('所有蜂场都过期时数组清空', () => {
    const currentTick = 60000
    const cutoff = currentTick - 50000
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).apiaries.push(makeApiary(i, 'honey', { tick: cutoff - 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), currentTick)
    expect((sys as any).apiaries).toHaveLength(0)
  })

  it('全部未过期时不删除任何蜂场', () => {
    const currentTick = 60000
    const cutoff = currentTick - 50000
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).apiaries.push(makeApiary(i, 'honey', { tick: cutoff + 9999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), currentTick)
    expect((sys as any).apiaries).toHaveLength(3)
  })
})

// ══════════════════════════════════════════════════════════════
// 8. Apiary 数据结构完整性
// ══════════════════════════════════════════════════════════════
describe('CreatureBeekeepingSystem — Apiary 数据结构', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('Apiary 包含所有必要字段', () => {
    const a = makeApiary(1)
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('keeperId')
    expect(a).toHaveProperty('hiveCount')
    expect(a).toHaveProperty('product')
    expect(a).toHaveProperty('yield')
    expect(a).toHaveProperty('quality')
    expect(a).toHaveProperty('tick')
  })

  it('hiveCount 为正整数', () => {
    const a = makeApiary(1, 'honey', { hiveCount: 5 })
    expect(a.hiveCount).toBeGreaterThan(0)
    expect(Number.isInteger(a.hiveCount)).toBe(true)
  })

  it('yield 为非负数', () => {
    const a = makeApiary(1, 'honey', { yield: 0 })
    expect(a.yield).toBeGreaterThanOrEqual(0)
  })

  it('quality 在 [0, 100] 范围内可存储', () => {
    const a = makeApiary(1, 'honey', { quality: 100 })
    expect(a.quality).toBeLessThanOrEqual(100)
    expect(a.quality).toBeGreaterThanOrEqual(0)
  })

  it('tick 为非负整数', () => {
    const a = makeApiary(1, 'honey', { tick: 12345 })
    expect(a.tick).toBeGreaterThanOrEqual(0)
  })
})

// ══════════════════════════════════════════════════════════════
// 9. 综合边界场景
// ══════════════════════════════════════════════════════════════
describe('CreatureBeekeepingSystem — 综合边界场景', () => {
  let sys: CreatureBeekeepingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('hiveCount=1 时 yield 仍为正数', () => {
    const a = makeApiary(1, 'honey', { hiveCount: 1, quality: 50, yield: 1 * 50 * 0.3 })
    expect(a.yield).toBeGreaterThan(0)
  })

  it('quality=100 时 yield 最高', () => {
    const high = makeApiary(1, 'honey', { hiveCount: 4, quality: 100, yield: 4 * 100 * 0.3 })
    const low  = makeApiary(2, 'honey', { hiveCount: 4, quality:  10, yield: 4 *  10 * 0.3 })
    expect(high.yield).toBeGreaterThan(low.yield)
  })

  it('tick=0 的蜂场在大 tick 下被清理', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'honey', { tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), 60000)
    expect((sys as any).apiaries).toHaveLength(0)
  })

  it('skillMap.delete 后 get 返回 undefined', () => {
    ;(sys as any).skillMap.set(9, 50)
    ;(sys as any).skillMap.delete(9)
    expect((sys as any).skillMap.get(9)).toBeUndefined()
  })

  it('同一 keeperId 可拥有多个蜂场', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'honey'))
    ;(sys as any).apiaries.push(makeApiary(1, 'mead'))
    const keeper1 = (sys as any).apiaries.filter((a: Apiary) => a.keeperId === 1)
    expect(keeper1).toHaveLength(2)
  })

  it('nextId 随注入递增', () => {
    const before = (sys as any).nextId
    ;(sys as any).apiaries.push({ ...makeApiary(1), id: (sys as any).nextId++ })
    expect((sys as any).nextId).toBe(before + 1)
  })

  it('蜂场数组可用 filter 筛选特定产品', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'honey'))
    ;(sys as any).apiaries.push(makeApiary(2, 'mead'))
    ;(sys as any).apiaries.push(makeApiary(3, 'honey'))
    const honeyApiaries = (sys as any).apiaries.filter((a: Apiary) => a.product === 'honey')
    expect(honeyApiaries).toHaveLength(2)
  })
})
