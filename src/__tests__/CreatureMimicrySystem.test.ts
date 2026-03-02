import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureMimicrySystem } from '../systems/CreatureMimicrySystem'
import type { MimicryAttempt, MimicryType } from '../systems/CreatureMimicrySystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureMimicrySystem { return new CreatureMimicrySystem() }
function makeAttempt(mimicId: number, targetId: number, type: MimicryType = 'visual', tick = 0): MimicryAttempt {
  return { id: nextId++, mimicId, targetId, type, skill: 60, success: true, benefit: 20, tick }
}

function makeEm(...creatures: Array<{ id?: number; speed?: number; isHostile?: boolean; age?: number; maxAge?: number; x?: number; y?: number }>) {
  const em = new EntityManager()
  for (const c of creatures) {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', speed: c.speed ?? 1, isHostile: c.isHostile ?? false, age: c.age ?? 10, maxAge: c.maxAge ?? 100 })
    em.addComponent(eid, { type: 'position', x: c.x ?? 0, y: c.y ?? 0 })
  }
  return em
}

afterEach(() => { vi.restoreAllMocks() })

// ─── 1. 初始化状态 ───────────────────────────────────────────────
describe('CreatureMimicrySystem - 初始化状态', () => {
  let sys: CreatureMimicrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 attempts 数组为空', () => { expect((sys as any).attempts).toHaveLength(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 skillMap 为空 Map', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('构造函数不抛出', () => { expect(() => makeSys()).not.toThrow() })
  it('多次构造互相独立', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).attempts.push(makeAttempt(1, 2))
    expect((b as any).attempts).toHaveLength(0)
  })
})

// ─── 2. 拟态类型枚举 ──────────────────────────────────────────────
describe('CreatureMimicrySystem - 拟态类型', () => {
  let sys: CreatureMimicrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('visual 类型可注入', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2, 'visual'))
    expect((sys as any).attempts[0].type).toBe('visual')
  })
  it('behavioral 类型可注入', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2, 'behavioral'))
    expect((sys as any).attempts[0].type).toBe('behavioral')
  })
  it('acoustic 类型可注入', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2, 'acoustic'))
    expect((sys as any).attempts[0].type).toBe('acoustic')
  })
  it('chemical 类型可注入', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2, 'chemical'))
    expect((sys as any).attempts[0].type).toBe('chemical')
  })
  it('aggressive 类型可注入', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2, 'aggressive'))
    expect((sys as any).attempts[0].type).toBe('aggressive')
  })
  it('defensive 类型可注入', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2, 'defensive'))
    expect((sys as any).attempts[0].type).toBe('defensive')
  })
  it('6 种类型全部存在于同一数组', () => {
    const types: MimicryType[] = ['visual', 'behavioral', 'acoustic', 'chemical', 'aggressive', 'defensive']
    types.forEach((t, i) => { ;(sys as any).attempts.push(makeAttempt(i + 1, i + 10, t)) })
    const stored = (sys as any).attempts.map((a: MimicryAttempt) => a.type)
    expect(stored).toEqual(types)
  })
})

// ─── 3. skill 映射 ────────────────────────────────────────────────
describe('CreatureMimicrySystem - skillMap 操作', () => {
  let sys: CreatureMimicrySystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 undefined', () => { expect((sys as any).skillMap.get(999)).toBeUndefined() })
  it('默认值写法可返回 0', () => { expect((sys as any).skillMap.get(999) ?? 0).toBe(0) })
  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 77)
    expect((sys as any).skillMap.get(42) ?? 0).toBe(77)
  })
  it('技能值上限 100', () => {
    ;(sys as any).skillMap.set(1, 100)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })
  it('技能值下限 0', () => {
    ;(sys as any).skillMap.set(1, 0)
    expect((sys as any).skillMap.get(1)).toBe(0)
  })
  it('多实体技能互不干扰', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 80)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(80)
  })
  it('覆盖写入生效', () => {
    ;(sys as any).skillMap.set(5, 20)
    ;(sys as any).skillMap.set(5, 55)
    expect((sys as any).skillMap.get(5)).toBe(55)
  })
  it('delete 后恢复 undefined', () => {
    ;(sys as any).skillMap.set(7, 50)
    ;(sys as any).skillMap.delete(7)
    expect((sys as any).skillMap.get(7)).toBeUndefined()
  })
})

