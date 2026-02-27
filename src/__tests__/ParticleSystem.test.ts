import { describe, it, expect, beforeEach } from 'vitest'
import { ParticleSystem } from '../systems/ParticleSystem'

function makeSys() { return new ParticleSystem() }

describe('ParticleSystem', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('初始activeCount为0', () => { expect((sys as any).activeCount).toBe(0) })
  it('初始pool为数组', () => { expect(Array.isArray((sys as any).pool)).toBe(true) })
  it('particles getter返回数组', () => { expect(Array.isArray(sys.particles)).toBe(true) })
  it('particles getter初始长度为0', () => { expect(sys.particles).toHaveLength(0) })
  it('spawnExplosion后activeCount增加', () => {
    sys.spawnExplosion(10, 20)
    expect((sys as any).activeCount).toBeGreaterThan(0)
  })
  it('spawnDeath后activeCount增加', () => {
    sys.spawnDeath(5, 5, '#ff0000')
    expect((sys as any).activeCount).toBeGreaterThan(0)
  })
  it('spawnBirth后activeCount增加', () => {
    sys.spawnBirth(15, 15, '#00ff00')
    expect((sys as any).activeCount).toBeGreaterThan(0)
  })
  it('update()不崩溃', () => {
    sys.spawnExplosion(10, 20)
    expect(() => sys.update()).not.toThrow()
  })
})
