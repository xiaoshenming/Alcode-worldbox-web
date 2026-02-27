import { describe, it, expect, beforeEach } from 'vitest'
import { MiniMapModeSystem } from '../systems/MiniMapModeSystem'
function makeSys() { return new MiniMapModeSystem() }
describe('MiniMapModeSystem', () => {
  let sys: MiniMapModeSystem
  beforeEach(() => { sys = makeSys() })
  it('getMode返回字符串', () => { expect(typeof sys.getMode()).toBe('string') })
})
