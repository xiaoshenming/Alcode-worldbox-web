import { describe, it, expect, beforeEach } from 'vitest'
import { BuildingVarietySystem } from '../systems/BuildingVarietySystem'
import type { Era } from '../systems/BuildingVarietySystem'
function makeSys() { return new BuildingVarietySystem() }
describe('BuildingVarietySystem', () => {
  let sys: BuildingVarietySystem
  beforeEach(() => { sys = makeSys() })
  it('getBuildingCount初始为0', () => { expect(sys.getBuildingCount()).toBe(0) })
  it('getBuildingTypes primitive 返回数组', () => {
    const types = sys.getBuildingTypes('primitive' as Era)
    expect(Array.isArray(types)).toBe(true)
    expect(types.length).toBeGreaterThan(0)
  })
  it('getAvailableBuildings medieval 返回比primitive更多的类型', () => {
    const primitiveTypes = sys.getAvailableBuildings('primitive' as Era)
    const medievalTypes = sys.getAvailableBuildings('medieval' as Era)
    expect(medievalTypes.length).toBeGreaterThan(primitiveTypes.length)
  })
  it('static eraFromTechLevel techLevel=1 返回 primitive', () => {
    const era = BuildingVarietySystem.eraFromTechLevel(1)
    expect(era).toBe('primitive')
  })
  it('registerBuilding 后 getBuildingCount 增加', () => {
    const mockBuilding = { type: 'building', buildingType: 'HOUSE' as any, civId: 1, health: 100, maxHealth: 100, level: 1 }
    sys.registerBuilding(1, mockBuilding as any)
    expect(sys.getBuildingCount()).toBe(1)
  })
  it('removeBuilding 后 getBuildingCount 减少', () => {
    const mockBuilding = { type: 'building', buildingType: 'HOUSE' as any, civId: 1, health: 100, maxHealth: 100, level: 1 }
    sys.registerBuilding(1, mockBuilding as any)
    sys.removeBuilding(1)
    expect(sys.getBuildingCount()).toBe(0)
  })
})
