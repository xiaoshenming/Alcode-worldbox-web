import { describe, it, expect, beforeEach } from 'vitest'
import { WaterAnimationSystem } from '../systems/WaterAnimationSystem'
function makeSys() { return new WaterAnimationSystem() }
describe('WaterAnimationSystem', () => {
  let sys: WaterAnimationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始time为0', () => { expect((sys as any).time).toBe(0) })
  it('初始foamParticles为空', () => { expect((sys as any).foamParticles).toHaveLength(0) })
})
