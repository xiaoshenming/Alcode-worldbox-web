import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureBookbinderSystem } from '../systems/CreatureBookbinderSystem'
import type { Bookbinder, BindingStyle } from '../systems/CreatureBookbinderSystem'

let nextId = 1
function makeSys(): CreatureBookbinderSystem { return new CreatureBookbinderSystem() }
function makeBookbinder(entityId: number, style: BindingStyle = 'coptic', overrides: Partial<Bookbinder> = {}): Bookbinder {
  return { id: nextId++, entityId, skill: 30, booksBound: 5, style, pageCount: 100, durability: 60, tick: 0, ...overrides }
}

// 常量镜像
const CHECK_INTERVAL = 1300
const MAX_BOOKBINDERS = 38
const SKILL_GROWTH    = 0.07

function makeEM(entities: number[] = [], age = 20): any {
  return {
    getEntitiesWithComponents: () => entities,
    getComponent: (_id: number, _type: string) => ({ age }),
  }
}

// ══════════════════════════════════════════════════════════════
// 1. bookbinders 初始化与基础存取
// ══════════════════════════════════════════════════════════════
describe('CreatureBookbinderSystem — bookbinders 初始化与存取', () => {
  let sys: CreatureBookbinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 bookbinders 为空数组', () => {
    expect((sys as any).bookbinders).toHaveLength(0)
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

  it('注入单个装订师后长度为 1', () => {
    ;(sys as any).bookbinders.push(makeBookbinder(1))
    expect((sys as any).bookbinders).toHaveLength(1)
  })

  it('注入多个装订师后长度正确', () => {
    for (let i = 1; i <= 5; i++) (sys as any).bookbinders.push(makeBookbinder(i))
    expect((sys as any).bookbinders).toHaveLength(5)
  })

  it('注入后 entityId 正确', () => {
    ;(sys as any).bookbinders.push(makeBookbinder(99))
    expect((sys as any).bookbinders[0].entityId).toBe(99)
  })

  it('注入后 style 正确', () => {
    ;(sys as any).bookbinders.push(makeBookbinder(1, 'leather_bound'))
    expect((sys as any).bookbinders[0].style).toBe('leather_bound')
  })

  it('注入后 durability 正确', () => {
    ;(sys as any).bookbinders.push(makeBookbinder(1, 'coptic', { durability: 88 }))
    expect((sys as any).bookbinders[0].durability).toBe(88)
  })

  it('注入后 pageCount 正确', () => {
    ;(sys as any).bookbinders.push(makeBookbinder(1, 'coptic', { pageCount: 250 }))
    expect((sys as any).bookbinders[0].pageCount).toBe(250)
  })

  it('内部数组引用稳定', () => {
    const ref1 = (sys as any).bookbinders
    ;(sys as any).bookbinders.push(makeBookbinder(1))
    expect(ref1).toBe((sys as any).bookbinders)
  })
})

// ══════════════════════════════════════════════════════════════
// 2. BindingStyle 枚举覆盖
// ══════════════════════════════════════════════════════════════
describe('CreatureBookbinderSystem — BindingStyle 枚举', () => {
  let sys: CreatureBookbinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  const STYLES: BindingStyle[] = ['coptic', 'perfect', 'saddle_stitch', 'leather_bound']

  it('共支持 4 种装订风格', () => {
    expect(STYLES).toHaveLength(4)
  })

  it.each(STYLES)('风格 %s 可正确存储', (s) => {
    ;(sys as any).bookbinders.push(makeBookbinder(1, s))
    expect((sys as any).bookbinders[0].style).toBe(s)
  })

  it('4 种风格可共存于数组', () => {
    STYLES.forEach((s, i) => (sys as any).bookbinders.push(makeBookbinder(i + 1, s)))
    const stored = (sys as any).bookbinders.map((b: Bookbinder) => b.style)
    expect(stored).toEqual(STYLES)
  })
})

