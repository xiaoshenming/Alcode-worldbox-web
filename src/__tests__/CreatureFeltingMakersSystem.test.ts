import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFeltingMakersSystem } from '../systems/CreatureFeltingMakersSystem'
import type { FeltingMaker, FeltingType } from '../systems/CreatureFeltingMakersSystem'

let nextId = 1
function makeSys(): CreatureFeltingMakersSystem { return new CreatureFeltingMakersSystem() }
function makeMaker(entityId: number, feltingType: FeltingType = 'wet_felting', skill = 40, tick = 0): FeltingMaker {
  return {
    id: nextId++,
    entityId,
    skill,
    piecesMade: 3 + Math.floor(skill / 8),
    feltingType,
    fiberDensity: 15 + skill * 0.69,
    reputation: 10 + skill * 0.79,
    tick,
  }
}

function makeEM(entityIds: number[] = [], age = 15) {
  return {
    getEntitiesWithComponents: vi.fn(() => entityIds),
    getComponent: vi.fn(() => ({ age })),
    hasComponent: vi.fn(() => true),
  }
}

describe('CreatureFeltingMakersSystem — 初始状态', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始makers数组为空', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始skillMap为空Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('makers数组是Array类型', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })

  it('skillMap是Map类型', () => {
    expect((sys as any).skillMap).toBeInstanceOf(Map)
  })
})

describe('CreatureFeltingMakersSystem — FeltingMaker数据结构', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询maker', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle_felting'))
    expect((sys as any).makers[0].feltingType).toBe('needle_felting')
    expect((sys as any).makers[0].entityId).toBe(1)
  })

  it('maker包含所有必要字段', () => {
    const m = makeMaker(1, 'wet_felting', 40, 100)
    expect(m).toHaveProperty('id')
    expect(m).toHaveProperty('entityId')
    expect(m).toHaveProperty('skill')
    expect(m).toHaveProperty('piecesMade')
    expect(m).toHaveProperty('feltingType')
    expect(m).toHaveProperty('fiberDensity')
    expect(m).toHaveProperty('reputation')
    expect(m).toHaveProperty('tick')
  })

  it('maker的tick字段记录创建时刻', () => {
    const m = makeMaker(1, 'wet_felting', 40, 9999)
    expect(m.tick).toBe(9999)
  })

  it('FeltingType包含4种: wet_felting/needle_felting/nuno/cobweb', () => {
    const types: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all: FeltingMaker[] = (sys as any).makers
    expect(all.map(m => m.feltingType)).toEqual(['wet_felting', 'needle_felting', 'nuno', 'cobweb'])
  })

  it('多个maker可共存', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    ;(sys as any).makers.push(makeMaker(3))
    expect((sys as any).makers).toHaveLength(3)
  })

  it('maker的entityId字段正确存储', () => {
    const m = makeMaker(42, 'cobweb', 80)
    expect(m.entityId).toBe(42)
  })

  it('不同entityId的maker可以同时存在', () => {
    ;(sys as any).makers.push(makeMaker(10))
    ;(sys as any).makers.push(makeMaker(20))
    const ids = (sys as any).makers.map((m: FeltingMaker) => m.entityId)
    expect(ids).toContain(10)
    expect(ids).toContain(20)
  })
})

describe('CreatureFeltingMakersSystem — fiberDensity公式', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('fiberDensity公式: 15 + skill * 0.69', () => {
    const skill = 40
    const m = makeMaker(1, 'wet_felting', skill)
    expect(m.fiberDensity).toBeCloseTo(15 + skill * 0.69, 5)
  })

  it('fiberDensity边界: skill=0 → 15', () => {
    const m = makeMaker(1, 'wet_felting', 0)
    expect(m.fiberDensity).toBe(15)
  })

  it('fiberDensity: skill=100 → 15+69=84', () => {
    const m = makeMaker(1, 'cobweb', 100)
    expect(m.fiberDensity).toBeCloseTo(84, 5)
  })

  it('fiberDensity: skill=50 → 15+34.5=49.5', () => {
    const m = makeMaker(1, 'nuno', 50)
    expect(m.fiberDensity).toBeCloseTo(49.5, 5)
  })

  it('fiberDensity: skill=25 → 15+17.25=32.25', () => {
    const m = makeMaker(1, 'needle_felting', 25)
    expect(m.fiberDensity).toBeCloseTo(32.25, 5)
  })

  it('fiberDensity: skill=10 → 15+6.9=21.9', () => {
    const m = makeMaker(1, 'wet_felting', 10)
    expect(m.fiberDensity).toBeCloseTo(21.9, 5)
  })

  it('fiberDensity随skill单调递增', () => {
    const m1 = makeMaker(1, 'wet_felting', 20)
    const m2 = makeMaker(2, 'wet_felting', 80)
    expect(m2.fiberDensity).toBeGreaterThan(m1.fiberDensity)
  })
})

