import { describe, it, expect, beforeEach } from 'vitest'
import { AmbientParticleSystem } from '../systems/AmbientParticleSystem'
function makeSys() { return new AmbientParticleSystem() }
describe('AmbientParticleSystem', () => {
  let sys: AmbientParticleSystem
  beforeEach(() => { sys = makeSys() })
  it('可以实例化', () => { expect(sys).toBeDefined() })
})
