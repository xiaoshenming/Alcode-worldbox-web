import { describe, it, expect, beforeEach } from 'vitest'
import { FogOfWarSystem } from '../systems/FogOfWarSystem'
function makeSys() { return new FogOfWarSystem() }
describe('FogOfWarSystem', () => {
  let sys: FogOfWarSystem
  beforeEach(() => { sys = makeSys() })
  it('getCivFog未知civId返回undefined', () => { expect(sys.getCivFog(999)).toBeUndefined() })
  it('getExplorationPercent未知civId返回0', () => { expect(sys.getExplorationPercent(999)).toBe(0) })
  it('getDiscoveries未知civId返回空数组', () => { expect(sys.getDiscoveries(999)).toHaveLength(0) })
})
