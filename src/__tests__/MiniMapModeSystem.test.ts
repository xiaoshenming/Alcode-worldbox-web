import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MiniMapModeSystem } from '../systems/MiniMapModeSystem'
import type { MinimapMode } from '../systems/MiniMapModeSystem'

function makeSys() { return new MiniMapModeSystem() }

// ─────────────────────────────────────────────
describe('MiniMapModeSystem — 初始状态', () => {
  let sys: MiniMapModeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('mode 字段是字符串', () => {
    expect(typeof (sys as any).mode).toBe('string')
  })

  it('初始 mode 为 normal', () => {
    expect((sys as any).mode).toBe('normal')
  })

  it('初始 modeIdx 为 0', () => {
    expect((sys as any).modeIdx).toBe(0)
  })

  it('mode 不是 undefined', () => {
    expect((sys as any).mode).not.toBeUndefined()
  })

  it('mode 不是 null', () => {
    expect((sys as any).mode).not.toBeNull()
  })

  it('modeIdx 是数字类型', () => {
    expect(typeof (sys as any).modeIdx).toBe('number')
  })

  it('不同实例互不影响', () => {
    const a = makeSys()
    const b = makeSys()
    a.cycleMode()
    expect((b as any).mode).toBe('normal')
  })
})

// ─────────────────────────────────────────────
describe('MiniMapModeSystem — cycleMode 顺序', () => {
  let sys: MiniMapModeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('第 1 次 cycleMode → political', () => {
    sys.cycleMode()
    expect((sys as any).mode).toBe('political')
  })

  it('第 2 次 cycleMode → resource', () => {
    sys.cycleMode(); sys.cycleMode()
    expect((sys as any).mode).toBe('resource')
  })

  it('第 3 次 cycleMode → population', () => {
    sys.cycleMode(); sys.cycleMode(); sys.cycleMode()
    expect((sys as any).mode).toBe('population')
  })

  it('第 4 次 cycleMode → normal（循环）', () => {
    for (let i = 0; i < 4; i++) sys.cycleMode()
    expect((sys as any).mode).toBe('normal')
  })

  it('cycleMode 8 次后回到 normal', () => {
    for (let i = 0; i < 8; i++) sys.cycleMode()
    expect((sys as any).mode).toBe('normal')
  })

  it('cycleMode 后 modeIdx 也随之更新', () => {
    sys.cycleMode()
    expect((sys as any).modeIdx).toBe(1)
  })

  it('cycleMode 4 次后 modeIdx 归零', () => {
    for (let i = 0; i < 4; i++) sys.cycleMode()
    expect((sys as any).modeIdx).toBe(0)
  })

  it('modeIdx 始终在 0-3 范围内', () => {
    for (let i = 0; i < 12; i++) {
      sys.cycleMode()
      expect((sys as any).modeIdx).toBeGreaterThanOrEqual(0)
      expect((sys as any).modeIdx).toBeLessThanOrEqual(3)
    }
  })

  it('mode 值始终是 4 种合法值之一', () => {
    const valid: MinimapMode[] = ['normal', 'political', 'resource', 'population']
    for (let i = 0; i < 20; i++) {
      sys.cycleMode()
      expect(valid).toContain((sys as any).mode)
    }
  })

  it('cycleMode 100 次不崩溃', () => {
    expect(() => { for (let i = 0; i < 100; i++) sys.cycleMode() }).not.toThrow()
  })
})

