import { describe, it, expect, beforeEach } from 'vitest'
import { LODRenderSystem } from '../systems/LODRenderSystem'
function makeSys() { return new LODRenderSystem() }
describe('LODRenderSystem', () => {
  let sys: LODRenderSystem
  beforeEach(() => { sys = makeSys() })
  it('getLOD返回LOD级别', () => { expect(typeof sys.getLOD()).toBe('string') })
  it('getStats返回对象', () => {
    const stats = sys.getStats()
    expect(stats).toHaveProperty('rendered')
    expect(stats).toHaveProperty('culled')
  })
  it('getStats.rendered初始为0', () => { expect(sys.getStats().rendered).toBe(0) })
  it('getStats.culled初始为0', () => { expect(sys.getStats().culled).toBe(0) })
  it('getStats.lod初始与getLOD()一致', () => { expect(sys.getStats().lod).toBe(sys.getLOD()) })
})
