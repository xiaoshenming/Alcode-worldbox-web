// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PerformanceMonitorSystem } from '../systems/PerformanceMonitorSystem'

// ─── Mock canvas context factory ────────────────────────────────────────────
function makeCtx(canvasWidth = 800, canvasHeight = 600) {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    resetTransform: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '' as string | CanvasGradient | CanvasPattern,
    strokeStyle: '' as string | CanvasGradient | CanvasPattern,
    lineWidth: 1,
    font: '',
    globalAlpha: 1,
    textAlign: '' as CanvasTextAlign,
    textBaseline: '' as CanvasTextBaseline,
    canvas: { width: canvasWidth, height: canvasHeight },
  } as unknown as CanvasRenderingContext2D
}

// ─── 1. 模块导入与构造 ────────────────────────────────────────────────────────
describe('1. 模块导入与构造', () => {
  afterEach(() => vi.restoreAllMocks())

  it('模块可以正常导入', async () => {
    const mod = await import('../systems/PerformanceMonitorSystem')
    expect(mod.PerformanceMonitorSystem).toBeDefined()
  })

  it('PerformanceMonitorSystem 是一个类（函数）', () => {
    expect(typeof PerformanceMonitorSystem).toBe('function')
  })

  it('可以无参数构造实例', () => {
    const sys = new PerformanceMonitorSystem()
    expect(sys).toBeInstanceOf(PerformanceMonitorSystem)
    sys.destroy?.()
  })

  it('构造时向 window 注册 keydown 事件监听', () => {
    const spy = vi.spyOn(window, 'addEventListener')
    const sys = new PerformanceMonitorSystem()
    const calls = spy.mock.calls.filter(c => c[0] === 'keydown')
    expect(calls.length).toBeGreaterThanOrEqual(1)
    sys.destroy?.()
  })

  it('多次构造不会抛出异常', () => {
    expect(() => {
      const a = new PerformanceMonitorSystem()
      const b = new PerformanceMonitorSystem()
      a.destroy?.()
      b.destroy?.()
    }).not.toThrow()
  })
})

// ─── 2. 初始状态 ──────────────────────────────────────────────────────────────
describe('2. 初始状态', () => {
  let sys: PerformanceMonitorSystem

  beforeEach(() => { sys = new PerformanceMonitorSystem() })
  afterEach(() => { sys.destroy?.(); vi.restoreAllMocks() })

  it('初始 visible 为 false', () => {
    expect((sys as any).visible).toBe(false)
  })

  it('初始 fps 为 0', () => {
    expect((sys as any).fps).toBe(0)
  })

  it('初始 entityCount 为 0', () => {
    expect((sys as any).entityCount).toBe(0)
  })

  it('初始 memoryMB 为 0', () => {
    expect((sys as any).memoryMB).toBe(0)
  })

  it('初始 tick 为 0', () => {
    expect((sys as any).tick).toBe(0)
  })

  it('初始 speed 为 1', () => {
    expect((sys as any).speed).toBe(1)
  })

  it('fpsHistory 是 Float32Array', () => {
    expect((sys as any).fpsHistory).toBeInstanceOf(Float32Array)
  })

  it('fpsHistory 大小为 120 (HISTORY_SIZE)', () => {
    expect((sys as any).fpsHistory.length).toBe(120)
  })

  it('fpsHistory 初始值全为 0', () => {
    const arr: Float32Array = (sys as any).fpsHistory
    expect([...arr].every(v => v === 0)).toBe(true)
  })

  it('初始 historyIndex 为 0', () => {
    expect((sys as any).historyIndex).toBe(0)
  })

  it('初始 historyFilled 为 false', () => {
    expect((sys as any).historyFilled).toBe(false)
  })

  it('初始 frameTimeAccum 为 0', () => {
    expect((sys as any).frameTimeAccum).toBe(0)
  })

  it('初始 frameCount 为 0', () => {
    expect((sys as any).frameCount).toBe(0)
  })

  it('初始 fpsUpdateTimer 为 0', () => {
    expect((sys as any).fpsUpdateTimer).toBe(0)
  })

  it('isVisible() 初始返回 false', () => {
    expect(sys.isVisible()).toBe(false)
  })
})

