import { describe, it, expect, beforeEach } from 'vitest'
import { ScreenshotModeSystem } from '../systems/ScreenshotModeSystem'
function makeSys() { return new ScreenshotModeSystem() }
describe('ScreenshotModeSystem', () => {
  let sys: ScreenshotModeSystem
  beforeEach(() => { sys = makeSys() })
  it('初始active为false', () => { expect((sys as any).active).toBe(false) })
  it('isActive初始为false', () => { expect(sys.isActive()).toBe(false) })
})