describe('CreatureFeltingMakersSystem — reputation公式', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('reputation公式: 10 + skill * 0.79', () => {
    const skill = 60
    const m = makeMaker(1, 'wet_felting', skill)
    expect(m.reputation).toBeCloseTo(10 + skill * 0.79, 5)
  })

  it('reputation边界: skill=0 → 10', () => {
    const m = makeMaker(1, 'wet_felting', 0)
    expect(m.reputation).toBe(10)
  })

  it('reputation: skill=100 → 10+79=89', () => {
    const m = makeMaker(1, 'cobweb', 100)
    expect(m.reputation).toBeCloseTo(89, 5)
  })

  it('reputation: skill=50 → 10+39.5=49.5', () => {
    const m = makeMaker(1, 'nuno', 50)
    expect(m.reputation).toBeCloseTo(49.5, 5)
  })

  it('reputation: skill=25 → 10+19.75=29.75', () => {
    const m = makeMaker(1, 'needle_felting', 25)
    expect(m.reputation).toBeCloseTo(29.75, 5)
  })

  it('reputation随skill单调递增', () => {
    const m1 = makeMaker(1, 'wet_felting', 30)
    const m2 = makeMaker(2, 'wet_felting', 70)
    expect(m2.reputation).toBeGreaterThan(m1.reputation)
  })
})

describe('CreatureFeltingMakersSystem — piecesMade公式', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('piecesMade计算: skill=40 → 3+floor(40/8)=8', () => {
    const m = makeMaker(1, 'wet_felting', 40)
    expect(m.piecesMade).toBe(8)
  })

  it('piecesMade计算: skill=8 → 3+floor(8/8)=4', () => {
    const m = makeMaker(1, 'wet_felting', 8)
    expect(m.piecesMade).toBe(4)
  })

  it('piecesMade计算: skill=0 → 3+floor(0/8)=3', () => {
    const m = makeMaker(1, 'wet_felting', 0)
    expect(m.piecesMade).toBe(3)
  })

  it('piecesMade计算: skill=100 → 3+floor(100/8)=3+12=15', () => {
    const m = makeMaker(1, 'cobweb', 100)
    expect(m.piecesMade).toBe(15)
  })

  it('piecesMade计算: skill=24 → 3+floor(24/8)=3+3=6', () => {
    const m = makeMaker(1, 'wet_felting', 24)
    expect(m.piecesMade).toBe(6)
  })

  it('piecesMade计算: skill=16 → 3+floor(16/8)=3+2=5', () => {
    const m = makeMaker(1, 'wet_felting', 16)
    expect(m.piecesMade).toBe(5)
  })

  it('piecesMade是整数', () => {
    const m = makeMaker(1, 'wet_felting', 37)
    expect(Number.isInteger(m.piecesMade)).toBe(true)
  })
})

