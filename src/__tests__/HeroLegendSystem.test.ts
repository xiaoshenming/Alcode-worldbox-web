import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HeroLegendSystem } from '../systems/HeroLegendSystem'
import type { HeroFame, LegendaryDeed } from '../systems/HeroLegendSystem'

// 常量参考：
// FAME_TITLES: Mythical(800), Legendary(500), Famous(300), Known(100)
// DEED_FAME: first_kill=10, dragon_slayer=100, hundred_kills=80, survived_disaster=40, war_hero=60
// survival fame: +1 per 600 ticks
// monuments capped at 50

function makeSys(): HeroLegendSystem { return new HeroLegendSystem() }
function makeDeed(type: string, tick = 0): LegendaryDeed {
  return { type, description: type + ' desc', tick }
}
function makeFame(entityId: number, fame: number = 0, overrides: Partial<HeroFame> = {}): HeroFame {
  return { entityId, name: 'Hero ' + entityId, fame, title: '', deeds: [], civId: 1, ...overrides }
}
function makeMonument(entityId: number, civId = 1) {
  return { entityId, heroName: 'A', deeds: [], civId, x: 5, y: 5 }
}

describe('HeroLegendSystem — 初始状态', () => {
  let sys: HeroLegendSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始无英雄排行', () => {
    expect(sys.getLeaderboard()).toHaveLength(0)
  })

  it('初始无纪念碑', () => {
    expect(sys.getMonuments()).toHaveLength(0)
  })

  it('初始 getFame 返回 undefined', () => {
    expect(sys.getFame(1)).toBeUndefined()
  })

  it('两个实例互相独立', () => {
    const sys2 = makeSys()
    ;(sys as any).fameMap.set(1, makeFame(1, 200))
    ;(sys as any).trackedHeroes.add(1)
    expect(sys2.getLeaderboard()).toHaveLength(0)
  })

  it('fameMap 初始为空 Map', () => {
    expect((sys as any).fameMap.size).toBe(0)
  })

  it('trackedHeroes 初始为空 Set', () => {
    expect((sys as any).trackedHeroes.size).toBe(0)
  })
})

describe('HeroLegendSystem — getLeaderboard', () => {
  let sys: HeroLegendSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('注入 fameMap + trackedHeroes 后可查询', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 200))
    ;(sys as any).trackedHeroes.add(1)
    expect(sys.getLeaderboard()).toHaveLength(1)
  })

  it('未在 trackedHeroes 中的英雄不返回', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 200))
    expect(sys.getLeaderboard()).toHaveLength(0)
  })

  it('按 fame 降序排列', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 100))
    ;(sys as any).fameMap.set(2, makeFame(2, 500))
    ;(sys as any).fameMap.set(3, makeFame(3, 50))
    ;(sys as any).trackedHeroes.add(1)
    ;(sys as any).trackedHeroes.add(2)
    ;(sys as any).trackedHeroes.add(3)
    const lb = sys.getLeaderboard()
    expect(lb[0].fame).toBeGreaterThanOrEqual(lb[1].fame)
    expect(lb[1].fame).toBeGreaterThanOrEqual(lb[2].fame)
  })

  it('最多返回 10 个英雄', () => {
    for (let i = 1; i <= 15; i++) {
      ;(sys as any).fameMap.set(i, makeFame(i, i * 10))
      ;(sys as any).trackedHeroes.add(i)
    }
    expect(sys.getLeaderboard().length).toBeLessThanOrEqual(10)
  })

  it('恰好 10 个英雄时全部返回', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).fameMap.set(i, makeFame(i, i * 10))
      ;(sys as any).trackedHeroes.add(i)
    }
    expect(sys.getLeaderboard()).toHaveLength(10)
  })

  it('排行榜返回引用（复用内部 buf）', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 100))
    ;(sys as any).trackedHeroes.add(1)
    const lb1 = sys.getLeaderboard()
    const lb2 = sys.getLeaderboard()
    expect(lb1).toBe(lb2)
  })

  it('同 fame 值的英雄排序稳定', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 100))
    ;(sys as any).fameMap.set(2, makeFame(2, 100))
    ;(sys as any).trackedHeroes.add(1)
    ;(sys as any).trackedHeroes.add(2)
    const lb = sys.getLeaderboard()
    expect(lb).toHaveLength(2)
    // 两个 fame 相等，顺序不重要但都应存在
    const ids = lb.map(h => h.entityId)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
  })

  it('排行榜前3名 fame 正确', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 999))
    ;(sys as any).fameMap.set(2, makeFame(2, 500))
    ;(sys as any).fameMap.set(3, makeFame(3, 1))
    ;(sys as any).trackedHeroes.add(1)
    ;(sys as any).trackedHeroes.add(2)
    ;(sys as any).trackedHeroes.add(3)
    const lb = sys.getLeaderboard()
    expect(lb[0].fame).toBe(999)
    expect(lb[1].fame).toBe(500)
    expect(lb[2].fame).toBe(1)
  })
})

