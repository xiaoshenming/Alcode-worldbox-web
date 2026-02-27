import { describe, it, expect, beforeEach } from 'vitest'
import { TradeEconomySystem } from '../systems/TradeEconomySystem'

// TradeEconomySystem 测试：
// - getGlobalPrices()     → 返回全局价格的浅拷贝（初始为 {food:1,wood:1,stone:1,gold:1}）
// - getLocalPrices(civId) → 返回特定文明的本地价格，无则返回 null
// - getGuild(civId)       → 返回文明的商人工会，无则返回 null
// update() 依赖 CivManager/EntityManager/World，不在此测试。
// 通过 as any 注入私有字段进行测试。

function makeTES(): TradeEconomySystem {
  return new TradeEconomySystem()
}

// ── getGlobalPrices ───────────────────────────────────────────────────────────

describe('TradeEconomySystem.getGlobalPrices', () => {
  let tes: TradeEconomySystem

  beforeEach(() => {
    tes = makeTES()
  })

  it('初始价格全部为 1.0', () => {
    const prices = tes.getGlobalPrices()
    expect(prices.food).toBe(1.0)
    expect(prices.wood).toBe(1.0)
    expect(prices.stone).toBe(1.0)
    expect(prices.gold).toBe(1.0)
  })

  it('返回浅拷贝，修改不影响内部', () => {
    const prices = tes.getGlobalPrices()
    prices.food = 999
    expect(tes.getGlobalPrices().food).toBe(1.0)  // 内部不受影响
  })

  it('注入自定义价格后返回正确值', () => {
    ;(tes as any).globalPrices = { food: 0.8, wood: 1.5, stone: 2.0, gold: 2.5 }
    const prices = tes.getGlobalPrices()
    expect(prices.food).toBe(0.8)
    expect(prices.wood).toBe(1.5)
    expect(prices.stone).toBe(2.0)
    expect(prices.gold).toBe(2.5)
  })

  it('每次调用返回新对象（浅拷贝）', () => {
    const p1 = tes.getGlobalPrices()
    const p2 = tes.getGlobalPrices()
    expect(p1).not.toBe(p2)
  })
})

// ── getLocalPrices ────────────────────────────────────────────────────────────

describe('TradeEconomySystem.getLocalPrices', () => {
  let tes: TradeEconomySystem

  beforeEach(() => {
    tes = makeTES()
  })

  it('无本地价格时返回 null', () => {
    expect(tes.getLocalPrices(1)).toBeNull()
    expect(tes.getLocalPrices(99)).toBeNull()
  })

  it('注入本地价格后可查询', () => {
    ;(tes as any).localPrices.set(3, { food: 1.2, wood: 0.9, stone: 1.5, gold: 2.0 })
    const prices = tes.getLocalPrices(3)
    expect(prices).not.toBeNull()
    expect(prices!.food).toBe(1.2)
    expect(prices!.gold).toBe(2.0)
  })

  it('不同文明价格相互独立', () => {
    ;(tes as any).localPrices.set(1, { food: 1.0, wood: 1.0, stone: 1.0, gold: 1.0 })
    ;(tes as any).localPrices.set(2, { food: 2.0, wood: 2.0, stone: 2.0, gold: 2.0 })
    expect(tes.getLocalPrices(1)!.food).toBe(1.0)
    expect(tes.getLocalPrices(2)!.food).toBe(2.0)
    expect(tes.getLocalPrices(3)).toBeNull()
  })

  it('返回内部引用（修改会影响后续查询）', () => {
    ;(tes as any).localPrices.set(1, { food: 1.0, wood: 1.0, stone: 1.0, gold: 1.0 })
    const prices = tes.getLocalPrices(1)!
    prices.food = 999
    expect(tes.getLocalPrices(1)!.food).toBe(999)  // 是内部引用
  })
})

// ── getGuild ──────────────────────────────────────────────────────────────────

describe('TradeEconomySystem.getGuild', () => {
  let tes: TradeEconomySystem

  beforeEach(() => {
    tes = makeTES()
  })

  it('无工会时返回 null', () => {
    expect(tes.getGuild(1)).toBeNull()
    expect(tes.getGuild(99)).toBeNull()
  })

  it('注入工会后可查询', () => {
    ;(tes as any).guilds.set(5, { level: 3, totalVolume: 1500 })
    const guild = tes.getGuild(5)
    expect(guild).not.toBeNull()
    expect(guild!.level).toBe(3)
    expect(guild!.totalVolume).toBe(1500)
  })

  it('多个文明工会相互独立', () => {
    ;(tes as any).guilds.set(1, { level: 1, totalVolume: 100 })
    ;(tes as any).guilds.set(2, { level: 5, totalVolume: 9999 })
    expect(tes.getGuild(1)!.level).toBe(1)
    expect(tes.getGuild(2)!.level).toBe(5)
    expect(tes.getGuild(3)).toBeNull()
  })

  it('返回内部引用', () => {
    ;(tes as any).guilds.set(1, { level: 1, totalVolume: 0 })
    const guild = tes.getGuild(1)!
    guild.level = 5
    expect(tes.getGuild(1)!.level).toBe(5)
  })
})