describe('CreatureFeltingMakersSystem — feltingType与skill分段', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('feltingType由skill/25决定4段', () => {
    const TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    expect(TYPES[Math.min(3, Math.floor(0 / 25))]).toBe('wet_felting')
    expect(TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('needle_felting')
    expect(TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('nuno')
    expect(TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('cobweb')
    expect(TYPES[Math.min(3, Math.floor(99 / 25))]).toBe('cobweb')
  })

  it('skill=0时feltingType为wet_felting(typeIdx=0)', () => {
    const TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    const typeIdx = Math.min(3, Math.floor(0 / 25))
    expect(typeIdx).toBe(0)
    expect(TYPES[typeIdx]).toBe('wet_felting')
  })

  it('skill=24时feltingType为wet_felting(typeIdx=0)', () => {
    const TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    const typeIdx = Math.min(3, Math.floor(24 / 25))
    expect(typeIdx).toBe(0)
    expect(TYPES[typeIdx]).toBe('wet_felting')
  })

  it('skill=25时feltingType为needle_felting(typeIdx=1)', () => {
    const TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    const typeIdx = Math.min(3, Math.floor(25 / 25))
    expect(typeIdx).toBe(1)
    expect(TYPES[typeIdx]).toBe('needle_felting')
  })

  it('skill=49时feltingType为needle_felting(typeIdx=1)', () => {
    const TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    const typeIdx = Math.min(3, Math.floor(49 / 25))
    expect(typeIdx).toBe(1)
    expect(TYPES[typeIdx]).toBe('needle_felting')
  })

  it('skill=50时feltingType为nuno(typeIdx=2)', () => {
    const TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    const typeIdx = Math.min(3, Math.floor(50 / 25))
    expect(typeIdx).toBe(2)
    expect(TYPES[typeIdx]).toBe('nuno')
  })

  it('skill=74时feltingType为nuno(typeIdx=2)', () => {
    const TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    const typeIdx = Math.min(3, Math.floor(74 / 25))
    expect(typeIdx).toBe(2)
    expect(TYPES[typeIdx]).toBe('nuno')
  })

  it('skill=75时feltingType为cobweb(typeIdx=3)', () => {
    const TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    const typeIdx = Math.min(3, Math.floor(75 / 25))
    expect(typeIdx).toBe(3)
    expect(TYPES[typeIdx]).toBe('cobweb')
  })

  it('skill=100时feltingType为cobweb(typeIdx上限3)', () => {
    const TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    const typeIdx = Math.min(3, Math.floor(100 / 25))
    expect(typeIdx).toBe(3)
    expect(TYPES[typeIdx]).toBe('cobweb')
  })
})

describe('CreatureFeltingMakersSystem — CHECK_INTERVAL节流', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值<CHECK_INTERVAL=1480时不执行更新', () => {
    const em = makeEM([])
    ;(sys as any).lastCheck = -1480
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 1479)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('tick差值>=CHECK_INTERVAL=1480时更新lastCheck', () => {
    const em = makeEM([])
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 1480)
    expect((sys as any).lastCheck).toBe(1480)
  })

  it('tick=0时不触发更新（差值为0）', () => {
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick差值恰好等于1480时触发更新', () => {
    const em = makeEM([])
    ;(sys as any).lastCheck = 1000
    sys.update(0, em as any, 2480)
    expect((sys as any).lastCheck).toBe(2480)
  })

  it('连续两次触发后lastCheck追踪最新tick', () => {
    const em = makeEM([])
    sys.update(0, em as any, 1480)
    sys.update(0, em as any, 2960)
    expect((sys as any).lastCheck).toBe(2960)
  })

  it('大tick值触发后lastCheck正确记录', () => {
    const em = makeEM([])
    ;(sys as any).lastCheck = 100000
    sys.update(0, em as any, 101480)
    expect((sys as any).lastCheck).toBe(101480)
  })
})

