import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TradeRouteRenderer, TradeRoute } from '../systems/TradeRouteRenderer'

function makeSys() { return new TradeRouteRenderer() }

function makeRoute(overrides: Partial<TradeRoute> = {}): TradeRoute {
  return {
    fromX: 0, fromY: 0,
    toX: 10, toY: 10,
    volume: 50,
    active: true,
    ...overrides,
  }
}

function makeCtx(): CanvasRenderingContext2D {
  const canvas = { width: 800, height: 600 } as HTMLCanvasElement
  return {
    canvas,
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    setLineDash: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}

describe('TradeRouteRenderer — 初始状态', () => {
  let sys: TradeRouteRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 routes 为空数组', () => {
    expect((sys as any).routes).toHaveLength(0)
  })

  it('初始 visible 为 true', () => {
    expect((sys as any).visible).toBe(true)
  })

  it('初始 animOffset 为 0', () => {
    expect((sys as any).animOffset).toBe(0)
  })

  it('isVisible() 初始返回 true', () => {
    expect(sys.isVisible()).toBe(true)
  })
})

describe('TradeRouteRenderer — toggle 行为', () => {
  let sys: TradeRouteRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('toggle() 一次后 isVisible() 返回 false', () => {
    sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })

  it('toggle() 两次后 isVisible() 恢复 true', () => {
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })

  it('toggle() 三次后 isVisible() 为 false', () => {
    sys.toggle()
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })

  it('toggle() 四次后 isVisible() 为 true', () => {
    sys.toggle()
    sys.toggle()
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })

  it('toggle() 改变私有字段 visible', () => {
    sys.toggle()
    expect((sys as any).visible).toBe(false)
  })

  it('isVisible() 与私有字段 visible 保持一致', () => {
    expect(sys.isVisible()).toBe((sys as any).visible)
    sys.toggle()
    expect(sys.isVisible()).toBe((sys as any).visible)
  })
})

describe('TradeRouteRenderer — setRoutes 行为', () => {
  let sys: TradeRouteRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('setRoutes 空数组后 routes 长度为 0', () => {
    sys.setRoutes([])
    expect((sys as any).routes).toHaveLength(0)
  })

  it('setRoutes 单条路线后 routes 长度为 1', () => {
    sys.setRoutes([makeRoute()])
    expect((sys as any).routes).toHaveLength(1)
  })

  it('setRoutes 三条路线后 routes 长度为 3', () => {
    sys.setRoutes([makeRoute(), makeRoute(), makeRoute()])
    expect((sys as any).routes).toHaveLength(3)
  })

  it('setRoutes 覆盖旧数据', () => {
    sys.setRoutes([makeRoute(), makeRoute()])
    sys.setRoutes([makeRoute()])
    expect((sys as any).routes).toHaveLength(1)
  })

  it('setRoutes 后再设空数组清空 routes', () => {
    sys.setRoutes([makeRoute()])
    sys.setRoutes([])
    expect((sys as any).routes).toHaveLength(0)
  })

  it('setRoutes 保存路线引用', () => {
    const routes = [makeRoute({ fromX: 5, fromY: 7 })]
    sys.setRoutes(routes)
    expect((sys as any).routes[0].fromX).toBe(5)
    expect((sys as any).routes[0].fromY).toBe(7)
  })

  it('setRoutes 保存 volume 字段', () => {
    sys.setRoutes([makeRoute({ volume: 80 })])
    expect((sys as any).routes[0].volume).toBe(80)
  })

  it('setRoutes 保存 active 字段', () => {
    sys.setRoutes([makeRoute({ active: false })])
    expect((sys as any).routes[0].active).toBe(false)
  })
})

describe('TradeRouteRenderer — getRouteColor 私有方法', () => {
  let sys: TradeRouteRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('volume < 30 返回灰色 #888888', () => {
    expect((sys as any).getRouteColor(0)).toBe('#888888')
    expect((sys as any).getRouteColor(29)).toBe('#888888')
  })

  it('volume 30 返回黄色 #ccaa00', () => {
    expect((sys as any).getRouteColor(30)).toBe('#ccaa00')
  })

  it('volume 64 返回黄色 #ccaa00', () => {
    expect((sys as any).getRouteColor(64)).toBe('#ccaa00')
  })

  it('volume 65 返回金色 #ffc800', () => {
    expect((sys as any).getRouteColor(65)).toBe('#ffc800')
  })

  it('volume 100 返回金色 #ffc800', () => {
    expect((sys as any).getRouteColor(100)).toBe('#ffc800')
  })
})

