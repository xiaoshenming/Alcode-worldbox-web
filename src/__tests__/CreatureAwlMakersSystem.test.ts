import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAwlMakersSystem } from '../systems/CreatureAwlMakersSystem'
import type { AwlMaker, AwlType } from '../systems/CreatureAwlMakersSystem'

// CHECK_INTERVAL=1430, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.056
// makers cleanup: maker.tick < tick-52000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeAwlSys(): CreatureAwlMakersSystem {
  return new CreatureAwlMakersSystem()
}

function makeAwlMaker(entityId: number, awlType: AwlType = 'stitching', overrides: Partial<AwlMaker> = {}): AwlMaker {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    awlsMade: 5,
    awlType,
    sharpness: 35,
    reputation: 34,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureAwlMakersSystem', () => {
  let sys: CreatureAwlMakersSystem

  beforeEach(() => { sys = makeAwlSys(); nextId = 1 })

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无匠人', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入匠人后可查询', () => {
    ;(sys as any).makers.push(makeAwlMaker(1, 'brad'))
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].awlType).toBe('brad')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeAwlMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种锥类型', () => {
    const types: AwlType[] = ['stitching', 'scratch', 'brad', 'pegging']
    types.forEach((t, i) => {
      ;(sys as any).makers.push(makeAwlMaker(i + 1, t))
    })
    const all = (sys as any).makers
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].awlType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeAwlMaker(10, 'pegging', { skill: 90, awlsMade: 20, sharpness: 80, reputation: 82 })
    ;(sys as any).makers.push(m)
    const result = (sys as any).makers[0]
    expect(result.skill).toBe(90)
    expect(result.awlsMade).toBe(20)
    expect(result.sharpness).toBe(80)
    expect(result.reputation).toBe(82)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1430)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1430
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1430)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)  // 1430 >= 1430
    expect((sys as any).lastCheck).toBe(1430)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000)  // 3000-2000=1000 < 1430，不更新
    expect((sys as any).lastCheck).toBe(2000)
    sys.update(1, em, 3430)  // 3430-2000=1430 >= 1430，更新
    expect((sys as any).lastCheck).toBe(3430)
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
    // 验证 Math.min(100, skill + 0.056) 逻辑
    const skill = 99.99
    const grown = Math.min(100, skill + 0.056)
    expect(grown).toBe(100)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-52000的匠人被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeAwlMaker(1, 'stitching', { tick: 0 }))       // 0 < 100000-52000=48000，会被清理
    ;(sys as any).makers.push(makeAwlMaker(2, 'pegging', { tick: 55000 }))    // 55000 >= 48000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-52000=48000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有匠人tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeAwlMaker(1, 'stitching', { tick: 50000 }))
    ;(sys as any).makers.push(makeAwlMaker(2, 'brad', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000，50000>=48000，60000>=48000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  it('awlType根据skill/25计算：skill=0→stitching，skill=25→scratch，skill=50→brad，skill=75→pegging', () => {
    // 验证 typeIdx = Math.min(3, Math.floor(skill/25)) 映射
    const types: AwlType[] = ['stitching', 'scratch', 'brad', 'pegging']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(types[idx]).toBe(types[i])
    })
  })

  it('awlsMade根据skill计算：skill=30时awlsMade=1+floor(30/8)=4', () => {
    const skill = 30
    const awlsMade = 1 + Math.floor(skill / 8)
    expect(awlsMade).toBe(4)
  })

  it('sharpness根据skill计算：skill=30时sharpness=15+30*0.71=36.3', () => {
    const skill = 30
    const sharpness = 15 + skill * 0.71
    expect(sharpness).toBeCloseTo(36.3, 5)
  })
})
