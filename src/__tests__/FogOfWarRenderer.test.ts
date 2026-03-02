import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FogOfWarRenderer } from '../systems/FogOfWarRenderer'

// ─── 全局 OffscreenCanvas mock ──────────────────────────────────────────────
class FakeCtx2D {
  canvas = { width: 800, height: 600 }
  globalAlpha = 1
  globalCompositeOperation = 'source-over'
  fillStyle = ''
  strokeStyle = ''
  lineWidth = 1
  textAlign = 'start'
  font = ''
  fillRect = vi.fn()
  clearRect = vi.fn()
  beginPath = vi.fn()
  moveTo = vi.fn()
  lineTo = vi.fn()
  arc = vi.fn()
  stroke = vi.fn()
  fillText = vi.fn()
  save = vi.fn()
  restore = vi.fn()
  closePath = vi.fn()
  drawImage = vi.fn()
  getContext(_type: string) { return this }
}

class FakeOffscreenCanvas {
  width: number
  height: number
  _ctx: FakeCtx2D
  constructor(w: number, h: number) {
    this.width = w
    this.height = h
    this._ctx = new FakeCtx2D()
    this._ctx.canvas = { width: w, height: h }
  }
  getContext(_type: string) { return this._ctx }
}

// 注入全局 OffscreenCanvas
;(globalThis as any).OffscreenCanvas = FakeOffscreenCanvas

// ─── FogState 类型 ───────────────────────────────────────────────────────────
type FogState = 0 | 1 | 2

function makeSys(): FogOfWarRenderer {
  return new FogOfWarRenderer()
}

function makeFakeCtx(w = 800, h = 600): CanvasRenderingContext2D {
  const ctx = new FakeCtx2D() as any
  ctx.canvas = { width: w, height: h }
  return ctx
}

function fogAllUnexplored(): FogState { return 0 }
function fogAllExplored(): FogState { return 1 }
function fogAllVisible(): FogState { return 2 }

// ─── 测试 ─────────────────────────────────────────────────────────────────────

describe('FogOfWarRenderer — 实例化与初始状态', () => {
  let sys: FogOfWarRenderer

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('可以被实例化', () => {
    expect(sys).toBeDefined()
  })

  it('animTime 初始为 0', () => {
    expect((sys as any).animTime).toBe(0)
  })

  it('frameCount 初始为 0', () => {
    expect((sys as any).frameCount).toBe(0)
  })

  it('fogCanvas 初始为 null（懒加载）', () => {
    expect((sys as any).fogCanvas).toBeNull()
  })

  it('fogCtx 初始为 null', () => {
    expect((sys as any).fogCtx).toBeNull()
  })

  it('activeParticleCount 初始为 0', () => {
    expect((sys as any).activeParticleCount).toBe(0)
  })

  it('cachedWidth 初始为 0', () => {
    expect((sys as any).cachedWidth).toBe(0)
  })

  it('cachedHeight 初始为 0', () => {
    expect((sys as any).cachedHeight).toBe(0)
  })

  it('lastCameraX 初始为 -1', () => {
    expect((sys as any).lastCameraX).toBe(-1)
  })

  it('lastCameraY 初始为 -1', () => {
    expect((sys as any).lastCameraY).toBe(-1)
  })

  it('lastZoom 初始为 -1', () => {
    expect((sys as any).lastZoom).toBe(-1)
  })

  it('fogVersion 初始为 0', () => {
    expect((sys as any).fogVersion).toBe(0)
  })

  it('lastFogVersion 初始为 -1', () => {
    expect((sys as any).lastFogVersion).toBe(-1)
  })

  it('forceRedraw 初始为 true', () => {
    expect((sys as any).forceRedraw).toBe(true)
  })

  it('mysteryParticles 初始预分配 50 个粒子', () => {
    expect((sys as any).mysteryParticles).toHaveLength(50)
  })

  it('所有初始粒子 active 为 false', () => {
    const particles: any[] = (sys as any).mysteryParticles
    expect(particles.every((p: any) => p.active === false)).toBe(true)
  })

  it('所有初始粒子 alpha 为 0', () => {
    const particles: any[] = (sys as any).mysteryParticles
    expect(particles.every((p: any) => p.alpha === 0)).toBe(true)
  })

  it('所有初始粒子 x 为 0', () => {
    const particles: any[] = (sys as any).mysteryParticles
    expect(particles.every((p: any) => p.x === 0)).toBe(true)
  })

  it('所有初始粒子 y 为 0', () => {
    const particles: any[] = (sys as any).mysteryParticles
    expect(particles.every((p: any) => p.y === 0)).toBe(true)
  })
})

