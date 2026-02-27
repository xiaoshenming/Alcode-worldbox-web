import { describe, it, expect, beforeEach } from 'vitest'
import { AchievementSystem } from '../systems/AchievementSystem'
import type { WorldStats } from '../systems/AchievementSystem'

// AchievementSystem 的纯逻辑测试：
// - getAll()         → 返回所有成就（构造后预置）
// - getUnlocked()    → 只返回已解锁成就
// - getProgress()    → {unlocked, total} 统计
// - updateStats()    → 条件驱动自动解锁
// - recordXxx()      → 内部计数器增量（无返回值，只验证不崩溃 + 状态变化）
// 构造函数无外部依赖，直接 new 即可。

function makeAS(): AchievementSystem {
  return new AchievementSystem()
}

function makeStats(overrides: Partial<WorldStats> = {}): WorldStats {
  return {
    totalPopulation: 0,
    totalCivs: 0,
    totalBuildings: 0,
    totalDeaths: 0,
    totalBirths: 0,
    totalWars: 0,
    maxTechLevel: 0,
    maxCivPopulation: 0,
    worldTick: 0,
    totalKills: 0,
    heroCount: 0,
    tradeRouteCount: 0,
    ...overrides,
  }
}

// ── getAll / 初始状态 ──────────────────────────────────────────────────────────

describe('AchievementSystem.getAll', () => {
  let as: AchievementSystem

  beforeEach(() => {
    as = makeAS()
  })

  it('构造后有预置成就（> 0）', () => {
    expect(as.getAll().length).toBeGreaterThan(0)
  })

  it('初始所有成就未解锁', () => {
    const all = as.getAll()
    expect(all.every(a => !a.unlocked)).toBe(true)
  })

  it('每个成就都有 id/name/description/icon 字段', () => {
    as.getAll().forEach(a => {
      expect(typeof a.id).toBe('string')
      expect(typeof a.name).toBe('string')
      expect(typeof a.description).toBe('string')
      expect(typeof a.icon).toBe('string')
    })
  })
})

// ── getUnlocked ───────────────────────────────────────────────────────────────

describe('AchievementSystem.getUnlocked', () => {
  let as: AchievementSystem

  beforeEach(() => {
    as = makeAS()
  })

  it('初始时未解锁成就为空', () => {
    expect(as.getUnlocked()).toHaveLength(0)
  })

  it('满足条件后成就出现在 getUnlocked', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))  // 解锁 first_life
    expect(as.getUnlocked().length).toBeGreaterThan(0)
  })

  it('解锁的成就 unlocked 字段为 true', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    as.getUnlocked().forEach(a => expect(a.unlocked).toBe(true))
  })
})

// ── getProgress ───────────────────────────────────────────────────────────────

describe('AchievementSystem.getProgress', () => {
  let as: AchievementSystem

  beforeEach(() => {
    as = makeAS()
  })

  it('初始时 unlocked=0, total>0', () => {
    const progress = as.getProgress()
    expect(progress.unlocked).toBe(0)
    expect(progress.total).toBeGreaterThan(0)
  })

  it('解锁一个成就后 unlocked=1', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    expect(as.getProgress().unlocked).toBeGreaterThanOrEqual(1)
  })

  it('total 始终等于 getAll() 的长度', () => {
    expect(as.getProgress().total).toBe(as.getAll().length)
  })
})

// ── updateStats：各成就条件触发 ───────────────────────────────────────────────

describe('AchievementSystem.updateStats 条件触发', () => {
  let as: AchievementSystem

  beforeEach(() => {
    as = makeAS()
  })

  it('totalPopulation >= 1 解锁 first_life', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    expect(as.getUnlocked().some(a => a.id === 'first_life')).toBe(true)
  })

  it('totalPopulation >= 10 解锁 small_village', () => {
    as.updateStats(makeStats({ totalPopulation: 10 }))
    expect(as.getUnlocked().some(a => a.id === 'small_village')).toBe(true)
  })

  it('totalCivs >= 1 解锁 first_civ', () => {
    as.updateStats(makeStats({ totalCivs: 1 }))
    expect(as.getUnlocked().some(a => a.id === 'first_civ')).toBe(true)
  })

  it('totalWars >= 1 解锁 first_war', () => {
    as.updateStats(makeStats({ totalWars: 1 }))
    expect(as.getUnlocked().some(a => a.id === 'first_war')).toBe(true)
  })

  it('maxTechLevel >= 2 解锁 tech_bronze', () => {
    as.updateStats(makeStats({ maxTechLevel: 2 }))
    expect(as.getUnlocked().some(a => a.id === 'tech_bronze')).toBe(true)
  })

  it('条件不满足时不解锁', () => {
    as.updateStats(makeStats({ totalPopulation: 0 }))
    expect(as.getUnlocked()).toHaveLength(0)
  })

  it('同一条件多次 updateStats 不重复解锁', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    const countAfterFirst = as.getUnlocked().length
    as.updateStats(makeStats({ totalPopulation: 1 }))
    expect(as.getUnlocked().length).toBe(countAfterFirst)
  })

  it('heroCount >= 1 解锁 hero_born', () => {
    as.updateStats(makeStats({ heroCount: 1 }))
    expect(as.getUnlocked().some(a => a.id === 'hero_born')).toBe(true)
  })
})

// ── record 计数器方法 ──────────────────────────────────────────────────────────

describe('AchievementSystem record methods', () => {
  let as: AchievementSystem

  beforeEach(() => {
    as = makeAS()
  })

  it('recordDeath 不崩溃', () => {
    expect(() => as.recordDeath()).not.toThrow()
  })

  it('recordBirth 不崩溃', () => {
    expect(() => as.recordBirth()).not.toThrow()
  })

  it('recordWar 不崩溃', () => {
    expect(() => as.recordWar()).not.toThrow()
  })

  it('recordKill 不崩溃', () => {
    expect(() => as.recordKill()).not.toThrow()
  })
})
