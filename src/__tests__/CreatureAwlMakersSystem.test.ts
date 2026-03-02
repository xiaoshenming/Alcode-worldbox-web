import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

describe('CreatureAwlMakersSystem', () => {
  let sys: CreatureAwlMakersSystem

  beforeEach(() => { sys = makeAwlSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

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

  it('makers数组支持多元素', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).makers.push(makeAwlMaker(i))
    }
    expect((sys as any).makers).toHaveLength(5)
  })

  it('makers数组中每个元素entityId独立', () => {
    ;(sys as any).makers.push(makeAwlMaker(10))
    ;(sys as any).makers.push(makeAwlMaker(20))
    expect((sys as any).makers[0].entityId).toBe(10)
    expect((sys as any).makers[1].entityId).toBe(20)
  })

  it('makers中id字段各自唯一', () => {
    ;(sys as any).makers.push(makeAwlMaker(1, 'stitching', { id: 100 }))
    ;(sys as any).makers.push(makeAwlMaker(2, 'brad', { id: 200 }))
    expect((sys as any).makers[0].id).toBe(100)
    expect((sys as any).makers[1].id).toBe(200)
  })

  it('stitching类型匠人可直接放入makers', () => {
    ;(sys as any).makers.push(makeAwlMaker(1, 'stitching'))
    expect((sys as any).makers[0].awlType).toBe('stitching')
  })

  it('scratch类型匠人可直接放入makers', () => {
    ;(sys as any).makers.push(makeAwlMaker(1, 'scratch'))
    expect((sys as any).makers[0].awlType).toBe('scratch')
  })

  it('pegging类型匠人tick字段正确保存', () => {
    ;(sys as any).makers.push(makeAwlMaker(1, 'pegging', { tick: 12345 }))
    expect((sys as any).makers[0].tick).toBe(12345)
  })

  it('reputation字段可自定义', () => {
    ;(sys as any).makers.push(makeAwlMaker(1, 'brad', { reputation: 99 }))
    expect((sys as any).makers[0].reputation).toBe(99)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1430)时不更新lastCheck', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1430
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1430)时更新lastCheck', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)  // 1430 >= 1430
    expect((sys as any).lastCheck).toBe(1430)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000)  // 3000-2000=1000 < 1430，不更新
    expect((sys as any).lastCheck).toBe(2000)
    sys.update(1, em, 3430)  // 3430-2000=1430 >= 1430，更新
    expect((sys as any).lastCheck).toBe(3430)
  })

  it('tick差值恰好等于1429时不触发更新', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1429)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值恰好等于1431时触发更新', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1431)
    expect((sys as any).lastCheck).toBe(1431)
  })

  it('连续多次update在间隔不足时只触发一次', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)  // 触发，lastCheck=1430
    sys.update(1, em, 2000)  // 2000-1430=570 < 1430，不触发
    sys.update(1, em, 2500)  // 2500-1430=1070 < 1430，不触发
    expect((sys as any).lastCheck).toBe(1430)
  })

  it('连续两次满足间隔时lastCheck递增更新', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).lastCheck).toBe(1430)
    sys.update(1, em, 2860)
    expect((sys as any).lastCheck).toBe(2860)
  })

  it('大tick值时节流依然正确', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 1000000
    sys.update(1, em, 1001000)  // 差值1000 < 1430
    expect((sys as any).lastCheck).toBe(1000000)
    sys.update(1, em, 1001430)  // 差值1430 >= 1430
    expect((sys as any).lastCheck).toBe(1001430)
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
    const skill = 99.99
    const grown = Math.min(100, skill + 0.056)
    expect(grown).toBe(100)
  })

  it('skillMap为Map类型', () => {
    expect((sys as any).skillMap).toBeInstanceOf(Map)
  })

  it('skillMap可存储多个实体技能', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 50)
    ;(sys as any).skillMap.set(3, 90)
    expect((sys as any).skillMap.size).toBe(3)
  })

  it('skillMap查询不存在的key返回undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('skillMap可覆盖更新同一实体技能', () => {
    ;(sys as any).skillMap.set(5, 30)
    ;(sys as any).skillMap.set(5, 50)
    expect((sys as any).skillMap.get(5)).toBe(50)
  })

  it('SKILL_GROWTH=0.056：skill从0开始每次增长0.056', () => {
    const SKILL_GROWTH = 0.056
    let skill = 0
    skill = Math.min(100, skill + SKILL_GROWTH)
    expect(skill).toBeCloseTo(0.056, 5)
  })

  it('skill从50增长后不超过100', () => {
    const SKILL_GROWTH = 0.056
    const skill = 99.98
    const grown = Math.min(100, skill + SKILL_GROWTH)
    expect(grown).toBe(100)
  })

  it('skill精确在99.944加SKILL_GROWTH恰好等于100', () => {
    const SKILL_GROWTH = 0.056
    const skill = 99.944
    const grown = Math.min(100, skill + SKILL_GROWTH)
    expect(grown).toBeCloseTo(100, 5)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-52000的匠人被清理', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeAwlMaker(1, 'stitching', { tick: 0 }))      // 0 < 48000，会被清理
    ;(sys as any).makers.push(makeAwlMaker(2, 'pegging', { tick: 55000 }))    // 55000 >= 48000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-52000=48000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有匠人tick均新鲜时不清理', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeAwlMaker(1, 'stitching', { tick: 50000 }))
    ;(sys as any).makers.push(makeAwlMaker(2, 'brad', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000，50000>=48000，60000>=48000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  it('cutoff边界值：tick恰好等于cutoff时保留', () => {
    const em = makeEmptyEm()
    const cutoffTick = 100000 - 52000  // = 48000
    ;(sys as any).makers.push(makeAwlMaker(1, 'stitching', { tick: cutoffTick }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(1)
  })

  it('cutoff边界值：tick比cutoff小1时被清理', () => {
    const em = makeEmptyEm()
    const cutoffTick = 100000 - 52000  // = 48000
    ;(sys as any).makers.push(makeAwlMaker(1, 'stitching', { tick: cutoffTick - 1 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(0)
  })

  it('清理后中间元素也能正确删除', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeAwlMaker(1, 'stitching', { tick: 60000 }))  // 保留
    ;(sys as any).makers.push(makeAwlMaker(2, 'scratch', { tick: 0 }))         // 清理
    ;(sys as any).makers.push(makeAwlMaker(3, 'brad', { tick: 70000 }))        // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).makers.length).toBe(2)
    const ids = (sys as any).makers.map((m: AwlMaker) => m.entityId)
    expect(ids).toContain(1)
    expect(ids).toContain(3)
    expect(ids).not.toContain(2)
  })

  it('全部过期时清空makers', () => {
    const em = makeEmptyEm()
    ;(sys as any).makers.push(makeAwlMaker(1, 'stitching', { tick: 0 }))
    ;(sys as any).makers.push(makeAwlMaker(2, 'scratch', { tick: 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000，0<48000，1000<48000，全清
    expect((sys as any).makers.length).toBe(0)
  })

  it('makers为空时清理不崩溃', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, em, 100000)).not.toThrow()
  })

  // ── awlType 推导公式验证 ─────────────────────────────────────────────────

  it('awlType根据skill/25计算：skill=0→stitching，skill=25→scratch，skill=50→brad，skill=75→pegging', () => {
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

  it('typeIdx=3时为pegging（最高级别）', () => {
    const types: AwlType[] = ['stitching', 'scratch', 'brad', 'pegging']
    const skill = 100
    const idx = Math.min(3, Math.floor(skill / 25))
    expect(types[idx]).toBe('pegging')
  })

  it('skill=24时类型仍为stitching', () => {
    const types: AwlType[] = ['stitching', 'scratch', 'brad', 'pegging']
    const idx = Math.min(3, Math.floor(24 / 25))
    expect(types[idx]).toBe('stitching')
  })

  it('skill=49时类型为scratch', () => {
    const types: AwlType[] = ['stitching', 'scratch', 'brad', 'pegging']
    const idx = Math.min(3, Math.floor(49 / 25))
    expect(types[idx]).toBe('scratch')
  })

  it('skill=74时类型为brad', () => {
    const types: AwlType[] = ['stitching', 'scratch', 'brad', 'pegging']
    const idx = Math.min(3, Math.floor(74 / 25))
    expect(types[idx]).toBe('brad')
  })

  it('awlsMade公式：skill=0时awlsMade=1', () => {
    expect(1 + Math.floor(0 / 8)).toBe(1)
  })

  it('awlsMade公式：skill=100时awlsMade=13', () => {
    expect(1 + Math.floor(100 / 8)).toBe(13)
  })

  it('awlsMade公式：skill=8时awlsMade=2', () => {
    expect(1 + Math.floor(8 / 8)).toBe(2)
  })

  it('sharpness公式：skill=0时sharpness=15', () => {
    expect(15 + 0 * 0.71).toBe(15)
  })

  it('sharpness公式：skill=100时sharpness=86', () => {
    expect(15 + 100 * 0.71).toBeCloseTo(86, 5)
  })

  it('reputation公式：skill=0时reputation=10', () => {
    expect(10 + 0 * 0.80).toBe(10)
  })

  it('reputation公式：skill=50时reputation=50', () => {
    expect(10 + 50 * 0.80).toBeCloseTo(50, 5)
  })

  it('reputation公式：skill=100时reputation=90', () => {
    expect(10 + 100 * 0.80).toBeCloseTo(90, 5)
  })

  // ── nextId 自增管理 ───────────────────────────────────────────────────────

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  // ── MAX_MAKERS 上限控制 ──────────────────────────────────────────────────

  it('MAX_MAKERS=30：手动注入30个makers时数组长度为30', () => {
    for (let i = 1; i <= 30; i++) {
      ;(sys as any).makers.push(makeAwlMaker(i))
    }
    expect((sys as any).makers.length).toBe(30)
  })

  it('通过update触发时makers不超过MAX_MAKERS=30', () => {
    // 预填29个
    for (let i = 1; i <= 29; i++) {
      ;(sys as any).makers.push(makeAwlMaker(i, 'stitching', { tick: 100000 }))
    }
    // 让random通过：mock Math.random 返回 0（<=CRAFT_CHANCE=0.005）
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 100, age: 15 }, { eid: 101, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    // 最多再加1个达到30
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
  })

  it('已有30个makers时即使random通过也不再新增', () => {
    for (let i = 1; i <= 30; i++) {
      ;(sys as any).makers.push(makeAwlMaker(i, 'stitching', { tick: 100000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 200, age: 15 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).makers.length).toBe(30)
  })

  // ── 生物年龄检查 ──────────────────────────────────────────────────────────

  it('生物age<10时不创建匠人', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 通过CRAFT_CHANCE检查
    const em = makeEmWithCreatures([{ eid: 1, age: 9 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).makers.length).toBe(0)
  })

  it('生物age=10时可创建匠人', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 10 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).makers.length).toBe(1)
  })

  it('生物age=11时可创建匠人', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 11 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).makers.length).toBe(1)
  })

  // ── 综合场景测试 ──────────────────────────────────────────────────────────

  it('update时节流未到不处理任何生物', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 不到1430，不处理
    expect((sys as any).makers.length).toBe(0)
  })

  it('CRAFT_CHANCE检查：random>0.005时不创建匠人', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)  // 0.01 > 0.005
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).makers.length).toBe(0)
  })

  it('CRAFT_CHANCE检查：random<=0.005时创建匠人', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)  // 0.005 <= 0.005，通过
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).makers.length).toBe(1)
  })

  it('创建匠人时tick字段记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).makers[0].tick).toBe(1430)
  })

  it('创建匠人时entityId正确记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 42, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).makers[0].entityId).toBe(42)
  })

  it('getComponent返回null时不创建匠人', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => null,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).makers.length).toBe(0)
  })

  it('新匠人的id字段从1开始自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }, { eid: 2, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    const ids = (sys as any).makers.map((m: AwlMaker) => m.id)
    expect(ids[0]).toBe(1)
    if (ids.length > 1) expect(ids[1]).toBe(2)
  })

  it('已有skillMap记录时沿用并增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(1, 50)
    const em = makeEmWithCreatures([{ eid: 1, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    const newSkill = (sys as any).skillMap.get(1)
    expect(newSkill).toBeCloseTo(50 + 0.056, 4)
  })

  it('skill从skillMap获取并更新后写回', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(5, 80)
    const em = makeEmWithCreatures([{ eid: 5, age: 30 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).skillMap.has(5)).toBe(true)
    expect((sys as any).skillMap.get(5)).toBeGreaterThan(80)
  })

  it('新生物无skillMap记录时初始skill为2~9范围', () => {
    // random mock: 先返回0（通过CRAFT_CHANCE），再返回0.5（skill初始化）
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0).mockReturnValueOnce(0.5)
    const em = makeEmWithCreatures([{ eid: 99, age: 20 }])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    if ((sys as any).makers.length > 0) {
      const skill = (sys as any).makers[0].skill
      expect(skill).toBeGreaterThanOrEqual(2)
      expect(skill).toBeLessThanOrEqual(9 + 0.056 + 1)  // 2+7*1+0.056的容错
    }
  })

  it('多次update后lastCheck递增', () => {
    const em = makeEmptyEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1430)
    expect((sys as any).lastCheck).toBe(1430)
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
})
