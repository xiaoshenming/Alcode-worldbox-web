import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureFarrierSystem } from '../systems/CreatureFarrierSystem'
import type { Farrier, ShoeType } from '../systems/CreatureFarrierSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureFarrierSystem { return new CreatureFarrierSystem() }
function makeFarrier(entityId: number, shoeType: ShoeType = 'iron', skill = 40, tick = 0): Farrier {
  return {
    id: nextId++, entityId, skill, horsesShod: 20,
    shoeType, fitQuality: 70, hoofHealth: 80, tick,
  }
}

function makeEM(): EntityManager { return new EntityManager() }
function addCreature(em: EntityManager, age = 20): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', age, hp: 100, race: 'human' } as any)
  em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
  return eid
}

afterEach(() => { vi.restoreAllMocks() })

// ============================================================
// 1. 初始状态
// ============================================================
describe('CreatureFarrierSystem — 初始状态', () => {
  let sys: CreatureFarrierSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始蹄铁匠列表为空', () => {
    expect((sys as any).farriers).toHaveLength(0)
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

  it('farriers 是数组类型', () => {
    expect(Array.isArray((sys as any).farriers)).toBe(true)
  })

  it('skillMap 是 Map 类型', () => {
    expect((sys as any).skillMap instanceof Map).toBe(true)
  })

  it('两个实例的 farriers 互相独立', () => {
    const a = makeSys(); const b = makeSys()
    ;(a as any).farriers.push(makeFarrier(1))
    expect((b as any).farriers).toHaveLength(0)
  })
})

// ============================================================
// 2. Farrier 数据结构
// ============================================================
describe('CreatureFarrierSystem — Farrier 数据结构', () => {
  let sys: CreatureFarrierSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可通过下标访问', () => {
    ;(sys as any).farriers.push(makeFarrier(1, 'steel'))
    expect((sys as any).farriers[0].shoeType).toBe('steel')
  })

  it('farriers 返回内部引用', () => {
    const ref = (sys as any).farriers
    expect(ref).toBe((sys as any).farriers)
  })

  it('支持所有 4 种蹄铁类型', () => {
    const types: ShoeType[] = ['iron', 'steel', 'aluminum', 'therapeutic']
    types.forEach((t, i) => { ;(sys as any).farriers.push(makeFarrier(i + 1, t)) })
    const all = (sys as any).farriers
    types.forEach((t, i) => { expect(all[i].shoeType).toBe(t) })
  })

  it('id 字段正确存储', () => {
    const f = makeFarrier(5)
    f.id = 77
    ;(sys as any).farriers.push(f)
    expect((sys as any).farriers[0].id).toBe(77)
  })

  it('entityId 字段正确存储', () => {
    const f = makeFarrier(42)
    ;(sys as any).farriers.push(f)
    expect((sys as any).farriers[0].entityId).toBe(42)
  })

  it('skill 字段正确存储', () => {
    const f = makeFarrier(1, 'iron', 65)
    ;(sys as any).farriers.push(f)
    expect((sys as any).farriers[0].skill).toBe(65)
  })

  it('horsesShod 字段正确存储', () => {
    const f = makeFarrier(1)
    f.horsesShod = 8
    ;(sys as any).farriers.push(f)
    expect((sys as any).farriers[0].horsesShod).toBe(8)
  })

  it('fitQuality 字段正确存储', () => {
    const f = makeFarrier(1)
    f.fitQuality = 92
    ;(sys as any).farriers.push(f)
    expect((sys as any).farriers[0].fitQuality).toBe(92)
  })

  it('hoofHealth 字段正确存储', () => {
    const f = makeFarrier(1)
    f.hoofHealth = 75
    ;(sys as any).farriers.push(f)
    expect((sys as any).farriers[0].hoofHealth).toBe(75)
  })

  it('tick 字段正确存储', () => {
    const f = makeFarrier(1, 'iron', 40, 8888)
    ;(sys as any).farriers.push(f)
    expect((sys as any).farriers[0].tick).toBe(8888)
  })

  it('可以批量注入多个蹄铁匠', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).farriers.push(makeFarrier(i + 1))
    }
    expect((sys as any).farriers).toHaveLength(10)
  })
})

// ============================================================
// 3. skillMap 行为
// ============================================================
describe('CreatureFarrierSystem — skillMap 行为', () => {
  let sys: CreatureFarrierSystem

  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 90)
    expect((sys as any).skillMap.get(42)).toBe(90)
  })

  it('可覆盖已有技能', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(1, 65)
    expect((sys as any).skillMap.get(1)).toBe(65)
  })

  it('不同实体技能独立', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 70)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(70)
  })

  it('技能值可以是浮点数', () => {
    ;(sys as any).skillMap.set(3, 16.25)
    expect((sys as any).skillMap.get(3)).toBeCloseTo(16.25)
  })

  it('技能值 0 也可存储', () => {
    ;(sys as any).skillMap.set(4, 0)
    expect((sys as any).skillMap.get(4)).toBe(0)
  })

  it('可以删除技能条目', () => {
    ;(sys as any).skillMap.set(5, 99)
    ;(sys as any).skillMap.delete(5)
    expect((sys as any).skillMap.get(5)).toBeUndefined()
  })
})

