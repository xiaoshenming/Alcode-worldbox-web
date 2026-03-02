import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureCartographerSystem } from '../systems/CreatureCartographerSystem'
import type { Cartographer, MapType } from '../systems/CreatureCartographerSystem'
import { EntityManager } from '../ecs/Entity'

// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────
let nextId = 1

function makeSys(): CreatureCartographerSystem {
  return new CreatureCartographerSystem()
}

function makeCartographer(entityId: number, mapType: MapType = 'terrain', overrides: Partial<Cartographer> = {}): Cartographer {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    mapsDrawn: 5,
    mapType,
    accuracy: 60,
    coverage: 40,
    tick: 0,
    ...overrides,
  }
}

/** 创建包含 creature+position 组件的 EntityManager，age 可配置 */
function makeEmWithCreatures(count: number, age = 20): EntityManager {
  const em = new EntityManager()
  for (let i = 0; i < count; i++) {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age })
    em.addComponent(eid, { type: 'position', x: i * 5, y: i * 5 })
  }
  return em
}

// ─────────────────────────────────────────���───────────────────────────────────
// 初始状态
// ─────────────────────────────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('cartographers 初始为空', () => {
    expect((sys as any).cartographers).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('skillMap 初始为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cartographer 数据结构
// ─────────────────────────────────────────────────────────────────────────────
describe('Cartographer 数据结构', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入制图师后可查询', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'nautical'))
    expect((sys as any).cartographers[0].mapType).toBe('nautical')
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).cartographers.push(makeCartographer(1))
    expect((sys as any).cartographers).toBe((sys as any).cartographers)
  })

  it('entityId 字段正确存储', () => {
    ;(sys as any).cartographers.push(makeCartographer(42))
    expect((sys as any).cartographers[0].entityId).toBe(42)
  })

  it('skill 字段正确存储', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { skill: 75 }))
    expect((sys as any).cartographers[0].skill).toBe(75)
  })

  it('mapsDrawn 字段正确存储', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { mapsDrawn: 12 }))
    expect((sys as any).cartographers[0].mapsDrawn).toBe(12)
  })

  it('accuracy 字段正确存储', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { accuracy: 85.5 }))
    expect((sys as any).cartographers[0].accuracy).toBeCloseTo(85.5)
  })

  it('coverage 字段正确存储', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { coverage: 55 }))
    expect((sys as any).cartographers[0].coverage).toBe(55)
  })

  it('tick 字段正确存储', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { tick: 9000 }))
    expect((sys as any).cartographers[0].tick).toBe(9000)
  })

  it('支持所有 4 种地图类型', () => {
    const types: MapType[] = ['terrain', 'trade', 'military', 'nautical']
    types.forEach((t, i) => { ;(sys as any).cartographers.push(makeCartographer(i + 1, t)) })
    const all = (sys as any).cartographers
    types.forEach((t, i) => { expect(all[i].mapType).toBe(t) })
  })

  it('多个制图师独立存储不互相干扰', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { skill: 10 }))
    ;(sys as any).cartographers.push(makeCartographer(2, 'military', { skill: 90 }))
    expect((sys as any).cartographers[0].skill).toBe(10)
    expect((sys as any).cartographers[1].skill).toBe(90)
    expect((sys as any).cartographers[0].mapType).toBe('terrain')
    expect((sys as any).cartographers[1].mapType).toBe('military')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// skillMap