describe('TradeRouteRenderer — getDotColor 私有方法', () => {
  let sys: TradeRouteRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('volume < 30 返回亮灰 #bbbbbb', () => {
    expect((sys as any).getDotColor(0)).toBe('#bbbbbb')
    expect((sys as any).getDotColor(29)).toBe('#bbbbbb')
  })

  it('volume 30-64 返回亮黄 #ffdd44', () => {
    expect((sys as any).getDotColor(30)).toBe('#ffdd44')
    expect((sys as any).getDotColor(64)).toBe('#ffdd44')
  })

  it('volume >= 65 返回亮金 #ffe066', () => {
    expect((sys as any).getDotColor(65)).toBe('#ffe066')
    expect((sys as any).getDotColor(100)).toBe('#ffe066')
  })
})

describe('TradeRouteRenderer — render 方法', () => {
  let sys: TradeRouteRenderer
  let ctx: CanvasRenderingContext2D
  beforeEach(() => {
    sys = makeSys()
    ctx = makeCtx()
  })
  afterEach(() => vi.restoreAllMocks())

  it('visible=false 时 render 不调用 ctx.save', () => {
    sys.toggle()
    sys.setRoutes([makeRoute()])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('routes 为空时 render 不调用 ctx.save', () => {
    sys.render(ctx, 0, 0, 1)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('有 active 路线时 render 调用 ctx.save', () => {
    sys.setRoutes([makeRoute()])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.save).toHaveBeenCalledTimes(1)
  })

  it('有 active 路线时 render 调用 ctx.restore', () => {
    sys.setRoutes([makeRoute()])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.restore).toHaveBeenCalledTimes(1)
  })

  it('inactive 路线不触发绘制', () => {
    sys.setRoutes([makeRoute({ active: false })])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.quadraticCurveTo).not.toHaveBeenCalled()
  })

  it('render 调用 ctx.scale 应用 zoom', () => {
    sys.setRoutes([makeRoute()])
    sys.render(ctx, 0, 0, 2)
    expect(ctx.scale).toHaveBeenCalledWith(2, 2)
  })

  it('render 调用 ctx.translate 应用摄像机偏移', () => {
    sys.setRoutes([makeRoute()])
    sys.render(ctx, 100, 50, 1)
    expect(ctx.translate).toHaveBeenCalledWith(-100, -50)
  })

  it('render 后 animOffset 增加 0.5', () => {
    sys.setRoutes([makeRoute()])
    const before = (sys as any).animOffset
    sys.render(ctx, 0, 0, 1)
    expect((sys as any).animOffset).toBe(before + 0.5)
  })

  it('render 多次 animOffset 累积', () => {
    sys.setRoutes([makeRoute()])
    sys.render(ctx, 0, 0, 1)
    sys.render(ctx, 0, 0, 1)
    sys.render(ctx, 0, 0, 1)
    expect((sys as any).animOffset).toBeCloseTo(1.5)
  })

  it('起点等于终点（dist≈0）时不崩溃', () => {
    sys.setRoutes([makeRoute({ fromX: 5, fromY: 5, toX: 5, toY: 5 })])
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })

  it('render 后全局 alpha 恢复为 1', () => {
    sys.setRoutes([makeRoute()])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.globalAlpha).toBe(1)
  })

  it('active 路线调用 setLineDash 设置虚线', () => {
    sys.setRoutes([makeRoute()])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4])
  })

  it('active 路线调用 setLineDash 重置虚线', () => {
    sys.setRoutes([makeRoute()])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.setLineDash).toHaveBeenCalledWith([])
  })

  it('视口外路线（maxX < viewLeft）不绘制', () => {
    // routes 放在 tile 0,0 → 1,0，zoom=1 时 viewLeft=10000 → 完全在视口左侧外
    sys.setRoutes([makeRoute({ fromX: 0, fromY: 0, toX: 1, toY: 0 })])
    sys.render(ctx, 10000, 0, 1)
    expect(ctx.quadraticCurveTo).not.toHaveBeenCalled()
  })
})
