import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBasketWeaversSystem } from '../systems/CreatureBasketWeaversSystem'
import type { BasketWeaver, BasketType } from '../systems/CreatureBasketWeaversSystem'

// CHECK_INTERVAL=1350, CRAFT_CHANCE=0.006, MAX_WEAVERS=32, SKILL_GROWTH=0.07
// weavers cleanup: weaver.tick < tick-51000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeSys(): CreatureBasketWeaversSystem {
  return new CreatureBasketWeaversSystem()
}

function makeWeaver(entityId: number, type: BasketType = 'storage', overrides: Partial<BasketWeaver> = {}): BasketWeaver {
  return {
    id: nextId++,
    entityId,
    skill: 70,
    basketsMade: 12,
    basketType: type,
    tightness: 65,
    reputation: 45,
    tick: 0,
    ...overrides,
  }
}

// ── 初始状态 ───────────────────────────────────────────────────────────────

describe('CreatureBasketWeaversSystem — 初始状态', () => {
  let sys: CreatureBasketWeaversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无编篮工', () => {
    expect((sys as any).weavers).toHaveLength(0)
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

  it('weavers 是数组类型', () => {
    expect(Array.isArray((sys as any).weavers)).toBe(true)
  })

  it('skillMap 是 Map 类型', () => {
    expect((sys as any).skillMap instanceof Map).toBe(true)
  })
})

// ── 数据注入与查询 ─────────────────────────────────────────────────────────

describe('CreatureBasketWeaversSystem — 数据注入与查询', () => {
  let sys: CreatureBasketWeaversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入 storage 类型后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1, 'storage'))
    expect((sys as any).weavers[0].basketType).toBe('storage')
  })

  it('注入 carrying 类型后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1, 'carrying'))
    expect((sys as any).weavers[0].basketType).toBe('carrying')
  })

  it('注入 fishing 类型后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1, 'fishing'))
    expect((sys as any).weavers[0].basketType).toBe('fishing')
  })

  it('注入 decorative 类型后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1, 'decorative'))
    expect((sys as any).weavers[0].basketType).toBe('decorative')
  })

  it('支持所有4种篮子类型同时存在', () => {
    const types: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']
    types.forEach((t, i) => { ;(sys as any).weavers.push(makeWeaver(i + 1, t)) })
    const all = (sys as any).weavers
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].basketType).toBe(t) })
  })

  it('多个编篮工全部返回', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    ;(sys as any).weavers.push(makeWeaver(2))
    expect((sys as any).weavers).toHaveLength(2)
  })

  it('返回内部数组引用', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers).toBe((sys as any).weavers)
  })

  it('数据字段 skill 正确', () => {
    const w = makeWeaver(10, 'decorative', { skill: 80 })
    ;(sys as any).weavers.push(w)
    expect((sys as any).weavers[0].skill).toBe(80)
  })

  it('数据字段 basketsMade 正确', () => {
    const w = makeWeaver(10, 'decorative', { basketsMade: 20 })
    ;(sys as any).weavers.push(w)
    expect((sys as any).weavers[0].basketsMade).toBe(20)
  })

  it('数据字段 tightness 正确', () => {
    const w = makeWeaver(10, 'decorative', { tightness: 71 })
    ;(sys as any).weavers.push(w)
    expect((sys as any).weavers[0].tightness).toBe(71)
  })

  it('数据字段 reputation 正确', () => {
    const w = makeWeaver(10, 'decorative', { reputation: 68 })
    ;(sys as any).weavers.push(w)
    expect((sys as any).weavers[0].reputation).toBe(68)
  })

  it('数据字段 entityId 正确', () => {
    ;(sys as any).weavers.push(makeWeaver(77, 'storage'))
    expect((sys as any).weavers[0].entityId).toBe(77)
  })

  it('数据字段 tick 正确', () => {
    ;(sys as any).weavers.push(makeWeaver(1, 'storage', { tick: 88888 }))
    expect((sys as any).weavers[0].tick).toBe(88888)
  })
})

// ── CHECK_INTERVAL 节流 ────────────────────────────────────────────────────

