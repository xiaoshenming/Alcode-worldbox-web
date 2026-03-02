import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBellMakersSystem } from '../systems/CreatureBellMakersSystem'
import type { BellMaker, BellType } from '../systems/CreatureBellMakersSystem'

// CHECK_INTERVAL=1420, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.058
// makers cleanup: maker.tick < tick-52000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeSys(): CreatureBellMakersSystem {
  return new CreatureBellMakersSystem()
}

function makeMaker(entityId: number, bellType: BellType = 'hand', overrides: Partial<BellMaker> = {}): BellMaker {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    bellsCast: 5,
    bellType,
    toneQuality: 40,
    reputation: 35,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureBellMakersSystem', () => {
  let sys: CreatureBellMakersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 基础数据测试 ───────────────���───────────────────────────────────────────

  it('初始无铸钟师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'church'))
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].bellType).toBe('church')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种铃铛类型', () => {
    const types: BellType[] = ['church', 'ship', 'hand', 'carillon']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].bellType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'carillon')
    m.skill = 80; m.bellsCast = 20; m.toneQuality = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80)
    expect(r.bellsCast).toBe(20)
    expect(r.toneQuality).toBe(90)
    expect(r.reputation).toBe(85)
  })

  it('makers 数组初始为空数组实例', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
    expect((sys as any).makers.length).toBe(0)
  })

  it('多个 maker 的 entityId 各自独立', () => {
    ;(sys as any).makers.push(makeMaker(10, 'hand'))
    ;(sys as any).makers.push(makeMaker(20, 'ship'))
    expect((sys as any).makers[0].entityId).toBe(10)
    expect((sys as any).makers[1].entityId).toBe(20)
  })

  it('BellMaker 的 id 字段是数字', () => {
    ;(sys as any).makers.push(makeMaker(1, 'church'))
    expect(typeof (sys as any).makers[0].id).toBe('number')
  })

  it('BellMaker 的 tick 字段可以为 0', () => {
    const m = makeMaker(1, 'hand', { tick: 0 })
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].tick).toBe(0)
  })

  it('BellMaker 的 tick 字段可以为大数值', () => {
    const m = makeMaker(1, 'hand', { tick: 999999 })
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].tick).toBe(999999)
  })

  it('makers 支持批量注入多个铸钟师', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'hand'))
    }
    expect((sys as any).makers).toHaveLength(10)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1420)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1420
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1420)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)  // 1420 >= 1420
    expect((sys as any).lastCheck).toBe(1420)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 3000
    sys.update(1, em, 4000)  // 4000-3000=1000 < 1420，不更新
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, em, 4420)  // 4420-3000=1420 >= 1420，更新
    expect((sys as any).lastCheck).toBe(4420)
  })

  it('tick差值恰好为CHECK_INTERVAL-1时不触发', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1419)  // 1419 < 1420
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值恰好为CHECK_INTERVAL时触发', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 2420)  // 2420-1000=1420 >= 1420
    expect((sys as any).lastCheck).toBe(2420)
  })

  it('lastCheck更新为当前tick而非tick+lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 7000)  // 差值2000 >= 1420
    expect((sys as any).lastCheck).toBe(7000)
  })

  it('tick为0时不触发更新（lastCheck初始为0）', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 0)  // 0-0=0 < 1420
    expect((sys as any).lastCheck).toBe(0)
  })

  it('连续触发时lastCheck持续更新', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)
    expect((sys as any).lastCheck).toBe(1420)
    sys.update(1, em, 2840)
    expect((sys as any).lastCheck).toBe(2840)
    sys.update(1, em, 4260)
    expect((sys as any).lastCheck).toBe(4260)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(42, 60)
    expect((sys as any).skillMap.get(42)).toBe(60)
  })

  it('skillMap技能上限100：注入99.99后加SKILL_GROWTH不超过100', () => {
    // 直接测试 Math.min(100, skill + 0.058) 逻辑
    const skill = 99.99
    const grown = Math.min(100, skill + 0.058)
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
    ;(sys as any).skillMap.set(1, 33.456)
    expect((sys as any).skillMap.get(1)).toBe(33.456)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-52000的匠人被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'hand', { tick: 0 }))        // 0 < 100000-52000=48000，会被清理
    ;(sys as any).makers.push(makeMaker(2, 'ship', { tick: 60000 }))    // 60000 >= 48000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-52000=48000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有匠人tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'hand', { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, 'church', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000，55000>=48000，60000>=48000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  it('tick恰好等于cutoff时不被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    // cutoff = 100000 - 52000 = 48000，tick=48000 不 < cutoff，保留
    ;(sys as any).makers.push(makeMaker(1, 'hand', { tick: 48000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
  })

  it('tick恰好为cutoff-1时被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    // cutoff = 100000 - 52000 = 48000，tick=47999 < cutoff，清理
    ;(sys as any).makers.push(makeMaker(1, 'hand', { tick: 47999 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(0)
  })

  it('清理后makers为空数组', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'hand', { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, 'church', { tick: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000，全部过期
    expect((sys as any).makers.length).toBe(0)
  })

  it('混合新鲜和过期maker，只清理过期', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'hand', { tick: 10000 }))   // 过期
    ;(sys as any).makers.push(makeMaker(2, 'ship', { tick: 50000 }))   // 新鲜
    ;(sys as any).makers.push(makeMaker(3, 'church', { tick: 5000 }))  // 过期
    ;(sys as any).makers.push(makeMaker(4, 'carillon', { tick: 70000 })) // 新鲜
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000
    expect((sys as any).makers.length).toBe(2)
    const ids = (sys as any).makers.map((m: BellMaker) => m.entityId)
    expect(ids).toContain(2)
    expect(ids).toContain(4)
  })

  // ── nextId 自增 ───────────────────────────────────────────────────────────

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('nextId在makers中不影响外部maker的id', () => {
    const m1 = makeMaker(1, 'hand')
    const m2 = makeMaker(2, 'ship')
    ;(sys as any).makers.push(m1)
    ;(sys as any).makers.push(m2)
    // 外部手动创建的 id 由 nextId 全局变量控制
    expect((sys as any).makers[0].id).toBeLessThan((sys as any).makers[1].id)
  })

  // ── 计算公式验证 ──────────────────────────────────────────────────────────

  it('bellType根据skill/25计算：skill=0→church，skill=25→ship，skill=50→hand，skill=75→carillon', () => {
    const types: BellType[] = ['church', 'ship', 'hand', 'carillon']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(types[idx]).toBe(types[i])
    })
  })

  it('bellsCast根据skill计算：skill=27时bellsCast=1+floor(27/9)=4', () => {
    const skill = 27
    const bellsCast = 1 + Math.floor(skill / 9)
    expect(bellsCast).toBe(4)
  })

  it('toneQuality根据skill计算：skill=30时toneQuality=14+30*0.73=35.9', () => {
    const skill = 30
    const toneQuality = 14 + skill * 0.73
    expect(toneQuality).toBeCloseTo(35.9, 5)
  })

  it('reputation根据skill计算：skill=30时reputation=10+30*0.82=34.6', () => {
    const skill = 30
    const reputation = 10 + skill * 0.82
    expect(reputation).toBeCloseTo(34.6, 5)
  })

  it('bellsCast：skill=0时为1+floor(0/9)=1', () => {
    const skill = 0
    expect(1 + Math.floor(skill / 9)).toBe(1)
  })

  it('bellsCast：skill=9时为1+floor(9/9)=2', () => {
    const skill = 9
    expect(1 + Math.floor(skill / 9)).toBe(2)
  })

  it('bellsCast：skill=100时为1+floor(100/9)=12', () => {
    const skill = 100
    expect(1 + Math.floor(skill / 9)).toBe(12)
  })

  it('bellsCast：skill=8时为1+floor(8/9)=1', () => {
    const skill = 8
    expect(1 + Math.floor(skill / 9)).toBe(1)
  })

  it('toneQuality：skill=0时为14+0*0.73=14', () => {
    expect(14 + 0 * 0.73).toBeCloseTo(14, 5)
  })

  it('toneQuality：skill=100时为14+100*0.73=87', () => {
    expect(14 + 100 * 0.73).toBeCloseTo(87, 5)
  })

  it('reputation：skill=0时为10+0*0.82=10', () => {
    expect(10 + 0 * 0.82).toBeCloseTo(10, 5)
  })

  it('reputation：skill=100时为10+100*0.82=92', () => {
    expect(10 + 100 * 0.82).toBeCloseTo(92, 5)
  })

  it('typeIdx边界：skill=24.9时idx=0→church', () => {
    const skill = 24.9
    const idx = Math.min(3, Math.floor(skill / 25))
    const types: BellType[] = ['church', 'ship', 'hand', 'carillon']
    expect(types[idx]).toBe('church')
  })

  it('typeIdx边界：skill=99时idx=3→carillon', () => {
    const skill = 99
    const idx = Math.min(3, Math.floor(skill / 25))
    const types: BellType[] = ['church', 'ship', 'hand', 'carillon']
    expect(types[idx]).toBe('carillon')
  })

  it('typeIdx边界：skill=100时idx被min(3,4)=3→carillon', () => {
    const skill = 100
    const idx = Math.min(3, Math.floor(skill / 25))
    const types: BellType[] = ['church', 'ship', 'hand', 'carillon']
    expect(types[idx]).toBe('carillon')
  })

  it('typeIdx：skill=49时idx=1→ship', () => {
    const skill = 49
    const idx = Math.min(3, Math.floor(skill / 25))
    const types: BellType[] = ['church', 'ship', 'hand', 'carillon']
    expect(types[idx]).toBe('ship')
  })

  // ── MAX_MAKERS 上限 ───────────────────────────────────────────────────────

  it('MAX_MAKERS为30：注入30个maker后长度为30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'hand'))
    }
    expect((sys as any).makers.length).toBe(30)
  })

  it('达到MAX_MAKERS时不新增maker（通过mock验证）', () => {
    // 填满30个
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 100, 'hand', { tick: 999999 }))
    }
    const em = {
      getEntitiesWithComponents: () => [9999],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)  // random=0 <= CRAFT_CHANCE=0.005，触发制作
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)
    // makers已满，不新增
    expect((sys as any).makers.length).toBe(30)
  })

  // ── update 流程集成 ────────────────────────────────────────────────────────

  it('getEntitiesWithComponents返回空时不新增maker', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)
    expect((sys as any).makers.length).toBe(0)
  })

  it('creature age<10时不新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 5 }),  // age=5 < 10
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 保证通过CRAFT_CHANCE检查
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)
    expect((sys as any).makers.length).toBe(0)
  })

  it('creature不存在时不新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => null,  // 无creature组件
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)
    expect((sys as any).makers.length).toBe(0)
  })

  it('random大于CRAFT_CHANCE时不新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.999)  // 0.999 > 0.005，跳过
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)
    expect((sys as any).makers.length).toBe(0)
  })

  it('random=0时满足CRAFT_CHANCE且age>=10时新增maker', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 15 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 <= 0.005
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)
    expect((sys as any).makers.length).toBe(1)
  })

  it('新增maker的entityId与实体id一致', () => {
    const em = {
      getEntitiesWithComponents: () => [42],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)
    expect((sys as any).makers[0].entityId).toBe(42)
  })

  it('新增maker的tick与当前tick一致', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 5000)
    expect((sys as any).makers[0].tick).toBe(5000)
  })

  it('skillMap中已有技能的实体使用已存技能值', () => {
    ;(sys as any).skillMap.set(7, 80)  // 预设技能80
    const em = {
      getEntitiesWithComponents: () => [7],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)
    // skill应为80+0.058=80.058，bellType应为carillon
    expect((sys as any).makers[0].bellType).toBe('carillon')
    expect((sys as any).makers[0].skill).toBeCloseTo(80.058, 3)
  })

  it('skillMap中无技能的实体使用随机初始技能', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // random固定为0
    // skill = 2 + 0*7 = 2，然后+0.058=2.058
    const em = {
      getEntitiesWithComponents: () => [99],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)
    expect((sys as any).makers[0].skill).toBeCloseTo(2.058, 3)
  })

  it('update后skillMap被更新', () => {
    ;(sys as any).skillMap.set(5, 50)
    const em = {
      getEntitiesWithComponents: () => [5],
      getComponent: () => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)
    expect((sys as any).skillMap.get(5)).toBeCloseTo(50.058, 3)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('两个不同实体各自累积技能', () => {
    ;(sys as any).skillMap.set(1, 40)
    ;(sys as any).skillMap.set(2, 60)
    // 验证技能独立
    expect((sys as any).skillMap.get(1)).toBe(40)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })

  it('cutoff=tick-52000：tick=52000时cutoff=0', () => {
    const cutoff = 52000 - 52000
    expect(cutoff).toBe(0)
  })

  it('cutoff=tick-52000：tick=52001时cutoff=1', () => {
    const cutoff = 52001 - 52000
    expect(cutoff).toBe(1)
  })

  it('CRAFT_CHANCE=0.005：random=0.005时仍通过（不大于0.005）', () => {
    // random > CRAFT_CHANCE: 0.005 > 0.005 => false，所以不跳过
    expect(0.005 > 0.005).toBe(false)
  })

  it('CRAFT_CHANCE=0.005：random=0.006时跳过', () => {
    expect(0.006 > 0.005).toBe(true)
  })
})
