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
})
