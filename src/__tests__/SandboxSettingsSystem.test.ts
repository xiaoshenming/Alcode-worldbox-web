import { describe, it, expect, beforeEach } from 'vitest'
import { SandboxSettingsSystem } from '../systems/SandboxSettingsSystem'
function makeSys() { return new SandboxSettingsSystem() }
describe('SandboxSettingsSystem', () => {
  let sys: SandboxSettingsSystem
  beforeEach(() => { sys = makeSys() })
  it('初始values为对象', () => { expect(typeof (sys as any).values).toBe('object') })
  it('初始panelOpen为false', () => { expect((sys as any).panelOpen).toBe(false) })
  it('get reproductionRate 返回默认值1', () => { expect(sys.get('reproductionRate')).toBe(1) })
  it('set 修改值后 get 返回新值', () => {
    sys.set('reproductionRate', 2)
    expect(sys.get('reproductionRate')).toBe(2)
  })
  it('get peacefulMode 初始为false', () => { expect(sys.get('peacefulMode')).toBe(false) })
  it('isPanelOpen 初始为false', () => { expect(sys.isPanelOpen()).toBe(false) })
  it('togglePanel 切换panelOpen', () => {
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(false)
  })
})
