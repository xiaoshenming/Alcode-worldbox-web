import { describe, it, expect, beforeEach } from 'vitest'
import { HelpOverlaySystem } from '../systems/HelpOverlaySystem'
function makeSys() { return new HelpOverlaySystem() }
describe('HelpOverlaySystem', () => {
  let sys: HelpOverlaySystem
  beforeEach(() => { sys = makeSys() })
  it('初始visible为false', () => { expect((sys as any).visible).toBe(false) })
})
