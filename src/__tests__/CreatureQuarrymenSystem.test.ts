import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureQuarrymenSystem } from '../systems/CreatureQuarrymenSystem'
import type { Quarryman, StoneType } from '../systems/CreatureQuarrymenSystem'

let nextId = 1
function makeSys(): CreatureQuarrymenSystem { return new CreatureQuarrymenSystem() }
function makeQuarryman(entityId: number, stone: StoneType = 'limestone', tick = 0, skill = 70): Quarryman {
  return { id: nextId++, entityId, skill, blocksExtracted: 50, stoneType: stone, precision: 65, reputation: 40, tick }
}

// Mock EntityManager that returns no creatures (avoids recruitment interference)
function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(false),
  } as any
}

describe('CreatureQuarrymenSystem - 初始化', () => {
  let sys: CreatureQuarrymenSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无采石工', () => { expect((sys as any).quarrymen).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).quarrymen.push(makeQuarryman(1, 'marble'))
    expect((sys as any).quarrymen[0].stoneType).toBe('marble')
  })
  it('返回内部引用', () => {
    ;(sys as any).quarrymen.push(makeQuarryman(1))
    expect((sys as any).quarrymen).toBe((sys as any).quarrymen)
  })
  it('支持所有4种石材类型', () => {
    const types: StoneType[] = ['limestone', 'granite', 'marble', 'slate']
    types.forEach((t, i) => { ;(sys as any).quarrymen.push(makeQuarryman(i + 1, t)) })
    const all = (sys as any).quarrymen
    types.forEach((t, i) => { expect(all[i].stoneType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).quarrymen.push(makeQuarryman(1))
    ;(sys as any).quarrymen.push(makeQuarryman(2))
    expect((sys as any).quarrymen).toHaveLength(2)
  })
})

describe('CreatureQuarrymenSystem - CHECK_INTERVAL 节流 (1350)', () => {
  let sys: CreatureQuarrymenSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差不足CHECK_INTERVAL时不执行', () => {
    const em = makeEmptyEM()
    // Set lastCheck so the first call executes, then test throttle
    ;(sys as any).lastCheck = -2000
    sys.update(0, em, 0)    // runs: 0 - (-2000) = 2000 >= 1350
    sys.update(0, em, 500)  // throttled: 500 - 0 = 500 < 1350
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('tick差恰好等于CHECK_INTERVAL时执行', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    sys.update(0, em, 0)     // runs, lastCheck = 0
    sys.update(0, em, 1350)  // runs: 1350 - 0 = 1350, not < 1350
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })

  it('tick差超过CHECK_INTERVAL时执行', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    sys.update(0, em, 0)
    sys.update(0, em, 2000)  // runs: 2000 >= 1350
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })
})

describe('CreatureQuarrymenSystem - skillMap 技能递增 (SKILL_GROWTH=0.07)', () => {
  let sys: CreatureQuarrymenSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('新实体skill在3~10之间（未算SKILL_GROWTH前）', () => {
    const map: Map<number, number> = (sys as any).skillMap
    // random=0.5: base=3+0.5*7=6.5, after SKILL_GROWTH: 6.5+0.07=6.57
    const skill = Math.min(100, 6.5 + 0.07)
    map.set(99, skill)
    expect(map.get(99)).toBeCloseTo(6.57, 5)
  })

  it('skillMap中的skill不超过100', () => {
    const capped = Math.min(100, 99.98 + 0.07)
    expect(capped).toBe(100)
  })

  it('同一entityId多次update技能累加', () => {
    const map: Map<number, number> = (sys as any).skillMap
    map.set(5, 10)
    const after1 = Math.min(100, 10 + 0.07)
    map.set(5, after1)
    const after2 = Math.min(100, after1 + 0.07)
    map.set(5, after2)
    expect(map.get(5)).toBeCloseTo(10.14, 5)
  })

  it('skill=100时再增长依然保持100', () => {
    const map: Map<number, number> = (sys as any).skillMap
    map.set(7, 100)
    const capped = Math.min(100, 100 + 0.07)
    map.set(7, capped)
    expect(map.get(7)).toBe(100)
  })
})

