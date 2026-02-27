import { describe, it, expect, beforeEach } from 'vitest'
import { CameraAnimationSystem } from '../systems/CameraAnimationSystem'
function makeSys() { return new CameraAnimationSystem() }
describe('CameraAnimationSystem', () => {
  let sys: CameraAnimationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始_following为false', () => { expect((sys as any)._following).toBe(false) })
  it('初始_shakes为空', () => { expect((sys as any)._shakes).toHaveLength(0) })
  it('followTarget 设置_following为true', () => {
    sys.followTarget(10, 20)
    expect((sys as any)._following).toBe(true)
  })
  it('stopFollow 设置_following为false', () => {
    sys.followTarget(10, 20)
    sys.stopFollow()
    expect((sys as any)._following).toBe(false)
  })
  it('shake 后 _shakes 数组增加', () => {
    sys.shake(5, 30)
    expect((sys as any)._shakes.length).toBeGreaterThan(0)
  })
  it('shake 存储正确的强度', () => {
    sys.shake(5, 30)
    const entry = (sys as any)._shakes[0]
    expect(entry.intensity).toBe(5)
    expect(entry.remaining).toBe(30)
  })
})
