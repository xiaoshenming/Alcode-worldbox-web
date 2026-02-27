import { describe, it, expect, beforeEach } from 'vitest'
import { CityPlanningSystem } from '../systems/CityPlanningSystem'
function makeSys() { return new CityPlanningSystem() }
describe('CityPlanningSystem', () => {
  let sys: CityPlanningSystem
  beforeEach(() => { sys = makeSys() })
  it('初始buildingCounts为空Map', () => { expect((sys as any).buildingCounts.size).toBe(0) })
})
