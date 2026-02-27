import { describe, it, expect, beforeEach } from 'vitest'
import { BuildingUpgradeSystem } from '../systems/BuildingUpgradeSystem'
function makeSys() { return new BuildingUpgradeSystem() }
describe('BuildingUpgradeSystem', () => {
  let sys: BuildingUpgradeSystem
  beforeEach(() => { sys = makeSys() })
  it('初始lastCheck为空Map', () => { expect((sys as any).lastCheck.size).toBe(0) })
})
