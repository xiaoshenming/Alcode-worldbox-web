import { describe, it, expect, beforeEach } from 'vitest'
import { BuildingUpgradeSystem } from '../systems/BuildingUpgradeSystem'
import { EntityManager } from '../ecs/Entity'
import type { Civilization } from '../civilization/Civilization'

function makeSys() { return new BuildingUpgradeSystem() }

function makeCiv(id = 1): Civilization {
  return {
    id, name: 'Test', color: '#fff', population: 10,
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

describe('BuildingUpgradeSystem', () => {
  let sys: BuildingUpgradeSystem
  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => { expect(sys).toBeDefined() })

  it('getWallDamageReduction 无建筑时返回1.0（无减伤）', () => {
    const em = new EntityManager()
    const civ = makeCiv()
    const target = em.createEntity()
    const mockCivManager = { getCultureBonus: () => 1 }
    const result = sys.getWallDamageReduction(em, target, civ.id, mockCivManager as any)
    expect(result).toBe(1.0)
  })

  it('getWorkshopSpeedBonus 无建筑时返回1', () => {
    const em = new EntityManager()
    const civ = makeCiv()
    const result = sys.getWorkshopSpeedBonus(em, civ)
    expect(result).toBeGreaterThanOrEqual(1)
  })

  it('getAcademyResearchBonus 无建筑时返回1', () => {
    const em = new EntityManager()
    const civ = makeCiv()
    const result = sys.getAcademyResearchBonus(em, civ)
    expect(result).toBeGreaterThanOrEqual(1)
  })

  it('update() 空实体管理器不崩溃', () => {
    const em = new EntityManager()
    const civManager = { civilizations: new Map() }
    expect(() => sys.update(em, civManager as any, 0)).not.toThrow()
  })
})
