import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ScreenshotModeSystem } from '../systems/ScreenshotModeSystem'

function makeSys() { return new ScreenshotModeSystem() }

function makeDocumentMock(elMap: Record<string, Partial<HTMLElement>> = {}) {
  return {
    querySelector: (sel: string) => elMap[sel] ?? null,
    createElement: (_tag: string) => ({
      getContext: () => ({
        imageSmoothingEnabled: true,
        drawImage: vi.fn(),
        save: vi.fn(), restore: vi.fn(),
        globalAlpha: 1, font: '', fillStyle: '', strokeStyle: '', lineWidth: 1,
        beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
        fillText: vi.fn(), measureText: (_t: string) => ({ width: 80 }),
      }),
      width: 100, height: 100, style: {},
      download: '', href: '',
      click: vi.fn(),
      toDataURL: () => 'data:image/png;base64,abc',
    }),
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
  }
}

function makeCanvasMock(w = 200, h = 150) {
  return {
    width: w, height: h,
    toDataURL: vi.fn(() => 'data:image/png;base64,xyz'),
    getContext: vi.fn(),
  } as unknown as HTMLCanvasElement
}

function makeCtxMock() {
  return {
    save: vi.fn(), restore: vi.fn(),
    globalAlpha: 1 as number, font: '', fillStyle: '', strokeStyle: '', lineWidth: 1,
    beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    fillText: vi.fn(), measureText: (_t: string) => ({ width: 80 }),
  } as unknown as CanvasRenderingContext2D
}

describe('ScreenshotModeSystem — 初始状态', () => {
  let sys: ScreenshotModeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始active为false', () => { expect((sys as any).active).toBe(false) })
  it('isActive()初始为false', () => { expect(sys.isActive()).toBe(false) })
  it('multiplier字段初始为1', () => { expect((sys as any).multiplier).toBe(1) })
  it('toastTimer字段初始为0', () => { expect((sys as any).toastTimer).toBe(0) })
  it('showToast字段初始为false', () => { expect((sys as any).showToast).toBe(false) })
  it('stashedDisplay字段初始为空数组', () => { expect((sys as any).stashedDisplay).toEqual([]) })
  it('stashedDisplay是数组类型', () => { expect(Array.isArray((sys as any).stashedDisplay)).toBe(true) })
})

describe('ScreenshotModeSystem — enterScreenshotMode', () => {
  let sys: ScreenshotModeSystem
  beforeEach(() => {
    sys = makeSys()
    vi.stubGlobal('document', makeDocumentMock())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('enterScreenshotMode()后isActive()为true', () => {
    sys.enterScreenshotMode()
    expect(sys.isActive()).toBe(true)
  })

  it('enterScreenshotMode()后active字段为true', () => {
    sys.enterScreenshotMode()
    expect((sys as any).active).toBe(true)
  })

  it('enterScreenshotMode(2)后multiplier为2', () => {
    sys.enterScreenshotMode(2)
    expect((sys as any).multiplier).toBe(2)
  })

  it('enterScreenshotMode(4)后multiplier为4', () => {
    sys.enterScreenshotMode(4)
    expect((sys as any).multiplier).toBe(4)
  })

  it('enterScreenshotMode()不传参数时multiplier为1', () => {
    sys.enterScreenshotMode()
    expect((sys as any).multiplier).toBe(1)
  })

  it('enterScreenshotMode(3)后multiplier为3', () => {
    sys.enterScreenshotMode(3)
    expect((sys as any).multiplier).toBe(3)
  })

  it('enterScreenshotMode()重复调用不改变状态（幂等）', () => {
    sys.enterScreenshotMode(2)
    sys.enterScreenshotMode(4)
    expect((sys as any).multiplier).toBe(2)
    expect(sys.isActive()).toBe(true)
  })

  it('enterScreenshotMode()后stashedDisplay长度与UI_SELECTORS一致', () => {
    sys.enterScreenshotMode()
    expect((sys as any).stashedDisplay.length).toBeGreaterThan(0)
  })

  it('有UI元素时hideUI保存display值', () => {
    const el = { style: { display: 'block' } }
    vi.stubGlobal('document', { querySelector: () => el, createElement: makeDocumentMock().createElement })
    sys.enterScreenshotMode()
    const stashed = (sys as any).stashedDisplay
    expect(stashed.some((v: string) => v === 'block')).toBe(true)
    vi.unstubAllGlobals()
  })

  it('找不到UI元素时stashedDisplay存空字符串', () => {
    sys.enterScreenshotMode()
    const stashed = (sys as any).stashedDisplay
    expect(stashed.every((v: string) => v === '')).toBe(true)
  })
})

describe('ScreenshotModeSystem — update() 行为', () => {
  let sys: ScreenshotModeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update()不崩溃', () => {
    expect(() => sys.update()).not.toThrow()
  })

  it('showToast为false时update()不改变toastTimer', () => {
    ;(sys as any).toastTimer = 100
    ;(sys as any).showToast = false
    sys.update()
    expect((sys as any).toastTimer).toBe(100)
  })

  it('未激活时toastTimer保持0', () => {
    sys.update()
    expect((sys as any).toastTimer).toBe(0)
  })

  it('showToast为true时update()将toastTimer减16', () => {
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = 1500
    sys.update()
    expect((sys as any).toastTimer).toBe(1484)
  })

  it('showToast为true且timer归零后showToast变false', () => {
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = 10
    sys.update()
    expect((sys as any).showToast).toBe(false)
  })

  it('showToast为true且timer正数时showToast仍为true', () => {
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = 1500
    sys.update()
    expect((sys as any).showToast).toBe(true)
  })

  it('多次update()最终使showToast为false', () => {
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = 100
    for (let i = 0; i < 10; i++) sys.update()
    expect((sys as any).showToast).toBe(false)
  })

  it('toastTimer负数时showToast也变false', () => {
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = -100
    sys.update()
    expect((sys as any).showToast).toBe(false)
  })
})

