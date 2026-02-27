import { describe, it, expect, beforeEach } from 'vitest'
import { MinimapEnhancedSystem } from '../systems/MinimapEnhancedSystem'
function makeSys() { return new MinimapEnhancedSystem() }
describe('MinimapEnhancedSystem', () => {
  let sys: MinimapEnhancedSystem
  beforeEach(() => { sys = makeSys() })
  it('getMode返回字符串', () => { expect(typeof sys.getMode()).toBe('string') })
  it('初始模式为 terrain', () => { expect(sys.getMode()).toBe('terrain') })
  it('setMode 可以切换模式', () => {
    sys.setMode('population')
    expect(sys.getMode()).toBe('population')
  })
  it('cycleMode 切换到下一个模式', () => {
    sys.cycleMode()
    expect(sys.getMode()).not.toBe('terrain')
  })
  it('tick初始为0', () => { expect((sys as any).tick).toBe(0) })
})
