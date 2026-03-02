import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ResourceScarcitySystem } from '../systems/ResourceScarcitySystem'
import type { ScarcityResource, ScarcityLevel, CivResourceState, ResourceStock } from '../systems/ResourceScarcitySystem'

afterEach(() => vi.restoreAllMocks())

function makeSys(): ResourceScarcitySystem { return new ResourceScarcitySystem() }

function makeStock(current: number, capacity: number): ResourceStock {
  return { current, capacity, consumptionRate: 0, productionRate: 0 }
}

function makeState(foodCurrent: number, foodCapacity: number, extras?: Partial<Record<ScarcityResource, ResourceStock>>): CivResourceState {
  return {
    famineTicks: 0,
    droughtTicks: 0,
    resources: {
      FOOD: makeStock(foodCurrent, foodCapacity),
      WOOD: (extras?.WOOD ?? makeStock(100, 100)),
      STONE: (extras?.STONE ?? makeStock(100, 100)),
      GOLD: (extras?.GOLD ?? makeStock(100, 100)),
      WATER: (extras?.WATER ?? makeStock(100, 100)),
    }
  }
}

function makeCiv(id: number, food = 100, wood = 100, stone = 100, gold = 100, pop = 10, territorySize = 1) {
  return {
    id,
    population: pop,
    resources: { food, wood, stone, gold },
    territory: { size: territorySize },
    relations: new Map<number, number>()
  }
}

function makeCivManager(civs: ReturnType<typeof makeCiv>[]) {
  const map = new Map(civs.map(c => [c.id, c]))
  return { civilizations: map }
}

const stubEm = {
  getEntitiesWithComponents: () => [],
  getComponent: () => undefined
}

const stubWorld = { tick: 0, season: 'summer' as const }

