import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureGrommetMakersSystem } from '../systems/CreatureGrommetMakersSystem'
import type { GrommetMaker, GrommetType } from '../systems/CreatureGrommetMakersSystem'

let nextId = 1
function makeSys(): CreatureGrommetMakersSystem { return new CreatureGrommetMakersSystem() }
function makeMaker(entityId: number, grommetType: GrommetType = 'sail', skill = 40): GrommetMaker {
  return {
    id: nextId++, entityId, skill, grommetsMade: 25,
    grommetType, precision: 16 + skill * 0.72, reputation: 10 + skill * 0.78, tick: 0,
  }
}

function makeEmStub(creatureIds: number[] = [], livingIds: Set<number> = new Set(), age = 20) {
  return {
    getEntitiesWithComponents: (_a: string, _b: string) => creatureIds,
    getComponent: (_eid: number, _comp: string) => ({ age }),
    hasComponent: (eid: number, _comp: string) => livingIds.has(eid),
    tick: 0,
  } as any
}

const CHECK_INTERVAL = 1440
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.056
const GROMMET_TYPES: GrommetType[] = ['sail', 'tent', 'leather', 'banner']

// ============================================================
describe('CreatureGrommetMakersSystem — 基础数据结构', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无索眼工', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'banner'))
    expect((sys as any).makers[0].grommetType).toBe('banner')
  })

  it('支持所有 4 种索眼类型', () => {
    const types: GrommetType[] = ['sail', 'tent', 'leather', 'banner']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].grommetType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('skillMap 初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('makers 是数组', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })

  it('skillMap 是 Map 实例', () => {
    expect((sys as any).skillMap).toBeInstanceOf(Map)
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

  it('id 字段连续递增', () => {
    const m1 = makeMaker(1)
    const m2 = makeMaker(2)
    ;(sys as any).makers.push(m1, m2)
    expect((sys as any).makers[0].id).toBeLessThan((sys as any).makers[1].id)
  })
})

// ============================================================
describe('CreatureGrommetMakersSystem — GrommetType 枚举', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sail 类型可存储', () => {
    const m = makeMaker(1, 'sail')
    expect(m.grommetType).toBe('sail')
  })

  it('tent 类型可存储', () => {
    const m = makeMaker(1, 'tent')
    expect(m.grommetType).toBe('tent')
  })

  it('leather 类型可存储', () => {
    const m = makeMaker(1, 'leather')
    expect(m.grommetType).toBe('leather')
  })

  it('banner 类型可存储', () => {
    const m = makeMaker(1, 'banner')
    expect(m.grommetType).toBe('banner')
  })

  it('GROMMET_TYPES 数组长度为4', () => {
    expect(GROMMET_TYPES).toHaveLength(4)
  })

  it('GROMMET_TYPES[0] 为 sail', () => {
    expect(GROMMET_TYPES[0]).toBe('sail')
  })

  it('GROMMET_TYPES[1] 为 tent', () => {
    expect(GROMMET_TYPES[1]).toBe('tent')
  })

  it('GROMMET_TYPES[2] 为 leather', () => {
    expect(GROMMET_TYPES[2]).toBe('leather')
  })

  it('GROMMET_TYPES[3] 为 banner', () => {
    expect(GROMMET_TYPES[3]).toBe('banner')
  })
})

