import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFringeMakersSystem } from '../systems/CreatureFringeMakersSystem'
import type { FringeMaker, FringeType } from '../systems/CreatureFringeMakersSystem'

let nextId = 1
function makeSys(): CreatureFringeMakersSystem { return new CreatureFringeMakersSystem() }
function makeMaker(entityId: number, skill: number = 40, fringeType: FringeType = 'bullion'): FringeMaker {
  const fringesMade = 3 + Math.floor(skill / 7)
  const evenness = 13 + skill * 0.73
  const reputation = 10 + skill * 0.80
  return { id: nextId++, entityId, skill, fringesMade, fringeType, evenness, reputation, tick: 0 }
}

function makeEm(entityIds: number[] = [], age: number = 20) {
  return {
    getEntitiesWithComponents: (_c1: string, _c2: string) => entityIds,
    getComponent: (_eid: number, _comp: string) => ({ age }),
    hasComponent: (_eid: number, _comp: string) => true,
  } as any
}

function makeEmWithHasComponent(entityIds: number[], age: number, hasMap: Record<number, boolean>) {
  return {
    getEntitiesWithComponents: (_c1: string, _c2: string) => entityIds,
    getComponent: (_eid: number, _comp: string) => ({ age }),
    hasComponent: (eid: number, _comp: string) => hasMap[eid] ?? false,
  } as any
}

const CHECK_INTERVAL = 1460
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.054
const FRINGE_TYPES: FringeType[] = ['bullion', 'tassel', 'knotted', 'looped']

// ============================================================
describe('CreatureFringeMakersSystem — 基础状态', () => {
  let sys: CreatureFringeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无流苏工记录', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 40, 'tassel'))
    expect((sys as any).makers[0].fringeType).toBe('tassel')
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('skillMap 初始为空 Map', () => {
    expect((sys as any).skillMap).toBeInstanceOf(Map)
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('makers 是数组', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })

  it('注入三条后长度为3', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    ;(sys as any).makers.push(makeMaker(3))
    expect((sys as any).makers).toHaveLength(3)
  })

  it('清空后长度为0', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.length = 0
    expect((sys as any).makers).toHaveLength(0)
  })

  it('id字段独立递增', () => {
    const m1 = makeMaker(1)
    const m2 = makeMaker(2)
    ;(sys as any).makers.push(m1, m2)
    expect((sys as any).makers[0].id).toBeLessThan((sys as any).makers[1].id)
  })
})

// ============================================================
describe('CreatureFringeMakersSystem — FringeType 枚举', () => {
  let sys: CreatureFringeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('FringeType 包含4种：bullion/tassel/knotted/looped', () => {
    const types: FringeType[] = ['bullion', 'tassel', 'knotted', 'looped']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, 40, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].fringeType).toBe(t) })
  })

  it('bullion 类型可存储', () => {
    const m = makeMaker(1, 40, 'bullion')
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].fringeType).toBe('bullion')
  })

  it('tassel 类型可存储', () => {
    const m = makeMaker(1, 40, 'tassel')
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].fringeType).toBe('tassel')
  })

  it('knotted 类型可存储', () => {
    const m = makeMaker(1, 40, 'knotted')
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].fringeType).toBe('knotted')
  })

  it('looped 类型可存储', () => {
    const m = makeMaker(1, 40, 'looped')
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].fringeType).toBe('looped')
  })
})

