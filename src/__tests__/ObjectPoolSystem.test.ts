import { describe, it, expect, beforeEach } from 'vitest'
import { ObjectPoolSystem } from '../systems/ObjectPoolSystem'
function makeSys() { return new ObjectPoolSystem() }
describe('ObjectPoolSystem', () => {
  let sys: ObjectPoolSystem
  beforeEach(() => { sys = makeSys() })
  it('particles池存在', () => { expect(sys.particles).toBeDefined() })
  it('particles池hitRate计算正确（无acquire时为0）', () => {
    const pool = (sys as any).particles
    const hitRate = pool.acquireCount > 0 ? pool.hitCount / pool.acquireCount : 0
    expect(hitRate).toBe(0)
  })
  it('vec2s池存在', () => { expect(sys.vec2s).toBeDefined() })
  it('particles池totalCreated等于initialSize(64)', () => { expect((sys as any).particles.totalCreated).toBe(64) })
  it('particles池acquireCount初始为0', () => { expect((sys as any).particles.acquireCount).toBe(0) })
})
