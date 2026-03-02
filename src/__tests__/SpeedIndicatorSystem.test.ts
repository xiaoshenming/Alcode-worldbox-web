import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SpeedIndicatorSystem } from '../systems/SpeedIndicatorSystem'

function makeSys() { return new SpeedIndicatorSystem() }

// ---- Canvas mock ----
function makeCtx(): CanvasRenderingContext2D {
  const canvas = { width: 800, height: 600 } as HTMLCanvasElement
  const ctx = {
    canvas,
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    roundRect: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
  return ctx
}

// ---- animPhase 初始状态 ----
describe('SpeedIndicatorSystem - 初始状态', () => {
  let sys: SpeedIndicatorSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 animPhase 为 0', () => {
    expect((sys as any).animPhase).toBe(0)
  })

  it('实例化后不抛出异常', () => {
    expect(() => new SpeedIndicatorSystem()).not.toThrow()
  })

  it('多次实例化互相独立', () => {
    const a = makeSys()
    const b = makeSys()
    a.update(1)
    expect((a as any).animPhase).not.toBe((b as any).animPhase)
  })
})

// ---- update() 行为 ----
describe('SpeedIndicatorSystem - update() 推进动画', () => {
  let sys: SpeedIndicatorSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update(0) 不��进 animPhase（暂停）', () => {
    sys.update(0)
    expect((sys as any).animPhase).toBe(0)
  })

  it('update(1) 每帧推进 0.03', () => {
    sys.update(1)
    expect((sys as any).animPhase).toBeCloseTo(0.03, 10)
  })

  it('update(2) 每帧推进 0.06', () => {
    sys.update(2)
    expect((sys as any).animPhase).toBeCloseTo(0.06, 10)
  })

  it('update(5) 每帧推进 0.15', () => {
    sys.update(5)
    expect((sys as any).animPhase).toBeCloseTo(0.15, 10)
  })

  it('update(2) 推进速度是 update(1) 的两倍', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    s1.update(1)
    s2.update(2)
    expect((s2 as any).animPhase).toBeCloseTo((s1 as any).animPhase * 2, 10)
  })

  it('update(5) 推进速度是 update(1) 的五倍', () => {
    const s1 = makeSys()
    const s5 = makeSys()
    s1.update(1)
    s5.update(5)
    expect((s5 as any).animPhase).toBeCloseTo((s1 as any).animPhase * 5, 10)
  })

  it('连续多次 update(1) 累积推进', () => {
    sys.update(1)
    sys.update(1)
    sys.update(1)
    expect((sys as any).animPhase).toBeCloseTo(0.09, 10)
  })

  it('update(0) 多次调用后 animPhase 始终为 0', () => {
    for (let i = 0; i < 50; i++) sys.update(0)
    expect((sys as any).animPhase).toBe(0)
  })

  it('update 后 animPhase 在 [0, 1) 范围内', () => {
    for (let i = 0; i < 200; i++) sys.update(5)
    const phase = (sys as any).animPhase
    expect(phase).toBeGreaterThanOrEqual(0)
    expect(phase).toBeLessThan(1)
  })

  it('animPhase 超过 1 后自动循环重置', () => {
    // speed=5 每帧 +0.15，7帧=1.05，溢出后应 wrap
    for (let i = 0; i < 7; i++) sys.update(5)
    expect((sys as any).animPhase).toBeLessThan(1)
  })

  it('animPhase 环绕后值连续（无跳变）', () => {
    // 推到临界点，确保不会变成负数
    for (let i = 0; i < 34; i++) sys.update(1) // 34 * 0.03 = 1.02 → wrap 到 0.02
    const phase = (sys as any).animPhase
    expect(phase).toBeGreaterThanOrEqual(0)
    expect(phase).toBeLessThan(1)
  })

  it('update(1) 33 帧接近整周期', () => {
    // 33 * 0.03 = 0.99，仍 < 1
    for (let i = 0; i < 33; i++) sys.update(1)
    expect((sys as any).animPhase).toBeCloseTo(0.99, 5)
  })

  it('update(1) 34 帧刚好溢出并 wrap', () => {
    for (let i = 0; i < 34; i++) sys.update(1)
    // 34 * 0.03 = 1.02 → wrap = 0.02
    expect((sys as any).animPhase).toBeCloseTo(0.02, 5)
  })
})

