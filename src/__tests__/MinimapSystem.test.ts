import { describe, it, expect, beforeEach } from 'vitest'
import { MinimapSystem } from '../systems/MinimapSystem'
function makeSys() { return new MinimapSystem(200, 200) }
describe('MinimapSystem', () => {
  let sys: MinimapSystem
  beforeEach(() => { sys = makeSys() })
  it('getMode返回字符串', () => { expect(typeof sys.getMode()).toBe('string') })
})
