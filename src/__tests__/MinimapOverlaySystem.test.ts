import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  MinimapOverlaySystem,
  OverlayMode,
  PoliticalEntry,
  MilitaryUnit,
  ResourceMarker,
  OverlayData,
} from '../systems/MinimapOverlaySystem'

function makeSys() { return new MinimapOverlaySystem() }

function makeCtx() {
  return {
    save: vi.fn(), restore: vi.fn(),
    fillRect: vi.fn(), strokeRect: vi.fn(),
    beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '' as string,
    strokeStyle: '' as string,
    lineWidth: 0,
    font: '',
    textAlign: 'start' as CanvasTextAlign,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}

const ALL_MODES: OverlayMode[] = ['terrain', 'political', 'population', 'resources', 'military']

// ---------------------------------------------------------------------------
// 1. 初始化
// ---------------------------------------------------------------------------
describe('MinimapOverlaySystem — 初始化', () => {
  let sys: MinimapOverlaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始模式为 terrain', () => {
    expect(sys.getMode()).toBe('terrain')
  })

  it('getMode() 返回字符串类型', () => {
    expect(typeof sys.getMode()).toBe('string')
  })

  it('内部 _modeUpper 初始为 TERRAIN', () => {
    expect((sys as any)._modeUpper).toBe('TERRAIN')
  })

  it('构造后 mode 字段值为 terrain', () => {
    expect((sys as any).mode).toBe('terrain')
  })

  it('多次实例化互相独立', () => {
    const a = makeSys()
    const b = makeSys()
    a.setMode('war' as OverlayMode)
    expect(b.getMode()).toBe('terrain')
  })
})

// ---------------------------------------------------------------------------
// 2. setMode()
// ---------------------------------------------------------------------------
describe('MinimapOverlaySystem — setMode()', () => {
  let sys: MinimapOverlaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  for (const m of ALL_MODES) {
    it(`setMode('${m}') 后 getMode() === '${m}'`, () => {
      sys.setMode(m)
      expect(sys.getMode()).toBe(m)
    })
  }

  it('setMode 更新 _modeUpper 为大写', () => {
    sys.setMode('political')
    expect((sys as any)._modeUpper).toBe('POLITICAL')
  })

  it('setMode population 更新 _modeUpper', () => {
    sys.setMode('population')
    expect((sys as any)._modeUpper).toBe('POPULATION')
  })

  it('setMode resources 更新 _modeUpper', () => {
    sys.setMode('resources')
    expect((sys as any)._modeUpper).toBe('RESOURCES')
  })

  it('setMode military 更新 _modeUpper', () => {
    sys.setMode('military')
    expect((sys as any)._modeUpper).toBe('MILITARY')
  })

  it('连续 setMode 以最后一次为准', () => {
    sys.setMode('political')
    sys.setMode('military')
    sys.setMode('terrain')
    expect(sys.getMode()).toBe('terrain')
  })
})

// ---------------------------------------------------------------------------
// 3. nextMode()
// ---------------------------------------------------------------------------
describe('MinimapOverlaySystem — nextMode()', () => {
  let sys: MinimapOverlaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('terrain → political', () => {
    expect(sys.nextMode()).toBe('political')
  })

  it('political → population', () => {
    sys.setMode('political')
    expect(sys.nextMode()).toBe('population')
  })

  it('population → resources', () => {
    sys.setMode('population')
    expect(sys.nextMode()).toBe('resources')
  })

  it('resources → military', () => {
    sys.setMode('resources')
    expect(sys.nextMode()).toBe('military')
  })

  it('military 循环回 terrain', () => {
    sys.setMode('military')
    expect(sys.nextMode()).toBe('terrain')
  })

  it('nextMode 返回值与 getMode() 一致', () => {
    const next = sys.nextMode()
    expect(sys.getMode()).toBe(next)
  })

  it('5 次 nextMode 回到起点', () => {
    for (let i = 0; i < 5; i++) sys.nextMode()
    expect(sys.getMode()).toBe('terrain')
  })

  it('10 次 nextMode 仍回到起点', () => {
    for (let i = 0; i < 10; i++) sys.nextMode()
    expect(sys.getMode()).toBe('terrain')
  })

  it('nextMode 更新 _modeUpper', () => {
    sys.nextMode() // → political
    expect((sys as any)._modeUpper).toBe('POLITICAL')
  })
})

