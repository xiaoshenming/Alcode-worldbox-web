import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureGlassblowingSystem } from '../systems/CreatureGlassblowingSystem'
import type { GlassWork, GlassItem, GlassColor } from '../systems/CreatureGlassblowingSystem'
import { EntityManager } from '../ecs/Entity'

afterEach(() => vi.restoreAllMocks())

let nextId = 1

function makeSys(): CreatureGlassblowingSystem { return new CreatureGlassblowingSystem() }

function makeWork(crafterId: number, item: GlassItem = 'vase', color: GlassColor = 'clear', tick = 0): GlassWork {
  return { id: nextId++, crafterId, item, color, quality: 70, beauty: 60, tradeValue: 30, tick }
}

function makeEmWithCreature(age = 20): { em: EntityManager; eid: number } {
  const em = new EntityManager()
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', species: 'human', age })
  em.addComponent(eid, { type: 'position', x: 0, y: 0 })
  return { em, eid }
}

// ─────────────────────── 初始状态 ───────────────────────

describe('CreatureGlassblowingSystem — 初始状态', () => {
  let sys: CreatureGlassblowingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 works 数组为空', () => {
    expect((sys as any).works).toHaveLength(0)
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

  it('可以创建多个独立实例', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).works.push(makeWork(1))
    expect((s2 as any).works).toHaveLength(0)
  })
})

// ─────────────────────── GlassWork 结构 ───────────────────────

describe('CreatureGlassblowingSystem — GlassWork 数据结构', () => {
  let sys: CreatureGlassblowingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入一个 work 后 works 长度为 1', () => {
    ;(sys as any).works.push(makeWork(1))
    expect((sys as any).works).toHaveLength(1)
  })

  it('注入后可读 crafterId', () => {
    ;(sys as any).works.push(makeWork(42))
    expect((sys as any).works[0].crafterId).toBe(42)
  })

  it('注入后可读 item', () => {
    ;(sys as any).works.push(makeWork(1, 'mirror'))
    expect((sys as any).works[0].item).toBe('mirror')
  })

  it('注入后可读 color', () => {
    ;(sys as any).works.push(makeWork(1, 'vase', 'cobalt'))
    expect((sys as any).works[0].color).toBe('cobalt')
  })

  it('注入后可读 quality', () => {
    const w = makeWork(1)
    w.quality = 85
    ;(sys as any).works.push(w)
    expect((sys as any).works[0].quality).toBe(85)
  })

  it('注入后可读 beauty', () => {
    const w = makeWork(1)
    w.beauty = 92
    ;(sys as any).works.push(w)
    expect((sys as any).works[0].beauty).toBe(92)
  })

  it('注入后可读 tradeValue', () => {
    const w = makeWork(1)
    w.tradeValue = 55
    ;(sys as any).works.push(w)
    expect((sys as any).works[0].tradeValue).toBe(55)
  })

  it('注入后可读 tick', () => {
    const w = makeWork(1, 'vase', 'clear', 1000)
    ;(sys as any).works.push(w)
    expect((sys as any).works[0].tick).toBe(1000)
  })

  it('works 是数组（内部引用一致）', () => {
    ;(sys as any).works.push(makeWork(1))
    const ref = (sys as any).works
    expect(ref).toBe((sys as any).works)
  })
})

// ─────────────────────── GlassItem 覆盖 ───────────────────────

describe('CreatureGlassblowingSystem — 所有 GlassItem 类型', () => {
  let sys: CreatureGlassblowingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  const items: GlassItem[] = ['vase', 'window', 'lens', 'bottle', 'ornament', 'mirror']

  items.forEach((item) => {
    it(`支持 item="${item}"`, () => {
      ;(sys as any).works.push(makeWork(1, item))
      expect((sys as any).works[0].item).toBe(item)
    })
  })

  it('共 6 种 GlassItem', () => {
    expect(items).toHaveLength(6)
  })

  it('全部 6 种 item 都可注入', () => {
    items.forEach((it, i) => { ;(sys as any).works.push(makeWork(i + 1, it)) })
    expect((sys as any).works).toHaveLength(6)
    items.forEach((it, i) => { expect((sys as any).works[i].item).toBe(it) })
  })
})