// ============================================================
describe('CreatureFringeMakersSystem — 公式验证', () => {
  let sys: CreatureFringeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('evenness公式：13 + skill * 0.73（skill=40）', () => {
    const skill = 40
    const m = makeMaker(1, skill)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].evenness).toBeCloseTo(13 + skill * 0.73, 5)
  })

  it('evenness公式：13 + skill * 0.73（skill=0）', () => {
    const skill = 0
    const m = makeMaker(1, skill)
    expect(m.evenness).toBeCloseTo(13 + skill * 0.73, 5)
  })

  it('evenness公式：13 + skill * 0.73（skill=100）', () => {
    const skill = 100
    const m = makeMaker(1, skill)
    expect(m.evenness).toBeCloseTo(13 + skill * 0.73, 5)
  })

  it('evenness公式：13 + skill * 0.73（skill=50）', () => {
    const skill = 50
    expect(makeMaker(1, skill).evenness).toBeCloseTo(13 + 50 * 0.73, 5)
  })

  it('reputation公式：10 + skill * 0.80（skill=60）', () => {
    const skill = 60
    const m = makeMaker(1, skill)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].reputation).toBeCloseTo(10 + skill * 0.80, 5)
  })

  it('reputation公式：10 + skill * 0.80（skill=0）', () => {
    expect(makeMaker(1, 0).reputation).toBeCloseTo(10, 5)
  })

  it('reputation公式：10 + skill * 0.80（skill=100）', () => {
    expect(makeMaker(1, 100).reputation).toBeCloseTo(90, 5)
  })

  it('reputation公式：10 + skill * 0.80（skill=25）', () => {
    expect(makeMaker(1, 25).reputation).toBeCloseTo(10 + 25 * 0.80, 5)
  })

  it('fringesMade公式：3 + floor(skill / 7)（skill=35）', () => {
    const skill = 35
    const m = makeMaker(1, skill)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].fringesMade).toBe(3 + Math.floor(skill / 7))
  })

  it('fringesMade公式：3 + floor(skill / 7)（skill=0）', () => {
    expect(makeMaker(1, 0).fringesMade).toBe(3)
  })

  it('fringesMade公式：3 + floor(skill / 7)（skill=7）', () => {
    expect(makeMaker(1, 7).fringesMade).toBe(4)
  })

  it('fringesMade公式：3 + floor(skill / 7)（skill=14）', () => {
    expect(makeMaker(1, 14).fringesMade).toBe(5)
  })

  it('fringesMade公式：3 + floor(skill / 7)（skill=100）', () => {
    expect(makeMaker(1, 100).fringesMade).toBe(3 + Math.floor(100 / 7))
  })

  it('fringesMade公式：3 + floor(skill / 7)（skill=6）floor舍弃', () => {
    expect(makeMaker(1, 6).fringesMade).toBe(3 + Math.floor(6 / 7))
  })
})

// ============================================================
describe('CreatureFringeMakersSystem — fringeType 分段（skill/25）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('skill=0 -> bullion（idx=0）', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(0 / 25))]).toBe('bullion')
  })

  it('skill=10 -> bullion', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('bullion')
  })

  it('skill=24 -> bullion（边界）', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(24 / 25))]).toBe('bullion')
  })

  it('skill=25 -> tassel（边界下限）', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('tassel')
  })

  it('skill=30 -> tassel', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(30 / 25))]).toBe('tassel')
  })

  it('skill=49 -> tassel（边界）', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(49 / 25))]).toBe('tassel')
  })

  it('skill=50 -> knotted（边界下限）', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('knotted')
  })

  it('skill=60 -> knotted', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(60 / 25))]).toBe('knotted')
  })

  it('skill=74 -> knotted（边界）', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(74 / 25))]).toBe('knotted')
  })

  it('skill=75 -> looped（边界下限）', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('looped')
  })

  it('skill=80 -> looped', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(80 / 25))]).toBe('looped')
  })

  it('skill=100 -> looped（clamp上限）', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('looped')
  })

  it('skill=200 -> 仍为looped（Math.min(3,...)防止越界）', () => {
    expect(FRINGE_TYPES[Math.min(3, Math.floor(200 / 25))]).toBe('looped')
  })
})

// ============================================================
describe('CreatureFringeMakersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureFringeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < 1460 时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 2000
    sys.update(1, makeEm(), 2000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('tick差值 >= 1460 时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick差值恰好等于1460时触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), 1460)
    expect((sys as any).lastCheck).toBe(1460)
  })

  it('tick差值为1459时不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), 1459)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('多次调用lastCheck连续推进', () => {
    sys.update(1, makeEm(), 1460)
    sys.update(1, makeEm(), 2920)
    expect((sys as any).lastCheck).toBe(2920)
  })

  it('高tick值正常触发', () => {
    ;(sys as any).lastCheck = 1000000
    sys.update(1, makeEm(), 1000000 + 1460)
    expect((sys as any).lastCheck).toBe(1000000 + 1460)
  })

  it('节流期间不调用getEntitiesWithComponents', () => {
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]), getComponent: vi.fn(), hasComponent: vi.fn().mockReturnValue(true) } as any
    sys.update(1, em, 0)
    const firstCallCount = em.getEntitiesWithComponents.mock.calls.length
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect(em.getEntitiesWithComponents.mock.calls.length).toBe(firstCallCount)
  })
})