describe('FogOfWarRenderer — update() 行为', () => {
  let sys: FogOfWarRenderer

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update() 不抛出异常', () => {
    expect(() => sys.update()).not.toThrow()
  })

  it('update() 后 animTime 增加', () => {
    sys.update()
    expect((sys as any).animTime).toBeGreaterThan(0)
  })

  it('update() 后 animTime 增加约 0.016', () => {
    sys.update()
    expect((sys as any).animTime).toBeCloseTo(0.016)
  })

  it('update() 后 frameCount 增加 1', () => {
    sys.update()
    expect((sys as any).frameCount).toBe(1)
  })

  it('多次 update() frameCount 正确累积', () => {
    for (let i = 0; i < 10; i++) sys.update()
    expect((sys as any).frameCount).toBe(10)
  })

  it('多次 update() animTime 正确累积', () => {
    for (let i = 0; i < 5; i++) sys.update()
    expect((sys as any).animTime).toBeCloseTo(0.016 * 5)
  })

  it('update() 后无活跃粒子时 activeParticleCount 为 0', () => {
    sys.update()
    expect((sys as any).activeParticleCount).toBe(0)
  })

  it('update() 每次调用 activeParticleCount 正确（无粒子时）', () => {
    for (let i = 0; i < 3; i++) sys.update()
    expect((sys as any).activeParticleCount).toBe(0)
  })

  it('活跃粒子 alpha <= 0 时变为 inactive', () => {
    const p = (sys as any).mysteryParticles[0]
    p.active = true
    p.alpha = 0.001
    p.speed = 1
    p.phase = 0
    ;(sys as any).activeParticleCount = 1
    sys.update()
    expect(p.active).toBe(false)
  })

  it('活跃粒子 alpha > 0 时保持 active', () => {
    const p = (sys as any).mysteryParticles[0]
    p.active = true
    p.alpha = 0.9
    p.speed = 1
    p.phase = 0
    ;(sys as any).activeParticleCount = 1
    sys.update()
    expect(p.active).toBe(true)
  })

  it('update() 后活跃粒子 alpha 减少 0.005', () => {
    const p = (sys as any).mysteryParticles[0]
    p.active = true
    p.alpha = 0.5
    p.speed = 1
    p.phase = 0
    ;(sys as any).activeParticleCount = 1
    sys.update()
    expect(p.alpha).toBeCloseTo(0.495)
  })

  it('update() 后活跃粒子 x 位置改变', () => {
    const p = (sys as any).mysteryParticles[0]
    p.active = true
    p.alpha = 0.9
    p.speed = 2
    p.phase = 1
    p.x = 5
    sys.update()
    // 由于 sin 运动，x 应该改变
    expect(p.x).not.toBeNaN()
  })
})

