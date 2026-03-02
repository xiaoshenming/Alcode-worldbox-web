import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureNettingMakersSystem } from '../systems/CreatureNettingMakersSystem'
import type { NettingMaker, NettingType } from '../systems/CreatureNettingMakersSystem'

let nextId = 1
function makeSys(): CreatureNettingMakersSystem { return new CreatureNettingMakersSystem() }
function makeMaker(entityId: number, nettingType: NettingType = 'fishing', skill = 60, tick = 0): NettingMaker {
  return { id: nextId++, entityId, skill, netsMade: 10, nettingType, knotStrength: 70, reputation: 50, tick }
}

// 构造最小 EntityManager mock
function makeEM(ids: number[] = [], age = 15) {
  return {
    getEntitiesWithComponents: (_a: string, _b: string) => ids,
    getEntitiesWithComponent: (_a: string) => ids,
    getComponent: (_eid: number, _comp: string) => ({ age }),
    hasComponent: (eid: number, _comp: string) => ids.includes(eid),
  } as any
}

describe('CreatureNettingMakersSystem — 基础数据', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无编网师', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'cargo'))
    expect((sys as any).makers[0].nettingType).toBe('cargo')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有 4 种网类型', () => {
    const types: NettingType[] = ['fishing', 'hunting', 'cargo', 'decorative']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].nettingType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureNettingMakersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 时 lastCheck=0，update 不执行（0-0=0 < 1450）', () => {
    // lastCheck 初始为 0，tick=0 时 0-0=0 < 1450，直接 return
    const em = makeEM([1])
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0) // 未更新
  })

  it('tick < CHECK_INTERVAL 时 lastCheck 不更新', () => {
    const em = makeEM([])
    sys.update(1, em, 1449)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL 时 lastCheck 更新为 tick', () => {
    const em = makeEM([])
    sys.update(1, em, 1450)
    expect((sys as any).lastCheck).toBe(1450)
  })

  it('第二次 tick 仍小于间隔时不再更新 lastCheck', () => {
    const em = makeEM([])
    sys.update(1, em, 1450) // 更新到 1450
    sys.update(1, em, 1500) // 1500-1450=50 < 1450，不更新
    expect((sys as any).lastCheck).toBe(1450)
  })

  it('连续两次满足间隔时都能更新', () => {
    const em = makeEM([])
    sys.update(1, em, 1450)
    sys.update(1, em, 2900) // 2900-1450=1450 >= 1450，更新
    expect((sys as any).lastCheck).toBe(2900)
  })
})

describe('CreatureNettingMakersSystem — skillMap 技能成长', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('技能从 skillMap 读取并增长 SKILL_GROWTH=0.056', () => {
    // 预设 skillMap 初始值
    ;(sys as any).skillMap.set(1, 50)
    // 强制 Math.random 返回 0（确保 CRAFT_CHANCE 通过，age>=10 通过）
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], 20)
    sys.update(1, em, 1450)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeCloseTo(50.056, 3) // 50 + 0.056
    vi.restoreAllMocks()
  })

  it('技能增长后不超过 100 上限', () => {
    ;(sys as any).skillMap.set(1, 99.98)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], 20)
    sys.update(1, em, 1450)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('skillMap 新实体首次获得随机初始技能（无预设时）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // random=0 => initial=2+0*7=2, skill=2+0.056
    const em = makeEM([1], 20)
    sys.update(1, em, 1450)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeCloseTo(2.056, 3)
    vi.restoreAllMocks()
  })
})