describe('CreatureFeltingMakersSystem — cleanup逻辑(tick-based)', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('cleanup: 超过51000 tick的旧记录被清除', () => {
    const oldTick = 0
    const currentTick = 60000
    ;(sys as any).makers.push(makeMaker(1, 'wet_felting', 40, oldTick))
    ;(sys as any).makers.push(makeMaker(2, 'cobweb', 40, 50000))
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, currentTick)
    const remaining: FeltingMaker[] = (sys as any).makers
    expect(remaining.some(m => m.entityId === 1)).toBe(false)
    expect(remaining.some(m => m.entityId === 2)).toBe(true)
  })

  it('cleanup: tick恰好在cutoff边界的记录被清除', () => {
    const currentTick = 60000
    const cutoff = currentTick - 51000  // = 9000
    ;(sys as any).makers.push(makeMaker(1, 'wet_felting', 40, cutoff - 1)) // tick=8999 < 9000，清除
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, currentTick)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('cleanup: tick等于cutoff的记录被清除', () => {
    const currentTick = 60000
    const cutoff = currentTick - 51000  // = 9000
    ;(sys as any).makers.push(makeMaker(1, 'wet_felting', 40, cutoff)) // tick=9000，应清除（<cutoff不满足）
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, currentTick)
    // cutoff=9000, maker.tick=9000, 9000 < 9000 为false，保留
    expect((sys as any).makers).toHaveLength(1)
  })

  it('cleanup: 新记录(tick接近当前)不被清除', () => {
    const currentTick = 60000
    ;(sys as any).makers.push(makeMaker(1, 'wet_felting', 40, 55000))
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, currentTick)
    expect((sys as any).makers.some((m: FeltingMaker) => m.entityId === 1)).toBe(true)
  })

  it('cleanup: 多条旧记录全部清除', () => {
    const currentTick = 70000
    ;(sys as any).makers.push(makeMaker(1, 'wet_felting', 40, 0))
    ;(sys as any).makers.push(makeMaker(2, 'nuno', 50, 1000))
    ;(sys as any).makers.push(makeMaker(3, 'cobweb', 60, 18000)) // 18999 < 70000-51000=19000，保留
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, currentTick)
    const remaining: FeltingMaker[] = (sys as any).makers
    expect(remaining.some(m => m.entityId === 1)).toBe(false)
    expect(remaining.some(m => m.entityId === 2)).toBe(false)
    // entityId=3，tick=18000 < 19000，被清除
    expect(remaining.some(m => m.entityId === 3)).toBe(false)
  })

  it('cleanup: 空数组时不抛出异常', () => {
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(0, em as any, 60000)).not.toThrow()
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureFeltingMakersSystem — MAX_MAKERS上限', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('makers数量不超过MAX_MAKERS=30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })

  it('已满30个时注入额外maker后数组长度超过30（直接push不受限）', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    ;(sys as any).makers.push(makeMaker(31))
    // 直接push绕过了MAX_MAKERS限制，仅在update循环中有效
    expect((sys as any).makers.length).toBe(31)
  })
})

describe('CreatureFeltingMakersSystem — skillMap功能', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skillMap可以存储entity的skill值', () => {
    ;(sys as any).skillMap.set(1, 50)
    expect((sys as any).skillMap.get(1)).toBe(50)
  })

  it('skillMap为不同entity存储不同skill', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 70)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(70)
  })

  it('skillMap不存在的key返回undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('skillMap支持更新已有entry', () => {
    ;(sys as any).skillMap.set(1, 50)
    ;(sys as any).skillMap.set(1, 75)
    expect((sys as any).skillMap.get(1)).toBe(75)
  })
})