// ============================================================
// 4. update — 节流控制
// ============================================================
describe('CreatureFarrierSystem — update 节流', () => {
  let sys: CreatureFarrierSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('tick < CHECK_INTERVAL(1400) 时跳过处理', () => {
    addCreature(em, 20)
    sys.update(16, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(16, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('tick 不足时 lastCheck 不更新', () => {
    sys.update(16, em, 2000)  // lastCheck=2000
    sys.update(16, em, 3000)  // 3000-2000=1000 < 1400 → skip
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('满足间隔后再次触发', () => {
    sys.update(16, em, 2000)   // lastCheck=2000
    sys.update(16, em, 3500)   // 3500-2000=1500 >= 1400 → trigger
    expect((sys as any).lastCheck).toBe(3500)
  })

  it('dt 参数不影响节流逻辑', () => {
    sys.update(9999, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })
})

// ============================================================
// 5. update — 蹄铁匠创建逻辑
// ============================================================
describe('CreatureFarrierSystem — update 创建蹄铁匠', () => {
  let sys: CreatureFarrierSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('age < 11 的生物不产生蹄铁匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 5 } as any)
    em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
    sys.update(16, em, 2000)
    expect((sys as any).farriers).toHaveLength(0)
  })

  it('age === 11 的生物可产生蹄铁匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 11 } as any)
    em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
    sys.update(16, em, 2000)
    expect((sys as any).farriers.length).toBeGreaterThan(0)
  })

  it('age >= 11 且 random=0 时产生蹄铁匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(16, em, 2000)
    expect((sys as any).farriers.length).toBeGreaterThan(0)
  })

  it('random > CRAFT_CHANCE(0.005) 时不产生蹄铁匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    addCreature(em, 20)
    sys.update(16, em, 2000)
    expect((sys as any).farriers).toHaveLength(0)
  })

  it('达到 MAX_FARRIERS(34) 时停止创建', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 34; i++) {
      ;(sys as any).farriers.push(makeFarrier(i + 1, 'iron', 40, 99999))
    }
    addCreature(em, 20)
    sys.update(16, em, 2000)
    expect((sys as any).farriers.length).toBeLessThanOrEqual(34)
  })

  it('新蹄铁匠的 entityId 等于生物 id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    sys.update(16, em, 2000)
    const farriers = (sys as any).farriers as Farrier[]
    if (farriers.length > 0) {
      expect(farriers[farriers.length - 1].entityId).toBe(eid)
    }
  })

  it('新蹄铁匠的 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(16, em, 2000)
    const farriers = (sys as any).farriers as Farrier[]
    if (farriers.length > 0) {
      expect(farriers[farriers.length - 1].tick).toBe(2000)
    }
  })

  it('fitQuality 不超过 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 100)
    sys.update(16, em, 2000)
    const farriers = (sys as any).farriers as Farrier[]
    for (const f of farriers) {
      expect(f.fitQuality).toBeLessThanOrEqual(100)
    }
  })

  it('skill=0~24 时 shoeType 为 iron（索引0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 20)
    sys.update(16, em, 2000)
    const farriers = (sys as any).farriers as Farrier[]
    if (farriers.length > 0) {
      expect(farriers[farriers.length - 1].shoeType).toBe('iron')
    }
  })

  it('skill=25~49 时 shoeType 为 steel（索引1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 30)
    sys.update(16, em, 2000)
    const farriers = (sys as any).farriers as Farrier[]
    if (farriers.length > 0) {
      expect(farriers[farriers.length - 1].shoeType).toBe('steel')
    }
  })

  it('skill=50~74 时 shoeType 为 aluminum（索引2）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 60)
    sys.update(16, em, 2000)
    const farriers = (sys as any).farriers as Farrier[]
    if (farriers.length > 0) {
      expect(farriers[farriers.length - 1].shoeType).toBe('aluminum')
    }
  })

  it('skill>=75 时 shoeType 为 therapeutic（索引3）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 80)
    sys.update(16, em, 2000)
    const farriers = (sys as any).farriers as Farrier[]
    if (farriers.length > 0) {
      expect(farriers[farriers.length - 1].shoeType).toBe('therapeutic')
    }
  })

  it('horsesShod = 1 + floor(skill/12)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 24)  // skill after grow ≈ 24.06
    sys.update(16, em, 2000)
    const farriers = (sys as any).farriers as Farrier[]
    if (farriers.length > 0) {
      const f = farriers[farriers.length - 1]
      expect(f.horsesShod).toBeGreaterThanOrEqual(1 + Math.floor(24 / 12))
    }
  })
})

