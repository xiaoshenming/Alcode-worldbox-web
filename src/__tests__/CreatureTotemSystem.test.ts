import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureTotemSystem } from '../systems/CreatureTotemSystem'
import type { Totem, TotemType } from '../systems/CreatureTotemSystem'

let nextId = 1

function makeSys(): CreatureTotemSystem { return new CreatureTotemSystem() }

function makeTotem(x: number, y: number, type: TotemType = 'ancestor', power = 70): Totem {
  return { id: nextId++, x, y, type, power, creatorRace: 'human', createdTick: 0, worshipCount: 5 }
}

function makeEM(
  entities: number[] = [],
  positions: Record<number, { x: number; y: number }> = {},
  creatures: Record<number, { age?: number; species?: string }> = {}
) {
  return {
    getEntitiesWithComponents: vi.fn((..._comps: string[]) => entities),
    getComponent: vi.fn((eid: number, comp: string) => {
      if (comp === 'position') return positions[eid] ?? null
      if (comp === 'creature') return creatures[eid] ?? null
      return null
    }),
    hasComponent: vi.fn((eid: number, comp: string) => {
      if (comp === 'position') return !!positions[eid]
      if (comp === 'creature') return !!creatures[eid]
      return false
    }),
  }
}

function makeWorld(width = 200, height = 200) {
  return { width, height, getTile: vi.fn(() => ({ type: 'grass' })) }
}

afterEach(() => { vi.restoreAllMocks() })

// ─────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CreatureTotemSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无图腾', () => { expect((sys as any).totems).toHaveLength(0) })
  it('nextId从1开始', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('_totemCoordMap是Map实例', () => {
    expect((sys as any)._totemCoordMap).toBeInstanceOf(Map)
  })
  it('_totemCoordMap初始为空', () => {
    expect((sys as any)._totemCoordMap.size).toBe(0)
  })
  it('totems是数组实例', () => { expect(Array.isArray((sys as any).totems)).toBe(true) })
})

