import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { roundRect, lerpColorHex, lerpColorRgb, roundRectArc } from '../utils/CanvasUtils'

// ---- 最小 CanvasRenderingContext2D mock ----
function makeCtx() {
  return {
    _calls: [] as string[],
    _moveToCalls: [] as [number, number][],
    _lineToArgs: [] as [number, number][],
    _quadCurveArgs: [] as [number, number, number, number][],
    _arcToArgs: [] as [number, number, number, number, number][],
    _closeCalled: false,
    beginPath: vi.fn(function(this: ReturnType<typeof makeCtx>) { this._calls.push('beginPath') }),
    moveTo: vi.fn(function(this: ReturnType<typeof makeCtx>, x: number, y: number) {
      this._calls.push('moveTo')
      this._moveToCalls.push([x, y])
    }),
    lineTo: vi.fn(function(this: ReturnType<typeof makeCtx>, x: number, y: number) {
      this._calls.push('lineTo')
      this._lineToArgs.push([x, y])
    }),
    quadraticCurveTo: vi.fn(function(this: ReturnType<typeof makeCtx>, cpx: number, cpy: number, x: number, y: number) {
      this._calls.push('quadraticCurveTo')
      this._quadCurveArgs.push([cpx, cpy, x, y])
    }),
    arcTo: vi.fn(function(this: ReturnType<typeof makeCtx>, x1: number, y1: number, x2: number, y2: number, r: number) {
      this._calls.push('arcTo')
      this._arcToArgs.push([x1, y1, x2, y2, r])
    }),
    closePath: vi.fn(function(this: ReturnType<typeof makeCtx>) {
      this._calls.push('closePath')
      this._closeCalled = true
    }),
  }
}

type MockCtx = ReturnType<typeof makeCtx>

// ---- roundRect tests ----

describe('roundRect — 函数签���', () => {
  afterEach(() => vi.restoreAllMocks())

  it('可以导入', () => {
    expect(typeof roundRect).toBe('function')
  })
  it('接受 6 个参数', () => {
    expect(roundRect.length).toBe(6)
  })
  it('调用不崩溃', () => {
    const ctx = makeCtx() as unknown as CanvasRenderingContext2D
    expect(() => roundRect(ctx, 0, 0, 100, 50, 10)).not.toThrow()
  })
  it('返回值为 undefined', () => {
    const ctx = makeCtx() as unknown as CanvasRenderingContext2D
    expect(roundRect(ctx, 0, 0, 100, 50, 10)).toBeUndefined()
  })
})

describe('roundRect — 路径调用顺序', () => {
  let ctx: MockCtx
  beforeEach(() => {
    ctx = makeCtx()
    roundRect(ctx as unknown as CanvasRenderingContext2D, 10, 20, 100, 60, 8)
  })
  afterEach(() => vi.restoreAllMocks())

  it('首先调用 beginPath', () => {
    expect(ctx._calls[0]).toBe('beginPath')
  })
  it('最后调用 closePath', () => {
    expect(ctx._calls[ctx._calls.length - 1]).toBe('closePath')
  })
  it('调用了 moveTo', () => {
    expect(ctx._calls).toContain('moveTo')
  })
  it('调用了 lineTo', () => {
    expect(ctx._calls).toContain('lineTo')
  })
  it('调用了 quadraticCurveTo', () => {
    expect(ctx._calls).toContain('quadraticCurveTo')
  })
  it('exacty 4 次 quadraticCurveTo（四个圆角）', () => {
    const count = ctx._calls.filter(c => c === 'quadraticCurveTo').length
    expect(count).toBe(4)
  })
  it('exactly 4 次 lineTo（四条边）', () => {
    const count = ctx._calls.filter(c => c === 'lineTo').length
    expect(count).toBe(4)
  })
  it('closePath 被调用', () => {
    expect(ctx._closeCalled).toBe(true)
  })
})

