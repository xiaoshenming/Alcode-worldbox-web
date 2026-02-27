import { describe, it, expect, beforeEach } from 'vitest'
import { HelpOverlaySystem } from '../systems/HelpOverlaySystem'
function makeSys() { return new HelpOverlaySystem() }
describe('HelpOverlaySystem', () => {
  let sys: HelpOverlaySystem
  beforeEach(() => { sys = makeSys() })
  it('初始visible为false', () => { expect((sys as any).visible).toBe(false) })
  it('isVisible初始为false', () => { expect(sys.isVisible()).toBe(false) })
  it('isVisible返回布尔值', () => { expect(typeof sys.isVisible()).toBe('boolean') })
  it('初始el为null', () => { expect((sys as any).el).toBeNull() })
  it('shortcuts列表不为空', () => { expect((sys as any).shortcuts.length).toBeGreaterThan(0) })
})