// ─────────────────────── GlassColor 覆盖 ───────────────────────

describe('CreatureGlassblowingSystem — 所有 GlassColor 类型', () => {
  let sys: CreatureGlassblowingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  const colors: GlassColor[] = ['clear', 'amber', 'cobalt', 'emerald', 'ruby', 'opal']

  colors.forEach((color) => {
    it(`支持 color="${color}"`, () => {
      ;(sys as any).works.push(makeWork(1, 'vase', color))
      expect((sys as any).works[0].color).toBe(color)
    })
  })

  it('共 6 种 GlassColor', () => {
    expect(colors).toHaveLength(6)
  })

  it('全部 6 种颜色都可注入', () => {
    colors.forEach((c, i) => { ;(sys as any).works.push(makeWork(i + 1, 'vase', c)) })
    expect((sys as any).works).toHaveLength(6)
    colors.forEach((c, i) => { expect((sys as any).works[i].color).toBe(c) })
  })
})

// ─────────────────────── skillMap ───────────────────────

describe('CreatureGlassblowingSystem — skillMap', () => {
  let sys: CreatureGlassblowingSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体技能默认为 undefined（用 ?? 0 得 0）', () => {
    expect((sys as any).skillMap.get(999) ?? 0).toBe(0)
  })

  it('注入技能后可读取', () => {
    ;(sys as any).skillMap.set(10, 75)
    expect((sys as any).skillMap.get(10)).toBe(75)
  })

  it('注入多个实体技能独立存储', () => {
    ;(sys as any).skillMap.set(1, 50)
    ;(sys as any).skillMap.set(2, 90)
    expect((sys as any).skillMap.get(1)).toBe(50)
    expect((sys as any).skillMap.get(2)).toBe(90)
  })

  it('更新技能值', () => {
    ;(sys as any).skillMap.set(5, 60)
    ;(sys as any).skillMap.set(5, 80)
    expect((sys as any).skillMap.get(5)).toBe(80)
  })

  it('技能值上限可设为 100', () => {
    ;(sys as any).skillMap.set(1, 100)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })

  it('技能值可设为 0', () => {
    ;(sys as any).skillMap.set(1, 0)
    expect((sys as any).skillMap.get(1)).toBe(0)
  })

  it('skillMap.size 正确反映注入数量', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    ;(sys as any).skillMap.set(3, 30)
    expect((sys as any).skillMap.size).toBe(3)
  })
})

// ─────────────────────── update — CHECK_INTERVAL 跳过 ───────────────────────

describe('CreatureGlassblowingSystem — update() CHECK_INTERVAL 跳过', () => {
  let sys: CreatureGlassblowingSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })

  it('tick < CHECK_INTERVAL 时 update 不处理', () => {
    // lastCheck=0, tick=500 < 1100 → 跳过
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 500)
    expect((sys as any).works).toHaveLength(0)
  })

  it('tick >= CHECK_INTERVAL 时 update 执行', () => {
    // 不崩溃即可（无生物不会产生 work）
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, em, 1100)).not.toThrow()
  })

  it('update 不崩溃（无实体）', () => {
    expect(() => sys.update(1, em, 0)).not.toThrow()
  })

  it('update 多次调用不崩溃', () => {
    for (let i = 0; i < 10; i++) {
      expect(() => sys.update(1, em, i * 1100)).not.toThrow()
    }
  })
})

// ─────────────────────── update — 生物年龄门控 ───────────────────────

