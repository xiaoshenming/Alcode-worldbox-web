import { describe, it, expect, beforeEach } from 'vitest'
import { FogOfWarRenderer } from '../systems/FogOfWarRenderer'
function makeSys() { return new FogOfWarRenderer() }
describe('FogOfWarRenderer', () => {
  let sys: FogOfWarRenderer
  beforeEach(() => { sys = makeSys() })
  it('可以实例化', () => { expect(sys).toBeDefined() })
  it('初始animTime为0', () => { expect((sys as any).animTime).toBe(0) })
  it('初始frameCount为0', () => { expect((sys as any).frameCount).toBe(0) })
  it('初始fogCanvas为null（懒加载）', () => { expect((sys as any).fogCanvas).toBeNull() })
  it('初始activeParticleCount为0', () => { expect((sys as any).activeParticleCount).toBe(0) })
  it('update() 不崩溃', () => {
    expect(() => sys.update()).not.toThrow()
  })
  it('update() 后animTime增加', () => {
    sys.update()
    expect((sys as any).animTime).toBeGreaterThan(0)
  })
})