// ─────────────────────────────────────────────
describe('MiniMapModeSystem — setMode', () => {
  let sys: MiniMapModeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('setMode("political") 设置 mode 为 political', () => {
    sys.setMode('political')
    expect((sys as any).mode).toBe('political')
  })

  it('setMode("resource") 设置 mode 为 resource', () => {
    sys.setMode('resource')
    expect((sys as any).mode).toBe('resource')
  })

  it('setMode("population") 设置 mode 为 population', () => {
    sys.setMode('population')
    expect((sys as any).mode).toBe('population')
  })

  it('setMode("normal") 设置 mode 为 normal', () => {
    sys.cycleMode() // 先切走
    sys.setMode('normal')
    expect((sys as any).mode).toBe('normal')
  })

  it('setMode 同步更新 modeIdx', () => {
    sys.setMode('resource')
    expect((sys as any).modeIdx).toBe(2)
  })

  it('setMode("normal") 后 modeIdx 为 0', () => {
    sys.setMode('political')
    sys.setMode('normal')
    expect((sys as any).modeIdx).toBe(0)
  })

  it('setMode("political") 后 modeIdx 为 1', () => {
    sys.setMode('political')
    expect((sys as any).modeIdx).toBe(1)
  })

  it('setMode("population") 后 modeIdx 为 3', () => {
    sys.setMode('population')
    expect((sys as any).modeIdx).toBe(3)
  })

  it('setMode 后接 cycleMode 从正确位置继续', () => {
    sys.setMode('resource')   // idx=2
    sys.cycleMode()           // idx=3 → population
    expect((sys as any).mode).toBe('population')
  })

  it('cycleMode 后接 setMode 可覆盖', () => {
    sys.cycleMode()           // political
    sys.setMode('normal')
    expect((sys as any).mode).toBe('normal')
    expect((sys as any).modeIdx).toBe(0)
  })
})