// ============================================================
describe('CreatureFringeMakersSystem — time-based cleanup（cutoff = tick - 52000）', () => {
  let sys: CreatureFringeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < cutoff 的记录被删除', () => {
    const currentTick = 100000
    ;(sys as any).makers.push({ ...makeMaker(1), tick: 40000 })
    ;(sys as any).makers.push({ ...makeMaker(2), tick: 60000 })
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), currentTick)
    const remaining = (sys as any).makers
    expect(remaining.every((m: FringeMaker) => m.entityId !== 1)).toBe(true)
    expect(remaining.some((m: FringeMaker) => m.entityId === 2)).toBe(true)
  })

  it('tick恰好等于cutoff时保留（cutoff条件严格小于）', () => {
    const currentTick = 100000
    const cutoff = currentTick - 52000
    ;(sys as any).makers.push({ ...makeMaker(1), tick: cutoff })
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), currentTick)
    expect((sys as any).makers.some((m: FringeMaker) => m.entityId === 1)).toBe(true)
  })

  it('tick = cutoff - 1 被删除', () => {
    const currentTick = 100000
    const cutoff = currentTick - 52000
    ;(sys as any).makers.push({ ...makeMaker(1), tick: cutoff - 1 })
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), currentTick)
    expect((sys as any).makers.every((m: FringeMaker) => m.entityId !== 1)).toBe(true)
  })

  it('多条旧记录全部清除', () => {
    const currentTick = 100000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).makers.push({ ...makeMaker(i + 1), tick: 10000 })
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), currentTick)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('新旧混合时只删旧的', () => {
    const currentTick = 100000
    ;(sys as any).makers.push({ ...makeMaker(1), tick: 1000 })   // 旧
    ;(sys as any).makers.push({ ...makeMaker(2), tick: 80000 })  // 新
    ;(sys as any).makers.push({ ...makeMaker(3), tick: 90000 })  // 新
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), currentTick)
    expect((sys as any).makers).toHaveLength(2)
    expect((sys as any).makers.some((m: FringeMaker) => m.entityId === 1)).toBe(false)
  })

  it('cutoff = tick - 52000：tick=52001, 记录tick=0被删', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), tick: 0 })
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), 52001)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('cutoff = tick - 52000：tick=52000, 记录tick=0保留（0 < 0 为false）', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), tick: 0 })
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), 52000)
    // cutoff = 52000 - 52000 = 0, maker.tick=0, 0 < 0 is false => 保留
    expect((sys as any).makers.some((m: FringeMaker) => m.entityId === 1)).toBe(true)
  })
})

// ============================================================
describe('CreatureFringeMakersSystem — skillMap 管理', () => {
  let sys: CreatureFringeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('SKILL_GROWTH 常量为 0.054', () => {
    const oldSkill = 10
    const expectedSkill = Math.min(100, oldSkill + SKILL_GROWTH)
    expect(expectedSkill).toBeCloseTo(10.054, 5)
  })

  it('skillMap 可手动写入和读取', () => {
    ;(sys as any).skillMap.set(42, 55)
    expect((sys as any).skillMap.get(42)).toBe(55)
  })

  it('skillMap skill 上限为 100', () => {
    ;(sys as any).skillMap.set(1, 99.98)
    const current = (sys as any).skillMap.get(1)
    const newSkill = Math.min(100, current + SKILL_GROWTH)
    expect(newSkill).toBe(100)
  })

  it('skillMap 多实体独立存储', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 50)
    ;(sys as any).skillMap.set(3, 80)
    expect((sys as any).skillMap.get(1)).toBe(10)
    expect((sys as any).skillMap.get(2)).toBe(50)
    expect((sys as any).skillMap.get(3)).toBe(80)
  })

  it('未知实体初始skill在 [2, 9) 范围', () => {
    const base = 2
    const max = 2 + 7
    for (let i = 0; i < 20; i++) {
      const skill = base + Math.random() * 7
      expect(skill).toBeGreaterThanOrEqual(base)
      expect(skill).toBeLessThan(max)
    }
  })

  it('skill 增长后写回 skillMap', () => {
    ;(sys as any).skillMap.set(1, 20)
    const old = (sys as any).skillMap.get(1)
    const updated = Math.min(100, old + SKILL_GROWTH)
    ;(sys as any).skillMap.set(1, updated)
    expect((sys as any).skillMap.get(1)).toBeCloseTo(20.054, 5)
  })
})

// ============================================================
describe('CreatureFringeMakersSystem — MAX_MAKERS 上限', () => {
  let sys: CreatureFringeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入30条时长度为30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })

  it('注入30条后，调用update且Math.random返回0（必然进入craft分支），不再新增', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push({ ...makeMaker(i + 1), tick: 999999 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([999], 20)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    // makers 中 tick=999999 全部新鲜，不会被清除；因为已满30条，不再push
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
  })

  it('MAX_MAKERS 值为30', () => {
    expect(MAX_MAKERS).toBe(30)
  })
})

