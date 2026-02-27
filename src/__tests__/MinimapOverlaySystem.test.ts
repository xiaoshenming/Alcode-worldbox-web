import { describe, it, expect, beforeEach } from 'vitest'
import { MinimapOverlaySystem } from '../systems/MinimapOverlaySystem'
function makeSys() { return new MinimapOverlaySystem() }
describe('MinimapOverlaySystem', () => {
  let sys: MinimapOverlaySystem
  beforeEach(() => { sys = makeSys() })
  it('getMode返回字符串', () => { expect(typeof sys.getMode()).toBe('string') })
})