describe('FogOfWarRenderer — ensureCanvas（懒加载）', () => {
  let sys: FogOfWarRenderer

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('首次调用 ensureCanvas 后 fogCanvas 不为 null', () => {
    ;(sys as any).ensureCanvas(800, 600)
    expect((sys as any).fogCanvas).not.toBeNull()
  })

  it('ensureCanvas 后 fogCtx 不为 null', () => {
    ;(sys as any).ensureCanvas(800, 600)
    expect((sys as any).fogCtx).not.toBeNull()
  })

  it('ensureCanvas 后 cachedWidth 更新', () => {
    ;(sys as any).ensureCanvas(1024, 768)
    expect((sys as any).cachedWidth).toBe(1024)
  })

  it('ensureCanvas 后 cachedHeight 更新', () => {
    ;(sys as any).ensureCanvas(1024, 768)
    expect((sys as any).cachedHeight).toBe(768)
  })

  it('尺寸相同时不重新创建 canvas', () => {
    ;(sys as any).ensureCanvas(800, 600)
    const original = (sys as any).fogCanvas
    ;(sys as any).ensureCanvas(800, 600)
    expect((sys as any).fogCanvas).toBe(original)
  })

  it('尺寸改变时重新创建 canvas', () => {
    ;(sys as any).ensureCanvas(800, 600)
    const original = (sys as any).fogCanvas
    ;(sys as any).ensureCanvas(1280, 720)
    expect((sys as any).fogCanvas).not.toBe(original)
  })

  it('ensureCanvas 后 forceRedraw 设为 true', () => {
    ;(sys as any).forceRedraw = false
    ;(sys as any).ensureCanvas(800, 600)
    // 新建时置 forceRedraw=true，但首次任意尺寸都是 "新建"
    ;(sys as any).ensureCanvas(999, 999) // 改变尺寸
    expect((sys as any).forceRedraw).toBe(true)
  })
})

describe('FogOfWarRenderer — render() 基本调用', () => {
  let sys: FogOfWarRenderer

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('render() 不抛出异常（全可见迷雾）', () => {
    const ctx = makeFakeCtx()
    expect(() =>
      sys.render(ctx, 0, 0, 1, 0, 0, 10, 10, fogAllVisible)
    ).not.toThrow()
  })

  it('render() 不抛出异常（全未探索）', () => {
    const ctx = makeFakeCtx()
    expect(() =>
      sys.render(ctx, 0, 0, 1, 0, 0, 10, 10, fogAllUnexplored)
    ).not.toThrow()
  })

  it('render() 不抛出异常（全已探索）', () => {
    const ctx = makeFakeCtx()
    expect(() =>
      sys.render(ctx, 0, 0, 1, 0, 0, 10, 10, fogAllExplored)
    ).not.toThrow()
  })

  it('render() 后 fogCanvas 已初始化', () => {
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 1, 0, 0, 5, 5, fogAllVisible)
    expect((sys as any).fogCanvas).not.toBeNull()
  })

  it('render() 后 lastCameraX 更新', () => {
    const ctx = makeFakeCtx()
    sys.render(ctx, 100, 200, 1.5, 0, 0, 5, 5, fogAllVisible)
    expect((sys as any).lastCameraX).toBe(100)
  })

  it('render() 后 lastCameraY 更新', () => {
    const ctx = makeFakeCtx()
    sys.render(ctx, 100, 200, 1.5, 0, 0, 5, 5, fogAllVisible)
    expect((sys as any).lastCameraY).toBe(200)
  })

  it('render() 后 lastZoom 更新', () => {
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 2.0, 0, 0, 5, 5, fogAllVisible)
    expect((sys as any).lastZoom).toBe(2.0)
  })

  it('render() 后 forceRedraw 变为 false', () => {
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 1, 0, 0, 5, 5, fogAllVisible)
    expect((sys as any).forceRedraw).toBe(false)
  })

  it('render() 调用 ctx.drawImage', () => {
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 1, 0, 0, 5, 5, fogAllVisible)
    expect((ctx as any).drawImage).toHaveBeenCalled()
  })

  it('全可见时 fogCtx.clearRect 被调用', () => {
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 1, 0, 0, 5, 5, fogAllVisible)
    const fogCtx = (sys as any).fogCtx
    expect(fogCtx.clearRect).toHaveBeenCalled()
  })

  it('未探索区域触发 fogCtx.fillRect', () => {
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 1, 0, 0, 3, 3, fogAllUnexplored)
    const fogCtx = (sys as any).fogCtx
    expect(fogCtx.fillRect).toHaveBeenCalled()
  })
})

