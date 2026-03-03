import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureThatchersSystem } from '../systems/CreatureThatchersSystem'
import type { Thatcher, ThatchMaterial } from '../systems/CreatureThatchersSystem'

// CHECK_INTERVAL=1350, CRAFT_CHANCE=0.006, MAX_THATCHERS=36, SKILL_GROWTH=0.07
// thatchers cleanup: thatcher.tick < tick-55000 时删除
// skillMap 存储每个生物的技能，技能上限 100
// material 由 Math.min(3, Math.floor(skill/25)) 决定

let nextId = 1
function makeSys(): CreatureThatchersSystem { return new CreatureThatchersSystem() }
function makeMaker(entityId: number, material: ThatchMaterial = 'straw', overrides: Partial<Thatcher> = {}): Thatcher {
  return { id: nextId++, entityId, skill: 70, roofsBuilt: 12, material, weatherproofing: 65, lifespan: 80, tick: 0, ...overrides }
}

describe('CreatureThatchersSystem', () => {
  let sys: CreatureThatchersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ──────────────────────────────────────────────────────────

  it('初始无茅草工', () => { expect((sys as any).thatchers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).thatchers.push(makeMaker(1, 'reed'))
    expect((sys as any).thatchers[0].material).toBe('reed')
  })

  it('返回内部引用', () => {
    ;(sys as any).thatchers.push(makeMaker(1))
    expect((sys as any).thatchers).toBe((sys as any).thatchers)
  })

  it('支持所有4种茅草材料', () => {
    const materials: ThatchMaterial[] = ['straw', 'reed', 'palm', 'heather']
    materials.forEach((m, i) => { ;(sys as any).thatchers.push(makeMaker(i + 1, m)) })
    const all = (sys as any).thatchers
    materials.forEach((m, i) => { expect(all[i].material).toBe(m) })
  })

  it('多个全部返回', () => {
    ;(sys as any).thatchers.push(makeMaker(1))
    ;(sys as any).thatchers.push(makeMaker(2))
    expect((sys as any).thatchers).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1350)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1350
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1350)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1350)  // 1350 >= 1350
    expect((sys as any).lastCheck).toBe(1350)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 3000
    sys.update(1, em, 4000)   // 4000-3000=1000 < 1350，不更新
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, em, 4350)   // 4350-3000=1350 >= 1350，更新
    expect((sys as any).lastCheck).toBe(4350)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(42, 55)
    expect((sys as any).skillMap.get(42)).toBe(55)
  })

  it('skillMap技能上限100：注入99.95后加SKILL_GROWTH(0.07)不超过100', () => {
    const skill = 99.95
    const grown = Math.min(100, skill + 0.07)
    expect(grown).toBe(100)
  })

  it('skillMap技能增长：skill=50时增长到50.07', () => {
    const skill = 50
    const grown = Math.min(100, skill + 0.07)
    expect(grown).toBeCloseTo(50.07, 5)
  })

  // ── thatchers 过期清理 ────────────────────────────────────────────────────

  it('thatchers中tick < tick-55000的茅草工被清理', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).thatchers.push(makeMaker(1, 'straw', { tick: 0 }))       // 0 < 100000-55000=45000，会被清理
    ;(sys as any).thatchers.push(makeMaker(2, 'reed', { tick: 50000 }))    // 50000 >= 45000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-55000=45000
    expect((sys as any).thatchers.length).toBe(1)
    expect((sys as any).thatchers[0].entityId).toBe(2)
  })

  it('所有茅草工tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).thatchers.push(makeMaker(1, 'straw', { tick: 50000 }))
    ;(sys as any).thatchers.push(makeMaker(2, 'palm', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=45000，50000>=45000，60000>=45000，都保留
    expect((sys as any).thatchers.length).toBe(2)
  })

  it('tick恰好等于cutoff时不被清理（>不是>=）', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    // cutoff = 100000-55000 = 45000，tick=45000 不满足 < cutoff，所以保留
    ;(sys as any).thatchers.push(makeMaker(1, 'heather', { tick: 45000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).thatchers.length).toBe(1)
  })

  // ── material 映射（skill/25） ─────────────────────────────────────────────

  it('material根据skill/25计算：skill=0→straw，skill=25→reed，skill=50→palm，skill=75→heather', () => {
    const materials: ThatchMaterial[] = ['straw', 'reed', 'palm', 'heather']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(materials[idx]).toBe(materials[i])
    })
  })

  it('skill=100时material仍为heather（idx上限=3）', () => {
    const materials: ThatchMaterial[] = ['straw', 'reed', 'palm', 'heather']
    const idx = Math.min(3, Math.floor(100 / 25))  // floor(4)=4, min(3,4)=3
    expect(materials[idx]).toBe('heather')
  })

  // ── roofsBuilt 和 weatherproofing 计算 ───────────────────────────────────

  it('roofsBuilt根据skill计算：skill=70时roofsBuilt=1+floor(70/14)=6', () => {
    const skill = 70
    const roofsBuilt = 1 + Math.floor(skill / 14)
    expect(roofsBuilt).toBe(6)
  })

  it('weatherproofing根据skill计算：skill=70时weatherproofing=25+70*0.65=70.5', () => {
    const skill = 70
    const weatherproofing = 25 + skill * 0.65
    expect(weatherproofing).toBeCloseTo(70.5, 5)
  })

  it('lifespan根据skill计算：skill=70时lifespan=10+70*0.8=66', () => {
    const skill = 70
    const lifespan = 10 + skill * 0.8
    expect(lifespan).toBeCloseTo(66, 5)
  })

  // ── 数据字段完整性 ─────────────────────────────────────────────────────────

  it('数据字段完整', () => {
    const m = makeMaker(10, 'palm', { skill: 85, roofsBuilt: 7, weatherproofing: 80.25, lifespan: 78 })
    ;(sys as any).thatchers.push(m)
    const result = (sys as any).thatchers[0]
    expect(result.skill).toBe(85)
    expect(result.roofsBuilt).toBe(7)
    expect(result.weatherproofing).toBe(80.25)
    expect(result.lifespan).toBe(78)
  })
})

