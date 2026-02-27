import { describe, it, expect, beforeEach } from 'vitest'
import { UnifiedParticleSystem } from '../systems/UnifiedParticleSystem'
function makeSys() { return new UnifiedParticleSystem() }
describe('UnifiedParticleSystem', () => {
  let sys: UnifiedParticleSystem
  beforeEach(() => { sys = makeSys() })
  it('可以实例化', () => { expect(sys).toBeDefined() })
})
