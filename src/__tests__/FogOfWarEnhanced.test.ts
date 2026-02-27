import { describe, it, expect, beforeEach } from 'vitest'
import { FogOfWarEnhanced } from '../systems/FogOfWarEnhanced'
function makeSys() { return new FogOfWarEnhanced() }
describe('FogOfWarEnhanced', () => {
  let sys: FogOfWarEnhanced
  beforeEach(() => { sys = makeSys() })
  it('getExploredPercent初始为0', () => { expect(sys.getExploredPercent()).toBe(0) })
  it('setActiveCiv 不崩溃', () => { expect(() => sys.setActiveCiv(1)).not.toThrow() })
  it('isExplored 未探索区域返回 false', () => { expect(sys.isExplored(0, 0)).toBe(false) })
  it('enabled初始为true', () => { expect((sys as any).enabled).toBe(true) })
  it('activeCivId初始为0', () => { expect((sys as any).activeCivId).toBe(0) })
})