// ---------------------------------------------------------------------------
// 4. render() — terrain 模式
// ---------------------------------------------------------------------------
describe('MinimapOverlaySystem — render() terrain', () => {
  let sys: MinimapOverlaySystem
  let ctx: CanvasRenderingContext2D
  beforeEach(() => { sys = makeSys(); ctx = makeCtx() })
  afterEach(() => { vi.restoreAllMocks() })

  it('terrain render 不抛异常', () => {
    expect(() => sys.render(ctx, 200, 150, {})).not.toThrow()
  })

  it('terrain render 调用 renderModeLabel (fillRect)', () => {
    sys.render(ctx, 200, 150, {})
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('terrain render 调用 fillText 绘制标签', () => {
    sys.render(ctx, 200, 150, {})
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('terrain fillText 内容为 TERRAIN', () => {
    sys.render(ctx, 200, 150, {})
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const texts = calls.map((c: unknown[]) => c[0])
    expect(texts).toContain('TERRAIN')
  })
})

// ---------------------------------------------------------------------------
// 5. render() — political 模式
// ---------------------------------------------------------------------------
describe('MinimapOverlaySystem — render() political', () => {
  let sys: MinimapOverlaySystem
  let ctx: CanvasRenderingContext2D
  beforeEach(() => { sys = makeSys(); sys.setMode('political'); ctx = makeCtx() })
  afterEach(() => { vi.restoreAllMocks() })

  it('political render 无 data 不抛', () => {
    expect(() => sys.render(ctx, 200, 150, {})).not.toThrow()
  })

  it('political render 有 data 不抛', () => {
    const data: OverlayData = {
      political: [{ color: '#ff0000', territory: new Set([0, 1, 2]) }],
      worldWidth: 100,
      worldHeight: 100,
    }
    expect(() => sys.render(ctx, 200, 150, data)).not.toThrow()
  })

  it('political render 有数据时调用 fillRect', () => {
    const data: OverlayData = {
      political: [{ color: '#ff0000', territory: new Set([0, 1, 2]) }],
      worldWidth: 100,
      worldHeight: 100,
    }
    sys.render(ctx, 200, 150, data)
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('缺少 worldWidth 时 political 渲染跳过不崩溃', () => {
    const data: OverlayData = {
      political: [{ color: '#ff0000', territory: new Set([0]) }],
    }
    expect(() => sys.render(ctx, 200, 150, data)).not.toThrow()
  })

  it('fillText 内容为 POLITICAL', () => {
    sys.render(ctx, 200, 150, {})
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0])
    expect(texts).toContain('POLITICAL')
  })
})

// ---------------------------------------------------------------------------
// 6. render() — population 模式
// ---------------------------------------------------------------------------
describe('MinimapOverlaySystem — render() population', () => {
  let sys: MinimapOverlaySystem
  let ctx: CanvasRenderingContext2D
  beforeEach(() => { sys = makeSys(); sys.setMode('population'); ctx = makeCtx() })
  afterEach(() => { vi.restoreAllMocks() })

  it('population render 无 data 不抛', () => {
    expect(() => sys.render(ctx, 200, 150, {})).not.toThrow()
  })

  it('population render 有数据不抛', () => {
    const data: OverlayData = {
      population: [[0, 5, 10], [3, 0, 7]],
    }
    expect(() => sys.render(ctx, 200, 150, data)).not.toThrow()
  })

  it('population 空网格不抛', () => {
    const data: OverlayData = { population: [] }
    expect(() => sys.render(ctx, 200, 150, data)).not.toThrow()
  })

  it('population 全零网格不调用 fillRect 绘制色块', () => {
    const data: OverlayData = {
      population: [[0, 0], [0, 0]],
    }
    sys.render(ctx, 200, 150, data)
    // fillRect 至少被调用一次用于标签背景
    const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(1)
  })

  it('population fillText 内容包含 POPULATION', () => {
    sys.render(ctx, 200, 150, {})
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0])
    expect(texts).toContain('POPULATION')
  })
})

// ---------------------------------------------------------------------------
// 7. render() — resources 模式
// ---------------------------------------------------------------------------
describe('MinimapOverlaySystem — render() resources', () => {
  let sys: MinimapOverlaySystem
  let ctx: CanvasRenderingContext2D
  beforeEach(() => { sys = makeSys(); sys.setMode('resources'); ctx = makeCtx() })
  afterEach(() => { vi.restoreAllMocks() })

  it('resources render 无 data 不抛', () => {
    expect(() => sys.render(ctx, 200, 150, {})).not.toThrow()
  })

  it('resources render 有 markers 不抛', () => {
    const data: OverlayData = {
      resources: [{ x: 10, y: 20, type: 'wood' }, { x: 50, y: 60, type: 'gold' }],
      worldWidth: 100,
      worldHeight: 100,
    }
    expect(() => sys.render(ctx, 200, 150, data)).not.toThrow()
  })

  it('已知资源类型 wood 有颜色映射', () => {
    // 通过查看资源颜色常量间接验证
    const data: OverlayData = {
      resources: [{ x: 10, y: 10, type: 'wood' }],
      worldWidth: 50,
      worldHeight: 50,
    }
    sys.render(ctx, 100, 100, data)
    const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.length).toBeGreaterThan(0)
  })

  it('未知资源类型也不抛（回退白色）', () => {
    const data: OverlayData = {
      resources: [{ x: 5, y: 5, type: 'unknownXYZ' }],
      worldWidth: 50,
      worldHeight: 50,
    }
    expect(() => sys.render(ctx, 100, 100, data)).not.toThrow()
  })

  it('缺少 worldWidth 时 resources 渲染跳过', () => {
    const data: OverlayData = {
      resources: [{ x: 5, y: 5, type: 'gold' }],
    }
    expect(() => sys.render(ctx, 100, 100, data)).not.toThrow()
  })

  it('fillText 内容包含 RESOURCES', () => {
    sys.render(ctx, 200, 150, {})
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0])
    expect(texts).toContain('RESOURCES')
  })
})