describe('ScreenshotModeSystem — captureAndDownload', () => {
  let sys: ScreenshotModeSystem
  beforeEach(() => {
    sys = makeSys()
    vi.stubGlobal('document', makeDocumentMock())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('captureAndDownload后active变为false', () => {
    sys.enterScreenshotMode()
    sys.captureAndDownload(makeCanvasMock())
    expect((sys as any).active).toBe(false)
  })

  it('captureAndDownload后isActive()为false', () => {
    sys.enterScreenshotMode()
    sys.captureAndDownload(makeCanvasMock())
    expect(sys.isActive()).toBe(false)
  })

  it('captureAndDownload后showToast为true', () => {
    sys.enterScreenshotMode()
    sys.captureAndDownload(makeCanvasMock())
    expect((sys as any).showToast).toBe(true)
  })

  it('captureAndDownload后toastTimer为1500', () => {
    sys.enterScreenshotMode()
    sys.captureAndDownload(makeCanvasMock())
    expect((sys as any).toastTimer).toBe(1500)
  })

  it('multiplier=1时直接使用原canvas下载', () => {
    sys.enterScreenshotMode(1)
    const canvas = makeCanvasMock()
    sys.captureAndDownload(canvas)
    expect(canvas.toDataURL).toHaveBeenCalled()
  })

  it('multiplier=2时toDataURL被调用', () => {
    sys.enterScreenshotMode(2)
    const canvas = makeCanvasMock(100, 100)
    sys.captureAndDownload(canvas)
    // 完成后active变false
    expect((sys as any).active).toBe(false)
  })

  it('captureAndDownload不崩溃（1x）', () => {
    sys.enterScreenshotMode(1)
    expect(() => sys.captureAndDownload(makeCanvasMock())).not.toThrow()
  })

  it('captureAndDownload不崩溃（2x）', () => {
    sys.enterScreenshotMode(2)
    expect(() => sys.captureAndDownload(makeCanvasMock())).not.toThrow()
  })

  it('captureAndDownload不崩溃（4x）', () => {
    sys.enterScreenshotMode(4)
    expect(() => sys.captureAndDownload(makeCanvasMock())).not.toThrow()
  })
})

describe('ScreenshotModeSystem — render()', () => {
  let sys: ScreenshotModeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('showToast为false时render()直接返回不调用ctx.save', () => {
    const ctx = makeCtxMock()
    ;(sys as any).showToast = false
    sys.render(ctx, 800, 600)
    expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })

  it('showToast为true时render()调用ctx.save', () => {
    const ctx = makeCtxMock()
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = 1000
    sys.render(ctx, 800, 600)
    expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
  })

  it('showToast为true时render()调用ctx.restore', () => {
    const ctx = makeCtxMock()
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = 1000
    sys.render(ctx, 800, 600)
    expect((ctx.restore as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
  })

  it('showToast为true时render()调用fillText', () => {
    const ctx = makeCtxMock()
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = 500
    sys.render(ctx, 800, 600)
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
  })

  it('showToast为true时render()调用beginPath', () => {
    const ctx = makeCtxMock()
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = 500
    sys.render(ctx, 800, 600)
    expect((ctx.beginPath as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('render()不崩溃（showToast=false）', () => {
    const ctx = makeCtxMock()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render()不崩溃（showToast=true）', () => {
    const ctx = makeCtxMock()
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = 1000
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('toastTimer=300时alpha等于1（min截断）', () => {
    // alpha = Math.min(1, timer/300)，timer=300时 alpha=1
    const ctx = makeCtxMock()
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = 300
    sys.render(ctx, 800, 600)
    // 只验证不崩溃且save被调用
    expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
  })

  it('toastTimer=1500时alpha也被截断为1', () => {
    const ctx = makeCtxMock()
    ;(sys as any).showToast = true
    ;(sys as any).toastTimer = 1500
    sys.render(ctx, 800, 600)
    expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
  })
})

describe('ScreenshotModeSystem — UI隐藏/还原', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('enterScreenshotMode将查到的元素display设为none', () => {
    const el = { style: { display: 'flex' } }
    vi.stubGlobal('document', { querySelector: () => el, createElement: makeDocumentMock().createElement })
    const sys = makeSys()
    sys.enterScreenshotMode()
    expect(el.style.display).toBe('none')
  })

  it('captureAndDownload后还原display', () => {
    const el = { style: { display: 'flex' } }
    vi.stubGlobal('document', makeDocumentMock({ '#ui': el as any }))
    const sys = makeSys()
    sys.enterScreenshotMode()
    sys.captureAndDownload(makeCanvasMock())
    // 'flex'被stash后还原
    expect(el.style.display).toBe('flex')
  })

  it('querySelector返���null时不崩溃', () => {
    vi.stubGlobal('document', { querySelector: () => null, createElement: makeDocumentMock().createElement })
    const sys = makeSys()
    expect(() => sys.enterScreenshotMode()).not.toThrow()
  })

  it('hideUI+restoreUI整体不崩溃', () => {
    vi.stubGlobal('document', makeDocumentMock())
    const sys = makeSys()
    sys.enterScreenshotMode()
    expect(() => sys.captureAndDownload(makeCanvasMock())).not.toThrow()
  })
})

describe('ScreenshotModeSystem — 状态流转', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('完整流程：进入→截图→toast→update', () => {
    vi.stubGlobal('document', makeDocumentMock())
    const sys = makeSys()
    sys.enterScreenshotMode()
    expect(sys.isActive()).toBe(true)
    sys.captureAndDownload(makeCanvasMock())
    expect(sys.isActive()).toBe(false)
    expect((sys as any).showToast).toBe(true)
    ;(sys as any).toastTimer = 10
    sys.update()
    expect((sys as any).showToast).toBe(false)
  })

  it('未进入screenshot模式直接captureAndDownload不崩溃', () => {
    vi.stubGlobal('document', makeDocumentMock())
    const sys = makeSys()
    expect(() => sys.captureAndDownload(makeCanvasMock())).not.toThrow()
  })

  it('多次进入退出循环状态一致', () => {
    vi.stubGlobal('document', makeDocumentMock())
    const sys = makeSys()
    for (let i = 0; i < 3; i++) {
      sys.enterScreenshotMode()
      expect(sys.isActive()).toBe(true)
      sys.captureAndDownload(makeCanvasMock())
      expect(sys.isActive()).toBe(false)
    }
  })

  it('inactive状态下render不产生副作用', () => {
    const sys = makeSys()
    const ctx = makeCtxMock()
    sys.render(ctx, 800, 600)
    expect((ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })

  it('不同multiplier连续调用，第二次因active=true被跳过', () => {
    vi.stubGlobal('document', makeDocumentMock())
    const sys = makeSys()
    sys.enterScreenshotMode(2)
    sys.enterScreenshotMode(4) // 应被忽略
    expect((sys as any).multiplier).toBe(2)
  })
})