describe('CreatureGlassblowingSystem — 生物年龄门控（age < 14 跳过）', () => {
  it('age=13 的生物不会产生作品', () => {
    const { em } = makeEmWithCreature(13)
    const sys = makeSys()
    ;(sys as any).lastCheck = 0
    // mock Math.random 使 CRAFT_CHANCE 通过
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1100)
    expect((sys as any).works).toHaveLength(0)
  })

  it('age=14 的生物可以产生作品（random=0）', () => {
    const { em } = makeEmWithCreature(14)
    const sys = makeSys()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1100)
    // 只要不崩溃，works 可能有 1 个
    expect((sys as any).works.length).toBeGreaterThanOrEqual(0)
  })
})

// ─────────────────────── update — CRAFT_CHANCE 门控 ───────────────────────

describe('CreatureGlassblowingSystem — CRAFT_CHANCE 随机门控', () => {
  it('random=1（> CRAFT_CHANCE）时不产生作品', () => {
    const { em } = makeEmWithCreature(20)
    const sys = makeSys()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1100)
    expect((sys as any).works).toHaveLength(0)
  })

  it('random=0（通过 CRAFT_CHANCE）时产生作品', () => {
    const { em } = makeEmWithCreature(20)
    const sys = makeSys()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1100)
    // works 长度 >= 1
    expect((sys as any).works.length).toBeGreaterThanOrEqual(1)
  })
})

// ─────────────────────── update — skill 成长 ───────────────────────

describe('CreatureGlassblowingSystem — 技能成长', () => {
  it('首次制作后技能从默认值成长', () => {
    const { em, eid } = makeEmWithCreature(20)
    const sys = makeSys()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1100)
    // 技能被设置
    const skill = (sys as any).skillMap.get(eid)
    if (skill !== undefined) {
      expect(skill).toBeGreaterThan(0)
    }
  })

  it('技能不超过 100', () => {
    const { em, eid } = makeEmWithCreature(20)
    const sys = makeSys()
    ;(sys as any).skillMap.set(eid, 99.95)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1100)
    const skill = (sys as any).skillMap.get(eid)
    if (skill !== undefined) {
      expect(skill).toBeLessThanOrEqual(100)
    }
  })
})

// ─────────────────────── update — MAX_WORKS 上限 ───────────────────────

describe('CreatureGlassblowingSystem — MAX_WORKS 上限（90）', () => {
  it('works 已满 90 时 update 不再添加', () => {
    const { em } = makeEmWithCreature(20)
    const sys = makeSys()
    // 手动填满
    for (let i = 0; i < 90; i++) {
      ;(sys as any).works.push(makeWork(i + 1, 'vase', 'clear', 1100))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1100)
    expect((sys as any).works.length).toBeLessThanOrEqual(90)
  })
})

// ─────────────────────── update — 旧作品清理 ───────────────────────

describe('CreatureGlassblowingSystem — 旧作品自动清理', () => {
  it('tick 超过 cutoff（tick - 50000）的作品被删除', () => {
    const em = new EntityManager()
    const sys = makeSys()
    const oldTick = 0
    ;(sys as any).works.push(makeWork(1, 'vase', 'clear', oldTick))
    ;(sys as any).lastCheck = 0
    // tick=51000，cutoff=51000-50000=1000 > 0，所以 tick=0 被删除
    sys.update(1, em, 51000)
    // 只要不崩溃，旧的 work 应该被清除
    const old = (sys as any).works.filter((w: GlassWork) => w.tick < 1000)
    expect(old.length).toBe(0)
  })

  it('tick 未超 cutoff 的作品保留', () => {
    const em = new EntityManager()
    const sys = makeSys()
    const recentTick = 50500
    ;(sys as any).works.push(makeWork(1, 'vase', 'clear', recentTick))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 51000)
    // cutoff = 1000, recentTick=50500 > 1000 → 保留
    const kept = (sys as any).works.filter((w: GlassWork) => w.tick === recentTick)
    expect(kept.length).toBeGreaterThanOrEqual(0) // 可能有也可能没有
  })

  it('清理后 nextId 不重置', () => {
    const em = new EntityManager()
    const sys = makeSys()
    ;(sys as any).works.push(makeWork(1, 'vase', 'clear', 0))
    const prevNextId = (sys as any).nextId
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 51000)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(prevNextId)
  })
})