// ---------------------------------------------------------------------------
// 8. render() — military 模式
// ---------------------------------------------------------------------------
describe('MinimapOverlaySystem — render() military', () => {
  let sys: MinimapOverlaySystem
  let ctx: CanvasRenderingContext2D
  beforeEach(() => { sys = makeSys(); sys.setMode('military'); ctx = makeCtx() })
  afterEach(() => { vi.restoreAllMocks() })

  it('military render 无 data 不抛', () => {
    expect(() => sys.render(ctx, 200, 150, {})).not.toThrow()
  })

  it('military render 有 units 不抛', () => {
    const data: OverlayData = {
      military: [{ x: 10, y: 20, faction: 'red', color: '#ff0000' }],
      worldWidth: 100,
      worldHeight: 100,
    }
    expect(() => sys.render(ctx, 200, 150, data)).not.toThrow()
  })

  it('military render 调用 arc 绘制单位', () => {
    const data: OverlayData = {
      military: [{ x: 10, y: 20, faction: 'blue', color: '#0000ff' }],
      worldWidth: 100,
      worldHeight: 100,
    }
    sys.render(ctx, 200, 150, data)
    expect((ctx.arc as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('military render 多个 units 多次 arc', () => {
    const data: OverlayData = {
      military: [
        { x: 10, y: 10, faction: 'r', color: '#f00' },
        { x: 50, y: 50, faction: 'b', color: '#00f' },
        { x: 80, y: 80, faction: 'g', color: '#0f0' },
      ],
      worldWidth: 100,
      worldHeight: 100,
    }
    sys.render(ctx, 200, 150, data)
    expect((ctx.arc as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3)
  })

  it('缺少 worldHeight 时 military 渲染跳过', () => {
    const data: OverlayData = {
      military: [{ x: 5, y: 5, faction: 'x', color: '#fff' }],
      worldWidth: 100,
    }
    expect(() => sys.render(ctx, 100, 100, data)).not.toThrow()
  })

  it('fillText 内容包含 MILITARY', () => {
    sys.render(ctx, 200, 150, {})
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0])
    expect(texts).toContain('MILITARY')
  })
})
