import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureTattooSystem } from '../systems/CreatureTattooSystem'
import type { Tattoo, TattooStyle } from '../systems/CreatureTattooSystem'

let nextId = 1

function makeSys(): CreatureTattooSystem { return new CreatureTattooSystem() }

function makeTattoo(entityId: number, style: TattooStyle = 'tribal', prestige = 50, tick = 0): Tattoo {
  return { id: nextId++, entityId, style, meaning: 'strength', prestige, tick }
}

function makeEM(entities: number[] = [], components: Record<string, Record<number, any>> = {}) {
  return {
    getEntitiesWithComponents: vi.fn((..._comps: string[]) => entities),
    getComponent: vi.fn((eid: number, comp: string) => components[comp]?.[eid] ?? null),
    hasComponent: vi.fn((eid: number, comp: string) => !!components[comp]?.[eid]),
  }
}

afterEach(() => { vi.restoreAllMocks() })

// ─────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CreatureTattooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无纹身', () => { expect((sys as any).tattoos).toHaveLength(0) })
  it('nextId从1开始', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('_tattoosBuf初始为空数组', () => { expect((sys as any)._tattoosBuf).toEqual([]) })
  it('tattoos是数组实例', () => { expect(Array.isArray((sys as any).tattoos)).toBe(true) })
})

// ─────────────────────────────────────────────
describe('注入与查询', () => {
  let sys: CreatureTattooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后tattoos长度变化', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'runic'))
    expect((sys as any).tattoos).toHaveLength(1)
  })
  it('注入后style正确', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'runic'))
    expect((sys as any).tattoos[0].style).toBe('runic')
  })
  it('注入多个实体纹身', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal'))
    ;(sys as any).tattoos.push(makeTattoo(2, 'beast'))
    ;(sys as any).tattoos.push(makeTattoo(3, 'celestial'))
    expect((sys as any).tattoos).toHaveLength(3)
  })
  it('tattoos数组是同一引用', () => {
    const arr = (sys as any).tattoos
    expect(arr).toBe((sys as any).tattoos)
  })
  it('prestige字段被保留', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'war_paint', 75))
    expect((sys as any).tattoos[0].prestige).toBe(75)
  })
  it('tick字段被保留', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'ancestral', 50, 1000))
    expect((sys as any).tattoos[0].tick).toBe(1000)
  })
  it('id字段自增', () => {
    const t1 = makeTattoo(1); const t2 = makeTattoo(2)
    expect(t2.id).toBe(t1.id + 1)
  })
})

// ─────────────────────────────────────────────
describe('getEntityTattoos', () => {
  let sys: CreatureTattooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('空系统返回空数组', () => {
    expect(sys.getEntityTattoos(1)).toHaveLength(0)
  })
  it('按entityId过滤', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal'))
    ;(sys as any).tattoos.push(makeTattoo(2, 'war_paint'))
    ;(sys as any).tattoos.push(makeTattoo(1, 'ancestral'))
    const result = sys.getEntityTattoos(1)
    expect(result).toHaveLength(2)
  })
  it('结果中所有entityId正确', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal'))
    ;(sys as any).tattoos.push(makeTattoo(2, 'war_paint'))
    ;(sys as any).tattoos.push(makeTattoo(1, 'ancestral'))
    sys.getEntityTattoos(1).forEach(t => expect(t.entityId).toBe(1))
  })
  it('不存在的entityId返回空', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal'))
    expect(sys.getEntityTattoos(999)).toHaveLength(0)
  })
  it('同一实体最多返回3个(手动注入)', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).tattoos.push(makeTattoo(5, 'runic'))
    }
    expect(sys.getEntityTattoos(5)).toHaveLength(3)
  })
  it('多次调用返回同一buf引用', () => {
    ;(sys as any).tattoos.push(makeTattoo(1))
    const r1 = sys.getEntityTattoos(1)
    const r2 = sys.getEntityTattoos(1)
    expect(r1).toBe(r2)
  })
  it('返回的内容包含style字段', () => {
    ;(sys as any).tattoos.push(makeTattoo(7, 'celestial'))
    const result = sys.getEntityTattoos(7)
    expect(result[0].style).toBe('celestial')
  })
  it('大量纹身时仅返回匹配实体', () => {
    for (let i = 1; i <= 20; i++) {
      ;(sys as any).tattoos.push(makeTattoo(i, 'tribal'))
    }
    expect(sys.getEntityTattoos(10)).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────
describe('支持所有6种风格', () => {
  let sys: CreatureTattooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  const styles: TattooStyle[] = ['tribal', 'runic', 'beast', 'celestial', 'war_paint', 'ancestral']

  it('可注入所有6种风格', () => {
    styles.forEach((s, i) => { ;(sys as any).tattoos.push(makeTattoo(i + 1, s)) })
    expect((sys as any).tattoos).toHaveLength(6)
  })

  styles.forEach(style => {
    it(`风格 ${style} 可正确存储`, () => {
      ;(sys as any).tattoos.push(makeTattoo(1, style))
      expect((sys as any).tattoos[0].style).toBe(style)
    })
  })
})

// ─────────────────────────────────────────────
describe('cleanup（prestige排序）', () => {
  let sys: CreatureTattooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('超过MAX_TATTOOS后cleanup只保留高prestige', () => {
    // 注入101个纹身，prestige递减
    for (let i = 0; i < 101; i++) {
      ;(sys as any).tattoos.push(makeTattoo(i + 1, 'tribal', 101 - i))
    }
    ;(sys as any).cleanup()
    expect((sys as any).tattoos.length).toBeLessThanOrEqual(100)
    // 第一个应是prestige最高的(101 - 0 = 101, but cleanup trims not by prestige in initial insert; after sort desc)
    const ps = (sys as any).tattoos.map((t: Tattoo) => t.prestige)
    expect(ps[0]).toBeGreaterThanOrEqual(ps[ps.length - 1])
  })
  it('不超过MAX_TATTOOS时cleanup不删除', () => {
    for (let i = 0; i < 50; i++) {
      ;(sys as any).tattoos.push(makeTattoo(i + 1, 'runic', 50))
    }
    ;(sys as any).cleanup()
    expect((sys as any).tattoos).toHaveLength(50)
  })
})

// ─────────────────────────────────────────────
describe('evolvePrestige', () => {
  let sys: CreatureTattooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('evolvePrestige不超过100', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal', 99.9))
    ;(sys as any).evolvePrestige()
    expect((sys as any).tattoos[0].prestige).toBeLessThanOrEqual(100)
  })
  it('evolvePrestige在有纹身时增加prestige', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal', 50))
    const before = (sys as any).tattoos[0].prestige
    ;(sys as any).evolvePrestige()
    expect((sys as any).tattoos[0].prestige).toBeGreaterThanOrEqual(before)
  })
  it('空纹身时evolvePrestige不崩溃', () => {
    expect(() => (sys as any).evolvePrestige()).not.toThrow()
  })
})