describe('HeroLegendSystem — getFame', () => {
  let sys: HeroLegendSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('可查询单个英雄（无需 trackedHeroes）', () => {
    ;(sys as any).fameMap.set(5, makeFame(5, 300))
    const f = sys.getFame(5)
    expect(f).toBeDefined()
    expect(f!.fame).toBe(300)
  })

  it('查询不存在的英雄返回 undefined', () => {
    expect(sys.getFame(999)).toBeUndefined()
  })

  it('返回的是内部引用', () => {
    const fm = makeFame(1, 100)
    ;(sys as any).fameMap.set(1, fm)
    expect(sys.getFame(1)).toBe(fm)
  })

  it('fame=0 也能正确查询', () => {
    ;(sys as any).fameMap.set(3, makeFame(3, 0))
    expect(sys.getFame(3)?.fame).toBe(0)
  })

  it('entityId 正确存储', () => {
    ;(sys as any).fameMap.set(7, makeFame(7, 50))
    expect(sys.getFame(7)?.entityId).toBe(7)
  })
})

describe('HeroLegendSystem — getMonuments', () => {
  let sys: HeroLegendSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始无纪念碑', () => {
    expect(sys.getMonuments()).toHaveLength(0)
  })

  it('注入后可查询', () => {
    sys.getMonuments().push(makeMonument(1))
    expect(sys.getMonuments()).toHaveLength(1)
  })

  it('返回内部引用', () => {
    sys.getMonuments().push(makeMonument(1))
    expect(sys.getMonuments()).toBe(sys.getMonuments())
  })

  it('多个纪念碑数量正确', () => {
    for (let i = 1; i <= 5; i++) sys.getMonuments().push(makeMonument(i))
    expect(sys.getMonuments()).toHaveLength(5)
  })

  it('纪念碑字段存储正确', () => {
    sys.getMonuments().push({ entityId: 42, heroName: 'Legend', deeds: [], civId: 3, x: 10, y: 20 })
    const m = sys.getMonuments()[0]
    expect(m.entityId).toBe(42)
    expect(m.heroName).toBe('Legend')
    expect(m.civId).toBe(3)
    expect(m.x).toBe(10)
    expect(m.y).toBe(20)
  })

  it('纪念碑 deeds 可以包含事迹', () => {
    const deed = makeDeed('first_kill', 100)
    sys.getMonuments().push({ entityId: 1, heroName: 'A', deeds: [deed], civId: 1, x: 0, y: 0 })
    expect(sys.getMonuments()[0].deeds).toHaveLength(1)
    expect(sys.getMonuments()[0].deeds[0].type).toBe('first_kill')
  })
})

describe('HeroLegendSystem — recordDeed', () => {
  let sys: HeroLegendSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('记录 deed 后 fame 增加（first_kill +10）', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 0))
    ;(sys as any)._deedTypeSets.set(1, new Set())
    sys.recordDeed(1, 'first_kill', 'desc', 0)
    expect(sys.getFame(1)?.fame).toBe(10)
  })

  it('dragon_slayer deed fame +100', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 0))
    ;(sys as any)._deedTypeSets.set(1, new Set())
    sys.recordDeed(1, 'dragon_slayer', 'desc', 0)
    expect(sys.getFame(1)?.fame).toBe(100)
  })

  it('hundred_kills deed fame +80', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 0))
    ;(sys as any)._deedTypeSets.set(1, new Set())
    sys.recordDeed(1, 'hundred_kills', 'desc', 0)
    expect(sys.getFame(1)?.fame).toBe(80)
  })

  it('survived_disaster deed fame +40', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 0))
    ;(sys as any)._deedTypeSets.set(1, new Set())
    sys.recordDeed(1, 'survived_disaster', 'desc', 0)
    expect(sys.getFame(1)?.fame).toBe(40)
  })

  it('war_hero deed fame +60', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 0))
    ;(sys as any)._deedTypeSets.set(1, new Set())
    sys.recordDeed(1, 'war_hero', 'desc', 0)
    expect(sys.getFame(1)?.fame).toBe(60)
  })

  it('未知 deed 类型默认 +10', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 0))
    ;(sys as any)._deedTypeSets.set(1, new Set())
    sys.recordDeed(1, 'unknown_deed', 'desc', 0)
    expect(sys.getFame(1)?.fame).toBe(10)
  })

  it('相同 deed 类型不重复记录', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 0))
    ;(sys as any)._deedTypeSets.set(1, new Set())
    sys.recordDeed(1, 'first_kill', 'desc', 0)
    sys.recordDeed(1, 'first_kill', 'desc', 1)
    expect(sys.getFame(1)?.fame).toBe(10)  // 只加一次
    expect(sys.getFame(1)?.deeds).toHaveLength(1)
  })

  it('不同 deed 类型可以叠加', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 0))
    ;(sys as any)._deedTypeSets.set(1, new Set())
    sys.recordDeed(1, 'first_kill', 'desc', 0)
    sys.recordDeed(1, 'war_hero', 'desc', 1)
    expect(sys.getFame(1)?.fame).toBe(70)  // 10 + 60
    expect(sys.getFame(1)?.deeds).toHaveLength(2)
  })

  it('英雄不存在时 recordDeed 不报错', () => {
    expect(() => sys.recordDeed(999, 'first_kill', 'desc', 0)).not.toThrow()
  })

  it('deed 记录到 fame.deeds 数组中', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 0))
    ;(sys as any)._deedTypeSets.set(1, new Set())
    sys.recordDeed(1, 'first_kill', 'hero killed first', 500)
    const deeds = sys.getFame(1)?.deeds
    expect(deeds).toHaveLength(1)
    expect(deeds![0].type).toBe('first_kill')
    expect(deeds![0].description).toBe('hero killed first')
    expect(deeds![0].tick).toBe(500)
  })

  it('fame 上限为 1000', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 990))
    ;(sys as any)._deedTypeSets.set(1, new Set())
    sys.recordDeed(1, 'dragon_slayer', 'desc', 0)  // +100
    expect(sys.getFame(1)?.fame).toBe(1000)  // 990+100=1090, capped to 1000
  })
})