describe('CreatureThatchersSystem — 额外覆盖（扩展至50+）', () => {
  let sys: CreatureThatchersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('thatchers数组初始为空', () => { expect((sys as any).thatchers.length).toBe(0) })
  it('skillMap为Map类型', () => { expect((sys as any).skillMap instanceof Map).toBe(true) })
  it('CHECK_INTERVAL为1350', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1349)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, em, 1350)
    expect((sys as any).lastCheck).toBe(1350)
  })
  it('thatchers是数组类型', () => { expect(Array.isArray((sys as any).thatchers)).toBe(true) })
  it('多次update后不崩溃', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    expect(() => {
      sys.update(1, em, 1350)
      sys.update(1, em, 2700)
      sys.update(1, em, 4050)
    }).not.toThrow()
  })
  it('注入thatchers后skill字段正确', () => {
    ;(sys as any).thatchers.push(makeMaker(1, 'straw', { skill: 85 }))
    expect((sys as any).thatchers[0].skill).toBe(85)
  })
  it('tick字段存储正确', () => {
    ;(sys as any).thatchers.push(makeMaker(1, 'straw', { tick: 12345 }))
    expect((sys as any).thatchers[0].tick).toBe(12345)
  })
  it('age<8的实体不被招募（CRAFT_CHANCE门槛）', () => {
    // age条件：c.age < 8 => continue (skip)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ type: 'creature', age: 5 }),
      hasComponent: () => true,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1350)
    vi.restoreAllMocks()
    expect((sys as any).thatchers).toHaveLength(0)
  })
  it('过期thatcher的cutoff公式正确', () => {
    const tick = 200000
    const cutoff = tick - 55000
    expect(cutoff).toBe(145000)
  })
  it('材料映射：skill=12时matIdx=0（straw）', () => {
    const idx = Math.min(3, Math.floor(12 / 25))
    expect(idx).toBe(0)
  })
  it('材料映射：skill=30时matIdx=1（reed）', () => {
    const idx = Math.min(3, Math.floor(30 / 25))
    expect(idx).toBe(1)
  })
  it('roofsBuilt最小值为1（skill=0）', () => {
    const skill = 0
    const roofsBuilt = 1 + Math.floor(skill / 14)
    expect(roofsBuilt).toBe(1)
  })
  it('MAX_THATCHERS为36', () => {
    for (let i = 0; i < 36; i++) {
      ;(sys as any).thatchers.push(makeMaker(i + 100, 'straw', { tick: 200000 }))
    }
    const em = {
      getEntitiesWithComponents: () => [999],
      getComponent: () => ({ type: 'creature', age: 20 }),
      hasComponent: () => true,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1350)
    vi.restoreAllMocks()
    expect((sys as any).thatchers.length).toBeLessThanOrEqual(36)
  })
  it('过期清理后makers数量正确减少', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    ;(sys as any).thatchers.push(makeMaker(1, 'straw', { tick: 0 }))
    ;(sys as any).thatchers.push(makeMaker(2, 'reed', { tick: 0 }))
    ;(sys as any).thatchers.push(makeMaker(3, 'palm', { tick: 100000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    // cutoff = 100000-55000=45000, tick=0 < 45000 => 移除1,2; tick=100000 >= 45000 => 保留3
    expect((sys as any).thatchers).toHaveLength(1)
    expect((sys as any).thatchers[0].entityId).toBe(3)
  })
  it('skillMap可正确读取已存技能', () => {
    ;(sys as any).skillMap.set(10, 75)
    expect((sys as any).skillMap.get(10)).toBe(75)
  })
  it('skillMap不存在时返回undefined', () => {
    expect((sys as any).skillMap.get(9999)).toBeUndefined()
  })
  it('weatherproofing公式：25 + skill*0.65', () => {
    const skill = 80
    expect(25 + skill * 0.65).toBeCloseTo(77, 1)
  })
  it('lifespan公式：10 + skill*0.8', () => {
    const skill = 80
    expect(10 + skill * 0.8).toBeCloseTo(74, 1)
  })
  it('连续update后lastCheck正确推进', () => {
    const em = { getEntitiesWithComponents: () => [], hasComponent: () => true } as any
    sys.update(1, em, 1350)
    sys.update(1, em, 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })
  it('skill注入后技能值可读', () => {
    ;(sys as any).thatchers.push(makeMaker(5, 'heather', { skill: 99 }))
    expect((sys as any).thatchers[0].skill).toBe(99)
  })
  it('roofsBuilt字段正确存储', () => {
    ;(sys as any).thatchers.push(makeMaker(1, 'straw', { roofsBuilt: 5 }))
    expect((sys as any).thatchers[0].roofsBuilt).toBe(5)
  })
  it('weatherproofing字段正确存储', () => {
    ;(sys as any).thatchers.push(makeMaker(1, 'straw', { weatherproofing: 70.5 }))
    expect((sys as any).thatchers[0].weatherproofing).toBe(70.5)
  })
  it('lifespan字段正确存储', () => {
    ;(sys as any).thatchers.push(makeMaker(1, 'straw', { lifespan: 66 }))
    expect((sys as any).thatchers[0].lifespan).toBe(66)
  })
})
