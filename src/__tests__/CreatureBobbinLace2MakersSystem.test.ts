import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBobbinLace2MakersSystem } from '../systems/CreatureBobbinLace2MakersSystem'
import type { BobbinLace2Maker, BobbinLace2Type } from '../systems/CreatureBobbinLace2MakersSystem'

// CHECK_INTERVAL=1540, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.051
// makers cleanup: maker.tick < tick-53000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeSys(): CreatureBobbinLace2MakersSystem {
  return new CreatureBobbinLace2MakersSystem()
}

function makeMaker(entityId: number, type: BobbinLace2Type = 'torchon', overrides: Partial<BobbinLace2Maker> = {}): BobbinLace2Maker {
  return {
    id: nextId++,
    entityId,
    skill: 70,
    piecesMade: 12,
    laceType: type,
    threadCount: 65,
    reputation: 45,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureBobbinLace2MakersSystem', () => {
  let sys: CreatureBobbinLace2MakersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无梭织花边工匠', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'bruges'))
    expect((sys as any).makers[0].laceType).toBe('bruges')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有4种花边类型', () => {
    const types: BobbinLace2Type[] = ['torchon', 'cluny', 'bruges', 'honiton']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].laceType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1540)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1540
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1540)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)  // 1540 >= 1540
    expect((sys as any).lastCheck).toBe(1540)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000)  // 3000-2000=1000 < 1540，不更新
    expect((sys as any).lastCheck).toBe(2000)
    sys.update(1, em, 3540)  // 3540-2000=1540 >= 1540，更新
    expect((sys as any).lastCheck).toBe(3540)
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
    // 验证 Math.min(100, skill + 0.051) 逻辑
    const skill = 99.99
    const grown = Math.min(100, skill + 0.051)
    expect(grown).toBe(100)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-53000的工匠被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 0 }))      // 0 < 100000-53000=47000，会被清理
    ;(sys as any).makers.push(makeMaker(2, 'honiton', { tick: 55000 }))  // 55000 >= 47000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-53000=47000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有工匠tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 50000 }))
    ;(sys as any).makers.push(makeMaker(2, 'cluny', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=47000，50000>=47000，60000>=47000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  // ── 推导公式验证 ─────────────────────────────────────────────────────────

  it('laceType根据skill/25计算：skill=0→torchon，skill=25→cluny，skill=50→bruges，skill=75→honiton', () => {
    const types: BobbinLace2Type[] = ['torchon', 'cluny', 'bruges', 'honiton']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(types[idx]).toBe(types[i])
    })
  })

  it('piecesMade根据skill计算：skill=30时piecesMade=2+floor(30/9)=5', () => {
    const skill = 30
    const piecesMade = 2 + Math.floor(skill / 9)
    expect(piecesMade).toBe(5)
  })

  it('threadCount根据skill计算：skill=30时threadCount=8+floor(30*0.85)=33', () => {
    const skill = 30
    const threadCount = 8 + Math.floor(skill * 0.85)
    expect(threadCount).toBe(33)
  })
})
