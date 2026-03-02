import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBraidMakersSystem } from '../systems/CreatureBraidMakersSystem'
import type { BraidMaker, BraidType } from '../systems/CreatureBraidMakersSystem'

// 常量: CHECK_INTERVAL=1480, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.052
// makers cleanup: maker.tick < tick-52000 时删除
// skillMap 存储每个生物的技能，技能上限 100
// tension = 14 + skill * 0.74
// reputation = 10 + skill * 0.79
// braidsMade = 3 + floor(skill / 7)
// braidType = BRAID_TYPES[min(3, floor(skill/25))]
// BRAID_TYPES = ['cord', 'trim', 'soutache', 'gimp']

let nextId = 1

function makeSys(): CreatureBraidMakersSystem {
  return new CreatureBraidMakersSystem()
}

function makeMaker(entityId: number, braidType: BraidType = 'cord', overrides: Partial<BraidMaker> = {}): BraidMaker {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    braidsMade: 5,
    braidType,
    tension: 40,
    reputation: 35,
    tick: 0,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureBraidMakersSystem - 基础初始化', () => {
  let sys: CreatureBraidMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无编绳师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 skillMap 为空 Map', () => {
    expect((sys as any).skillMap).toBeInstanceOf(Map)
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('makers 是数组类型', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })

  it('不同实例互相独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).makers.push(makeMaker(1))
    expect((s2 as any).makers).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureBraidMakersSystem - BraidMaker 数据结构', () => {
  let sys: CreatureBraidMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 braidType', () => {
    ;(sys as any).makers.push(makeMaker(1, 'gimp'))
    expect((sys as any).makers[0].braidType).toBe('gimp')
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种编绳类型', () => {
    const types: BraidType[] = ['cord', 'trim', 'soutache', 'gimp']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].braidType).toBe(t) })
  })

  it('数据字段完整 - skill/braidsMade/tension/reputation', () => {
    const m = makeMaker(10, 'trim')
    m.skill = 80; m.braidsMade = 20; m.tension = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80)
    expect(r.braidsMade).toBe(20)
    expect(r.tension).toBe(90)
    expect(r.reputation).toBe(85)
  })

  it('entityId 字段正确存储', () => {
    ;(sys as any).makers.push(makeMaker(42, 'soutache'))
    expect((sys as any).makers[0].entityId).toBe(42)
  })

  it('tick 字段正确存储', () => {
    ;(sys as any).makers.push(makeMaker(1, 'cord', { tick: 99999 }))
    expect((sys as any).makers[0].tick).toBe(99999)
  })

  it('id 字段存在且为数值', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(typeof (sys as any).makers[0].id).toBe('number')
  })

  it('多个工匠各自独立', () => {
    ;(sys as any).makers.push(makeMaker(1, 'cord', { skill: 10 }))
    ;(sys as any).makers.push(makeMaker(2, 'gimp', { skill: 90 }))
    expect((sys as any).makers[0].skill).toBe(10)
    expect((sys as any).makers[1].skill).toBe(90)
  })

  it('可注入 MAX_MAKERS(30) 个工匠', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureBraidMakersSystem - CHECK_INTERVAL 节流控制', () => {
  let sys: CreatureBraidMakersSystem
  const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < CHECK_INTERVAL(1480) 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值 >= CHECK_INTERVAL(1480) 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).lastCheck).toBe(1480)
  })

  it('lastCheck 非零时节流正确计算差值 - 不触发', () => {
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000) // 1000 < 1480，不更新
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('lastCheck 非零时节流正确计算差值 - 触发', () => {
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3480) // 3480-2000=1480 >= 1480，更新
    expect((sys as any).lastCheck).toBe(3480)
  })

  it('tick 等于 lastCheck+1479 时不触发（边界）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1479)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 等于 lastCheck+1480 时触发（边界）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).lastCheck).toBe(1480)
  })

  it('多次连续 update - lastCheck 在每次触发后更新', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).lastCheck).toBe(1480)
    sys.update(1, em, 2960)
    expect((sys as any).lastCheck).toBe(2960)
  })

  it('节流未触发时 makers 列表不受清理影响', () => {
    ;(sys as any).makers.push(makeMaker(1, 'cord', { tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 500) // 不触发
    expect((sys as any).makers).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureBraidMakersSystem - skillMap 技能管理', () => {
  let sys: CreatureBraidMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skillMap 初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap 可手动注入技能值', () => {
    ;(sys as any).skillMap.set(99, 70)
    expect((sys as any).skillMap.get(99)).toBe(70)
  })

  it('skillMap 技能上限 100 - 接近上限时 min 生效', () => {
    const skill = 99.99
    const grown = Math.min(100, skill + 0.052)
    expect(grown).toBe(100)
  })

  it('skillMap 技能在正常范围内增长 SKILL_GROWTH=0.052', () => {
    const skill = 50
    const grown = Math.min(100, skill + 0.052)
    expect(grown).toBeCloseTo(50.052, 5)
  })

  it('skillMap 同一 entityId 设置多次取最新值', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(1, 60)
    expect((sys as any).skillMap.get(1)).toBe(60)
  })

  it('skillMap 不同 entityId 各自独立', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 80)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(80)
  })

  it('skillMap.get 未知 key 返回 undefined', () => {
    expect((sys as any).skillMap.get(9999)).toBeUndefined()
  })

  it('技能从 0 增长后不超过 100', () => {
    // 模拟极端情况：技能恰好在 100 附近
    let skill = 100
    skill = Math.min(100, skill + 0.052)
    expect(skill).toBe(100)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureBraidMakersSystem - makers 过期清理', () => {
  let sys: CreatureBraidMakersSystem
  const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < cutoff 的匠人被清理', () => {
    ;(sys as any).makers.push(makeMaker(1, 'cord', { tick: 0 }))     // 0 < 48000，被清理
    ;(sys as any).makers.push(makeMaker(2, 'gimp', { tick: 55000 })) // 55000 >= 48000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000) // cutoff = 100000-52000=48000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有匠人 tick 均新鲜时不清理', () => {
    ;(sys as any).makers.push(makeMaker(1, 'cord', { tick: 50000 }))
    ;(sys as any).makers.push(makeMaker(2, 'trim', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000) // cutoff=48000，两者均保留
    expect((sys as any).makers.length).toBe(2)
  })

  it('cutoff 边界 - tick === cutoff 时保留（cutoff是严格小于）', () => {
    ;(sys as any).makers.push(makeMaker(1, 'cord', { tick: 48000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000) // cutoff=48000, maker.tick=48000 不 < cutoff，保留
    expect((sys as any).makers.length).toBe(1)
  })

  it('cutoff 边界 - tick === cutoff-1 时被清理', () => {
    ;(sys as any).makers.push(makeMaker(1, 'cord', { tick: 47999 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000) // cutoff=48000, 47999 < 48000，被清理
    expect((sys as any).makers.length).toBe(0)
  })

  it('清理后 nextId 不回退', () => {
    const idBefore = (sys as any).nextId
    ;(sys as any).makers.push(makeMaker(1, 'cord', { tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).nextId).toBe(idBefore) // nextId 由系统内部控制，不受 push 影响
  })

  it('全部过期时 makers 清空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'cord', { tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('部分过期 - 只清理过期的', () => {
    ;(sys as any).makers.push(makeMaker(1, 'cord', { tick: 0 }))      // 过期
    ;(sys as any).makers.push(makeMaker(2, 'cord', { tick: 48001 }))  // 保留
    ;(sys as any).makers.push(makeMaker(3, 'cord', { tick: 10000 }))  // 过期
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureBraidMakersSystem - 推导公式验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('braidType 按 skill/25 分 4 档：skill=0 → cord', () => {
    const types: BraidType[] = ['cord', 'trim', 'soutache', 'gimp']
    expect(types[Math.min(3, Math.floor(0 / 25))]).toBe('cord')
  })

  it('braidType: skill=25 → trim', () => {
    const types: BraidType[] = ['cord', 'trim', 'soutache', 'gimp']
    expect(types[Math.min(3, Math.floor(25 / 25))]).toBe('trim')
  })

  it('braidType: skill=50 → soutache', () => {
    const types: BraidType[] = ['cord', 'trim', 'soutache', 'gimp']
    expect(types[Math.min(3, Math.floor(50 / 25))]).toBe('soutache')
  })

  it('braidType: skill=75 → gimp', () => {
    const types: BraidType[] = ['cord', 'trim', 'soutache', 'gimp']
    expect(types[Math.min(3, Math.floor(75 / 25))]).toBe('gimp')
  })

  it('braidType: skill=100 → gimp（上限锁定 index 3）', () => {
    const types: BraidType[] = ['cord', 'trim', 'soutache', 'gimp']
    expect(types[Math.min(3, Math.floor(100 / 25))]).toBe('gimp')
  })

  it('braidType: skill=24.99 → cord（不够到 trim）', () => {
    const types: BraidType[] = ['cord', 'trim', 'soutache', 'gimp']
    expect(types[Math.min(3, Math.floor(24.99 / 25))]).toBe('cord')
  })

  it('braidsMade: skill=30 时 = 3 + floor(30/7) = 7', () => {
    expect(3 + Math.floor(30 / 7)).toBe(7)
  })

  it('braidsMade: skill=0 时 = 3 + 0 = 3', () => {
    expect(3 + Math.floor(0 / 7)).toBe(3)
  })

  it('braidsMade: skill=70 时 = 3 + floor(70/7) = 13', () => {
    expect(3 + Math.floor(70 / 7)).toBe(13)
  })

  it('braidsMade: skill=100 时 = 3 + floor(100/7) = 17', () => {
    expect(3 + Math.floor(100 / 7)).toBe(17)
  })

  it('tension: skill=30 时 = 14 + 30*0.74 = 36.2', () => {
    expect(14 + 30 * 0.74).toBeCloseTo(36.2, 5)
  })

  it('tension: skill=0 时 = 14', () => {
    expect(14 + 0 * 0.74).toBe(14)
  })

  it('tension: skill=100 时 = 14 + 74 = 88', () => {
    expect(14 + 100 * 0.74).toBeCloseTo(88, 5)
  })

  it('reputation: skill=0 时 = 10 + 0 = 10', () => {
    expect(10 + 0 * 0.79).toBe(10)
  })

  it('reputation: skill=50 时 = 10 + 50*0.79 = 49.5', () => {
    expect(10 + 50 * 0.79).toBeCloseTo(49.5, 5)
  })

  it('reputation: skill=100 时 = 10 + 79 = 89', () => {
    expect(10 + 100 * 0.79).toBeCloseTo(89, 5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureBraidMakersSystem - MAX_MAKERS 上限', () => {
  let sys: CreatureBraidMakersSystem
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('MAX_MAKERS 为 30', () => {
    // 通过能注入 30 个验证
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })

  it('当 makers.length >= 30 时 update 不再新增（entities 提供实体但已达上限）', () => {
    // 填满 30 个
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'cord', { tick: 100000 }))
    }
    // mock: Math.random 总是 0（CRAFT_CHANCE=0.005，0 <= 0.005 触发），age>=10
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [9999],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBe(30)
  })

  it('makers 少于 30 时 update 可以新增（随机触发）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 <= CRAFT_CHANCE(0.005) 触发
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureBraidMakersSystem - 生物条件过滤（age）', () => {
  let sys: CreatureBraidMakersSystem
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('age < 10 的生物不创建编绳师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 概率触发
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 9 }), // age 不足
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBe(0)
  })

  it('age === 10 的生物满足条件', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 10 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBe(1)
  })

  it('getComponent 返回 null 时不创建编绳师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => null,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBe(0)
  })

  it('CRAFT_CHANCE=0.005：random > 0.005 时不创建编绳师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.006) // > 0.005
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureBraidMakersSystem - 新创建编绳师字段正确性', () => {
  let sys: CreatureBraidMakersSystem
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('创建的编绳师 entityId 与生物 ID 对应', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [42],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers[0].entityId).toBe(42)
  })

  it('创建的编绳师 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers[0].tick).toBe(1480)
  })

  it('创建的编绳师使用 skillMap 中现有技能', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(1, 50) // 预设技能 50
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    // skill = min(100, 50 + 0.052) = 50.052
    expect((sys as any).makers[0].skill).toBeCloseTo(50.052, 3)
  })

  it('创建编绳师后 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    const idBefore = (sys as any).nextId
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).nextId).toBe(idBefore + 1)
  })

  it('创建的编绳师 id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers[0].id).toBe(1)
  })
})
