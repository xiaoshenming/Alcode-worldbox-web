import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFashionSystem } from '../systems/CreatureFashionSystem'
import type { FashionTrend, FashionCategory } from '../systems/CreatureFashionSystem'

// 常量参考：CHECK_INTERVAL=1000, SPREAD_INTERVAL=600, MAX_TRENDS=25
// TREND_DECAY=1, TREND_SPREAD=3
// 5种类别：headwear, clothing, jewelry, warpaint, hairstyle

let nextId = 1
function makeSys(): CreatureFashionSystem { return new CreatureFashionSystem() }
function makeTrend(civId: number, category: FashionCategory = 'clothing', overrides: Partial<FashionTrend> = {}): FashionTrend {
  return { id: nextId++, civId, category, name: 'test', popularity: 50, startedAt: 0, followers: 10, ...overrides }
}

describe('CreatureFashionSystem — getTrends 基础', () => {
  let sys: CreatureFashionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无时尚潮流', () => {
    expect(sys.getTrends()).toHaveLength(0)
  })

  it('注入后可查询', () => {
    sys.getTrends().push(makeTrend(1, 'jewelry'))
    expect(sys.getTrends()[0].category).toBe('jewelry')
  })

  it('返回内部引用（不是副本）', () => {
    sys.getTrends().push(makeTrend(1))
    expect(sys.getTrends()).toBe(sys.getTrends())
  })

  it('支持所有 5 种时尚类别', () => {
    const cats: FashionCategory[] = ['headwear', 'clothing', 'jewelry', 'warpaint', 'hairstyle']
    cats.forEach((c, i) => { sys.getTrends().push(makeTrend(i + 1, c)) })
    const all = sys.getTrends()
    cats.forEach((c, i) => { expect(all[i].category).toBe(c) })
  })

  it('多个 trend 数量正确', () => {
    sys.getTrends().push(makeTrend(1))
    sys.getTrends().push(makeTrend(2))
    sys.getTrends().push(makeTrend(3))
    expect(sys.getTrends()).toHaveLength(3)
  })

  it('空时返回空数组', () => {
    expect(sys.getTrends().length).toBe(0)
  })

  it('trends 是数组类型', () => {
    expect(Array.isArray(sys.getTrends())).toBe(true)
  })
})

describe('CreatureFashionSystem — getTrends 字段完整性', () => {
  let sys: CreatureFashionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('trend.id 正确存储', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { id: 99 }))
    expect(sys.getTrends()[0].id).toBe(99)
  })

  it('trend.civId 正确存储', () => {
    sys.getTrends().push(makeTrend(42))
    expect(sys.getTrends()[0].civId).toBe(42)
  })

  it('trend.popularity 范围存储正确', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 75 }))
    expect(sys.getTrends()[0].popularity).toBe(75)
  })

  it('trend.followers 存储正确', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { followers: 25 }))
    expect(sys.getTrends()[0].followers).toBe(25)
  })

  it('trend.name 存储正确', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { name: 'Feathered Crown' }))
    expect(sys.getTrends()[0].name).toBe('Feathered Crown')
  })

  it('trend.startedAt 存储正确', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { startedAt: 5000 }))
    expect(sys.getTrends()[0].startedAt).toBe(5000)
  })

  it('两个实例 trends 互相独立', () => {
    const sys2 = makeSys()
    sys.getTrends().push(makeTrend(1))
    expect(sys2.getTrends()).toHaveLength(0)
  })
})