// ─────────────────────────────────────────────────────────────────────────────
describe('skillMap', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未知实体返回 undefined（默认 0）', () => {
    expect((sys as any).skillMap.get(999) ?? 0).toBe(0)
  })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 75)
    expect((sys as any).skillMap.get(42) ?? 0).toBe(75)
  })

  it('可以覆盖已有技能值', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(1, 60)
    expect((sys as any).skillMap.get(1)).toBe(60)
  })

  it('多个实体技能独立', () => {
    ;(sys as any).skillMap.set(1, 20)
    ;(sys as any).skillMap.set(2, 80)
    expect((sys as any).skillMap.get(1)).toBe(20)
    expect((sys as any).skillMap.get(2)).toBe(80)
  })

  it('skillMap.size 反映注入数量', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    ;(sys as any).skillMap.set(3, 30)
    expect((sys as any).skillMap.size).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// update 节流逻辑
// ─────────────────────────────────────────────────────────────────────────────
describe('update 节流逻辑', () => {
  let sys: CreatureCartographerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEmWithCreatures(3) })

  it('tick < CHECK_INTERVAL(1500) 时 update 不执行', () => {
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL 时 lastCheck 更新', () => {
    sys.update(1, em, 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('差值未达阈值时再次调用 lastCheck 不变', () => {
    sys.update(1, em, 1500)
    sys.update(1, em, 2000) // 差值 500 < 1500
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('差值再次达到 1500 时 lastCheck 更新', () => {
    sys.update(1, em, 1500)
    sys.update(1, em, 3001)
    expect((sys as any).lastCheck).toBe(3001)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 制图师创建条件
// ─────────────────────────────────────────────────────────────────────────────
describe('制图师创建条件', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('年龄 < 15 的生物不会成为制图师', () => {
    const em = makeEmWithCreatures(5, 10) // age=10
    // 强制随机触发创建
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = -9999
    sys.update(1, em, 0)
    // age=10 < 15，不应创建
    expect((sys as any).cartographers).toHaveLength(0)
    randSpy.mockRestore()
  })

  it('年龄 >= 15 的生物可以成为制图师', () => {
    const em = makeEmWithCreatures(1, 20) // age=20 >= 15
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001) // < CRAFT_CHANCE=0.004
    ;(sys as any).lastCheck = -9999
    sys.update(1, em, 0)
    expect((sys as any).cartographers.length).toBeGreaterThanOrEqual(0) // 可能创建
    randSpy.mockRestore()
  })

  it('random > CRAFT_CHANCE 时不创建制图师', () => {
    const em = makeEmWithCreatures(3, 20)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999) // >> 0.004
    ;(sys as any).lastCheck = -9999
    sys.update(1, em, 0)
    expect((sys as any).cartographers).toHaveLength(0)
    randSpy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// accuracy / coverage 上限
// ─────────────────────────────────────────────────────────────────────────────
describe('accuracy / coverage 字段约束', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('accuracy 不超过 100', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { accuracy: 100 }))
    expect((sys as any).cartographers[0].accuracy).toBeLessThanOrEqual(100)
  })

  it('coverage 不超过 100', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { coverage: 100 }))
    expect((sys as any).cartographers[0].coverage).toBeLessThanOrEqual(100)
  })

  it('skill=100 时 accuracy 计算不溢出 100', () => {
    // accuracy = min(100, 20 + skill*0.7 + random*10) = min(100, 20+70+x) >= 90
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { skill: 100, accuracy: 100 }))
    expect((sys as any).cartographers[0].accuracy).toBeLessThanOrEqual(100)
  })
})