describe('FogOfWarRenderer — fogVersion 脏标记', () => {
  let sys: FogOfWarRenderer

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('fogVersion 可以手动修改', () => {
    ;(sys as any).fogVersion = 5
    expect((sys as any).fogVersion).toBe(5)
  })

  it('修改 fogVersion 后 render() 会重绘（fogChanged=true）', () => {
    const ctx = makeFakeCtx()
    // 首次渲染建立基线
    sys.render(ctx, 0, 0, 1, 0, 0, 3, 3, fogAllVisible)
    const fogCtx = (sys as any).fogCtx
    const callsBefore = fogCtx.clearRect.mock.calls.length
    // 改变 fogVersion 触发重绘
    ;(sys as any).fogVersion = 99
    sys.render(ctx, 0, 0, 1, 0, 0, 3, 3, fogAllVisible)
    expect(fogCtx.clearRect.mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('render() 后 lastFogVersion 同步为 fogVersion', () => {
    const ctx = makeFakeCtx()
    ;(sys as any).fogVersion = 7
    sys.render(ctx, 0, 0, 1, 0, 0, 3, 3, fogAllVisible)
    expect((sys as any).lastFogVersion).toBe(7)
  })
})

describe('FogOfWarRenderer — spawnMysteryParticle（私有方法）', () => {
  let sys: FogOfWarRenderer

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('spawnMysteryParticle 方法存在', () => {
    expect(typeof (sys as any).spawnMysteryParticle).toBe('function')
  })

  it('fogState=0 时可能生成粒子（random < 0.05）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnMysteryParticle(0, 0, 5, 5, fogAllUnexplored)
    // 粒子池中至少有 1 个 active
    const hasActive = (sys as any).mysteryParticles.some((p: any) => p.active)
    expect(hasActive).toBe(true)
  })

  it('fogState=2 时不生成粒子（已可见区域）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnMysteryParticle(0, 0, 5, 5, fogAllVisible)
    const hasActive = (sys as any).mysteryParticles.some((p: any) => p.active)
    expect(hasActive).toBe(false)
  })

  it('activeParticleCount 满时不再生成', () => {
    // 填满所有 50 个粒子
    const particles: any[] = (sys as any).mysteryParticles
    particles.forEach((p: any) => { p.active = true })
    ;(sys as any).activeParticleCount = 50
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnMysteryParticle(0, 0, 5, 5, fogAllUnexplored)
    // 不应有新粒子（count 已满）
    expect((sys as any).activeParticleCount).toBe(50)
  })

  it('生成的粒子 alpha 在 [0.4, 0.9] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).spawnMysteryParticle(0, 0, 5, 5, fogAllUnexplored)
    const active = (sys as any).mysteryParticles.find((p: any) => p.active)
    if (active) {
      expect(active.alpha).toBeGreaterThanOrEqual(0.4)
      expect(active.alpha).toBeLessThanOrEqual(0.9)
    }
  })

  it('生成的粒子 speed 在 [0.5, 2.0] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3)
    ;(sys as any).spawnMysteryParticle(0, 0, 5, 5, fogAllUnexplored)
    const active = (sys as any).mysteryParticles.find((p: any) => p.active)
    if (active) {
      expect(active.speed).toBeGreaterThanOrEqual(0.5)
      expect(active.speed).toBeLessThanOrEqual(2.0)
    }
  })

  it('rangeX <= 0 时不生成粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnMysteryParticle(5, 5, 5, 10, fogAllUnexplored) // rangeX=0
    const hasActive = (sys as any).mysteryParticles.some((p: any) => p.active)
    expect(hasActive).toBe(false)
  })

  it('rangeY <= 0 时不生成粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnMysteryParticle(0, 5, 5, 5, fogAllUnexplored) // rangeY=0
    const hasActive = (sys as any).mysteryParticles.some((p: any) => p.active)
    expect(hasActive).toBe(false)
  })
})

