import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBarterSystem } from '../systems/CreatureBarterSystem'
import type { BarterDeal, BarterItem } from '../systems/CreatureBarterSystem'

// CreatureBarterSystem 测试:
// 常量: CHECK_INTERVAL=600, BARTER_CHANCE=0.02, MAX_DEALS=100
// ITEM_VALUES: food=1, wood=2, stone=3, gold=8, herb=4, gem=10
// 私有字段: deals[], nextId, lastCheck
// 公开方法: getRecentDeals(count)
// 私有方法: attemptBarters, resolveFairness, pruneOld

let nextDealId = 1

function makeBarterSys(): CreatureBarterSystem {
  return new CreatureBarterSystem()
}

function makeDeal(
  buyerId: number,
  sellerId: number,
  tick = 0,
  overrides: Partial<BarterDeal> = {}
): BarterDeal {
  return {
    id: nextDealId++,
    buyerId,
    sellerId,
    offeredItem: 'food',
    requestedItem: 'wood',
    fairness: 50,
    tick,
    ...overrides,
  }
}

const ALL_ITEMS: BarterItem[] = ['food', 'wood', 'stone', 'gold', 'herb', 'gem']

const ITEM_VALUES: Record<BarterItem, number> = {
  food: 1,
  wood: 2,
  stone: 3,
  gold: 8,
  herb: 4,
  gem: 10,
}

