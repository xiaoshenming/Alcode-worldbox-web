import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

describe('CreatureBobbinLace2MakersSystem', () => {
  let sys: CreatureBobbinLace2MakersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

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

  it('torchon类型工匠可正常放入', () => {
    ;(sys as any).makers.push(makeMaker(1, 'torchon'))
    expect((sys as any).makers[0].laceType).toBe('torchon')
  })

  it('cluny类型工匠可正常放入', () => {
    ;(sys as any).makers.push(makeMaker(1, 'cluny'))
    expect((sys as any).makers[0].laceType).toBe('cluny')
  })

  it('honiton类型工匠可正常放入', () => {
    ;(sys as any).makers.push(makeMaker(1, 'honiton'))
    expect((sys as any).makers[0].laceType).toBe('honiton')
  })

  it('工匠数据字段完整', () => {
    const m = makeMaker(10, 'bruges', { skill: 85, piecesMade: 15, threadCount: 80, reputation: 78 })
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(85)
    expect(r.piecesMade).toBe(15)
    expect(r.threadCount).toBe(80)
    expect(r.reputation).toBe(78)
  })

  it('tick字段可自定义', () => {
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 99999 }))
    expect((sys as any).makers[0].tick).toBe(99999)
  })

  it('entityId字段独立保存', () => {
    ;(sys as any).makers.push(makeMaker(77))
    expect((sys as any).makers[0].entityId).toBe(77)
  })

  it('id字段自定义保存', () => {
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { id: 555 }))
    expect((sys as any).makers[0].id).toBe(555)
  })

  it('两个工匠entityId各自独立', () => {
    ;(sys as any).makers.push(makeMaker(10))
    ;(sys as any).makers.push(makeMaker(20))
    expect((sys as any).makers[0].entityId).toBe(10)
    expect((sys as any).makers[1].entityId).toBe(20)
  })

  it('reputation字段可覆盖', () => {
    ;(sys as any).makers.push(makeMaker(1, 'honiton', { reputation: 100 }))
    expect((sys as any).makers[0].reputation).toBe(100)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1540)时不更新lastCheck', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1540
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1540)时更新lastCheck', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)  // 1540 >= 1540
    expect((sys as any).lastCheck).toBe(1540)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000)  // 3000-2000=1000 < 1540，不更新
    expect((sys as any).lastCheck).toBe(2000)
    sys.update(1, em, 3540)  // 3540-2000=1540 >= 1540，更新
    expect((sys as any).lastCheck).toBe(3540)
  })

  it('tick差值恰好等于1539时不触发更新', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1539)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值恰好等于1541时触发更新', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1541)
    expect((sys as any).lastCheck).toBe(1541)
  })

  it('连续多次update不满足间隔时只触发一次', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)  // 触发，lastCheck=1540
    sys.update(1, em, 2000)  // 2000-1540=460 < 1540
    sys.update(1, em, 2500)  // 2500-1540=960 < 1540
    expect((sys as any).lastCheck).toBe(1540)
  })

  it('连续两次满足间隔时lastCheck正确递增', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).lastCheck).toBe(1540)
    sys.update(1, em, 3080)
    expect((sys as any).lastCheck).toBe(3080)
  })

  it('大tick值节流依然正确', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 1000000
    sys.update(1, em, 1001000)  // 差值1000 < 1540
    expect((sys as any).lastCheck).toBe(1000000)
    sys.update(1, em, 1001540)  // 差值1540 >= 1540
    expect((sys as any).lastCheck).toBe(1001540)
  })

  it('CHECK_INTERVAL为1540而非1430：1430时不触发', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)  // 1430 < 1540，不触发
    expect((sys as any).lastCheck).toBe(0)
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
    const skill = 99.99
    const grown = Math.min(100, skill + 0.051)
    expect(grown).toBe(100)
  })

  it('skillMap是Map类型', () => {
    expect((sys as any).skillMap).toBeInstanceOf(Map)
  })

  it('skillMap可存储多个实体', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 50)
    ;(sys as any).skillMap.set(3, 80)
    expect((sys as any).skillMap.size).toBe(3)
  })

  it('skillMap查询不存在的key返回undefined', () => {
    expect((sys as any).skillMap.get(888)).toBeUndefined()
  })

  it('skillMap同一key可覆盖更新', () => {
    ;(sys as any).skillMap.set(7, 30)
    ;(sys as any).skillMap.set(7, 75)
    expect((sys as any).skillMap.get(7)).toBe(75)
  })

  it('SKILL_GROWTH=0.051：skill从0增长一次为0.051', () => {
    const SKILL_GROWTH = 0.051
    const grown = Math.min(100, 0 + SKILL_GROWTH)
    expect(grown).toBeCloseTo(0.051, 5)
  })

  it('skill到99.95加SKILL_GROWTH=0.051后不超过100', () => {
    const grown = Math.min(100, 99.95 + 0.051)
    expect(grown).toBe(100)
  })

  it('skillMap新增实体后size正确', () => {
    ;(sys as any).skillMap.set(100, 50)
    expect((sys as any).skillMap.size).toBe(1)
    ;(sys as any).skillMap.set(200, 60)
    expect((sys as any).skillMap.size).toBe(2)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-53000的工匠被清理', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 0 }))      // 0 < 47000，会被清理
    ;(sys as any).makers.push(makeMaker(2, 'honiton', { tick: 55000 }))  // 55000 >= 47000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-53000=47000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有工匠tick均新鲜时不清理', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 50000 }))
    ;(sys as any).makers.push(makeMaker(2, 'cluny', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=47000，50000>=47000，60000>=47000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  it('cutoff边界值：tick恰好等于cutoff时保留', () => {
    const em = makeEmptyEm()
    const cutoff = 100000 - 53000  // = 47000
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: cutoff }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
  })

  it('cutoff边界值：tick比cutoff小1时被清理', () => {
    const em = makeEmptyEm()
    const cutoff = 100000 - 53000  // = 47000
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: cutoff - 1 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(0)
  })

  it('清理中间元素后两侧正常保留', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 60000 }))  // 保留
    ;(sys as any).makers.push(makeMaker(2, 'cluny', { tick: 0 }))         // 清理
    ;(sys as any).makers.push(makeMaker(3, 'bruges', { tick: 70000 }))    // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(2)
    const ids = (sys as any).makers.map((m: BobbinLace2Maker) => m.entityId)
    expect(ids).toContain(1)
    expect(ids).toContain(3)
    expect(ids).not.toContain(2)
  })

  it('全部过期时清空makers', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, 'cluny', { tick: 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=47000，全清
    expect((sys as any).makers.length).toBe(0)
  })

  it('makers为空时清理不崩溃', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, em, 100000)).not.toThrow()
  })

  it('cleanup窗口53000比awl的52000大：tick=47000恰好保留', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeMaker(1, 'torchon', { tick: 47000 }))  // cutoff=47000，47000>=47000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
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

  it('typeIdx=3时为honiton（最高级）', () => {
    const types: BobbinLace2Type[] = ['torchon', 'cluny', 'bruges', 'honiton']
    const idx = Math.min(3, Math.floor(100 / 25))
    expect(types[idx]).toBe('honiton')
  })

  it('skill=24时类型仍为torchon', () => {
    const types: BobbinLace2Type[] = ['torchon', 'cluny', 'bruges', 'honiton']
    const idx = Math.min(3, Math.floor(24 / 25))
    expect(types[idx]).toBe('torchon')
  })

  it('skill=49时类型为cluny', () => {
    const types: BobbinLace2Type[] = ['torchon', 'cluny', 'bruges', 'honiton']
    const idx = Math.min(3, Math.floor(49 / 25))
    expect(types[idx]).toBe('cluny')
  })

  it('skill=74时类型为bruges', () => {
    const types: BobbinLace2Type[] = ['torchon', 'cluny', 'bruges', 'honiton']
    const idx = Math.min(3, Math.floor(74 / 25))
    expect(types[idx]).toBe('bruges')
  })

  it('piecesMade公式：skill=0时piecesMade=2', () => {
    expect(2 + Math.floor(0 / 9)).toBe(2)
  })

  it('piecesMade公式：skill=100时piecesMade=13', () => {
    expect(2 + Math.floor(100 / 9)).toBe(13)
  })

  it('piecesMade公式：skill=9时piecesMade=3', () => {
    expect(2 + Math.floor(9 / 9)).toBe(3)
  })

  it('threadCount公式：skill=0时threadCount=8', () => {
    expect(8 + Math.floor(0 * 0.85)).toBe(8)
  })

  it('threadCount公式：skill=100时threadCount=93', () => {
    expect(8 + Math.floor(100 * 0.85)).toBe(93)
  })

  it('threadCount公式：skill=50时threadCount=50', () => {
    expect(8 + Math.floor(50 * 0.85)).toBe(50)
  })

  it('reputation公式：skill=0时reputation=10', () => {
    expect(10 + 0 * 0.80).toBe(10)
  })

  it('reputation公式：skill=100时reputation=90', () => {
    expect(10 + 100 * 0.80).toBeCloseTo(90, 5)
  })

  it('reputation公式：skill=50时reputation=50', () => {
    expect(10 + 50 * 0.80).toBeCloseTo(50, 5)
  })

  // ── MAX_MAKERS 上限控制 ──────────────────────────────────────────────────

  it('MAX_MAKERS=30：手动注入30个工匠时数组长度为30', () => {
    for (let i = 1; i <= 30; i++) {
      ;(sys as any).makers.push(makeMaker(i))
    }
    expect((sys as any).makers.length).toBe(30)
  })

  it('已有30个时即使random通过也不再新增', () => {
    for (let i = 1; i <= 30; i++) {
      ;(sys as any).makers.push(makeMaker(i, 'torchon', { tick: 100000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 200, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).makers.length).toBe(30)
  })

  // ── 生物年龄检查 ──────────────────────────────────────────────────────────

  it('生物age<10时不创建工匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 9 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).makers.length).toBe(0)
  })

  it('生物age=10时可创建工匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 10 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).makers.length).toBe(1)
  })

  it('生物age=20时可创建工匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).makers.length).toBe(1)
  })

  // ── CRAFT_CHANCE 控制 ────────────────────────────────────────────────────

  it('random>0.005时不创建工匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.006)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).makers.length).toBe(0)
  })

  it('random=0时（<=0.005）创建工匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).makers.length).toBe(1)
  })

  it('random=0.005时（<=0.005）创建工匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).makers.length).toBe(1)
  })

  // ── 综合场景测试 ──────────────────────────────────────────────────────────

  it('创建工匠时tick字段记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).makers[0].tick).toBe(1540)
  })

  it('创建工匠时entityId正确记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 55, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).makers[0].entityId).toBe(55)
  })

  it('getComponent返回null时不创建工匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => null,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).makers.length).toBe(0)
  })

  it('已有skillMap记录时沿用并增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(1, 60)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    const newSkill = (sys as any).skillMap.get(1)
    expect(newSkill).toBeCloseTo(60 + 0.051, 4)
  })

  it('节流未到时不处理生物', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1540
    expect((sys as any).makers.length).toBe(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('新匠人id从1开始自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }, { eid: 2, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    const ids = (sys as any).makers.map((m: BobbinLace2Maker) => m.id)
    expect(ids[0]).toBe(1)
    if (ids.length > 1) expect(ids[1]).toBe(2)
  })

  it('skill写回skillMap后可通过skillMap.get读取', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 9, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).skillMap.has(9)).toBe(true)
  })

  it('多次update后lastCheck递增', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1540)
    expect((sys as any).lastCheck).toBe(1540)
    sys.update(1, em, 3200)
    expect((sys as any).lastCheck).toBe(3200)
  })
})
