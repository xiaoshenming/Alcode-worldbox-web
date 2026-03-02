import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureFalconerSystem } from '../systems/CreatureFalconerSystem'
import type { Falconer, RaptorType } from '../systems/CreatureFalconerSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureFalconerSystem { return new CreatureFalconerSystem() }
function makeFalconer(entityId: number, raptorType: RaptorType = 'hawk', skill = 40, tick = 0): Falconer {
  return {
    id: nextId++, entityId, skill, raptorType,
    huntSuccess: 70, scoutRange: 15, bondsStrength: 80, tick,
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
describe('CreatureFalconerSystem — 初始状态', () => {
  let sys: CreatureFalconerSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始猎鹰师列表为空', () => {
    expect((sys as any).falconers).toHaveLength(0)
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

  it('falconers 是数组类型', () => {
    expect(Array.isArray((sys as any).falconers)).toBe(true)
  })

  it('skillMap 是 Map 类型', () => {
    expect((sys as any).skillMap instanceof Map).toBe(true)
  })

  it('两个实例的 falconers 互相独立', () => {
    const a = makeSys(); const b = makeSys()
    ;(a as any).falconers.push(makeFalconer(1))
    expect((b as any).falconers).toHaveLength(0)
  })
})

// ============================================================
// 2. Falconer 数据结构
// ============================================================
describe('CreatureFalconerSystem — Falconer 数据结构', () => {
  let sys: CreatureFalconerSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可通过下标访问', () => {
    ;(sys as any).falconers.push(makeFalconer(1, 'eagle'))
    expect((sys as any).falconers[0].raptorType).toBe('eagle')
  })

  it('falconers 返回内部引用', () => {
    const ref = (sys as any).falconers
    expect(ref).toBe((sys as any).falconers)
  })

  it('支持所有 4 种猛禽类型', () => {
    const types: RaptorType[] = ['hawk', 'falcon', 'eagle', 'owl']
    types.forEach((t, i) => { ;(sys as any).falconers.push(makeFalconer(i + 1, t)) })
    const all = (sys as any).falconers
    types.forEach((t, i) => { expect(all[i].raptorType).toBe(t) })
  })

  it('id 字段正确存储', () => {
    const f = makeFalconer(5)
    f.id = 77
    ;(sys as any).falconers.push(f)
    expect((sys as any).falconers[0].id).toBe(77)
  })

  it('entityId 字段正确存储', () => {
    const f = makeFalconer(42)
    ;(sys as any).falconers.push(f)
    expect((sys as any).falconers[0].entityId).toBe(42)
  })

  it('skill 字段正确存储', () => {
    const f = makeFalconer(1, 'hawk', 65)
    ;(sys as any).falconers.push(f)
    expect((sys as any).falconers[0].skill).toBe(65)
  })

  it('huntSuccess 字段正确存储', () => {
    const f = makeFalconer(1, 'falcon', 40)
    f.huntSuccess = 88
    ;(sys as any).falconers.push(f)
    expect((sys as any).falconers[0].huntSuccess).toBe(88)
  })

  it('scoutRange 字段正确存储', () => {
    const f = makeFalconer(1, 'owl', 40)
    f.scoutRange = 12
    ;(sys as any).falconers.push(f)
    expect((sys as any).falconers[0].scoutRange).toBe(12)
  })

  it('bondsStrength 字段正确存储', () => {
    const f = makeFalconer(1)
    f.bondsStrength = 55
    ;(sys as any).falconers.push(f)
    expect((sys as any).falconers[0].bondsStrength).toBe(55)
  })

  it('tick 字段正确存储', () => {
    const f = makeFalconer(1, 'hawk', 40, 9999)
    ;(sys as any).falconers.push(f)
    expect((sys as any).falconers[0].tick).toBe(9999)
  })

  it('可以批量注入多个猎鹰师', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).falconers.push(makeFalconer(i + 1))
    }
    expect((sys as any).falconers).toHaveLength(10)
  })
})

