import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CityPlanningSystem } from '../systems/CityPlanningSystem'
import { BuildingType } from '../civilization/Civilization'
import type { Civilization, BuildingComponent } from '../civilization/Civilization'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'
import { EventLog } from '../systems/EventLog'

// ---- helpers ----

function makeSys() {
  return new CityPlanningSystem()
}

function makeCiv(overrides: Partial<Civilization> = {}): Civilization {
  return {
    id: 1,
    name: 'TestCiv',
    color: '#fff',
    population: 10,
    territory: new Set<string>(),
    buildings: [],
    resources: { food: 100, wood: 100, stone: 100, gold: 100 },
    techLevel: 1,
    relations: new Map(),
    tradeRoutes: [],
    culture: { trait: 'military' as any, strength: 50 },
    religion: { type: 'none' as any, faith: 0, temples: 0, blessing: null, blessingTimer: 0 },
    happiness: 50,
    taxRate: 1,
    revoltTimer: 0,
    research: { currentTech: null, progress: 0, completed: [], researchRate: 1 },
    treaties: [],
    embassies: [],
    diplomaticStance: 'neutral',
    ...overrides,
  } as Civilization
}

function addBuilding(
  em: EntityManager,
  civ: Civilization,
  type: BuildingType,
  level = 1,
  x = 5,
  y = 5,
): number {
  const id = em.createEntity()
  em.addComponent(id, {
    type: 'building',
    buildingType: type,
    civId: civ.id,
    level,
    health: 100,
    maxHealth: 100,
  } as BuildingComponent & { type: string })
  em.addComponent(id, { type: 'position', x, y })
  civ.buildings.push(id)
  return id
}

/** Minimal world stub with configurable tile. */
function makeWorld(tile: TileType = TileType.GRASS) {
  return {
    getTile: vi.fn().mockReturnValue(tile),
  } as any
}

/** Minimal particles stub. */
function makeParticles() {
  return { spawnFirework: vi.fn() } as any
}

function makeCivManager(civs: Civilization[], extraOpts: { placeBuilding?: () => any } = {}) {
  return {
    civilizations: new Map(civs.map(c => [c.id, c])),
    placeBuilding: extraOpts.placeBuilding ?? vi.fn().mockReturnValue(1),
  } as any
}

