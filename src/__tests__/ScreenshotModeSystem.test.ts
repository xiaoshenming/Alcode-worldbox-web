import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ScreenshotModeSystem } from '../systems/ScreenshotModeSystem'

function makeSys() { return new ScreenshotModeSystem() }

describe('ScreenshotModeSystem', () => {
  let sys: ScreenshotModeSystem
  beforeEach(() => { sys = makeSys() })

  it('初始active为false', () => { expect((sys as any).active).toBe(false) })
  it('isActive初始为false', () => { expect(sys.isActive()).toBe(false) })
  it('multiplier字段初始为1', () => { expect((sys as any).multiplier).toBe(1) })
  it('toastTimer字段初始为0', () => { expect((sys as any).toastTimer).toBe(0) })
  it('enterScreenshotMode()后isActive()为true（mock document）', () => {
    vi.stubGlobal('document', {
      querySelector: () => null,
      createElement: () => ({ getContext: () => null, width: 0, height: 0, style: {} }),
    })
    sys.enterScreenshotMode()
    expect(sys.isActive()).toBe(true)
    vi.unstubAllGlobals()
  })
  it('enterScreenshotMode(2)后multiplier为2（mock document）', () => {
    vi.stubGlobal('document', {
      querySelector: () => null,
      createElement: () => ({ getContext: () => null, width: 0, height: 0, style: {} }),
    })
    sys.enterScreenshotMode(2)
    expect((sys as any).multiplier).toBe(2)
    vi.unstubAllGlobals()
  })
  it('update()不崩溃', () => {
    expect(() => sys.update()).not.toThrow()
  })
  it('update()toastTimer未激活时不变', () => {
    sys.update()
    expect((sys as any).toastTimer).toBe(0)
  })
})
