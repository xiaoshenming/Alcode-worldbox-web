import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MinimapSystem, MinimapMode } from '../systems/MinimapSystem'
import { EntityManager } from '../ecs/Entity'

// ---------------------------------------------------------------------------
// 轻量级 mock：World / CivManager / Canvas
// ---------------------------------------------------------------------------
function makeWorld() {
  return {} as any
}

function makeCivManager() {
  return {} as any
}

function makeEntityManager(): EntityManager {
  const em = new EntityManager()
  return em
}

function makeCtx() {
  return {
    save: vi.fn(), restore: vi.fn(),
    fillRect: vi.fn(), strokeRect: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'start' as CanvasTextAlign,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}

// OffscreenCanvas stub
class FakeOffscreenCanvas {
  width: number; height: number
  constructor(w: number, h: number) { this.width = w; this.height = h }
  getContext(_type: string) {
    return makeCtx()
  }
}

// 在 globalThis 上注册 stub，让 MinimapSystem.ensureCache 不抛
(globalThis as any).OffscreenCanvas = FakeOffscreenCanvas

function makeSys(w = 200, h = 200) { return new MinimapSystem(w, h) }

const ALL_MODES: MinimapMode[] = ['terrain', 'political', 'population', 'resources', 'military']

// ---------------------------------------------------------------------------
// 1. 初始化
// ---------------------------------------------------------------------------
describe('MinimapSystem — 初始化', () => {
  let sys: MinimapSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getMode() 初始为 terrain', () => {
    expect(sys.getMode()).toBe('terrain')
  })

  it('getMode() 返回字符串', () => {
    expect(typeof sys.getMode()).toBe('string')
  })

  it('内部 _modeUpper 初始为 TERRAIN', () => {
    expect((sys as any)._modeUpper).toBe('TERRAIN')
  })

  it('cache 初始为 null', () => {
    expect((sys as any).cache).toBeNull()
  })

  it('cacheCtx 初始为 null', () => {
    expect((sys as any).cacheCtx).toBeNull()
  })

  it('lastCacheWidth 初始为 0', () => {
    expect((sys as any).lastCacheWidth).toBe(0)
  })

  it('lastCacheHeight 初始为 0', () => {
    expect((sys as any).lastCacheHeight).toBe(0)
  })

  it('lastRedrawTick 初始为 -Infinity', () => {
    expect((sys as any).lastRedrawTick).toBe(-Infinity)
  })

  it('popGrid 初始为空数组', () => {
    expect((sys as any).popGrid).toHaveLength(0)
  })

  it('worldWidth 与构造参数一致', () => {
    const s = makeSys(300, 400)
    expect((s as any).worldWidth).toBe(300)
  })

  it('worldHeight 与构造参数一致', () => {
    const s = makeSys(300, 400)
    expect((s as any).worldHeight).toBe(400)
  })

  it('多次实例化互相独立', () => {
    const a = makeSys()
    const b = makeSys()
    a.setMode('political')
    expect(b.getMode()).toBe('terrain')
  })
})

// ---------------------------------------------------------------------------
// 2. setMode()
// ---------------------------------------------------------------------------
describe('MinimapSystem — setMode()', () => {
  let sys: MinimapSystem
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

  it('从非 terrain 切换到 terrain 强制 lastRedrawTick 为 -Infinity', () => {
    sys.setMode('population')
    ;(sys as any).lastRedrawTick = 500
    sys.setMode('terrain')
    expect((sys as any).lastRedrawTick).toBe(-Infinity)
  })

  it('相同模式 setMode 不重置 lastRedrawTick', () => {
    ;(sys as any).lastRedrawTick = 100
    sys.setMode('terrain')  // mode 没有变化
    expect((sys as any).lastRedrawTick).toBe(100)
  })

  it('不同模式 setMode 重置 lastRedrawTick', () => {
    ;(sys as any).lastRedrawTick = 100
    sys.setMode('war' as MinimapMode)
    expect((sys as any).lastRedrawTick).toBe(-Infinity)
  })

  it('连续 setMode 以最后一次为准', () => {
    sys.setMode('political')
    sys.setMode('military')
    sys.setMode('terrain')
    expect(sys.getMode()).toBe('terrain')
  })
})

