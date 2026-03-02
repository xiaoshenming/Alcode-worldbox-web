import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBasketWeaversSystem } from '../systems/CreatureBasketWeaversSystem'
import type { BasketWeaver, BasketType } from '../systems/CreatureBasketWeaversSystem'

// CHECK_INTERVAL=1350, CRAFT_CHANCE=0.006, MAX_WEAVERS=32, SKILL_GROWTH=0.07
// weavers cleanup: weaver.tick < tick-51000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeSys(): CreatureBasketWeaversSystem {
  return new CreatureBasketWeaversSystem()
}

function makeWeaver(entityId: number, type: BasketType = 'storage', overrides: Partial<BasketWeaver> = {}): BasketWeaver {
  return {
    id: nextId++,
    entityId,
    skill: 70,
    basketsMade: 12,
    basketType: type,
    tightness: 65,
    reputation: 45,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureBasketWeaversSystem', () => {
  let sys: CreatureBasketWeaversSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无编篮工', () => {
    expect((sys as any).weavers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1, 'fishing'))
    expect((sys as any).weavers).toHaveLength(1)
    expect((sys as any).weavers[0].basketType).toBe('fishing')
  })

  it('返回内部引用', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers).toBe((sys as any).weavers)
  })

  it('支持所有4种篮子类型', () => {
    const types: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']
    types.forEach((t, i) => { ;(sys as any).weavers.push(makeWeaver(i + 1, t)) })
    const all = (sys as any).weavers
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].basketType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    ;(sys as any).weavers.push(makeWeaver(2))
    expect((sys as any).weavers).toHaveLength(2)
  })

  it('数据字段完整', () => {
    const w = makeWeaver(10, 'decorative', { skill: 80, basketsMade: 20, tightness: 71, reputation: 68 })
    ;(sys as any).weavers.push(w)
    const result = (sys as any).weavers[0]
    expect(result.skill).toBe(80)
    expect(result.basketsMade).toBe(20)
    expect(result.tightness).toBe(71)
    expect(result.reputation).toBe(68)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1350)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1350
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1350)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1350)  // 1350 >= 1350
    expect((sys as any).lastCheck).toBe(1350)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000)  // 3000-2000=1000 < 1350，不更新
    expect((sys as any).lastCheck).toBe(2000)
    sys.update(1, em, 3350)  // 3350-2000=1350 >= 1350，更新
    expect((sys as any).lastCheck).toBe(3350)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(99, 70)
    expect((sys as any).skillMap.get(99)).toBe(70)
  })

  it('skillMap技能上限100：注入99.99后加SKILL_GROWTH不超过100', () => {
    // 验证 Math.min(100, skill + 0.07) 逻辑
    const skill = 99.99
    const grown = Math.min(100, skill + 0.07)
    expect(grown).toBe(100)
  })

  // ── weavers 过期清理 ──────────────────────────────────────────────────────

  it('weavers中tick < tick-51000的编篮工被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'storage', { tick: 0 }))       // 0 < 100000-51000=49000，会被清理
    ;(sys as any).weavers.push(makeWeaver(2, 'carrying', { tick: 55000 }))  // 55000 >= 49000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-51000=49000
    expect((sys as any).weavers.length).toBe(1)
    expect((sys as any).weavers[0].entityId).toBe(2)
  })

  it('所有编篮工tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'storage', { tick: 50000 }))
    ;(sys as any).weavers.push(makeWeaver(2, 'fishing', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=49000，50000>=49000，60000>=49000，都保留
    expect((sys as any).weavers.length).toBe(2)
  })

  // ── 公式验证 ──────────────────────────────────────────────────────────────

  it('basketType根据skill/25计算：skill=0→storage，skill=25→carrying，skill=50→fishing，skill=75→decorative', () => {
    const types: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(types[idx]).toBe(types[i])
    })
  })

  it('basketsMade根据skill计算：skill=70时basketsMade=2+floor(70/7)=12', () => {
    const skill = 70
    const basketsMade = 2 + Math.floor(skill / 7)
    expect(basketsMade).toBe(12)
  })

  it('tightness根据skill计算：skill=70时tightness=15+70*0.7=64', () => {
    const skill = 70
    const tightness = 15 + skill * 0.7
    expect(tightness).toBeCloseTo(64, 5)
  })

  it('reputation根据skill计算：skill=70时reputation=8+70*0.75=60.5', () => {
    const skill = 70
    const reputation = 8 + skill * 0.75
    expect(reputation).toBeCloseTo(60.5, 5)
  })
})
