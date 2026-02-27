import { describe, it, expect, beforeEach } from 'vitest'
import { EraVisualSystem } from '../systems/EraVisualSystem'
function makeSys() { return new EraVisualSystem() }
describe('EraVisualSystem', () => {
  let sys: EraVisualSystem
  beforeEach(() => { sys = makeSys() })
  it('getCurrentEra返回字符串', () => { expect(typeof sys.getCurrentEra()).toBe('string') })
  it('getUITheme返回对象', () => {
    const theme = sys.getUITheme()
    expect(theme).toHaveProperty('borderColor')
    expect(theme).toHaveProperty('accentColor')
  })
  it('初始getCurrentEra为stone', () => { expect(sys.getCurrentEra()).toBe('stone') })
  it('setEra 切换时代', () => {
    sys.setEra('bronze' as any)
    // targetEra立即改变，currentEra在过渡动画后改变
    expect((sys as any).targetEra).toBe('bronze')
  })
  it('currentEra初始为stone', () => { expect((sys as any).currentEra).toBe('stone') })
})
