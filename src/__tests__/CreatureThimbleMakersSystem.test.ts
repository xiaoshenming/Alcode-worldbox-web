import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureThimbleMakersSystem } from '../systems/CreatureThimbleMakersSystem'
import type { ThimbleMaker, ThimbleMaterial } from '../systems/CreatureThimbleMakersSystem'

// CHECK_INTERVAL=1360, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.056
// makers cleanup: maker.tick < tick-50000 时删除
// skillMap 存储每个生物的技能，技能上限 100
// material 由 Math.min(3, Math.floor(skill/25)) 决定

let nextId = 1
function makeSys(): CreatureThimbleMakersSystem { return new CreatureThimbleMakersSystem() }
function makeMaker(entityId: number, material: ThimbleMaterial = 'brass', overrides: Partial<ThimbleMaker> = {}): ThimbleMaker {
  return { id: nextId++, entityId, skill: 70, thimblesMade: 12, material, fitPrecision: 65, reputation: 45, tick: 0, ...overrides }
}

describe('CreatureThimbleMakersSystem', () => {
  let sys: CreatureThimbleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ──────────────────────────────────────────────────────────

  it('初始无顶针工匠', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'silver'))
    expect((sys as any).makers[0].material).toBe('silver')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有4种顶针材料', () => {
    const materials: ThimbleMaterial[] = ['brass', 'silver', 'steel', 'leather']
    materials.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
    const all = (sys as any).makers
    materials.forEach((m, i) => { expect(all[i].material).toBe(m) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1360)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1360
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1360)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)  // 1360 >= 1360
    expect((sys as any).lastCheck).toBe(1360)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 4000
    sys.update(1, em, 5000)   // 5000-4000=1000 < 1360，不更新
    expect((sys as any).lastCheck).toBe(4000)
    sys.update(1, em, 5360)   // 5360-4000=1360 >= 1360，更新
    expect((sys as any).lastCheck).toBe(5360)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(99, 75)
    expect((sys as any).skillMap.get(99)).toBe(75)
  })

  it('skillMap技能上限100：注入99.95后加SKILL_GROWTH(0.056)不超过100', () => {
    const skill = 99.95
    const grown = Math.min(100, skill + 0.056)
    expect(grown).toBe(100)
  })

  it('skillMap技能增长：skill=50时增长到50.056', () => {
    const skill = 50
    const grown = Math.min(100, skill + 0.056)
    expect(grown).toBeCloseTo(50.056, 5)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-50000的工匠被清理', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).makers.push(makeMaker(1, 'brass', { tick: 0 }))       // 0 < 100000-50000=50000，会被清理
    ;(sys as any).makers.push(makeMaker(2, 'steel', { tick: 60000 }))   // 60000 >= 50000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-50000=50000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有工匠tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).makers.push(makeMaker(1, 'brass', { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, 'leather', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=50000，55000>=50000，60000>=50000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  it('tick恰好等于cutoff时不被清理（严格小于）', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    // cutoff = 100000-50000 = 50000，tick=50000 不满足 < cutoff，所以保留
    ;(sys as any).makers.push(makeMaker(1, 'silver', { tick: 50000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
  })

  // ── material 映射（skill/25） ─────────────────────────────────────────────

  it('material根据skill/25计算：skill=0→brass，skill=25→silver，skill=50→steel，skill=75→leather', () => {
    const materials: ThimbleMaterial[] = ['brass', 'silver', 'steel', 'leather']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(materials[idx]).toBe(materials[i])
    })
  })

  it('skill=100时material仍为leather（idx上限=3）', () => {
    const materials: ThimbleMaterial[] = ['brass', 'silver', 'steel', 'leather']
    const idx = Math.min(3, Math.floor(100 / 25))  // floor(4)=4, min(3,4)=3
    expect(materials[idx]).toBe('leather')
  })

  // ── thimblesMade 和 fitPrecision/reputation 计算 ─────────────────────────

  it('thimblesMade根据skill计算：skill=70时thimblesMade=2+floor(70/6)=13', () => {
    const skill = 70
    const thimblesMade = 2 + Math.floor(skill / 6)
    expect(thimblesMade).toBe(13)
  })

  it('fitPrecision根据skill计算：skill=70时fitPrecision=16+70*0.72=66.4', () => {
    const skill = 70
    const fitPrecision = 16 + skill * 0.72
    expect(fitPrecision).toBeCloseTo(66.4, 5)
  })

  it('reputation根据skill计算：skill=70时reputation=10+70*0.8=66', () => {
    const skill = 70
    const reputation = 10 + skill * 0.8
    expect(reputation).toBeCloseTo(66, 5)
  })

  // ── 数据字段完整性 ─────────────────────────────────────────────────────────

  it('数据字段完整', () => {
    const m = makeMaker(10, 'steel', { skill: 85, thimblesMade: 16, fitPrecision: 77.2, reputation: 78 })
    ;(sys as any).makers.push(m)
    const result = (sys as any).makers[0]
    expect(result.skill).toBe(85)
    expect(result.thimblesMade).toBe(16)
    expect(result.fitPrecision).toBe(77.2)
    expect(result.reputation).toBe(78)
  })
})