// ─────────────────────────────────────────────
describe('MiniMapModeSystem — renderModeButton', () => {
  let sys: MiniMapModeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function makeCtx() {
    const ctx = {
      save: vi.fn(), restore: vi.fn(),
      beginPath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      fillText: vi.fn(), roundRect: vi.fn(),
      fillStyle: '', strokeStyle: '', lineWidth: 0,
      font: '', textAlign: 'left' as CanvasTextAlign,
      textBaseline: 'alphabetic' as CanvasTextBaseline,
    } as unknown as CanvasRenderingContext2D
    return ctx
  }

  it('renderModeButton 不抛出（normal 模式）', () => {
    const ctx = makeCtx()
    expect(() => sys.renderModeButton(ctx, 100, 200)).not.toThrow()
  })

  it('renderModeButton 调用 ctx.save 和 ctx.restore', () => {
    const ctx = makeCtx()
    sys.renderModeButton(ctx, 100, 200)
    expect(ctx.save).toHaveBeenCalledTimes(1)
    expect(ctx.restore).toHaveBeenCalledTimes(1)
  })

  it('renderModeButton 调用 ctx.fill 至少一次', () => {
    const ctx = makeCtx()
    sys.renderModeButton(ctx, 100, 200)
    expect(ctx.fill).toHaveBeenCalled()
  })

  it('renderModeButton 调用 ctx.stroke', () => {
    const ctx = makeCtx()
    sys.renderModeButton(ctx, 100, 200)
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('renderModeButton 调用 ctx.fillText 绘制标签', () => {
    const ctx = makeCtx()
    sys.renderModeButton(ctx, 100, 200)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('fillText 第一个参数包含当前模式标签（Normal）', () => {
    const ctx = makeCtx()
    sys.renderModeButton(ctx, 100, 200)
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const texts = calls.map((c: any[]) => c[0] as string)
    expect(texts.some(t => t.includes('Normal'))).toBe(true)
  })

  it('political 模式 fillText 包含 Political', () => {
    const ctx = makeCtx()
    sys.setMode('political')
    sys.renderModeButton(ctx, 100, 200)
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some((c: any[]) => (c[0] as string).includes('Political'))).toBe(true)
  })

  it('resource 模式 fillText 包含 Resources', () => {
    const ctx = makeCtx()
    sys.setMode('resource')
    sys.renderModeButton(ctx, 100, 200)
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some((c: any[]) => (c[0] as string).includes('Resources'))).toBe(true)
  })

  it('population 模式 fillText 包含 Population', () => {
    const ctx = makeCtx()
    sys.setMode('population')
    sys.renderModeButton(ctx, 100, 200)
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some((c: any[]) => (c[0] as string).includes('Population'))).toBe(true)
  })

  it('不同 minimapX 不影响渲染不崩溃', () => {
    const ctx = makeCtx()
    expect(() => sys.renderModeButton(ctx, 0, 0)).not.toThrow()
    expect(() => sys.renderModeButton(ctx, 999, 999)).not.toThrow()
  })
})

// ─────────────────────────────────────────────
describe('MiniMapModeSystem — mode 颜色映射', () => {
  let sys: MiniMapModeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function makeCtx() {
    return {
      save: vi.fn(), restore: vi.fn(),
      beginPath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      fillText: vi.fn(), roundRect: vi.fn(),
      fillStyle: '', strokeStyle: '', lineWidth: 0,
      font: '', textAlign: 'left' as CanvasTextAlign,
      textBaseline: 'alphabetic' as CanvasTextBaseline,
    } as unknown as CanvasRenderingContext2D
  }

  it('normal 模式 strokeStyle 为 #aaa', () => {
    const ctx = makeCtx()
    sys.renderModeButton(ctx, 0, 0)
    expect((ctx as any).strokeStyle).toBe('#aaa')
  })

  it('political 模式 strokeStyle 为 #4fc3f7', () => {
    const ctx = makeCtx()
    sys.setMode('political')
    sys.renderModeButton(ctx, 0, 0)
    expect((ctx as any).strokeStyle).toBe('#4fc3f7')
  })

  it('resource 模式 strokeStyle 为 #66bb6a', () => {
    const ctx = makeCtx()
    sys.setMode('resource')
    sys.renderModeButton(ctx, 0, 0)
    expect((ctx as any).strokeStyle).toBe('#66bb6a')
  })

  it('population 模式 strokeStyle 为 #ff7043', () => {
    const ctx = makeCtx()
    sys.setMode('population')
    sys.renderModeButton(ctx, 0, 0)
    expect((ctx as any).strokeStyle).toBe('#ff7043')
  })
})

// ─────────────────────────────────────────────
describe('MiniMapModeSystem — 综合与边界', () => {
  let sys: MiniMapModeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('新实例 modeIdx 为 0', () => {
    expect((sys as any).modeIdx).toBe(0)
  })

  it('cycleMode 后 mode 不等于 normal', () => {
    sys.cycleMode()
    expect((sys as any).mode).not.toBe('normal')
  })

  it('setMode 再 cycleMode 的 modeIdx 连续性', () => {
    sys.setMode('population') // idx=3
    sys.cycleMode()           // idx=0 → normal
    expect((sys as any).modeIdx).toBe(0)
  })

  it('4 种模式依次出现后不重复（一轮）', () => {
    const seen = new Set<string>()
    seen.add((sys as any).mode)
    for (let i = 0; i < 4; i++) {
      sys.cycleMode()
      seen.add((sys as any).mode)
    }
    expect(seen.size).toBe(4)
  })

  it('setMode 两次覆盖', () => {
    sys.setMode('political')
    sys.setMode('resource')
    expect((sys as any).mode).toBe('resource')
    expect((sys as any).modeIdx).toBe(2)
  })

  it('cycleMode 后 setMode 不崩溃', () => {
    sys.cycleMode()
    expect(() => sys.setMode('normal')).not.toThrow()
  })

  it('renderModeButton 在 cycleMode 多次后不崩溃', () => {
    const ctx = {
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(),
      fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
      roundRect: vi.fn(), fillStyle: '', strokeStyle: '',
      lineWidth: 0, font: '',
      textAlign: 'left' as CanvasTextAlign,
      textBaseline: 'alphabetic' as CanvasTextBaseline,
    } as unknown as CanvasRenderingContext2D
    for (let i = 0; i < 12; i++) {
      sys.cycleMode()
      expect(() => sys.renderModeButton(ctx, 0, 0)).not.toThrow()
    }
  })

  it('mode 为 string 类型（setMode 后）', () => {
    sys.setMode('political')
    expect(typeof (sys as any).mode).toBe('string')
  })

  it('modeIdx 为 number 类型（cycleMode 后）', () => {
    sys.cycleMode()
    expect(typeof (sys as any).modeIdx).toBe('number')
  })
})