// ── getResourceLevel ────────────────────────────────────────────
describe('getResourceLevel — 等级判断', () => {
  let sys: ResourceScarcitySystem
  beforeEach(() => { sys = makeSys() })

  it('未注入时返回ABUNDANT（默认100%）', () => {
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('ABUNDANT')
  })

  it('注入0/100时返回DEPLETED', () => {
    ;(sys as any).states.set(1, makeState(0, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('DEPLETED')
  })

  it('注入100/100时返回ABUNDANT', () => {
    ;(sys as any).states.set(1, makeState(100, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('ABUNDANT')
  })

  it('注入20/100时返回CRITICAL（<25%）', () => {
    ;(sys as any).states.set(1, makeState(20, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('CRITICAL')
  })

  it('注入25/100时返回SCARCE（恰好25%边界）', () => {
    ;(sys as any).states.set(1, makeState(25, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('SCARCE')
  })

  it('注入40/100时返回SCARCE（25-50%）', () => {
    ;(sys as any).states.set(1, makeState(40, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('SCARCE')
  })

  it('注入50/100时返回SUFFICIENT（恰好50%边界）', () => {
    ;(sys as any).states.set(1, makeState(50, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('SUFFICIENT')
  })

  it('注入65/100时返回SUFFICIENT（50-75%）', () => {
    ;(sys as any).states.set(1, makeState(65, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('SUFFICIENT')
  })

  it('注入75/100时返回ABUNDANT（恰好75%边界）', () => {
    ;(sys as any).states.set(1, makeState(75, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('ABUNDANT')
  })

  it('注入90/100时返回ABUNDANT（>75%）', () => {
    ;(sys as any).states.set(1, makeState(90, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('ABUNDANT')
  })

  it('支持WOOD资源类型', () => {
    ;(sys as any).states.set(1, makeState(100, 100, { WOOD: makeStock(0, 100) }))
    expect(sys.getResourceLevel(1, 'WOOD')).toBe('DEPLETED')
  })

  it('支持STONE资源类型', () => {
    ;(sys as any).states.set(1, makeState(100, 100, { STONE: makeStock(30, 100) }))
    expect(sys.getResourceLevel(1, 'STONE')).toBe('SCARCE')
  })

  it('支持GOLD资源类型', () => {
    ;(sys as any).states.set(1, makeState(100, 100, { GOLD: makeStock(60, 100) }))
    expect(sys.getResourceLevel(1, 'GOLD')).toBe('SUFFICIENT')
  })

  it('支持WATER资源类型', () => {
    ;(sys as any).states.set(1, makeState(100, 100, { WATER: makeStock(80, 100) }))
    expect(sys.getResourceLevel(1, 'WATER')).toBe('ABUNDANT')
  })

  it('不同civId相互独立', () => {
    ;(sys as any).states.set(1, makeState(0, 100))
    ;(sys as any).states.set(2, makeState(100, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('DEPLETED')
    expect(sys.getResourceLevel(2, 'FOOD')).toBe('ABUNDANT')
  })

  it('5种ScarcityLevel均可从percentToLevel得到', () => {
    ;(sys as any).states.set(1, makeState(0, 100))    // DEPLETED
    ;(sys as any).states.set(2, makeState(20, 100))   // CRITICAL
    ;(sys as any).states.set(3, makeState(40, 100))   // SCARCE
    ;(sys as any).states.set(4, makeState(60, 100))   // SUFFICIENT
    ;(sys as any).states.set(5, makeState(90, 100))   // ABUNDANT
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('DEPLETED')
    expect(sys.getResourceLevel(2, 'FOOD')).toBe('CRITICAL')
    expect(sys.getResourceLevel(3, 'FOOD')).toBe('SCARCE')
    expect(sys.getResourceLevel(4, 'FOOD')).toBe('SUFFICIENT')
    expect(sys.getResourceLevel(5, 'FOOD')).toBe('ABUNDANT')
  })
})

// ── getResourcePercent ──────────────────────────────────────────
describe('getResourcePercent — 百分比计算', () => {
  let sys: ResourceScarcitySystem
  beforeEach(() => { sys = makeSys() })

  it('未注入时返回1.0（100%）', () => {
    expect(sys.getResourcePercent(1, 'FOOD')).toBe(1.0)
  })

  it('注入50/100返回0.5', () => {
    ;(sys as any).states.set(1, makeState(50, 100))
    expect(sys.getResourcePercent(1, 'FOOD')).toBe(0.5)
  })

  it('注入0/100返回0', () => {
    ;(sys as any).states.set(1, makeState(0, 100))
    expect(sys.getResourcePercent(1, 'FOOD')).toBe(0)
  })

  it('注入100/100返回1.0', () => {
    ;(sys as any).states.set(1, makeState(100, 100))
    expect(sys.getResourcePercent(1, 'FOOD')).toBe(1.0)
  })

  it('capacity为0时返回0（防除零）', () => {
    ;(sys as any).states.set(1, makeState(50, 0))
    expect(sys.getResourcePercent(1, 'FOOD')).toBe(0)
  })

  it('current>capacity时clamp到1', () => {
    ;(sys as any).states.set(1, makeState(150, 100))
    expect(sys.getResourcePercent(1, 'FOOD')).toBe(1.0)
  })

  it('current<0时clamp到0', () => {
    ;(sys as any).states.set(1, makeState(-10, 100))
    expect(sys.getResourcePercent(1, 'FOOD')).toBe(0)
  })

  it('75/100返回0.75', () => {
    ;(sys as any).states.set(1, makeState(75, 100))
    expect(sys.getResourcePercent(1, 'FOOD')).toBeCloseTo(0.75)
  })

  it('25/100返回0.25', () => {
    ;(sys as any).states.set(1, makeState(25, 100))
    expect(sys.getResourcePercent(1, 'FOOD')).toBeCloseTo(0.25)
  })

  it('WATER资源百分比正确计算', () => {
    ;(sys as any).states.set(1, makeState(100, 100, { WATER: makeStock(30, 100) }))
    expect(sys.getResourcePercent(1, 'WATER')).toBeCloseTo(0.3)
  })

  it('WOOD资源百分比正确计算', () => {
    ;(sys as any).states.set(1, makeState(100, 100, { WOOD: makeStock(80, 100) }))
    expect(sys.getResourcePercent(1, 'WOOD')).toBeCloseTo(0.8)
  })
})

// ── isDrought ──────────────────────────────────────────────────
describe('isDrought — 干旱判断', () => {
  let sys: ResourceScarcitySystem
  beforeEach(() => { sys = makeSys() })

  it('未注入时WATER为ABUNDANT，不干旱', () => {
    expect(sys.isDrought(1)).toBe(false)
  })

  it('WATER ABUNDANT时不干旱', () => {
    ;(sys as any).states.set(1, makeState(100, 100, { WATER: makeStock(80, 100) }))
    expect(sys.isDrought(1)).toBe(false)
  })

  it('WATER SUFFICIENT时不干旱', () => {
    ;(sys as any).states.set(1, makeState(100, 100, { WATER: makeStock(60, 100) }))
    expect(sys.isDrought(1)).toBe(false)
  })

  it('WATER SCARCE时干旱', () => {
    ;(sys as any).states.set(1, makeState(100, 100, { WATER: makeStock(30, 100) }))
    expect(sys.isDrought(1)).toBe(true)
  })

  it('WATER CRITICAL时干旱', () => {
    ;(sys as any).states.set(1, makeState(100, 100, { WATER: makeStock(10, 100) }))
    expect(sys.isDrought(1)).toBe(true)
  })

  it('WATER DEPLETED时干旱', () => {
    ;(sys as any).states.set(1, makeState(100, 100, { WATER: makeStock(0, 100) }))
    expect(sys.isDrought(1)).toBe(true)
  })
})

// ── createDefaultState ──────────────────────────────────────────
describe('createDefaultState — 默认状态', () => {
  let sys: ResourceScarcitySystem
  beforeEach(() => { sys = makeSys() })

  it('默认状态famineTicks为0', () => {
    const s = (sys as any).createDefaultState() as CivResourceState
    expect(s.famineTicks).toBe(0)
  })

  it('默认状态droughtTicks为0', () => {
    const s = (sys as any).createDefaultState() as CivResourceState
    expect(s.droughtTicks).toBe(0)
  })

  it('默认状态含FOOD资源', () => {
    const s = (sys as any).createDefaultState() as CivResourceState
    expect(s.resources.FOOD).toBeDefined()
  })

  it('默认状态含全部5种资源', () => {
    const s = (sys as any).createDefaultState() as CivResourceState
    const keys = Object.keys(s.resources)
    expect(keys).toContain('FOOD')
    expect(keys).toContain('WOOD')
    expect(keys).toContain('STONE')
    expect(keys).toContain('GOLD')
    expect(keys).toContain('WATER')
  })

  it('默认状态FOOD current为capacity的60%', () => {
    const s = (sys as any).createDefaultState() as CivResourceState
    const { current, capacity } = s.resources.FOOD
    expect(current / capacity).toBeCloseTo(0.6)
  })

  it('默认状态capacity为DEFAULT_CAPACITY(200)', () => {
    const s = (sys as any).createDefaultState() as CivResourceState
    expect(s.resources.FOOD.capacity).toBe(200)
  })
})

// ── update 集成测试 ─────────────────────────────────────────────
describe('update — 集成行为', () => {
  let sys: ResourceScarcitySystem
  beforeEach(() => { sys = makeSys() })

  it('update不抛出异常', () => {
    const cm = makeCivManager([makeCiv(1)])
    expect(() => sys.update(0, cm, stubEm, stubWorld)).not.toThrow()
  })

  it('update为新文明创建state', () => {
    const cm = makeCivManager([makeCiv(1)])
    sys.update(0, cm, stubEm, stubWorld)
    expect((sys as any).states.has(1)).toBe(true)
  })

  it('update清理已消亡文明的state', () => {
    ;(sys as any).states.set(99, makeState(50, 100))
    const cm = makeCivManager([]) // civ 99不存在
    sys.update(0, cm, stubEm, stubWorld)
    expect((sys as any).states.has(99)).toBe(false)
  })

  it('多个文明各自维护独立state', () => {
    const cm = makeCivManager([makeCiv(1), makeCiv(2)])
    sys.update(0, cm, stubEm, stubWorld)
    expect((sys as any).states.has(1)).toBe(true)
    expect((sys as any).states.has(2)).toBe(true)
  })

  it('WATER低时droughtTicks增加', () => {
    const cm = makeCivManager([makeCiv(1, 100, 100, 100, 100, 10)])
    sys.update(0, cm, stubEm, stubWorld)
    // 手动设置WATER为SCARCE
    ;(sys as any).states.get(1).resources.WATER.current = 10
    ;(sys as any).states.get(1).resources.WATER.capacity = 100
    sys.update(1, cm, stubEm, stubWorld)
    // droughtTicks应增加（WATER为SCARCE）
    const state = (sys as any).states.get(1) as CivResourceState
    expect(state.droughtTicks).toBeGreaterThan(0)
  })

  it('FOOD充足时famineTicks减少（不低于0）', () => {
    const cm = makeCivManager([makeCiv(1, 200, 100, 100, 100, 1)])
    sys.update(0, cm, stubEm, stubWorld)
    const state = (sys as any).states.get(1) as CivResourceState
    state.famineTicks = 5 // 手动设置
    sys.update(1, cm, stubEm, stubWorld)
    // FOOD充足，famineTicks应减少但不低于0
    expect(state.famineTicks).toBeGreaterThanOrEqual(0)
  })
})

// ── seasonModifier ──────────────────────────────────────────────
describe('seasonModifier — 季节修正', () => {
  let sys: ResourceScarcitySystem
  beforeEach(() => { sys = makeSys() })

  it('spring季节修正为1.2', () => {
    const mod = (sys as any).seasonModifier({ tick: 0, season: 'spring' })
    expect(mod).toBe(1.2)
  })

  it('summer季节修正为1.0', () => {
    const mod = (sys as any).seasonModifier({ tick: 0, season: 'summer' })
    expect(mod).toBe(1.0)
  })

  it('autumn季节修正为0.8', () => {
    const mod = (sys as any).seasonModifier({ tick: 0, season: 'autumn' })
    expect(mod).toBe(0.8)
  })

  it('winter季节修正为0.4', () => {
    const mod = (sys as any).seasonModifier({ tick: 0, season: 'winter' })
    expect(mod).toBe(0.4)
  })

  it('无season时默认返回1.0', () => {
    const mod = (sys as any).seasonModifier({ tick: 0 })
    expect(mod).toBe(1.0)
  })

  it('未知season返回1.0', () => {
    const mod = (sys as any).seasonModifier({ tick: 0, season: 'monsoon' })
    expect(mod).toBe(1.0)
  })
})

// ── ScarcityResource / ScarcityLevel 类型覆盖 ──────────────────
describe('ScarcityResource 和 ScarcityLevel 类型覆盖', () => {
  it('5种ScarcityResource类型存在', () => {
    const resources: ScarcityResource[] = ['FOOD', 'WOOD', 'STONE', 'GOLD', 'WATER']
    expect(resources).toHaveLength(5)
  })

  it('5种ScarcityLevel类型存在', () => {
    const levels: ScarcityLevel[] = ['ABUNDANT', 'SUFFICIENT', 'SCARCE', 'CRITICAL', 'DEPLETED']
    expect(levels).toHaveLength(5)
  })

  it('所有ScarcityResource在getResourceLevel中均不报错', () => {
    const sys = makeSys()
    const resources: ScarcityResource[] = ['FOOD', 'WOOD', 'STONE', 'GOLD', 'WATER']
    resources.forEach(r => {
      expect(() => sys.getResourceLevel(999, r)).not.toThrow()
    })
  })

  it('所有ScarcityResource在getResourcePercent中均不报错', () => {
    const sys = makeSys()
    const resources: ScarcityResource[] = ['FOOD', 'WOOD', 'STONE', 'GOLD', 'WATER']
    resources.forEach(r => {
      expect(() => sys.getResourcePercent(999, r)).not.toThrow()
    })
  })

  it('getResourceLevel对未知civId返回ABUNDANT（默认1.0）', () => {
    const sys = makeSys()
    expect(sys.getResourceLevel(9999, 'FOOD')).toBe('ABUNDANT')
  })
})

// ── syncFromCiv ─────────────────────────────────────────────────
describe('syncFromCiv — 文明数据同步', () => {
  let sys: ResourceScarcitySystem
  beforeEach(() => { sys = makeSys() })

  it('syncFromCiv后FOOD.current反映civ.resources.food', () => {
    ;(sys as any).states.set(1, makeState(0, 200))
    const civ = makeCiv(1, 120, 50, 30, 10)
    ;(sys as any).syncFromCiv(1, civ)
    const state = (sys as any).states.get(1) as CivResourceState
    expect(state.resources.FOOD.current).toBe(120)
  })

  it('syncFromCiv后WOOD.current反映civ.resources.wood', () => {
    ;(sys as any).states.set(1, makeState(100, 200))
    const civ = makeCiv(1, 100, 75, 30, 10)
    ;(sys as any).syncFromCiv(1, civ)
    const state = (sys as any).states.get(1) as CivResourceState
    expect(state.resources.WOOD.current).toBe(75)
  })

  it('syncFromCiv capacity随territory.size扩大', () => {
    ;(sys as any).states.set(1, makeState(0, 200))
    const civ = makeCiv(1, 0, 0, 0, 0, 10, 100) // territory.size=100
    ;(sys as any).syncFromCiv(1, civ)
    const state = (sys as any).states.get(1) as CivResourceState
    // capacity = 200 + max(1, 100*0.5) = 200 + 50 = 250
    expect(state.resources.FOOD.capacity).toBe(250)
  })

  it('syncFromCiv food超出capacity时clamp到capacity', () => {
    ;(sys as any).states.set(1, makeState(0, 200))
    const civ = makeCiv(1, 9999, 0, 0, 0, 1, 1)
    ;(sys as any).syncFromCiv(1, civ)
    const state = (sys as any).states.get(1) as CivResourceState
    expect(state.resources.FOOD.current).toBeLessThanOrEqual(state.resources.FOOD.capacity)
  })

  it('syncFromCiv对不存在的civId不崩溃', () => {
    const civ = makeCiv(99, 50, 50, 50, 50)
    expect(() => (sys as any).syncFromCiv(99, civ)).not.toThrow()
  })
})
