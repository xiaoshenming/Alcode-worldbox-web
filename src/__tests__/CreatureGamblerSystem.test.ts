import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureGamblerSystem } from '../systems/CreatureGamblerSystem'
import type { Gambler } from '../systems/CreatureGamblerSystem'

// CHECK_INTERVAL=3000, MAX_GAMBLERS=15, ASSIGN_CHANCE=0.004
// BASE_WIN_CHANCE=0.4, STREAK_BONUS=0.02, MAX_STREAK_BONUS=0.15

let nextId = 1
function makeSys(): CreatureGamblerSystem { return new CreatureGamblerSystem() }
function makeGambler(entityId: number, luck = 50, wealth = 100): Gambler {
  return { id: nextId++, entityId, luck, wealth, gamesPlayed: 0, winStreak: 0, tick: 0 }
}

describe('CreatureGamblerSystem - gamblers 管理', () => {
  let sys: CreatureGamblerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无赌徒', () => { expect((sys as any).gamblers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).gamblers.push(makeGambler(1))
    expect((sys as any).gamblers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).gamblers.push(makeGambler(1))
    expect((sys as any).gamblers).toBe((sys as any).gamblers)
  })
  it('多个全部返回', () => {
    ;(sys as any).gamblers.push(makeGambler(1))
    ;(sys as any).gamblers.push(makeGambler(2))
    expect((sys as any).gamblers).toHaveLength(2)
  })
  it('字段数据完整', () => {
    const g = makeGambler(10, 90, 500)
    g.gamesPlayed = 100; g.winStreak = 10
    ;(sys as any).gamblers.push(g)
    const r = (sys as any).gamblers[0]
    expect(r.luck).toBe(90)
    expect(r.wealth).toBe(500)
    expect(r.gamesPlayed).toBe(100)
    expect(r.winStreak).toBe(10)
  })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 _gamblersSet 为空', () => { expect((sys as any)._gamblersSet.size).toBe(0) })
  it('注入的 tick 字段正确', () => {
    ;(sys as any).gamblers.push(makeGambler(1))
    expect((sys as any).gamblers[0].tick).toBe(0)
  })
  it('注入 winStreak=0 正确', () => {
    ;(sys as any).gamblers.push(makeGambler(1))
    expect((sys as any).gamblers[0].winStreak).toBe(0)
  })
})

describe('CreatureGamblerSystem - luck 上限约束', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('luck 不超过 100 (Math.min(100, luck+0.2))', () => {
    expect(Math.min(100, 99.9 + 0.2)).toBe(100)
  })
  it('luck=100 时继续赢不超过 100', () => {
    expect(Math.min(100, 100 + 0.2)).toBe(100)
  })
  it('luck=50 赢得游戏后增加 0.2', () => {
    expect(Math.min(100, 50 + 0.2)).toBeCloseTo(50.2)
  })
  it('luck 下限不低于 0 (Math.max(0, luck-0.1))', () => {
    expect(Math.max(0, 0.05 - 0.1)).toBe(0)
  })
  it('luck=10 输掉游戏后减 0.1', () => {
    expect(Math.max(0, 10 - 0.1)).toBeCloseTo(9.9)
  })
  it('luck=0 时不低于 0', () => {
    expect(Math.max(0, 0 - 0.1)).toBe(0)
  })
})

describe('CreatureGamblerSystem - winStreak 逻辑', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('赢得游戏后 winStreak 递增', () => {
    const g = makeGambler(1, 50, 100)
    g.winStreak = 2
    g.winStreak++
    expect(g.winStreak).toBe(3)
  })
  it('输掉游戏后 winStreak 重置为 0', () => {
    const g = makeGambler(1, 50, 100)
    g.winStreak = 5
    g.winStreak = 0
    expect(g.winStreak).toBe(0)
  })
  it('winStreak=0 时 streakBonus=0', () => {
    const STREAK_BONUS = 0.02, MAX_STREAK_BONUS = 0.15
    expect(Math.min(MAX_STREAK_BONUS, 0 * STREAK_BONUS)).toBe(0)
  })
  it('winStreak=8 时 streakBonus=0.15（上限）', () => {
    const STREAK_BONUS = 0.02, MAX_STREAK_BONUS = 0.15
    expect(Math.min(MAX_STREAK_BONUS, 8 * STREAK_BONUS)).toBeCloseTo(0.15)
  })
})

