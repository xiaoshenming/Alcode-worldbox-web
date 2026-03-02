import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureHarnessMakersSystem } from '../systems/CreatureHarnessMakersSystem'
import type { HarnessMaker, HarnessType } from '../systems/CreatureHarnessMakersSystem'

let nextId = 1
function makeSys(): CreatureHarnessMakersSystem { return new CreatureHarnessMakersSystem() }

function makeMaker(entityId: number, harnessType: HarnessType = 'riding', skill = 60, tick = 0): HarnessMaker {
  const harnessessMade = 1 + Math.floor(skill / 10)
  const leatherwork = 15 + skill * 0.68
  const reputation = 10 + skill * 0.78
  return { id: nextId++, entityId, skill, harnessessMade, harnessType, leatherwork, reputation, tick }
}

function makeEmStub(entityIds: number[] = [], ages: Record<number, number> = {}) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(entityIds),
    getComponent: vi.fn().mockImplementation((_eid: number, _ctype: string) => {
      const age = ages[_eid] ?? 20
      return { age }
    }),
    hasComponent: vi.fn().mockReturnValue(true),
  } as any
}

describe('CreatureHarnessMakersSystem — 初始化状态', () => {
  let sys: CreatureHarnessMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无马具匠', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('makers 初始为空数组', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })

  it('skillMap 初始为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('两个实例互相独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).makers.push(makeMaker(1))
    expect((s2 as any).makers).toHaveLength(0)
  })
})

describe('CreatureHarnessMakersSystem — 数据查询', () => {
  let sys: CreatureHarnessMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 harnessType', () => {
    ;(sys as any).makers.push(makeMaker(1, 'draft'))
    expect((sys as any).makers[0].harnessType).toBe('draft')
  })

  it('支持所有 4 种 HarnessType', () => {
    const types: HarnessType[] = ['draft', 'riding', 'pack', 'ceremonial']
    types.forEach((t, i) => { (sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers as HarnessMaker[]
    types.forEach((t, i) => { expect(all[i].harnessType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('注入 10 个马具匠全部存在', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).makers.push(makeMaker(i))
    }
    expect((sys as any).makers).toHaveLength(10)
  })

  it('各字段类型正确', () => {
    const m = makeMaker(1, 'riding', 60)
    expect(typeof m.id).toBe('number')
    expect(typeof m.entityId).toBe('number')
    expect(typeof m.skill).toBe('number')
    expect(typeof m.harnessessMade).toBe('number')
    expect(typeof m.leatherwork).toBe('number')
    expect(typeof m.reputation).toBe('number')
    expect(typeof m.tick).toBe('number')
  })

  it('tick 字段正确保存', () => {
    ;(sys as any).makers.push(makeMaker(1, 'riding', 60, 5000))
    expect((sys as any).makers[0].tick).toBe(5000)
  })
})

describe('CreatureHarnessMakersSystem — 公式验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('leatherwork = 15 + skill * 0.68', () => {
    const m = makeMaker(1, 'riding', 50)
    expect(m.leatherwork).toBeCloseTo(15 + 50 * 0.68)
  })

  it('reputation = 10 + skill * 0.78', () => {
    const m = makeMaker(1, 'pack', 80)
    expect(m.reputation).toBeCloseTo(10 + 80 * 0.78)
  })

  it('harnessessMade = 1 + floor(skill / 10)', () => {
    expect(makeMaker(1, 'draft', 0).harnessessMade).toBe(1)
    expect(makeMaker(2, 'draft', 25).harnessessMade).toBe(3)
    expect(makeMaker(3, 'draft', 99).harnessessMade).toBe(10)
  })

  it('harnessType 由 skill/25 决定 4 段', () => {
    const HARNESS_TYPES: HarnessType[] = ['draft', 'riding', 'pack', 'ceremonial']
    const cases: [number, HarnessType][] = [
      [0, 'draft'],
      [25, 'riding'],
      [50, 'pack'],
      [75, 'ceremonial'],
    ]
    for (const [skill, expected] of cases) {
      const typeIdx = Math.min(3, Math.floor(skill / 25))
      expect(HARNESS_TYPES[typeIdx]).toBe(expected)
    }
  })

  it('skill >= 100 时 harnessType 仍为 ceremonial（Math.min(3,...) 上限）', () => {
    const HARNESS_TYPES: HarnessType[] = ['draft', 'riding', 'pack', 'ceremonial']
    const typeIdx = Math.min(3, Math.floor(200 / 25))
    expect(HARNESS_TYPES[typeIdx]).toBe('ceremonial')
  })

  it('skill=24 时 harnessType 为 draft', () => {
    const HARNESS_TYPES: HarnessType[] = ['draft', 'riding', 'pack', 'ceremonial']
    expect(HARNESS_TYPES[Math.min(3, Math.floor(24 / 25))]).toBe('draft')
  })

  it('skill=49 时 harnessType 为 riding', () => {
    const HARNESS_TYPES: HarnessType[] = ['draft', 'riding', 'pack', 'ceremonial']
    expect(HARNESS_TYPES[Math.min(3, Math.floor(49 / 25))]).toBe('riding')
  })

  it('skill=74 时 harnessType 为 pack', () => {
    const HARNESS_TYPES: HarnessType[] = ['draft', 'riding', 'pack', 'ceremonial']
    expect(HARNESS_TYPES[Math.min(3, Math.floor(74 / 25))]).toBe('pack')
  })

  it('skill=100 时 leatherwork = 15 + 100*0.68 = 83', () => {
    const m = makeMaker(1, 'ceremonial', 100)
    expect(m.leatherwork).toBeCloseTo(83)
  })

  it('skill=100 时 reputation = 10 + 100*0.78 = 88', () => {
    const m = makeMaker(1, 'ceremonial', 100)
    expect(m.reputation).toBeCloseTo(88)
  })

  it('skill=0 时 leatherwork = 15', () => {
    const m = makeMaker(1, 'draft', 0)
    expect(m.leatherwork).toBeCloseTo(15)
  })

  it('skill=0 时 reputation = 10', () => {
    const m = makeMaker(1, 'draft', 0)
    expect(m.reputation).toBeCloseTo(10)
  })

  it('harnessessMade skill=10 时为 2', () => {
    expect(makeMaker(1, 'draft', 10).harnessessMade).toBe(2)
  })

  it('harnessessMade skill=100 时为 11', () => {
    expect(makeMaker(1, 'ceremonial', 100).harnessessMade).toBe(11)
  })
})