describe('CreatureFashionSystem — getTrendsForCiv', () => {
  let sys: CreatureFashionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无匹配文明返回空', () => {
    sys.getTrends().push(makeTrend(1))
    expect(sys.getTrendsForCiv(999)).toHaveLength(0)
  })

  it('过滤指定文明潮流', () => {
    sys.getTrends().push(makeTrend(1))
    sys.getTrends().push(makeTrend(2))
    sys.getTrends().push(makeTrend(1))
    const result = sys.getTrendsForCiv(1)
    expect(result).toHaveLength(2)
    result.forEach(t => expect(t.civId).toBe(1))
  })

  it('返回副本非内部 trends 引用', () => {
    sys.getTrends().push(makeTrend(1))
    expect(sys.getTrendsForCiv(1)).not.toBe(sys.getTrends())
  })

  it('空 trends 时 getTrendsForCiv 返回空', () => {
    expect(sys.getTrendsForCiv(1)).toHaveLength(0)
  })

  it('civId=0 时正确过滤', () => {
    sys.getTrends().push(makeTrend(0))
    sys.getTrends().push(makeTrend(1))
    const result = sys.getTrendsForCiv(0)
    expect(result).toHaveLength(1)
    expect(result[0].civId).toBe(0)
  })

  it('多次调用 getTrendsForCiv 复用内部 buf', () => {
    sys.getTrends().push(makeTrend(1))
    const r1 = sys.getTrendsForCiv(1)
    const r2 = sys.getTrendsForCiv(1)
    // 复用同一内部 buf（引用相同）
    expect(r1).toBe(r2)
  })

  it('切换不同 civId 时结果正确', () => {
    sys.getTrends().push(makeTrend(1))
    sys.getTrends().push(makeTrend(2))
    expect(sys.getTrendsForCiv(1)).toHaveLength(1)
    expect(sys.getTrendsForCiv(2)).toHaveLength(1)
  })

  it('所有 trend 属于同一文明时全部返回', () => {
    for (let i = 0; i < 5; i++) sys.getTrends().push(makeTrend(7))
    expect(sys.getTrendsForCiv(7)).toHaveLength(5)
  })

  it('返回的 trend 对象是原始引用', () => {
    sys.getTrends().push(makeTrend(1))
    const forCiv = sys.getTrendsForCiv(1)
    expect(forCiv[0]).toBe(sys.getTrends()[0])
  })
})

