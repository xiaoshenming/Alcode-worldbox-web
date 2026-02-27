import { describe, it, expect, beforeEach } from 'vitest'
import { BuildingVarietySystem } from '../systems/BuildingVarietySystem'
function makeSys() { return new BuildingVarietySystem() }
describe('BuildingVarietySystem', () => {
  let sys: BuildingVarietySystem
  beforeEach(() => { sys = makeSys() })
  it('getBuildingCount初始为0', () => { expect(sys.getBuildingCount()).toBe(0) })
  it('getCountByEra返回Map', () => { expect(sys.getCountByEra()).toBeInstanceOf(Map) })
})