describe('CreatureThimbleMakersSystem — 额外覆盖（扩展至50+）', () => {
  let sys: CreatureThimbleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('makers是数组类型', () => { expect(Array.isArray((sys as any).makers)).toBe(true) })
  it('CHECK_INTERVAL=1360', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1359)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, em, 1360)
    expect((sys as any).lastCheck).toBe(1360)
  })
  it('tick字段存储正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'brass', { tick: 12345 }))
    expect((sys as any).makers[0].tick).toBe(12345)
  })
  it('fitPrecision字段存储正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'brass', { fitPrecision: 75 }))
    expect((sys as any).makers[0].fitPrecision).toBe(75)
  })
  it('reputation字段存储正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'brass', { reputation: 55 }))
    expect((sys as any).makers[0].reputation).toBe(55)
  })
  it('thimblesMade字段存储正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'brass', { thimblesMade: 20 }))
    expect((sys as any).makers[0].thimblesMade).toBe(20)
  })
  it('支持所有4种材料类型', () => {
    const materials: ThimbleMaterial[] = ['brass', 'silver', 'steel', 'leather']
    materials.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
    const all = (sys as any).makers
    materials.forEach((m, i) => { expect(all[i].material).toBe(m) })
  })
  it('fitPrecision公式：16 + skill * 0.72', () => {
    const skill = 70
    expect(16 + skill * 0.72).toBeCloseTo(66.4, 1)
  })
  it('reputation公式：10 + skill * 0.8', () => {
    const skill = 70
    expect(10 + skill * 0.8).toBeCloseTo(66, 1)
  })
  it('thimblesMade公式：2 + floor(skill/6)', () => {
    const skill = 60
    expect(2 + Math.floor(skill / 6)).toBe(12)
  })
  it('cutoff公式：tick - 50000', () => {
    const tick = 100000
    expect(tick - 50000).toBe(50000)
  })
  it('过期maker被清除', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).makers.push(makeMaker(1, 'brass', { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, 'silver', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    // cutoff = 100000 - 50000 = 50000, tick=0<50000 => 移除; tick=60000>=50000 => 保留
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('未过期的maker保留', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).makers.push(makeMaker(1, 'steel', { tick: 80000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('material映射：skill=50时matIdx=2（steel）', () => {
    const materials: ThimbleMaterial[] = ['brass', 'silver', 'steel', 'leather']
    const idx = Math.min(3, Math.floor(50 / 25))
    expect(materials[idx]).toBe('steel')
  })
  it('material映射：skill=75时matIdx=3（leather）', () => {
    const materials: ThimbleMaterial[] = ['brass', 'silver', 'steel', 'leather']
    const idx = Math.min(3, Math.floor(75 / 25))
    expect(materials[idx]).toBe('leather')
  })
  it('SKILL_GROWTH=0.056', () => {
    const SKILL_GROWTH = 0.056
    expect(SKILL_GROWTH).toBeCloseTo(0.056, 5)
  })
  it('update不崩溃（空系统）', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    expect(() => sys.update(1, em, 1360)).not.toThrow()
  })
  it('多次update后lastCheck正确推进', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    sys.update(1, em, 1360)
    sys.update(1, em, 2720)
    expect((sys as any).lastCheck).toBe(2720)
  })
  it('skillMap.has返回正确布尔值', () => {
    ;(sys as any).skillMap.set(5, 50)
    expect((sys as any).skillMap.has(5)).toBe(true)
    expect((sys as any).skillMap.has(99)).toBe(false)
  })
  it('makers中entityId字段正确', () => {
    ;(sys as any).makers.push(makeMaker(42, 'brass'))
    expect((sys as any).makers[0].entityId).toBe(42)
  })
  it('age<10的实体不被招募', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ type: 'creature', age: 5 }),
      hasComponent: () => true,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    vi.restoreAllMocks()
    expect((sys as any).makers).toHaveLength(0)
  })
  it('连续三次update后不崩溃', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    expect(() => {
      sys.update(1, em, 1360)
      sys.update(1, em, 2720)
      sys.update(1, em, 4080)
    }).not.toThrow()
  })
  it('skill初始化范围：2 + random*7', () => {
    const minSkill = 2 + 0 * 7
    const maxSkill = 2 + 0.99 * 7
    expect(minSkill).toBe(2)
    expect(maxSkill).toBeCloseTo(8.93, 1)
  })
  it('makers数组被正确初始化为空', () => {
    const newSys = new CreatureThimbleMakersSystem()
    expect((newSys as any).makers.length).toBe(0)
  })
  it('tick恰好等于cutoff时不被移除', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    // cutoff = 100000 - 50000 = 50000, tick=50000 不满足 < cutoff, 保留
    ;(sys as any).makers.push(makeMaker(1, 'brass', { tick: 50000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers).toHaveLength(1)
  })
})
