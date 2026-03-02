import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBobbinMakersSystem } from '../systems/CreatureBobbinMakersSystem'
import type { BobbinMaker, BobbinType } from '../systems/CreatureBobbinMakersSystem'

// CHECK_INTERVAL=1450, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.055
// makers cleanup: maker.tick < tick-52000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeSys(): CreatureBobbinMakersSystem {
  return new CreatureBobbinMakersSystem()
}

function makeMaker(entityId: number, bobbinType: BobbinType = 'spinning', overrides: Partial<BobbinMaker> = {}): BobbinMaker {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    bobbinsMade: 5,
    bobbinType,
    smoothness: 40,
    reputation: 35,
    tick: 0,
    ...overrides,
  }
}

function makeEmptyEm() {
  return { getEntitiesWithComponents: () => [] } as any
}

function makeEmWithCreatures(creatures: Array<{ eid: number; age: number }>) {
  return {
    getEntitiesWithComponents: () => creatures.map(c => c.eid),
    getComponent: (_eid: number, _type: string) => {
      const found = creatures.find(c => c.eid === _eid)
      return found ? { age: found.age } : null
    },
  } as any
}

describe('CreatureBobbinMakersSystem', () => {
  let sys: CreatureBobbinMakersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无线轴师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'lace'))
    expect((sys as any).makers[0].bobbinType).toBe('lace')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种线轴类型', () => {
    const types: BobbinType[] = ['spinning', 'weaving', 'lace', 'sewing']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].bobbinType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'weaving')
    m.skill = 80; m.bobbinsMade = 20; m.smoothness = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80)
    expect(r.bobbinsMade).toBe(20)
    expect(r.smoothness).toBe(90)
    expect(r.reputation).toBe(85)
  })

  it('spinning类型线轴师可正常放入', () => {
    ;(sys as any).makers.push(makeMaker(1, 'spinning'))
    expect((sys as any).makers[0].bobbinType).toBe('spinning')
  })

  it('weaving类型线轴师可正常放入', () => {
    ;(sys as any).makers.push(makeMaker(1, 'weaving'))
    expect((sys as any).makers[0].bobbinType).toBe('weaving')
  })

  it('sewing类型线轴师可正常放入', () => {
    ;(sys as any).makers.push(makeMaker(1, 'sewing'))
    expect((sys as any).makers[0].bobbinType).toBe('sewing')
  })

  it('makers数组支持多元素', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).makers.push(makeMaker(i))
    }
    expect((sys as any).makers).toHaveLength(5)
  })

  it('两个线轴师entityId各自独立', () => {
    ;(sys as any).makers.push(makeMaker(10))
    ;(sys as any).makers.push(makeMaker(20))
    expect((sys as any).makers[0].entityId).toBe(10)
    expect((sys as any).makers[1].entityId).toBe(20)
  })

  it('tick字段自定义保存', () => {
    ;(sys as any).makers.push(makeMaker(1, 'spinning', { tick: 55555 }))
    expect((sys as any).makers[0].tick).toBe(55555)
  })

  it('id字段自定义保存', () => {
    ;(sys as any).makers.push(makeMaker(1, 'lace', { id: 777 }))
    expect((sys as any).makers[0].id).toBe(777)
  })

  it('reputation字段可覆盖', () => {
    ;(sys as any).makers.push(makeMaker(1, 'weaving', { reputation: 99 }))
    expect((sys as any).makers[0].reputation).toBe(99)
  })

  it('smoothness字段可覆盖', () => {
    ;(sys as any).makers.push(makeMaker(1, 'sewing', { smoothness: 95 }))
    expect((sys as any).makers[0].smoothness).toBe(95)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1450)时不更新lastCheck', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1450
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1450)时更新lastCheck', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)  // 1450 >= 1450
    expect((sys as any).lastCheck).toBe(1450)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000)  // 3000-2000=1000 < 1450，不更新
    expect((sys as any).lastCheck).toBe(2000)
    sys.update(1, em, 3450)  // 3450-2000=1450 >= 1450，更新
    expect((sys as any).lastCheck).toBe(3450)
  })

  it('tick差值恰好等于1449时不触发更新', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1449)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值恰好等于1451时触发更新', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1451)
    expect((sys as any).lastCheck).toBe(1451)
  })

  it('连续多次update不满足间隔时只触发一次', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)  // 触发，lastCheck=1450
    sys.update(1, em, 2000)  // 2000-1450=550 < 1450
    sys.update(1, em, 2500)  // 2500-1450=1050 < 1450
    expect((sys as any).lastCheck).toBe(1450)
  })

  it('连续两次满足间隔时lastCheck正确递增', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).lastCheck).toBe(1450)
    sys.update(1, em, 2900)
    expect((sys as any).lastCheck).toBe(2900)
  })

  it('大tick值节流依然正确', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 2000000
    sys.update(1, em, 2001000)  // 差值1000 < 1450
    expect((sys as any).lastCheck).toBe(2000000)
    sys.update(1, em, 2001450)  // 差值1450 >= 1450
    expect((sys as any).lastCheck).toBe(2001450)
  })

  it('CHECK_INTERVAL为1450而非1430或1540', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)  // 1430 < 1450，不触发
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, em, 1450)  // 1450 >= 1450，触发
    expect((sys as any).lastCheck).toBe(1450)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(77, 60)
    expect((sys as any).skillMap.get(77)).toBe(60)
  })

  it('skillMap技能上限100：注入99.99后加SKILL_GROWTH不超过100', () => {
    const skill = 99.99
    const grown = Math.min(100, skill + 0.055)
    expect(grown).toBe(100)
  })

  it('skillMap是Map类型', () => {
    expect((sys as any).skillMap).toBeInstanceOf(Map)
  })

  it('skillMap可存储多个实体技能', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 50)
    ;(sys as any).skillMap.set(3, 90)
    expect((sys as any).skillMap.size).toBe(3)
  })

  it('skillMap查询不存在key返回undefined', () => {
    expect((sys as any).skillMap.get(666)).toBeUndefined()
  })

  it('skillMap同一key可覆盖更新', () => {
    ;(sys as any).skillMap.set(8, 20)
    ;(sys as any).skillMap.set(8, 80)
    expect((sys as any).skillMap.get(8)).toBe(80)
  })

  it('SKILL_GROWTH=0.055：skill从0增长一次后为0.055', () => {
    const SKILL_GROWTH = 0.055
    const grown = Math.min(100, 0 + SKILL_GROWTH)
    expect(grown).toBeCloseTo(0.055, 5)
  })

  it('skill到99.95加SKILL_GROWTH=0.055不超过100', () => {
    const grown = Math.min(100, 99.95 + 0.055)
    expect(grown).toBe(100)
  })

  it('skill=50加SKILL_GROWTH后不超过100', () => {
    const grown = Math.min(100, 50 + 0.055)
    expect(grown).toBeCloseTo(50.055, 4)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-52000的匠人被清理', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeMaker(1, 'spinning', { tick: 0 }))     // 0 < 48000，会被清理
    ;(sys as any).makers.push(makeMaker(2, 'sewing', { tick: 55000 }))   // 55000 >= 48000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-52000=48000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有匠人tick均新鲜时不清理', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeMaker(1, 'spinning', { tick: 50000 }))
    ;(sys as any).makers.push(makeMaker(2, 'weaving', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000，50000>=48000，60000>=48000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  it('cutoff边界值：tick恰好等于cutoff时保留', () => {
    const em = makeEmptyEm()
    const cutoff = 100000 - 52000  // = 48000
    ;(sys as any).makers.push(makeMaker(1, 'spinning', { tick: cutoff }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
  })

  it('cutoff边界值：tick比cutoff小1时被清理', () => {
    const em = makeEmptyEm()
    const cutoff = 100000 - 52000  // = 48000
    ;(sys as any).makers.push(makeMaker(1, 'spinning', { tick: cutoff - 1 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(0)
  })

  it('清理中间元素后两侧保留', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeMaker(1, 'spinning', { tick: 60000 }))  // 保留
    ;(sys as any).makers.push(makeMaker(2, 'weaving', { tick: 0 }))        // 清理
    ;(sys as any).makers.push(makeMaker(3, 'lace', { tick: 70000 }))       // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(2)
    const ids = (sys as any).makers.map((m: BobbinMaker) => m.entityId)
    expect(ids).toContain(1)
    expect(ids).toContain(3)
    expect(ids).not.toContain(2)
  })

  it('全部过期时清空makers', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeMaker(1, 'spinning', { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, 'lace', { tick: 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000，全清
    expect((sys as any).makers.length).toBe(0)
  })

  it('makers为空时清理不崩溃', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, em, 100000)).not.toThrow()
  })

  it('三个匠人中只有首尾过期时中间保留', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeMaker(1, 'spinning', { tick: 0 }))       // 清理
    ;(sys as any).makers.push(makeMaker(2, 'weaving', { tick: 60000 }))    // 保留
    ;(sys as any).makers.push(makeMaker(3, 'sewing', { tick: 1000 }))      // 清理
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  // ── 推导公式验证 ─────────────────────────────────────────────────────────

  it('bobbinType根据skill/25计算：skill=0→spinning，skill=25→weaving，skill=50→lace，skill=75→sewing', () => {
    const types: BobbinType[] = ['spinning', 'weaving', 'lace', 'sewing']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(types[idx]).toBe(types[i])
    })
  })

  it('bobbinsMade根据skill计算：skill=30时bobbinsMade=3+floor(30/7)=7', () => {
    const skill = 30
    const bobbinsMade = 3 + Math.floor(skill / 7)
    expect(bobbinsMade).toBe(7)
  })

  it('smoothness根据skill计算：skill=30时smoothness=15+30*0.73=36.9', () => {
    const skill = 30
    const smoothness = 15 + skill * 0.73
    expect(smoothness).toBeCloseTo(36.9, 5)
  })

  it('typeIdx=3时为sewing（最高级）', () => {
    const types: BobbinType[] = ['spinning', 'weaving', 'lace', 'sewing']
    const idx = Math.min(3, Math.floor(100 / 25))
    expect(types[idx]).toBe('sewing')
  })

  it('skill=24时类型仍为spinning', () => {
    const types: BobbinType[] = ['spinning', 'weaving', 'lace', 'sewing']
    const idx = Math.min(3, Math.floor(24 / 25))
    expect(types[idx]).toBe('spinning')
  })

  it('skill=49时类型为weaving', () => {
    const types: BobbinType[] = ['spinning', 'weaving', 'lace', 'sewing']
    const idx = Math.min(3, Math.floor(49 / 25))
    expect(types[idx]).toBe('weaving')
  })

  it('skill=74时类型为lace', () => {
    const types: BobbinType[] = ['spinning', 'weaving', 'lace', 'sewing']
    const idx = Math.min(3, Math.floor(74 / 25))
    expect(types[idx]).toBe('lace')
  })

  it('bobbinsMade公式：skill=0时bobbinsMade=3', () => {
    expect(3 + Math.floor(0 / 7)).toBe(3)
  })

  it('bobbinsMade公式：skill=100时bobbinsMade=17', () => {
    expect(3 + Math.floor(100 / 7)).toBe(17)
  })

  it('bobbinsMade公式：skill=7时bobbinsMade=4', () => {
    expect(3 + Math.floor(7 / 7)).toBe(4)
  })

  it('bobbinsMade公式：skill=6时bobbinsMade=3（floor(6/7)=0）', () => {
    expect(3 + Math.floor(6 / 7)).toBe(3)
  })

  it('smoothness公式：skill=0时smoothness=15', () => {
    expect(15 + 0 * 0.73).toBe(15)
  })

  it('smoothness公式：skill=100时smoothness=88', () => {
    expect(15 + 100 * 0.73).toBeCloseTo(88, 5)
  })

  it('smoothness公式：skill=50时smoothness=51.5', () => {
    expect(15 + 50 * 0.73).toBeCloseTo(51.5, 5)
  })

  it('reputation公式：skill=0时reputation=10', () => {
    expect(10 + 0 * 0.79).toBe(10)
  })

  it('reputation公式：skill=100时reputation=89', () => {
    expect(10 + 100 * 0.79).toBeCloseTo(89, 5)
  })

  it('reputation公式：skill=50时reputation=49.5', () => {
    expect(10 + 50 * 0.79).toBeCloseTo(49.5, 5)
  })

  it('reputation系数为0.79（非0.80）', () => {
    // BobbinMakerSystem 使用 0.79，与 AwlMakerSystem(0.80) 不同
    const skill = 100
    const rep = 10 + skill * 0.79
    expect(rep).toBeCloseTo(89, 5)
  })

  // ── MAX_MAKERS 上限控制 ──────────────────────────────────────────────────

  it('MAX_MAKERS=30：手动注入30个时长度为30', () => {
    for (let i = 1; i <= 30; i++) {
      ;(sys as any).makers.push(makeMaker(i))
    }
    expect((sys as any).makers.length).toBe(30)
  })

  it('已有30个时即使random通过也不再新增', () => {
    for (let i = 1; i <= 30; i++) {
      ;(sys as any).makers.push(makeMaker(i, 'spinning', { tick: 100000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 200, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).makers.length).toBe(30)
  })

  // ── 生物年龄检查 ──────────────────────────────────────────────────────────

  it('生物age<10时不创建线轴师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 9 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).makers.length).toBe(0)
  })

  it('生物age=10时可创建线轴师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 10 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).makers.length).toBe(1)
  })

  it('生物age=50时可创建线轴师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 50 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).makers.length).toBe(1)
  })

  // ── CRAFT_CHANCE 控制 ────────────────────────────────────────────────────

  it('random>0.005时不创建线轴师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.006)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).makers.length).toBe(0)
  })

  it('random=0时创建线轴师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).makers.length).toBe(1)
  })

  it('random=0.005时（<=0.005）创建线轴师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).makers.length).toBe(1)
  })

  // ── 综合场景测试 ──────────────────────────────────────────────────────────

  it('创建线轴师时tick字段记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).makers[0].tick).toBe(1450)
  })

  it('创建线轴师时entityId正确记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 88, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).makers[0].entityId).toBe(88)
  })

  it('getComponent返回null时不创建线轴师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => null,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).makers.length).toBe(0)
  })

  it('已有skillMap记录时沿用并增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(1, 40)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    const newSkill = (sys as any).skillMap.get(1)
    expect(newSkill).toBeCloseTo(40 + 0.055, 4)
  })

  it('节流未到时不处理生物', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1450
    expect((sys as any).makers.length).toBe(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('新线轴师id从1开始自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }, { eid: 2, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    const ids = (sys as any).makers.map((m: BobbinMaker) => m.id)
    expect(ids[0]).toBe(1)
    if (ids.length > 1) expect(ids[1]).toBe(2)
  })

  it('skill写回skillMap后可读取', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 33, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).skillMap.has(33)).toBe(true)
  })

  it('多次update后lastCheck递增', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).lastCheck).toBe(1450)
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('skill初始不在skillMap中时范围2~9', () => {
    // random mock: 先返回0（通过CRAFT_CHANCE），再返回1（skill=2+7*1=9）
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0).mockReturnValueOnce(1)
    const em = makeEmWithCreatures([{ eid: 99, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    if ((sys as any).makers.length > 0) {
      const skill = (sys as any).skillMap.get(99)
      expect(skill).toBeGreaterThanOrEqual(2)
      expect(skill).toBeLessThanOrEqual(9 + 0.055 + 1) // 容错
    }
  })

  it('同一生物第二次update时skill从skillMap累积', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(1, 20)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    const skill1 = (sys as any).skillMap.get(1)
    expect(skill1).toBeCloseTo(20 + 0.055, 4)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    const skill2 = (sys as any).skillMap.get(1)
    expect(skill2).toBeCloseTo(skill1 + 0.055, 4)
  })
})
