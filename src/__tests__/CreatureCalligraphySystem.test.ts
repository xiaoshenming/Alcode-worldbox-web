import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureCalligraphySystem } from '../systems/CreatureCalligraphySystem'
import type { CalligraphyWork, ScriptStyle } from '../systems/CreatureCalligraphySystem'

let nextId = 1
function makeSys(): CreatureCalligraphySystem { return new CreatureCalligraphySystem() }
function makeWork(authorId: number, style: ScriptStyle = 'flowing', overrides: Partial<CalligraphyWork> = {}): CalligraphyWork {
  return {
    id: nextId++, authorId, style, skill: 50,
    culturalValue: 30, content: 'test', preserved: false, tick: 0,
    ...overrides,
  }
}

// 常量镜像
const CHECK_INTERVAL = 1200
const MAX_WORKS      = 100
const SKILL_GROWTH   = 0.08

function makeEM(entities: number[] = [], age = 20): any {
  return {
    getEntitiesWithComponents: () => entities,
    getComponent: (_id: number, _type: string) => ({ age }),
  }
}

// ══════════════════════════════════════════════════════════════
// 1. getWorks — 初始化与基础存取
// ══════════════════════════════════════════════════════════════
describe('CreatureCalligraphySystem — getWorks 初始化与存取', () => {
  let sys: CreatureCalligraphySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无书法作品', () => {
    expect(sys.getWorks()).toHaveLength(0)
  })

  it('getWorks 返��同一内部数组', () => {
    expect(sys.getWorks()).toBe(sys.getWorks())
  })

  it('注入后 getWorks 长度为 1', () => {
    sys.getWorks().push(makeWork(1))
    expect(sys.getWorks()).toHaveLength(1)
  })

  it('注入多条后长度正确', () => {
    for (let i = 1; i <= 5; i++) sys.getWorks().push(makeWork(i))
    expect(sys.getWorks()).toHaveLength(5)
  })

  it('注入后 authorId 正确', () => {
    sys.getWorks().push(makeWork(99))
    expect(sys.getWorks()[0].authorId).toBe(99)
  })

  it('注入后 style 正确', () => {
    sys.getWorks().push(makeWork(1, 'runic'))
    expect(sys.getWorks()[0].style).toBe('runic')
  })

  it('注入后 skill 正确', () => {
    sys.getWorks().push(makeWork(1, 'flowing', { skill: 77 }))
    expect(sys.getWorks()[0].skill).toBe(77)
  })

  it('注入后 culturalValue 正确', () => {
    sys.getWorks().push(makeWork(1, 'flowing', { culturalValue: 95 }))
    expect(sys.getWorks()[0].culturalValue).toBe(95)
  })

  it('注入后 preserved 默认为 false', () => {
    sys.getWorks().push(makeWork(1))
    expect(sys.getWorks()[0].preserved).toBe(false)
  })

  it('注入后 preserved=true 可存储', () => {
    sys.getWorks().push(makeWork(1, 'flowing', { preserved: true }))
    expect(sys.getWorks()[0].preserved).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 2. ScriptStyle 枚举覆盖
// ══════════════════════════════════════════════════════════════
describe('CreatureCalligraphySystem — ScriptStyle 枚举', () => {
  let sys: CreatureCalligraphySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  const STYLES: ScriptStyle[] = ['pictographic', 'cuneiform', 'runic', 'flowing', 'geometric', 'symbolic']

  it('共支持 6 种书写风格', () => {
    expect(STYLES).toHaveLength(6)
  })

  it.each(STYLES)('风格 %s 可正确存储', (s) => {
    sys.getWorks().push(makeWork(1, s))
    expect(sys.getWorks()[0].style).toBe(s)
  })

  it('6 种风格可共存于数组', () => {
    STYLES.forEach((s, i) => sys.getWorks().push(makeWork(i + 1, s)))
    const stored = sys.getWorks().map((w) => w.style)
    expect(stored).toEqual(STYLES)
  })
})

// ══════════════════════════════════════════════════════════════
// 3. getByAuthor — 基础查询
// ══════════════════════════════════════════════════════════════
describe('CreatureCalligraphySystem — getByAuthor 基础查询', () => {
  let sys: CreatureCalligraphySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('无作品时返回空数组', () => {
    expect(sys.getByAuthor(999)).toHaveLength(0)
  })

  it('指定作者有 1 条时返回 1 条', () => {
    sys.getWorks().push(makeWork(1, 'runic'))
    expect(sys.getByAuthor(1)).toHaveLength(1)
  })

  it('指定作者有多条时全部返回', () => {
    sys.getWorks().push(makeWork(1, 'runic'))
    sys.getWorks().push(makeWork(1, 'flowing'))
    sys.getWorks().push(makeWork(1, 'symbolic'))
    expect(sys.getByAuthor(1)).toHaveLength(3)
  })

  it('不同作者互不干扰', () => {
    sys.getWorks().push(makeWork(1, 'runic'))
    sys.getWorks().push(makeWork(2, 'flowing'))
    sys.getWorks().push(makeWork(1, 'symbolic'))
    expect(sys.getByAuthor(1)).toHaveLength(2)
    expect(sys.getByAuthor(2)).toHaveLength(1)
  })

  it('结果为复用缓冲数组（非 works 本身）', () => {
    sys.getWorks().push(makeWork(1))
    expect(sys.getByAuthor(1)).not.toBe(sys.getWorks())
  })

  it('连续调用结果一致', () => {
    sys.getWorks().push(makeWork(1, 'runic'))
    const r1 = sys.getByAuthor(1).map(w => w.style)
    const r2 = sys.getByAuthor(1).map(w => w.style)
    expect(r1).toEqual(r2)
  })

  it('不存在的作者返回空', () => {
    sys.getWorks().push(makeWork(1))
    expect(sys.getByAuthor(999)).toHaveLength(0)
  })

  it('返回结果中每个 authorId 均匹配查询', () => {
    sys.getWorks().push(makeWork(5, 'runic'))
    sys.getWorks().push(makeWork(6, 'flowing'))
    sys.getWorks().push(makeWork(5, 'geometric'))
    const results = sys.getByAuthor(5)
    results.forEach(w => expect(w.authorId).toBe(5))
  })
})

// ══════════════════════════════════════════════════════════════
// 4. skillMap 读写
// ══════════════════════════════════════════════════════════════
describe('CreatureCalligraphySystem — skillMap', () => {
  let sys: CreatureCalligraphySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('未知实体 skillMap 返回 undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('用 ?? 0 后未知实体返回 0', () => {
    expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0)
  })

  it('set 后 get 正确', () => {
    ;(sys as any).skillMap.set(10, 55)
    expect((sys as any).skillMap.get(10)).toBe(55)
  })

  it('技能 0 可存储', () => {
    ;(sys as any).skillMap.set(1, 0)
    expect((sys as any).skillMap.get(1)).toBe(0)
  })

  it('技能 100 可存储', () => {
    ;(sys as any).skillMap.set(1, 100)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })

  it('多实体技能独立', () => {
    ;(sys as any).skillMap.set(1, 20)
    ;(sys as any).skillMap.set(2, 70)
    expect((sys as any).skillMap.get(1)).toBe(20)
    expect((sys as any).skillMap.get(2)).toBe(70)
  })

  it('覆盖写入返回最新值', () => {
    ;(sys as any).skillMap.set(3, 10)
    ;(sys as any).skillMap.set(3, 99)
    expect((sys as any).skillMap.get(3)).toBe(99)
  })
})