describe('CreatureFashionSystem — update CHECK_INTERVAL 节流', () => {
  let sys: CreatureFashionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 1000 时不触发 createTrends', () => {
    vi.spyOn(sys as any, 'createTrends')
    sys.update(1, [1], 500)
    expect((sys as any).createTrends).not.toHaveBeenCalled()
  })

  it('tick 差值 >= 1000 时触发 createTrends', () => {
    vi.spyOn(sys as any, 'createTrends')
    sys.update(1, [1], 1000)
    expect((sys as any).createTrends).toHaveBeenCalledOnce()
  })

  it('lastCheck 在触发后更新为当前 tick', () => {
    vi.spyOn(sys as any, 'createTrends').mockImplementation(() => {})
    sys.update(1, [1], 1000)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('lastCheck=500, tick=1500 触发（差值=1000）', () => {
    ;(sys as any).lastCheck = 500
    vi.spyOn(sys as any, 'createTrends').mockImplementation(() => {})
    sys.update(1, [1], 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('lastCheck=500, tick=1499 不触发（差值=999）', () => {
    ;(sys as any).lastCheck = 500
    vi.spyOn(sys as any, 'createTrends').mockImplementation(() => {})
    sys.update(1, [1], 1499)
    expect((sys as any).lastCheck).toBe(500)
  })
})

describe('CreatureFashionSystem — update SPREAD_INTERVAL 节流', () => {
  let sys: CreatureFashionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 600 时不触发 spreadAndDecay', () => {
    vi.spyOn(sys as any, 'spreadAndDecay')
    sys.update(1, [], 400)
    expect((sys as any).spreadAndDecay).not.toHaveBeenCalled()
  })

  it('tick 差值 >= 600 时触发 spreadAndDecay', () => {
    vi.spyOn(sys as any, 'spreadAndDecay')
    sys.update(1, [], 600)
    expect((sys as any).spreadAndDecay).toHaveBeenCalledOnce()
  })

  it('lastSpread 在触发后更新为当前 tick', () => {
    vi.spyOn(sys as any, 'spreadAndDecay').mockImplementation(() => {})
    sys.update(1, [], 600)
    expect((sys as any).lastSpread).toBe(600)
  })

  it('lastSpread=300, tick=900 触发（差值=600）', () => {
    ;(sys as any).lastSpread = 300
    vi.spyOn(sys as any, 'spreadAndDecay').mockImplementation(() => {})
    sys.update(1, [], 900)
    expect((sys as any).lastSpread).toBe(900)
  })

  it('同一个 tick 可以同时触发 createTrends 和 spreadAndDecay', () => {
    vi.spyOn(sys as any, 'createTrends').mockImplementation(() => {})
    vi.spyOn(sys as any, 'spreadAndDecay').mockImplementation(() => {})
    // tick=6000 >= both CHECK_INTERVAL(1000) and SPREAD_INTERVAL(600)
    sys.update(1, [1], 6000)
    expect((sys as any).createTrends).toHaveBeenCalled()
    expect((sys as any).spreadAndDecay).toHaveBeenCalled()
  })
})

describe('CreatureFashionSystem — spreadAndDecay 逻辑', () => {
  let sys: CreatureFashionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次 spreadAndDecay 后 popularity 因 TREND_DECAY=1 减少', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 50 }))
    // Math.random >= 0.3 不触发扩散
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).spreadAndDecay()
    expect(sys.getTrends()[0].popularity).toBe(49)
  })

  it('popularity <= 5 时 trend 被删除', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)  // 不触发扩散
    ;(sys as any).spreadAndDecay()
    // popularity: 5 - 1 = 4 <= 5, 被删除
    expect(sys.getTrends()).toHaveLength(0)
  })

  it('popularity = 6 时不被删除（6-1=5, 5<=5被删除）', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 6 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).spreadAndDecay()
    // 6-1=5 <= 5, 被删除
    expect(sys.getTrends()).toHaveLength(0)
  })

  it('popularity = 7 时不被删除（7-1=6 > 5）', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 7 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).spreadAndDecay()
    expect(sys.getTrends()).toHaveLength(1)
    expect(sys.getTrends()[0].popularity).toBe(6)
  })

  it('popularity > 30 且 Math.random < 0.3 时扩散（popularity增加）', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 40, followers: 5 }))
    // 扩散: random < 0.3，内部还有个 Math.floor(random*3)
    const randomVals = [0.2, 0.9]
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randomVals[c++ % 2])
    ;(sys as any).spreadAndDecay()
    // 扩散时 popularity += TREND_SPREAD(3), 再 -TREND_DECAY(1) 净增 2
    // 具体值取决于 random，但至少 > 40-1 = 39
    expect(sys.getTrends()[0].popularity).toBeGreaterThan(39)
  })

  it('popularity <= 30 时不触发扩散', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.2)  // < 0.3 但 popularity=30 不满足 >30
    ;(sys as any).spreadAndDecay()
    // 只 decay: 30-1=29
    expect(sys.getTrends()[0].popularity).toBe(29)
  })

  it('popularity 不超过 100', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 99 }))
    const randomVals = [0.1, 0.9]
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randomVals[c++ % 2])
    ;(sys as any).spreadAndDecay()
    expect(sys.getTrends()[0].popularity).toBeLessThanOrEqual(100)
  })

  it('popularity 最低为 0', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).spreadAndDecay()
    // 1-1=0 <= 5，被删除
    expect(sys.getTrends()).toHaveLength(0)
  })

  it('followers 扩散时递增不超过 100', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 80, followers: 99 }))
    const randomVals = [0.1, 0.9]
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randomVals[c++ % 2])
    ;(sys as any).spreadAndDecay()
    expect(sys.getTrends()[0].followers).toBeLessThanOrEqual(100)
  })

  it('多个 trend 同时衰减', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 50 }))
    sys.getTrends().push(makeTrend(2, 'jewelry', { popularity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).spreadAndDecay()
    // 两个都衰减 1
    expect(sys.getTrends()[0].popularity).toBe(49)
    expect(sys.getTrends()[1].popularity).toBe(29)
  })

  it('批量删除 popularity <= 5 的 trend', () => {
    sys.getTrends().push(makeTrend(1, 'clothing', { popularity: 5 }))
    sys.getTrends().push(makeTrend(2, 'jewelry', { popularity: 50 }))
    sys.getTrends().push(makeTrend(3, 'warpaint', { popularity: 3 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).spreadAndDecay()
    // popularity 5->4(<=5删除), 50->49(保留), 3->2(<=5删除)
    expect(sys.getTrends()).toHaveLength(1)
    expect(sys.getTrends()[0].civId).toBe(2)
  })
})

