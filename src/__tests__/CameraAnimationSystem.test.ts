import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CameraAnimationSystem } from '../systems/CameraAnimationSystem'

function makeSys() { return new CameraAnimationSystem() }

// ─────────────────────────────────────────────────────────────────────────────
// 辅助：创建最小化 Canvas 2D 上下文 mock
// ─────────────────────────────────────────────────────────────────────────────
function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    globalAlpha: 1,
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D
}

// ─────────────────────────────────────────────────────────────────────────────
// 初始状态
// ─────────────────────────────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CameraAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('_following 初始为 false', () => {
    expect((sys as any)._following).toBe(false)
  })

  it('_shakes 初始为空数组', () => {
    expect((sys as any)._shakes).toHaveLength(0)
  })

  it('_fadeAlpha 初始为 0', () => {
    expect((sys as any)._fadeAlpha).toBe(0)
  })

  it('_barsEnabled 初始为 false', () => {
    expect((sys as any)._barsEnabled).toBe(false)
  })

  it('_barsProgress 初始为 0', () => {
    expect((sys as any)._barsProgress).toBe(0)
  })

  it('_followSpeed 初始为 0.05', () => {
    expect((sys as any)._followSpeed).toBeCloseTo(0.05)
  })

  it('_shakeTick 初始为 0', () => {
    expect((sys as any)._shakeTick).toBe(0)
  })

  it('_result 初始 x/y/zoom 为 0/0/1', () => {
    const r = (sys as any)._result
    expect(r.x).toBe(0)
    expect(r.y).toBe(0)
    expect(r.zoom).toBe(1)
  })

  it('isTransitioning() 初始返回 false', () => {
    expect(sys.isTransitioning()).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// followTarget / stopFollow
// ─────────────────────────────────────────────────────────────────────────────
describe('followTarget / stopFollow', () => {
  let sys: CameraAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('followTarget 设置 _following 为 true', () => {
    sys.followTarget(10, 20)
    expect((sys as any)._following).toBe(true)
  })

  it('followTarget 存储目标坐标 _followX', () => {
    sys.followTarget(42, 99)
    expect((sys as any)._followX).toBe(42)
  })

  it('followTarget 存储目标坐标 _followY', () => {
    sys.followTarget(42, 99)
    expect((sys as any)._followY).toBe(99)
  })

  it('stopFollow 设置 _following 为 false', () => {
    sys.followTarget(10, 20)
    sys.stopFollow()
    expect((sys as any)._following).toBe(false)
  })

  it('未 followTarget 直接 stopFollow 不报错', () => {
    expect(() => sys.stopFollow()).not.toThrow()
  })

  it('followTarget 可多次更新目标', () => {
    sys.followTarget(10, 10)
    sys.followTarget(200, 300)
    expect((sys as any)._followX).toBe(200)
    expect((sys as any)._followY).toBe(300)
  })

  it('follow 模式下 update 逐步移动摄像机向目标', () => {
    sys.followTarget(100, 100)
    const r = sys.update(0, 0, 0, 1)
    // 应向 100 靠近，不应仍为 0
    expect(r.x).toBeGreaterThan(0)
    expect(r.y).toBeGreaterThan(0)
  })

  it('follow 模式下 update 不会直接跳到目标', () => {
    sys.followTarget(100, 100)
    const r = sys.update(0, 0, 0, 1)
    expect(r.x).toBeLessThan(100)
    expect(r.y).toBeLessThan(100)
  })

  it('stopFollow 后 update 摄像机位置不再改变', () => {
    sys.followTarget(100, 100)
    sys.stopFollow()
    const r = sys.update(0, 50, 50, 1)
    // 无跟随修正，位置保持（抖动可能导致微小偏移，但不会朝 followTarget 移动）
    expect(r.x).toBeCloseTo(50, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// shake
// ─────────────────────────────────────────────────────────────────────────────
describe('shake', () => {
  let sys: CameraAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('shake 添加条目到 _shakes', () => {
    sys.shake(5, 30)
    expect((sys as any)._shakes.length).toBeGreaterThan(0)
  })

  it('shake 存储正确的 intensity', () => {
    sys.shake(5, 30)
    expect((sys as any)._shakes[0].intensity).toBe(5)
  })

  it('shake 存储正确的 remaining', () => {
    sys.shake(5, 30)
    expect((sys as any)._shakes[0].remaining).toBe(30)
  })

  it('shake 存储正确的 total', () => {
    sys.shake(5, 30)
    expect((sys as any)._shakes[0].total).toBe(30)
  })

  it('shake durationTicks <= 0 不添加', () => {
    sys.shake(5, 0)
    expect((sys as any)._shakes).toHaveLength(0)
  })

  it('shake intensity <= 0 不添加', () => {
    sys.shake(0, 30)
    expect((sys as any)._shakes).toHaveLength(0)
  })

  it('多次 shake 可叠加', () => {
    sys.shake(3, 10)
    sys.shake(7, 20)
    expect((sys as any)._shakes).toHaveLength(2)
  })

  it('shake 后 update 导致摄像机位置出现偏移', () => {
    sys.shake(100, 50)
    const r = sys.update(0, 0, 0, 1)
    const offset = Math.abs(r.x) + Math.abs(r.y)
    expect(offset).toBeGreaterThan(0)
  })

  it('shake 完成后 _shakes 清空', () => {
    sys.shake(5, 1)
    sys.update(0, 0, 0, 1) // 消耗唯一一帧
    expect((sys as any)._shakes).toHaveLength(0)
  })

  it('_shakeTick 每次 update 递增', () => {
    sys.update(0, 0, 0, 1)
    expect((sys as any)._shakeTick).toBe(1)
    sys.update(1, 0, 0, 1)
    expect((sys as any)._shakeTick).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// update 基础返回
// ─────────────────────────────────────────────────────────────────────────────
describe('update 基础', () => {
  let sys: CameraAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('无操作时 update 返回传入的 camX', () => {
    const r = sys.update(0, 50, 30, 2)
    expect(r.x).toBeCloseTo(50, 5)
  })

  it('无操作时 update 返回传入的 camY', () => {
    const r = sys.update(0, 50, 30, 2)
    expect(r.y).toBeCloseTo(30, 5)
  })

  it('无操作时 update 返回传入的 camZoom', () => {
    const r = sys.update(0, 50, 30, 2)
    expect(r.zoom).toBeCloseTo(2, 5)
  })

  it('update 始终返回同一个 _result 对象引用', () => {
    const r1 = sys.update(0, 0, 0, 1)
    const r2 = sys.update(1, 0, 0, 1)
    expect(r1).toBe(r2)
  })

  it('update 连续调用后 _result 反映最新值', () => {
    sys.update(0, 10, 10, 1)
    const r = sys.update(1, 99, 88, 3)
    expect(r.x).toBeCloseTo(99, 5)
    expect(r.y).toBeCloseTo(88, 5)
    expect(r.zoom).toBeCloseTo(3, 5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// isTransitioning
// ─────────────────────────────────────────────────────────────────────────────
describe('isTransitioning', () => {
  let sys: CameraAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('默认不在过渡���', () => {
    expect(sys.isTransitioning()).toBe(false)
  })

  it('手动设置 transition.kind 非 None 后返回 true', () => {
    // TransitionKind.FadeToBlack = 1
    ;(sys as any)._transition.kind = 1
    ;(sys as any)._transition.duration = 100
    expect(sys.isTransitioning()).toBe(true)
  })

  it('过渡完成后 isTransitioning 返回 false', () => {
    ;(sys as any)._transition.kind = 1 // FadeToBlack
    ;(sys as any)._transition.duration = 1
    sys.update(0, 0, 0, 1) // 完成过渡
    expect(sys.isTransitioning()).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// cinematic bars
// ─────────────────────────────────────────────────────────────────────────────
describe('cinematic bars', () => {
  let sys: CameraAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('_barsEnabled=false 时 _barsProgress 趋近 0', () => {
    ;(sys as any)._barsProgress = 0
    sys.update(0, 0, 0, 1)
    expect((sys as any)._barsProgress).toBeCloseTo(0, 5)
  })

  it('_barsEnabled=true 时 _barsProgress 增大', () => {
    ;(sys as any)._barsEnabled = true
    sys.update(0, 0, 0, 1)
    expect((sys as any)._barsProgress).toBeGreaterThan(0)
  })

  it('_barsEnabled=true 多次 update 后 _barsProgress 最终接近 1', () => {
    ;(sys as any)._barsEnabled = true
    for (let i = 0; i < 200; i++) sys.update(i, 0, 0, 1)
    expect((sys as any)._barsProgress).toBeCloseTo(1, 2)
  })

  it('bars 高度 _barsHeight 默认为 0.12', () => {
    expect((sys as any)._barsHeight).toBeCloseTo(0.12)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// render overlays
// ─────────────────────────────────────────────────────────────────────────────
describe('render', () => {
  let sys: CameraAnimationSystem
  let ctx: CanvasRenderingContext2D
  beforeEach(() => {
    sys = makeSys()
    ctx = makeCtx()
  })

  it('fadeAlpha=0 时不调用 fillRect', () => {
    sys.render(ctx, 800, 600)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('fadeAlpha>0.001 时调用 fillRect', () => {
    ;(sys as any)._fadeAlpha = 0.5
    sys.render(ctx, 800, 600)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('fadeAlpha>0.001 时调用 save/restore', () => {
    ;(sys as any)._fadeAlpha = 0.5
    sys.render(ctx, 800, 600)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('barsProgress>0.001 时绘制上下两个 bar', () => {
    ;(sys as any)._barsProgress = 0.5
    sys.render(ctx, 800, 600)
    // fillRect 至少被调用两次（上+下 bars）
    expect(ctx.fillRect).toHaveBeenCalledTimes(2)
  })

  it('barsProgress=0 且 fadeAlpha=0 时 fillRect 完全不调用', () => {
    sys.render(ctx, 1920, 1080)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('fadeAlpha=1 时覆盖全屏（fillRect 参数含 screenWidth）', () => {
    ;(sys as any)._fadeAlpha = 1
    sys.render(ctx, 1280, 720)
    const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls
    // 第一个调用应包含 width=1280, height=720
    expect(calls[0][2]).toBe(1280)
    expect(calls[0][3]).toBe(720)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 辅助纯函数验证（easeInOutCubic / clamp01 行为反映在输出上）
// ─────────────────────────────────────────────────────────────────────────────
describe('过渡平滑性（easeInOutCubic 行为验证）', () => {
  let sys: CameraAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('FadeToBlack 过渡中途 fadeAlpha 介于 0 和 1 之间', () => {
    ;(sys as any)._transition.kind = 1 // FadeToBlack
    ;(sys as any)._transition.duration = 10
    sys.update(0, 0, 0, 1) // elapsed=1
    const alpha = (sys as any)._fadeAlpha
    expect(alpha).toBeGreaterThan(0)
    expect(alpha).toBeLessThan(1)
  })

  it('FadeToBlack 完成后 fadeAlpha 接近 1', () => {
    ;(sys as any)._transition.kind = 1 // FadeToBlack
    ;(sys as any)._transition.duration = 1
    sys.update(0, 0, 0, 1)
    expect((sys as any)._fadeAlpha).toBeCloseTo(1, 3)
  })

  it('FadeFromBlack 完成后 fadeAlpha 接近 0', () => {
    ;(sys as any)._fadeAlpha = 1
    ;(sys as any)._transition.kind = 2 // FadeFromBlack
    ;(sys as any)._transition.duration = 1
    sys.update(0, 0, 0, 1)
    expect((sys as any)._fadeAlpha).toBeCloseTo(0, 3)
  })

  it('PanTo 过渡完成后 result.x 接近 endX', () => {
    ;(sys as any)._transition.kind = 3 // PanTo
    ;(sys as any)._transition.duration = 1
    ;(sys as any)._transition.endX = 200
    ;(sys as any)._transition.endY = 300
    ;(sys as any)._transition.endZoom = 2
    const r = sys.update(0, 0, 0, 1)
    expect(r.x).toBeCloseTo(200, 3)
    expect(r.y).toBeCloseTo(300, 3)
  })

  it('ZoomTo 过渡完成后 result.zoom 接近 endZoom', () => {
    ;(sys as any)._transition.kind = 4 // ZoomTo
    ;(sys as any)._transition.duration = 1
    ;(sys as any)._transition.endZoom = 3
    const r = sys.update(0, 0, 0, 1)
    expect(r.zoom).toBeCloseTo(3, 3)
  })

  it('shake 负 durationTicks 不添加条目', () => {
    sys.shake(5, -10)
    expect((sys as any)._shakes).toHaveLength(0)
  })

  it('shake 负 intensity 不添加条目', () => {
    sys.shake(-5, 10)
    expect((sys as any)._shakes).toHaveLength(0)
  })

  it('shake 零 intensity 不添加', () => {
    sys.shake(0, 10)
    expect((sys as any)._shakes).toHaveLength(0)
  })
})