describe('roundRect — 几何正确性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('moveTo 起点为 (x+r, y)', () => {
    const ctx = makeCtx()
    roundRect(ctx as unknown as CanvasRenderingContext2D, 10, 20, 100, 60, 8)
    expect(ctx._moveToCalls[0]).toEqual([18, 20]) // x+r=18, y=20
  })
  it('r=0 时 lineTo 各边端点正确（矩形）', () => {
    const ctx = makeCtx()
    roundRect(ctx as unknown as CanvasRenderingContext2D, 0, 0, 100, 50, 0)
    // moveTo(0+0, 0) = (0,0)
    expect(ctx._moveToCalls[0]).toEqual([0, 0])
  })
  it('quadraticCurveTo 控制点数量正确', () => {
    const ctx = makeCtx()
    roundRect(ctx as unknown as CanvasRenderingContext2D, 0, 0, 200, 100, 10)
    expect(ctx._quadCurveArgs.length).toBe(4)
  })
  it('大圆角 r=50 不崩溃', () => {
    const ctx = makeCtx() as unknown as CanvasRenderingContext2D
    expect(() => roundRect(ctx, 0, 0, 200, 100, 50)).not.toThrow()
  })
  it('零尺寸矩形不崩溃', () => {
    const ctx = makeCtx() as unknown as CanvasRenderingContext2D
    expect(() => roundRect(ctx, 0, 0, 0, 0, 0)).not.toThrow()
  })
  it('负坐标不崩溃', () => {
    const ctx = makeCtx() as unknown as CanvasRenderingContext2D
    expect(() => roundRect(ctx, -50, -30, 100, 60, 5)).not.toThrow()
  })
})

// ---- roundRectArc tests ----

describe('roundRectArc — 函数签名', () => {
  afterEach(() => vi.restoreAllMocks())

  it('可以导入', () => {
    expect(typeof roundRectArc).toBe('function')
  })
  it('接受 6 个参数', () => {
    expect(roundRectArc.length).toBe(6)
  })
  it('调用不崩溃', () => {
    const ctx = makeCtx() as unknown as CanvasRenderingContext2D
    expect(() => roundRectArc(ctx, 0, 0, 100, 50, 10)).not.toThrow()
  })
})

describe('roundRectArc — 路径调用', () => {
  let ctx: MockCtx
  beforeEach(() => {
    ctx = makeCtx()
    roundRectArc(ctx as unknown as CanvasRenderingContext2D, 10, 20, 100, 60, 8)
  })
  afterEach(() => vi.restoreAllMocks())

  it('首先调用 beginPath', () => {
    expect(ctx._calls[0]).toBe('beginPath')
  })
  it('最后调用 closePath', () => {
    expect(ctx._calls[ctx._calls.length - 1]).toBe('closePath')
  })
  it('调用了 arcTo（使用 arcTo 实现圆角）', () => {
    expect(ctx._calls).toContain('arcTo')
  })
  it('exactly 4 次 arcTo（四个圆角）', () => {
    const count = ctx._calls.filter(c => c === 'arcTo').length
    expect(count).toBe(4)
  })
  it('exactly 4 次 lineTo', () => {
    const count = ctx._calls.filter(c => c === 'lineTo').length
    expect(count).toBe(4)
  })
  it('arcTo 传递半径参数 r=8', () => {
    // 每个 arcTo 最后一个参数应为 radius
    for (const args of ctx._arcToArgs) {
      expect(args[4]).toBe(8)
    }
  })
  it('closePath 被调用', () => {
    expect(ctx._closeCalled).toBe(true)
  })
})

// ---- lerpColorHex tests ----