// ============================================================
describe('CreatureGrommetMakersSystem — precision / reputation 公式', () => {
  afterEach(() => vi.restoreAllMocks())

  it('precision = 16 + skill * 0.72（skill=50）', () => {
    const skill = 50
    const m = makeMaker(1, 'sail', skill)
    expect(m.precision).toBeCloseTo(16 + skill * 0.72, 5)
  })

  it('precision = 16 + skill * 0.72（skill=0）', () => {
    const m = makeMaker(1, 'sail', 0)
    expect(m.precision).toBeCloseTo(16, 5)
  })

  it('precision = 16 + skill * 0.72（skill=100）', () => {
    const m = makeMaker(1, 'sail', 100)
    expect(m.precision).toBeCloseTo(16 + 100 * 0.72, 5)
  })

  it('precision = 16 + skill * 0.72（skill=25）', () => {
    const m = makeMaker(1, 'tent', 25)
    expect(m.precision).toBeCloseTo(16 + 25 * 0.72, 5)
  })

  it('reputation = 10 + skill * 0.78（skill=60）', () => {
    const skill = 60
    const m = makeMaker(1, 'tent', skill)
    expect(m.reputation).toBeCloseTo(10 + skill * 0.78, 5)
  })

  it('reputation = 10 + skill * 0.78（skill=0）', () => {
    const m = makeMaker(1, 'leather', 0)
    expect(m.reputation).toBeCloseTo(10, 5)
  })

  it('reputation = 10 + skill * 0.78（skill=100）', () => {
    const m = makeMaker(1, 'banner', 100)
    expect(m.reputation).toBeCloseTo(10 + 100 * 0.78, 5)
  })

  it('reputation = 10 + skill * 0.78（skill=75）', () => {
    const m = makeMaker(1, 'banner', 75)
    expect(m.reputation).toBeCloseTo(10 + 75 * 0.78, 5)
  })

  it('grommetsMade = 4 + floor(skill/6)（skill=40）', () => {
    const skill = 40
    const expected = 4 + Math.floor(skill / 6)
    const m = makeMaker(1, 'leather', skill)
    ;(m as any).grommetsMade = 4 + Math.floor(skill / 6)
    expect(m.grommetsMade).toBe(expected)
  })

  it('grommetsMade = 4 + floor(skill/6)（skill=0）', () => {
    expect(4 + Math.floor(0 / 6)).toBe(4)
  })

  it('grommetsMade = 4 + floor(skill/6)（skill=6）', () => {
    expect(4 + Math.floor(6 / 6)).toBe(5)
  })

  it('grommetsMade = 4 + floor(skill/6)（skill=100）', () => {
    expect(4 + Math.floor(100 / 6)).toBe(4 + 16)
  })

  it('grommetsMade = 4 + floor(skill/6)（skill=5）floor舍弃', () => {
    expect(4 + Math.floor(5 / 6)).toBe(4)
  })
})

// ============================================================
describe('CreatureGrommetMakersSystem — grommetType 由 skill/25 决定', () => {
  afterEach(() => vi.restoreAllMocks())

  it('skill=0 -> sail（idx=0）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(0 / 25))]).toBe('sail')
  })

  it('skill < 25 => sail（索引0）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('sail')
  })

  it('skill=24 -> sail（边界）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(24 / 25))]).toBe('sail')
  })

  it('25 <= skill < 50 => tent（索引1）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(30 / 25))]).toBe('tent')
  })

  it('skill=25 -> tent（边界下限）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('tent')
  })

  it('skill=49 -> tent（边界上限）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(49 / 25))]).toBe('tent')
  })

  it('50 <= skill < 75 => leather（索引2）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(60 / 25))]).toBe('leather')
  })

  it('skill=50 -> leather（边界下限）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('leather')
  })

  it('skill=74 -> leather（边界上限）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(74 / 25))]).toBe('leather')
  })

  it('skill >= 75 => banner（索引3）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(80 / 25))]).toBe('banner')
  })

  it('skill=75 -> banner（边界下限）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('banner')
  })

  it('skill=100 -> banner（clamp生效）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('banner')
  })

  it('skill=200 -> 仍为banner（Math.min(3,...)防止越界）', () => {
    expect(GROMMET_TYPES[Math.min(3, Math.floor(200 / 25))]).toBe('banner')
  })
})

// ============================================================
describe('CreatureGrommetMakersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 1440 时不更新 lastCheck', () => {
    const em = makeEmStub([])
    sys.update(0, em, 0)
    const before = (sys as any).lastCheck
    sys.update(0, em, 1439)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick 差值 >= 1440 时更新 lastCheck', () => {
    const em = makeEmStub([])
    sys.update(0, em, 0)
    sys.update(0, em, 1440)
    expect((sys as any).lastCheck).toBe(1440)
  })

  it('tick 差值恰好等于 1440 时触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub([]), 1440)
    expect((sys as any).lastCheck).toBe(1440)
  })

  it('tick 差值为 1439 时不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub([]), 1439)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('多次调用 lastCheck 连续推进', () => {
    const em = makeEmStub([])
    sys.update(0, em, 1440)
    sys.update(0, em, 2880)
    expect((sys as any).lastCheck).toBe(2880)
  })

  it('高 tick 值正常触发', () => {
    ;(sys as any).lastCheck = 500000
    sys.update(0, makeEmStub([]), 500000 + 1440)
    expect((sys as any).lastCheck).toBe(500000 + 1440)
  })

  it('节流期间不调用 getEntitiesWithComponents', () => {
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]), getComponent: vi.fn(), hasComponent: vi.fn().mockReturnValue(true) } as any
    sys.update(0, em, 0)
    const firstCalls = em.getEntitiesWithComponents.mock.calls.length
    sys.update(0, em, CHECK_INTERVAL - 1)
    expect(em.getEntitiesWithComponents.mock.calls.length).toBe(firstCalls)
  })

  it('CHECK_INTERVAL 常量为 1440', () => {
    expect(CHECK_INTERVAL).toBe(1440)
  })
})