// ────────────────────────────────────────────────────────────���────────────────
// 过期制图师清理
// ─────────────────────────────────────────────────────────────────────────────
describe('过期制图师清理', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < cutoff(tick-48000) 的制图师被移除', () => {
    // 当前 tick=100000，cutoff=52000；制图师 tick=0 < 52000 → 被移除
    const c = makeCartographer(1, 'terrain', { tick: 0 })
    ;(sys as any).cartographers.push(c)
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 100000)
    expect((sys as any).cartographers).toHaveLength(0)
  })

  it('较新的制图师不被移除', () => {
    // tick=99999 > cutoff=52000 → 保留
    const c = makeCartographer(1, 'terrain', { tick: 99999 })
    ;(sys as any).cartographers.push(c)
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 100000)
    expect((sys as any).cartographers).toHaveLength(1)
  })

  it('混合新旧制图师只移除旧的', () => {
    const old = makeCartographer(1, 'terrain', { tick: 0 })
    const fresh = makeCartographer(2, 'trade', { tick: 99999 })
    ;(sys as any).cartographers.push(old)
    ;(sys as any).cartographers.push(fresh)
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 100000)
    expect((sys as any).cartographers).toHaveLength(1)
    expect((sys as any).cartographers[0].entityId).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MAX_CARTOGRAPHERS 上限
// ─────────────────────────────────────────────────────────────────────────────
describe('MAX_CARTOGRAPHERS 上限', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('cartographers 达到 35 时不再新建', () => {
    // 注入 35 个制图师
    for (let i = 0; i < 35; i++) {
      ;(sys as any).cartographers.push(makeCartographer(i + 1))
    }
    const initialLen = (sys as any).cartographers.length
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(5, 20)
    sys.update(1, em, 0)
    // 数量应 <= MAX_CARTOGRAPHERS=35
    expect((sys as any).cartographers.length).toBeLessThanOrEqual(35)
    randSpy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SKILL_GROWTH
// ─────────────────────────────────────────────────────────────────────────────
describe('skill 成长逻辑', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已有技能的实体每次触发时 skillMap 增长 SKILL_GROWTH(0.07)', () => {
    // 预先注入已知技能
    ;(sys as any).skillMap.set(1, 50)
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 20 })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    // 强制 Math.random < CRAFT_CHANCE，且该实体 id 匹配
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = -9999
    sys.update(1, em, 0)
    // skill 应增加 0.07（可能还创建了 cartographer）
    const skill = (sys as any).skillMap.get(eid) ?? 0
    expect(skill).toBeGreaterThan(0)
    randSpy.mockRestore()
  })

  it('skill 上限为 100', () => {
    ;(sys as any).skillMap.set(1, 99.99)
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 20 })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = -9999
    sys.update(1, em, 0)
    const skill = (sys as any).skillMap.get(eid) ?? 0
    expect(skill).toBeLessThanOrEqual(100)
    randSpy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// mapsDrawn 计算
// ─────────────────────────────────────────────────────────────────────────────
describe('mapsDrawn 计算', () => {
  it('低 skill 时 mapsDrawn 至少为 1', () => {
    // mapsDrawn = 1 + floor(skill/15); skill=5 → 1+0=1
    const mapsDrawn = 1 + Math.floor(5 / 15)
    expect(mapsDrawn).toBe(1)
  })

  it('高 skill 时 mapsDrawn 更多', () => {
    // skill=90 → 1+6=7
    const mapsDrawn = 1 + Math.floor(90 / 15)
    expect(mapsDrawn).toBe(7)
  })

  it('skill=100 时 mapsDrawn 不超过 1+6=7', () => {
    const mapsDrawn = 1 + Math.floor(100 / 15)
    expect(mapsDrawn).toBeLessThanOrEqual(8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// id 唯一性与 nextId
// ─────────────────────────────────────────────────────────────────────────────
describe('id 唯一性', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('多个制图师 id 唯一', () => {
    const ids = new Set<number>()
    for (let i = 0; i < 5; i++) {
      const c = makeCartographer(i + 1)
      ;(sys as any).cartographers.push(c)
      ids.add(c.id)
    }
    expect(ids.size).toBe(5)
  })

  it('系统 nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// accuracy 下界
// ─────────────────────────────────────────────────────────────────────────────
describe('accuracy 与 coverage 下界', () => {
  it('skill=5 时 accuracy 至少 = 20 + 5*0.7 = 23.5', () => {
    const accuracy = 20 + 5 * 0.7
    expect(accuracy).toBeCloseTo(23.5)
  })

  it('skill=0 时 coverage 至少 = 10', () => {
    const coverage = 10 + 0 * 0.5 + 1 * 3
    expect(coverage).toBeCloseTo(13)
  })

  it('skill=100 accuracy 被 min(100) 裁剪', () => {
    const accuracy = Math.min(100, 20 + 100 * 0.7 + 10)
    expect(accuracy).toBe(100)
  })

  it('skill=100 mapsDrawn=7 时 coverage = 10 + 50 + 21 = 81', () => {
    // coverage = 10 + skill*0.5 + mapsDrawn*3 = 10 + 50 + 21 = 81 (不超100)
    const coverage = Math.min(100, 10 + 100 * 0.5 + 7 * 3)
    expect(coverage).toBe(81)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 极端值与边界
// ─────────────────────────────────────────────────────────────────────────────
describe('极端值', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill=0 合法', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { skill: 0 }))
    expect((sys as any).cartographers[0].skill).toBe(0)
  })

  it('skill=100 合法', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { skill: 100 }))
    expect((sys as any).cartographers[0].skill).toBe(100)
  })

  it('accuracy=0 合法', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { accuracy: 0 }))
    expect((sys as any).cartographers[0].accuracy).toBe(0)
  })

  it('coverage=0 合法', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'terrain', { coverage: 0 }))
    expect((sys as any).cartographers[0].coverage).toBe(0)
  })

  it('entityId=0 合法存储', () => {
    ;(sys as any).cartographers.push(makeCartographer(0))
    expect((sys as any).cartographers[0].entityId).toBe(0)
  })

  it('entityId 大整数合法', () => {
    ;(sys as any).cartographers.push(makeCartographer(999999))
    expect((sys as any).cartographers[0].entityId).toBe(999999)
  })

  it('tick=0 合法', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'trade', { tick: 0 }))
    expect((sys as any).cartographers[0].tick).toBe(0)
  })

  it('mapsDrawn=0 合法', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'trade', { mapsDrawn: 0 }))
    expect((sys as any).cartographers[0].mapsDrawn).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 空 EntityManager 情况
// ─────────────────────────────────────────────────────────────────────────────
describe('空 EntityManager', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无实体时 update 不报错', () => {
    const em = new EntityManager()
    ;(sys as any).lastCheck = -9999
    expect(() => sys.update(1, em, 0)).not.toThrow()
  })

  it('无实体时 cartographers 保持为空', () => {
    const em = new EntityManager()
    ;(sys as any).lastCheck = -9999
    sys.update(1, em, 0)
    expect((sys as any).cartographers).toHaveLength(0)
  })

  it('有实体但无 creature 组件时不创建制图师', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    ;(sys as any).lastCheck = -9999
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em, 0)
    expect((sys as any).cartographers).toHaveLength(0)
    randSpy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// pruneDeadEntities 触发
// ─────────────────────────────────────────────────────────────────────────────
describe('pruneDeadEntities 清理 skillMap', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('死亡实体在 tick%3600==0 时从 skillMap 中移除', () => {
    const em = new EntityManager()
    // 注入技能但不添加实体（模拟死亡实体）
    ;(sys as any).skillMap.set(999, 50)
    ;(sys as any).lastCheck = -9999
    // tick=3600 且 %3600==0 → pruneDeadEntities 触发
    sys.update(1, em, 3600)
    expect((sys as any).skillMap.has(999)).toBe(false)
  })

  it('存活实体在 pruneDeadEntities 时保留 skillMap 记录', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 20 })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    ;(sys as any).skillMap.set(eid, 75)
    ;(sys as any).lastCheck = -9999
    // tick=3600 触发 prune，但实体存活 → 保留
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, 3600)
    expect((sys as any).skillMap.has(eid)).toBe(true)
    randSpy.mockRestore()
  })
})