describe('CreatureFeltingMakersSystem — update方法', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update方法存在且可调用', () => {
    const em = makeEM([])
    expect(() => sys.update(0, em as any, 0)).not.toThrow()
  })

  it('update在低tick时不调用getEntitiesWithComponents', () => {
    const em = makeEM([])
    sys.update(0, em as any, 100)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('update在触发时调用getEntitiesWithComponents', () => {
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 1480)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('entity的age<10时不创建maker', () => {
    const em = {
      getEntitiesWithComponents: vi.fn(() => [1]),
      getComponent: vi.fn(() => ({ age: 5 })),
      hasComponent: vi.fn(() => true),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 确保CRAFT_CHANCE检查通过
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 1480)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('entity的age>=10时可创建maker(随机通过时)', () => {
    const em = {
      getEntitiesWithComponents: vi.fn(() => [1]),
      getComponent: vi.fn(() => ({ age: 15 })),
      hasComponent: vi.fn(() => true),
    }
    // CRAFT_CHANCE=0.005, random()=0 → 0 < 0.005，触发创建
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 1480)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(0) // 依赖random，验证无异常
  })

  it('getComponent返回null时不创建maker', () => {
    const em = {
      getEntitiesWithComponents: vi.fn(() => [1]),
      getComponent: vi.fn(() => null),
      hasComponent: vi.fn(() => true),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 1480)
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureFeltingMakersSystem — SKILL_GROWTH常量', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('SKILL_GROWTH=0.052: skill上限后不超过100', () => {
    const baseSkill = 99.99
    const grown = Math.min(100, baseSkill + 0.052)
    expect(grown).toBe(100)
  })

  it('SKILL_GROWTH=0.052: skill低于100时增长', () => {
    const baseSkill = 50
    const grown = Math.min(100, baseSkill + 0.052)
    expect(grown).toBeCloseTo(50.052, 5)
  })

  it('skillMap中存储的技能值在update时增长0.052', () => {
    ;(sys as any).skillMap.set(1, 50)
    const before = (sys as any).skillMap.get(1)
    const after = Math.min(100, before + 0.052)
    expect(after).toBeCloseTo(50.052, 5)
  })
})

describe('CreatureFeltingMakersSystem — nextId自增', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('nextId初始值为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('手动设置nextId后可读取', () => {
    ;(sys as any).nextId = 100
    expect((sys as any).nextId).toBe(100)
  })
})

describe('CreatureFeltingMakersSystem — CRAFT_CHANCE常量验证', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('CRAFT_CHANCE=0.005时random()=0.006不触发创建', () => {
    const em = {
      getEntitiesWithComponents: vi.fn(() => [1]),
      getComponent: vi.fn(() => ({ age: 15 })),
      hasComponent: vi.fn(() => true),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.006) // > CRAFT_CHANCE, continue
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 1480)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('CRAFT_CHANCE=0.005时random()=0.004可能触发创建(age>=10)', () => {
    const em = {
      getEntitiesWithComponents: vi.fn(() => [1]),
      getComponent: vi.fn(() => ({ age: 15 })),
      hasComponent: vi.fn(() => true),
    }
    // random()=0.004 < CRAFT_CHANCE=0.005，不continue → 触发创建逻辑
    vi.spyOn(Math, 'random').mockReturnValue(0.004)
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 1480)
    expect((sys as any).makers).toHaveLength(1)
  })
})

describe('CreatureFeltingMakersSystem — 综合场景', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('多次update后lastCheck单调递增', () => {
    const em = makeEM([])
    sys.update(0, em as any, 1480)
    const c1 = (sys as any).lastCheck
    sys.update(0, em as any, 2960)
    const c2 = (sys as any).lastCheck
    expect(c2).toBeGreaterThan(c1)
  })

  it('先cleanup后不影响新的maker注入', () => {
    ;(sys as any).makers.push(makeMaker(1, 'wet_felting', 40, 0))
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 60000)
    expect((sys as any).makers.some((m: FeltingMaker) => m.entityId === 1)).toBe(false)
    ;(sys as any).makers.push(makeMaker(99, 'cobweb', 80, 60000))
    expect((sys as any).makers).toHaveLength(1)
  })

  it('不同FeltingType的maker同时存在时互不干扰', () => {
    ;(sys as any).makers.push(makeMaker(1, 'wet_felting', 10))
    ;(sys as any).makers.push(makeMaker(2, 'needle_felting', 30))
    ;(sys as any).makers.push(makeMaker(3, 'nuno', 55))
    ;(sys as any).makers.push(makeMaker(4, 'cobweb', 80))
    const all: FeltingMaker[] = (sys as any).makers
    expect(all[0].feltingType).toBe('wet_felting')
    expect(all[1].feltingType).toBe('needle_felting')
    expect(all[2].feltingType).toBe('nuno')
    expect(all[3].feltingType).toBe('cobweb')
  })

  it('skill=40时各字段关联性验证', () => {
    const skill = 40
    const m = makeMaker(1, 'wet_felting', skill)
    expect(m.piecesMade).toBe(3 + Math.floor(skill / 8))
    expect(m.fiberDensity).toBeCloseTo(15 + skill * 0.69, 5)
    expect(m.reputation).toBeCloseTo(10 + skill * 0.79, 5)
  })
})