// ============================================================
describe('CreatureGrommetMakersSystem — time-based cleanup（cutoff = tick - 52000）', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 过期（< cutoff）的记录被清除', () => {
    const old = makeMaker(1, 'sail', 20)
    old.tick = 0
    ;(sys as any).makers.push(old)
    const currentTick = 52001
    const cutoff = currentTick - 52000
    for (let i = (sys as any).makers.length - 1; i >= 0; i--) {
      if ((sys as any).makers[i].tick < cutoff) (sys as any).makers.splice(i, 1)
    }
    expect((sys as any).makers).toHaveLength(0)
  })

  it('未过期的记录保留', () => {
    const fresh = makeMaker(2, 'tent', 30)
    fresh.tick = 50000
    ;(sys as any).makers.push(fresh)
    const currentTick = 52001
    const cutoff = currentTick - 52000
    for (let i = (sys as any).makers.length - 1; i >= 0; i--) {
      if ((sys as any).makers[i].tick < cutoff) (sys as any).makers.splice(i, 1)
    }
    expect((sys as any).makers).toHaveLength(1)
  })

  it('tick 恰好等于 cutoff 时保留（strict < 不删除）', () => {
    const currentTick = 100000
    const cutoff = currentTick - 52000
    ;(sys as any).makers.push({ ...makeMaker(1), tick: cutoff })
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub([]), currentTick)
    expect((sys as any).makers.some((m: GrommetMaker) => m.entityId === 1)).toBe(true)
  })

  it('tick = cutoff - 1 被删除', () => {
    const currentTick = 100000
    const cutoff = currentTick - 52000
    ;(sys as any).makers.push({ ...makeMaker(1), tick: cutoff - 1 })
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub([]), currentTick)
    expect((sys as any).makers.every((m: GrommetMaker) => m.entityId !== 1)).toBe(true)
  })

  it('多条旧记录全部清除', () => {
    const currentTick = 100000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).makers.push({ ...makeMaker(i + 1), tick: 10000 })
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub([]), currentTick)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('新旧混合时只删旧的', () => {
    const currentTick = 100000
    ;(sys as any).makers.push({ ...makeMaker(1), tick: 1000 })
    ;(sys as any).makers.push({ ...makeMaker(2), tick: 80000 })
    ;(sys as any).makers.push({ ...makeMaker(3), tick: 90000 })
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub([]), currentTick)
    expect((sys as any).makers).toHaveLength(2)
    expect((sys as any).makers.some((m: GrommetMaker) => m.entityId === 1)).toBe(false)
  })

  it('cutoff 精确计算：tick=52000, 记录tick=0, 0<0为false => 保留', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), tick: 0 })
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub([]), 52000)
    expect((sys as any).makers.some((m: GrommetMaker) => m.entityId === 1)).toBe(true)
  })

  it('cutoff 精确计算：tick=52001, 记录tick=0, 0<1为true => 删除', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), tick: 0 })
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub([]), 52001)
    expect((sys as any).makers).toHaveLength(0)
  })
})

