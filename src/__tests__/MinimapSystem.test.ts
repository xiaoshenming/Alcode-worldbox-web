import { describe, it, expect, beforeEach } from 'vitest'
import { MinimapSystem } from '../systems/MinimapSystem'
function makeSys() { return new MinimapSystem(200, 200) }
describe('MinimapSystem', () => {
  let sys: MinimapSystem
  beforeEach(() => { sys = makeSys() })
  it('getMode返回字符串', () => { expect(typeof sys.getMode()).toBe('string') })
  it('初始模式为 terrain', () => { expect(sys.getMode()).toBe('terrain') })
  it('setMode 可以切换模式', () => {
    sys.setMode('political')
    expect(sys.getMode()).toBe('political')
  })
  it('setMode resource 后 getMode 返回 resources', () => {
    sys.setMode('resources')
    expect(sys.getMode()).toBe('resources')
  })
})