// ---------------------------------------------------------------------------
// 3. update() — 节流逻辑
// ---------------------------------------------------------------------------
describe('MinimapSystem — update() 节流', () => {
  let sys: MinimapSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEntityManager() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时首次 update 更新 lastRedrawTick (初始为 -Infinity)', () => {
    sys.update(makeWorld(), makeCivManager(), em, 0)
    expect((sys as any).lastRedrawTick).toBe(0)
  })

  it('tick=30 首次 update 后 lastRedrawTick 变为 30', () => {
    sys.update(makeWorld(), makeCivManager(), em, 30)
    expect((sys as any).lastRedrawTick).toBe(30)
  })

  it('连续 tick 不足 30 时 lastRedrawTick 不变', () => {
    sys.update(makeWorld(), makeCivManager(), em, 0)
    const prev = (sys as any).lastRedrawTick
    sys.update(makeWorld(), makeCivManager(), em, 15)
    expect((sys as any).lastRedrawTick).toBe(prev)
  })

  it('tick 差 >= 30 时 lastRedrawTick 更新', () => {
    sys.update(makeWorld(), makeCivManager(), em, 0)
    sys.update(makeWorld(), makeCivManager(), em, 30)
    expect((sys as any).lastRedrawTick).toBe(30)
  })

  it('population 模式 update 触发 buildPopulationGrid', () => {
    sys.setMode('population')
    const spy = vi.spyOn(sys as any, 'buildPopulationGrid')
    sys.update(makeWorld(), makeCivManager(), em, 0)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('military 模式 update 触发 buildPopulationGrid', () => {
    sys.setMode('military')
    const spy = vi.spyOn(sys as any, 'buildPopulationGrid')
    sys.update(makeWorld(), makeCivManager(), em, 0)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('terrain 模式 update 不触发 buildPopulationGrid', () => {
    sys.setMode('terrain')
    const spy = vi.spyOn(sys as any, 'buildPopulationGrid')
    sys.update(makeWorld(), makeCivManager(), em, 0)
    expect(spy).not.toHaveBeenCalled()
  })

  it('political 模式 update 不触发 buildPopulationGrid', () => {
    sys.setMode('political')
    const spy = vi.spyOn(sys as any, 'buildPopulationGrid')
    sys.update(makeWorld(), makeCivManager(), em, 0)
    expect(spy).not.toHaveBeenCalled()
  })

  it('resources 模式 update 不触发 buildPopulationGrid', () => {
    sys.setMode('resources')
    const spy = vi.spyOn(sys as any, 'buildPopulationGrid')
    sys.update(makeWorld(), makeCivManager(), em, 0)
    expect(spy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 4. buildPopulationGrid()
// ---------------------------------------------------------------------------
describe('MinimapSystem — buildPopulationGrid()', () => {
  let sys: MinimapSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(200, 200); em = makeEntityManager() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无实体时 popGrid 全为 0', () => {
    ;(sys as any).buildPopulationGrid(em)
    const grid: number[][] = (sys as any).popGrid
    for (const row of grid) {
      for (const cell of row) {
        expect(cell).toBe(0)
      }
    }
  })

  it('buildPopulationGrid 初始化 10x10 grid', () => {
    ;(sys as any).buildPopulationGrid(em)
    expect((sys as any).popGrid.length).toBe(10)
    expect((sys as any).popGrid[0].length).toBe(10)
  })

  it('有实体时对应格子计数增加', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'creature' })
    em.addComponent(id, { type: 'position', x: 10, y: 10 })
    ;(sys as any).buildPopulationGrid(em)
    // x=10, cellW=200/10=20 → col=0; y=10, cellH=20 → row=0
    expect((sys as any).popGrid[0][0]).toBe(1)
  })

  it('多个实体同一格子累加', () => {
    for (let i = 0; i < 3; i++) {
      const id = em.createEntity()
      em.addComponent(id, { type: 'creature' })
      em.addComponent(id, { type: 'position', x: 5, y: 5 })
    }
    ;(sys as any).buildPopulationGrid(em)
    expect((sys as any).popGrid[0][0]).toBe(3)
  })

  it('实体位于边界时不越界', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'creature' })
    em.addComponent(id, { type: 'position', x: 199, y: 199 })
    expect(() => (sys as any).buildPopulationGrid(em)).not.toThrow()
  })

  it('二次调用时重置网格（旧计数清零）', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'creature' })
    em.addComponent(id, { type: 'position', x: 5, y: 5 })
    ;(sys as any).buildPopulationGrid(em)
    em.removeEntity(id)
    ;(sys as any).buildPopulationGrid(em)
    expect((sys as any).popGrid[0][0]).toBe(0)
  })

  it('没有 position 组件的 creature 不计入', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'creature' })
    // 不添加 position
    ;(sys as any).buildPopulationGrid(em)
    const total = (sys as any).popGrid.flat().reduce((a: number, b: number) => a + b, 0)
    expect(total).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5. ensureCache()
