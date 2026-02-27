import { describe, it, expect, beforeEach } from 'vitest'
import { TerrainDecorationSystem } from '../systems/TerrainDecorationSystem'

function makeSys() { return new TerrainDecorationSystem() }

describe('TerrainDecorationSystem', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => { sys = makeSys() })

  it('初始worldW为0', () => { expect((sys as any).worldW).toBe(0) })
  it('初始worldH为0', () => { expect((sys as any).worldH).toBe(0) })
  it('getActiveParticleCount初始为0', () => {
    expect(sys.getActiveParticleCount()).toBe(0)
  })
  it('getActiveParticleCount返回数字', () => {
    expect(typeof sys.getActiveParticleCount()).toBe('number')
  })
  it('setWind不崩溃', () => {
    expect(() => sys.setWind(1, 0.5)).not.toThrow()
  })
  it('setWind后windX字段更新', () => {
    sys.setWind(2, 3)
    expect((sys as any).windX).toBe(2)
    expect((sys as any).windY).toBe(3)
  })
  it('setSeason不崩溃', () => {
    expect(() => sys.setSeason('summer')).not.toThrow()
  })
  it('setSeason(winter)后season字段变化', () => {
    sys.setSeason('winter')
    expect((sys as any).season).toBe('winter')
  })
  it('setSeason(spring)后season字段为spring', () => {
    sys.setSeason('winter')
    sys.setSeason('spring')
    expect((sys as any).season).toBe('spring')
  })
})