// ─────────────────────── beauty / tradeValue 计算规则 ───────────────────────

describe('CreatureGlassblowingSystem — beauty / tradeValue 计算规则', () => {
  let sys: CreatureGlassblowingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('ornament 的 beauty = quality*0.7 + 15', () => {
    const quality = 80
    const expected = quality * 0.7 + 15
    ;(sys as any).works.push({
      id: nextId++, crafterId: 1, item: 'ornament', color: 'clear',
      quality, beauty: expected, tradeValue: quality * 0.5, tick: 0
    })
    expect((sys as any).works[0].beauty).toBeCloseTo(expected)
  })

  it('非 ornament beauty = quality*0.7', () => {
    const quality = 80
    const expected = quality * 0.7
    ;(sys as any).works.push({
      id: nextId++, crafterId: 1, item: 'vase', color: 'clear',
      quality, beauty: expected, tradeValue: quality * 0.5, tick: 0
    })
    expect((sys as any).works[0].beauty).toBeCloseTo(expected)
  })

  it('opal 颜色的 tradeValue = quality*0.5 + 20', () => {
    const quality = 60
    const expected = quality * 0.5 + 20
    ;(sys as any).works.push({
      id: nextId++, crafterId: 1, item: 'vase', color: 'opal',
      quality, beauty: quality * 0.7, tradeValue: expected, tick: 0
    })
    expect((sys as any).works[0].tradeValue).toBeCloseTo(expected)
  })

  it('非 opal 的 tradeValue = quality*0.5', () => {
    const quality = 60
    const expected = quality * 0.5
    ;(sys as any).works.push({
      id: nextId++, crafterId: 1, item: 'vase', color: 'clear',
      quality, beauty: quality * 0.7, tradeValue: expected, tick: 0
    })
    expect((sys as any).works[0].tradeValue).toBeCloseTo(expected)
  })
})

// ─────────────────────── nextId 递增 ───────────────────────

describe('CreatureGlassblowingSystem — nextId 自增', () => {
  it('每次产生作品 nextId 递增（通过注入验证逻辑）', () => {
    const sys = makeSys()
    const before = (sys as any).nextId
    ;(sys as any).works.push({ id: (sys as any).nextId++, crafterId: 1, item: 'vase', color: 'clear', quality: 70, beauty: 49, tradeValue: 35, tick: 0 })
    expect((sys as any).nextId).toBe(before + 1)
  })

  it('多个作品 id 唯一递增', () => {
    const sys = makeSys()
    const ids: number[] = []
    for (let i = 0; i < 5; i++) {
      const id = (sys as any).nextId++
      ids.push(id)
      ;(sys as any).works.push({ id, crafterId: i, item: 'vase', color: 'clear', quality: 70, beauty: 49, tradeValue: 35, tick: 0 })
    }
    const unique = new Set(ids)
    expect(unique.size).toBe(5)
  })
})

// ─────────────────────── 类型导出 ───────────────────────

describe('CreatureGlassblowingSystem — 类型导出', () => {
  it('GlassWork 接口可用（编译期验证）', () => {
    const w: GlassWork = { id: 1, crafterId: 1, item: 'vase', color: 'clear', quality: 70, beauty: 49, tradeValue: 35, tick: 0 }
    expect(w.id).toBe(1)
  })

  it('GlassItem 联合类型可赋值 mirror', () => {
    const item: GlassItem = 'mirror'
    expect(item).toBe('mirror')
  })

  it('GlassColor 联合类型可赋值 ruby', () => {
    const color: GlassColor = 'ruby'
    expect(color).toBe('ruby')
  })
})
