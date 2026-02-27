import { describe, it, expect, beforeEach } from 'vitest'
import { UnifiedParticleSystem } from '../systems/UnifiedParticleSystem'
function makeSys() { return new UnifiedParticleSystem() }
describe('UnifiedParticleSystem', () => {
  let sys: UnifiedParticleSystem
  beforeEach(() => { sys = makeSys() })
  it('可以实例化', () => { expect(sys).toBeDefined() })
  it('getActiveCount初始为0', () => { expect(sys.getActiveCount()).toBe(0) })
  it('getPoolUsage初始为0', () => { expect(sys.getPoolUsage()).toBe(0) })
})
