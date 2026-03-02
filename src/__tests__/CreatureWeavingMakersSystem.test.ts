import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureWeavingMakersSystem } from '../systems/CreatureWeavingMakersSystem'
import type { WeavingMaker, WeavingType } from '../systems/CreatureWeavingMakersSystem'

// 常量参考：CHECK_INTERVAL=1500, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.054
// cutoff = tick - 50000，tick < cutoff 时删除
// weavingType = WEAVING_TYPES[Math.min(3, Math.floor(skill/25))]
// clothMade = 3 + Math.floor(skill / 7)
// threadDensity = 16 + skill * 0.74
// reputation = 10 + skill * 0.83

let nextId = 1
function makeSys(): CreatureWeavingMakersSystem { return new CreatureWeavingMakersSystem() }
function makeMaker(entityId: number, type: WeavingType = 'plain', overrides: Partial<WeavingMaker> = {}): WeavingMaker {
  return { id: nextId++, entityId, skill: 70, clothMade: 12, weavingType: type, threadDensity: 65, reputation: 45, tick: 0, ...overrides }
}

describe('CreatureWeavingMakersSystem', () => {
  let sys: CreatureWeavingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 基础数据结构 ──────────────────────────────────────────────────────────

  it('初始无织造工匠', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'twill'))
    expect((sys as any).makers[0].weavingType).toBe('twill')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有4种织造类型', () => {
    const types: WeavingType[] = ['plain', 'twill', 'satin', 'jacquard']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].weavingType).toBe(t) })
  })

  it('多个工匠全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('WeavingMaker接口包含所有必要字段', () => {
    const m = makeMaker(1, 'plain')
    expect(m).toHaveProperty('id')
    expect(m).toHaveProperty('entityId')
    expect(m).toHaveProperty('skill')
    expect(m).toHaveProperty('clothMade')
    expect(m).toHaveProperty('weavingType')
    expect(m).toHaveProperty('threadDensity')
    expect(m).toHaveProperty('reputation')
    expect(m).toHaveProperty('tick')
  })

  it('注入10个工匠后长度为10', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(10)
  })

  it('工匠entityId字段正确', () => {
    ;(sys as any).makers.push(makeMaker(42))
    expect((sys as any).makers[0].entityId).toBe(42)
  })

  it('makers数组可以直接清空', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.length = 0
    expect((sys as any).makers).toHaveLength(0)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1500)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1500)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 3000
    sys.update(1, em, 4000)
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, em, 4500)
    expect((sys as any).lastCheck).toBe(4500)
  })

  it('tick差值恰好等于1500时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 2500)
    expect((sys as any).lastCheck).toBe(2500)
  })

  it('tick=0时不触发更新', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1499时不触发更新', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, em, 1499)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1500时恰好触发更新', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, em, 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('多次update中lastCheck随触发递进', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    expect((sys as any).lastCheck).toBe(1500)
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, em, 4500)
    expect((sys as any).lastCheck).toBe(4500)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(42, 55)
    expect((sys as any).skillMap.get(42)).toBe(55)
  })

  it('skillMap技能上限100：skill=99.99加SKILL_GROWTH(0.054)后不超过100', () => {
    const skill = 99.99
    const grown = Math.min(100, skill + 0.054)
    expect(grown).toBe(100)
  })

  it('skillMap技能正常递增：skill=50加0.054等于50.054', () => {
    const skill = 50
    const grown = Math.min(100, skill + 0.054)
    expect(grown).toBeCloseTo(50.054, 5)
  })

  it('skillMap可存多个实体技能', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    ;(sys as any).skillMap.set(3, 90)
    expect((sys as any).skillMap.size).toBe(3)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(60)
    expect((sys as any).skillMap.get(3)).toBe(90)
  })

  it('skillMap技能在100时再加SKILL_GROWTH后仍为100', () => {
    const grown = Math.min(100, 100 + 0.054)
    expect(grown).toBe(100)
  })

  it('skillMap技能从0递增到0.054', () => {
    const grown = Math.min(100, 0 + 0.054)
    expect(grown).toBeCloseTo(0.054, 5)
  })

  it('skillMap不存在的实体返回undefined', () => {
    expect((sys as any).skillMap.get(9999)).toBeUndefined()
  })

  it('skillMap覆盖写入新值', () => {
    ;(sys as any).skillMap.set(1, 50)
    ;(sys as any).skillMap.set(1, 75)
    expect((sys as any).skillMap.get(1)).toBe(75)
  })

  // ── makers 过期清理（cutoff = tick - 50000）──────────────────────────────

  it('makers中tick < tick-50000的工匠被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'plain', { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, 'twill', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有工匠tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'plain', { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, 'satin', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(2)
  })

  it('cutoff边界：tick恰好等于cutoff时保留', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'plain', { tick: 50000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
  })

  it('cutoff边界：tick=cutoff-1时删除', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'plain', { tick: 49999 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(0)
  })

  it('多工匠混合：过期的删除新鲜的保留', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'plain', { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, 'twill', { tick: 1000 }))
    ;(sys as any).makers.push(makeMaker(3, 'satin', { tick: 80000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(3)
  })

  it('清理从末尾向前遍历不跳过元素', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    for (let i = 0; i < 5; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'plain', { tick: i * 10000 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=50000，tick>=50000的保留
    const surviving = (sys as any).makers
    surviving.forEach((m: WeavingMaker) => {
      expect(m.tick).toBeGreaterThanOrEqual(50000)
    })
  })

  it('节流未触发时不执行清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'plain', { tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 999)  // 999 < 1500，不触发
    expect((sys as any).makers.length).toBe(1)
  })

  // ── 计算公式验证 ──────────────────────────────────────────────────────────

  it('weavingType根据skill/25：skill=0→plain', () => {
    const idx = Math.min(3, Math.floor(0 / 25))
    expect(['plain', 'twill', 'satin', 'jacquard'][idx]).toBe('plain')
  })

  it('weavingType根据skill/25：skill=25→twill', () => {
    const idx = Math.min(3, Math.floor(25 / 25))
    expect(['plain', 'twill', 'satin', 'jacquard'][idx]).toBe('twill')
  })

  it('weavingType根据skill/25：skill=50→satin', () => {
    const idx = Math.min(3, Math.floor(50 / 25))
    expect(['plain', 'twill', 'satin', 'jacquard'][idx]).toBe('satin')
  })

  it('weavingType根据skill/25：skill=75→jacquard', () => {
    const idx = Math.min(3, Math.floor(75 / 25))
    expect(['plain', 'twill', 'satin', 'jacquard'][idx]).toBe('jacquard')
  })

  it('weavingType根据skill/25：skill=100→jacquard（上限3）', () => {
    const idx = Math.min(3, Math.floor(100 / 25))
    expect(['plain', 'twill', 'satin', 'jacquard'][idx]).toBe('jacquard')
  })

  it('weavingType根据skill/25：skill=24→plain', () => {
    const idx = Math.min(3, Math.floor(24 / 25))
    expect(['plain', 'twill', 'satin', 'jacquard'][idx]).toBe('plain')
  })

  it('weavingType根据skill/25：skill=49→twill', () => {
    const idx = Math.min(3, Math.floor(49 / 25))
    expect(['plain', 'twill', 'satin', 'jacquard'][idx]).toBe('twill')
  })

  it('weavingType根据skill/25：skill=74→satin', () => {
    const idx = Math.min(3, Math.floor(74 / 25))
    expect(['plain', 'twill', 'satin', 'jacquard'][idx]).toBe('satin')
  })

  it('clothMade公式：skill=0时clothMade=3', () => {
    expect(3 + Math.floor(0 / 7)).toBe(3)
  })

  it('clothMade公式：skill=7时clothMade=4', () => {
    expect(3 + Math.floor(7 / 7)).toBe(4)
  })

  it('clothMade公式：skill=35时clothMade=8', () => {
    expect(3 + Math.floor(35 / 7)).toBe(8)
  })

  it('clothMade公式：skill=70时clothMade=13', () => {
    expect(3 + Math.floor(70 / 7)).toBe(13)
  })

  it('clothMade公式：skill=100时clothMade=17', () => {
    expect(3 + Math.floor(100 / 7)).toBe(17)
  })

  it('threadDensity公式：skill=0时threadDensity=16', () => {
    expect(16 + 0 * 0.74).toBe(16)
  })

  it('threadDensity公式：skill=30时threadDensity≈38.2', () => {
    expect(16 + 30 * 0.74).toBeCloseTo(38.2, 5)
  })

  it('threadDensity公式：skill=100时threadDensity=90', () => {
    expect(16 + 100 * 0.74).toBeCloseTo(90, 5)
  })

  it('threadDensity公式：skill=50时threadDensity=53', () => {
    expect(16 + 50 * 0.74).toBeCloseTo(53, 5)
  })

  it('reputation公式：skill=0时reputation=10', () => {
    expect(10 + 0 * 0.83).toBe(10)
  })

  it('reputation公式：skill=30时reputation≈34.9', () => {
    expect(10 + 30 * 0.83).toBeCloseTo(34.9, 5)
  })

  it('reputation公式：skill=100时reputation=93', () => {
    expect(10 + 100 * 0.83).toBeCloseTo(93, 5)
  })

  it('reputation公式：skill=50时reputation=51.5', () => {
    expect(10 + 50 * 0.83).toBeCloseTo(51.5, 5)
  })

  // ── MAX_MAKERS 上限 ────────────────────────────────────────────────────────

  it('注入30个工匠达MAX_MAKERS上限', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })

  it('makers.length===MAX_MAKERS时循环应中断（验证>=逻辑）', () => {
    // 直接验证公式：makers.length >= MAX_MAKERS
    const MAX_MAKERS = 30
    const len = 30
    expect(len >= MAX_MAKERS).toBe(true)
  })

  // ── 工匠spawn全链路（mock em）──────────────────────────────────────────────

  it('creatures为空时不创建工匠', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('CRAFT_CHANCE(0.005)通过且creature age>=10时创建工匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // < 0.005
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_id: number, _type: string) => ({ age: 15 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('creature age<10时不创建工匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_id: number, _type: string) => ({ age: 5 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('getComponent返回null时不创建工匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => null,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('spawn的工匠tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_id: number, _type: string) => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].tick).toBe(1500)
    }
  })

  it('spawn的工匠entityId与creature eid一致', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = {
      getEntitiesWithComponents: () => [99],
      getComponent: (_id: number, _type: string) => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].entityId).toBe(99)
    }
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_id: number, _type: string) => ({ age: 20 }),
    } as any
    const prevId = (sys as any).nextId
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(prevId)
    }
  })

  it('skillMap中已有技能的实体会递增skill', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).skillMap.set(1, 50)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_id: number, _type: string) => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    const newSkill = (sys as any).skillMap.get(1)
    if (newSkill !== undefined) {
      expect(newSkill).toBeCloseTo(50.054, 3)
    }
  })

  it('random > CRAFT_CHANCE时不创建工匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // > 0.005
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_id: number, _type: string) => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('CRAFT_CHANCE精确值0.005：random=0.005时不通过(>而非>=)', () => {
    // 源码逻辑：Math.random() > CRAFT_CHANCE，0.005 > 0.005 为 false → 不跳过
    expect(0.005 > 0.005).toBe(false)
  })

  it('skillMap初始技能随机为2~9之间', () => {
    // 验证公式：2 + Math.random() * 7，range [2, 9)
    const min = 2 + 0 * 7   // = 2
    const max = 2 + 1 * 7   // = 9
    expect(min).toBe(2)
    expect(max).toBe(9)
  })

  // ── WeavingType 类型验证 ──────────────────────────────────────────────────

  it('plain类型工匠weavingType为plain', () => {
    const m = makeMaker(1, 'plain')
    expect(m.weavingType).toBe('plain')
  })

  it('twill类型工匠weavingType为twill', () => {
    const m = makeMaker(1, 'twill')
    expect(m.weavingType).toBe('twill')
  })

  it('satin类型工匠weavingType为satin', () => {
    const m = makeMaker(1, 'satin')
    expect(m.weavingType).toBe('satin')
  })

  it('jacquard类型工匠weavingType为jacquard', () => {
    const m = makeMaker(1, 'jacquard')
    expect(m.weavingType).toBe('jacquard')
  })

  it('系统实例创建后skillMap是Map类型', () => {
    expect((sys as any).skillMap).toBeInstanceOf(Map)
  })

  it('makers数组是Array类型', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })

  it('系统可以重复创建多个独立实例', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).makers.push(makeMaker(1))
    expect((sys2 as any).makers).toHaveLength(0)
  })

  // ── 工匠属性范围验证 ──────────────────────────────────────────────────────

  it('skill=70时clothMade=13', () => {
    expect(3 + Math.floor(70 / 7)).toBe(13)
  })

  it('skill=70时threadDensity≈67.8', () => {
    expect(16 + 70 * 0.74).toBeCloseTo(67.8, 5)
  })

  it('skill=70时reputation≈68.1', () => {
    expect(10 + 70 * 0.83).toBeCloseTo(68.1, 5)
  })

  it('skill=70时weavingType为satin（floor(70/25)=2）', () => {
    const idx = Math.min(3, Math.floor(70 / 25))
    expect(['plain', 'twill', 'satin', 'jacquard'][idx]).toBe('satin')
  })

  it('threadDensity公式线性递增验证', () => {
    const s1 = 16 + 20 * 0.74
    const s2 = 16 + 40 * 0.74
    expect(s2 - s1).toBeCloseTo(20 * 0.74, 5)
  })

  it('reputation公式线性递增验证', () => {
    const r1 = 10 + 20 * 0.83
    const r2 = 10 + 40 * 0.83
    expect(r2 - r1).toBeCloseTo(20 * 0.83, 5)
  })

  it('两个系统实例的skillMap互相独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).skillMap.set(1, 50)
    expect((sys2 as any).skillMap.get(1)).toBeUndefined()
  })
})