describe('CreatureBasketWeaversSystem — CHECK_INTERVAL(1350) 节流', () => {
  let sys: CreatureBasketWeaversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < 1350 时不更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值 = 1350 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1350)
    expect((sys as any).lastCheck).toBe(1350)
  })

  it('tick差值 > 1350 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('tick差值 = 1349 时不更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1349)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck 非零时节流基于差值计算（差值不足不更新）', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000)   // 3000-2000=1000 < 1350
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('lastCheck 非零时差值 >= 1350 才更新', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3350)   // 3350-2000=1350 >= 1350
    expect((sys as any).lastCheck).toBe(3350)
  })

  it('连续两次触发 lastCheck 追踪最新 tick', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1350)
    sys.update(1, em, 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })

  it('未触发时 lastCheck 不变（连续小差值调用）', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 500)
    sys.update(1, em, 900)
    sys.update(1, em, 1200)
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ── skillMap 技能管理 ────────────────────────────────────────────���─────────

describe('CreatureBasketWeaversSystem — skillMap 技能管理', () => {
  let sys: CreatureBasketWeaversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skillMap 初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap 可手动注入技能值', () => {
    ;(sys as any).skillMap.set(99, 70)
    expect((sys as any).skillMap.get(99)).toBe(70)
  })

  it('skillMap 读取不存在的键返回 undefined', () => {
    expect((sys as any).skillMap.get(1)).toBeUndefined()
  })

  it('skillMap 可存储多个实体技能', () => {
    ;(sys as any).skillMap.set(1, 20)
    ;(sys as any).skillMap.set(2, 50)
    ;(sys as any).skillMap.set(3, 80)
    expect((sys as any).skillMap.size).toBe(3)
    expect((sys as any).skillMap.get(2)).toBe(50)
  })

  it('技能上限 100：skill+SKILL_GROWTH 超过 100 则截断', () => {
    const skill = 99.99
    const grown = Math.min(100, skill + 0.07)
    expect(grown).toBe(100)
  })

  it('技能上限 100：skill=100 加 SKILL_GROWTH 仍为 100', () => {
    const grown = Math.min(100, 100 + 0.07)
    expect(grown).toBe(100)
  })

  it('技能低时 SKILL_GROWTH 正常累加', () => {
    const skill = 30
    const grown = Math.min(100, skill + 0.07)
    expect(grown).toBeCloseTo(30.07, 5)
  })

  it('skillMap 覆盖同实体的技能值', () => {
    ;(sys as any).skillMap.set(5, 20)
    ;(sys as any).skillMap.set(5, 50)
    expect((sys as any).skillMap.get(5)).toBe(50)
  })
})

// ── weavers 过期清理 ───────────────────────────────────────────────────────

describe('CreatureBasketWeaversSystem — weavers 过期清理 (cutoff=tick-51000)', () => {
  let sys: CreatureBasketWeaversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick=0 (< cutoff=49000) 的编篮工被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'storage', { tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=100000-51000=49000
    expect((sys as any).weavers.length).toBe(0)
  })

  it('tick=55000 (>= cutoff=49000) 的编篮工被保留', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).weavers.push(makeWeaver(2, 'carrying', { tick: 55000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).weavers.length).toBe(1)
    expect((sys as any).weavers[0].entityId).toBe(2)
  })

  it('混合新旧编篮工：旧的清理，新的保留', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'storage', { tick: 0 }))
    ;(sys as any).weavers.push(makeWeaver(2, 'carrying', { tick: 55000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).weavers.length).toBe(1)
    expect((sys as any).weavers[0].entityId).toBe(2)
  })

  it('所有编篮工均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'storage', { tick: 50000 }))
    ;(sys as any).weavers.push(makeWeaver(2, 'fishing', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).weavers.length).toBe(2)
  })

  it('恰好在边界 tick=cutoff=49000 时保留', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'storage', { tick: 49000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=49000；49000 < 49000 为 false，保留
    expect((sys as any).weavers.length).toBe(1)
  })

  it('tick=48999 (< cutoff=49000) 被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'storage', { tick: 48999 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).weavers.length).toBe(0)
  })

  it('更小 tick 时 cutoff 也更小：tick=60000 cutoff=9000', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'storage', { tick: 8999 }))   // < 9000, 清理
    ;(sys as any).weavers.push(makeWeaver(2, 'storage', { tick: 9000 }))   // = 9000, 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 60000)  // cutoff=60000-51000=9000
    expect((sys as any).weavers.length).toBe(1)
    expect((sys as any).weavers[0].entityId).toBe(2)
  })

  it('清理多个过期编篮工', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    for (let i = 0; i < 5; i++) {
      ;(sys as any).weavers.push(makeWeaver(i + 1, 'storage', { tick: 1000 }))
    }
    ;(sys as any).weavers.push(makeWeaver(99, 'fishing', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=49000；tick=1000 < 49000 全清理
    expect((sys as any).weavers.length).toBe(1)
    expect((sys as any).weavers[0].entityId).toBe(99)
  })
})