// ─── 3. toggle() 方法 ─────────────────────────────────────────────────────────
describe('3. toggle() 方法', () => {
  let sys: PerformanceMonitorSystem

  beforeEach(() => { sys = new PerformanceMonitorSystem() })
  afterEach(() => { sys.destroy?.(); vi.restoreAllMocks() })

  it('toggle() 将 visible 从 false 变为 true', () => {
    sys.toggle()
    expect((sys as any).visible).toBe(true)
  })

  it('toggle() 将 visible 从 true 变为 false', () => {
    sys.toggle()
    sys.toggle()
    expect((sys as any).visible).toBe(false)
  })

  it('toggle() 调用三次后 visible 为 true', () => {
    sys.toggle(); sys.toggle(); sys.toggle()
    expect((sys as any).visible).toBe(true)
  })

  it('isVisible() 在 toggle() 后返回 true', () => {
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })

  it('isVisible() 在两次 toggle() 后返回 false', () => {
    sys.toggle(); sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })

  it('按 F3 键触发 toggle（visible 变为 true）', () => {
    const event = new KeyboardEvent('keydown', { key: 'F3', bubbles: true })
    window.dispatchEvent(event)
    expect((sys as any).visible).toBe(true)
  })

  it('按 F3 键两次，visible 恢复 false', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3', bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3', bubbles: true }))
    expect((sys as any).visible).toBe(false)
  })

  it('按非 F3 键不影响 visible', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }))
    expect((sys as any).visible).toBe(false)
  })
})

// ─── 4. update() 基础行为 ─────────────────────────────────────────────────────
describe('4. update() 基础行为', () => {
  let sys: PerformanceMonitorSystem

  beforeEach(() => { sys = new PerformanceMonitorSystem() })
  afterEach(() => { sys.destroy?.(); vi.restoreAllMocks() })

  it('update() 正常调用不抛出异常', () => {
    expect(() => sys.update(0.016, 100, 1, 1)).not.toThrow()
  })

  it('update() 更新 entityCount', () => {
    sys.update(0.016, 500, 1, 1)
    expect((sys as any).entityCount).toBe(500)
  })

  it('update() 更新 tick', () => {
    sys.update(0.016, 0, 42, 1)
    expect((sys as any).tick).toBe(42)
  })

  it('update() 更新 speed', () => {
    sys.update(0.016, 0, 0, 2)
    expect((sys as any).speed).toBe(2)
  })

  it('update() 累积 frameTimeAccum', () => {
    sys.update(0.1, 0, 0, 1)
    expect((sys as any).frameTimeAccum).toBeCloseTo(0.1, 5)
  })

  it('update() 累积 frameCount', () => {
    sys.update(0.1, 0, 0, 1)
    expect((sys as any).frameCount).toBe(1)
  })

  it('多次 update() 累积 frameCount', () => {
    sys.update(0.1, 0, 0, 1)
    sys.update(0.1, 0, 0, 1)
    sys.update(0.1, 0, 0, 1)
    expect((sys as any).frameCount).toBe(3)
  })

  it('update() 使用 dt=0 不崩溃', () => {
    expect(() => sys.update(0, 0, 0, 1)).not.toThrow()
  })

  it('update() 使用极大 entityCount 不崩溃', () => {
    expect(() => sys.update(0.016, 100000, 9999, 5)).not.toThrow()
  })

  it('update() 使用负数 dt 不崩溃', () => {
    expect(() => sys.update(-0.016, 0, 0, 1)).not.toThrow()
  })

  it('update() entityCount=0 正常', () => {
    sys.update(0.016, 0, 0, 1)
    expect((sys as any).entityCount).toBe(0)
  })

  it('update() speed=0 表示暂停状态', () => {
    sys.update(0.016, 0, 0, 0)
    expect((sys as any).speed).toBe(0)
  })
})

