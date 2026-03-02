import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AchievementContentSystem } from '../systems/AchievementContentSystem'
import type { WorldStats, Achievement } from '../systems/AchievementContentSystem'

function makeSys(): AchievementContentSystem {
  return new AchievementContentSystem()
}

const makeStats = (overrides?: Partial<WorldStats>): WorldStats => ({
  totalCreatures: 0,
  speciesSet: [],
  maxCityPop: 0,
  filledTilePercent: 0,
  hasIsland: false,
  totalKills: 0,
  extinctSpecies: [],
  scorchedTiles: 0,
  disastersLast60Ticks: 0,
  nukeUsed: false,
  civsMet: 0,
  activeTradeRoutes: 0,
  maxEra: 'stone',
  peaceTicks: 0,
  maxTerritoryPercent: 0,
  totalCombats: 0,
  shipCount: 0,
  citiesCaptured: 0,
  maxHeroLevel: 0,
  maxArmySize: 0,
  volcanoEruptions: 0,
  waterTilesCreatedAtOnce: 0,
  diseasedCivs: 0,
  evolutionEvents: 0,
  coexistSpecies: 0,
  coexistTicks: 0,
  totalTicks: 0,
  exploredPercent: 0,
  totalCivs: 0,
  totalWars: 0,
  clonedCreatures: 0,
  portalPairs: 0,
  ...overrides,
})