// ══════════════════════════════════════════════════════════════
// 3. skillMap 读写
// ══════════════════════════════════════════════════════════════
describe('CreatureBookbinderSystem — skillMap', () => {
  let sys: CreatureBookbinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('未知实体返回 undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('用 ?? 0 后未知实体返回 0', () => {
    expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0)
  })

  it('set 后 get 返回正确值', () => {
    ;(sys as any).skillMap.set(42, 85)
    expect((sys as any).skillMap.get(42)).toBe(85)
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
    ;(sys as any).skillMap.set(1, 40)
    ;(sys as any).skillMap.set(2, 90)
    expect(((sys as any).skillMap.get(1) ?? 0)).toBe(40)
    expect(((sys as any).skillMap.get(2) ?? 0)).toBe(90)
  })

  it('覆盖写入后返回最新值', () => {
    ;(sys as any).skillMap.set(3, 10)
    ;(sys as any).skillMap.set(3, 60)
    expect((sys as any).skillMap.get(3)).toBe(60)
  })

  it('skillMap.size 正确反映条目数', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    ;(sys as any).skillMap.set(3, 30)
    expect((sys as any).skillMap.size).toBe(3)
  })
})

// ══════════════════════════════════════════════════════════════
// 4. update — 节流逻辑
// ══════════════════════════════════════════════════════════════
describe('CreatureBookbinderSystem — update 节流', () => {
  let sys: CreatureBookbinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 未超过 CHECK_INTERVAL 时 lastCheck 不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), 0)
    sys.update(1, makeEM([]), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 超过 CHECK_INTERVAL 时 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
  })

  it('连续两次满足间隔时 lastCheck 均更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), CHECK_INTERVAL + 1)
    sys.update(1, makeEM([]), CHECK_INTERVAL * 2 + 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2 + 2)
  })

  it('节流期间 bookbinders 数组不变', () => {
    ;(sys as any).bookbinders.push(makeBookbinder(1, 'coptic', { tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeEM([1, 2]), CHECK_INTERVAL - 1)
    // 节流，数量不变
    expect((sys as any).bookbinders).toHaveLength(1)
  })
})