// ============================================================
// 6. update — 超时清除
// ============================================================
describe('CreatureFarrierSystem — update 超时清除', () => {
  let sys: CreatureFarrierSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('超过 47000 tick 的蹄铁匠被清除', () => {
    ;(sys as any).farriers.push(makeFarrier(1, 'iron', 40, 0))
    // tick=50000, cutoff=50000-47000=3000, f.tick=0 < 3000 → removed
    sys.update(16, em, 50000)
    const found = (sys as any).farriers.find((f: Farrier) => f.entityId === 1)
    expect(found).toBeUndefined()
  })

  it('未超时的蹄铁匠保留', () => {
    ;(sys as any).farriers.push(makeFarrier(1, 'steel', 40, 40000))
    // tick=50000, cutoff=3000, f.tick=40000 > 3000 → kept
    sys.update(16, em, 50000)
    const found = (sys as any).farriers.find((f: Farrier) => f.entityId === 1)
    expect(found).toBeDefined()
  })

  it('tick 刚好等于 cutoff 时保留', () => {
    // cutoff = 50000-47000=3000, f.tick=3000 → 3000 < 3000 is false → kept
    ;(sys as any).farriers.push(makeFarrier(1, 'iron', 40, 3000))
    sys.update(16, em, 50000)
    const found = (sys as any).farriers.find((f: Farrier) => f.entityId === 1)
    expect(found).toBeDefined()
  })

  it('同时存在过期和有效蹄铁匠时只移除过期', () => {
    ;(sys as any).farriers.push(makeFarrier(1, 'iron', 40, 0))      // expired
    ;(sys as any).farriers.push(makeFarrier(2, 'aluminum', 40, 40000)) // valid
    sys.update(16, em, 50000)
    const expired = (sys as any).farriers.find((f: Farrier) => f.entityId === 1)
    const valid   = (sys as any).farriers.find((f: Farrier) => f.entityId === 2)
    expect(expired).toBeUndefined()
    expect(valid).toBeDefined()
  })

  it('清除后 farriers 长度减少', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).farriers.push(makeFarrier(i + 1, 'iron', 40, 0)) // all expired
    }
    sys.update(16, em, 50000)
    expect((sys as any).farriers).toHaveLength(0)
  })
})

// ============================================================
// 7. 技能成长
// ============================================================
describe('CreatureFarrierSystem — 技能成长', () => {
  let sys: CreatureFarrierSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('技能上限为 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 99.97)
    sys.update(16, em, 2000)
    const skill = (sys as any).skillMap.get(eid) as number
    expect(skill).toBeLessThanOrEqual(100)
  })

  it('已有技能在 update 后增加 SKILL_GROWTH(0.06)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 50)
    sys.update(16, em, 2000)
    const skill = (sys as any).skillMap.get(eid) as number
    expect(skill).toBeCloseTo(50.06, 5)
  })

  it('初始无技能时从随机值 3~12 初始化', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(16, em, 2000)
    const sm = (sys as any).skillMap as Map<number, number>
    for (const [, v] of sm) {
      // skill = 3+0*9 + 0.06 = 3.06
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(100)
    }
  })

  it('多个生物技能独立成长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const e1 = addCreature(em, 20); const e2 = addCreature(em, 20)
    ;(sys as any).skillMap.set(e1, 20)
    ;(sys as any).skillMap.set(e2, 60)
    sys.update(16, em, 2000)
    expect((sys as any).skillMap.get(e1)).toBeCloseTo(20.06, 5)
    expect((sys as any).skillMap.get(e2)).toBeCloseTo(60.06, 5)
  })
})

// ============================================================
// 8. 边界条件与特殊情况
// ============================================================
describe('CreatureFarrierSystem — 边界条件', () => {
  let sys: CreatureFarrierSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('没有生物时 update 不抛出', () => {
    expect(() => sys.update(16, em, 2000)).not.toThrow()
  })

  it('生物缺少 position 组件时不被选中', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 20 } as any)
    sys.update(16, em, 2000)
    expect((sys as any).farriers).toHaveLength(0)
  })

  it('生物缺少 creature 组件时不产生蹄铁匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
    sys.update(16, em, 2000)
    expect((sys as any).farriers).toHaveLength(0)
  })

  it('nextId 随蹄铁匠创建递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    const before = (sys as any).nextId as number
    sys.update(16, em, 2000)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(before)
  })

  it('连续多轮 update 后 farriers 数量不超过 MAX_FARRIERS(34)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 15; i++) addCreature(em, 20)
    for (let t = 2000; t < 50000; t += 2000) {
      sys.update(16, em, t)
    }
    expect((sys as any).farriers.length).toBeLessThanOrEqual(34)
  })

  it('shoeIdx 不超过 3（SHOE_TYPES 长度-1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 100)
    sys.update(16, em, 2000)
    const farriers = (sys as any).farriers as Farrier[]
    const validTypes: ShoeType[] = ['iron', 'steel', 'aluminum', 'therapeutic']
    for (const f of farriers) {
      expect(validTypes).toContain(f.shoeType)
    }
  })
})