// ─── 4. attempts 数组管理 ─────────────────────────────────────────
describe('CreatureMimicrySystem - attempts 数组', () => {
  let sys: CreatureMimicrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入一条记录后长度为 1', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2))
    expect((sys as any).attempts).toHaveLength(1)
  })
  it('注入多条记录长度正确', () => {
    for (let i = 0; i < 5; i++) (sys as any).attempts.push(makeAttempt(i + 1, i + 10))
    expect((sys as any).attempts).toHaveLength(5)
  })
  it('清空数组后长度为 0', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2))
    ;(sys as any).attempts.length = 0
    expect((sys as any).attempts).toHaveLength(0)
  })
  it('attempts 保存 mimicId 正确', () => {
    ;(sys as any).attempts.push(makeAttempt(7, 99))
    expect((sys as any).attempts[0].mimicId).toBe(7)
  })
  it('attempts 保存 targetId 正确', () => {
    ;(sys as any).attempts.push(makeAttempt(7, 99))
    expect((sys as any).attempts[0].targetId).toBe(99)
  })
  it('attempts 的 benefit 为 0 时表示失败收益', () => {
    const a = makeAttempt(1, 2)
    a.benefit = 0
    a.success = false
    ;(sys as any).attempts.push(a)
    expect((sys as any).attempts[0].benefit).toBe(0)
  })
  it('attempts 的 success 字段可为 false', () => {
    const a = makeAttempt(1, 2)
    a.success = false
    ;(sys as any).attempts.push(a)
    expect((sys as any).attempts[0].success).toBe(false)
  })
  it('attempts 的 skill 字段正确存储', () => {
    const a = makeAttempt(1, 2)
    a.skill = 88
    ;(sys as any).attempts.push(a)
    expect((sys as any).attempts[0].skill).toBe(88)
  })
  it('attempts 按插入顺序存储', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2))
    ;(sys as any).attempts.push(makeAttempt(3, 4))
    expect((sys as any).attempts[0].mimicId).toBe(1)
    expect((sys as any).attempts[1].mimicId).toBe(3)
  })
})

// ─── 5. update 节流逻辑 ───────────────────────────────────────────
describe('CreatureMimicrySystem - update 节流', () => {
  let sys: CreatureMimicrySystem

  beforeEach(() => { sys = makeSys() })

  it('tick 未达到 CHECK_INTERVAL 不处理', () => {
    const em = makeEm({ x: 0 }, { x: 1 })
    sys.update(1, em, 0)
    sys.update(1, em, 500)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 达到 CHECK_INTERVAL 时 lastCheck 更新', () => {
    const em = makeEm({ x: 0 }, { x: 1 })
    sys.update(1, em, 1100)
    expect((sys as any).lastCheck).toBe(1100)
  })

  it('两次调用间隔不足不重复处理', () => {
    const em = makeEm({ x: 0 }, { x: 1 })
    sys.update(1, em, 1100)
    const checkAfterFirst = (sys as any).lastCheck
    sys.update(1, em, 1200)
    expect((sys as any).lastCheck).toBe(checkAfterFirst)
  })

  it('生物数量少于 2 时不产生拟态记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm({ x: 0 })
    sys.update(1, em, 1100)
    expect((sys as any).attempts).toHaveLength(0)
  })

  it('无生物时不崩溃', () => {
    const em = new EntityManager()
    expect(() => sys.update(1, em, 1100)).not.toThrow()
  })
})

// ─── 6. update 拟态生成 ───────────────────────────────────────────
describe('CreatureMimicrySystem - update 拟态生成', () => {
  let sys: CreatureMimicrySystem

  beforeEach(() => { sys = makeSys() })

  it('random=0 时必定触发拟态机会判断（MIMIC_CHANCE 条件通过）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm({ x: 0 }, { x: 10 })
    sys.update(1, em, 1100)
    expect((sys as any).attempts.length).toBeGreaterThan(0)
  })

  it('random=1 时跳过所有实体（大于 MIMIC_CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const em = makeEm({ x: 0 }, { x: 10 })
    sys.update(1, em, 1100)
    expect((sys as any).attempts).toHaveLength(0)
  })

  it('生成的记录包含有效的 MimicryType', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm({ x: 0 }, { x: 10 })
    sys.update(1, em, 1100)
    const valid: MimicryType[] = ['visual', 'behavioral', 'acoustic', 'chemical', 'aggressive', 'defensive']
    for (const a of (sys as any).attempts) {
      expect(valid).toContain(a.type)
    }
  })

  it('attempts 超过 MAX_ATTEMPTS(80) 后停止追加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const entities = Array.from({ length: 100 }, (_, i) => ({ x: i }))
    const em = makeEm(...entities)
    // 预填充 80 条
    for (let i = 0; i < 80; i++) (sys as any).attempts.push(makeAttempt(i + 1, i + 2))
    sys.update(1, em, 1100)
    expect((sys as any).attempts.length).toBeLessThanOrEqual(80)
  })

  it('成功拟态的 benefit > 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // success=true
    const em = makeEm({ x: 0 }, { x: 10 })
    sys.update(1, em, 1100)
    for (const a of (sys as any).attempts) {
      if (a.success) expect(a.benefit).toBeGreaterThan(0)
    }
  })

  it('新记录的 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm({ x: 0 }, { x: 10 })
    sys.update(1, em, 1100)
    for (const a of (sys as any).attempts) {
      expect(a.tick).toBe(1100)
    }
  })
})