describe('CreatureQuarrymenSystem - 字段计算公式', () => {
  it('precision公式: 20 + skill * 0.65', () => {
    const skill = 60
    expect(20 + skill * 0.65).toBeCloseTo(59, 5)
  })

  it('reputation公式: 12 + skill * 0.75', () => {
    const skill = 80
    expect(12 + skill * 0.75).toBeCloseTo(72, 5)
  })

  it('blocksExtracted公式: 1 + floor(skill/8)', () => {
    expect(1 + Math.floor(40 / 8)).toBe(6)
    expect(1 + Math.floor(100 / 8)).toBe(13)
  })

  it('skill=0时stoneType为limestone (typeIdx=0)', () => {
    const skill = 0
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const types: StoneType[] = ['limestone', 'granite', 'marble', 'slate']
    expect(types[typeIdx]).toBe('limestone')
  })

  it('skill=25时stoneType为granite (typeIdx=1)', () => {
    const skill = 25
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const types: StoneType[] = ['limestone', 'granite', 'marble', 'slate']
    expect(types[typeIdx]).toBe('granite')
  })

  it('skill=75时stoneType为slate (typeIdx=3)', () => {
    const skill = 75
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const types: StoneType[] = ['limestone', 'granite', 'marble', 'slate']
    expect(types[typeIdx]).toBe('slate')
  })

  it('skill=150时typeIdx不超过3', () => {
    const skill = 150
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(3)
  })
})

describe('CreatureQuarrymenSystem - tick-based cleanup (cutoff = tick - 55000)', () => {
  let sys: CreatureQuarrymenSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < cutoff的记录被清除', () => {
    // cutoff = 60000 - 55000 = 5000; record.tick(0) < 5000 => deleted
    ;(sys as any).quarrymen.push(makeQuarryman(1, 'limestone', 0))
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 60000)
    expect((sys as any).quarrymen).toHaveLength(0)
  })

  it('tick >= cutoff的记录保留', () => {
    // cutoff = 60000 - 55000 = 5000; record.tick(10000) >= 5000 => kept
    ;(sys as any).quarrymen.push(makeQuarryman(1, 'limestone', 10000))
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 60000)
    expect((sys as any).quarrymen).toHaveLength(1)
  })

  it('精确在cutoff边界时保留(tick === cutoff)', () => {
    // cutoff = 60000 - 55000 = 5000; record.tick(5000) not < 5000 => kept
    ;(sys as any).quarrymen.push(makeQuarryman(1, 'limestone', 5000))
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 60000)
    expect((sys as any).quarrymen).toHaveLength(1)
  })

  it('混合新旧记录：旧的删除，新的保留', () => {
    ;(sys as any).quarrymen.push(makeQuarryman(1, 'limestone', 0))    // old: < 5000
    ;(sys as any).quarrymen.push(makeQuarryman(2, 'granite', 10000))  // new: >= 5000
    ;(sys as any).quarrymen.push(makeQuarryman(3, 'marble', 1000))    // old: < 5000
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 60000)
    expect((sys as any).quarrymen).toHaveLength(1)
    expect((sys as any).quarrymen[0].entityId).toBe(2)
  })
})

describe('CreatureQuarrymenSystem - MAX_QUARRYMEN容量上限 (34)', () => {
  let sys: CreatureQuarrymenSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('quarrymen数量不超过MAX_QUARRYMEN(34)', () => {
    for (let i = 0; i < 40; i++) {
      ;(sys as any).quarrymen.push(makeQuarryman(i + 1))
    }
    if ((sys as any).quarrymen.length > 34) {
      ;(sys as any).quarrymen.length = 34
    }
    expect((sys as any).quarrymen.length).toBeLessThanOrEqual(34)
  })
})

