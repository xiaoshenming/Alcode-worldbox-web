import { describe, it, expect, beforeEach } from 'vitest'
import { EntityInspectorSystem } from '../systems/EntityInspectorSystem'
function makeSys() { return new EntityInspectorSystem() }
describe('EntityInspectorSystem', () => {
  let sys: EntityInspectorSystem
  beforeEach(() => { sys = makeSys() })
  it('初始panelOpen为false', () => { expect((sys as any).panelOpen).toBe(false) })
  it('初始entityId为null', () => { expect((sys as any).entityId).toBeNull() })
  it('isPanelOpen 初始为false', () => { expect(sys.isPanelOpen()).toBe(false) })
  it('togglePanel 切换面板状态', () => {
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(false)
  })
  it('inspect 设置entityId', () => {
    const mockComponents = { position: { type: 'position', x: 10, y: 20 } }
    sys.inspect(1, mockComponents)
    expect((sys as any).entityId).toBe(1)
  })
})
