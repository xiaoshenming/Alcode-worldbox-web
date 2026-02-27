import { describe, it, expect, beforeEach } from 'vitest'
import { RenderCullingSystem } from '../systems/RenderCullingSystem'
function makeSys() { return new RenderCullingSystem() }
describe('RenderCullingSystem', () => {
  let sys: RenderCullingSystem
  beforeEach(() => { sys = makeSys() })
  it('getLODLevel返回0/1/2', () => {
    const level = sys.getLODLevel(0, 0)
    expect([0, 1, 2]).toContain(level)
  })
  it('getStats返回对象', () => { expect(typeof sys.getStats()).toBe('object') })
  it('getVisibleTileBounds返回对象', () => { expect(typeof sys.getVisibleTileBounds()).toBe('object') })
  it('worldW初始为200', () => { expect((sys as any).worldW).toBe(200) })
  it('worldH初始为200', () => { expect((sys as any).worldH).toBe(200) })
})