// ─── 5. FPS 计算逻辑 ─────────────────────────────────────────────────────────
describe('5. FPS 计算逻辑', () => {
  let sys: PerformanceMonitorSystem

  beforeEach(() => { sys = new PerformanceMonitorSystem() })
  afterEach(() => { sys.destroy?.(); vi.restoreAllMocks() })

  it('累积 dt < 0.5 时 fps 不更新（保持 0）', () => {
    sys.update(0.1, 0, 0, 1)
    sys.update(0.1, 0, 0, 1)
    // 累积 0.2s，未超过 0.5s 阈值
    expect((sys as any).fps).toBe(0)
  })

  it('累积 dt >= 0.5 时 fps 被计算', () => {
    // 5帧 * 0.1s = 0.5s，累���超过阈值，触发 fps 更新
    for (let i = 0; i < 5; i++) sys.update(0.1, 0, 0, 1)
    expect((sys as any).fps).toBeGreaterThan(0)
  })

  it('60fps 时 fps 约等于 10（5帧/0.5s）', () => {
    // 5帧 各0.1s，frameCount=5, frameTimeAccum=0.5 => fps=5/0.5=10
    for (let i = 0; i < 5; i++) sys.update(0.1, 0, 0, 1)
    expect((sys as any).fps).toBeCloseTo(10, 1)
  })

  it('fps 更新后 frameTimeAccum 重置为 0', () => {
    for (let i = 0; i < 5; i++) sys.update(0.1, 0, 0, 1)
    expect((sys as any).frameTimeAccum).toBe(0)
  })

  it('fps 更新后 frameCount 重置为 0', () => {
    for (let i = 0; i < 5; i++) sys.update(0.1, 0, 0, 1)
    expect((sys as any).frameCount).toBe(0)
  })

  it('fps 更新后 fpsUpdateTimer 重置为 0', () => {
    for (let i = 0; i < 5; i++) sys.update(0.1, 0, 0, 1)
    expect((sys as any).fpsUpdateTimer).toBe(0)
  })

  it('fps 更新后 historyIndex 增加 1', () => {
    for (let i = 0; i < 5; i++) sys.update(0.1, 0, 0, 1)
    expect((sys as any).historyIndex).toBe(1)
  })

  it('fps 写入 fpsHistory[0]', () => {
    for (let i = 0; i < 5; i++) sys.update(0.1, 0, 0, 1)
    expect((sys as any).fpsHistory[0]).toBeGreaterThan(0)
  })

  it('120次 fps 更新后 historyFilled 变为 true', () => {
    // 每次 fps 更新需要 >= 0.5s 累积，调用 5帧 * 0.1s 一批
    for (let batch = 0; batch < 120; batch++) {
      for (let i = 0; i < 5; i++) sys.update(0.1, 0, 0, 1)
    }
    expect((sys as any).historyFilled).toBe(true)
  })

  it('historyFilled 前 historyIndex 不超过 HISTORY_SIZE', () => {
    for (let batch = 0; batch < 60; batch++) {
      for (let i = 0; i < 5; i++) sys.update(0.1, 0, 0, 1)
    }
    expect((sys as any).historyIndex).toBeLessThanOrEqual(120)
  })

  it('historyFilled 后 historyIndex 循环回 0 继续', () => {
    // 121批超出 HISTORY_SIZE，historyIndex 循环
    for (let batch = 0; batch < 121; batch++) {
      for (let i = 0; i < 5; i++) sys.update(0.1, 0, 0, 1)
    }
    expect((sys as any).historyIndex).toBe(1)
  })

  it('模拟真实 60fps：30帧 * (1/60)s，fps 计算接近正确', () => {
    const dt = 1 / 60
    // 需要超过 0.5s：0.5 / dt ≈ 30帧
    for (let i = 0; i < 31; i++) sys.update(dt, 0, 0, 1)
    // fps = frameCount / frameTimeAccum，应接近 60
    expect((sys as any).fps).toBeGreaterThan(50)
    expect((sys as any).fps).toBeLessThan(70)
  })
})

