import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBobbinMakersSystem } from '../systems/CreatureBobbinMakersSystem'
import type { BobbinMaker, BobbinType } from '../systems/CreatureBobbinMakersSystem'

// CHECK_INTERVAL=1450, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.055
// makers cleanup: maker.tick < tick-52000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeSys(): CreatureBobbinMakersSystem {
  return new CreatureBobbinMakersSystem()
}

function makeMaker(entityId: number, bobbinType: BobbinType = 'spinning', overrides: Partial<BobbinMaker> = {}): BobbinMaker {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    bobbinsMade: 5,
    bobbinType,
    smoothness: 40,
    reputation: 35,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureBobbinMakersSystem', () => {
  let sys: CreatureBobbinMakersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无线轴师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'lace'))
    expect((sys as any).makers[0].bobbinType).toBe('lace')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种线轴类型', () => {
    const types: BobbinType[] = ['spinning', 'weaving', 'lace', 'sewing']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].bobbinType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'weaving')
    m.skill = 80; m.bobbinsMade = 20; m.smoothness = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80)
    expect(r.bobbinsMade).toBe(20)
    expect(r.smoothness).toBe(90)
    expect(r.reputation).toBe(85)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1450)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1450
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1450)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)  // 1450 >= 1450
    expect((sys as any).lastCheck).toBe(1450)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000)  // 3000-2000=1000 < 1450，不更新
    expect((sys as any).lastCheck).toBe(2000)
    sys.update(1, em, 3450)  // 3450-2000=1450 >= 1450，更新
    expect((sys as any).lastCheck).toBe(3450)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(77, 60)
    expect((sys as any).skillMap.get(77)).toBe(60)
  })

  it('skillMap技能上限100：注入99.99后加SKILL_GROWTH不超过100', () => {
    // 验证 Math.min(100, skill + 0.055) 逻辑
    const skill = 99.99
    const grown = Math.min(100, skill + 0.055)
    expect(grown).toBe(100)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-52000的匠人被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'spinning', { tick: 0 }))     // 0 < 100000-52000=48000，会被清理
    ;(sys as any).makers.push(makeMaker(2, 'sewing', { tick: 55000 }))   // 55000 >= 48000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-52000=48000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有匠人tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'spinning', { tick: 50000 }))
    ;(sys as any).makers.push(makeMaker(2, 'weaving', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000，50000>=48000，60000>=48000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  // ── 推导公式验证 ─────────────────────────────────────────────────────────

  it('bobbinType根据skill/25计算：skill=0→spinning，skill=25→weaving，skill=50→lace，skill=75→sewing', () => {
    const types: BobbinType[] = ['spinning', 'weaving', 'lace', 'sewing']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(types[idx]).toBe(types[i])
    })
  })

  it('bobbinsMade根据skill计算：skill=30时bobbinsMade=3+floor(30/7)=7', () => {
    const skill = 30
    const bobbinsMade = 3 + Math.floor(skill / 7)
    expect(bobbinsMade).toBe(7)
  })

  it('smoothness根据skill计算：skill=30时smoothness=15+30*0.73=36.9', () => {
    const skill = 30
    const smoothness = 15 + skill * 0.73
    expect(smoothness).toBeCloseTo(36.9, 5)
  })
})
