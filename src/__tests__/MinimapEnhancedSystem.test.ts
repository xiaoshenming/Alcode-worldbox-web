import { describe, it, expect, beforeEach } from 'vitest'
import { MinimapEnhancedSystem } from '../systems/MinimapEnhancedSystem'
function makeSys() { return new MinimapEnhancedSystem() }
describe('MinimapEnhancedSystem', () => {
  let sys: MinimapEnhancedSystem
  beforeEach(() => { sys = makeSys() })
  it('getMode返回字符串', () => { expect(typeof sys.getMode()).toBe('string') })
})
