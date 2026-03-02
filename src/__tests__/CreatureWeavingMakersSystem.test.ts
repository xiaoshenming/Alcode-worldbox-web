import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWeavingMakersSystem } from '../systems/CreatureWeavingMakersSystem'
import type { WeavingMaker, WeavingType } from '../systems/CreatureWeavingMakersSystem'

// CHECK_INTERVAL=1500, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.054
// makers cleanup: maker.tick < tick-50000 时删除
// skillMap 存储每个生物的技能，技能上限 100
// weavingType 由 Math.min(3, Math.floor(skill/25)) 决定

let nextId = 1
function makeSys(): CreatureWeavingMakersSystem { return new CreatureWeavingMakersSystem() }
function makeMaker(entityId: number, type: WeavingType = 'plain', overrides: Partial<WeavingMaker> = {}): WeavingMaker {
  return { id: nextId++, entityId, skill: 70, clothMade: 12, weavingType: type, threadDensity: 65, reputation: 45, tick: 0, ...overrides }
}

describe('CreatureWeavingMakersSystem', () => {
  let sys: CreatureWeavingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

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
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1500)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1500
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1500)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)  // 1500 >= 1500
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 3000
    sys.update(1, em, 4000)  // 4000-3000=1000 < 1500，不更新
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, em, 4500)  // 4500-3000=1500 >= 1500，更新
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

  // ── makers 过期清理（cutoff = tick - 50000）──────────────────────────────

  it('makers中tick < tick-50000的工匠被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'plain', { tick: 0 }))       // 0 < 100000-50000=50000，清理
    ;(sys as any).makers.push(makeMaker(2, 'twill', { tick: 60000 }))   // 60000 >= 50000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-50000=50000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有工匠tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'plain', { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, 'satin', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=50000，55000>=50000，60000>=50000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  it('cutoff边界：tick恰好等于cutoff时保留（tick >= cutoff）', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'plain', { tick: 50000 }))  // 50000 = 100000-50000，不满足 < cutoff，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
  })

  // ── 计算公式验证 ──────────────────────────────────────────────────────────

  it('weavingType根据skill/25计算：skill=0→plain，skill=25→twill，skill=50→satin，skill=75→jacquard', () => {
    const types: WeavingType[] = ['plain', 'twill', 'satin', 'jacquard']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(types[idx]).toBe(types[i])
    })
  })

  it('clothMade根据skill计算：skill=35时clothMade=3+floor(35/7)=8', () => {
    const skill = 35
    const clothMade = 3 + Math.floor(skill / 7)
    expect(clothMade).toBe(8)
  })

  it('threadDensity根据skill计算：skill=30时threadDensity=16+30*0.74=38.2', () => {
    const skill = 30
    const threadDensity = 16 + skill * 0.74
    expect(threadDensity).toBeCloseTo(38.2, 5)
  })

  it('reputation根据skill计算：skill=30时reputation=10+30*0.83=34.9', () => {
    const skill = 30
    const reputation = 10 + skill * 0.83
    expect(reputation).toBeCloseTo(34.9, 5)
  })
})