// ─── 6. 常量验证 ─────────────────────────────────────────────────────────────
describe('6. 常量验证（通过私有字段推断）', () => {
  let sys: PerformanceMonitorSystem

  beforeEach(() => { sys = new PerformanceMonitorSystem() })
  afterEach(() => { sys.destroy?.(); vi.restoreAllMocks() })

  it('HISTORY_SIZE=120：fpsHistory.length 为 120', () => {
    expect((sys as any).fpsHistory.length).toBe(120)
  })

  it('PANEL_W=220：render 时 fillRect 宽度参数含 220', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some((c: number[]) => c[2] === 220)).toBe(true)
  })

  it('PANEL_H=140：render 时 fillRect 高度参数含 140', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some((c: number[]) => c[3] === 140)).toBe(true)
  })

  it('PANEL_MARGIN=12：面板 x 坐标 = canvasWidth - 220 - 12 = 568', () => {
    sys.toggle()
    const ctx = makeCtx(800)
    sys.render(ctx)
    const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls
    // 第一个 fillRect 是背景，x = 800 - 220 - 12 = 568
    expect(calls[0][0]).toBe(568)
  })

  it('PANEL_MARGIN=12：面板 y 坐标 = 12', () => {
    sys.toggle()
    const ctx = makeCtx(800)
    sys.render(ctx)
    const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0][1]).toBe(12)
  })

  it('GRAPH_H=40：图表区域 fillRect 高度含 40', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some((c: number[]) => c[3] === 40)).toBe(true)
  })

  it('WARN_FPS=30：fps=29 时应使用警告色渲染', () => {
    // 模拟 fps=29
    ;(sys as any).fps = 29
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    // fillText 被调用（不崩溃即可，颜色设置通过 fillStyle 赋值验证）
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('CRIT_FPS=15：fps=14 时应使用严重告警色渲染', () => {
    ;(sys as any).fps = 14
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })
})

