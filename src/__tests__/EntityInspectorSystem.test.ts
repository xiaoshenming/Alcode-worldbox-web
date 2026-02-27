import { describe, it, expect, beforeEach } from 'vitest'
import { EntityInspectorSystem } from '../systems/EntityInspectorSystem'
function makeSys() { return new EntityInspectorSystem() }
describe('EntityInspectorSystem', () => {
  let sys: EntityInspectorSystem
  beforeEach(() => { sys = makeSys() })
  it('初始panelOpen为false', () => { expect((sys as any).panelOpen).toBe(false) })
  it('初始entityId为null', () => { expect((sys as any).entityId).toBeNull() })
})