describe('CreatureNettingMakersSystem — nettingType 按技能区间映射', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // typeIdx = Math.min(3, Math.floor(skill / 25))
  // 0-24 => fishing, 25-49 => hunting, 50-74 => cargo, 75+ => decorative

  it('skill=2 时类型为 fishing（typeIdx=0）', () => {
    ;(sys as any).skillMap.set(1, 2)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], 20)
    sys.update(1, em, 1450)
    const maker = (sys as any).makers.find((m: NettingMaker) => m.entityId === 1)
    expect(maker?.nettingType).toBe('fishing')
    vi.restoreAllMocks()
  })

  it('skill=25 时类型为 hunting（typeIdx=1）', () => {
    ;(sys as any).skillMap.set(1, 25)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], 20)
    sys.update(1, em, 1450)
    const maker = (sys as any).makers.find((m: NettingMaker) => m.entityId === 1)
    expect(maker?.nettingType).toBe('hunting')
    vi.restoreAllMocks()
  })

  it('skill=75 时类型为 decorative（typeIdx=3）', () => {
    ;(sys as any).skillMap.set(1, 75)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], 20)
    sys.update(1, em, 1450)
    const maker = (sys as any).makers.find((m: NettingMaker) => m.entityId === 1)
    expect(maker?.nettingType).toBe('decorative')
    vi.restoreAllMocks()
  })
})

describe('CreatureNettingMakersSystem — knotStrength 和 reputation 计算', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('knotStrength = 16 + skill * 0.71', () => {
    ;(sys as any).skillMap.set(1, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], 20)
    sys.update(1, em, 1450)
    const maker = (sys as any).makers.find((m: NettingMaker) => m.entityId === 1)
    // skill after growth = 50.056
    expect(maker?.knotStrength).toBeCloseTo(16 + 50.056 * 0.71, 2)
    vi.restoreAllMocks()
  })

  it('reputation = 10 + skill * 0.79', () => {
    ;(sys as any).skillMap.set(1, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], 20)
    sys.update(1, em, 1450)
    const maker = (sys as any).makers.find((m: NettingMaker) => m.entityId === 1)
    // skill after growth = 50.056
    expect(maker?.reputation).toBeCloseTo(10 + 50.056 * 0.79, 2)
    vi.restoreAllMocks()
  })
})

describe('CreatureNettingMakersSystem — time-based cleanup（cutoff = tick - 52000）', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('老记录（tick < cutoff）被删除', () => {
    const currentTick = 60000
    const cutoff = currentTick - 52000 // = 8000
    ;(sys as any).makers.push(makeMaker(1, 'fishing', 60, cutoff - 1)) // tick=7999 < 8000，应删除
    const em = makeEM([])
    sys.update(1, em, currentTick)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('新记录（tick >= cutoff）保留', () => {
    const currentTick = 60000
    const cutoff = currentTick - 52000 // = 8000
    ;(sys as any).makers.push(makeMaker(1, 'fishing', 60, cutoff)) // tick=8000，应保留
    const em = makeEM([])
    sys.update(1, em, currentTick)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('混合新旧记录只删旧的', () => {
    const currentTick = 60000
    const cutoff = currentTick - 52000
    ;(sys as any).makers.push(makeMaker(1, 'fishing', 60, cutoff - 1)) // 旧，删除
    ;(sys as any).makers.push(makeMaker(2, 'cargo', 60, cutoff + 100)) // 新，保留
    const em = makeEM([])
    sys.update(1, em, currentTick)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('age < 10 的生物不能成为编网师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // CRAFT_CHANCE 通过
    const em = makeEM([1], 5) // age=5 < 10
    sys.update(1, em, 1450)
    expect((sys as any).makers).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('CreatureNettingMakersSystem — MAX_MAKERS=30 上限', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已达到 30 个时不再添加新编网师', () => {
    for (let i = 1; i <= 30; i++) {
      ;(sys as any).makers.push(makeMaker(i, 'fishing', 60, 60000))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([31], 20)
    sys.update(1, em, 1450)
    // 30 个已有 + 0 新增（因为 >= MAX_MAKERS break）
    // 注意：cleanup 会删除 tick=60000 的记录（cutoff=1450-52000<0，不删），所以保留 30 个
    // 但由于 MAX_MAKERS 限制，不会添加 31 号
    // cutoff = 1450 - 52000 = -50550，所有 tick=60000 的记录都不会被删
    expect((sys as any).makers.length).toBe(30)
    vi.restoreAllMocks()
  })
})