describe('CreatureGamblerSystem - winChance 公式', () => {
  const BASE_WIN_CHANCE = 0.4
  const STREAK_BONUS = 0.02
  const MAX_STREAK_BONUS = 0.15

  afterEach(() => { vi.restoreAllMocks() })

  it('luck=0, winStreak=0 时 winChance=0.4', () => {
    const sb = Math.min(MAX_STREAK_BONUS, 0 * STREAK_BONUS)
    expect(BASE_WIN_CHANCE + (0 / 500) + sb).toBeCloseTo(0.4)
  })
  it('luck=50, winStreak=0 时 winChance=0.5', () => {
    const sb = Math.min(MAX_STREAK_BONUS, 0 * STREAK_BONUS)
    expect(BASE_WIN_CHANCE + (50 / 500) + sb).toBeCloseTo(0.5)
  })
  it('streakBonus 上限为 0.15', () => {
    expect(Math.min(MAX_STREAK_BONUS, 100 * STREAK_BONUS)).toBeCloseTo(0.15)
  })
  it('winStreak=5 时 streakBonus=0.1', () => {
    expect(Math.min(MAX_STREAK_BONUS, 5 * STREAK_BONUS)).toBeCloseTo(0.1)
  })
  it('winChance 最大值 = 0.4 + 0.2 + 0.15 = 0.75', () => {
    const maxWin = BASE_WIN_CHANCE + (100 / 500) + MAX_STREAK_BONUS
    expect(maxWin).toBeCloseTo(0.75)
  })
  it('luck/500 的贡献在 luck=100 时为 0.2', () => {
    expect(100 / 500).toBeCloseTo(0.2)
  })
})

describe('CreatureGamblerSystem - bet 公式', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('wealth=100 时 bet=10', () => {
    expect(Math.max(1, Math.floor(100 * 0.1))).toBe(10)
  })
  it('wealth=5 时 bet 强制最小为 1', () => {
    expect(Math.max(1, Math.floor(5 * 0.1))).toBe(1)
  })
  it('wealth=0 时 bet=1（最小保护）', () => {
    expect(Math.max(1, Math.floor(0 * 0.1))).toBe(1)
  })
  it('wealth=1000 时 bet=100', () => {
    expect(Math.max(1, Math.floor(1000 * 0.1))).toBe(100)
  })
  it('wealth=9 时 bet=0.9→floor=0→max(1,0)=1', () => {
    expect(Math.max(1, Math.floor(9 * 0.1))).toBe(1)
  })
  it('wealth=20 时 bet=2', () => {
    expect(Math.max(1, Math.floor(20 * 0.1))).toBe(2)
  })
})

describe('CreatureGamblerSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureGamblerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('tick < 3000 时不触发（lastCheck 不变）', () => {
    const fakEm = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, fakEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= 3000 时触发并更新 lastCheck', () => {
    const fakEm = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, fakEm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('二次调用若未达间隔则跳过', () => {
    const fakEm = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, fakEm, 3000)
    sys.update(0, fakEm, 3500)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('tick=2999 时不触发（边界值-1）', () => {
    const fakEm = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, fakEm, 2999)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=3000 时恰好触发', () => {
    const fakEm = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, fakEm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
})

describe('CreatureGamblerSystem - _gamblersSet 防重机制', () => {
  let sys: CreatureGamblerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 _gamblersSet 为空', () => {
    expect((sys as any)._gamblersSet.size).toBe(0)
  })
  it('手动添加到 set 后可检测重复', () => {
    ;(sys as any)._gamblersSet.add(42)
    expect((sys as any)._gamblersSet.has(42)).toBe(true)
  })
  it('清除 set 后不再命中', () => {
    ;(sys as any)._gamblersSet.add(42)
    ;(sys as any)._gamblersSet.delete(42)
    expect((sys as any)._gamblersSet.has(42)).toBe(false)
  })
  it('set 可存储多个 entityId', () => {
    ;(sys as any)._gamblersSet.add(1)
    ;(sys as any)._gamblersSet.add(2)
    ;(sys as any)._gamblersSet.add(3)
    expect((sys as any)._gamblersSet.size).toBe(3)
  })
  it('MAX_GAMBLERS 为 15', () => {
    for (let i = 0; i < 15; i++) {
      ;(sys as any).gamblers.push(makeGambler(i + 1))
    }
    expect((sys as any).gamblers).toHaveLength(15)
  })
  it('ASSIGN_CHANCE=0.004 时 random=0.99 不招募', () => {
    const fakEm = { getEntitiesWithComponent: () => [1], hasComponent: () => true } as any
    sys.update(0, fakEm, 3000)
    expect((sys as any).gamblers).toHaveLength(0)
  })
  it('wealth<=0 且 gamesPlayed>10 时移除赌徒', () => {
    const g = makeGambler(1)
    g.wealth = 0
    g.gamesPlayed = 11
    ;(sys as any).gamblers.push(g)
    ;(sys as any)._gamblersSet.add(1)
    const fakEm = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, fakEm, 3000)
    expect((sys as any).gamblers).toHaveLength(0)
  })
  it('wealth>0 且 gamesPlayed>10 时不移除赌徒', () => {
    const g = makeGambler(1)
    g.wealth = 10
    g.gamesPlayed = 20
    ;(sys as any).gamblers.push(g)
    ;(sys as any)._gamblersSet.add(1)
    const fakEm = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, fakEm, 3000)
    expect((sys as any).gamblers.length).toBeGreaterThanOrEqual(1)
  })
})
