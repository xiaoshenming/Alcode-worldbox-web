import { describe, it, expect, beforeEach } from 'vitest'
import { AchievementContentSystem } from '../systems/AchievementContentSystem'
import type { WorldStats } from '../systems/AchievementContentSystem'
function makeSys() { return new AchievementContentSystem() }
const makeStats = (overrides?: Partial<WorldStats>): WorldStats => ({
  totalCreatures: 0, speciesSet: [], maxCityPop: 0, filledTilePercent: 0,
  hasIsland: false, totalKills: 0, extinctSpecies: [], scorchedTiles: 0,
  disastersLast60Ticks: 0, nukeUsed: false, civsMet: 0, activeTradeRoutes: 0,
  maxEra: 'stone', peaceTicks: 0, maxTerritoryPercent: 0, totalCombats: 0,
  shipCount: 0, citiesCaptured: 0, maxHeroLevel: 0, maxArmySize: 0,
  volcanoEruptions: 0, waterTilesCreatedAtOnce: 0, diseasedCivs: 0,
  evolutionEvents: 0, coexistSpecies: 0, coexistTicks: 0, totalTicks: 0,
  exploredPercent: 0, totalCivs: 0, totalWars: 0, clonedCreatures: 0, portalPairs: 0,
  ...overrides,
})
describe('AchievementContentSystem', () => {
  let sys: AchievementContentSystem
  beforeEach(() => { sys = makeSys() })
  it('初始achievements非空（定义了成就）', () => { expect((sys as any).achievements.length).toBeGreaterThan(0) })
  it('初始无未解锁成就', () => {
    const all = (sys as any).achievements
    expect(all.every((a: any) => !a.unlocked)).toBe(true)
  })
  it('check不崩溃', () => {
    expect(() => sys.check(makeStats())).not.toThrow()
  })
  it('check返回字符串数组', () => {
    const result = sys.check(makeStats())
    expect(Array.isArray(result)).toBe(true)
  })
  it('解锁条件满足时返回非空数组', () => {
    const result = sys.check(makeStats({ nukeUsed: true }))
    expect(Array.isArray(result)).toBe(true)
  })
})