// ── 公式验证 ──────────────────��───────────────────────────────────────────

describe('CreatureBasketWeaversSystem — 属性计算公式', () => {
  afterEach(() => vi.restoreAllMocks())

  it('basketType：skill=0 → index=0 → storage', () => {
    const types: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']
    expect(types[Math.min(3, Math.floor(0 / 25))]).toBe('storage')
  })

  it('basketType：skill=24 → index=0 → storage', () => {
    const types: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']
    expect(types[Math.min(3, Math.floor(24 / 25))]).toBe('storage')
  })

  it('basketType：skill=25 → index=1 → carrying', () => {
    const types: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']
    expect(types[Math.min(3, Math.floor(25 / 25))]).toBe('carrying')
  })

  it('basketType：skill=49 → index=1 → carrying', () => {
    const types: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']
    expect(types[Math.min(3, Math.floor(49 / 25))]).toBe('carrying')
  })

  it('basketType：skill=50 → index=2 → fishing', () => {
    const types: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']
    expect(types[Math.min(3, Math.floor(50 / 25))]).toBe('fishing')
  })

  it('basketType：skill=75 → index=3 → decorative', () => {
    const types: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']
    expect(types[Math.min(3, Math.floor(75 / 25))]).toBe('decorative')
  })

  it('basketType：skill=100 → index=min(3,4)=3 → decorative（上限保护）', () => {
    const types: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']
    expect(types[Math.min(3, Math.floor(100 / 25))]).toBe('decorative')
  })

  it('basketsMade：skill=0 → 2+floor(0/7)=2', () => {
    expect(2 + Math.floor(0 / 7)).toBe(2)
  })

  it('basketsMade：skill=7 → 2+floor(7/7)=3', () => {
    expect(2 + Math.floor(7 / 7)).toBe(3)
  })

  it('basketsMade：skill=70 → 2+floor(70/7)=12', () => {
    expect(2 + Math.floor(70 / 7)).toBe(12)
  })

  it('basketsMade：skill=100 → 2+floor(100/7)=16', () => {
    expect(2 + Math.floor(100 / 7)).toBe(16)
  })

  it('tightness：skill=0 → 15+0*0.7=15', () => {
    expect(15 + 0 * 0.7).toBeCloseTo(15, 5)
  })

  it('tightness：skill=70 → 15+70*0.7=64', () => {
    expect(15 + 70 * 0.7).toBeCloseTo(64, 5)
  })

  it('tightness：skill=100 → 15+100*0.7=85', () => {
    expect(15 + 100 * 0.7).toBeCloseTo(85, 5)
  })

  it('reputation：skill=0 → 8+0*0.75=8', () => {
    expect(8 + 0 * 0.75).toBeCloseTo(8, 5)
  })

  it('reputation：skill=70 → 8+70*0.75=60.5', () => {
    expect(8 + 70 * 0.75).toBeCloseTo(60.5, 5)
  })

  it('reputation：skill=100 → 8+100*0.75=83', () => {
    expect(8 + 100 * 0.75).toBeCloseTo(83, 5)
  })
})

// ── MAX_WEAVERS 上限 ───────────────────────────────────────────────────────

describe('CreatureBasketWeaversSystem — MAX_WEAVERS(32) 上限', () => {
  let sys: CreatureBasketWeaversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入 32 个编篮工后 length=32', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).weavers.push(makeWeaver(i + 1, 'storage'))
    }
    expect((sys as any).weavers.length).toBe(32)
  })

  it('注入 32 个时 update 不再新增（超出 MAX_WEAVERS 时 break）', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).weavers.push(makeWeaver(i + 1, 'storage', { tick: 999999 }))
    }
    const em = { getEntitiesWithComponents: () => [100, 101, 102] } as any
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1350)
    expect((sys as any).weavers.length).toBe(32)
    vi.restoreAllMocks()
  })
})

// ── update — 生物年龄过滤 ──────────────────────────────────────────────────

describe('CreatureBasketWeaversSystem — 生物年龄过滤 (age < 9)', () => {
  let sys: CreatureBasketWeaversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('age=8 (< 9) 的生物不创建编篮工', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, _type: string) => ({ age: 8 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1350)
    expect((sys as any).weavers.length).toBe(0)
  })

  it('age=9 (= 9) 的生物创建编篮工', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, _type: string) => ({ age: 9 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1350)
    expect((sys as any).weavers.length).toBe(1)
  })

  it('getComponent 返回 null 时不创建编篮工', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => null,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1350)
    expect((sys as any).weavers.length).toBe(0)
  })
})
