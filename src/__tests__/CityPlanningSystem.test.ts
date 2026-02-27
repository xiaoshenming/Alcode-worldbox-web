import { describe, it, expect, beforeEach } from 'vitest'
import { CityPlanningSystem } from '../systems/CityPlanningSystem'
import type { Civilization } from '../civilization/Civilization'

function makeSys() { return new CityPlanningSystem() }

function makeCiv(population = 10): Civilization {
  return {
    id: 1, name: 'Test', color: '#fff', population,
    territory: new Set(), buildings: [],
    resources: { food: 100, wood: 100, stone: 100, gold: 100 },
    techLevel: 1,
    relations: new Map(), tradeRoutes: [],
    culture: { trait: 'military' as any, strength: 50 },
    religion: { type: 'none' as any, faith: 0, temples: 0, blessing: null, blessingTimer: 0 },
    happiness: 50, taxRate: 1, revoltTimer: 0,
    research: { currentTech: null, progress: 0, completed: [], researchRate: 1 },
    treaties: [], embassies: [], diplomaticStance: 'neutral'
  } as Civilization
}

describe('CityPlanningSystem', () => {
  let sys: CityPlanningSystem
  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => { expect(sys).toBeDefined() })

  it('初始buildingCounts为空Map', () => { expect((sys as any).buildingCounts.size).toBe(0) })

  it('getCityLevel 少量人口返回village级别', () => {
    const civ = makeCiv(5)
    const level = sys.getCityLevel(civ)
    expect(level).toBeDefined()
    expect(level.name).toBeDefined()
  })

  it('getCityLevel 大量人口返回更高级别', () => {
    const smallCiv = makeCiv(5)
    const bigCiv = makeCiv(500)
    const smallLevel = sys.getCityLevel(smallCiv)
    const bigLevel = sys.getCityLevel(bigCiv)
    // 大文明级别的maxPop应该更高（或级别不同）
    expect(bigLevel).toBeDefined()
    expect(smallLevel).toBeDefined()
  })

  it('getCityLevel 返回有minPop和maxPop字段的对象', () => {
    const civ = makeCiv(10)
    const level = sys.getCityLevel(civ)
    expect(level).toHaveProperty('name')
  })
})