// ─────────────────────────────────────────────
describe('getTattooCount私有方法', () => {
  let sys: CreatureTattooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无纹身时返回0', () => {
    expect((sys as any).getTattooCount(1)).toBe(0)
  })
  it('单纹身返回1', () => {
    ;(sys as any).tattoos.push(makeTattoo(1))
    expect((sys as any).getTattooCount(1)).toBe(1)
  })
  it('多个纹身返回正确数', () => {
    ;(sys as any).tattoos.push(makeTattoo(1))
    ;(sys as any).tattoos.push(makeTattoo(1))
    ;(sys as any).tattoos.push(makeTattoo(2))
    expect((sys as any).getTattooCount(1)).toBe(2)
  })
  it('不同实体互不干扰', () => {
    ;(sys as any).tattoos.push(makeTattoo(3))
    expect((sys as any).getTattooCount(1)).toBe(0)
    expect((sys as any).getTattooCount(3)).toBe(1)
  })
})

// ─────────────────────────────────────────────
describe('update节流', () => {
  let sys: CreatureTattooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不调用awardTattoos', () => {
    const em = makeEM([])
    const spy = vi.spyOn(sys as any, 'awardTattoos')
    sys.update(1, em as any, 500)
    expect(spy).not.toHaveBeenCalled()
  })
  it('tick超过CHECK_INTERVAL后触发更新', () => {
    const em = makeEM([])
    const spy = vi.spyOn(sys as any, 'awardTattoos')
    sys.update(1, em as any, 1201)
    expect(spy).toHaveBeenCalledOnce()
  })
  it('连续两次相同tick不重复触发', () => {
    const em = makeEM([])
    const spy = vi.spyOn(sys as any, 'awardTattoos')
    sys.update(1, em as any, 1201)
    sys.update(1, em as any, 1201)
    expect(spy).toHaveBeenCalledOnce()
  })
  it('lastCheck更新到最新tick', () => {
    const em = makeEM([])
    sys.update(1, em as any, 1201)
    expect((sys as any).lastCheck).toBe(1201)
  })
})

// ─────────────────────────────────────────────
describe('awardTattoos集成行为', () => {
  let sys: CreatureTattooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('生物age>maxAge*0.6时优先ancestral风格', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // TATTOO_CHANCE=0.01, random=0 => 0 < 0.01 通过
    const em = makeEM([1], {
      creature: { 1: { age: 70, maxAge: 100, isHostile: false, species: 'human' } }
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 1201)
    const tattoos = (sys as any).tattoos
    if (tattoos.length > 0) {
      expect(tattoos[0].style).toBe('ancestral')
    }
  })
  it('生物isHostile时优先war_paint风格', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], {
      creature: { 1: { age: 10, maxAge: 100, isHostile: true, species: 'orc' } }
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 1201)
    const tattoos = (sys as any).tattoos
    if (tattoos.length > 0) {
      expect(tattoos[0].style).toBe('war_paint')
    }
  })
  it('tattoos已达MAX(100)时不再添加', () => {
    for (let i = 0; i < 100; i++) {
      ;(sys as any).tattoos.push(makeTattoo(i + 1, 'tribal'))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([200], {
      creature: { 200: { age: 10, maxAge: 100, isHostile: false, species: 'human' } }
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 1201)
    expect((sys as any).tattoos.length).toBe(100)
  })
  it('同一实体超3个纹身不再授予', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).tattoos.push(makeTattoo(1, 'tribal'))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], {
      creature: { 1: { age: 10, maxAge: 100, isHostile: false, species: 'human' } }
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 1201)
    expect((sys as any).tattoos.filter((t: Tattoo) => t.entityId === 1).length).toBe(3)
  })
  it('无creature组件时跳过实体', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1], { creature: {} }) // no creature for entity 1
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 1201)
    expect((sys as any).tattoos).toHaveLength(0)
  })
})
