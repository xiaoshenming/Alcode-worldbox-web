import { describe, it, expect, beforeEach } from 'vitest'
import { AchievementSystem } from '../systems/AchievementSystem'
import type { WorldStats } from '../systems/AchievementSystem'

function makeAS(): AchievementSystem {
  return new AchievementSystem()
}

function makeStats(overrides: Partial<WorldStats> = {}): WorldStats {
  return {
    totalPopulation: 0, totalCivs: 0, totalBuildings: 0,
    totalDeaths: 0, totalBirths: 0, totalWars: 0,
    maxTechLevel: 0, maxCivPopulation: 0, worldTick: 0,
    totalKills: 0, heroCount: 0, tradeRouteCount: 0,
    ...overrides,
  }
}

describe('AchievementSystem.getAll', () => {
  let as: AchievementSystem
  beforeEach(() => { as = makeAS() })

  it('构造后有预置成就（> 0）', () => {
    expect(as.getAll().length).toBeGreaterThan(0)
  })

  it('初始所有成就未解锁', () => {
    const all = as.getAll()
    expect(all.every((a: any) => !a.unlocked)).toBe(true)
  })

  it('每个成就都有 id/name/description/icon 字段', () => {
    as.getAll().forEach((a: any) => {
      expect(typeof a.id).toBe('string')
      expect(typeof a.name).toBe('string')
      expect(typeof a.description).toBe('string')
      expect(typeof a.icon).toBe('string')
    })
  })

  it('成就数量恰好为24', () => {
    expect(as.getAll().length).toBe(24)
  })

  it('每个成就 id 唯一', () => {
    const ids = as.getAll().map((a: any) => a.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('每个成就 condition 是函数', () => {
    as.getAll().forEach((a: any) => {
      expect(typeof a.condition).toBe('function')
    })
  })

  it('所有成就初始 unlockedAt 为 0', () => {
    as.getAll().forEach((a: any) => {
      expect(a.unlockedAt).toBe(0)
    })
  })
})

describe('AchievementSystem.getUnlocked', () => {
  let as: AchievementSystem
  beforeEach(() => { as = makeAS() })

  it('初始时未解锁成就为空', () => {
    expect(as.getUnlocked()).toHaveLength(0)
  })

  it('满足条件后成就出现在 getUnlocked', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    expect(as.getUnlocked().length).toBeGreaterThan(0)
  })

  it('解锁的成就 unlocked 字段为 true', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    as.getUnlocked().forEach((a: any) => expect(a.unlocked).toBe(true))
  })

  it('getUnlocked 返回相同引用（buf 模式）', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    expect(as.getUnlocked()).toBe(as.getUnlocked())
  })

  it('多次解锁后 getUnlocked 数量增加', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    const c1 = as.getUnlocked().length
    as.updateStats(makeStats({ totalPopulation: 10 }))
    expect(as.getUnlocked().length).toBeGreaterThanOrEqual(c1)
  })
})

describe('AchievementSystem.getProgress', () => {
  let as: AchievementSystem
  beforeEach(() => { as = makeAS() })

  it('初始时 unlocked=0, total>0', () => {
    const progress = as.getProgress()
    expect(progress.unlocked).toBe(0)
    expect(progress.total).toBeGreaterThan(0)
  })

  it('解锁一个成就后 unlocked>=1', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    expect(as.getProgress().unlocked).toBeGreaterThanOrEqual(1)
  })

  it('total 始终等于 getAll() 的长度', () => {
    expect(as.getProgress().total).toBe(as.getAll().length)
  })

  it('进度对象有 unlocked 和 total 字段', () => {
    const p = as.getProgress()
    expect(p).toHaveProperty('unlocked')
    expect(p).toHaveProperty('total')
  })

  it('total 在解锁后不变', () => {
    const totalBefore = as.getProgress().total
    as.updateStats(makeStats({ totalPopulation: 200 }))
    expect(as.getProgress().total).toBe(totalBefore)
  })

  it('unlocked 不超过 total', () => {
    as.updateStats(makeStats({ totalPopulation: 200, totalCivs: 5, totalBuildings: 50, totalWars: 5, maxTechLevel: 5, heroCount: 5, tradeRouteCount: 5, totalDeaths: 100, totalBirths: 50, worldTick: 50000, maxCivPopulation: 30 }))
    const p = as.getProgress()
    expect(p.unlocked).toBeLessThanOrEqual(p.total)
  })
})