describe('lerpColorHex — 函数签名', () => {
  afterEach(() => vi.restoreAllMocks())

  it('可以导入', () => {
    expect(typeof lerpColorHex).toBe('function')
  })
  it('返回字符串', () => {
    expect(typeof lerpColorHex('#000000', '#ffffff', 0.5)).toBe('string')
  })
  it('返回以 # 开头的字符串', () => {
    expect(lerpColorHex('#000000', '#ffffff', 0.5)).toMatch(/^#/)
  })
  it('返回 7 个字符的 hex 颜色', () => {
    expect(lerpColorHex('#000000', '#ffffff', 0.5)).toHaveLength(7)
  })
  it('返回合法 hex 格式', () => {
    expect(lerpColorHex('#ff0000', '#0000ff', 0.3)).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('lerpColorHex — 边界值', () => {
  afterEach(() => vi.restoreAllMocks())

  it('t=0 时返回颜色 a', () => {
    expect(lerpColorHex('#000000', '#ffffff', 0)).toBe('#000000')
  })
  it('t=1 时返回颜色 b', () => {
    expect(lerpColorHex('#000000', '#ffffff', 1)).toBe('#ffffff')
  })
  it('t=0 时返回红色', () => {
    expect(lerpColorHex('#ff0000', '#0000ff', 0)).toBe('#ff0000')
  })
  it('t=1 时返回蓝色', () => {
    expect(lerpColorHex('#ff0000', '#0000ff', 1)).toBe('#0000ff')
  })
  it('t=0.5 时黑到白中间值约为 128', () => {
    const result = lerpColorHex('#000000', '#ffffff', 0.5)
    const r = parseInt(result.slice(1, 3), 16)
    expect(r).toBeGreaterThanOrEqual(127)
    expect(r).toBeLessThanOrEqual(128)
  })
})

describe('lerpColorHex — 颜色分量插值正确性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('仅 R 分量变化', () => {
    const result = lerpColorHex('#000000', '#ff0000', 1)
    const r = parseInt(result.slice(1, 3), 16)
    const g = parseInt(result.slice(3, 5), 16)
    const b = parseInt(result.slice(5, 7), 16)
    expect(r).toBe(255)
    expect(g).toBe(0)
    expect(b).toBe(0)
  })
  it('仅 G 分量变化', () => {
    const result = lerpColorHex('#000000', '#00ff00', 1)
    const g = parseInt(result.slice(3, 5), 16)
    expect(g).toBe(255)
  })
  it('仅 B 分量变化', () => {
    const result = lerpColorHex('#000000', '#0000ff', 1)
    const b = parseInt(result.slice(5, 7), 16)
    expect(b).toBe(255)
  })
  it('t=0.25 时 R 分量约为 64', () => {
    const result = lerpColorHex('#000000', '#ff0000', 0.25)
    const r = parseInt(result.slice(1, 3), 16)
    expect(r).toBeGreaterThanOrEqual(63)
    expect(r).toBeLessThanOrEqual(64)
  })
  it('t=0.75 时 R 分量约为 191', () => {
    const result = lerpColorHex('#000000', '#ff0000', 0.75)
    const r = parseInt(result.slice(1, 3), 16)
    expect(r).toBeGreaterThanOrEqual(191)
    expect(r).toBeLessThanOrEqual(192)
  })
  it('同色插值无论 t 值结果不变', () => {
    expect(lerpColorHex('#aabbcc', '#aabbcc', 0.5)).toBe('#aabbcc')
  })
  it('红到蓝 t=0.5 R 和 B 分量各约 128', () => {
    const result = lerpColorHex('#ff0000', '#0000ff', 0.5)
    const r = parseInt(result.slice(1, 3), 16)
    const b = parseInt(result.slice(5, 7), 16)
    expect(r).toBeGreaterThanOrEqual(127)
    expect(r).toBeLessThanOrEqual(128)
    expect(b).toBeGreaterThanOrEqual(127)
    expect(b).toBeLessThanOrEqual(128)
  })
  it('绿到蓝 t=0.5 G 分量减半', () => {
    const result = lerpColorHex('#00ff00', '#0000ff', 0.5)
    const g = parseInt(result.slice(3, 5), 16)
    expect(g).toBeGreaterThanOrEqual(127)
    expect(g).toBeLessThanOrEqual(128)
  })
})

// ---- lerpColorRgb tests ----

describe('lerpColorRgb — 函数签名', () => {
  afterEach(() => vi.restoreAllMocks())

  it('可以导入', () => {
    expect(typeof lerpColorRgb).toBe('function')
  })
  it('返回字符串', () => {
    expect(typeof lerpColorRgb('#000000', '#ffffff', 0.5)).toBe('string')
  })
  it('返回 rgb() 格式', () => {
    expect(lerpColorRgb('#000000', '#ffffff', 0.5)).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
  })
})

describe('lerpColorRgb — 边界值', () => {
  afterEach(() => vi.restoreAllMocks())

  it('t=0 时返回 a 的 rgb 格式', () => {
    expect(lerpColorRgb('#000000', '#ffffff', 0)).toBe('rgb(0,0,0)')
  })
  it('t=1 时返回 b 的 rgb 格式', () => {
    expect(lerpColorRgb('#000000', '#ffffff', 1)).toBe('rgb(255,255,255)')
  })
  it('t=0 红色返回 rgb(255,0,0)', () => {
    expect(lerpColorRgb('#ff0000', '#0000ff', 0)).toBe('rgb(255,0,0)')
  })
  it('t=1 蓝色返回 rgb(0,0,255)', () => {
    expect(lerpColorRgb('#ff0000', '#0000ff', 1)).toBe('rgb(0,0,255)')
  })
  it('t=0.5 黑到白中间 R 分量约 128', () => {
    const result = lerpColorRgb('#000000', '#ffffff', 0.5)
    const match = result.match(/rgb\((\d+),(\d+),(\d+)\)/)!
    expect(parseInt(match[1])).toBeGreaterThanOrEqual(127)
    expect(parseInt(match[1])).toBeLessThanOrEqual(128)
  })
})

describe('lerpColorRgb — 颜色分量插值', () => {
  afterEach(() => vi.restoreAllMocks())

  it('红到蓝 t=0.5 R 和 B 各约 128', () => {
    const result = lerpColorRgb('#ff0000', '#0000ff', 0.5)
    const match = result.match(/rgb\((\d+),(\d+),(\d+)\)/)!
    expect(parseInt(match[1])).toBeGreaterThan(100)
    expect(parseInt(match[3])).toBeGreaterThan(100)
  })
  it('G 分量独立变化', () => {
    const result = lerpColorRgb('#000000', '#00ff00', 1)
    const match = result.match(/rgb\((\d+),(\d+),(\d+)\)/)!
    expect(parseInt(match[1])).toBe(0)
    expect(parseInt(match[2])).toBe(255)
    expect(parseInt(match[3])).toBe(0)
  })
  it('同色插值结果不变', () => {
    expect(lerpColorRgb('#112233', '#112233', 0.7)).toBe('rgb(17,34,51)')
  })
  it('t=0.25 时 R 分量约 64（黑到红）', () => {
    const result = lerpColorRgb('#000000', '#ff0000', 0.25)
    const match = result.match(/rgb\((\d+),\d+,\d+\)/)!
    expect(parseInt(match[1])).toBeGreaterThanOrEqual(63)
    expect(parseInt(match[1])).toBeLessThanOrEqual(64)
  })
  it('t=0.5 绿到白 G 分量应接近 255', () => {
    const result = lerpColorRgb('#00ff00', '#ffffff', 0.5)
    const match = result.match(/rgb\(\d+,(\d+),\d+\)/)!
    expect(parseInt(match[1])).toBe(255)
  })
  it('所有分量值在 0~255 范围内', () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const result = lerpColorRgb('#ff0000', '#0000ff', t)
      const match = result.match(/rgb\((\d+),(\d+),(\d+)\)/)!
      for (let i = 1; i <= 3; i++) {
        const v = parseInt(match[i])
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(255)
      }
    }
  })
})

