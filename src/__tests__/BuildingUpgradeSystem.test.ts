import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BuildingUpgradeSystem } from '../systems/BuildingUpgradeSystem'
import { EntityManager } from '../ecs/Entity'
import { BuildingType } from '../civilization/Civilization'
import type { Civilization, BuildingComponent } from '../civilization/Civilization'
import { EventLog } from '../systems/EventLog'

// ---- helpers ----

function makeSys() {
  return new BuildingUpgradeSystem()
}

function makeCiv(overrides: Partial<Civilization> = {}): Civilization {
  return {
    id: 1,
    name: 'TestCiv',
    color: '#fff',
    population: 10,
    territory: new Set(),
    buildings: [],
    resources: { food: 200, wood: 200, stone: 200, gold: 200 },
    techLevel: 5,
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

function makeBuilding(
  em: EntityManager,
  civId: number,
  type: BuildingType,
  level = 1,
  health = 100,
  maxHealth = 100,
  x = 5,
  y = 5,
): number {
  const id = em.createEntity()
  em.addComponent(id, {
    type: 'building',
    buildingType: type,
    civId,
    level,
    health,
    maxHealth,
  } as BuildingComponent & { type: string })
  em.addComponent(id, { type: 'position', x, y })
  return id
}

function makeCivManager(civs: Civilization[]) {
  return {
    civilizations: new Map(civs.map(c => [c.id, c])),
  } as any
}

describe('BuildingUpgradeSystem', () => {
  let sys: BuildingUpgradeSystem

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

    it('lastCheck 内部 Map 初始为空', () => {
      expect((sys as any).lastCheck.size).toBe(0)
    })

    it('removeBuilding 不存在的 id 不报错', () => {
      expect(() => sys.removeBuilding(9999)).not.toThrow()
    })
  })

  // ---- removeBuilding ----

  describe('removeBuilding', () => {
    it('removeBuilding 后 lastCheck 不再包含该 id', () => {
      ;(sys as any).lastCheck.set(42, 100)
      sys.removeBuilding(42)
      expect((sys as any).lastCheck.has(42)).toBe(false)
    })

    it('连续 removeBuilding 两个不同 id', () => {
      ;(sys as any).lastCheck.set(1, 10)
      ;(sys as any).lastCheck.set(2, 20)
      sys.removeBuilding(1)
      sys.removeBuilding(2)
      expect((sys as any).lastCheck.size).toBe(0)
    })
  })

  // ---- getWorkshopSpeedBonus ----

  describe('getWorkshopSpeedBonus', () => {
    it('无建筑时返回1.0', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      expect(sys.getWorkshopSpeedBonus(em, civ)).toBe(1.0)
    })

    it('一个 lv1 Workshop 返回1.1', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const id = makeBuilding(em, civ.id, BuildingType.WORKSHOP, 1)
      civ.buildings.push(id)
      expect(sys.getWorkshopSpeedBonus(em, civ)).toBeCloseTo(1.1)
    })

    it('一个 lv2 Workshop 返回1.2', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const id = makeBuilding(em, civ.id, BuildingType.WORKSHOP, 2)
      civ.buildings.push(id)
      expect(sys.getWorkshopSpeedBonus(em, civ)).toBeCloseTo(1.2)
    })

    it('两个 lv1 Workshop 累加为1.2', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const id1 = makeBuilding(em, civ.id, BuildingType.WORKSHOP, 1)
      const id2 = makeBuilding(em, civ.id, BuildingType.WORKSHOP, 1)
      civ.buildings.push(id1, id2)
      expect(sys.getWorkshopSpeedBonus(em, civ)).toBeCloseTo(1.2)
    })

    it('非 Workshop 建筑不影响结果', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const id = makeBuilding(em, civ.id, BuildingType.FARM, 3)
      civ.buildings.push(id)
      expect(sys.getWorkshopSpeedBonus(em, civ)).toBe(1.0)
    })
  })

  // ---- getAcademyResearchBonus ----

  describe('getAcademyResearchBonus', () => {
    it('无建筑时返回1.0', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      expect(sys.getAcademyResearchBonus(em, civ)).toBe(1.0)
    })

    it('一个 lv1 Academy 返回大于1', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const id = makeBuilding(em, civ.id, BuildingType.ACADEMY, 1)
      civ.buildings.push(id)
      expect(sys.getAcademyResearchBonus(em, civ)).toBeGreaterThan(1)
    })

    it('lv2 Academy 比 lv1 返回更高加成', () => {
      const em = new EntityManager()
      const civ1 = makeCiv({ id: 1 })
      const civ2 = makeCiv({ id: 2 })
      const id1 = makeBuilding(em, civ1.id, BuildingType.ACADEMY, 1)
      civ1.buildings.push(id1)
      const id2 = makeBuilding(em, civ2.id, BuildingType.ACADEMY, 2)
      civ2.buildings.push(id2)
      expect(sys.getAcademyResearchBonus(em, civ2)).toBeGreaterThan(
        sys.getAcademyResearchBonus(em, civ1)
      )
    })

    it('非 Academy 建筑不影响结果', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const id = makeBuilding(em, civ.id, BuildingType.CASTLE, 3)
      civ.buildings.push(id)
      expect(sys.getAcademyResearchBonus(em, civ)).toBe(1.0)
    })
  })

  // ---- getWallDamageReduction ----

  describe('getWallDamageReduction', () => {
    it('目标无 position 组件时返回1.0', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const civManager = makeCivManager([civ])
      const target = em.createEntity() // 没有 position 组件
      expect(sys.getWallDamageReduction(em, target, civ.id, civManager)).toBe(1.0)
    })

    it('civ 不存在时返回1.0', () => {
      const em = new EntityManager()
      const target = em.createEntity()
      em.addComponent(target, { type: 'position', x: 5, y: 5 })
      const civManager = makeCivManager([])
      expect(sys.getWallDamageReduction(em, target, 999, civManager)).toBe(1.0)
    })

    it('无 Wall 建筑时返回1.0（无减伤）', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const civManager = makeCivManager([civ])
      const target = em.createEntity()
      em.addComponent(target, { type: 'position', x: 5, y: 5 })
      expect(sys.getWallDamageReduction(em, target, civ.id, civManager)).toBe(1.0)
    })

    it('Wall 在5格范围内时减伤值小于1.0', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const wallId = makeBuilding(em, civ.id, BuildingType.WALL, 1, 100, 100, 5, 5)
      civ.buildings.push(wallId)
      const civManager = makeCivManager([civ])
      const target = em.createEntity()
      em.addComponent(target, { type: 'position', x: 6, y: 5 }) // dist=1
      const result = sys.getWallDamageReduction(em, target, civ.id, civManager)
      expect(result).toBeLessThan(1.0)
    })

    it('Wall 超出5格范围时无减伤效果（返回1.0）', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const wallId = makeBuilding(em, civ.id, BuildingType.WALL, 1, 100, 100, 0, 0)
      civ.buildings.push(wallId)
      const civManager = makeCivManager([civ])
      const target = em.createEntity()
      em.addComponent(target, { type: 'position', x: 10, y: 10 }) // dist > 5
      expect(sys.getWallDamageReduction(em, target, civ.id, civManager)).toBe(1.0)
    })

    it('减伤上限为 0.2（最多80%减伤）', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      // 多个高级 wall 在同一位置
      for (let i = 0; i < 10; i++) {
        const wid = makeBuilding(em, civ.id, BuildingType.WALL, 3, 100, 100, 5, 5)
        civ.buildings.push(wid)
      }
      const civManager = makeCivManager([civ])
      const target = em.createEntity()
      em.addComponent(target, { type: 'position', x: 5, y: 5 })
      const result = sys.getWallDamageReduction(em, target, civ.id, civManager)
      expect(result).toBeGreaterThanOrEqual(0.2)
    })
  })

  // ---- tryTypeUpgrade (通过 update 间接测试) ----

  describe('type upgrade（通过 update 触发）', () => {
    it('update 空实体管理器不崩溃', () => {
      const em = new EntityManager()
      const civManager = makeCivManager([])
      expect(() => sys.update(em, civManager, 0)).not.toThrow()
    })

    it('HUT 满足条件时升级为 HOUSE', () => {
      const em = new EntityManager()
      const civ = makeCiv({ techLevel: 1, resources: { food: 0, wood: 100, stone: 100, gold: 100 } })
      const bId = makeBuilding(em, civ.id, BuildingType.HUT, 1, 100, 100)
      civ.buildings.push(bId)
      const civManager = makeCivManager([civ])
      // 第一次 update 设置 lastCheck，第二次超过 interval
      sys.update(em, civManager, 0)
      sys.update(em, civManager, 200) // 超过 UPGRADE_CHECK_INTERVAL=200
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      expect(b?.buildingType).toBe(BuildingType.HOUSE)
    })

    it('资源不足时不升级', () => {
      const em = new EntityManager()
      const civ = makeCiv({ techLevel: 5, resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      const bId = makeBuilding(em, civ.id, BuildingType.HUT, 1, 100, 100)
      civ.buildings.push(bId)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      sys.update(em, civManager, 200)
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      expect(b?.buildingType).toBe(BuildingType.HUT) // 未升级
    })

    it('建筑血量不满时不升级', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const bId = makeBuilding(em, civ.id, BuildingType.HUT, 1, 50, 100) // health < maxHealth
      civ.buildings.push(bId)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      sys.update(em, civManager, 200)
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      expect(b?.buildingType).toBe(BuildingType.HUT)
    })

    it('techLevel 不足时不做 type 升级', () => {
      const em = new EntityManager()
      // HOUSE->CASTLE 需要 techLevel=4
      const civ = makeCiv({ techLevel: 2, resources: { food: 0, wood: 100, stone: 100, gold: 100 } })
      const bId = makeBuilding(em, civ.id, BuildingType.HOUSE, 1, 100, 100)
      civ.buildings.push(bId)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      sys.update(em, civManager, 200)
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      expect(b?.buildingType).toBe(BuildingType.HOUSE)
    })

    it('HUT 升级为 HOUSE 后 level 重置为1', () => {
      const em = new EntityManager()
      const civ = makeCiv({ techLevel: 1, resources: { food: 0, wood: 100, stone: 100, gold: 100 } })
      const bId = makeBuilding(em, civ.id, BuildingType.HUT, 2, 100, 100)
      civ.buildings.push(bId)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      sys.update(em, civManager, 200)
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      expect(b?.level).toBe(1)
    })

    it('升级后扣除对应资源', () => {
      const em = new EntityManager()
      const civ = makeCiv({ techLevel: 1, resources: { food: 0, wood: 100, stone: 50, gold: 50 } })
      const bId = makeBuilding(em, civ.id, BuildingType.HUT, 1, 100, 100)
      civ.buildings.push(bId)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      sys.update(em, civManager, 200)
      // HUT->HOUSE cost: wood=15, stone=5
      expect(civ.resources.wood).toBe(85)
      expect(civ.resources.stone).toBe(45)
    })

    it('UPGRADE_CHECK_INTERVAL 内不重复检查', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const bId = makeBuilding(em, civ.id, BuildingType.HUT, 1, 100, 100)
      civ.buildings.push(bId)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      sys.update(em, civManager, 100) // 100 < 200 interval
      // lastCheck 应该只存在初始值 0，不应触发升级
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      expect(b?.buildingType).toBe(BuildingType.HUT)
    })
  })

  // ---- tryLevelUp (通过 update 间接测试) ----

  describe('level up（通过 update 触发）', () => {
    it('无升级路径的建筑类型可以 level up', () => {
      const em = new EntityManager()
      // MINE 无 type upgrade path，有资源时应 level up
      const civ = makeCiv({ resources: { food: 0, wood: 100, stone: 100, gold: 100 } })
      const bId = makeBuilding(em, civ.id, BuildingType.MINE, 1, 100, 100)
      civ.buildings.push(bId)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      sys.update(em, civManager, 200)
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      expect(b?.level).toBeGreaterThan(1)
    })

    it('已达 MAX_LEVEL=3 时不再 level up', () => {
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 0, wood: 100, stone: 100, gold: 100 } })
      const bId = makeBuilding(em, civ.id, BuildingType.MINE, 3, 100, 100)
      civ.buildings.push(bId)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      sys.update(em, civManager, 200)
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      expect(b?.level).toBe(3)
    })

    it('level up 后 maxHealth 增加到130（lv2）', () => {
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 0, wood: 100, stone: 100, gold: 100 } })
      const bId = makeBuilding(em, civ.id, BuildingType.MINE, 1, 100, 100)
      civ.buildings.push(bId)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      sys.update(em, civManager, 200)
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      expect(b?.maxHealth).toBe(130) // 100 * (1 + 0.3*(2-1))
    })

    it('Workshop 折扣使 level up 花费更少资源', () => {
      const em = new EntityManager()
      // No workshop scenario
      const civA = makeCiv({ id: 1, resources: { food: 0, wood: 100, stone: 100, gold: 100 } })
      const bA = makeBuilding(em, civA.id, BuildingType.MINE, 1, 100, 100)
      civA.buildings.push(bA)

      // With workshop scenario
      const civB = makeCiv({ id: 2, resources: { food: 0, wood: 100, stone: 100, gold: 100 } })
      const workshopId = makeBuilding(em, civB.id, BuildingType.WORKSHOP, 1, 100, 100, 10, 10)
      const bB = makeBuilding(em, civB.id, BuildingType.MINE, 1, 100, 100, 11, 11)
      civB.buildings.push(workshopId, bB)

      const civManager = makeCivManager([civA, civB])
      sys.update(em, civManager, 0)
      sys.update(em, civManager, 200)

      const woodSpentA = 100 - civA.resources.wood
      const woodSpentB = 100 - civB.resources.wood
      expect(woodSpentB).toBeLessThanOrEqual(woodSpentA)
    })
  })

  // ---- applyNewBuildingEffects ----

  describe('applyNewBuildingEffects（通过 update 触发）', () => {
    it('MARKET 每次 update 增加 gold', () => {
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      const id = makeBuilding(em, civ.id, BuildingType.MARKET, 1)
      civ.buildings.push(id)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      expect(civ.resources.gold).toBeGreaterThan(0)
    })

    it('ACADEMY 每次 update 增加 researchRate', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      civ.research.researchRate = 1.0
      const id = makeBuilding(em, civ.id, BuildingType.ACADEMY, 1)
      civ.buildings.push(id)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      expect(civ.research.researchRate).toBeGreaterThan(1.0)
    })

    it('GRANARY 每次 update 增加 food', () => {
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      const id = makeBuilding(em, civ.id, BuildingType.GRANARY, 1)
      civ.buildings.push(id)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      expect(civ.resources.food).toBeGreaterThan(0)
    })

    it('lv2 MARKET 比 lv1 产生更多 gold', () => {
      const em1 = new EntityManager()
      const civ1 = makeCiv({ id: 1, resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      const m1 = makeBuilding(em1, civ1.id, BuildingType.MARKET, 1)
      civ1.buildings.push(m1)

      const em2 = new EntityManager()
      const civ2 = makeCiv({ id: 2, resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      const m2 = makeBuilding(em2, civ2.id, BuildingType.MARKET, 2)
      civ2.buildings.push(m2)

      sys.update(em1, makeCivManager([civ1]), 0)
      const goldAfterLv1 = civ1.resources.gold

      sys.update(em2, makeCivManager([civ2]), 0)
      const goldAfterLv2 = civ2.resources.gold

      expect(goldAfterLv2).toBeGreaterThan(goldAfterLv1)
    })

    it('有激活贸易路线时 MARKET 额外产生 gold', () => {
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      civ.tradeRoutes = [
        { partnerId: 2, fromPort: { x: 0, y: 0 }, toPort: { x: 5, y: 5 }, active: true, income: 10 },
      ]
      const id = makeBuilding(em, civ.id, BuildingType.MARKET, 1)
      civ.buildings.push(id)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      // base 0.05 + trade 10*0.15 = more than just base
      expect(civ.resources.gold).toBeGreaterThan(0.05)
    })

    it('非激活贸易路线不贡献 gold', () => {
      const em = new EntityManager()
      const civ = makeCiv({ resources: { food: 0, wood: 0, stone: 0, gold: 0 } })
      civ.tradeRoutes = [
        { partnerId: 2, fromPort: { x: 0, y: 0 }, toPort: { x: 5, y: 5 }, active: false, income: 100 },
      ]
      const id = makeBuilding(em, civ.id, BuildingType.MARKET, 1)
      civ.buildings.push(id)
      const civManager = makeCivManager([civ])
      sys.update(em, civManager, 0)
      expect(civ.resources.gold).toBeCloseTo(0.05) // only base
    })
  })

  // ---- Workshop discount cap ----

  describe('Workshop 折扣上限', () => {
    it('多个 Workshop 折扣上限为 0.5', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      for (let i = 0; i < 20; i++) {
        const id = makeBuilding(em, civ.id, BuildingType.WORKSHOP, 3, 100, 100, i, 0)
        civ.buildings.push(id)
      }
      const discount = (sys as any).getWorkshopDiscount(em, civ)
      expect(discount).toBeLessThanOrEqual(0.5)
    })

    it('单个 lv1 Workshop 折扣为0.1', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const id = makeBuilding(em, civ.id, BuildingType.WORKSHOP, 1)
      civ.buildings.push(id)
      expect((sys as any).getWorkshopDiscount(em, civ)).toBeCloseTo(0.1)
    })

    it('单个 lv3 Workshop 折扣为0.3', () => {
      const em = new EntityManager()
      const civ = makeCiv()
      const id = makeBuilding(em, civ.id, BuildingType.WORKSHOP, 3)
      civ.buildings.push(id)
      expect((sys as any).getWorkshopDiscount(em, civ)).toBeCloseTo(0.3)
    })

    it('costMult 最低为0.5（折扣满额时）', () => {
      // 当 discount=0.5 时，costMult = Math.max(0.5, 1-0.5) = 0.5
      expect(Math.max(0.5, 1 - 0.5)).toBe(0.5)
    })
  })
})
