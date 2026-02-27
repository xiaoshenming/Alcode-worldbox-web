import { describe, it, expect, beforeEach } from 'vitest'
import { CameraAnimationSystem } from '../systems/CameraAnimationSystem'
function makeSys() { return new CameraAnimationSystem() }
describe('CameraAnimationSystem', () => {
  let sys: CameraAnimationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始_following为false', () => { expect((sys as any)._following).toBe(false) })
  it('初始_shakes为空', () => { expect((sys as any)._shakes).toHaveLength(0) })
})