describe('lerpColorHex 与 lerpColorRgb — 跨函数一致性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('两函数 t=0 时 RGB 分量一致', () => {
    const hex = lerpColorHex('#123456', '#abcdef', 0)
    const rgb = lerpColorRgb('#123456', '#abcdef', 0)
    const hr = parseInt(hex.slice(1, 3), 16)
    const hg = parseInt(hex.slice(3, 5), 16)
    const hb = parseInt(hex.slice(5, 7), 16)
    const match = rgb.match(/rgb\((\d+),(\d+),(\d+)\)/)!
    expect(parseInt(match[1])).toBe(hr)
    expect(parseInt(match[2])).toBe(hg)
    expect(parseInt(match[3])).toBe(hb)
  })
  it('两函数 t=1 时 RGB 分量一致', () => {
    const hex = lerpColorHex('#ff8800', '#00ff88', 1)
    const rgb = lerpColorRgb('#ff8800', '#00ff88', 1)
    const hr = parseInt(hex.slice(1, 3), 16)
    const match = rgb.match(/rgb\((\d+),(\d+),(\d+)\)/)!
    expect(parseInt(match[1])).toBe(hr)
  })
  it('两函数 t=0.5 时 R 分量一致', () => {
    const hex = lerpColorHex('#000000', '#ff0000', 0.5)
    const rgb = lerpColorRgb('#000000', '#ff0000', 0.5)
    const hr = parseInt(hex.slice(1, 3), 16)
    const match = rgb.match(/rgb\((\d+),\d+,\d+\)/)!
    expect(parseInt(match[1])).toBe(hr)
  })
})
