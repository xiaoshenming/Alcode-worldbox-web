import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBarterSystem } from '../systems/CreatureBarterSystem'
import type { BarterDeal, BarterItem } from '../systems/CreatureBarterSystem'

// CreatureBarterSystem 测试:
// - getDeals()             → 返回内部数组引用（全部交易）
// - getRecentDeals(count)  → slice(-count) 返回最近的 count 条
// update() 依赖 EntityManager，不在此测试。

let nextDealId = 1

function makeBarterSys(): CreatureBarterSystem {
  return new CreatureBarterSystem()
}

function makeDeal(buyerId: number, sellerId: number, tick = 0): BarterDeal {
  return {
    id: nextDealId++,
    buyerId,
    sellerId,
    offeredItem: 'food',
    requestedItem: 'wood',
    fairness: 50,
    tick,
  }
}

describe('CreatureBarterSystem.getDeals', () => {
  let sys: CreatureBarterSystem

  beforeEach(() => { sys = makeBarterSys(); nextDealId = 1 })

  it('初始无交易', () => {
    expect(sys.getDeals()).toHaveLength(0)
  })

  it('注入交易后可查询', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    expect(sys.getDeals()).toHaveLength(1)
    expect(sys.getDeals()[0].buyerId).toBe(1)
    expect(sys.getDeals()[0].sellerId).toBe(2)
  })

  it('返回内部引用', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    expect(sys.getDeals()).toBe((sys as any).deals)
  })

  it('多个交易全部返回', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    ;(sys as any).deals.push(makeDeal(2, 3))
    ;(sys as any).deals.push(makeDeal(3, 4))
    expect(sys.getDeals()).toHaveLength(3)
  })

  it('交易数据完整', () => {
    const d = makeDeal(10, 20)
    d.offeredItem = 'gold'
    d.requestedItem = 'gem'
    d.fairness = 80
    ;(sys as any).deals.push(d)
    const result = sys.getDeals()[0]
    expect(result.offeredItem).toBe('gold')
    expect(result.requestedItem).toBe('gem')
    expect(result.fairness).toBe(80)
  })

  it('支持所有 6 种交易物品类型', () => {
    const items: BarterItem[] = ['food', 'wood', 'stone', 'gold', 'herb', 'gem']
    items.forEach((item, i) => {
      const d = makeDeal(i + 1, i + 10)
      d.offeredItem = item
      ;(sys as any).deals.push(d)
    })
    const deals = sys.getDeals()
    items.forEach((item, i) => { expect(deals[i].offeredItem).toBe(item) })
  })
})

describe('CreatureBarterSystem.getRecentDeals', () => {
  let sys: CreatureBarterSystem

  beforeEach(() => { sys = makeBarterSys(); nextDealId = 1 })

  it('无交易时返回空数组', () => {
    expect(sys.getRecentDeals(5)).toHaveLength(0)
  })

  it('交易少于 count 时全部返回', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    ;(sys as any).deals.push(makeDeal(2, 3))
    expect(sys.getRecentDeals(5)).toHaveLength(2)
  })

  it('交易多于 count 时返回最后 count 条', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).deals.push(makeDeal(i, i + 1, i))
    }
    const recent = sys.getRecentDeals(3)
    expect(recent).toHaveLength(3)
    // 最后3条的 tick 是 7, 8, 9
    expect(recent[0].tick).toBe(7)
    expect(recent[2].tick).toBe(9)
  })

  it('count=1 只返回最后一条', () => {
    ;(sys as any).deals.push(makeDeal(1, 2, 100))
    ;(sys as any).deals.push(makeDeal(3, 4, 200))
    ;(sys as any).deals.push(makeDeal(5, 6, 300))
    const recent = sys.getRecentDeals(1)
    expect(recent).toHaveLength(1)
    expect(recent[0].tick).toBe(300)
  })

  it('返回新数组（不影响内部）', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    expect(sys.getRecentDeals(1)).not.toBe((sys as any).deals)
  })
})