// ══════════════════════════════════════════════════════════════
// 5. update — MAX_BOOKBINDERS 上限
// ══════════════════════════════════════════════════════════════
describe('CreatureBookbinderSystem — MAX_BOOKBINDERS 上限', () => {
  let sys: CreatureBookbinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到 MAX_BOOKBINDERS 后不再新增', () => {
    for (let i = 0; i < MAX_BOOKBINDERS; i++) {
      ;(sys as any).bookbinders.push(makeBookbinder(i + 1, 'coptic', { tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const entities = Array.from({ length: 10 }, (_, i) => i + 1)
    sys.update(1, makeEM(entities), CHECK_INTERVAL + 1)
    expect((sys as any).bookbinders).toHaveLength(MAX_BOOKBINDERS)
  })

  it('低于上限时数组长度不受限制', () => {
    for (let i = 0; i < MAX_BOOKBINDERS - 1; i++) {
      ;(sys as any).bookbinders.push(makeBookbinder(i + 1))
    }
    expect((sys as any).bookbinders.length).toBeLessThan(MAX_BOOKBINDERS)
  })
})

// ══════════════════════════════════════════════════════════════
// 6. update — 技能增长
// ══════════════════════════════════════════════════════════════
describe('CreatureBookbinderSystem — 技能增长', () => {
  let sys: CreatureBookbinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('创建装订记录后技能存储到 skillMap', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
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

  it('已有技能加 SKILL_GROWTH 后值升高', () => {
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
describe('CreatureBookbinderSystem — 过期装订记录清理', () => {
  let sys: CreatureBookbinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期记录被删除', () => {
    const currentTick = 50000
    const cutoff = currentTick - 45000 // = 5000
    ;(sys as any).bookbinders.push(makeBookbinder(1, 'coptic', { tick: cutoff - 1 })) // 过期
    ;(sys as any).bookbinders.push(makeBookbinder(2, 'perfect', { tick: cutoff + 1 })) // 有效
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), currentTick)
    expect((sys as any).bookbinders).toHaveLength(1)
    expect((sys as any).bookbinders[0].entityId).toBe(2)
  })

  it('所有记录过期时数组清空', () => {
    const currentTick = 50000
    const cutoff = currentTick - 45000
    for (let i = 1; i <= 4; i++) {
      ;(sys as any).bookbinders.push(makeBookbinder(i, 'coptic', { tick: cutoff - 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), currentTick)
    expect((sys as any).bookbinders).toHaveLength(0)
  })

  it('未过期记录不被删除', () => {
    const currentTick = 50000
    const cutoff = currentTick - 45000
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).bookbinders.push(makeBookbinder(i, 'perfect', { tick: cutoff + 9000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), currentTick)
    expect((sys as any).bookbinders).toHaveLength(3)
  })
})

// ══════════════════════════════════════════════════════════════
// 8. Bookbinder 数据结构完整性
// ══════════════════════════════════════════════════════════════
describe('CreatureBookbinderSystem — Bookbinder 数据结构', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('Bookbinder 包含所有必要字段', () => {
    const b = makeBookbinder(1)
    expect(b).toHaveProperty('id')
    expect(b).toHaveProperty('entityId')
    expect(b).toHaveProperty('skill')
    expect(b).toHaveProperty('booksBound')
    expect(b).toHaveProperty('style')
    expect(b).toHaveProperty('pageCount')
    expect(b).toHaveProperty('durability')
    expect(b).toHaveProperty('tick')
  })

  it('pageCount 为正整数', () => {
    const b = makeBookbinder(1, 'coptic', { pageCount: 200 })
    expect(b.pageCount).toBeGreaterThan(0)
    expect(Number.isInteger(b.pageCount)).toBe(true)
  })

  it('skill 在合法范围内', () => {
    const b = makeBookbinder(1, 'coptic', { skill: 75 })
    expect(b.skill).toBeGreaterThanOrEqual(0)
    expect(b.skill).toBeLessThanOrEqual(100)
  })

  it('durability 为非负数', () => {
    const b = makeBookbinder(1, 'coptic', { durability: 0 })
    expect(b.durability).toBeGreaterThanOrEqual(0)
  })

  it('booksBound 为正整数', () => {
    const b = makeBookbinder(1, 'coptic', { booksBound: 3 })
    expect(b.booksBound).toBeGreaterThan(0)
    expect(Number.isInteger(b.booksBound)).toBe(true)
  })

  it('tick 为非负数', () => {
    const b = makeBookbinder(1, 'coptic', { tick: 9999 })
    expect(b.tick).toBeGreaterThanOrEqual(0)
  })
})

// ══════════════════════════════════════════════════════════════
// 9. 综合边界场景
// ══════════════════════════════════════════════════════════════
describe('CreatureBookbinderSystem — 综合边界场景', () => {
  let sys: CreatureBookbinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('pageCount=20 时为最小值', () => {
    const b = makeBookbinder(1, 'coptic', { pageCount: 20 })
    expect(b.pageCount).toBeGreaterThanOrEqual(20)
  })

  it('pageCount 上限 500 可存储', () => {
    const b = makeBookbinder(1, 'coptic', { pageCount: 500 })
    expect(b.pageCount).toBe(500)
  })

  it('tick=0 的记录在大 tick 下被清理', () => {
    ;(sys as any).bookbinders.push(makeBookbinder(1, 'coptic', { tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), 50000)
    expect((sys as any).bookbinders).toHaveLength(0)
  })

  it('skillMap.delete 后 get 返回 undefined', () => {
    ;(sys as any).skillMap.set(9, 50)
    ;(sys as any).skillMap.delete(9)
    expect((sys as any).skillMap.get(9)).toBeUndefined()
  })

  it('同一 entityId 可拥有多条装订记录', () => {
    ;(sys as any).bookbinders.push(makeBookbinder(1, 'coptic'))
    ;(sys as any).bookbinders.push(makeBookbinder(1, 'perfect'))
    const e1 = (sys as any).bookbinders.filter((b: Bookbinder) => b.entityId === 1)
    expect(e1).toHaveLength(2)
  })

  it('nextId 随注入递增', () => {
    const before = (sys as any).nextId
    ;(sys as any).bookbinders.push({ ...makeBookbinder(1), id: (sys as any).nextId++ })
    expect((sys as any).nextId).toBe(before + 1)
  })

  it('可用 filter 筛选特定风格', () => {
    ;(sys as any).bookbinders.push(makeBookbinder(1, 'coptic'))
    ;(sys as any).bookbinders.push(makeBookbinder(2, 'perfect'))
    ;(sys as any).bookbinders.push(makeBookbinder(3, 'coptic'))
    const coptic = (sys as any).bookbinders.filter((b: Bookbinder) => b.style === 'coptic')
    expect(coptic).toHaveLength(2)
  })
})