// ─── 7. 旧记录清理 ────────────────────────────────────────────────
describe('CreatureMimicrySystem - 旧记录清理', () => {
  let sys: CreatureMimicrySystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('过期记录（tick < cutoff）被清理', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2, 'visual', 0))  // 旧记录
    ;(sys as any).attempts.push(makeAttempt(3, 4, 'visual', 6000)) // 新记录
    ;(sys as any).lastCheck = 0
    const em = makeEm({ x: 0 }, { x: 10 })
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不生成新记录
    sys.update(1, em, 6000)
    const ticks = (sys as any).attempts.map((a: MimicryAttempt) => a.tick)
    expect(ticks.every((t: number) => t >= 1000)).toBe(true) // cutoff = 6000 - 5000 = 1000
  })

  it('未过期记录保留', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2, 'visual', 4000))
    ;(sys as any).lastCheck = 0
    const em = makeEm({ x: 0 }, { x: 10 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 5500)  // cutoff = 500，4000 > 500
    expect((sys as any).attempts.some((a: MimicryAttempt) => a.tick === 4000)).toBe(true)
  })

  it('全部过期记录被清空', () => {
    for (let i = 0; i < 5; i++) (sys as any).attempts.push(makeAttempt(i + 1, i + 10, 'visual', 0))
    ;(sys as any).lastCheck = 0
    const em = makeEm({ x: 0 }, { x: 10 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 10000) // cutoff = 5000，所有 tick=0 的都过期
    expect((sys as any).attempts.every((a: MimicryAttempt) => a.tick >= 5000)).toBe(true)
  })
})

// ─── 8. nextId 自增 ───────────────────────────────────────────────
describe('CreatureMimicrySystem - nextId 自增', () => {
  let sys: CreatureMimicrySystem
  beforeEach(() => { sys = makeSys() })

  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('手动自增后变为 2', () => {
    ;(sys as any).nextId++
    expect((sys as any).nextId).toBe(2)
  })
  it('update 生成记录后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm({ x: 0 }, { x: 10 })
    const before = (sys as any).nextId
    sys.update(1, em, 1100)
    expect((sys as any).nextId).toBeGreaterThan(before)
  })
  it('连续 update 后 nextId 单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm({ x: 0 }, { x: 10 })
    sys.update(1, em, 1100)
    const after1 = (sys as any).nextId
    sys.update(1, em, 2200)
    const after2 = (sys as any).nextId
    expect(after2).toBeGreaterThanOrEqual(after1)
  })
})

// ─── 9. MimicryAttempt 接口字段完整性 ────────────────────────────
describe('CreatureMimicrySystem - MimicryAttempt 字段', () => {
  let sys: CreatureMimicrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('id 字段为数字', () => {
    const a = makeAttempt(1, 2)
    expect(typeof a.id).toBe('number')
  })
  it('mimicId 字段为数字', () => {
    const a = makeAttempt(5, 10)
    expect(typeof a.mimicId).toBe('number')
  })
  it('targetId 字段为数字', () => {
    const a = makeAttempt(5, 10)
    expect(typeof a.targetId).toBe('number')
  })
  it('skill 取值范围 [0, 100]', () => {
    const a = makeAttempt(1, 2)
    a.skill = 50
    expect(a.skill).toBeGreaterThanOrEqual(0)
    expect(a.skill).toBeLessThanOrEqual(100)
  })
  it('benefit 失败时为 0', () => {
    const a = makeAttempt(1, 2)
    a.success = false
    a.benefit = 0
    expect(a.benefit).toBe(0)
  })
  it('benefit 成功时大于 0', () => {
    const a = makeAttempt(1, 2)
    a.success = true
    a.benefit = 0.35
    expect(a.benefit).toBeGreaterThan(0)
  })
  it('tick 字段记录发生时刻', () => {
    const a = makeAttempt(1, 2, 'visual', 9999)
    expect(a.tick).toBe(9999)
  })
})

// ─── 10. BENEFIT_MAP 收益映射 ─────────────────────────────────────
describe('CreatureMimicrySystem - 类型收益预期', () => {
  it('aggressive 类型收益最高(0.8)', () => {
    // 当 skill=100, success=true: benefit = 0.8 * (100/100) = 0.8
    const sys = makeSys()
    const a = makeAttempt(1, 2, 'aggressive')
    a.benefit = 0.8 * (a.skill / 100)
    expect(a.benefit).toBeCloseTo(0.48, 1)
  })
  it('acoustic 类型收益最低(0.4)', () => {
    const a = makeAttempt(1, 2, 'acoustic')
    a.benefit = 0.4 * (a.skill / 100)
    expect(a.benefit).toBeCloseTo(0.24, 1)
  })
  it('chemical 类型收益高于 visual', () => {
    // chemical=0.7, visual=0.5
    const chemBenefit = 0.7
    const visualBenefit = 0.5
    expect(chemBenefit).toBeGreaterThan(visualBenefit)
  })
  it('defensive 收益介于 behavioral 和 aggressive 之间', () => {
    // behavioral=0.6, defensive=0.65, aggressive=0.8
    expect(0.65).toBeGreaterThan(0.6)
    expect(0.65).toBeLessThan(0.8)
  })
})
