import { describe, it, expect, beforeEach } from 'vitest'
import { TradeEconomySystem } from '../systems/TradeEconomySystem'

function makeTES(): TradeEconomySystem {
  return new TradeEconomySystem()
}

// ── globalPrices 私有字段 ─────────────────────────────────────────────────────

describe('TradeEconomySystem globalPrices', () => {
  let tes: TradeEconomySystem

  beforeEach(() => {
    tes = makeTES()
  })

  it('初始globalPrices全部为 1.0', () => {
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