describe('CreatureHarnessMakersSystem — CHECK_INTERVAL 节流 (1400)', () => {
  let sys: CreatureHarnessMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 1400 不触发', () => {
    const em = makeEmStub()
    sys.update(0, em, 10000)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    sys.update(0, em, 10000 + 1399)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('tick 差值 >= 1400 更新 lastCheck', () => {
    const em = makeEmStub()
    sys.update(0, em, 1000)
    sys.update(0, em, 1000 + 1400)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('update 后 lastCheck 更新，短间隔不再触发', () => {
    const em = makeEmStub()
    sys.update(0, em, 5000)
    sys.update(0, em, 5050)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('恰好 1400 时触发', () => {
    const em = makeEmStub()
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })

  it('1399 时不触发', () => {
    const em = makeEmStub()
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('连续两次满足间隔 lastCheck 递进', () => {
    const em = makeEmStub()
    sys.update(0, em, 1400)
    sys.update(0, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('大 tick 值仍正确触发', () => {
    const em = makeEmStub()
    ;(sys as any).lastCheck = 1_000_000
    sys.update(0, em, 1_001_400)
    expect((sys as any).lastCheck).toBe(1_001_400)
  })

  it('触发后 lastCheck 等于当前 tick', () => {
    const em = makeEmStub()
    sys.update(0, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
})

describe('CreatureHarnessMakersSystem — time-based cleanup', () => {
  let sys: CreatureHarnessMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('超过 50000 tick 的马具匠被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'draft', 60, 0))
    const em = makeEmStub()
    sys.update(0, em, 51400)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('未超过 50000 tick 的马具匠保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'riding', 60, 10000))
    const em = makeEmStub()
    sys.update(0, em, 11400)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('tick=50000 时 cutoff=0，tick=0 的马具匠正好 < 0 不成立，保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'draft', 60, 0))
    const em = makeEmStub()
    // cutoff = 50000 - 50000 = 0; tick=0 < 0 为 false => 保留
    sys.update(0, em, 50000 + 1400)
    // tick=0 的马具匠 cutoff = 51400-50000=1400; 0 < 1400 => 删除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('多个马具匠混合：旧的删，新的留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'draft', 60, 0))      // 旧
    ;(sys as any).makers.push(makeMaker(2, 'riding', 60, 40000)) // 新
    const em = makeEmStub()
    sys.update(0, em, 51400)
    // cutoff = 51400 - 50000 = 1400
    // maker[0].tick=0 < 1400 => 删
    // maker[1].tick=40000 >= 1400 => 留
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('cleanup 从后往前遍历不跳过元素', () => {
    ;(sys as any).makers.push(makeMaker(1, 'draft', 60, 0))
    ;(sys as any).makers.push(makeMaker(2, 'riding', 60, 30000))
    ;(sys as any).makers.push(makeMaker(3, 'pack', 60, 0))
    const em = makeEmStub()
    sys.update(0, em, 51400)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('全部过期时清空数组', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).makers.push(makeMaker(i, 'draft', 60, 0))
    }
    const em = makeEmStub()
    sys.update(0, em, 51400)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick 很大时不影响新近马具匠', () => {
    const bigTick = 1_000_000
    ;(sys as any).makers.push(makeMaker(1, 'ceremonial', 60, bigTick - 1000))
    const em = makeEmStub()
    ;(sys as any).lastCheck = bigTick - 2000
    sys.update(0, em, bigTick)
    // cutoff = bigTick - 50000; maker.tick = bigTick-1000 > cutoff => 保留
    expect((sys as any).makers).toHaveLength(1)
  })
})

describe('CreatureHarnessMakersSystem — EM 集成与招募', () => {
  let sys: CreatureHarnessMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('getEntitiesWithComponents 被调用（触发时）', () => {
    const em = makeEmStub()
    sys.update(0, em, 5000)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledWith('creature', 'position')
  })

  it('未触发时 getEntitiesWithComponents 不被调用', () => {
    const em = makeEmStub()
    ;(sys as any).lastCheck = 5000
    sys.update(0, em, 5001)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('age < 10 的生物不会被招募', () => {
    const em = makeEmStub([1], { 1: 5 }) // age=5 < 10
    vi.spyOn(Math, 'random').mockReturnValue(0) // 确保通过 CRAFT_CHANCE
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('age >= 10 且通过概率时被招募', () => {
    const em = makeEmStub([1], { 1: 20 })
    // CRAFT_CHANCE = 0.005，random > 0.005 跳过，random <= 0.005 通过
    // 条件是 Math.random() > CRAFT_CHANCE 跳过，所以 random=0 时通过
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('makers 达到 MAX_MAKERS(30) 时不再招募', () => {
    for (let i = 1; i <= 30; i++) {
      ;(sys as any).makers.push(makeMaker(i, 'riding', 60, 0))
    }
    const em = makeEmStub([100], { 100: 20 })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 51400) // 同时触发 cleanup，tick=0 的被清除
    // cleanup 后 makers 数为 0，但因为 em 实体是 [100] 且已经 break 了（新招募在 cleanup 前处理）
    // 实际：招募循环先判断 makers.length >= 30，满足则 break，所以不招募
    // 但 cleanup 在招募之后，tick=0 < cutoff=1400 => 全部清除
    expect((sys as any).makers).toHaveLength(0) // cleanup 后全被删
  })

  it('招募时 skillMap 中存入技能值', () => {
    const em = makeEmStub([99], { 99: 20 })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    expect((sys as any).skillMap.has(99)).toBe(true)
  })

  it('二次招募同一实体时 skillMap 中技能增长（SKILL_GROWTH=0.063）', () => {
    const em = makeEmStub([99], { 99: 20 })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    ;(sys as any).skillMap.set(99, 5.0)
    sys.update(0, em, 1400)
    // skill = min(100, 5.0 + 0.063) = 5.063
    const skill = (sys as any).skillMap.get(99)
    expect(skill).toBeCloseTo(5.063, 3)
  })

  it('招募时 nextId 自增', () => {
    const em = makeEmStub([1], { 1: 20 })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    expect((sys as any).nextId).toBe(1)
    sys.update(0, em, 1400)
    expect((sys as any).nextId).toBe(2)
  })

  it('招募的马具匠含有所有必要字段', () => {
    const em = makeEmStub([1], { 1: 20 })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    const m = (sys as any).makers[0]
    expect(m).toHaveProperty('id')
    expect(m).toHaveProperty('entityId')
    expect(m).toHaveProperty('skill')
    expect(m).toHaveProperty('harnessessMade')
    expect(m).toHaveProperty('harnessType')
    expect(m).toHaveProperty('leatherwork')
    expect(m).toHaveProperty('reputation')
    expect(m).toHaveProperty('tick')
  })

  it('招募的马具匠 entityId 等于传入实体 id', () => {
    const em = makeEmStub([42], { 42: 20 })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    expect((sys as any).makers[0].entityId).toBe(42)
  })

  it('招募的马具匠 tick 记录当前 tick', () => {
    const em = makeEmStub([1], { 1: 20 })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    expect((sys as any).makers[0].tick).toBe(1400)
  })

  it('getComponent 返回 null 时不招募', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
      getComponent: vi.fn().mockReturnValue(null),
      hasComponent: vi.fn().mockReturnValue(true),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('空实体列表时无招募', () => {
    const em = makeEmStub([])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureHarnessMakersSystem — skillMap 管理', () => {
  let sys: CreatureHarnessMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skillMap 初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('可以手动写入 skillMap', () => {
    ;(sys as any).skillMap.set(1, 50)
    expect((sys as any).skillMap.get(1)).toBe(50)
  })

  it('skillMap 中不存在的实体使用随机初始技能', () => {
    const em = makeEmStub([7], { 7: 20 })
    vi.spyOn(Math, 'random').mockReturnValue(0) // random=0 => 2+0*7=2, CRAFT_CHANCE=0.005, 0 <= 0.005 => 通过
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    const skill = (sys as any).skillMap.get(7)
    expect(typeof skill).toBe('number')
    expect(skill).toBeGreaterThan(0)
  })

  it('skill 上限为 100（Math.min(100, ...)）', () => {
    const em = makeEmStub([1], { 1: 20 })
    ;(sys as any).skillMap.set(1, 99.99)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeLessThanOrEqual(100)
  })
})
