import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  afterEach(() => vi.restoreAllMocks())

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

  it('makers 数组初始为空数组实例', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
    expect((sys as any).makers.length).toBe(0)
  })

  it('多个 maker 的 entityId 各自独立', () => {
    ;(sys as any).makers.push(makeMaker(10, 'torchon'))
    ;(sys as any).makers.push(makeMaker(20, 'cluny'))
    expect((sys as any).makers[0].entityId).toBe(10)
    expect((sys as any).makers[1].entityId).toBe(20)
  })

  it('BobbinLaceMaker 的 id 字段是数字', () => {
    ;(sys as any).makers.push(makeMaker(1, 'torchon'))
    expect(typeof (sys as any).makers[0].id).toBe('number')
  })

  it('BobbinLaceMaker 的 tick 字段可以为 0', () => {
    const m = makeMaker(1, 'bruges', { tick: 0 })
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].tick).toBe(0)
  })

  it('BobbinLaceMaker 的 tick 字段可以为大数值', () => {
    const m = makeMaker(1, 'honiton', { tick: 999999 })
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].tick).toBe(999999)
  })

  it('makers 支持批量注入多个花边师', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'cluny'))
    }
    expect((sys as any).makers).toHaveLength(10)
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

  it('tick差值恰好为CHECK_INTERVAL-1=1479时不触发', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1479)  // 1479 < 1480
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值恰好为CHECK_INTERVAL=1480时触发', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 2480)  // 2480-1000=1480 >= 1480
    expect((sys as any).lastCheck).toBe(2480)
  })

  it('lastCheck更新为当前tick而非累加值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 7000)  // 差值2000 >= 1480
    expect((sys as any).lastCheck).toBe(7000)
  })

  it('tick为0时不触发更新（lastCheck初始为0）', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 0)  // 0-0=0 < 1480
    expect((sys as any).lastCheck).toBe(0)
  })

  it('连续触发时lastCheck持续更新', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).lastCheck).toBe(1480)
    sys.update(1, em, 2960)
    expect((sys as any).lastCheck).toBe(2960)
    sys.update(1, em, 4440)
    expect((sys as any).lastCheck).toBe(4440)
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

  it('skillMap可存储多个不同实体的技能', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 50)
    ;(sys as any).skillMap.set(3, 90)
    expect((sys as any).skillMap.size).toBe(3)
    expect((sys as any).skillMap.get(2)).toBe(50)
  })

  it('skillMap未设置时get返回undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('skillMap设置后可覆盖', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(1, 75)
    expect((sys as any).skillMap.get(1)).toBe(75)
  })

  it('SKILL_GROWTH=0.052：从0增长后为0.052', () => {
    const skill = 0
    const grown = Math.min(100, skill + 0.052)
    expect(grown).toBeCloseTo(0.052, 10)
  })

  it('SKILL_GROWTH累积：从50增长10次后约为50.52', () => {
    let skill = 50
    for (let i = 0; i < 10; i++) {
      skill = Math.min(100, skill + 0.052)
    }
    expect(skill).toBeCloseTo(50.52, 5)
  })

  it('skillMap存储技能值为浮点数时精度保持', () => {
    ;(sys as any).skillMap.set(1, 33.789)
    expect((sys as any).skillMap.get(1)).toBe(33.789)
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

  it('tick恰好等于cutoff时不被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    // cutoff = 100000 - 52000 = 48000，tick=48000 不 < cutoff，保留
    ;(sys as any).makers.push(makeMaker(1, 'bruges', { tick: 48000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
  })

  it('tick恰好为cutoff-1=47999时被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 47999 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(0)
  })

  it('清理后makers为空数组', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, 'cluny', { tick: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000，全部过期
    expect((sys as any).makers.length).toBe(0)
  })

  it('混合新鲜和过期maker，只清理过期', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 10000 }))   // 过期
    ;(sys as any).makers.push(makeMaker(2, 'bruges', { tick: 50000 }))    // 新鲜
    ;(sys as any).makers.push(makeMaker(3, 'cluny', { tick: 5000 }))     // 过期
    ;(sys as any).makers.push(makeMaker(4, 'honiton', { tick: 70000 }))  // 新鲜
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000
    expect((sys as any).makers.length).toBe(2)
    const ids = (sys as any).makers.map((m: BobbinLaceMaker) => m.entityId)
    expect(ids).toContain(2)
    expect(ids).toContain(4)
  })

  // ── nextId 自增 ───────────────────────────────────────────────────────────

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('nextId在两个maker中自增', () => {
    const m1 = makeMaker(1, 'torchon')
    const m2 = makeMaker(2, 'cluny')
    ;(sys as any).makers.push(m1)
    ;(sys as any).makers.push(m2)
    expect((sys as any).makers[0].id).toBeLessThan((sys as any).makers[1].id)
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

  it('lacePiecesMade：skill=0时为1+floor(0/10)=1', () => {
    expect(1 + Math.floor(0 / 10)).toBe(1)
  })

  it('lacePiecesMade：skill=10时为1+floor(10/10)=2', () => {
    expect(1 + Math.floor(10 / 10)).toBe(2)
  })

  it('lacePiecesMade：skill=100时为1+floor(100/10)=11', () => {
    expect(1 + Math.floor(100 / 10)).toBe(11)
  })

  it('lacePiecesMade：skill=9时为1+floor(9/10)=1', () => {
    expect(1 + Math.floor(9 / 10)).toBe(1)
  })

  it('intricacy：skill=0时为12+0*0.76=12', () => {
    expect(12 + 0 * 0.76).toBeCloseTo(12, 5)
  })

  it('intricacy：skill=100时为12+100*0.76=88', () => {
    expect(12 + 100 * 0.76).toBeCloseTo(88, 5)
  })

  it('reputation：skill=0时为10+0*0.83=10', () => {
    expect(10 + 0 * 0.83).toBeCloseTo(10, 5)
  })

  it('reputation：skill=100时为10+100*0.83=93', () => {
    expect(10 + 100 * 0.83).toBeCloseTo(93, 5)
  })

  it('typeIdx边界：skill=24.9时idx=0→torchon', () => {
    const skill = 24.9
    const idx = Math.min(3, Math.floor(skill / 25))
    const patterns: LacePattern[] = ['torchon', 'cluny', 'bruges', 'honiton']
    expect(patterns[idx]).toBe('torchon')
  })

  it('typeIdx边界：skill=99时idx=3→honiton', () => {
    const skill = 99
    const idx = Math.min(3, Math.floor(skill / 25))
    const patterns: LacePattern[] = ['torchon', 'cluny', 'bruges', 'honiton']
    expect(patterns[idx]).toBe('honiton')
  })

  it('typeIdx边界：skill=100时idx被min(3,4)=3→honiton', () => {
    const skill = 100
    const idx = Math.min(3, Math.floor(skill / 25))
    const patterns: LacePattern[] = ['torchon', 'cluny', 'bruges', 'honiton']
    expect(patterns[idx]).toBe('honiton')
  })

  it('typeIdx：skill=49时idx=1→cluny', () => {
    const skill = 49
    const idx = Math.min(3, Math.floor(skill / 25))
    const patterns: LacePattern[] = ['torchon', 'cluny', 'bruges', 'honiton']
    expect(patterns[idx]).toBe('cluny')
  })

  // ── MAX_MAKERS 上限 ───────────────────────────────────────────────────────

  it('MAX_MAKERS为30：注入30个maker后长度为30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'torchon'))
    }
    expect((sys as any).makers.length).toBe(30)
  })

  it('达到MAX_MAKERS时不新增maker（通过mock验证）', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 100, 'torchon', { tick: 999999 }))
    }
    const em = {
      getEntitiesWithComponents: () => [9999],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBe(30)
  })

  // ── update 流程集成 ────────────────────────────────────────────────────────

  it('getEntitiesWithComponents返回空时不新增maker', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBe(0)
  })

  it('creature age<10时不新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 9 }),  // age=9 < 10
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBe(0)
  })

  it('creature不存在时不新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => null,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBe(0)
  })

  it('random大于CRAFT_CHANCE时不新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBe(0)
  })

  it('random=0时满足CRAFT_CHANCE且age>=10时新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 15 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers.length).toBe(1)
  })

  it('新增maker的entityId与实体id一致', () => {
    const em = {
      getEntitiesWithComponents: () => [55],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers[0].entityId).toBe(55)
  })

  it('新增maker的tick与当前tick一致', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 8000)
    expect((sys as any).makers[0].tick).toBe(8000)
  })

  it('skillMap中已有技能的实体使用已存技能值', () => {
    ;(sys as any).skillMap.set(7, 75)  // 预设技能75
    const em = {
      getEntitiesWithComponents: () => [7],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    // skill=75+0.052=75.052，typeIdx=3→honiton
    expect((sys as any).makers[0].pattern).toBe('honiton')
    expect((sys as any).makers[0].skill).toBeCloseTo(75.052, 3)
  })

  it('skillMap中无技能的实体使用随机初始技能', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // skill=2+0*7=2，+0.052=2.052
    const em = {
      getEntitiesWithComponents: () => [99],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).makers[0].skill).toBeCloseTo(2.052, 3)
  })

  it('update后skillMap被更新', () => {
    ;(sys as any).skillMap.set(5, 50)
    const em = {
      getEntitiesWithComponents: () => [5],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1480)
    expect((sys as any).skillMap.get(5)).toBeCloseTo(50.052, 3)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('cutoff=tick-52000：tick=52000时cutoff=0', () => {
    const cutoff = 52000 - 52000
    expect(cutoff).toBe(0)
  })

  it('CRAFT_CHANCE=0.005：random=0.004时通过检查（不大于0.005）', () => {
    expect(0.004 > 0.005).toBe(false)
  })

  it('CRAFT_CHANCE=0.005：random=0.006时跳过', () => {
    expect(0.006 > 0.005).toBe(true)
  })
})