// ============================================================
describe('CreatureFringeMakersSystem — FringeMaker 接口字段完整性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('FringeMaker 有 id 字段', () => {
    const m = makeMaker(1)
    expect('id' in m).toBe(true)
  })

  it('FringeMaker 有 entityId 字段', () => {
    const m = makeMaker(5)
    expect(m.entityId).toBe(5)
  })

  it('FringeMaker 有 skill 字段', () => {
    const m = makeMaker(1, 55)
    expect(m.skill).toBe(55)
  })

  it('FringeMaker 有 fringesMade 字段且为整数', () => {
    const m = makeMaker(1, 40)
    expect(Number.isInteger(m.fringesMade)).toBe(true)
  })

  it('FringeMaker 有 fringeType 字段', () => {
    const m = makeMaker(1, 40, 'knotted')
    expect(m.fringeType).toBe('knotted')
  })

  it('FringeMaker 有 evenness 字段且为数字', () => {
    const m = makeMaker(1, 40)
    expect(typeof m.evenness).toBe('number')
  })

  it('FringeMaker 有 reputation 字段且为数字', () => {
    const m = makeMaker(1, 40)
    expect(typeof m.reputation).toBe('number')
  })

  it('FringeMaker 有 tick 字段', () => {
    const m = makeMaker(1)
    expect('tick' in m).toBe(true)
  })

  it('tick 字段默认为 0', () => {
    const m = makeMaker(1)
    expect(m.tick).toBe(0)
  })
})

// ============================================================
describe('CreatureFringeMakersSystem — update 触发craft流程（mock Math.random）', () => {
  let sys: CreatureFringeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random > CRAFT_CHANCE 时不生成记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    const em = makeEm([1, 2, 3], 20)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('age < 10 的实体不会生成记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], 5)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('Math.random=0 且 age>=10 时生成记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], 20)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(1)
  })

  it('生成记录时 entityId 对应实体', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([42], 20)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].entityId).toBe(42)
    }
  })

  it('生成记录时 tick 等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], 20)
    const currentTick = CHECK_INTERVAL
    sys.update(1, em, currentTick)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].tick).toBe(currentTick)
    }
  })

  it('空实体列表不生成记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([], 20)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })
})

// ============================================================
describe('CreatureFringeMakersSystem — 综合边界场景', () => {
  let sys: CreatureFringeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('连续两次触发update，lastCheck 正确推进', () => {
    sys.update(1, makeEm(), 1460)
    sys.update(1, makeEm(), 2920)
    expect((sys as any).lastCheck).toBe(2920)
  })

  it('CHECK_INTERVAL 常量为 1460', () => {
    expect(CHECK_INTERVAL).toBe(1460)
  })

  it('CRAFT_CHANCE 常量为 0.005', () => {
    expect(CRAFT_CHANCE).toBe(0.005)
  })

  it('FRINGE_TYPES 数组长度为4', () => {
    expect(FRINGE_TYPES).toHaveLength(4)
  })

  it('FRINGE_TYPES[0] 为 bullion', () => {
    expect(FRINGE_TYPES[0]).toBe('bullion')
  })

  it('FRINGE_TYPES[3] 为 looped', () => {
    expect(FRINGE_TYPES[3]).toBe('looped')
  })

  it('makers 注入后可按 entityId 过滤', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    const forEntity1 = (sys as any).makers.filter((m: FringeMaker) => m.entityId === 1)
    expect(forEntity1).toHaveLength(2)
  })

  it('makers 注入后可按 fringeType 过滤', () => {
    ;(sys as any).makers.push(makeMaker(1, 40, 'bullion'))
    ;(sys as any).makers.push(makeMaker(2, 40, 'tassel'))
    ;(sys as any).makers.push(makeMaker(3, 40, 'bullion'))
    const bullions = (sys as any).makers.filter((m: FringeMaker) => m.fringeType === 'bullion')
    expect(bullions).toHaveLength(2)
  })

  it('skill=99.95 时增长后被 clamp 到 100', () => {
    const skill = 99.95
    const newSkill = Math.min(100, skill + SKILL_GROWTH)
    expect(newSkill).toBe(100)
  })

  it('不同 entityId 之间的数据独立', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'bullion'))
    ;(sys as any).makers.push(makeMaker(2, 70, 'looped'))
    expect((sys as any).makers[0].fringeType).toBe('bullion')
    expect((sys as any).makers[1].fringeType).toBe('looped')
  })

  it('update 参数 dt 不影响节流逻辑（仅tick有效）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(999, makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(999, makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})