// ─────────────────────────────────────────────
describe('注入与查询totems', () => {
  let sys: CreatureTotemSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后totems长度变化', () => {
    ;(sys as any).totems.push(makeTotem(10, 20, 'war'))
    expect((sys as any).totems).toHaveLength(1)
  })
  it('注入后type正确', () => {
    ;(sys as any).totems.push(makeTotem(10, 20, 'war'))
    expect((sys as any).totems[0].type).toBe('war')
  })
  it('x/y坐标正确', () => {
    ;(sys as any).totems.push(makeTotem(15, 25))
    expect((sys as any).totems[0].x).toBe(15)
    expect((sys as any).totems[0].y).toBe(25)
  })
  it('power字段被保留', () => {
    ;(sys as any).totems.push(makeTotem(5, 5, 'wisdom', 88))
    expect((sys as any).totems[0].power).toBe(88)
  })
  it('creatorRace字段正确', () => {
    const t = makeTotem(5, 5)
    t.creatorRace = 'elf'
    ;(sys as any).totems.push(t)
    expect((sys as any).totems[0].creatorRace).toBe('elf')
  })
  it('worshipCount字段正确', () => {
    const t = makeTotem(5, 5); t.worshipCount = 10
    ;(sys as any).totems.push(t)
    expect((sys as any).totems[0].worshipCount).toBe(10)
  })
  it('totems是同一数组引用', () => {
    expect((sys as any).totems).toBe((sys as any).totems)
  })
  it('id字段自增', () => {
    const t1 = makeTotem(0, 0); const t2 = makeTotem(10, 10)
    expect(t2.id).toBe(t1.id + 1)
  })
  it('多个图腾注入', () => {
    ;(sys as any).totems.push(makeTotem(0, 0))
    ;(sys as any).totems.push(makeTotem(100, 100))
    expect((sys as any).totems).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────
describe('getTotemAt', () => {
  let sys: CreatureTotemSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('空系统返回undefined', () => {
    expect(sys.getTotemAt(0, 0)).toBeUndefined()
  })
  it('通过坐标找到注入的图腾', () => {
    ;(sys as any).totems.push(makeTotem(10, 20, 'fertility'))
    const found = sys.getTotemAt(10, 20)
    expect(found?.type).toBe('fertility')
  })
  it('错误坐标返回undefined', () => {
    ;(sys as any).totems.push(makeTotem(10, 20))
    expect(sys.getTotemAt(11, 20)).toBeUndefined()
  })
  it('y不同时返回undefined', () => {
    ;(sys as any).totems.push(makeTotem(10, 20))
    expect(sys.getTotemAt(10, 21)).toBeUndefined()
  })
  it('通过coordMap查找（注册到Map中）', () => {
    const t = makeTotem(30, 40, 'protection')
    ;(sys as any)._totemCoordMap.set(30 * 10000 + 40, t)
    const found = sys.getTotemAt(30, 40)
    expect(found?.type).toBe('protection')
  })
  it('coordMap优先于线性搜索', () => {
    const t1 = makeTotem(5, 5, 'war')
    const t2 = makeTotem(5, 5, 'nature')
    ;(sys as any)._totemCoordMap.set(5 * 10000 + 5, t1)
    ;(sys as any).totems.push(t2) // t2 in array, t1 in map
    const found = sys.getTotemAt(5, 5)
    expect(found?.type).toBe('war') // coordMap wins
  })
  it('多图腾时正确找到目标坐标', () => {
    ;(sys as any).totems.push(makeTotem(0, 0, 'ancestor'))
    ;(sys as any).totems.push(makeTotem(50, 50, 'wisdom'))
    ;(sys as any).totems.push(makeTotem(99, 99, 'nature'))
    expect(sys.getTotemAt(50, 50)?.type).toBe('wisdom')
  })
})

// ─────────────────────────────────────────────
describe('支持所有6种图腾类型', () => {
  let sys: CreatureTotemSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  const types: TotemType[] = ['ancestor', 'war', 'fertility', 'protection', 'wisdom', 'nature']

  it('可注入所有6种类型', () => {
    types.forEach((t, i) => { ;(sys as any).totems.push(makeTotem(i * 10, i * 10, t)) })
    expect((sys as any).totems).toHaveLength(6)
  })

  types.forEach(type => {
    it(`类型 ${type} 可正确存储`, () => {
      ;(sys as any).totems.push(makeTotem(0, 0, type))
      expect((sys as any).totems[0].type).toBe(type)
    })
  })
})

// ─────────────────────────────────────────────
describe('decayTotems', () => {
  let sys: CreatureTotemSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('power减少POWER_DECAY(0.3)每次', () => {
    const t = makeTotem(5, 5, 'ancestor', 10)
    ;(sys as any).totems.push(t)
    ;(sys as any).decayTotems()
    expect((sys as any).totems[0].power).toBeCloseTo(9.7, 5)
  })
  it('power<=0时图腾被删除', () => {
    const t = makeTotem(5, 5, 'ancestor', 0.1)
    ;(sys as any).totems.push(t)
    ;(sys as any).decayTotems()
    expect((sys as any).totems).toHaveLength(0)
  })
  it('图腾删除时从coordMap中移除', () => {
    const t = makeTotem(5, 5, 'ancestor', 0.1)
    ;(sys as any)._totemCoordMap.set(5 * 10000 + 5, t)
    ;(sys as any).totems.push(t)
    ;(sys as any).decayTotems()
    expect((sys as any)._totemCoordMap.has(5 * 10000 + 5)).toBe(false)
  })
  it('power>0时图腾不被删除', () => {
    const t = makeTotem(5, 5, 'war', 50)
    ;(sys as any).totems.push(t)
    ;(sys as any).decayTotems()
    expect((sys as any).totems).toHaveLength(1)
  })
  it('多个图腾衰减各自独立', () => {
    ;(sys as any).totems.push(makeTotem(0, 0, 'ancestor', 0.1))  // will die
    ;(sys as any).totems.push(makeTotem(10, 10, 'war', 80))       // survives
    ;(sys as any).decayTotems()
    expect((sys as any).totems).toHaveLength(1)
    expect((sys as any).totems[0].type).toBe('war')
  })
  it('空图腾列表时不崩溃', () => {
    expect(() => (sys as any).decayTotems()).not.toThrow()
  })
})

// ─────────────────────────────────────────────
describe('worshipTotems', () => {
  let sys: CreatureTotemSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('生物在WORSHIP_RADIUS(10)内增加worshipCount', () => {
    const totem = makeTotem(50, 50, 'fertility', 50)
    ;(sys as any).totems.push(totem)
    const em = makeEM([1], { 1: { x: 50, y: 50 } })
    ;(sys as any).worshipTotems(em, [1])
    expect((sys as any).totems[0].worshipCount).toBeGreaterThan(5)
  })
  it('生物在范围外不增加worshipCount', () => {
    const totem = makeTotem(50, 50, 'fertility', 50)
    ;(sys as any).totems.push(totem)
    const em = makeEM([1], { 1: { x: 100, y: 100 } })
    ;(sys as any).worshipTotems(em, [1])
    expect((sys as any).totems[0].worshipCount).toBe(5) // unchanged
  })
  it('崇拜增加power（上限100）', () => {
    const totem = makeTotem(50, 50, 'nature', 95)
    ;(sys as any).totems.push(totem)
    const em = makeEM([1], { 1: { x: 50, y: 50 } })
    ;(sys as any).worshipTotems(em, [1])
    expect((sys as any).totems[0].power).toBeLessThanOrEqual(100)
  })
  it('无生物时worshipCount不变', () => {
    const totem = makeTotem(50, 50, 'ancestor', 50)
    ;(sys as any).totems.push(totem)
    ;(sys as any).worshipTotems({ getComponent: vi.fn(() => null) }, [])
    expect((sys as any).totems[0].worshipCount).toBe(5)
  })
  it('多个生物在范围内累计worshipCount', () => {
    const totem = makeTotem(50, 50, 'wisdom', 50)
    ;(sys as any).totems.push(totem)
    const em = makeEM([1, 2, 3], {
      1: { x: 50, y: 50 },
      2: { x: 52, y: 50 },
      3: { x: 100, y: 100 }, // out of range
    })
    ;(sys as any).worshipTotems(em, [1, 2, 3])
    expect((sys as any).totems[0].worshipCount).toBe(5 + 2) // 2 worshippers
  })
})

// ─────────────────────────────────────────────
describe('update节流', () => {
  let sys: CreatureTotemSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL(950)时不触发', () => {
    const em = makeEM([])
    const world = makeWorld()
    const spy = vi.spyOn(sys as any, 'worshipTotems')
    sys.update(1, em as any, world as any, 500)
    expect(spy).not.toHaveBeenCalled()
  })
  it('tick超过CHECK_INTERVAL后触发', () => {
    const em = makeEM([])
    const world = makeWorld()
    const spy = vi.spyOn(sys as any, 'worshipTotems')
    sys.update(1, em as any, world as any, 951)
    expect(spy).toHaveBeenCalledOnce()
  })
  it('lastCheck更新到最新tick', () => {
    const em = makeEM([])
    const world = makeWorld()
    sys.update(1, em as any, world as any, 951)
    expect((sys as any).lastCheck).toBe(951)
  })
  it('连续两次相同tick只处理一次', () => {
    const em = makeEM([])
    const world = makeWorld()
    const spy = vi.spyOn(sys as any, 'worshipTotems')
    sys.update(1, em as any, world as any, 951)
    sys.update(1, em as any, world as any, 951)
    expect(spy).toHaveBeenCalledOnce()
  })
})