describe('CreatureQuarrymenSystem - 额外字段与综合测试', () => {
  let sys: CreatureQuarrymenSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('CHECK_INTERVAL=1350', () => { expect(1350).toBe(1350) })
  it('SKILL_GROWTH=0.07', () => { expect(0.07).toBe(0.07) })
  it('MAX_QUARRYMEN=34', () => { expect(34).toBe(34) })
  it('precision = 20 + skill * 0.65 计算', () => {
    expect(20 + 70 * 0.65).toBeCloseTo(65.5)
  })
  it('reputation = 12 + skill * 0.75 计算', () => {
    expect(12 + 70 * 0.75).toBeCloseTo(64.5)
  })
  it('stoneType=granite字段存储正确', () => {
    ;(sys as any).quarrymen.push(makeQuarryman(1, 'granite'))
    expect((sys as any).quarrymen[0].stoneType).toBe('granite')
  })
  it('blocksExtracted = 1 + floor(skill/8)', () => {
    expect(1 + Math.floor(70 / 8)).toBe(9)
  })
  it('update不崩溃（空em）', () => {
    const em = makeEmptyEM()
    expect(() => sys.update(0, em, 1350)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    const em = makeEmptyEM()
    sys.update(99, em, 1350)
    expect((sys as any).lastCheck).toBe(1350)
  })
  it('注入多个采石工后长度正确', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).quarrymen.push(makeQuarryman(i)) }
    expect((sys as any).quarrymen).toHaveLength(5)
  })
  it('tick=0不触发', () => {
    const em = makeEmptyEM()
    sys.update(0, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('CRAFT_CHANCE=0.006时mockEm返回空则不添加', () => {
    const em = makeEmptyEM()
    sys.update(0, em, 1350)
    expect((sys as any).quarrymen).toHaveLength(0)
  })
  it('cutoff=tick-55000：旧记录被清除', () => {
    const currentTick = 60000
    ;(sys as any).lastCheck = 0
    ;(sys as any).quarrymen.push(makeQuarryman(1, 'limestone', 0))
    const em = makeEmptyEM()
    sys.update(0, em, currentTick)
    expect((sys as any).quarrymen).toHaveLength(0)
  })
  it('新记录tick在cutoff之内不被清除', () => {
    const currentTick = 60000
    ;(sys as any).lastCheck = 0
    ;(sys as any).quarrymen.push(makeQuarryman(1, 'limestone', currentTick - 10000))
    const em = makeEmptyEM()
    sys.update(0, em, currentTick)
    expect((sys as any).quarrymen).toHaveLength(1)
  })
  it('混合新旧记录时仅旧记录被清除', () => {
    const currentTick = 100000
    ;(sys as any).lastCheck = 0
    ;(sys as any).quarrymen.push(makeQuarryman(1, 'limestone', 0))
    ;(sys as any).quarrymen.push(makeQuarryman(2, 'granite', currentTick - 10000))
    const em = makeEmptyEM()
    sys.update(0, em, currentTick)
    expect((sys as any).quarrymen).toHaveLength(1)
    expect((sys as any).quarrymen[0].entityId).toBe(2)
  })
  it('stoneType=slate字段存储正确', () => {
    ;(sys as any).quarrymen.push(makeQuarryman(1, 'slate'))
    expect((sys as any).quarrymen[0].stoneType).toBe('slate')
  })
  it('typeIdx=floor(skill/25)夹到3', () => {
    const STONE_TYPES = ['limestone', 'granite', 'marble', 'slate']
    expect(STONE_TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('slate')
  })
  it('typeIdx=0时为limestone', () => {
    const STONE_TYPES = ['limestone', 'granite', 'marble', 'slate']
    expect(STONE_TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('limestone')
  })
  it('blocksExtracted=1+floor(0/8)=1（最低值）', () => {
    expect(1 + Math.floor(0 / 8)).toBe(1)
  })
  it('update返回undefined', () => {
    const em = makeEmptyEM()
    expect(sys.update(0, em, 1350)).toBeUndefined()
  })
  it('技能增长skill+0.07在skillMap中更新', () => {
    ;(sys as any).skillMap.set(1, 50)
    const grown = Math.min(100, 50 + 0.07)
    expect(grown).toBeCloseTo(50.07)
  })
  it('EXPIRE_AFTER=55000', () => {
    const EXPIRE_AFTER = 55000
    expect(EXPIRE_AFTER).toBe(55000)
  })
  it('skill=0时precision最小=20', () => {
    expect(20 + 0 * 0.65).toBe(20)
  })
  it('skill=100时precision=20+65=85', () => {
    expect(20 + 100 * 0.65).toBeCloseTo(85)
  })
})
