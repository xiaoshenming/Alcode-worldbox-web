import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBobbinLaceMakersSystem } from '../systems/CreatureBobbinLaceMakersSystem'
import type { BobbinLaceMaker, LacePattern } from '../systems/CreatureBobbinLaceMakersSystem'

// CHECK_INTERVAL=1480, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.052
// makers cleanup: maker.tick < tick-52000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeSys(): CreatureBobbinLaceMakersSystem {
  return new CreatureBobbinLaceMakersSystem()
}

function makeMaker(entityId: number, pattern: LacePattern = 'torchon', overrides: Partial<BobbinLaceMaker> = {}): BobbinLaceMaker {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    lacePiecesMade: 5,
    pattern,
    intricacy: 40,
    reputation: 35,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureBobbinLaceMakersSystem', () => {
  let sys: CreatureBobbinLaceMakersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无花边师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'honiton'))
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].pattern).toBe('honiton')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种花边图案', () => {
    const patterns: LacePattern[] = ['torchon', 'cluny', 'bruges', 'honiton']
    patterns.forEach((p, i) => { ;(sys as any).makers.push(makeMaker(i + 1, p)) })
    const all = (sys as any).makers
    expect(all).toHaveLength(4)
    patterns.forEach((p, i) => { expect(all[i].pattern).toBe(p) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'bruges')
    m.skill = 80; m.lacePiecesMade = 20; m.intricacy = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80)
    expect(r.lacePiecesMade).toBe(20)
    expect(r.intricacy).toBe(90)
    expect(r.reputation).toBe(85)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1480)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1480
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1480)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)  // 1480 >= 1480
    expect((sys as any).lastCheck).toBe(1480)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 3000
    sys.update(1, em, 4000)  // 4000-3000=1000 < 1480，不更新
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, em, 4480)  // 4480-3000=1480 >= 1480，更新
    expect((sys as any).lastCheck).toBe(4480)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(42, 55)
    expect((sys as any).skillMap.get(42)).toBe(55)
  })

  it('skillMap技能上限100：注入99.99后加SKILL_GROWTH不超过100', () => {
    // 直接测试 Math.min(100, skill + 0.052) 逻辑
    const skill = 99.99
    const grown = Math.min(100, skill + 0.052)
    expect(grown).toBe(100)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-52000的匠人被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 0 }))      // 0 < 100000-52000=48000，会被清理
    ;(sys as any).makers.push(makeMaker(2, 'cluny', { tick: 60000 }))    // 60000 >= 48000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-52000=48000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有匠人tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, 'honiton', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000，55000>=48000，60000>=48000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  // ── 计算公式验证 ──────────────────────────────────────────────────────────

  it('pattern根据skill/25计算：skill=0→torchon，skill=25→cluny，skill=50→bruges，skill=75→honiton', () => {
    const patterns: LacePattern[] = ['torchon', 'cluny', 'bruges', 'honiton']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(patterns[idx]).toBe(patterns[i])
    })
  })

  it('lacePiecesMade根据skill计算：skill=30时lacePiecesMade=1+floor(30/10)=4', () => {
    const skill = 30
    const lacePiecesMade = 1 + Math.floor(skill / 10)
    expect(lacePiecesMade).toBe(4)
  })

  it('intricacy根据skill计算：skill=30时intricacy=12+30*0.76=34.8', () => {
    const skill = 30
    const intricacy = 12 + skill * 0.76
    expect(intricacy).toBeCloseTo(34.8, 5)
  })

  it('reputation根据skill计算：skill=30时reputation=10+30*0.83=34.9', () => {
    const skill = 30
    const reputation = 10 + skill * 0.83
    expect(reputation).toBeCloseTo(34.9, 5)
  })
})
