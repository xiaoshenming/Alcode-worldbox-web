import { describe, it, expect, beforeEach } from 'vitest'
import { MinimapOverlaySystem } from '../systems/MinimapOverlaySystem'
function makeSys() { return new MinimapOverlaySystem() }
describe('MinimapOverlaySystem', () => {
  let sys: MinimapOverlaySystem
  beforeEach(() => { sys = makeSys() })
  it('getMode返回字符串', () => { expect(typeof sys.getMode()).toBe('string') })
  it('初始模式为 terrain', () => { expect(sys.getMode()).toBe('terrain') })
  it('setMode 可以切换模式', () => {
    sys.setMode('political')
    expect(sys.getMode()).toBe('political')
  })
  it('nextMode 切换到下一个模式', () => {
    const next = sys.nextMode()
    expect(typeof next).toBe('string')
    expect(sys.getMode()).toBe(next)
  })
  it('mode初始为terrain', () => { expect((sys as any).mode).toBe('terrain') })
})