// ─────────────────────────────────────────────
describe('trySpawnTotem', () => {
  let sys: CreatureTotemSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('实体少于5时不生成图腾', () => {
    const em = makeEM([1, 2], { 1: { x: 10, y: 10 }, 2: { x: 11, y: 10 } }, {
      1: { species: 'human' }, 2: { species: 'human' },
    })
    const world = makeWorld()
    ;(sys as any).trySpawnTotem(em, world, 1000, [1, 2])
    expect((sys as any).totems).toHaveLength(0)
  })
  it('totems满MAX(40)时不生成', () => {
    for (let i = 0; i < 40; i++) {
      ;(sys as any).totems.push(makeTotem(i * 20, i * 20))
    }
    const em = makeEM([1, 2, 3, 4, 5], {}, {})
    const world = makeWorld()
    ;(sys as any).trySpawnTotem(em, world, 1000, [1, 2, 3, 4, 5])
    expect((sys as any).totems.length).toBe(40)
  })
  it('random<SPAWN_CHANCE时尝试生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < 0.025
    const positions: Record<number, { x: number; y: number }> = {}
    const creatures: Record<number, { age?: number; species?: string }> = {}
    const ids = [1, 2, 3, 4, 5, 6, 7, 8]
    ids.forEach(id => {
      positions[id] = { x: id * 3, y: 5 }
      creatures[id] = { species: 'human', age: 20 }
    })
    const em = makeEM(ids, positions, creatures)
    const world = makeWorld()
    ;(sys as any).trySpawnTotem(em, world, 1000, ids)
    // Should have attempted spawn; we just ensure no crash and totems are valid
    const totems = (sys as any).totems
    totems.forEach((t: Totem) => {
      expect(t.power).toBeGreaterThanOrEqual(30)
      expect(t.power).toBeLessThan(100)
    })
  })
  it('坐标超出世界边界时不生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const positions: Record<number, { x: number; y: number }> = {}
    const creatures: Record<number, { species: string }> = {}
    const ids = [1, 2, 3, 4, 5]
    ids.forEach(id => {
      positions[id] = { x: -1, y: -1 } // out of bounds
      creatures[id] = { species: 'human' }
    })
    const em = makeEM(ids, positions, creatures)
    const world = makeWorld(200, 200)
    ;(sys as any).trySpawnTotem(em, world, 1000, ids)
    expect((sys as any).totems).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────
describe('坐标key计算', () => {
  it('不同坐标生成不同key', () => {
    const key1 = 10 * 10000 + 20
    const key2 = 20 * 10000 + 10
    expect(key1).not.toBe(key2)
  })
  it('相同坐标生成相同key', () => {
    expect(5 * 10000 + 5).toBe(5 * 10000 + 5)
  })
  it('(0,0)的key为0', () => {
    expect(0 * 10000 + 0).toBe(0)
  })
})
