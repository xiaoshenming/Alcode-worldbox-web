import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TradeEconomySystem } from '../systems/TradeEconomySystem'

function makeTES(): TradeEconomySystem { return new TradeEconomySystem() }

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
// globalPrices 初始状态
// ─────────────────────────────────────────────────────────────────────────────
describe('TradeEconomySystem globalPrices 初始状态', () => {
  let tes: TradeEconomySystem
  beforeEach(() => { tes = makeTES() })

  it('初始globalPrices全部为1.0', () => {
    const prices = (tes as any).globalPrices
    expect(prices.food).toBe(1.0)
    expect(prices.wood).toBe(1.0)
    expect(prices.stone).toBe(1.0)
    expect(prices.gold).toBe(1.0)
  })

  it('globalPrices是内部引用（可直接修改）', () => {
    const prices = (tes as any).globalPrices
    prices.food = 999
    expect((tes as any).globalPrices.food).toBe(999)
  })

  it('注入自定义价格后可读取', () => {
    ;(tes as any).globalPrices = { food: 0.8, wood: 1.5, stone: 2.0, gold: 2.5 }
    const prices = (tes as any).globalPrices
    expect(prices.food).toBe(0.8)
    expect(prices.wood).toBe(1.5)
    expect(prices.stone).toBe(2.0)
    expect(prices.gold).toBe(2.5)
  })

  it('globalPrices包含food/wood/stone/gold四个键', () => {
    const prices = (tes as any).globalPrices
    expect(prices).toHaveProperty('food')
    expect(prices).toHaveProperty('wood')
    expect(prices).toHaveProperty('stone')
    expect(prices).toHaveProperty('gold')
  })

  it('globalPrices修改一个键不影响其他键', () => {
    ;(tes as any).globalPrices.food = 3.0
    const prices = (tes as any).globalPrices
    expect(prices.wood).toBe(1.0)
    expect(prices.stone).toBe(1.0)
    expect(prices.gold).toBe(1.0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// localPrices Map 操作
// ─────────────────────────────────────────────────────────────────────────────
describe('TradeEconomySystem localPrices Map', () => {
  let tes: TradeEconomySystem
  beforeEach(() => { tes = makeTES() })

  it('无本地价格时返回undefined/null', () => {
    expect((tes as any).localPrices.get(1) ?? null).toBeNull()
    expect((tes as any).localPrices.get(99) ?? null).toBeNull()
  })

  it('注入本地价格后可查询', () => {
    ;(tes as any).localPrices.set(3, { food: 1.2, wood: 0.9, stone: 1.5, gold: 2.0 })
    const prices = (tes as any).localPrices.get(3)
    expect(prices).not.toBeNull()
    expect(prices!.food).toBe(1.2)
    expect(prices!.gold).toBe(2.0)
  })

  it('不同文明价格相互独立', () => {
    ;(tes as any).localPrices.set(1, { food: 1.0, wood: 1.0, stone: 1.0, gold: 1.0 })
    ;(tes as any).localPrices.set(2, { food: 2.0, wood: 2.0, stone: 2.0, gold: 2.0 })
    expect((tes as any).localPrices.get(1)!.food).toBe(1.0)
    expect((tes as any).localPrices.get(2)!.food).toBe(2.0)
    expect((tes as any).localPrices.get(3) ?? null).toBeNull()
  })

  it('返回内部引用（修改会影响后续查询）', () => {
    ;(tes as any).localPrices.set(1, { food: 1.0, wood: 1.0, stone: 1.0, gold: 1.0 })
    const prices = (tes as any).localPrices.get(1)!
    prices.food = 999
    expect((tes as any).localPrices.get(1)!.food).toBe(999)
  })

  it('localPrices初始为空Map', () => {
    expect((tes as any).localPrices.size).toBe(0)
  })

  it('注入多个文明后size正确', () => {
    ;(tes as any).localPrices.set(1, { food: 1.0, wood: 1.0, stone: 1.0, gold: 1.0 })
    ;(tes as any).localPrices.set(2, { food: 1.5, wood: 1.5, stone: 1.5, gold: 1.5 })
    ;(tes as any).localPrices.set(3, { food: 2.0, wood: 2.0, stone: 2.0, gold: 2.0 })
    expect((tes as any).localPrices.size).toBe(3)
  })

  it('删除本地价格后不可查询', () => {
    ;(tes as any).localPrices.set(1, { food: 1.0, wood: 1.0, stone: 1.0, gold: 1.0 })
    ;(tes as any).localPrices.delete(1)
    expect((tes as any).localPrices.get(1) ?? null).toBeNull()
  })

  it('wood/stone字段独立可设置', () => {
    ;(tes as any).localPrices.set(5, { food: 0.5, wood: 3.0, stone: 0.8, gold: 1.1 })
    const p = (tes as any).localPrices.get(5)!
    expect(p.wood).toBe(3.0)
    expect(p.stone).toBe(0.8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// guilds Map 操作
// ─────────────────────────────────────────────────────────────────────────────
describe('TradeEconomySystem guilds Map', () => {
  let tes: TradeEconomySystem
  beforeEach(() => { tes = makeTES() })

  it('无工会时返回undefined/null', () => {
    expect((tes as any).guilds.get(1) ?? null).toBeNull()
    expect((tes as any).guilds.get(99) ?? null).toBeNull()
  })

  it('注入工会后可查询', () => {
    ;(tes as any).guilds.set(5, { level: 3, totalVolume: 1500 })
    const guild = (tes as any).guilds.get(5)
    expect(guild).not.toBeNull()
    expect(guild!.level).toBe(3)
    expect(guild!.totalVolume).toBe(1500)
  })

  it('多个文明工会相互独立', () => {
    ;(tes as any).guilds.set(1, { level: 1, totalVolume: 100 })
    ;(tes as any).guilds.set(2, { level: 5, totalVolume: 9999 })
    expect((tes as any).guilds.get(1)!.level).toBe(1)
    expect((tes as any).guilds.get(2)!.level).toBe(5)
    expect((tes as any).guilds.get(3) ?? null).toBeNull()
  })

  it('返回内部引用', () => {
    ;(tes as any).guilds.set(1, { level: 1, totalVolume: 0 })
    const guild = (tes as any).guilds.get(1)!
    guild.level = 5
    expect((tes as any).guilds.get(1)!.level).toBe(5)
  })

  it('guilds初始为空Map', () => {
    expect((tes as any).guilds.size).toBe(0)
  })

  it('guild level在1-5范围内可任意设置', () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      ;(tes as any).guilds.set(lvl, { level: lvl, totalVolume: lvl * 100 })
      expect((tes as any).guilds.get(lvl)!.level).toBe(lvl)
    }
  })

  it('totalVolume可为0', () => {
    ;(tes as any).guilds.set(1, { level: 1, totalVolume: 0 })
    expect((tes as any).guilds.get(1)!.totalVolume).toBe(0)
  })

  it('totalVolume可累加', () => {
    ;(tes as any).guilds.set(1, { level: 1, totalVolume: 0 })
    const guild = (tes as any).guilds.get(1)!
    guild.totalVolume += 100
    guild.totalVolume += 200
    expect((tes as any).guilds.get(1)!.totalVolume).toBe(300)
  })

  it('删除工会后不可查询', () => {
    ;(tes as any).guilds.set(1, { level: 2, totalVolume: 500 })
    ;(tes as any).guilds.delete(1)
    expect((tes as any).guilds.get(1) ?? null).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// clampPrice 私有方法
// ─────────────────────────────────────────────────────────────────────────────
describe('TradeEconomySystem.clampPrice 私有方法', () => {
  let tes: TradeEconomySystem
  beforeEach(() => { tes = makeTES() })

  it('正常值不被截断', () => {
    expect((tes as any).clampPrice(1.5)).toBe(1.5)
  })

  it('过小值被截断到MIN(0.5)', () => {
    expect((tes as any).clampPrice(0.1)).toBe(0.5)
  })

  it('过大值被截断到MAX(3.0)', () => {
    expect((tes as any).clampPrice(5.0)).toBe(3.0)
  })

  it('边界值0.5不被截断', () => {
    expect((tes as any).clampPrice(0.5)).toBe(0.5)
  })

  it('边界值3.0不被截断', () => {
    expect((tes as any).clampPrice(3.0)).toBe(3.0)
  })

  it('0被截断到0.5', () => {
    expect((tes as any).clampPrice(0)).toBe(0.5)
  })

  it('负值被截断到0.5', () => {
    expect((tes as any).clampPrice(-1)).toBe(0.5)
  })

  it('2.0不被截断', () => {
    expect((tes as any).clampPrice(2.0)).toBe(2.0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// findSurplus 私有方法
// ─────────────────────────────────────────────────────────────────────────────
describe('TradeEconomySystem.findSurplus 私有方法', () => {
  let tes: TradeEconomySystem
  beforeEach(() => { tes = makeTES() })

  it('无盈余时返回null', () => {
    const civ = { resources: { food: 10, wood: 10, stone: 5, gold: 5 } } as any
    expect((tes as any).findSurplus(civ)).toBeNull()
  })

  it('food盈余时返回food', () => {
    // food阈值为40，需要>1.2倍即>48
    const civ = { resources: { food: 60, wood: 10, stone: 5, gold: 5 } } as any
    expect((tes as any).findSurplus(civ)).toBe('food')
  })

  it('wood盈余时返回wood', () => {
    // wood阈值为35，需要>42
    const civ = { resources: { food: 10, wood: 50, stone: 5, gold: 5 } } as any
    expect((tes as any).findSurplus(civ)).toBe('wood')
  })

  it('stone盈余时返回stone', () => {
    // stone阈值为20，需要>24
    const civ = { resources: { food: 10, wood: 10, stone: 30, gold: 5 } } as any
    expect((tes as any).findSurplus(civ)).toBe('stone')
  })

  it('gold盈余时返回gold', () => {
    // gold阈值为15，需要>18
    const civ = { resources: { food: 10, wood: 10, stone: 5, gold: 25 } } as any
    expect((tes as any).findSurplus(civ)).toBe('gold')
  })

  it('多种盈余时返回比例最高的', () => {
    // food: 200/40=5.0, wood: 50/35≈1.43
    const civ = { resources: { food: 200, wood: 50, stone: 5, gold: 5 } } as any
    expect((tes as any).findSurplus(civ)).toBe('food')
  })

  it('恰好在阈值1.2倍时不算盈余（需>1.2）', () => {
    // food阈值40，1.2倍=48，ratio=48/40=1.2，不满足ratio>1.2
    const civ = { resources: { food: 48, wood: 0, stone: 0, gold: 0 } } as any
    expect((tes as any).findSurplus(civ)).toBeNull()
  })

  it('超过1.2倍才算盈余', () => {
    // food: 49/40=1.225 > 1.2
    const civ = { resources: { food: 49, wood: 0, stone: 0, gold: 0 } } as any
    expect((tes as any).findSurplus(civ)).toBe('food')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// civCenter 私有方法
// ─────────────────────────────────────────────────────────────────────────────
describe('TradeEconomySystem.civCenter 私有方法', () => {
  let tes: TradeEconomySystem
  beforeEach(() => { tes = makeTES() })

  it('territory为空时返回false', () => {
    const civ = { territory: new Set() } as any
    const out = { x: 0, y: 0 }
    expect((tes as any).civCenter(civ, out)).toBe(false)
  })

  it('单个tile时center等于该tile', () => {
    const civ = { territory: new Set(['10,20']) } as any
    const out = { x: 0, y: 0 }
    const result = (tes as any).civCenter(civ, out)
    expect(result).toBe(true)
    expect(out.x).toBe(10)
    expect(out.y).toBe(20)
  })

  it('多个tile时center为平均值', () => {
    const civ = { territory: new Set(['0,0', '10,10']) } as any
    const out = { x: 0, y: 0 }
    ;(tes as any).civCenter(civ, out)
    expect(out.x).toBe(5)
    expect(out.y).toBe(5)
  })

  it('超过20个tile时只采样20个', () => {
    const tiles = new Set<string>()
    for (let i = 0; i < 30; i++) tiles.add(`${i},${i}`)
    const civ = { territory: tiles } as any
    const out = { x: 0, y: 0 }
    const result = (tes as any).civCenter(civ, out)
    expect(result).toBe(true)
    // 验证center是合理的（不是NaN）
    expect(isNaN(out.x)).toBe(false)
    expect(isNaN(out.y)).toBe(false)
  })

  it('有territory时返回true', () => {
    const civ = { territory: new Set(['5,5']) } as any
    const out = { x: 0, y: 0 }
    expect((tes as any).civCenter(civ, out)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// update tick 间隔
// ─────────────────────────────────────────────────────────────────────────────
describe('TradeEconomySystem.update tick间隔', () => {
  let tes: TradeEconomySystem
  beforeEach(() => { tes = makeTES() })

  it('tick不是TRADE_INTERVAL(120)倍数时不执行', () => {
    const civManager = { civilizations: new Map() } as any
    const em = {} as any
    const world = {} as any
    const particles = { spawn: vi.fn() } as any
    // spy updateGlobalPrices
    const spy = vi.spyOn(tes as any, 'updateGlobalPrices')
    tes.update(civManager, em, world, particles, 1)
    expect(spy).not.toHaveBeenCalled()
  })

  it('tick是120倍数时执行updateGlobalPrices', () => {
    const civManager = { civilizations: new Map() } as any
    const em = {} as any
    const world = {} as any
    const particles = { spawn: vi.fn() } as any
    const spy = vi.spyOn(tes as any, 'updateGlobalPrices')
    tes.update(civManager, em, world, particles, 120)
    expect(spy).toHaveBeenCalled()
  })

  it('tick=0时执行(0 % 120 === 0)', () => {
    const civManager = { civilizations: new Map() } as any
    const em = {} as any
    const world = {} as any
    const particles = { spawn: vi.fn() } as any
    const spy = vi.spyOn(tes as any, 'updateGlobalPrices')
    tes.update(civManager, em, world, particles, 0)
    expect(spy).toHaveBeenCalled()
  })

  it('tick=240时执行', () => {
    const civManager = { civilizations: new Map() } as any
    const em = {} as any
    const world = {} as any
    const particles = { spawn: vi.fn() } as any
    const spy = vi.spyOn(tes as any, 'updateGlobalPrices')
    tes.update(civManager, em, world, particles, 240)
    expect(spy).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateGlobalPrices 私有方法
// ─────────────────────────────────────────────────────────────────────────────
describe('TradeEconomySystem.updateGlobalPrices 私有方法', () => {
  let tes: TradeEconomySystem
  beforeEach(() => { tes = makeTES() })

  it('无文明时不更新globalPrices', () => {
    const civManager = { civilizations: new Map() } as any
    const before = { ...(tes as any).globalPrices }
    ;(tes as any).updateGlobalPrices(civManager)
    const after = (tes as any).globalPrices
    expect(after.food).toBe(before.food)
  })

  it('高food供给时food价格降低', () => {
    // food price = clamp(20/avg), avg=200 => 20/200=0.1 => clamp => 0.5
    const civ1 = { resources: { food: 200, wood: 1, stone: 1, gold: 1 } }
    const civ2 = { resources: { food: 200, wood: 1, stone: 1, gold: 1 } }
    const civManager = { civilizations: new Map([[1, civ1], [2, civ2]]) } as any
    ;(tes as any).updateGlobalPrices(civManager)
    expect((tes as any).globalPrices.food).toBeLessThan(1.0)
  })

  it('低food供给时food价格升高', () => {
    // food price = clamp(20/avg), avg=1 => 20/1=20 => clamp => 3.0
    const civ1 = { resources: { food: 1, wood: 200, stone: 200, gold: 200 } }
    const civManager = { civilizations: new Map([[1, civ1]]) } as any
    ;(tes as any).updateGlobalPrices(civManager)
    expect((tes as any).globalPrices.food).toBeGreaterThan(1.0)
  })

  it('价格始终在clamp范围内[0.5, 3.0]', () => {
    const civ1 = { resources: { food: 10000, wood: 0, stone: 0, gold: 0 } }
    const civManager = { civilizations: new Map([[1, civ1]]) } as any
    ;(tes as any).updateGlobalPrices(civManager)
    const p = (tes as any).globalPrices
    expect(p.food).toBeGreaterThanOrEqual(0.5)
    expect(p.food).toBeLessThanOrEqual(3.0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// _civsBuf 内部缓冲
// ─────────────────────────────────────────────────────────────────────────────
describe('TradeEconomySystem 内部缓冲字段', () => {
  let tes: TradeEconomySystem
  beforeEach(() => { tes = makeTES() })

  it('_civsBuf初始为空数组', () => {
    expect((tes as any)._civsBuf).toHaveLength(0)
  })

  it('_centerA初始为{x:0, y:0}', () => {
    expect((tes as any)._centerA).toEqual({ x: 0, y: 0 })
  })

  it('_centerB初始为{x:0, y:0}', () => {
    expect((tes as any)._centerB).toEqual({ x: 0, y: 0 })
  })
})