// ---------------------------------------------------------------------------
describe('MinimapSystem — ensureCache()', () => {
  let sys: MinimapSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('ensureCache 创建 OffscreenCanvas', () => {
    ;(sys as any).ensureCache(160, 120)
    expect((sys as any).cache).not.toBeNull()
  })

  it('ensureCache 记录 lastCacheWidth', () => {
    ;(sys as any).ensureCache(160, 120)
    expect((sys as any).lastCacheWidth).toBe(160)
  })

  it('ensureCache 记录 lastCacheHeight', () => {
    ;(sys as any).ensureCache(160, 120)
    expect((sys as any).lastCacheHeight).toBe(120)
  })

  it('相同尺寸再次调用 ensureCache 不重建 cache', () => {
    ;(sys as any).ensureCache(160, 120)
    const firstCache = (sys as any).cache
    ;(sys as any).ensureCache(160, 120)
    expect((sys as any).cache).toBe(firstCache)
  })

  it('尺寸变化时 ensureCache 重建 cache', () => {
    ;(sys as any).ensureCache(160, 120)
    const firstCache = (sys as any).cache
    ;(sys as any).ensureCache(200, 150)
    expect((sys as any).cache).not.toBe(firstCache)
  })
})

// ---------------------------------------------------------------------------
// 6. render() — Canvas 调用验证
// ---------------------------------------------------------------------------
describe('MinimapSystem — render() 调用验证', () => {
  let sys: MinimapSystem
  let ctx: CanvasRenderingContext2D
  let em: EntityManager
  beforeEach(() => {
    sys = makeSys()
    ctx = makeCtx()
    em = makeEntityManager()
    // 预先触发 update 使 cache 建立
    sys.update(makeWorld(), makeCivManager(), em, 0)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('render 调用 ctx.save()', () => {
    sys.render(ctx, 0, 0, 160, 120, 0, 0, 1, 800, 600)
    expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('render 调用 ctx.restore()', () => {
    sys.render(ctx, 0, 0, 160, 120, 0, 0, 1, 800, 600)
    expect((ctx.restore as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('render 调用 ctx.strokeRect (边框)', () => {
    sys.render(ctx, 0, 0, 160, 120, 0, 0, 1, 800, 600)
    expect((ctx.strokeRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('render 调用 ctx.fillText 绘制模式标签', () => {
    sys.render(ctx, 0, 0, 160, 120, 0, 0, 1, 800, 600)
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('terrain 模式 fillText 包含 TERRAIN', () => {
    sys.setMode('terrain')
    sys.render(ctx, 0, 0, 160, 120, 0, 0, 1, 800, 600)
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0])
    expect(texts).toContain('TERRAIN')
  })

  it('political 模式 fillText 包含 POLITICAL', () => {
    sys.setMode('political')
    sys.render(ctx, 0, 0, 160, 120, 0, 0, 1, 800, 600)
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0])
    expect(texts).toContain('POLITICAL')
  })

  it('render 不抛异常 (zoom=2)', () => {
    expect(() => sys.render(ctx, 10, 10, 160, 120, 100, 100, 2, 800, 600)).not.toThrow()
  })

  it('render 不抛异常 (zoom=0.5)', () => {
    expect(() => sys.render(ctx, 0, 0, 160, 120, 0, 0, 0.5, 800, 600)).not.toThrow()
  })

  it('render fillRect 被调用用于标签背景', () => {
    sys.render(ctx, 0, 0, 160, 120, 0, 0, 1, 800, 600)
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 7. 模式遍历 — 所有模式均可 update+render 无崩溃
// ---------------------------------------------------------------------------
describe('MinimapSystem — 所有模式 update+render 无崩溃', () => {
  afterEach(() => { vi.restoreAllMocks() })

  for (const m of ALL_MODES) {
    it(`模式 ${m} update+render 不抛`, () => {
      const sys = makeSys()
      const ctx = makeCtx()
      const em = makeEntityManager()
      sys.setMode(m)
      sys.update(makeWorld(), makeCivManager(), em, 0)
      expect(() => sys.render(ctx, 0, 0, 160, 120, 0, 0, 1, 800, 600)).not.toThrow()
    })
  }
})
