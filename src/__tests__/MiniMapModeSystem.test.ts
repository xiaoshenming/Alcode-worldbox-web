import { describe, it, expect, beforeEach } from 'vitest'
import { MiniMapModeSystem } from '../systems/MiniMapModeSystem'
function makeSys() { return new MiniMapModeSystem() }
describe('MiniMapModeSystem', () => {
  let sys: MiniMapModeSystem
  beforeEach(() => { sys = makeSys() })
  it('getMode返回字符串', () => { expect(typeof sys.getMode()).toBe('string') })
  it('初始模式为 normal', () => { expect(sys.getMode()).toBe('normal') })
  it('cycleMode 切换到下一个模式', () => {
    sys.cycleMode()
    expect(sys.getMode()).toBe('political')
  })
  it('cycleMode 循环4次回到 normal', () => {
    for (let i = 0; i < 4; i++) sys.cycleMode()
    expect(sys.getMode()).toBe('normal')
  })
  it('setMode 可以直接设置模式', () => {
    sys.setMode('resource')
    expect(sys.getMode()).toBe('resource')
  })
  it('setMode population 后 getMode 返回 population', () => {
    sys.setMode('population')
    expect(sys.getMode()).toBe('population')
  })
})