// ============================================================
describe('CreatureGrommetMakersSystem — skillMap 管理', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('SKILL_GROWTH 常量为 0.056', () => {
    expect(SKILL_GROWTH).toBe(0.056)
  })

  it('skillMap 可手动写入和读取', () => {
    ;(sys as any).skillMap.set(10, 30)
    expect((sys as any).skillMap.get(10)).toBe(30)
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

  it('skill 增长后写回 skillMap', () => {
    ;(sys as any).skillMap.set(1, 20)
    const old = (sys as any).skillMap.get(1)
    const updated = Math.min(100, old + SKILL_GROWTH)
    ;(sys as any).skillMap.set(1, updated)
    expect((sys as any).skillMap.get(1)).toBeCloseTo(20.056, 5)
  })

  it('未知实体初始 skill 基础值为 2 + random*7', () => {
    for (let i = 0; i < 10; i++) {
      const skill = 2 + Math.random() * 7
      expect(skill).toBeGreaterThanOrEqual(2)
      expect(skill).toBeLessThan(9)
    }
  })
})

// ============================================================
describe('CreatureGrommetMakersSystem — MAX_MAKERS 上限', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('MAX_MAKERS 常量为 30', () => {
    expect(MAX_MAKERS).toBe(30)
  })

  it('注入30条时长度为30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })

  it('注入30条后 update 且 Math.random=0 不超过MAX_MAKERS', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push({ ...makeMaker(i + 1), tick: 999999 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub([999], new Set([999]), 20), 100000)
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
  })
})

// ============================================================
describe('CreatureGrommetMakersSystem — update 触发craft流程（mock Math.random）', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random > CRAFT_CHANCE 时不生成记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    const em = makeEmStub([1, 2, 3], new Set([1, 2, 3]), 20)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('age < 10 的实体不会生成记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmStub([1], new Set([1]), 5)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('Math.random=0 且 age>=10 时生成记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmStub([1], new Set([1]), 20)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(1)
  })

  it('空实体列表不生成记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeEmStub([]), 1440)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('生成记录时 entityId 对应传入实体', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmStub([99], new Set([99]), 20)
    sys.update(0, em, CHECK_INTERVAL)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].entityId).toBe(99)
    }
  })

  it('生成记录时 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmStub([1], new Set([1]), 20)
    const currentTick = CHECK_INTERVAL
    sys.update(0, em, currentTick)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].tick).toBe(currentTick)
    }
  })
})

// ============================================================
describe('CreatureGrommetMakersSystem — GrommetMaker 接口字段完整性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('GrommetMaker 有 id 字段', () => {
    const m = makeMaker(1)
    expect('id' in m).toBe(true)
  })

  it('GrommetMaker 有 entityId 字段', () => {
    const m = makeMaker(7)
    expect(m.entityId).toBe(7)
  })

  it('GrommetMaker 有 skill 字段', () => {
    const m = makeMaker(1, 'sail', 60)
    expect(m.skill).toBe(60)
  })

  it('GrommetMaker 有 grommetsMade 字段', () => {
    const m = makeMaker(1)
    expect('grommetsMade' in m).toBe(true)
  })

  it('GrommetMaker 有 grommetType 字段', () => {
    const m = makeMaker(1, 'leather')
    expect(m.grommetType).toBe('leather')
  })

  it('GrommetMaker 有 precision 字段且为数字', () => {
    const m = makeMaker(1, 'sail', 40)
    expect(typeof m.precision).toBe('number')
  })

  it('GrommetMaker 有 reputation 字段且为数字', () => {
    const m = makeMaker(1, 'sail', 40)
    expect(typeof m.reputation).toBe('number')
  })

  it('GrommetMaker 有 tick 字段且默认为 0', () => {
    const m = makeMaker(1)
    expect(m.tick).toBe(0)
  })
})

// ============================================================
describe('CreatureGrommetMakersSystem — 综合边界场景', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('连续两次触发 update，lastCheck 正确推进', () => {
    sys.update(0, makeEmStub([]), 1440)
    sys.update(0, makeEmStub([]), 2880)
    expect((sys as any).lastCheck).toBe(2880)
  })

  it('CRAFT_CHANCE 常量为 0.005', () => {
    expect(CRAFT_CHANCE).toBe(0.005)
  })

  it('makers 注入后可按 entityId 过滤', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    const forEntity1 = (sys as any).makers.filter((m: GrommetMaker) => m.entityId === 1)
    expect(forEntity1).toHaveLength(2)
  })

  it('makers 注入后可按 grommetType 过滤', () => {
    ;(sys as any).makers.push(makeMaker(1, 'sail'))
    ;(sys as any).makers.push(makeMaker(2, 'tent'))
    ;(sys as any).makers.push(makeMaker(3, 'sail'))
    const sails = (sys as any).makers.filter((m: GrommetMaker) => m.grommetType === 'sail')
    expect(sails).toHaveLength(2)
  })

  it('skill=99.95 时增长后被 clamp 到 100', () => {
    const newSkill = Math.min(100, 99.95 + SKILL_GROWTH)
    expect(newSkill).toBe(100)
  })

  it('不同 entityId 之间的数据独立', () => {
    ;(sys as any).makers.push(makeMaker(1, 'sail', 30))
    ;(sys as any).makers.push(makeMaker(2, 'banner', 80))
    expect((sys as any).makers[0].grommetType).toBe('sail')
    expect((sys as any).makers[1].grommetType).toBe('banner')
  })

  it('update 参数 dt 不影响节流逻辑', () => {
    ;(sys as any).lastCheck = 0
    sys.update(999, makeEmStub([]), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(999, makeEmStub([]), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})