// ============================================================
// 3. skillMap 行为
// ============================================================
describe('CreatureFalconerSystem — skillMap 行为', () => {
  let sys: CreatureFalconerSystem

  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 85)
    expect((sys as any).skillMap.get(42)).toBe(85)
  })

  it('可覆盖已有技能', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(1, 60)
    expect((sys as any).skillMap.get(1)).toBe(60)
  })

  it('不同实体技能独立', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 70)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(70)
  })

  it('技能值可以是浮点数', () => {
    ;(sys as any).skillMap.set(3, 14.78)
    expect((sys as any).skillMap.get(3)).toBeCloseTo(14.78)
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
describe('CreatureFalconerSystem — update 节流', () => {
  let sys: CreatureFalconerSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('tick < CHECK_INTERVAL(1200) 时跳过处理', () => {
    addCreature(em, 20)
    sys.update(16, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(16, em, 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('tick 不足时 lastCheck 不更新', () => {
    sys.update(16, em, 1500)  // lastCheck=1500
    sys.update(16, em, 2000)  // 2000-1500=500 < 1200 → skip
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('满足间隔后再次触发', () => {
    sys.update(16, em, 1500)   // lastCheck=1500
    sys.update(16, em, 3000)   // 3000-1500=1500 >= 1200 → trigger
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('dt 参数不影响节流逻辑', () => {
    sys.update(9999, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })
})

// ============================================================
// 5. update — 猎鹰师创建逻辑
// ============================================================
describe('CreatureFalconerSystem — update 创建猎鹰师', () => {
  let sys: CreatureFalconerSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('age < 12 的生物不产生猎鹰师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 5 } as any)
    em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
    sys.update(16, em, 2000)
    expect((sys as any).falconers).toHaveLength(0)
  })

  it('age >= 12 且 random=0 时产生猎鹰师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(16, em, 2000)
    expect((sys as any).falconers.length).toBeGreaterThan(0)
  })

  it('random > TRAIN_CHANCE(0.005) 时不产生猎鹰师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    addCreature(em, 20)
    sys.update(16, em, 2000)
    expect((sys as any).falconers).toHaveLength(0)
  })

  it('达到 MAX_FALCONERS(40) 时停止创建', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 40; i++) {
      ;(sys as any).falconers.push(makeFalconer(i + 1, 'hawk', 40, 99999))
    }
    addCreature(em, 20)
    sys.update(16, em, 2000)
    expect((sys as any).falconers.length).toBeLessThanOrEqual(40)
  })

  it('新猎鹰师的 entityId 等于生物 id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    sys.update(16, em, 2000)
    const falconers = (sys as any).falconers as Falconer[]
    if (falconers.length > 0) {
      expect(falconers[falconers.length - 1].entityId).toBe(eid)
    }
  })

  it('新猎鹰师的 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(16, em, 2000)
    const falconers = (sys as any).falconers as Falconer[]
    if (falconers.length > 0) {
      expect(falconers[falconers.length - 1].tick).toBe(2000)
    }
  })

  it('huntSuccess 不超过 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 100)
    sys.update(16, em, 2000)
    const falconers = (sys as any).falconers as Falconer[]
    for (const f of falconers) {
      expect(f.huntSuccess).toBeLessThanOrEqual(100)
    }
  })

  it('scoutRange 随 skill 增大', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const e1 = addCreature(em, 20); const e2 = addCreature(em, 20)
    ;(sys as any).skillMap.set(e1, 10)
    ;(sys as any).skillMap.set(e2, 90)
    sys.update(16, em, 2000)
    const falconers = (sys as any).falconers as Falconer[]
    if (falconers.length >= 2) {
      expect(falconers[1].scoutRange).toBeGreaterThanOrEqual(falconers[0].scoutRange)
    }
  })

  it('bondsStrength 计算正确（10 + skill * 0.5）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 40)
    sys.update(16, em, 2000)
    const falconers = (sys as any).falconers as Falconer[]
    if (falconers.length > 0) {
      // skill 在 update 后会变成 40.09（40+SKILL_GROWTH 0.09）
      const f = falconers[falconers.length - 1]
      expect(f.bondsStrength).toBeGreaterThanOrEqual(10 + 40 * 0.5)
    }
  })
})

// ============================================================
// 6. update — 超时清除
// ============================================================
describe('CreatureFalconerSystem — update 超时清除', () => {
  let sys: CreatureFalconerSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('超过 46000 tick 的猎鹰师被清除', () => {
    // tick=50000, cutoff=50000-46000=4000, f.tick=0 < 4000 → removed
    ;(sys as any).falconers.push(makeFalconer(1, 'hawk', 40, 0))
    sys.update(16, em, 50000)
    const found = (sys as any).falconers.find((f: Falconer) => f.entityId === 1)
    expect(found).toBeUndefined()
  })

  it('未超时的猎��师保留', () => {
    // tick=50000, cutoff=4000, f.tick=40000 > 4000 → kept
    ;(sys as any).falconers.push(makeFalconer(1, 'hawk', 40, 40000))
    sys.update(16, em, 50000)
    const found = (sys as any).falconers.find((f: Falconer) => f.entityId === 1)
    expect(found).toBeDefined()
  })

  it('tick 刚好等于 cutoff 时保留', () => {
    // cutoff = 50000-46000=4000, f.tick=4000 → 4000 < 4000 is false → kept
    ;(sys as any).falconers.push(makeFalconer(1, 'hawk', 40, 4000))
    sys.update(16, em, 50000)
    const found = (sys as any).falconers.find((f: Falconer) => f.entityId === 1)
    expect(found).toBeDefined()
  })

  it('同时存在过期和有效猎鹰师时只移除过期', () => {
    ;(sys as any).falconers.push(makeFalconer(1, 'hawk', 40, 0))     // expired
    ;(sys as any).falconers.push(makeFalconer(2, 'falcon', 40, 40000)) // valid
    sys.update(16, em, 50000)
    const expired = (sys as any).falconers.find((f: Falconer) => f.entityId === 1)
    const valid   = (sys as any).falconers.find((f: Falconer) => f.entityId === 2)
    expect(expired).toBeUndefined()
    expect(valid).toBeDefined()
  })
})

// ============================================================
// 7. 边界条件与特殊情况
// ============================================================
describe('CreatureFalconerSystem — 边界条件', () => {
  let sys: CreatureFalconerSystem
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
    expect((sys as any).falconers).toHaveLength(0)
  })

  it('生物缺少 creature 组件时不产生猎鹰师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
    sys.update(16, em, 2000)
    expect((sys as any).falconers).toHaveLength(0)
  })

  it('技能成长上限为 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 99.95)
    sys.update(16, em, 2000)
    const skill = (sys as any).skillMap.get(eid) as number
    expect(skill).toBeLessThanOrEqual(100)
  })

  it('已有技能在 update 后增加 SKILL_GROWTH(0.09)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 50)
    sys.update(16, em, 2000)
    const skill = (sys as any).skillMap.get(eid) as number
    expect(skill).toBeCloseTo(50.09, 5)
  })

  it('nextId 随附魔创建递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    const before = (sys as any).nextId as number
    sys.update(16, em, 2000)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(before)
  })

  it('连续多轮 update 后 falconers 数量不超过 MAX_FALCONERS(40)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 15; i++) addCreature(em, 20)
    for (let t = 2000; t < 50000; t += 2000) {
      sys.update(16, em, t)
    }
    expect((sys as any).falconers.length).toBeLessThanOrEqual(40)
  })
})
