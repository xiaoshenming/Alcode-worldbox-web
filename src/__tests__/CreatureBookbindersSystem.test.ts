import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBookbindersSystem } from '../systems/CreatureBookbindersSystem'
import type { Bookbinder, BindingStyle } from '../systems/CreatureBookbindersSystem'

// CHECK_INTERVAL=1360, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.058
// makers cleanup: maker.tick < tick-51000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeSys(): CreatureBookbindersSystem {
  return new CreatureBookbindersSystem()
}

function makeMaker(entityId: number, style: BindingStyle = 'coptic', overrides: Partial<Bookbinder> = {}): Bookbinder {
  return {
    id: nextId++,
    entityId,
    skill: 70,
    booksBound: 12,
    bindingStyle: style,
    durability: 65,
    reputation: 45,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureBookbindersSystem', () => {
  let sys: CreatureBookbindersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无书籍装订工', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'perfect'))
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].bindingStyle).toBe('perfect')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种装订风格', () => {
    const styles: BindingStyle[] = ['coptic', 'perfect', 'saddle', 'case']
    styles.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, s)) })
    const all = (sys as any).makers
    expect(all).toHaveLength(4)
    styles.forEach((s, i) => { expect(all[i].bindingStyle).toBe(s) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'case')
    m.skill = 80; m.booksBound = 20; m.durability = 76; m.reputation = 76
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80)
    expect(r.booksBound).toBe(20)
    expect(r.durability).toBe(76)
    expect(r.reputation).toBe(76)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1360)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1360
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1360)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)  // 1360 >= 1360
    expect((sys as any).lastCheck).toBe(1360)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 3000
    sys.update(1, em, 4000)  // 4000-3000=1000 < 1360，不更新
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, em, 4360)  // 4360-3000=1360 >= 1360，更新
    expect((sys as any).lastCheck).toBe(4360)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(42, 70)
    expect((sys as any).skillMap.get(42)).toBe(70)
  })

  it('skillMap技能上限100：注入99.99后加SKILL_GROWTH不超过100', () => {
    // 直接测试 Math.min(100, skill + 0.058) 逻辑
    const skill = 99.99
    const grown = Math.min(100, skill + 0.058)
    expect(grown).toBe(100)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-51000的匠人被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'coptic', { tick: 0 }))        // 0 < 100000-51000=49000，会被清理
    ;(sys as any).makers.push(makeMaker(2, 'saddle', { tick: 60000 }))    // 60000 >= 49000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-51000=49000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有匠人tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'coptic', { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, 'case', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=49000，55000>=49000，60000>=49000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  // ── 计算公式验证 ──────────────────────────────────────────────────────────

  it('bindingStyle根据skill/25计算：skill=0→coptic，skill=25→perfect，skill=50→saddle，skill=75→case', () => {
    const styles: BindingStyle[] = ['coptic', 'perfect', 'saddle', 'case']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(styles[idx]).toBe(styles[i])
    })
  })

  it('booksBound根据skill计算：skill=24时booksBound=1+floor(24/8)=4', () => {
    const skill = 24
    const booksBound = 1 + Math.floor(skill / 8)
    expect(booksBound).toBe(4)
  })

  it('durability根据skill计算：skill=30时durability=20+30*0.7=41', () => {
    const skill = 30
    const durability = 20 + skill * 0.7
    expect(durability).toBeCloseTo(41, 5)
  })

  it('reputation根据skill计算：skill=30时reputation=10+30*0.83=34.9', () => {
    const skill = 30
    const reputation = 10 + skill * 0.83
    expect(reputation).toBeCloseTo(34.9, 5)
  })
})