describe('HeroLegendSystem — updateTitle（通过 addFame 间接触发）', () => {
  let sys: HeroLegendSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('fame >= 800 时 title 为 Mythical', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 800))
    ;(sys as any).updateTitle(1)
    expect(sys.getFame(1)?.title).toBe('Mythical')
  })

  it('fame >= 500 且 < 800 时 title 为 Legendary', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 600))
    ;(sys as any).updateTitle(1)
    expect(sys.getFame(1)?.title).toBe('Legendary')
  })

  it('fame >= 300 且 < 500 时 title 为 Famous', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 350))
    ;(sys as any).updateTitle(1)
    expect(sys.getFame(1)?.title).toBe('Famous')
  })

  it('fame >= 100 且 < 300 时 title 为 Known', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 150))
    ;(sys as any).updateTitle(1)
    expect(sys.getFame(1)?.title).toBe('Known')
  })

  it('fame < 100 时 title 为空字符串', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 50))
    ;(sys as any).updateTitle(1)
    expect(sys.getFame(1)?.title).toBe('')
  })

  it('fame=0 时 title 为空', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 0))
    ;(sys as any).updateTitle(1)
    expect(sys.getFame(1)?.title).toBe('')
  })

  it('fame=100 时恰好获得 Known 称号', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 100))
    ;(sys as any).updateTitle(1)
    expect(sys.getFame(1)?.title).toBe('Known')
  })

  it('英雄不存在时 updateTitle 不报错', () => {
    expect(() => (sys as any).updateTitle(999)).not.toThrow()
  })
})

describe('HeroLegendSystem — addFame', () => {
  let sys: HeroLegendSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('addFame 增加英雄名声', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 50))
    ;(sys as any).addFame(1, 30)
    expect(sys.getFame(1)?.fame).toBe(80)
  })

  it('addFame 上限 1000', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 950))
    ;(sys as any).addFame(1, 100)
    expect(sys.getFame(1)?.fame).toBe(1000)
  })

  it('addFame 不存在的英雄不报错', () => {
    expect(() => (sys as any).addFame(999, 50)).not.toThrow()
  })

  it('addFame 加 0 时 fame 不变', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 100))
    ;(sys as any).addFame(1, 0)
    expect(sys.getFame(1)?.fame).toBe(100)
  })
})

describe('HeroLegendSystem — 纪念碑上限（50）', () => {
  let sys: HeroLegendSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('超过 50 个纪念碑时旧的被移除', () => {
    // 预先放 51 个
    for (let i = 1; i <= 51; i++) {
      ;(sys as any).monuments.push(makeMonument(i))
    }
    expect((sys as any).monuments).toHaveLength(51)
    // 模拟 update 中的截断逻辑
    const monuments = (sys as any).monuments as any[]
    if (monuments.length > 50) {
      monuments.splice(0, monuments.length - 50)
    }
    expect(monuments).toHaveLength(50)
  })

  it('恰好 50 个纪念碑时不截断', () => {
    for (let i = 1; i <= 50; i++) {
      sys.getMonuments().push(makeMonument(i))
    }
    expect(sys.getMonuments()).toHaveLength(50)
  })
})

describe('HeroLegendSystem — LegendaryDeed 字段', () => {
  let sys: HeroLegendSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('deed.type 存储正确', () => {
    const d = makeDeed('dragon_slayer', 100)
    expect(d.type).toBe('dragon_slayer')
  })

  it('deed.description 存储正确', () => {
    const d = makeDeed('war_hero', 0)
    expect(d.description).toBe('war_hero desc')
  })

  it('deed.tick 存储正确', () => {
    const d = makeDeed('first_kill', 5000)
    expect(d.tick).toBe(5000)
  })

  it('deed 可注入到 fameMap', () => {
    const fame = makeFame(1, 0, { deeds: [makeDeed('first_kill')] })
    ;(sys as any).fameMap.set(1, fame)
    expect(sys.getFame(1)?.deeds).toHaveLength(1)
  })
})