// ══════════════════════════════════════════════════════════════
// 5. update — 节流逻辑
// ══════════════════════════════════════════════════════════════
describe('CreatureCalligraphySystem — update 节流', () => {
  let sys: CreatureCalligraphySystem
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

  it('连续两次满足间隔时每次更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), CHECK_INTERVAL + 1)
    sys.update(1, makeEM([]), CHECK_INTERVAL * 2 + 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2 + 2)
  })
})

// ══════════════════════════════════════════════════════════════
// 6. update — MAX_WORKS 上限
// ══════════════════════════════════════════════════════════════
describe('CreatureCalligraphySystem — MAX_WORKS 上限', () => {
  let sys: CreatureCalligraphySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到 MAX_WORKS 后不再新增', () => {
    for (let i = 0; i < MAX_WORKS; i++) {
      sys.getWorks().push(makeWork(i + 1, 'flowing', { tick: 99999, preserved: true }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const entities = Array.from({ length: 10 }, (_, i) => i + 1)
    sys.update(1, makeEM(entities), CHECK_INTERVAL + 1)
    expect(sys.getWorks()).toHaveLength(MAX_WORKS)
  })
})

// ══════════════════════════════════════════════════════════════
// 7. update — 技能增长
// ══════════════════════════════════════════════════════════════
describe('CreatureCalligraphySystem — 技能增长', () => {
  let sys: CreatureCalligraphySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('创作后技能存入 skillMap', () => {
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

  it('已有技能增长后高于原值', () => {
    ;(sys as any).skillMap.set(5, 40)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [5],
      getComponent: () => ({ age: 20 }),
    }
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    const newSkill = (sys as any).skillMap.get(5) ?? 0
    expect(newSkill).toBeGreaterThanOrEqual(40 + SKILL_GROWTH)
  })
})

// ══════════════════════════════════════════════════════════════
// 8. update — 过期非保留作品清理
// ══════════════════════════════════════════════════════════════
describe('CreatureCalligraphySystem — 过期作品清理', () => {
  let sys: CreatureCalligraphySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期且非保留的作品被删除', () => {
    const currentTick = 10000
    const cutoff = currentTick - 8000 // = 2000
    sys.getWorks().push(makeWork(1, 'runic', { tick: cutoff - 1, preserved: false })) // 过期非保留
    sys.getWorks().push(makeWork(2, 'flowing', { tick: cutoff + 1, preserved: false })) // 未过期
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), currentTick)
    expect(sys.getWorks()).toHaveLength(1)
    expect(sys.getWorks()[0].authorId).toBe(2)
  })

  it('保留作品即使过期也不删除', () => {
    const currentTick = 10000
    const cutoff = currentTick - 8000
    sys.getWorks().push(makeWork(1, 'runic', { tick: cutoff - 9999, preserved: true }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), currentTick)
    expect(sys.getWorks()).toHaveLength(1)
  })

  it('全部过期且非保留时数组清空', () => {
    const currentTick = 10000
    const cutoff = currentTick - 8000
    for (let i = 1; i <= 4; i++) {
      sys.getWorks().push(makeWork(i, 'flowing', { tick: cutoff - 100, preserved: false }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), currentTick)
    expect(sys.getWorks()).toHaveLength(0)
  })

  it('全部保留时均不删除', () => {
    const currentTick = 10000
    const cutoff = currentTick - 8000
    for (let i = 1; i <= 3; i++) {
      sys.getWorks().push(makeWork(i, 'runic', { tick: cutoff - 100, preserved: true }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), currentTick)
    expect(sys.getWorks()).toHaveLength(3)
  })

  it('混合保留与非保留：只删非保留过期', () => {
    const currentTick = 10000
    const cutoff = currentTick - 8000
    sys.getWorks().push(makeWork(1, 'runic',    { tick: cutoff - 1, preserved: false })) // 删
    sys.getWorks().push(makeWork(2, 'flowing',  { tick: cutoff - 1, preserved: true  })) // 保留
    sys.getWorks().push(makeWork(3, 'geometric',{ tick: cutoff + 1, preserved: false })) // 未过期
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM([]), currentTick)
    expect(sys.getWorks()).toHaveLength(2)
  })
})

