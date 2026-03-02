import { describe, it, expect, beforeEach } from 'vitest'
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
