import { describe, it, expect, beforeEach } from 'vitest'
import { SandboxSettingsSystem } from '../systems/SandboxSettingsSystem'
function makeSys() { return new SandboxSettingsSystem() }
describe('SandboxSettingsSystem', () => {
  let sys: SandboxSettingsSystem
  beforeEach(() => { sys = makeSys() })
  it('初始values为对象', () => { expect(typeof (sys as any).values).toBe('object') })
  it('初始panelOpen为false', () => { expect((sys as any).panelOpen).toBe(false) })
})