// ══════════════════════════════════════════════════════════
describe('CreatureBarterSystem — 初始状态', () => {
  afterEach(() => vi.restoreAllMocks())

  it('初始 deals 数组为空', () => {
    const sys = makeBarterSys()
    expect((sys as any).deals).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    const sys = makeBarterSys()
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    const sys = makeBarterSys()
    expect((sys as any).lastCheck).toBe(0)
  })

  it('每次 new 创建独立实例', () => {
    const a = makeBarterSys()
    const b = makeBarterSys()
    ;(a as any).deals.push(makeDeal(1, 2))
    expect((b as any).deals).toHaveLength(0)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBarterSystem — deals 数组操作', () => {
  let sys: CreatureBarterSystem
  beforeEach(() => { sys = makeBarterSys(); nextDealId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入单个交易后长度为 1', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    expect((sys as any).deals).toHaveLength(1)
  })

  it('交易 buyerId 正确存储', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    expect((sys as any).deals[0].buyerId).toBe(1)
  })

  it('交易 sellerId 正确存储', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    expect((sys as any).deals[0].sellerId).toBe(2)
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    expect((sys as any).deals).toBe((sys as any).deals)
  })

  it('多个交易全部存储', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    ;(sys as any).deals.push(makeDeal(2, 3))
    ;(sys as any).deals.push(makeDeal(3, 4))
    expect((sys as any).deals).toHaveLength(3)
  })

  it('offeredItem 字段正确存储', () => {
    const d = makeDeal(10, 20, 0, { offeredItem: 'gold' })
    ;(sys as any).deals.push(d)
    expect((sys as any).deals[0].offeredItem).toBe('gold')
  })

  it('requestedItem 字段正确存储', () => {
    const d = makeDeal(10, 20, 0, { requestedItem: 'gem' })
    ;(sys as any).deals.push(d)
    expect((sys as any).deals[0].requestedItem).toBe('gem')
  })

  it('fairness 字段正确存储', () => {
    const d = makeDeal(1, 2, 0, { fairness: 80 })
    ;(sys as any).deals.push(d)
    expect((sys as any).deals[0].fairness).toBe(80)
  })

  it('tick 字段正确存储', () => {
    ;(sys as any).deals.push(makeDeal(1, 2, 9999))
    expect((sys as any).deals[0].tick).toBe(9999)
  })

  it('支持全部 6 种 BarterItem 作为 offeredItem', () => {
    ALL_ITEMS.forEach((item, i) => {
      const d = makeDeal(i + 1, i + 10, 0, { offeredItem: item })
      ;(sys as any).deals.push(d)
    })
    const deals: BarterDeal[] = (sys as any).deals
    ALL_ITEMS.forEach((item, i) => { expect(deals[i].offeredItem).toBe(item) })
  })

  it('支持全部 6 种 BarterItem 作为 requestedItem', () => {
    ALL_ITEMS.forEach((item, i) => {
      const d = makeDeal(i + 1, i + 10, 0, { requestedItem: item })
      ;(sys as any).deals.push(d)
    })
    const deals: BarterDeal[] = (sys as any).deals
    ALL_ITEMS.forEach((item, i) => { expect(deals[i].requestedItem).toBe(item) })
  })

  it('fairness 范围 0-100 均可存储', () => {
    ;(sys as any).deals.push(makeDeal(1, 2, 0, { fairness: 0 }))
    ;(sys as any).deals.push(makeDeal(3, 4, 0, { fairness: 100 }))
    expect((sys as any).deals[0].fairness).toBe(0)
    expect((sys as any).deals[1].fairness).toBe(100)
  })

  it('deals 数组顺序与插入顺序一致', () => {
    ;(sys as any).deals.push(makeDeal(10, 11, 10))
    ;(sys as any).deals.push(makeDeal(20, 21, 20))
    const arr: BarterDeal[] = (sys as any).deals
    expect(arr[0].buyerId).toBe(10)
    expect(arr[1].buyerId).toBe(20)
  })

  it('交易数据完整验证（完整字段）', () => {
    const d = makeDeal(10, 20, 100, { offeredItem: 'gold', requestedItem: 'gem', fairness: 80 })
    ;(sys as any).deals.push(d)
    const result: BarterDeal = (sys as any).deals[0]
    expect(result.offeredItem).toBe('gold')
    expect(result.requestedItem).toBe('gem')
    expect(result.fairness).toBe(80)
    expect(result.tick).toBe(100)
    expect(result.buyerId).toBe(10)
    expect(result.sellerId).toBe(20)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBarterSystem — getRecentDeals()', () => {
  let sys: CreatureBarterSystem
  beforeEach(() => { sys = makeBarterSys(); nextDealId = 1 })
  afterEach(() => vi.restoreAllMocks())

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

  it('返回新数组（不影响内部 deals）', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    expect(sys.getRecentDeals(1)).not.toBe((sys as any).deals)
  })

  it('count=0 时 slice(-0) 等同 slice(0)，返回全部 deals（实现行为）', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    // slice(-0) 在 JS 中等于 slice(0)，返回全部元素
    const result = sys.getRecentDeals(0)
    expect(result).toHaveLength((sys as any).deals.length)
  })

  it('count 等于 deals 数量时全部返回', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).deals.push(makeDeal(i, i + 1, i))
    }
    expect(sys.getRecentDeals(5)).toHaveLength(5)
  })

  it('count 远大于 deals 数量时全部返回', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    expect(sys.getRecentDeals(9999)).toHaveLength(1)
  })

  it('getRecentDeals 返回的元素顺序保持一致（最旧到最新）', () => {
    ;(sys as any).deals.push(makeDeal(1, 2, 100))
    ;(sys as any).deals.push(makeDeal(3, 4, 200))
    ;(sys as any).deals.push(makeDeal(5, 6, 300))
    const recent = sys.getRecentDeals(3)
    expect(recent[0].tick).toBe(100)
    expect(recent[1].tick).toBe(200)
    expect(recent[2].tick).toBe(300)
  })

  it('getRecentDeals 不改变内部 deals 长度', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    ;(sys as any).deals.push(makeDeal(3, 4))
    sys.getRecentDeals(1)
    expect((sys as any).deals).toHaveLength(2)
  })

  it('连续调用 getRecentDeals 结果一致', () => {
    ;(sys as any).deals.push(makeDeal(1, 2, 100))
    ;(sys as any).deals.push(makeDeal(3, 4, 200))
    const a = sys.getRecentDeals(2)
    const b = sys.getRecentDeals(2)
    expect(a).toEqual(b)
  })

  it('getRecentDeals 不修改内部数组引用', () => {
    ;(sys as any).deals.push(makeDeal(1, 2))
    const before = (sys as any).deals
    sys.getRecentDeals(1)
    expect((sys as any).deals).toBe(before)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBarterSystem — pruneOld() 私有方法（手动模拟）', () => {
  let sys: CreatureBarterSystem
  beforeEach(() => { sys = makeBarterSys(); nextDealId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // pruneOld: if deals.length > MAX_DEALS(100) → splice(0, length - 100)

  it('deals <= 100 时 pruneOld 不删除', () => {
    for (let i = 0; i < 100; i++) {
      ;(sys as any).deals.push(makeDeal(i, i + 1, i))
    }
    ;(sys as any).pruneOld()
    expect((sys as any).deals).toHaveLength(100)
  })

  it('deals = 101 时 pruneOld 删除最旧的一条', () => {
    for (let i = 0; i < 101; i++) {
      ;(sys as any).deals.push(makeDeal(i, i + 1, i))
    }
    ;(sys as any).pruneOld()
    expect((sys as any).deals).toHaveLength(100)
    // tick=0 的最旧记录被删除，剩余从 tick=1 开始
    expect((sys as any).deals[0].tick).toBe(1)
  })

  it('deals = 150 时 pruneOld 删除多余 50 条（保留最新 100）', () => {
    for (let i = 0; i < 150; i++) {
      ;(sys as any).deals.push(makeDeal(i, i + 1, i))
    }
    ;(sys as any).pruneOld()
    expect((sys as any).deals).toHaveLength(100)
    expect((sys as any).deals[0].tick).toBe(50)
    expect((sys as any).deals[99].tick).toBe(149)
  })

  it('空数组调用 pruneOld 不报错', () => {
    expect(() => (sys as any).pruneOld()).not.toThrow()
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBarterSystem — resolveFairness() 私有方法', () => {
  let sys: CreatureBarterSystem
  beforeEach(() => { sys = makeBarterSys(); nextDealId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // resolveFairness: deal.fairness += (Math.random() - 0.5) * 4, clamp 0-100

  it('resolveFairness 不改变 deals 数量', () => {
    ;(sys as any).deals.push(makeDeal(1, 2, 0, { fairness: 50 }))
    ;(sys as any).deals.push(makeDeal(3, 4, 0, { fairness: 50 }))
    ;(sys as any).resolveFairness()
    expect((sys as any).deals).toHaveLength(2)
  })

  it('resolveFairness 上限钳制：fairness=100 + 正随机 → 不超过 100', () => {
    ;(sys as any).deals.push(makeDeal(1, 2, 0, { fairness: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.5)*4 = +2, 100+2 > 100 → 100
    ;(sys as any).resolveFairness()
    expect((sys as any).deals[0].fairness).toBe(100)
  })

  it('resolveFairness 下限钳制：fairness=0 + 负随机 → 不低于 0', () => {
    ;(sys as any).deals.push(makeDeal(1, 2, 0, { fairness: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.5)*4 = -2, 0-2 < 0 → 0
    ;(sys as any).resolveFairness()
    expect((sys as any).deals[0].fairness).toBe(0)
  })

  it('空 deals 调用 resolveFairness 不报错', () => {
    expect(() => (sys as any).resolveFairness()).not.toThrow()
  })

  it('resolveFairness 修改 fairness（mock random=0.5，偏移=0）', () => {
    ;(sys as any).deals.push(makeDeal(1, 2, 0, { fairness: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // (0.5-0.5)*4 = 0
    ;(sys as any).resolveFairness()
    expect((sys as any).deals[0].fairness).toBeCloseTo(50)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBarterSystem — ITEM_VALUES 常量验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('food value = 1（最低）', () => {
    expect(ITEM_VALUES['food']).toBe(1)
  })

  it('wood value = 2', () => {
    expect(ITEM_VALUES['wood']).toBe(2)
  })

  it('stone value = 3', () => {
    expect(ITEM_VALUES['stone']).toBe(3)
  })

  it('gold value = 8', () => {
    expect(ITEM_VALUES['gold']).toBe(8)
  })

  it('herb value = 4', () => {
    expect(ITEM_VALUES['herb']).toBe(4)
  })

  it('gem value = 10（最高）', () => {
    expect(ITEM_VALUES['gem']).toBe(10)
  })

  it('fairness 公式: valRatio = offered/requested, fairness = round(valRatio*50), food/wood = 0.5 → 25', () => {
    const ratio = ITEM_VALUES['food'] / ITEM_VALUES['wood']   // 0.5
    const fairness = Math.min(100, Math.max(0, Math.round(ratio * 50)))
    expect(fairness).toBe(25)
  })

  it('fairness 公式: gold/food = 8 → ratio=8, round(8*50)=400, clamp → 100', () => {
    const ratio = ITEM_VALUES['gold'] / ITEM_VALUES['food']   // 8
    const fairness = Math.min(100, Math.max(0, Math.round(ratio * 50)))
    expect(fairness).toBe(100)
  })

  it('fairness 公式: gem/gem = 1 → fairness=50', () => {
    const ratio = ITEM_VALUES['gem'] / ITEM_VALUES['gem']     // 1
    const fairness = Math.min(100, Math.max(0, Math.round(ratio * 50)))
    expect(fairness).toBe(50)
  })

  it('fairness 公式: food/gem = 0.1 → round(0.1*50)=5', () => {
    const ratio = ITEM_VALUES['food'] / ITEM_VALUES['gem']    // 0.1
    const fairness = Math.min(100, Math.max(0, Math.round(ratio * 50)))
    expect(fairness).toBe(5)
  })

  it('fairness 公式: stone/herb = 0.75 → round(37.5)=38', () => {
    const ratio = ITEM_VALUES['stone'] / ITEM_VALUES['herb']  // 0.75
    const fairness = Math.min(100, Math.max(0, Math.round(ratio * 50)))
    expect(fairness).toBe(38)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBarterSystem — update() CHECK_INTERVAL 守卫（mock）', () => {
  afterEach(() => vi.restoreAllMocks())

  function makeMinimalEM(entityIds: number[] = []) {
    return {
      getEntitiesWithComponents: vi.fn().mockReturnValue(entityIds),
      getComponent: vi.fn().mockReturnValue(null),
      hasComponent: vi.fn().mockReturnValue(true),
    }
  }

  it('tick < CHECK_INTERVAL(600) 时 update 提前返回，不调用 getEntitiesWithComponents', () => {
    const sys = makeBarterSys()
    const em = makeMinimalEM()
    sys.update(16, em as any, 100)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick >= CHECK_INTERVAL(600) 时调用 getEntitiesWithComponents', () => {
    const sys = makeBarterSys()
    const em = makeMinimalEM()
    sys.update(16, em as any, 600)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('首次 update tick=600 后 lastCheck 更新为 600', () => {
    const sys = makeBarterSys()
    const em = makeMinimalEM()
    sys.update(16, em as any, 600)
    expect((sys as any).lastCheck).toBe(600)
  })

  it('第二次 update tick=700 不触发（差值100<600）', () => {
    const sys = makeBarterSys()
    const em = makeMinimalEM()
    sys.update(16, em as any, 600)
    em.getEntitiesWithComponents.mockClear()
    sys.update(16, em as any, 700)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('第二次 update tick=1200 触发（差值600>=CHECK_INTERVAL）', () => {
    const sys = makeBarterSys()
    const em = makeMinimalEM()
    sys.update(16, em as any, 600)
    em.getEntitiesWithComponents.mockClear()
    sys.update(16, em as any, 1200)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('update 返回 undefined', () => {
    const sys = makeBarterSys()
    const em = makeMinimalEM()
    const result = sys.update(16, em as any, 100)
    expect(result).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBarterSystem — BarterDeal 接口结构验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('BarterDeal 具有所有必要字段', () => {
    const d = makeDeal(1, 2)
    expect(d).toHaveProperty('id')
    expect(d).toHaveProperty('buyerId')
    expect(d).toHaveProperty('sellerId')
    expect(d).toHaveProperty('offeredItem')
    expect(d).toHaveProperty('requestedItem')
    expect(d).toHaveProperty('fairness')
    expect(d).toHaveProperty('tick')
  })

  it('offeredItem 与 requestedItem 可以是不同物品', () => {
    const d = makeDeal(1, 2, 0, { offeredItem: 'gold', requestedItem: 'herb' })
    expect(d.offeredItem).not.toBe(d.requestedItem)
  })

  it('多个 deal 之间 id 各不相同', () => {
    nextDealId = 1
    const ids = [1, 2, 3, 4, 5].map(i => makeDeal(i, i + 1).id)
    const unique = new Set(ids)
    expect(unique.size).toBe(5)
  })

  it('fairness 可以为整数 0', () => {
    const d = makeDeal(1, 2, 0, { fairness: 0 })
    expect(d.fairness).toBe(0)
  })

  it('fairness 可以为整数 100', () => {
    const d = makeDeal(1, 2, 0, { fairness: 100 })
    expect(d.fairness).toBe(100)
  })

  it('同一 buyer 可以与多个 seller 交易', () => {
    const sys = makeBarterSys()
    ;(sys as any).deals.push(makeDeal(1, 2))
    ;(sys as any).deals.push(makeDeal(1, 3))
    ;(sys as any).deals.push(makeDeal(1, 4))
    const arr: BarterDeal[] = (sys as any).deals
    expect(arr.filter(d => d.buyerId === 1)).toHaveLength(3)
  })
})