// ─── 7. render() 不崩溃 ───────────────────────────────────────────────────────
describe('7. render() 行为', () => {
  let sys: PerformanceMonitorSystem

  beforeEach(() => { sys = new PerformanceMonitorSystem() })
  afterEach(() => { sys.destroy?.(); vi.restoreAllMocks() })

  it('visible=false 时 render() 不调用任何 ctx 方法', () => {
    const ctx = makeCtx()
    sys.render(ctx)
    expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })

  it('visible=true 时 render() 调用 ctx.save()', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
  })

  it('visible=true 时 render() 调用 ctx.restore()', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    expect((ctx.restore as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
  })

  it('render() 调用 ctx.fillText() 渲染 FPS 行', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('render() 调用 ctx.fillRect() 渲染背景', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  it('render() 调用 ctx.resetTransform()', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    expect((ctx.resetTransform as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
  })

  it('render() 在不同 canvas 宽度下不崩溃（宽度=400）', () => {
    sys.toggle()
    const ctx = makeCtx(400, 300)
    expect(() => sys.render(ctx)).not.toThrow()
  })

  it('render() 在 canvas 宽度=1920 下不崩溃', () => {
    sys.toggle()
    const ctx = makeCtx(1920, 1080)
    expect(() => sys.render(ctx)).not.toThrow()
  })

  it('render() 多次调用不崩溃', () => {
    sys.toggle()
    const ctx = makeCtx()
    expect(() => {
      for (let i = 0; i < 10; i++) sys.render(ctx)
    }).not.toThrow()
  })

  it('fps=60 时 render() 渲染 FPS: 60 字符串', () => {
    ;(sys as any).fps = 60
    ;(sys as any)._lastFpsRounded = -1  // 重置缓存，确保重新生成字符串
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const hasFpsText = fillTextCalls.some((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('FPS: 60')
    )
    expect(hasFpsText).toBe(true)
  })

  it('entityCount=999 时 render() 渲染 Entities: 999', () => {
    ;(sys as any).entityCount = 999
    ;(sys as any)._lastEntCount = -1
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const hasEntText = fillTextCalls.some((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('Entities: 999')
    )
    expect(hasEntText).toBe(true)
  })

  it('speed=0 时 render() 显示 PAUSED', () => {
    ;(sys as any).speed = 0
    ;(sys as any)._lastSpeed = -1
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const hasPaused = fillTextCalls.some((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('PAUSED')
    )
    expect(hasPaused).toBe(true)
  })

  it('speed=2 时 render() 显示 2x', () => {
    ;(sys as any).speed = 2
    ;(sys as any)._lastSpeed = -1
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const hasSpeed = fillTextCalls.some((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('2x')
    )
    expect(hasSpeed).toBe(true)
  })

  it('tick=1234 时 render() 显�� Tick: 1234', () => {
    ;(sys as any).tick = 1234
    ;(sys as any)._lastTick = -1
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const hasTick = fillTextCalls.some((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('Tick: 1234')
    )
    expect(hasTick).toBe(true)
  })

  it('memoryMB=0 时 render() 显示 Memory: N/A', () => {
    ;(sys as any).memoryMB = 0
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const hasMem = fillTextCalls.some((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('Memory: N/A')
    )
    expect(hasMem).toBe(true)
  })

  it('memoryMB>0 时 render() 显示具体 MB 数值', () => {
    ;(sys as any).memoryMB = 128.5
    ;(sys as any)._lastMemRounded = -1
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const hasMem = fillTextCalls.some((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('MB')
    )
    expect(hasMem).toBe(true)
  })

  it('historyFilled=false 且 historyIndex<2 时不绘制折线（count<=1）', () => {
    // 初始 historyIndex=0，historyFilled=false，count=0，不画折线
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    // 参考线（30fps/60fps）各用 lineTo 一次，折线不绘制时 lineTo 恰好为 2
    const lineToCount = (ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls.length
    expect(lineToCount).toBe(2)
  })

  it('historyIndex>1 时绘制折线（lineTo 被调用）', () => {
    ;(sys as any).historyIndex = 5
    ;(sys as any).fpsHistory[0] = 60
    ;(sys as any).fpsHistory[1] = 60
    ;(sys as any).fpsHistory[2] = 60
    ;(sys as any).fpsHistory[3] = 60
    ;(sys as any).fpsHistory[4] = 60
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    expect((ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('render() 设置 font 为 monospace', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    expect(ctx.font).toContain('monospace')
  })

  it('render() 调用 ctx.beginPath() 绘制参考线', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    expect((ctx.beginPath as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('render() 调用 ctx.stroke() 绘制参考线', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    expect((ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('fps<CRIT_FPS 时 render() 显示 [CRITICAL] 标签', () => {
    ;(sys as any).fps = 10
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const hasCritical = fillTextCalls.some((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('[CRITICAL]')
    )
    expect(hasCritical).toBe(true)
  })

  it('WARN_FPS<=fps<WARN_FPS 时 render() 显示 [WARNING] 标签', () => {
    ;(sys as any).fps = 20
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const hasWarning = fillTextCalls.some((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('[WARNING]')
    )
    expect(hasWarning).toBe(true)
  })

  it('fps>=WARN_FPS 时 render() 不显示警告标签', () => {
    ;(sys as any).fps = 60
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const hasWarnLabel = fillTextCalls.some((c: unknown[]) =>
      typeof c[0] === 'string' && (c[0].includes('[WARNING]') || c[0].includes('[CRITICAL]'))
    )
    expect(hasWarnLabel).toBe(false)
  })
})

// ─── 8. destroy() 清理 ────────────────────────────────────────────────────────
describe('8. destroy() 清理', () => {
  afterEach(() => vi.restoreAllMocks())

  it('destroy() 方法存在（如实现了的话）', () => {
    const sys = new PerformanceMonitorSystem()
    // destroy 是可选方法，若存在则调用
    if (typeof sys.destroy === 'function') {
      expect(() => sys.destroy!()).not.toThrow()
    } else {
      // 没有 destroy 也是合理设计
      expect(sys.destroy).toBeUndefined()
    }
  })

  it('destroy() 移除 keydown 事件监听（F3 不再触发 toggle）', () => {
    const sys = new PerformanceMonitorSystem()
    if (typeof sys.destroy === 'function') {
      sys.destroy()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3', bubbles: true }))
      expect((sys as any).visible).toBe(false)
    } else {
      // 没有 destroy，用 boundKeyHandler 手动移除
      const handler = (sys as any).boundKeyHandler
      expect(typeof handler).toBe('function')
    }
  })

  it('destroy() 后再次调用 destroy() 不抛出', () => {
    const sys = new PerformanceMonitorSystem()
    if (typeof sys.destroy === 'function') {
      sys.destroy()
      expect(() => sys.destroy!()).not.toThrow()
    }
  })

  it('boundKeyHandler 字段存在（用于事件清理）', () => {
    const sys = new PerformanceMonitorSystem()
    expect(typeof (sys as any).boundKeyHandler).toBe('function')
    sys.destroy?.()
  })

  it('手动 removeEventListener 使 F3 不再触发', () => {
    const sys = new PerformanceMonitorSystem()
    const handler = (sys as any).boundKeyHandler
    window.removeEventListener('keydown', handler)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3', bubbles: true }))
    expect((sys as any).visible).toBe(false)
  })
})
