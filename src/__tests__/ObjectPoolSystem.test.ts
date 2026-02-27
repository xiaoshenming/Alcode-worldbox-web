import { describe, it, expect, beforeEach } from 'vitest'
import { ObjectPoolSystem } from '../systems/ObjectPoolSystem'
function makeSys() { return new ObjectPoolSystem() }
describe('ObjectPoolSystem', () => {
  let sys: ObjectPoolSystem
  beforeEach(() => { sys = makeSys() })
  it('getAllStats返回对象', () => { expect(typeof sys.getAllStats()).toBe('object') })
  it('getAllStats包含particles/vec2s字段', () => {
    const stats = sys.getAllStats()
    expect(stats).toHaveProperty('particles')
    expect(stats).toHaveProperty('vec2s')
  })
  it('初始 hitRate 为 0', () => {
    const stats = sys.getAllStats()
    expect(stats.particles.hitRate).toBe(0)
  })
})
