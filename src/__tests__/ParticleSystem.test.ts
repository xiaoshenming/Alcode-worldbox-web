import { describe, it, expect, beforeEach } from 'vitest'
import { ParticleSystem } from '../systems/ParticleSystem'
function makeSys() { return new ParticleSystem() }
describe('ParticleSystem', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })
  it('初始activeCount为0', () => { expect((sys as any).activeCount).toBe(0) })
  it('初始pool为数组', () => { expect(Array.isArray((sys as any).pool)).toBe(true) })
})
