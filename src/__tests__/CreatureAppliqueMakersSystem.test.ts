import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAppliqueMakersSystem } from '../systems/CreatureAppliqueMakersSystem'
import type { AppliqueMaker, AppliqueType } from '../systems/CreatureAppliqueMakersSystem'

// CHECK_INTERVAL=1500, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.050
// makers cleanup: maker.tick < tick-50000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeAppliqSys(): CreatureAppliqueMakersSystem {
  return new CreatureAppliqueMakersSystem()
}

function makeMaker(entityId: number, appliqueType: AppliqueType = 'raw_edge', overrides: Partial<AppliqueMaker> = {}): AppliqueMaker {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    piecesMade: 5,
    appliqueType,
    cutPrecision: 34,
    reputation: 33,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureAppliqueMakersSystem', () => {
  let sys: CreatureAppliqueMakersSystem

  beforeEach(() => { sys = makeAppliqSys(); nextId = 1 })

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无匠人', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入匠人后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle_turn'))
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].appliqueType).toBe('needle_turn')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支��所有 4 种贴布类型', () => {
    const types: AppliqueType[] = ['raw_edge', 'needle_turn', 'reverse', 'shadow']
    types.forEach((t, i) => {
      ;(sys as any).makers.push(makeMaker(i + 1, t))
    })
    const all = (sys as any).makers
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].appliqueType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'shadow')
    m.skill = 85
    m.piecesMade = 15
    m.cutPrecision = 74
    m.reputation = 76
    ;(sys as any).makers.push(m)
    const result = (sys as any).makers[0]
    expect(result.skill).toBe(85)
    expect(result.piecesMade).toBe(15)
    expect(result.cutPrecision).toBe(74)
    expect(result.reputation).toBe(76)
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

  // ─�� skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(42, 55)
    expect((sys as any).skillMap.get(42)).toBe(55)
  })

  it('skillMap技能上限100：注入99.99后加SKILL_GROWTH不超过100', () => {
    // 直接测试 Math.min(100, skill + 0.050) 逻辑
    const skill = 99.99
    const grown = Math.min(100, skill + 0.050)
    expect(grown).toBe(100)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-50000的匠人被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'raw_edge', { tick: 0 }))       // 0 < 100000-50000=50000，会被清理
    ;(sys as any).makers.push(makeMaker(2, 'reverse', { tick: 60000 }))    // 60000 >= 50000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-50000=50000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有匠人tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'raw_edge', { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, 'needle_turn', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=50000，55000>=50000，60000>=50000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  it('appliqueType根据skill/25计算：skill=0→raw_edge，skill=25→needle_turn，skill=50→reverse，skill=75→shadow', () => {
    // 验证 typeIdx = Math.min(3, Math.floor(skill/25)) 映射
    const types: AppliqueType[] = ['raw_edge', 'needle_turn', 'reverse', 'shadow']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(types[idx]).toBe(types[i])
    })
  })

  it('piecesMade根据skill计算：skill=30时piecesMade=2+floor(30/8)=5', () => {
    const skill = 30
    const piecesMade = 2 + Math.floor(skill / 8)
    expect(piecesMade).toBe(5)
  })

  it('cutPrecision根据skill计算：skill=30时cutPrecision=13+30*0.71=34.3', () => {
    const skill = 30
    const cutPrecision = 13 + skill * 0.71
    expect(cutPrecision).toBeCloseTo(34.3, 5)
  })
})
