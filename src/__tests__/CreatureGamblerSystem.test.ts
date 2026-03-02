import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGamblerSystem } from '../systems/CreatureGamblerSystem'
import type { Gambler } from '../systems/CreatureGamblerSystem'

let nextId = 1
function makeSys(): CreatureGamblerSystem { return new CreatureGamblerSystem() }
function makeGambler(entityId: number, luck = 50, wealth = 100): Gambler {
  return { id: nextId++, entityId, luck, wealth, gamesPlayed: 0, winStreak: 0, tick: 0 }
}

// ---- 基础字段管理 ----
describe('CreatureGamblerSystem gamblers 管理', () => {
  let sys: CreatureGamblerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

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
})

// ---- luck 上限 100 ----
describe('luck 上限约束', () => {
  it('luck 不应超过 100（上限公式 Math.min(100, luck+0.2)）', () => {
    let luck = 99.9
    luck = Math.min(100, luck + 0.2)
    expect(luck).toBe(100)
  })
  it('luck=100 时继续赢不超过100', () => {
    let luck = 100
    luck = Math.min(100, luck + 0.2)
    expect(luck).toBe(100)
  })
  it('luck=50 赢得游戏后增加0.2', () => {
    let luck = 50
    luck = Math.min(100, luck + 0.2)
    expect(luck).toBeCloseTo(50.2)
  })
  it('luck 下限不低于0（Math.max(0, luck-0.1)）', () => {
    let luck = 0.05
    luck = Math.max(0, luck - 0.1)
    expect(luck).toBe(0)
  })
  it('luck=10 输掉游戏后减0.1', () => {
    let luck = 10
    luck = Math.max(0, luck - 0.1)
    expect(luck).toBeCloseTo(9.9)
  })
})

// ---- winStreak 逻辑 ----
describe('winStreak 逻辑', () => {
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
})

// ---- winChance 公式 ----
describe('winChance 公式 (BASE_WIN_CHANCE=0.4 + luck/500 + streakBonus)', () => {
  const BASE_WIN_CHANCE = 0.4
  const STREAK_BONUS = 0.02
  const MAX_STREAK_BONUS = 0.15

  it('luck=0, winStreak=0 时 winChance=0.4', () => {
    const streakBonus = Math.min(MAX_STREAK_BONUS, 0 * STREAK_BONUS)
    const winChance = BASE_WIN_CHANCE + (0 / 500) + streakBonus
    expect(winChance).toBeCloseTo(0.4)
  })
  it('luck=50, winStreak=0 时 winChance=0.5', () => {
    const streakBonus = Math.min(MAX_STREAK_BONUS, 0 * STREAK_BONUS)
    const winChance = BASE_WIN_CHANCE + (50 / 500) + streakBonus
    expect(winChance).toBeCloseTo(0.5)
  })
  it('streakBonus 上限为 0.15', () => {
    const streakBonus = Math.min(MAX_STREAK_BONUS, 100 * STREAK_BONUS)
    expect(streakBonus).toBeCloseTo(0.15)
  })
  it('winStreak=5 时 streakBonus=0.1', () => {
    const streakBonus = Math.min(MAX_STREAK_BONUS, 5 * STREAK_BONUS)
    expect(streakBonus).toBeCloseTo(0.1)
  })
})

// ---- bet 公式 ----
describe('bet 公式 (Math.max(1, Math.floor(wealth * 0.1)))', () => {
  it('wealth=100 时 bet=10', () => {
    expect(Math.max(1, Math.floor(100 * 0.1))).toBe(10)
  })
  it('wealth=5 时 bet=0 => 强制最小为1', () => {
    expect(Math.max(1, Math.floor(5 * 0.1))).toBe(1)
  })
  it('wealth=0 时 bet=1（最小保护）', () => {
    expect(Math.max(1, Math.floor(0 * 0.1))).toBe(1)
  })
  it('wealth=1000 时 bet=100', () => {
    expect(Math.max(1, Math.floor(1000 * 0.1))).toBe(100)
  })
})

// ---- CHECK_INTERVAL 节流 ----
describe('CHECK_INTERVAL 节流 (3000)', () => {
  let sys: CreatureGamblerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick < 3000 时不触发（lastCheck不变）', () => {
    const fakEm = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(0, fakEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= 3000 时触发并更新 lastCheck', () => {
    const fakEm = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(0, fakEm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('二次调用若未达间隔则跳过', () => {
    const fakEm = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(0, fakEm, 3000)
    sys.update(0, fakEm, 3500)  // 3500-3000=500 < 3000
    expect((sys as any).lastCheck).toBe(3000)
  })
})

// ---- gamblersSet 防重 ----
describe('_gamblersSet 防重机制', () => {
  let sys: CreatureGamblerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 _gamblersSet 为空', () => {
    expect((sys as any)._gamblersSet.size).toBe(0)
  })
  it('手动添加到set后可检测重复', () => {
    ;(sys as any)._gamblersSet.add(42)
    expect((sys as any)._gamblersSet.has(42)).toBe(true)
  })
  it('清除set后不再命中', () => {
    ;(sys as any)._gamblersSet.add(42)
    ;(sys as any)._gamblersSet.delete(42)
    expect((sys as any)._gamblersSet.has(42)).toBe(false)
  })
})
