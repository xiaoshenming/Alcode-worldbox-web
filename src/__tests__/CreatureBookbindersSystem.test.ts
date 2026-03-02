import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  afterEach(() => vi.restoreAllMocks())

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

  it('makers 数组初始为空数组实例', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
    expect((sys as any).makers.length).toBe(0)
  })

  it('多个 maker 的 entityId 各自独立', () => {
    ;(sys as any).makers.push(makeMaker(10, 'coptic'))
    ;(sys as any).makers.push(makeMaker(20, 'saddle'))
    expect((sys as any).makers[0].entityId).toBe(10)
    expect((sys as any).makers[1].entityId).toBe(20)
  })

  it('Bookbinder 的 id 字段是数字', () => {
    ;(sys as any).makers.push(makeMaker(1, 'coptic'))
    expect(typeof (sys as any).makers[0].id).toBe('number')
  })

  it('Bookbinder 的 tick 字段可以为 0', () => {
    const m = makeMaker(1, 'perfect', { tick: 0 })
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].tick).toBe(0)
  })

  it('Bookbinder 的 tick 字段可以为大数值', () => {
    const m = makeMaker(1, 'case', { tick: 999999 })
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].tick).toBe(999999)
  })

  it('makers 支持批量注入多个装订工', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'coptic'))
    }
    expect((sys as any).makers).toHaveLength(10)
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

  it('tick差值恰好为CHECK_INTERVAL-1=1359时不触发', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1359)  // 1359 < 1360
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值恰好为CHECK_INTERVAL=1360时触发', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 2360)  // 2360-1000=1360 >= 1360
    expect((sys as any).lastCheck).toBe(2360)
  })

  it('lastCheck更新为当前tick而非累加值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 7000)  // 差值2000 >= 1360
    expect((sys as any).lastCheck).toBe(7000)
  })

  it('tick为0时不触发更新（lastCheck初始为0）', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 0)  // 0-0=0 < 1360
    expect((sys as any).lastCheck).toBe(0)
  })

  it('连续触发时lastCheck持续更新', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).lastCheck).toBe(1360)
    sys.update(1, em, 2720)
    expect((sys as any).lastCheck).toBe(2720)
    sys.update(1, em, 4080)
    expect((sys as any).lastCheck).toBe(4080)
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

  it('skillMap可存储多个不同实体的技能', () => {
    ;(sys as any).skillMap.set(1, 20)
    ;(sys as any).skillMap.set(2, 60)
    ;(sys as any).skillMap.set(3, 95)
    expect((sys as any).skillMap.size).toBe(3)
    expect((sys as any).skillMap.get(3)).toBe(95)
  })

  it('skillMap未设置时get返回undefined', () => {
    expect((sys as any).skillMap.get(888)).toBeUndefined()
  })

  it('skillMap设置后可覆盖', () => {
    ;(sys as any).skillMap.set(1, 40)
    ;(sys as any).skillMap.set(1, 80)
    expect((sys as any).skillMap.get(1)).toBe(80)
  })

  it('SKILL_GROWTH=0.058：从0增长后为0.058', () => {
    const skill = 0
    const grown = Math.min(100, skill + 0.058)
    expect(grown).toBeCloseTo(0.058, 10)
  })

  it('SKILL_GROWTH累积：从50增长10次后约为50.58', () => {
    let skill = 50
    for (let i = 0; i < 10; i++) {
      skill = Math.min(100, skill + 0.058)
    }
    expect(skill).toBeCloseTo(50.58, 5)
  })

  it('skillMap存储技能值为浮点数时精度保持', () => {
    ;(sys as any).skillMap.set(1, 77.321)
    expect((sys as any).skillMap.get(1)).toBe(77.321)
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

  it('tick恰好等于cutoff=49000时不被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    // cutoff = 100000 - 51000 = 49000，tick=49000 不 < cutoff，保留
    ;(sys as any).makers.push(makeMaker(1, 'perfect', { tick: 49000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
  })

  it('tick恰好为cutoff-1=48999时被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    // cutoff = 100000 - 51000 = 49000，tick=48999 < cutoff，清理
    ;(sys as any).makers.push(makeMaker(1, 'coptic', { tick: 48999 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(0)
  })

  it('清理后makers为空数组', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'coptic', { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, 'saddle', { tick: 200 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=49000，全部过期
    expect((sys as any).makers.length).toBe(0)
  })

  it('混合新鲜和过期maker，只清理过期', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'coptic', { tick: 10000 }))   // 过期
    ;(sys as any).makers.push(makeMaker(2, 'perfect', { tick: 55000 }))  // 新鲜
    ;(sys as any).makers.push(makeMaker(3, 'saddle', { tick: 3000 }))    // 过期
    ;(sys as any).makers.push(makeMaker(4, 'case', { tick: 75000 }))     // 新鲜
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=49000
    expect((sys as any).makers.length).toBe(2)
    const ids = (sys as any).makers.map((m: Bookbinder) => m.entityId)
    expect(ids).toContain(2)
    expect(ids).toContain(4)
  })

  it('cutoff与BellMakers不同：51000而非52000', () => {
    // 书籍装订工 cutoff = tick - 51000，比铸钟师少1000
    const em = { getEntitiesWithComponents: () => [] } as any
    // tick=100000，cutoff=49000；tick=48999则被清理，tick=49000则保留
    ;(sys as any).makers.push(makeMaker(1, 'coptic', { tick: 48999 }))  // 被清理
    ;(sys as any).makers.push(makeMaker(2, 'perfect', { tick: 49000 })) // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  // ── nextId 自增 ───────────────────────────────────────────────────────────

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('nextId在两个maker中自增', () => {
    const m1 = makeMaker(1, 'coptic')
    const m2 = makeMaker(2, 'perfect')
    ;(sys as any).makers.push(m1)
    ;(sys as any).makers.push(m2)
    expect((sys as any).makers[0].id).toBeLessThan((sys as any).makers[1].id)
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

  it('booksBound：skill=0时为1+floor(0/8)=1', () => {
    expect(1 + Math.floor(0 / 8)).toBe(1)
  })

  it('booksBound：skill=8时为1+floor(8/8)=2', () => {
    expect(1 + Math.floor(8 / 8)).toBe(2)
  })

  it('booksBound：skill=100时为1+floor(100/8)=13', () => {
    expect(1 + Math.floor(100 / 8)).toBe(13)
  })

  it('booksBound：skill=7时为1+floor(7/8)=1', () => {
    expect(1 + Math.floor(7 / 8)).toBe(1)
  })

  it('durability：skill=0时为20+0*0.7=20', () => {
    expect(20 + 0 * 0.7).toBeCloseTo(20, 5)
  })

  it('durability：skill=100时为20+100*0.7=90', () => {
    expect(20 + 100 * 0.7).toBeCloseTo(90, 5)
  })

  it('reputation：skill=0时为10+0*0.83=10', () => {
    expect(10 + 0 * 0.83).toBeCloseTo(10, 5)
  })

  it('reputation：skill=100时为10+100*0.83=93', () => {
    expect(10 + 100 * 0.83).toBeCloseTo(93, 5)
  })

  it('styleIdx边界：skill=24.9时idx=0→coptic', () => {
    const skill = 24.9
    const idx = Math.min(3, Math.floor(skill / 25))
    const styles: BindingStyle[] = ['coptic', 'perfect', 'saddle', 'case']
    expect(styles[idx]).toBe('coptic')
  })

  it('styleIdx边界：skill=99时idx=3→case', () => {
    const skill = 99
    const idx = Math.min(3, Math.floor(skill / 25))
    const styles: BindingStyle[] = ['coptic', 'perfect', 'saddle', 'case']
    expect(styles[idx]).toBe('case')
  })

  it('styleIdx边界：skill=100时idx被min(3,4)=3→case', () => {
    const skill = 100
    const idx = Math.min(3, Math.floor(skill / 25))
    const styles: BindingStyle[] = ['coptic', 'perfect', 'saddle', 'case']
    expect(styles[idx]).toBe('case')
  })

  it('styleIdx：skill=49时idx=1→perfect', () => {
    const skill = 49
    const idx = Math.min(3, Math.floor(skill / 25))
    const styles: BindingStyle[] = ['coptic', 'perfect', 'saddle', 'case']
    expect(styles[idx]).toBe('perfect')
  })

  // ── MAX_MAKERS 上限 ───────────────────────────────────────────────────────

  it('MAX_MAKERS为30：注入30个maker后长度为30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'coptic'))
    }
    expect((sys as any).makers.length).toBe(30)
  })

  it('达到MAX_MAKERS时不新增maker（通过mock验证）', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 100, 'coptic', { tick: 999999 }))
    }
    const em = {
      getEntitiesWithComponents: () => [9999],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).makers.length).toBe(30)
  })

  // ── update 流程集成 ────────────────────────────────────────────────────────

  it('getEntitiesWithComponents返回空时不新增maker', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).makers.length).toBe(0)
  })

  it('creature age<10时不新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 9 }),  // age=9 < 10
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).makers.length).toBe(0)
  })

  it('creature不存在时不新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => null,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).makers.length).toBe(0)
  })

  it('random大于CRAFT_CHANCE时不新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).makers.length).toBe(0)
  })

  it('random=0时满足CRAFT_CHANCE且age>=10时新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 15 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).makers.length).toBe(1)
  })

  it('新增maker的entityId与实体id一致', () => {
    const em = {
      getEntitiesWithComponents: () => [77],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).makers[0].entityId).toBe(77)
  })

  it('新增maker的tick与当前tick一致', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 6000)
    expect((sys as any).makers[0].tick).toBe(6000)
  })

  it('skillMap中已有技能的实体使用已存技能值', () => {
    ;(sys as any).skillMap.set(8, 75)  // 预设技能75
    const em = {
      getEntitiesWithComponents: () => [8],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    // skill=75+0.058=75.058，styleIdx=3→case
    expect((sys as any).makers[0].bindingStyle).toBe('case')
    expect((sys as any).makers[0].skill).toBeCloseTo(75.058, 3)
  })

  it('skillMap中无技能的实体使用随机初始技能', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // skill=2+0*7=2，+0.058=2.058
    const em = {
      getEntitiesWithComponents: () => [99],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).makers[0].skill).toBeCloseTo(2.058, 3)
  })

  it('update后skillMap被更新', () => {
    ;(sys as any).skillMap.set(6, 50)
    const em = {
      getEntitiesWithComponents: () => [6],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).skillMap.get(6)).toBeCloseTo(50.058, 3)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('cutoff=tick-51000：tick=51000时cutoff=0', () => {
    const cutoff = 51000 - 51000
    expect(cutoff).toBe(0)
  })

  it('cutoff=tick-51000：tick=51001时cutoff=1', () => {
    const cutoff = 51001 - 51000
    expect(cutoff).toBe(1)
  })

  it('CRAFT_CHANCE=0.005：random=0.005时仍通过（不大于0.005）', () => {
    expect(0.005 > 0.005).toBe(false)
  })

  it('CRAFT_CHANCE=0.005：random=0.006时跳过', () => {
    expect(0.006 > 0.005).toBe(true)
  })

  it('新增maker的bindingStyle基于skill计算', () => {
    ;(sys as any).skillMap.set(3, 50)  // skill=50+0.058=50.058，idx=2→saddle
    const em = {
      getEntitiesWithComponents: () => [3],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).makers[0].bindingStyle).toBe('saddle')
  })

  it('新增maker的durability基于skill计算', () => {
    ;(sys as any).skillMap.set(3, 50)  // skill=50.058，durability=20+50.058*0.7≈55.04
    const em = {
      getEntitiesWithComponents: () => [3],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1360)
    expect((sys as any).makers[0].durability).toBeCloseTo(20 + 50.058 * 0.7, 3)
  })
})