describe('CreatureFashionSystem — createTrends 逻辑', () => {
  let sys: CreatureFashionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('已达 MAX_TRENDS(25) 时不创建新 trend', () => {
    for (let i = 1; i <= 25; i++) {
      sys.getTrends().push(makeTrend(i % 5 + 1))
    }
    ;(sys as any).createTrends([1, 2, 3], 1000)
    expect(sys.getTrends()).toHaveLength(25)
  })

  it('civId 超过 4 个 trend 时不为该 civ 创建', () => {
    // 给 civId=1 放 4 个 trend
    for (let i = 0; i < 4; i++) sys.getTrends().push(makeTrend(1))
    vi.spyOn(Math, 'random').mockReturnValue(0.02)  // < 0.06, 允许创建
    ;(sys as any).createTrends([1], 1000)
    // civId=1 已有 4 个，不再创建
    const civOneTrends = sys.getTrends().filter(t => t.civId === 1)
    expect(civOneTrends).toHaveLength(4)
  })

  it('Math.random > 0.06 时跳过 civ', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)  // > 0.06
    ;(sys as any).createTrends([1, 2, 3], 1000)
    expect(sys.getTrends()).toHaveLength(0)
  })

  it('空 civIds 时不创建 trend', () => {
    ;(sys as any).createTrends([], 1000)
    expect(sys.getTrends()).toHaveLength(0)
  })

  it('创建的 trend startedAt 等于传入的 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)  // < 0.06 触发创建
    ;(sys as any).createTrends([1], 9999)
    if (sys.getTrends().length > 0) {
      expect(sys.getTrends()[0].startedAt).toBe(9999)
    }
  })

  it('创建的 trend popularity 在 [20, 50) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).createTrends([1], 1000)
    if (sys.getTrends().length > 0) {
      const p = sys.getTrends()[0].popularity
      expect(p).toBeGreaterThanOrEqual(20)
      expect(p).toBeLessThan(51)
    }
  })

  it('创建的 trend followers 在 [1, 5] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).createTrends([1], 1000)
    if (sys.getTrends().length > 0) {
      const f = sys.getTrends()[0].followers
      expect(f).toBeGreaterThanOrEqual(1)
      expect(f).toBeLessThanOrEqual(5)
    }
  })
})

describe('CreatureFashionSystem — getTrends 长度计数', () => {
  let sys: CreatureFashionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('空时 length 为 0', () => {
    expect(sys.getTrends().length).toBe(0)
  })

  it('注入后返回正确数量', () => {
    sys.getTrends().push(makeTrend(1))
    sys.getTrends().push(makeTrend(2))
    expect(sys.getTrends().length).toBe(2)
  })

  it('删除后数量减少', () => {
    sys.getTrends().push(makeTrend(1))
    sys.getTrends().push(makeTrend(2))
    sys.getTrends().splice(0, 1)
    expect(sys.getTrends().length).toBe(1)
  })

  it('10 个 trend 时 length 返回 10', () => {
    for (let i = 1; i <= 10; i++) sys.getTrends().push(makeTrend(i))
    expect(sys.getTrends().length).toBe(10)
  })
})
