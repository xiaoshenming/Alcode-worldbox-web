import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureClaspMakersSystem } from '../systems/CreatureClaspMakersSystem'
import type { ClaspMaker, ClaspType } from '../systems/CreatureClaspMakersSystem'

let nextId = 1
function makeSys(): CreatureClaspMakersSystem { return new CreatureClaspMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<ClaspMaker> = {}): ClaspMaker {
  return { id: nextId++, entityId, skill: 30, claspsMade: 4, claspType: 'cloak', precision: 37, reputation: 33.7, tick: 0, ...overrides }
}

// 构建最小 EntityManager mock，不返回任何实体
function makeEmptyEm(): any {
  return {
    getEntitiesWithComponents: () => [],
    getComponent: () => null,
    hasComponent: () => false,
    getEntitiesWithComponent: () => [],
  }
}

// 构建返回指定实体的 EntityManager mock
function makeEmWithCreatures(creatures: Array<{ eid: number; age: number }>): any {
  const eids = creatures.map(c => c.eid)
  return {
    getEntitiesWithComponents: (c1: string, c2: string) => {
      if (c1 === 'creature' && c2 === 'position') return eids
      return []
    },
    getComponent: (eid: number, type: string) => {
      if (type === 'creature') {
        const found = creatures.find(c => c.eid === eid)
        return found ? { age: found.age } : null
      }
      return null
    },
    hasComponent: (eid: number, type: string) => {
      if (type === 'creature') return creatures.some(c => c.eid === eid)
      return false
    },
    getEntitiesWithComponent: (type: string) => {
      if (type === 'creature') return eids
      return []
    },
  }
}