describe('AchievementContentSystem', () => {
  let sys: AchievementContentSystem

  beforeEach(() => {
    sys = makeSys()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===== 初始状态 =====
  describe('初始状态', () => {
    it('可以实例化', () => {
      expect(sys).toBeDefined()
    })

    it('achievements 列表非空', () => {
      expect((sys as any).achievements.length).toBeGreaterThan(0)
    })

    it('共有30个成就定义', () => {
      expect((sys as any).achievements.length).toBe(30)
    })

    it('所有成就初始 unlocked 为 false', () => {
      const all: Achievement[] = (sys as any).achievements
      expect(all.every(a => !a.unlocked)).toBe(true)
    })

    it('所有成就初始 unlockTick 为 null', () => {
      const all: Achievement[] = (sys as any).achievements
      expect(all.every(a => a.unlockTick === null)).toBe(true)
    })

    it('每个成就都有唯一的 id', () => {
      const all: Achievement[] = (sys as any).achievements
      const ids = all.map(a => a.id)
      const unique = new Set(ids)
      expect(unique.size).toBe(ids.length)
    })

    it('每个成就都有 name 字段', () => {
      const all: Achievement[] = (sys as any).achievements
      expect(all.every(a => typeof a.name === 'string' && a.name.length > 0)).toBe(true)
    })

    it('每个成就都有 description 字段', () => {
      const all: Achievement[] = (sys as any).achievements
      expect(all.every(a => typeof a.description === 'string' && a.description.length > 0)).toBe(true)
    })

    it('每个成就都有有效的 category', () => {
      const validCategories = new Set(['creator', 'destroyer', 'civilization', 'military', 'nature', 'secret'])
      const all: Achievement[] = (sys as any).achievements
      expect(all.every(a => validCategories.has(a.category))).toBe(true)
    })

    it('每个成就都有 icon 字段', () => {
      const all: Achievement[] = (sys as any).achievements
      expect(all.every(a => typeof a.icon === 'string' && a.icon.length > 0)).toBe(true)
    })

    it('_newlyBuf 初始为空数组', () => {
      expect((sys as any)._newlyBuf).toEqual([])
    })
  })

  // ===== check() 基本行为 =====
  describe('check() 基本行为', () => {
    it('全零 stats 下不崩溃', () => {
      expect(() => sys.check(makeStats())).not.toThrow()
    })

    it('返回值为字符串数组', () => {
      const result = sys.check(makeStats())
      expect(Array.isArray(result)).toBe(true)
    })

    it('全零 stats 下返回空数组', () => {
      const result = sys.check(makeStats())
      expect(result).toEqual([])
    })

    it('满足条件时返回非空数组', () => {
      const result = sys.check(makeStats({ nukeUsed: true }))
      expect(result.length).toBeGreaterThan(0)
    })

    it('返回的 ID 都是字符串', () => {
      const result = sys.check(makeStats({ totalCreatures: 10 }))
      expect(result.every(id => typeof id === 'string')).toBe(true)
    })

    it('同一成就只解锁一次（第二次不重复返回）', () => {
      sys.check(makeStats({ nukeUsed: true }))
      const second = sys.check(makeStats({ nukeUsed: true }))
      expect(second.includes('nuclear_option')).toBe(false)
    })

    it('多个条件同时满足时返回多个ID', () => {
      const result = sys.check(makeStats({ nukeUsed: true, totalCreatures: 1 }))
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it('解锁时记录 unlockTick', () => {
      sys.check(makeStats({ nukeUsed: true, totalTicks: 999 }))
      const a = (sys as any).achievements.find((a: Achievement) => a.id === 'nuclear_option')
      expect(a.unlockTick).toBe(999)
    })
  })

  // ===== Creator 类成就 =====
  describe('Creator 类成就', () => {
    it('first_life: totalCreatures >= 1 时解锁', () => {
      const result = sys.check(makeStats({ totalCreatures: 1 }))
      expect(result.includes('first_life')).toBe(true)
    })

    it('first_life: totalCreatures = 0 时不解锁', () => {
      const result = sys.check(makeStats({ totalCreatures: 0 }))
      expect(result.includes('first_life')).toBe(false)
    })

    it('diverse_world: speciesSet 数组有 4+ 种时解锁', () => {
      const result = sys.check(makeStats({ speciesSet: ['a', 'b', 'c', 'd'] }))
      expect(result.includes('diverse_world')).toBe(true)
    })

    it('diverse_world: speciesSet 为 Set 且 size>=4 时解锁', () => {
      const result = sys.check(makeStats({ speciesSet: new Set(['a', 'b', 'c', 'd']) }))
      expect(result.includes('diverse_world')).toBe(true)
    })

    it('diverse_world: speciesSet 少于4种时不解锁', () => {
      const result = sys.check(makeStats({ speciesSet: ['a', 'b', 'c'] }))
      expect(result.includes('diverse_world')).toBe(false)
    })

    it('mega_city: maxCityPop >= 50 时解锁', () => {
      const result = sys.check(makeStats({ maxCityPop: 50 }))
      expect(result.includes('mega_city')).toBe(true)
    })

    it('mega_city: maxCityPop = 49 时不解锁', () => {
      const result = sys.check(makeStats({ maxCityPop: 49 }))
      expect(result.includes('mega_city')).toBe(false)
    })

    it('world_builder: filledTilePercent >= 80 时解锁', () => {
      const result = sys.check(makeStats({ filledTilePercent: 80 }))
      expect(result.includes('world_builder')).toBe(true)
    })

    it('world_builder: filledTilePercent = 79.9 时不解锁', () => {
      const result = sys.check(makeStats({ filledTilePercent: 79.9 }))
      expect(result.includes('world_builder')).toBe(false)
    })

    it('island_maker: hasIsland = true 时解锁', () => {
      const result = sys.check(makeStats({ hasIsland: true }))
      expect(result.includes('island_maker')).toBe(true)
    })

    it('island_maker: hasIsland = false 时不解锁', () => {
      const result = sys.check(makeStats({ hasIsland: false }))
      expect(result.includes('island_maker')).toBe(false)
    })
  })

  // ===== Destroyer 类成就 =====
  describe('Destroyer 类成就', () => {
    it('apocalypse: totalKills >= 1000 时解锁', () => {
      const result = sys.check(makeStats({ totalKills: 1000 }))
      expect(result.includes('apocalypse')).toBe(true)
    })

    it('apocalypse: totalKills = 999 时不解锁', () => {
      const result = sys.check(makeStats({ totalKills: 999 }))
      expect(result.includes('apocalypse')).toBe(false)
    })

    it('extinction_event: extinctSpecies 有1个时解锁', () => {
      const result = sys.check(makeStats({ extinctSpecies: ['elf'] }))
      expect(result.includes('extinction_event')).toBe(true)
    })

    it('extinction_event: extinctSpecies 为空时不解锁', () => {
      const result = sys.check(makeStats({ extinctSpecies: [] }))
      expect(result.includes('extinction_event')).toBe(false)
    })

    it('scorched_earth: scorchedTiles >= 500 时解锁', () => {
      const result = sys.check(makeStats({ scorchedTiles: 500 }))
      expect(result.includes('scorched_earth')).toBe(true)
    })

    it('chain_reaction: disastersLast60Ticks >= 3 时解锁', () => {
      const result = sys.check(makeStats({ disastersLast60Ticks: 3 }))
      expect(result.includes('chain_reaction')).toBe(true)
    })

    it('chain_reaction: disastersLast60Ticks = 2 时不解锁', () => {
      const result = sys.check(makeStats({ disastersLast60Ticks: 2 }))
      expect(result.includes('chain_reaction')).toBe(false)
    })

    it('nuclear_option: nukeUsed = true 时解锁', () => {
      const result = sys.check(makeStats({ nukeUsed: true }))
      expect(result.includes('nuclear_option')).toBe(true)
    })

    it('nuclear_option: nukeUsed = false 时不解锁', () => {
      const result = sys.check(makeStats({ nukeUsed: false }))
      expect(result.includes('nuclear_option')).toBe(false)
    })
  })

  // ===== Civilization 类成就 =====
  describe('Civilization 类成就', () => {
    it('first_contact: civsMet >= 2 时解锁', () => {
      const result = sys.check(makeStats({ civsMet: 2 }))
      expect(result.includes('first_contact')).toBe(true)
    })

    it('trade_empire: activeTradeRoutes >= 5 时解锁', () => {
      const result = sys.check(makeStats({ activeTradeRoutes: 5 }))
      expect(result.includes('trade_empire')).toBe(true)
    })

    it('golden_age: maxEra = renaissance 时解锁', () => {
      const result = sys.check(makeStats({ maxEra: 'renaissance' }))
      expect(result.includes('golden_age')).toBe(true)
    })

    it('golden_age: maxEra = industrial 时解锁', () => {
      const result = sys.check(makeStats({ maxEra: 'industrial' }))
      expect(result.includes('golden_age')).toBe(true)
    })

    it('golden_age: maxEra = modern 时解锁', () => {
      const result = sys.check(makeStats({ maxEra: 'modern' }))
      expect(result.includes('golden_age')).toBe(true)
    })

    it('golden_age: maxEra = stone 时不解锁', () => {
      const result = sys.check(makeStats({ maxEra: 'stone' }))
      expect(result.includes('golden_age')).toBe(false)
    })

    it('world_peace: peaceTicks >= 1000 时解锁', () => {
      const result = sys.check(makeStats({ peaceTicks: 1000 }))
      expect(result.includes('world_peace')).toBe(true)
    })

    it('world_peace: peaceTicks = 999 时不解锁', () => {
      const result = sys.check(makeStats({ peaceTicks: 999 }))
      expect(result.includes('world_peace')).toBe(false)
    })

    it('hegemon: maxTerritoryPercent >= 60 时解锁', () => {
      const result = sys.check(makeStats({ maxTerritoryPercent: 60 }))
      expect(result.includes('hegemon')).toBe(true)
    })

    it('hegemon: maxTerritoryPercent = 59 时不解锁', () => {
      const result = sys.check(makeStats({ maxTerritoryPercent: 59 }))
      expect(result.includes('hegemon')).toBe(false)
    })
  })

  // ===== Military 类成就 =====
  describe('Military 类成就', () => {
    it('first_blood: totalCombats >= 1 时解锁', () => {
      const result = sys.check(makeStats({ totalCombats: 1 }))
      expect(result.includes('first_blood')).toBe(true)
    })

    it('naval_power: shipCount >= 5 ��解锁', () => {
      const result = sys.check(makeStats({ shipCount: 5 }))
      expect(result.includes('naval_power')).toBe(true)
    })

    it('naval_power: shipCount = 4 时不解锁', () => {
      const result = sys.check(makeStats({ shipCount: 4 }))
      expect(result.includes('naval_power')).toBe(false)
    })

    it('siege_master: citiesCaptured >= 3 时解锁', () => {
      const result = sys.check(makeStats({ citiesCaptured: 3 }))
      expect(result.includes('siege_master')).toBe(true)
    })

    it('legendary_hero: maxHeroLevel >= 10 时解锁', () => {
      const result = sys.check(makeStats({ maxHeroLevel: 10 }))
      expect(result.includes('legendary_hero')).toBe(true)
    })

    it('legendary_hero: maxHeroLevel = 9 时不解锁', () => {
      const result = sys.check(makeStats({ maxHeroLevel: 9 }))
      expect(result.includes('legendary_hero')).toBe(false)
    })

    it('grand_army: maxArmySize >= 50 时解锁', () => {
      const result = sys.check(makeStats({ maxArmySize: 50 }))
      expect(result.includes('grand_army')).toBe(true)
    })

    it('grand_army: maxArmySize = 49 时不解锁', () => {
      const result = sys.check(makeStats({ maxArmySize: 49 }))
      expect(result.includes('grand_army')).toBe(false)
    })
  })

  // ===== Nature 类成就 =====
  describe('Nature 类成就', () => {
    it('volcano_eruption: volcanoEruptions >= 1 时解锁', () => {
      const result = sys.check(makeStats({ volcanoEruptions: 1 }))
      expect(result.includes('volcano_eruption')).toBe(true)
    })

    it('great_flood: waterTilesCreatedAtOnce >= 50 时解锁', () => {
      const result = sys.check(makeStats({ waterTilesCreatedAtOnce: 50 }))
      expect(result.includes('great_flood')).toBe(true)
    })

    it('great_flood: waterTilesCreatedAtOnce = 49 时不解锁', () => {
      const result = sys.check(makeStats({ waterTilesCreatedAtOnce: 49 }))
      expect(result.includes('great_flood')).toBe(false)
    })

    it('pandemic: diseasedCivs >= 3 时解锁', () => {
      const result = sys.check(makeStats({ diseasedCivs: 3 }))
      expect(result.includes('pandemic')).toBe(true)
    })

    it('evolution: evolutionEvents >= 1 时解锁', () => {
      const result = sys.check(makeStats({ evolutionEvents: 1 }))
      expect(result.includes('evolution')).toBe(true)
    })

    it('ecosystem_balance: coexistSpecies>=5 且 coexistTicks>=2000 时解锁', () => {
      const result = sys.check(makeStats({ coexistSpecies: 5, coexistTicks: 2000 }))
      expect(result.includes('ecosystem_balance')).toBe(true)
    })

    it('ecosystem_balance: coexistSpecies=5 但 coexistTicks=1999 时不解锁', () => {
      const result = sys.check(makeStats({ coexistSpecies: 5, coexistTicks: 1999 }))
      expect(result.includes('ecosystem_balance')).toBe(false)
    })

    it('ecosystem_balance: coexistTicks=2000 但 coexistSpecies=4 时不解锁', () => {
      const result = sys.check(makeStats({ coexistSpecies: 4, coexistTicks: 2000 }))
      expect(result.includes('ecosystem_balance')).toBe(false)
    })
  })

  // ===== Secret 类成就 =====
  describe('Secret 类成就', () => {
    it('time_lord: totalTicks >= 100000 时解锁', () => {
      const result = sys.check(makeStats({ totalTicks: 100000 }))
      expect(result.includes('time_lord')).toBe(true)
    })

    it('time_lord: totalTicks = 99999 时不解锁', () => {
      const result = sys.check(makeStats({ totalTicks: 99999 }))
      expect(result.includes('time_lord')).toBe(false)
    })

    it('cartographer: exploredPercent >= 100 时解锁', () => {
      const result = sys.check(makeStats({ exploredPercent: 100 }))
      expect(result.includes('cartographer')).toBe(true)
    })

    it('pacifist_god: totalCivs>=5 且 totalWars=0 时解锁', () => {
      const result = sys.check(makeStats({ totalCivs: 5, totalWars: 0 }))
      expect(result.includes('pacifist_god')).toBe(true)
    })

    it('pacifist_god: totalCivs>=5 但 totalWars>0 时不解锁', () => {
      const result = sys.check(makeStats({ totalCivs: 5, totalWars: 1 }))
      expect(result.includes('pacifist_god')).toBe(false)
    })

    it('clone_army: clonedCreatures >= 20 时解锁', () => {
      const result = sys.check(makeStats({ clonedCreatures: 20 }))
      expect(result.includes('clone_army')).toBe(true)
    })

    it('clone_army: clonedCreatures = 19 时不解锁', () => {
      const result = sys.check(makeStats({ clonedCreatures: 19 }))
      expect(result.includes('clone_army')).toBe(false)
    })

    it('portal_master: portalPairs >= 5 时解锁', () => {
      const result = sys.check(makeStats({ portalPairs: 5 }))
      expect(result.includes('portal_master')).toBe(true)
    })

    it('portal_master: portalPairs = 4 时不解锁', () => {
      const result = sys.check(makeStats({ portalPairs: 4 }))
      expect(result.includes('portal_master')).toBe(false)
    })
  })

  // ===== 边界与幂等性 =====
  describe('边界条件与幂等性', () => {
    it('解锁后再次检查不重复解锁', () => {
      sys.check(makeStats({ totalCreatures: 1 }))
      const second = sys.check(makeStats({ totalCreatures: 1 }))
      expect(second.includes('first_life')).toBe(false)
    })

    it('解锁后成就 unlocked 标记为 true', () => {
      sys.check(makeStats({ totalCreatures: 1 }))
      const a = (sys as any).achievements.find((a: Achievement) => a.id === 'first_life')
      expect(a.unlocked).toBe(true)
    })

    it('unlockTick 精确记录解锁时刻', () => {
      sys.check(makeStats({ totalCreatures: 1, totalTicks: 12345 }))
      const a = (sys as any).achievements.find((a: Achievement) => a.id === 'first_life')
      expect(a.unlockTick).toBe(12345)
    })

    it('一次 check 能同时解锁所有满足条件的成就', () => {
      const stats = makeStats({
        nukeUsed: true,
        totalCreatures: 1,
        totalKills: 1000,
        hasIsland: true,
        totalCombats: 1,
      })
      const result = sys.check(stats)
      expect(result.length).toBeGreaterThanOrEqual(5)
    })

    it('多次 check 累计可以解锁所有30个成就', () => {
      // 全满足条件的 stats
      sys.check(makeStats({
        totalCreatures: 100,
        speciesSet: ['a', 'b', 'c', 'd', 'e'],
        maxCityPop: 100,
        filledTilePercent: 90,
        hasIsland: true,
        totalKills: 2000,
        extinctSpecies: ['orc'],
        scorchedTiles: 600,
        disastersLast60Ticks: 5,
        nukeUsed: true,
        civsMet: 3,
        activeTradeRoutes: 10,
        maxEra: 'modern',
        peaceTicks: 2000,
        maxTerritoryPercent: 70,
        totalCombats: 5,
        shipCount: 10,
        citiesCaptured: 5,
        maxHeroLevel: 15,
        maxArmySize: 100,
        volcanoEruptions: 2,
        waterTilesCreatedAtOnce: 100,
        diseasedCivs: 5,
        evolutionEvents: 3,
        coexistSpecies: 6,
        coexistTicks: 3000,
        totalTicks: 200000,
        exploredPercent: 100,
        totalCivs: 6,
        totalWars: 0,
        clonedCreatures: 25,
        portalPairs: 6,
      }))
      const all: Achievement[] = (sys as any).achievements
      expect(all.every(a => a.unlocked)).toBe(true)
    })
  })
})