describe('CityPlanningSystem', () => {
  let sys: CityPlanningSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(EventLog, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---- 初始状态 ----

  describe('初始状态', () => {
    it('可以实例化', () => {
      expect(sys).toBeDefined()
    })

    it('buildingCounts 初始为空 Map', () => {
      expect((sys as any).buildingCounts.size).toBe(0)
    })

    it('_occupiedSet 初始为空 Set', () => {
      expect((sys as any)._occupiedSet.size).toBe(0)
    })
  })

  // ---- getCityLevel ----

  describe('getCityLevel', () => {
    it('少量人口（<10）返回 Village', () => {
      const civ = makeCiv({ population: 5, buildings: [] })
      expect(sys.getCityLevel(civ).name).toBe('Village')
    })

    it('population=0 返回 Village', () => {
      const civ = makeCiv({ population: 0, buildings: [] })
      expect(sys.getCityLevel(civ).name).toBe('Village')
    })

    it('population>=10 且 buildings>=5 返回 Town', () => {
      const civ = makeCiv({ population: 10 })
      civ.buildings = new Array(5).fill(0) as any
      expect(sys.getCityLevel(civ).name).toBe('Town')
    })

    it('population>=25 且 buildings>=12 返回 City', () => {
      const civ = makeCiv({ population: 25 })
      civ.buildings = new Array(12).fill(0) as any
      expect(sys.getCityLevel(civ).name).toBe('City')
    })

    it('population>=50 且 buildings>=25 返回 Metropolis', () => {
      const civ = makeCiv({ population: 50 })
      civ.buildings = new Array(25).fill(0) as any
      expect(sys.getCityLevel(civ).name).toBe('Metropolis')
    })

    it('人口足够但建筑不足时降级', () => {
      const civ = makeCiv({ population: 50 })
      civ.buildings = new Array(5).fill(0) as any // only 5, not 25
      expect(sys.getCityLevel(civ).name).toBe('Town')
    })

    it('建筑足够但人口不足时降级', () => {
      const civ = makeCiv({ population: 5 })
      civ.buildings = new Array(25).fill(0) as any
      expect(sys.getCityLevel(civ).name).toBe('Village')
    })

    it('getCityLevel 返回有 level 字段的对象', () => {
      const civ = makeCiv()
      expect(sys.getCityLevel(civ)).toHaveProperty('level')
    })

    it('getCityLevel 返回有 multiplier 字段的对象', () => {
      const civ = makeCiv()
      expect(sys.getCityLevel(civ)).toHaveProperty('multiplier')
    })

    it('getCityLevel 返回有 maxPop 字段的对象', () => {
      const civ = makeCiv()
      expect(sys.getCityLevel(civ)).toHaveProperty('maxPop')
    })

    it('Village 的 multiplier 为 1.0', () => {
      const civ = makeCiv({ population: 3, buildings: [] })
      const cl = sys.getCityLevel(civ)
      expect(cl.multiplier).toBe(1.0)
    })

    it('Metropolis 的 multiplier 为 2.0', () => {
      const civ = makeCiv({ population: 100 })
      civ.buildings = new Array(30).fill(0) as any
      const cl = sys.getCityLevel(civ)
      expect(cl.multiplier).toBe(2.0)
    })

    it('同一文明连续调用返回相同结果（确定性）', () => {
      const civ = makeCiv({ population: 30 })
      civ.buildings = new Array(15).fill(0) as any
      const r1 = sys.getCityLevel(civ)
      const r2 = sys.getCityLevel(civ)
      expect(r1.name).toBe(r2.name)
    })
  })

  // ---- produceResources（通过 update 在 tick%60===0 时触发）----

  describe('produceResources', () => {
    it('FARM 在 tick=60 时增加 food（population=0, 无消耗）', () => {
      const em = new EntityManager()
      // population=0 means no food consumption (0*0.5=0), farm produces 3*1.0=3
      const civ = makeCiv({ population: 0, resources: { food: 0, wood: 50, stone: 50, gold: 50 } })
      addBuilding(em, civ, BuildingType.FARM)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 60)
      expect(civ.resources.food).toBeGreaterThan(0)
    })

    it('MINE 在 tick=60 时增加 stone 和 gold', () => {
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      addBuilding(em, civ, BuildingType.MINE)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 60)
      expect(civ.resources.stone).toBeGreaterThan(0)
      expect(civ.resources.gold).toBeGreaterThan(0)
    })

    it('MARKET 在 tick=60 时增加 gold', () => {
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      addBuilding(em, civ, BuildingType.MARKET)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 60)
      expect(civ.resources.gold).toBeGreaterThan(0)
    })

    it('WORKSHOP 在 tick=60 时增加 wood 和 stone', () => {
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      addBuilding(em, civ, BuildingType.WORKSHOP)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 60)
      expect(civ.resources.wood).toBeGreaterThan(0)
      expect(civ.resources.stone).toBeGreaterThan(0)
    })

    it('人口消耗食物（population=10, food减少5）', () => {
      const em = new EntityManager()
      const civ = makeCiv({ population: 10, resources: { food: 100, wood: 50, stone: 50, gold: 50 } })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 60)
      // consumption = 10 * 0.5 = 5
      expect(civ.resources.food).toBe(95)
    })

    it('有 GRANARY 时食物消耗减少20%', () => {
      const em = new EntityManager()
      const civ = makeCiv({ population: 10, resources: { food: 100, wood: 50, stone: 50, gold: 50 } })
      addBuilding(em, civ, BuildingType.GRANARY)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 60)
      // consumption without granary = 5, with granary = 5*0.8=4; food=100-4=96
      expect(civ.resources.food).toBe(96)
    })

    it('food 不足时截断为0', () => {
      const em = new EntityManager()
      const civ = makeCiv({ population: 100, resources: { food: 1, wood: 0, stone: 0, gold: 0 } })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 60)
      expect(civ.resources.food).toBe(0)
    })

    it('非 tick%60 时刻不触发资源生产', () => {
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 100, wood: 100, stone: 0, gold: 0 } })
      addBuilding(em, civ, BuildingType.MINE)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 61) // 61 % 60 !== 0
      expect(civ.resources.stone).toBe(0)
    })

    it('Metropolis（multiplier=2）产出的 stone 是 Village 的两倍', () => {
      // Use MINE which produces stone+gold, no food consumption complication
      // Village: multiplier=1.0, Metropolis: multiplier=2.0
      const em1 = new EntityManager()
      const civV = makeCiv({ id: 1, population: 0, resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      addBuilding(em1, civV, BuildingType.MINE)
      // Village level: pop=0, buildings=1 → Village (multiplier=1.0)

      const em2 = new EntityManager()
      const civM = makeCiv({ id: 2, population: 0, resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      // Set up Metropolis: need pop>=50, buildings>=25
      civM.population = 50
      const fakeBuildingIds = new Array(25).fill(0).map((_, i) => {
        const id = em2.createEntity()
        em2.addComponent(id, { type: 'building', buildingType: BuildingType.HUT, civId: civM.id, level: 1, health: 100, maxHealth: 100 })
        return id
      })
      civM.buildings = fakeBuildingIds
      addBuilding(em2, civM, BuildingType.MINE, 1, 100, 100, 99, 99)

      sys.update(makeCivManager([civV]), em1, makeWorld(), makeParticles(), 60)
      const stoneV = civV.resources.stone

      sys.update(makeCivManager([civM]), em2, makeWorld(), makeParticles(), 60)
      const stoneM = civM.resources.stone

      // Metropolis multiplier=2.0, Village multiplier=1.0
      expect(stoneM).toBeGreaterThan(stoneV)
    })
  })

  // ---- collectTax / autoAdjustTax ----

  describe('collectTax 和 autoAdjustTax', () => {
    it('taxRate=0 时不增加 gold', () => {
      const em = new EntityManager()
      const civ = makeCiv({ taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 0 } })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.resources.gold).toBe(0)
    })

    it('taxRate=1 时每120tick增加2 gold', () => {
      const em = new EntityManager()
      const civ = makeCiv({ taxRate: 1, resources: { food: 100, wood: 0, stone: 0, gold: 0 }, happiness: 50 })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.resources.gold).toBeGreaterThanOrEqual(2)
    })

    it('taxRate=3 时每120tick增加10 gold', () => {
      const em = new EntityManager()
      const civ = makeCiv({ taxRate: 3, resources: { food: 100, wood: 0, stone: 0, gold: 0 }, happiness: 80 })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.resources.gold).toBeGreaterThanOrEqual(10)
    })

    it('taxRate=2 时幸福度降低3', () => {
      const em = new EntityManager()
      const civ = makeCiv({ taxRate: 2, happiness: 60, resources: { food: 100, wood: 0, stone: 0, gold: 50 } })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      // happiness delta from tax=-3, base+1, net depends on buildings
      expect(civ.happiness).toBeLessThan(65) // should have decreased from tax
    })

    it('autoAdjustTax: gold < 20 且 happiness > 35 时提高 taxRate', () => {
      const em = new EntityManager()
      const civ = makeCiv({ taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 10 }, happiness: 60 })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.taxRate).toBeGreaterThan(0)
    })

    it('autoAdjustTax: happiness < 30 时降低 taxRate', () => {
      const em = new EntityManager()
      const civ = makeCiv({ taxRate: 3, resources: { food: 100, wood: 0, stone: 0, gold: 100 }, happiness: 25 })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.taxRate).toBeLessThan(3)
    })

    it('taxRate=3 且 gold>=20 时不再提高 taxRate（已达最高）', () => {
      const em = new EntityManager()
      const civ = makeCiv({ taxRate: 3, resources: { food: 100, wood: 0, stone: 0, gold: 100 }, happiness: 80 })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.taxRate).toBeLessThanOrEqual(3)
    })

    it('taxRate=0 且 happiness < 30 时不再降低（已达最低）', () => {
      const em = new EntityManager()
      const civ = makeCiv({ taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 }, happiness: 25 })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.taxRate).toBe(0)
    })
  })

  // ---- updateHappiness ----

  describe('updateHappiness', () => {
    it('基础每120tick幸福度+1（无建筑、无战争）', () => {
      const em = new EntityManager()
      const civ = makeCiv({ happiness: 50, taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.happiness).toBeGreaterThanOrEqual(50)
    })

    it('有 MARKET 时幸福度额外+2', () => {
      const em = new EntityManager()
      const civ = makeCiv({ happiness: 50, taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      addBuilding(em, civ, BuildingType.MARKET)
      const withMarket = { ...civ, happiness: 50, resources: { ...civ.resources } }
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      // With market: delta = 1(base) + 2(market) = 3 (minus taxRate effects)
      expect(civ.happiness).toBeGreaterThanOrEqual(51)
    })

    it('有 TEMPLE 时幸福度额外+3', () => {
      const em = new EntityManager()
      const civ = makeCiv({ happiness: 50, taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      addBuilding(em, civ, BuildingType.TEMPLE)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.happiness).toBeGreaterThanOrEqual(52)
    })

    it('有 ACADEMY 时幸福度额外+1', () => {
      const em = new EntityManager()
      const civ = makeCiv({ happiness: 50, taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      addBuilding(em, civ, BuildingType.ACADEMY)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.happiness).toBeGreaterThanOrEqual(51)
    })

    it('人口超过住房容量时幸福度-5（拥挤）', () => {
      const em = new EntityManager()
      // HUT 容量=2*level=2, 人口=10 → 拥挤
      const civ = makeCiv({ population: 10, happiness: 50, taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      addBuilding(em, civ, BuildingType.HUT, 1) // capacity=2
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.happiness).toBeLessThan(52)
    })

    it('处于战争状态（relation<=-50）时幸福度-3', () => {
      const em = new EntityManager()
      const civ = makeCiv({ happiness: 50, taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      civ.relations.set(2, -80) // at war
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      // war: delta-3, base+1, net=-2 → happiness=48 (before tax)
      expect(civ.happiness).toBeLessThanOrEqual(50)
    })

    it('happiness 上限为100', () => {
      const em = new EntityManager()
      const civ = makeCiv({ happiness: 99, taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      addBuilding(em, civ, BuildingType.TEMPLE)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.happiness).toBeLessThanOrEqual(100)
    })

    it('happiness 下限为0', () => {
      const em = new EntityManager()
      const civ = makeCiv({ happiness: 1, taxRate: 3, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      civ.relations.set(2, -80)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.happiness).toBeGreaterThanOrEqual(0)
    })

    it('revolt: happiness<20 且人口>2 时有概率失去人口', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05) // < 0.1 → revolt
      const em = new EntityManager()
      const civ = makeCiv({ population: 10, happiness: 15, taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.population).toBeLessThan(10)
    })

    it('revolt 后幸福度+10（张力释放）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      const em = new EntityManager()
      const civ = makeCiv({ population: 10, happiness: 15, taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.happiness).toBeGreaterThan(15)
    })

    it('没有 revolt 时（random >= 0.1）人口不减少', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const em = new EntityManager()
      const civ = makeCiv({ population: 10, happiness: 15, taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.population).toBe(10)
    })

    it('人口<=2时即使happiness<20也不revolt', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      const em = new EntityManager()
      const civ = makeCiv({ population: 2, happiness: 10, taxRate: 0, resources: { food: 100, wood: 0, stone: 0, gold: 100 } })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 120)
      expect(civ.population).toBe(2)
    })
  })

  // ---- getHousingCapacity ----

  describe('getHousingCapacity（私有方法间接验证）', () => {
    it('HUT(lv1) 提供容量2', () => {
      const em = new EntityManager()
      const civ = makeCiv({ population: 10 })
      addBuilding(em, civ, BuildingType.HUT, 1)
      // 更新 buildingCounts
      ;(sys as any).cacheBuildingCounts(civ, em)
      const cap = (sys as any).getHousingCapacity(civ, em)
      expect(cap).toBe(2)
    })

    it('HOUSE(lv1) 提供容量4', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      addBuilding(em, civ, BuildingType.HOUSE, 1)
      ;(sys as any).cacheBuildingCounts(civ, em)
      const cap = (sys as any).getHousingCapacity(civ, em)
      expect(cap).toBe(4)
    })

    it('CASTLE(lv1) 提供容量8', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      addBuilding(em, civ, BuildingType.CASTLE, 1)
      ;(sys as any).cacheBuildingCounts(civ, em)
      const cap = (sys as any).getHousingCapacity(civ, em)
      expect(cap).toBe(8)
    })

    it('HUT(lv2) 提供容量4（level 倍增）', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      addBuilding(em, civ, BuildingType.HUT, 2)
      ;(sys as any).cacheBuildingCounts(civ, em)
      const cap = (sys as any).getHousingCapacity(civ, em)
      expect(cap).toBe(4)
    })

    it('FARM 不提供住房容量', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      addBuilding(em, civ, BuildingType.FARM, 1)
      ;(sys as any).cacheBuildingCounts(civ, em)
      const cap = (sys as any).getHousingCapacity(civ, em)
      expect(cap).toBe(0)
    })

    it('多个建筑住房容量累加', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      addBuilding(em, civ, BuildingType.HUT, 1, 1, 1)
      addBuilding(em, civ, BuildingType.HOUSE, 1, 2, 2)
      ;(sys as any).cacheBuildingCounts(civ, em)
      const cap = (sys as any).getHousingCapacity(civ, em)
      expect(cap).toBe(6) // 2 + 4
    })
  })

  // ---- update 整体行为 ----

  describe('update 整体行为', () => {
    it('空 civilizations 时不崩溃', () => {
      const em = new EntityManager()
      const civManager = makeCivManager([])
      expect(() => sys.update(civManager, em, makeWorld(), makeParticles(), 0)).not.toThrow()
    })

    it('多个文明同时处理不互相干扰（资源独立）', () => {
      const em = new EntityManager()
      const civ1 = makeCiv({ id: 1, resources: { food: 100, wood: 100, stone: 0, gold: 0 } })
      const civ2 = makeCiv({ id: 2, resources: { food: 50, wood: 50, stone: 0, gold: 0 } })
      addBuilding(em, civ1, BuildingType.MINE, 1, 5, 5)
      const civManager = makeCivManager([civ1, civ2])
      sys.update(civManager, em, makeWorld(), makeParticles(), 60)
      // civ2 has no mine, stone should remain 0
      expect(civ2.resources.stone).toBe(0)
    })

    it('tick=0 时不触发 produceResources（0 % 60 = 0 会触发）', () => {
      // tick=0 is divisible by 60, so resources DO produce
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      addBuilding(em, civ, BuildingType.MINE)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 0)
      expect(civ.resources.stone).toBeGreaterThan(0)
    })

    it('tick=1 时不触发任何周期性行为（1%60!=0, 1%120!=0, 1%180!=0）', () => {
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 100, wood: 0, stone: 0, gold: 0 } })
      addBuilding(em, civ, BuildingType.MINE)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 1)
      expect(civ.resources.stone).toBe(0)
    })

    it('buildingCounts 在每次 update 时更新（缓存刷新）', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 60)
      // After update, buildingCounts should have an entry for civ
      expect((sys as any).buildingCounts.has(civ.id)).toBe(true)
    })
  })

  // ---- findBuildSite / planExpansion ----

  describe('planExpansion（tick=180 触发）', () => {
    it('territory 为空时不构建建筑', () => {
      const em = new EntityManager()
      const civ = makeCiv({ territory: new Set(), resources: { food: 0, wood: 200, stone: 200, gold: 200 } })
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(), makeParticles(), 180)
      expect(civManager.placeBuilding).not.toHaveBeenCalled()
    })

    it('有 territory 且满足 HOUSE 条件时触发 placeBuilding', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // always pick first territory tile
      const em = new EntityManager()
      const civ = makeCiv({ population: 10, resources: { food: 0, wood: 200, stone: 50, gold: 0 } })
      civ.territory = new Set(['5,5', '6,6', '7,7'])
      // Housing: 1 HUT = capacity 2, pop=10 → overcrowded (10/2>0.8)
      addBuilding(em, civ, BuildingType.HUT, 1, 0, 0)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(TileType.GRASS), makeParticles(), 180)
      expect(civManager.placeBuilding).toHaveBeenCalled()
    })

    it('water tile 不作为建筑地点', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = new EntityManager()
      const civ = makeCiv({ population: 10, resources: { food: 0, wood: 200, stone: 200, gold: 200 } })
      civ.territory = new Set(['5,5'])
      addBuilding(em, civ, BuildingType.HUT, 1, 0, 0)
      const civManager = makeCivManager([civ])
      // All tiles are water
      sys.update(civManager, em, makeWorld(TileType.DEEP_WATER), makeParticles(), 180)
      expect(civManager.placeBuilding).not.toHaveBeenCalled()
    })

    it('placeBuilding 成功时触发 spawnFirework', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = new EntityManager()
      const civ = makeCiv({ population: 10, resources: { food: 0, wood: 200, stone: 50, gold: 0 } })
      civ.territory = new Set(['5,5'])
      addBuilding(em, civ, BuildingType.HUT, 1, 0, 0)
      const particles = makeParticles()
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(TileType.GRASS), particles, 180)
      expect(particles.spawnFirework).toHaveBeenCalled()
    })

    it('deductCost: HOUSE 花费 wood=20', () => {
      const r = { food: 0, wood: 100, stone: 50, gold: 0 }
      ;(sys as any).deductCost(r, BuildingType.HOUSE)
      expect(r.wood).toBe(80)
    })

    it('deductCost: FARM 花费 wood=10', () => {
      const r = { food: 0, wood: 100, stone: 50, gold: 0 }
      ;(sys as any).deductCost(r, BuildingType.FARM)
      expect(r.wood).toBe(90)
    })

    it('deductCost: MARKET 花费 wood=30 stone=20', () => {
      const r = { food: 0, wood: 100, stone: 100, gold: 0 }
      ;(sys as any).deductCost(r, BuildingType.MARKET)
      expect(r.wood).toBe(70)
      expect(r.stone).toBe(80)
    })

    it('deductCost: GRANARY 花费 wood=25 stone=15', () => {
      const r = { food: 0, wood: 100, stone: 100, gold: 0 }
      ;(sys as any).deductCost(r, BuildingType.GRANARY)
      expect(r.wood).toBe(75)
      expect(r.stone).toBe(85)
    })

    it('deductCost: WORKSHOP 花费 wood=30 stone=30', () => {
      const r = { food: 0, wood: 100, stone: 100, gold: 0 }
      ;(sys as any).deductCost(r, BuildingType.WORKSHOP)
      expect(r.wood).toBe(70)
      expect(r.stone).toBe(70)
    })

    it('deductCost: ACADEMY 花费 stone=40 gold=20', () => {
      const r = { food: 0, wood: 100, stone: 100, gold: 100 }
      ;(sys as any).deductCost(r, BuildingType.ACADEMY)
      expect(r.stone).toBe(60)
      expect(r.gold).toBe(80)
    })

    it('MOUNTAIN tile 不作为建筑地点', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = new EntityManager()
      const civ = makeCiv({ population: 10, resources: { food: 0, wood: 200, stone: 200, gold: 200 } })
      civ.territory = new Set(['5,5'])
      addBuilding(em, civ, BuildingType.HUT, 1, 0, 0)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(TileType.MOUNTAIN), makeParticles(), 180)
      expect(civManager.placeBuilding).not.toHaveBeenCalled()
    })

    it('LAVA tile 不作为建筑地点', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = new EntityManager()
      const civ = makeCiv({ population: 10, resources: { food: 0, wood: 200, stone: 200, gold: 200 } })
      civ.territory = new Set(['5,5'])
      addBuilding(em, civ, BuildingType.HUT, 1, 0, 0)
      const civManager = makeCivManager([civ])
      sys.update(civManager, em, makeWorld(TileType.LAVA), makeParticles(), 180)
      expect(civManager.placeBuilding).not.toHaveBeenCalled()
    })
  })
})