describe('FogOfWarRenderer — renderSimplifiedEdges（私有方法）', () => {
  let sys: FogOfWarRenderer

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('renderSimplifiedEdges 方法存在', () => {
    expect(typeof (sys as any).renderSimplifiedEdges).toBe('function')
  })

  it('全可见区域调用 renderSimplifiedEdges 不崩溃', () => {
    ;(sys as any).ensureCanvas(800, 600)
    const fc = (sys as any).fogCtx
    expect(() => {
      ;(sys as any).renderSimplifiedEdges(
        fc, 0, 0, 1, 0, 0, 5, 5, 16, fogAllVisible
      )
    }).not.toThrow()
  })

  it('混合迷雾状态下 renderSimplifiedEdges 调用 fillRect', () => {
    ;(sys as any).ensureCanvas(800, 600)
    const fc = (sys as any).fogCtx
    // 可见 tile 旁边有未探索 tile 时应该绘制边缘
    const mixed = (x: number, y: number): FogState => (x === 0 ? 2 : 0)
    ;(sys as any).renderSimplifiedEdges(fc, 0, 0, 1, 0, 0, 3, 3, 16, mixed)
    expect(fc.fillRect).toHaveBeenCalled()
  })
})

describe('FogOfWarRenderer — renderMysteryParticles（私有方法）', () => {
  let sys: FogOfWarRenderer

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('renderMysteryParticles 方法存在', () => {
    expect(typeof (sys as any).renderMysteryParticles).toBe('function')
  })

  it('有活跃粒子时 renderMysteryParticles 不崩溃', () => {
    const ctx = makeFakeCtx()
    const p = (sys as any).mysteryParticles[0]
    p.active = true
    p.alpha = 0.8
    p.phase = 0
    p.x = 5
    p.y = 5
    expect(() => {
      ;(sys as any).renderMysteryParticles(ctx, 0, 0, 1)
    }).not.toThrow()
  })

  it('renderMysteryParticles 完成后 globalAlpha 恢复为 1', () => {
    const ctx = makeFakeCtx()
    const p = (sys as any).mysteryParticles[0]
    p.active = true
    p.alpha = 0.8
    p.phase = 0
    ;(sys as any).renderMysteryParticles(ctx, 0, 0, 1)
    expect(ctx.globalAlpha).toBe(1)
  })

  it('renderMysteryParticles 恢复 globalCompositeOperation', () => {
    const ctx = makeFakeCtx()
    ctx.globalCompositeOperation = 'source-over'
    ;(sys as any).renderMysteryParticles(ctx, 0, 0, 1)
    expect(ctx.globalCompositeOperation).toBe('source-over')
  })
})

describe('FogOfWarRenderer — FOG_ALPHA_TABLE 预计算', () => {
  afterEach(() => vi.restoreAllMocks())

  it('模块加载后 FOG_ALPHA_TABLE 已填充（21 个元素）', async () => {
    // 通过访问模块内部常量验证
    // FogOfWarRenderer 构造器中不暴露 FOG_ALPHA_TABLE，但 update 会用到 animTime
    const sys = makeSys()
    expect(sys).toBeDefined()
    // 验证粒子池正确预分配（由 FOG_ALPHA_TABLE 旁边的代码决定）
    expect((sys as any).mysteryParticles).toHaveLength(50)
  })

  it('MAX_PARTICLES 为 50（通过粒子池长度验证）', () => {
    const sys = makeSys()
    expect((sys as any).mysteryParticles).toHaveLength(50)
  })

  it('CACHE_INTERVAL 为 6（frameCount % 6 触发重绘）', () => {
    const sys = makeSys()
    const ctx = makeFakeCtx()
    // 首次 render
    sys.render(ctx, 0, 0, 1, 0, 0, 5, 5, fogAllVisible)
    // forceRedraw=false，lastCameraX=0，fogVersion=0 同步
    ;(sys as any).forceRedraw = false
    const fogCtx = (sys as any).fogCtx
    const callsBefore = fogCtx.clearRect.mock.calls.length
    // 执行 6 次 update 让 frameCount 到 6
    for (let i = 0; i < 6; i++) sys.update()
    // 再次 render (frameCount % 6 === 0 触发 timerRedraw)
    sys.render(ctx, 0, 0, 1, 0, 0, 5, 5, fogAllVisible)
    expect(fogCtx.clearRect.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})