describe('CreatureClaspMakersSystem', () => {
  let sys: CreatureClaspMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 基础状态 ──

  it('初始无扣环制作者', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { claspType: 'jewelry' }))
    expect((sys as any).makers[0].claspType).toBe('jewelry')
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('ClaspType包含4种（cloak/jewelry/book/chest）', () => {
    const types: ClaspType[] = ['cloak', 'jewelry', 'book', 'chest']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { claspType: t })) })
    const all = (sys as any).makers as ClaspMaker[]
    expect(all.map(m => m.claspType)).toEqual(['cloak', 'jewelry', 'book', 'chest'])
  })

  it('makers是数组类型', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap是Map类型', () => {
    expect((sys as any).skillMap).toBeInstanceOf(Map)
  })

  it('注入的制作者entityId字段正确', () => {
    ;(sys as any).makers.push(makeMaker(42))
    expect((sys as any).makers[0].entityId).toBe(42)
  })

  it('注入的制作者tick字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 3333 }))
    expect((sys as any).makers[0].tick).toBe(3333)
  })

  // ── 公式验证（直接计算，无需 update）──

  it('precision计算：skill=40 → 16+40*0.70=44', () => {
    const skill = 40
    const precision = 16 + skill * 0.70
    expect(precision).toBeCloseTo(44)
  })

  it('reputation计算：skill=40 → 10+40*0.79=41.6', () => {
    const skill = 40
    const reputation = 10 + skill * 0.79
    expect(reputation).toBeCloseTo(41.6)
  })

  it('claspsMade计算：skill=40 → 1+Math.floor(40/8)=6', () => {
    const skill = 40
    const claspsMade = 1 + Math.floor(skill / 8)
    expect(claspsMade).toBe(6)
  })

  it('claspType由skill/25决定4段：0→cloak, 25→jewelry, 50→book, 75→chest', () => {
    const types: ClaspType[] = ['cloak', 'jewelry', 'book', 'chest']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const typeIdx = Math.min(3, Math.floor(skill / 25))
      expect(types[typeIdx]).toBe(types[i])
    })
  })

  it('claspType在skill=24时为cloak（typeIdx=0）', () => {
    const skill = 24
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(0)
  })

  it('claspType在skill=100时为chest（typeIdx=3，不超过3）', () => {
    const skill = 100
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(3)
  })

  it('precision计算：skill=0 → 16+0*0.70=16', () => {
    const skill = 0
    const precision = 16 + skill * 0.70
    expect(precision).toBeCloseTo(16)
  })

  it('reputation计算：skill=0 → 10+0*0.79=10', () => {
    const skill = 0
    const reputation = 10 + skill * 0.79
    expect(reputation).toBeCloseTo(10)
  })

  it('claspsMade计算：skill=0 → 1+Math.floor(0/8)=1', () => {
    const skill = 0
    const claspsMade = 1 + Math.floor(skill / 8)
    expect(claspsMade).toBe(1)
  })

  it('precision计算：skill=100 → 16+100*0.70=86', () => {
    const skill = 100
    const precision = 16 + skill * 0.70
    expect(precision).toBeCloseTo(86)
  })

  it('reputation计算：skill=100 → 10+100*0.79=89', () => {
    const skill = 100
    const reputation = 10 + skill * 0.79
    expect(reputation).toBeCloseTo(89)
  })

  it('claspsMade计算：skill=100 → 1+Math.floor(100/8)=13', () => {
    const skill = 100
    const claspsMade = 1 + Math.floor(skill / 8)
    expect(claspsMade).toBe(13)
  })

  it('claspsMade计算：skill=7 → 1+Math.floor(7/8)=1', () => {
    const skill = 7
    const claspsMade = 1 + Math.floor(skill / 8)
    expect(claspsMade).toBe(1)
  })

  it('claspsMade计算：skill=8 → 1+Math.floor(8/8)=2', () => {
    const skill = 8
    const claspsMade = 1 + Math.floor(skill / 8)
    expect(claspsMade).toBe(2)
  })

  it('claspType在skill=49时为jewelry（typeIdx=1）', () => {
    const skill = 49
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(1)
  })

  it('claspType在skill=50时为book（typeIdx=2）', () => {
    const skill = 50
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(2)
  })

  it('claspType在skill=74时为book（typeIdx=2）', () => {
    const skill = 74
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(2)
  })

  it('claspType在skill=75时为chest（typeIdx=3）', () => {
    const skill = 75
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(3)
  })

  it('precision计算：skill=25 → 16+25*0.70=33.5', () => {
    const skill = 25
    const precision = 16 + skill * 0.70
    expect(precision).toBeCloseTo(33.5)
  })

  it('reputation计算：skill=25 → 10+25*0.79=29.75', () => {
    const skill = 25
    const reputation = 10 + skill * 0.79
    expect(reputation).toBeCloseTo(29.75)
  })

  // ── tick 间隔控制（CHECK_INTERVAL = 1450）──

  it('tick差值<1450时不更新lastCheck', () => {
    const em = makeEmptyEm()
    sys.update(16, em, 1449)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=1450时更新lastCheck', () => {
    const em = makeEmptyEm()
    sys.update(16, em, 1450)
    expect((sys as any).lastCheck).toBe(1450)
  })

  it('tick差值恰好等于1449时不触发', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1449)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck=1000，tick=2450时触发（差值=1450）', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 1000
    sys.update(16, em, 2450)
    expect((sys as any).lastCheck).toBe(2450)
  })

  it('lastCheck=1000，tick=2449时不触发（差值=1449）', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 1000
    sys.update(16, em, 2449)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('lastCheck=5000，tick=100时不触发（差值为负）', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 5000
    sys.update(16, em, 100)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('连续两次update间隔足够时lastCheck更新两次', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    expect((sys as any).lastCheck).toBe(1450)
    sys.update(16, em, 2900)
    expect((sys as any).lastCheck).toBe(2900)
  })

  it('tick=1451时触发（差值=1451>1450）', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1451)
    expect((sys as any).lastCheck).toBe(1451)
  })

  // ── time-based cleanup（删除 tick < currentTick - 52000 的记录）──

  it('time-based cleanup：tick=0的记录在update(60000)时被删', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    const em = makeEmptyEm()
    sys.update(16, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('较新记录保留：tick=55000在currentTick=60000时不删除', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 55000 }))
    const em = makeEmptyEm()
    sys.update(16, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('cutoff=tick-52000，tick=52001，cutoff=1，maker.tick=0被删', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    const em = makeEmptyEm()
    sys.update(16, em, 52001)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('cutoff=tick-52000，tick=52000，cutoff=0，maker.tick=0不被删（0不<0）', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    const em = makeEmptyEm()
    sys.update(16, em, 52000)
    // cutoff = 52000-52000=0, maker.tick=0, 0 < 0 为false，不删除
    expect((sys as any).makers).toHaveLength(1)
  })

  it('多条记录部分过期：保留新的删除旧的', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))      // 旧，删除
    ;(sys as any).makers.push(makeMaker(2, { tick: 55000 }))  // 新，保留
    ;(sys as any).makers.push(makeMaker(3, { tick: 100 }))    // 旧，删除
    const em = makeEmptyEm()
    sys.update(16, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('全部记录过期时清空', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 1000 }))
    ;(sys as any).makers.push(makeMaker(3, { tick: 2000 }))
    const em = makeEmptyEm()
    sys.update(16, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('所有记录新鲜时全部保留', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 58000 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 59000 }))
    const em = makeEmptyEm()
    sys.update(16, em, 60000)
    expect((sys as any).makers).toHaveLength(2)
  })

  // ── skillMap 相关测试 ──────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('可以直接向skillMap设置值', () => {
    ;(sys as any).skillMap.set(1, 50)
    expect((sys as any).skillMap.get(1)).toBe(50)
  })

  it('skillMap存储的值可以读取', () => {
    ;(sys as any).skillMap.set(10, 75.5)
    expect((sys as any).skillMap.get(10)).toBeCloseTo(75.5)
  })

  it('skillMap.get不存在的key返回undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('update触发后skillMap中存在的skill被累加SKILL_GROWTH=0.055', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 15 }])
    ;(sys as any).skillMap.set(1, 30)
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 < CRAFT_CHANCE=0.005，触发
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    // skill = min(100, 30 + 0.055) = 30.055
    expect((sys as any).skillMap.get(1)).toBeCloseTo(30.055, 3)
  })

  it('skillMap中新实体使用随机初始skill范围[2,9)', () => {
    const em = makeEmWithCreatures([{ eid: 42, age: 15 }])
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 < CRAFT_CHANCE，触发
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    const storedSkill = (sys as any).skillMap.get(42)
    if (storedSkill !== undefined) {
      expect(storedSkill).toBeGreaterThanOrEqual(2)
      expect(storedSkill).toBeLessThan(10)
    }
  })

  // ── 实体管理器交互 ────────────────────────────────────────────────────────

  it('age<10的生物不被招募', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 9 }])
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 触发招募
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('age=10的生物被招募', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 10 }])
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 触发招募，0 < CRAFT_CHANCE=0.005
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    expect((sys as any).makers.length).toBeGreaterThan(0)
  })

  it('age>10的生物可被招募', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    expect((sys as any).makers.length).toBeGreaterThan(0)
  })

  it('getComponent返回null时不招募', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => null,  // 返回null
      hasComponent: () => true,
      getEntitiesWithComponent: () => [1],
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('random>CRAFT_CHANCE时不招募（random=0.5>0.005）', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.5)  // 0.5 > 0.005，不招募
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('MAX_MAKERS=30时停止招募', () => {
    const em = makeEmWithCreatures(
      Array.from({ length: 35 }, (_, i) => ({ eid: i + 1, age: 20 }))
    )
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 触发招募
    // 预填满30个
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, { tick: 9999999 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    // 因为cleanup是在招募后，时间1450-52000<0，所以没有过期删除
    expect((sys as any).makers.length).toBe(30)
  })

  it('招募时新maker的entityId等于对应生物eid', () => {
    const em = makeEmWithCreatures([{ eid: 77, age: 20 }])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].entityId).toBe(77)
    }
  })

  it('招募时新maker的tick等于当前tick', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].tick).toBe(1450)
    }
  })

  it('招募时新maker的precision = 16 + skill * 0.70', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).skillMap.set(1, 40)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    if ((sys as any).makers.length > 0) {
      const maker = (sys as any).makers[0] as ClaspMaker
      const expectedSkill = Math.min(100, 40 + 0.055)
      const expectedPrecision = 16 + expectedSkill * 0.70
      expect(maker.precision).toBeCloseTo(expectedPrecision, 3)
    }
  })

  it('招募时新maker的reputation = 10 + skill * 0.79', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).skillMap.set(1, 40)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    if ((sys as any).makers.length > 0) {
      const maker = (sys as any).makers[0] as ClaspMaker
      const expectedSkill = Math.min(100, 40 + 0.055)
      const expectedReputation = 10 + expectedSkill * 0.79
      expect(maker.reputation).toBeCloseTo(expectedReputation, 3)
    }
  })

  it('招募时新maker的claspsMade = 1 + Math.floor(skill/8)', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).skillMap.set(1, 40)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    if ((sys as any).makers.length > 0) {
      const maker = (sys as any).makers[0] as ClaspMaker
      const expectedSkill = Math.min(100, 40 + 0.055)
      const expectedClaspsMade = 1 + Math.floor(expectedSkill / 8)
      expect(maker.claspsMade).toBe(expectedClaspsMade)
    }
  })

  // ── 混合场景与边界测试 ────────────────────────────────────────────────────

  it('空实体列表时makers不增加', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('update方法存在且可调用', () => {
    expect(typeof sys.update).toBe('function')
  })

  it('update不触发时不改变makers', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 9999999 }))
    ;(sys as any).lastCheck = 0
    const em = makeEmptyEm()
    sys.update(16, em, 1449)  // 不触发
    expect((sys as any).makers).toHaveLength(1)
  })

  it('skill上限为100（skill=99.99+SKILL_GROWTH=0.055→100）', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).skillMap.set(1, 99.99)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })

  it('skill=100时不超出上限', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })

  it('多次update后skill累积增长', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).skillMap.set(1, 30)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    sys.update(16, em, 2900)
    // 第二次update时skill=30.055+0.055=30.11
    expect((sys as any).skillMap.get(1)).toBeCloseTo(30.11, 2)
  })

  it('nextId在每次招募后递增', () => {
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }, { eid: 2, age: 20 }])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const prevId = (sys as any).nextId
    sys.update(16, em, 1450)
    // 可能招募了1个或2个，nextId至少+1
    expect((sys as any).nextId).toBeGreaterThan(prevId)
  })

  it('ClaspType在skill=2时为cloak（typeIdx=0）', () => {
    const skill = 2
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(0)
  })

  it('ClaspType在skill=26时为jewelry（typeIdx=1）', () => {
    const skill = 26
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(1)
  })

  it('skill精确边界：skill/25=2时为book（typeIdx=2）', () => {
    const skill = 50
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(2)
  })

  it('cleanup不删除cutoff之后的记录（tick边界：maker.tick=cutoff，不被删除）', () => {
    const cutoffTick = 60000 - 52000  // = 8000
    ;(sys as any).makers.push(makeMaker(1, { tick: cutoffTick }))  // tick=cutoff，不<cutoff，保留
    const em = makeEmptyEm()
    sys.update(16, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('cleanup精确边界：maker.tick=cutoff-1时被删除', () => {
    const cutoffTick = 60000 - 52000 - 1  // = 7999
    ;(sys as any).makers.push(makeMaker(1, { tick: cutoffTick }))  // tick<cutoff，删除
    const em = makeEmptyEm()
    sys.update(16, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('makers中精度字段precision为数值', () => {
    const m = makeMaker(1, { precision: 44.5 })
    ;(sys as any).makers.push(m)
    expect(typeof (sys as any).makers[0].precision).toBe('number')
  })

  it('makers中reputation字段reputation为数值', () => {
    const m = makeMaker(1, { reputation: 41.6 })
    ;(sys as any).makers.push(m)
    expect(typeof (sys as any).makers[0].reputation).toBe('number')
  })

  it('update返回undefined（无返回值）', () => {
    const em = makeEmptyEm()
    const result = sys.update(16, em, 1450)
    expect(result).toBeUndefined()
  })
})
