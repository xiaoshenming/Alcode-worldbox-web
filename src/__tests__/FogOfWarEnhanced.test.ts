import { describe, it, expect, beforeEach } from 'vitest'
import { FogOfWarEnhanced } from '../systems/FogOfWarEnhanced'
function makeSys() { return new FogOfWarEnhanced() }
describe('FogOfWarEnhanced', () => {
  let sys: FogOfWarEnhanced
  beforeEach(() => { sys = makeSys() })
  it('getExploredPercent初始为0', () => { expect(sys.getExploredPercent()).toBe(0) })
})