describe('AchievementSystem.updateStats 条件触发', () => {
  let as: AchievementSystem
  beforeEach(() => { as = makeAS() })

  it('totalPopulation >= 1 解锁 first_life', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'first_life')).toBe(true)
  })

  it('totalPopulation >= 10 解锁 small_village', () => {
    as.updateStats(makeStats({ totalPopulation: 10 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'small_village')).toBe(true)
  })

  it('totalPopulation >= 50 解锁 growing_town', () => {
    as.updateStats(makeStats({ totalPopulation: 50 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'growing_town')).toBe(true)
  })

  it('totalPopulation >= 200 解锁 metropolis', () => {
    as.updateStats(makeStats({ totalPopulation: 200 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'metropolis')).toBe(true)
  })

  it('totalCivs >= 1 解锁 first_civ', () => {
    as.updateStats(makeStats({ totalCivs: 1 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'first_civ')).toBe(true)
  })

  it('totalCivs >= 3 解锁 multi_civ', () => {
    as.updateStats(makeStats({ totalCivs: 3 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'multi_civ')).toBe(true)
  })

  it('totalCivs >= 5 解锁 many_civs', () => {
    as.updateStats(makeStats({ totalCivs: 5 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'many_civs')).toBe(true)
  })

  it('totalWars >= 1 解锁 first_war', () => {
    as.updateStats(makeStats({ totalWars: 1 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'first_war')).toBe(true)
  })

  it('totalWars >= 5 解锁 warmonger', () => {
    as.updateStats(makeStats({ totalWars: 5 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'warmonger')).toBe(true)
  })

  it('maxTechLevel >= 2 解锁 tech_bronze', () => {
    as.updateStats(makeStats({ maxTechLevel: 2 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'tech_bronze')).toBe(true)
  })

  it('maxTechLevel >= 3 解锁 tech_iron', () => {
    as.updateStats(makeStats({ maxTechLevel: 3 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'tech_iron')).toBe(true)
  })

  it('maxTechLevel >= 4 解锁 tech_steel', () => {
    as.updateStats(makeStats({ maxTechLevel: 4 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'tech_steel')).toBe(true)
  })

  it('maxTechLevel >= 5 解锁 tech_max', () => {
    as.updateStats(makeStats({ maxTechLevel: 5 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'tech_max')).toBe(true)
  })

  it('heroCount >= 1 解锁 hero_born', () => {
    as.updateStats(makeStats({ heroCount: 1 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'hero_born')).toBe(true)
  })

  it('heroCount >= 5 解锁 many_heroes', () => {
    as.updateStats(makeStats({ heroCount: 5 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'many_heroes')).toBe(true)
  })

  it('tradeRouteCount >= 1 解锁 first_trade', () => {
    as.updateStats(makeStats({ tradeRouteCount: 1 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'first_trade')).toBe(true)
  })

  it('tradeRouteCount >= 5 解锁 trade_network', () => {
    as.updateStats(makeStats({ tradeRouteCount: 5 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'trade_network')).toBe(true)
  })

  it('totalDeaths >= 100 解锁 mass_death', () => {
    as.updateStats(makeStats({ totalDeaths: 100 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'mass_death')).toBe(true)
  })

  it('totalBirths >= 50 解锁 baby_boom', () => {
    as.updateStats(makeStats({ totalBirths: 50 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'baby_boom')).toBe(true)
  })

  it('worldTick >= 50000 解锁 ancient_world', () => {
    as.updateStats(makeStats({ worldTick: 50000 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'ancient_world')).toBe(true)
  })

  it('worldTick >= 200000 解锁 eternal_world', () => {
    as.updateStats(makeStats({ worldTick: 200000 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'eternal_world')).toBe(true)
  })

  it('maxCivPopulation >= 30 解锁 superpower', () => {
    as.updateStats(makeStats({ maxCivPopulation: 30 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'superpower')).toBe(true)
  })

  it('totalBuildings >= 20 解锁 builder', () => {
    as.updateStats(makeStats({ totalBuildings: 20 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'builder')).toBe(true)
  })

  it('totalBuildings >= 50 解锁 architect', () => {
    as.updateStats(makeStats({ totalBuildings: 50 }))
    expect(as.getUnlocked().some((a: any) => a.id === 'architect')).toBe(true)
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

  it('解锁成就的 unlockedAt 等于传入的 worldTick', () => {
    as.updateStats(makeStats({ totalPopulation: 1, worldTick: 999 }))
    const a = as.getUnlocked().find((x: any) => x.id === 'first_life')
    expect(a).toBeDefined()
    expect((a as any).unlockedAt).toBe(999)
  })
})

describe('AchievementSystem record methods', () => {
  let as: AchievementSystem
  beforeEach(() => { as = makeAS() })

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

  it('recordDeath 100次后内部 totalDeaths 为 100', () => {
    for (let i = 0; i < 100; i++) as.recordDeath()
    expect((as as any).stats.totalDeaths).toBe(100)
  })

  it('recordBirth 50次后内部 totalBirths 为 50', () => {
    for (let i = 0; i < 50; i++) as.recordBirth()
    expect((as as any).stats.totalBirths).toBe(50)
  })

  it('recordWar 5次后内部 totalWars 为 5', () => {
    for (let i = 0; i < 5; i++) as.recordWar()
    expect((as as any).stats.totalWars).toBe(5)
  })

  it('recordKill 10次后内部 totalKills 为 10', () => {
    for (let i = 0; i < 10; i++) as.recordKill()
    expect((as as any).stats.totalKills).toBe(10)
  })
})

describe('AchievementSystem notifications', () => {
  let as: AchievementSystem
  beforeEach(() => { as = makeAS() })

  it('解锁成就后 notifications 列表增加', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    expect((as as any).notifications.length).toBeGreaterThan(0)
  })

  it('updateNotifications 不崩溃', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    expect(() => as.updateNotifications()).not.toThrow()
  })

  it('updateNotifications 多次调用后 alpha 减少', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    const alphaBefore = (as as any).notifications[0]?.alpha
    as.updateNotifications()
    const alphaAfter = (as as any).notifications[0]?.alpha
    if (alphaBefore !== undefined && alphaAfter !== undefined) {
      expect(alphaAfter).toBeLessThan(alphaBefore)
    }
  })

  it('alpha 降至 0 后通知被移除', () => {
    as.updateStats(makeStats({ totalPopulation: 1 }))
    const n = (as as any).notifications[0]
    if (n) {
      n.alpha = 0.005
      as.updateNotifications()
      expect((as as any).notifications).toHaveLength(0)
    }
  })
})