// ---- render() Canvas 调用验证 ----
describe('SpeedIndicatorSystem - render() Canvas 调用', () => {
  let sys: SpeedIndicatorSystem
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    sys = makeSys()
    ctx = makeCtx()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('render 不抛出异常（speed=0）', () => {
    expect(() => sys.render(ctx, 800, 600, 0)).not.toThrow()
  })

  it('render 不抛出异常（speed=1）', () => {
    expect(() => sys.render(ctx, 800, 600, 1)).not.toThrow()
  })

  it('render 不抛出异常（speed=2）', () => {
    expect(() => sys.render(ctx, 800, 600, 2)).not.toThrow()
  })

  it('render 不抛��异常（speed=5）', () => {
    expect(() => sys.render(ctx, 800, 600, 5)).not.toThrow()
  })

  it('render 调用了 ctx.save()', () => {
    sys.render(ctx, 800, 600, 1)
    expect(ctx.save).toHaveBeenCalled()
  })

  it('render 调用了 ctx.restore()', () => {
    sys.render(ctx, 800, 600, 1)
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('render 调用了 ctx.beginPath()', () => {
    sys.render(ctx, 800, 600, 1)
    expect(ctx.beginPath).toHaveBeenCalled()
  })

  it('render 调用了 ctx.fill()', () => {
    sys.render(ctx, 800, 600, 1)
    expect(ctx.fill).toHaveBeenCalled()
  })

  it('render 调用了 ctx.fillText()', () => {
    sys.render(ctx, 800, 600, 1)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('render speed=0 不渲染流动点（arc 不被调用）', () => {
    sys.render(ctx, 800, 600, 0)
    expect(ctx.arc).not.toHaveBeenCalled()
  })

  it('render speed=1 渲染流动点（arc 被调用）', () => {
    sys.render(ctx, 800, 600, 1)
    expect(ctx.arc).toHaveBeenCalled()
  })

  it('render speed=2 渲染流动点', () => {
    sys.render(ctx, 800, 600, 2)
    expect(ctx.arc).toHaveBeenCalled()
  })

  it('render speed=5 渲染流动点', () => {
    sys.render(ctx, 800, 600, 5)
    expect(ctx.arc).toHaveBeenCalled()
  })

  it('render speed=1 时 arc 被调用 8 次（DOT_COUNT）', () => {
    sys.render(ctx, 800, 600, 1)
    expect(ctx.arc).toHaveBeenCalledTimes(8)
  })

  it('render 结束后 globalAlpha 恢复为 1', () => {
    sys.render(ctx, 800, 600, 1)
    expect(ctx.globalAlpha).toBe(1)
  })

  it('不同屏幕尺寸均不崩溃', () => {
    expect(() => sys.render(ctx, 1920, 1080, 1)).not.toThrow()
    expect(() => sys.render(ctx, 320, 240, 1)).not.toThrow()
  })

  it('速度未知值不崩溃', () => {
    expect(() => sys.render(ctx, 800, 600, 99)).not.toThrow()
  })
})

// ---- SPEED_LABELS / SPEED_COLORS 映射正确性（通过 render 的 fillText 验证）----
describe('SpeedIndicatorSystem - 标签和颜色映射', () => {
  let sys: SpeedIndicatorSystem
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    sys = makeSys()
    ctx = makeCtx()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('speed=0 时渲染文字包含 Paused', () => {
    sys.render(ctx, 800, 600, 0)
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const text = calls[0][0] as string
    expect(text).toContain('Paused')
  })

  it('speed=1 时渲染文字包含 1x', () => {
    sys.render(ctx, 800, 600, 1)
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const text = calls[0][0] as string
    expect(text).toContain('1x')
  })

  it('speed=2 时渲染文字包含 2x', () => {
    sys.render(ctx, 800, 600, 2)
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const text = calls[0][0] as string
    expect(text).toContain('2x')
  })

  it('speed=5 时渲染文字包含 5x', () => {
    sys.render(ctx, 800, 600, 5)
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const text = calls[0][0] as string
    expect(text).toContain('5x')
  })

  it('speed=99 未知速度时渲染文字包含 99x', () => {
    sys.render(ctx, 800, 600, 99)
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const text = calls[0][0] as string
    expect(text).toContain('99x')
  })
})

// ---- 帧率独立性与位置计算 ----
describe('SpeedIndicatorSystem - HUD 位置计算', () => {
  let sys: SpeedIndicatorSystem
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    sys = makeSys()
    ctx = makeCtx()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('HUD x 居中：roundRect 第一参数为 (screenW-120)/2', () => {
    const screenW = 800
    sys.render(ctx, screenW, 600, 1)
    const calls = (ctx.roundRect as ReturnType<typeof vi.fn>).mock.calls
    const x = calls[0][0] as number
    expect(x).toBeCloseTo((screenW - 120) / 2, 5)
  })

  it('HUD y 底部定位：screenH - 32 - 12', () => {
    const screenH = 600
    sys.render(ctx, 800, screenH, 1)
    const calls = (ctx.roundRect as ReturnType<typeof vi.fn>).mock.calls
    const y = calls[0][1] as number
    expect(y).toBeCloseTo(screenH - 32 - 12, 5)
  })

  it('HUD 宽度为 120', () => {
    sys.render(ctx, 800, 600, 1)
    const calls = (ctx.roundRect as ReturnType<typeof vi.fn>).mock.calls
    const w = calls[0][2] as number
    expect(w).toBe(120)
  })

  it('HUD 高度为 32', () => {
    sys.render(ctx, 800, 600, 1)
    const calls = (ctx.roundRect as ReturnType<typeof vi.fn>).mock.calls
    const h = calls[0][3] as number
    expect(h).toBe(32)
  })

  it('不同屏幕宽度下 x 始终居中', () => {
    for (const w of [640, 800, 1280, 1920]) {
      const c = makeCtx()
      ;(c.canvas as any).width = w
      const s = makeSys()
      s.render(c, w, 600, 1)
      const calls = (c.roundRect as ReturnType<typeof vi.fn>).mock.calls
      const x = calls[0][0] as number
      expect(x).toBeCloseTo((w - 120) / 2, 5)
    }
  })
})

// ---- 多帧序列验证 ----
describe('SpeedIndicatorSystem - 多帧序列与精确值', () => {
  let sys: SpeedIndicatorSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('10 帧 speed=1 后 animPhase = 0.30', () => {
    for (let i = 0; i < 10; i++) sys.update(1)
    expect((sys as any).animPhase).toBeCloseTo(0.30, 5)
  })

  it('20 帧 speed=1 后 animPhase = 0.60', () => {
    for (let i = 0; i < 20; i++) sys.update(1)
    expect((sys as any).animPhase).toBeCloseTo(0.60, 5)
  })

  it('30 帧 speed=1 后 animPhase = 0.90', () => {
    for (let i = 0; i < 30; i++) sys.update(1)
    expect((sys as any).animPhase).toBeCloseTo(0.90, 5)
  })

  it('交替 speed=0 和 speed=1 只有 speed=1 帧累积', () => {
    sys.update(1) // +0.03
    sys.update(0) // +0
    sys.update(1) // +0.03
    sys.update(0) // +0
    expect((sys as any).animPhase).toBeCloseTo(0.06, 5)
  })

  it('speed=1 和 speed=2 交替 2 帧共推进 0.09', () => {
    sys.update(1) // +0.03
    sys.update(2) // +0.06
    expect((sys as any).animPhase).toBeCloseTo(0.09, 5)
  })

  it('phase 环绕后继续正常推进', () => {
    // 34 帧 speed=1 → wrap 到 0.02
    for (let i = 0; i < 34; i++) sys.update(1)
    const before = (sys as any).animPhase
    sys.update(1)
    const after = (sys as any).animPhase
    expect(after).toBeCloseTo(before + 0.03, 5)
  })

  it('render 在多帧 update 后不崩溃', () => {
    const ctx = makeCtx()
    for (let i = 0; i < 50; i++) sys.update(1)
    expect(() => sys.render(ctx, 800, 600, 1)).not.toThrow()
  })

  it('animPhase 永远不为负数', () => {
    for (let i = 0; i < 500; i++) sys.update(5)
    expect((sys as any).animPhase).toBeGreaterThanOrEqual(0)
  })
})