// ══════════════════════════════════════════════════════════════
// 9. CalligraphyWork 数据结构完整性
// ══════════════════════════════════════════════════════════════
describe('CreatureCalligraphySystem — CalligraphyWork 数据结构', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('CalligraphyWork 包含所有必要字段', () => {
    const w = makeWork(1)
    expect(w).toHaveProperty('id')
    expect(w).toHaveProperty('authorId')
    expect(w).toHaveProperty('style')
    expect(w).toHaveProperty('skill')
    expect(w).toHaveProperty('culturalValue')
    expect(w).toHaveProperty('content')
    expect(w).toHaveProperty('preserved')
    expect(w).toHaveProperty('tick')
  })

  it('skill 在 [0,100] 合法范围', () => {
    const w = makeWork(1, 'flowing', { skill: 85 })
    expect(w.skill).toBeGreaterThanOrEqual(0)
    expect(w.skill).toBeLessThanOrEqual(100)
  })

  it('culturalValue 为非负数', () => {
    const w = makeWork(1, 'flowing', { culturalValue: 0 })
    expect(w.culturalValue).toBeGreaterThanOrEqual(0)
  })

  it('content 为字符串', () => {
    const w = makeWork(1, 'flowing', { content: 'battle record' })
    expect(typeof w.content).toBe('string')
  })

  it('preserved 为布尔值', () => {
    const w = makeWork(1)
    expect(typeof w.preserved).toBe('boolean')
  })

  it('tick 为非负整数', () => {
    const w = makeWork(1, 'flowing', { tick: 5000 })
    expect(w.tick).toBeGreaterThanOrEqual(0)
  })
})
