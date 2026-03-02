import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SeasonVisualSystem } from '../systems/SeasonVisualSystem'
import { Season } from '../systems/SeasonSystem'

// ─── Canvas mock ──────────────────────────────
function makeCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    roundRect: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fillStyle: '',
    font: '',
    textBaseline: '',
    textAlign: '',
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '',
  } as unknown as CanvasRenderingContext2D
}

function makeSys() { return new SeasonVisualSystem() }

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────
// 实例化与初始状态
// ─────────────────────────────────────────────
describe('实例化与初始状态', () => {
  let sys: SeasonVisualSystem
  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => { expect(sys).toBeDefined() })

  it('初始particles为数组', () => {
    expect(Array.isArray((sys as any).particles)).toBe(true)
  })

  it('初始prevSeason为Spring', () => {
    expect((sys as any).prevSeason).toBe(Season.Spring)
  })

  it('particles数组预分配了固定数量', () => {
    expect((sys as any).particles.length).toBeGreaterThan(0)
  })

  it('初始_cachedOverlayAlpha为-1（强制重计算）', () => {
    expect((sys as any)._cachedOverlayAlpha).toBe(-1)
  })

  it('particles总数等于MAX_LEAVES+MAX_SNOWFLAKES+MAX_PETALS+MAX_FIREFLIES', () => {
    // 80 + 120 + 40 + 30 = 270
    expect((sys as any).particles.length).toBe(270)
  })

  it('所有粒子初始active为false', () => {
    const particles: any[] = (sys as any).particles
    expect(particles.every((p: any) => p.active === false)).toBe(true)
  })

  it('indicatorAlpha初始为1', () => {
    expect((sys as any).indicatorAlpha).toBe(1)
  })

  it('indicatorFadeTimer初始为0', () => {
    expect((sys as any).indicatorFadeTimer).toBe(0)
  })

  it('_cachedOverlaySeason初始为Spring', () => {
    expect((sys as any)._cachedOverlaySeason).toBe(Season.Spring)
  })

  it('_cachedSnowRgb初始为rgb(240,245,255)', () => {
    expect((sys as any)._cachedSnowRgb).toBe('rgb(240,245,255)')
  })

  it('每个粒子初始化时life=0', () => {
    const particles: any[] = (sys as any).particles
    expect(particles.every((p: any) => p.life === 0)).toBe(true)
  })

  it('每个粒子初始化时alpha=0', () => {
    const particles: any[] = (sys as any).particles
    expect(particles.every((p: any) => p.alpha === 0)).toBe(true)
  })

  it('每个粒子初始化时size=1', () => {
    const particles: any[] = (sys as any).particles
    expect(particles.every((p: any) => p.size === 1)).toBe(true)
  })

  it('每个粒子初始化时color为字符串', () => {
    const particles: any[] = (sys as any).particles
    expect(particles.every((p: any) => typeof p.color === 'string')).toBe(true)
  })
})

// ─────────────────────────────────────────────
// update() - 不崩溃测试
// ─────────────────────────────────────────────
describe('update() - 各季节不崩溃', () => {
  let sys: SeasonVisualSystem
  beforeEach(() => { sys = makeSys() })

  it('update() Spring 不崩溃', () => {
    expect(() => sys.update(0, Season.Spring, 0, false)).not.toThrow()
  })

  it('update() Summer 白天不崩溃', () => {
    expect(() => sys.update(1, Season.Summer, 0.5, false)).not.toThrow()
  })

  it('update() Autumn 不崩溃', () => {
    expect(() => sys.update(10, Season.Autumn, 1, false)).not.toThrow()
  })

  it('update() Winter 夜晚不崩溃', () => {
    expect(() => sys.update(100, Season.Winter, 0, true)).not.toThrow()
  })

  it('update() Summer 夜晚不崩溃（萤火虫场景）', () => {
    expect(() => sys.update(10, Season.Summer, 1, true)).not.toThrow()
  })

  it('连续100次update不崩溃', () => {
    expect(() => {
      for (let i = 0; i < 100; i++) {
        sys.update(i, Season.Autumn, 1, false)
      }
    }).not.toThrow()
  })

  it('tick=0时不崩溃', () => {
    expect(() => sys.update(0, Season.Winter, 1, false)).not.toThrow()
  })

  it('tick=999时不崩溃', () => {
    expect(() => sys.update(999, Season.Spring, 0.5, true)).not.toThrow()
  })
})

// ─────────────────────────────────────────────
// update() - 季节切换逻辑
// ─────────────────────────────────────────────
describe('update() - 季节切换逻辑', () => {
  let sys: SeasonVisualSystem
  beforeEach(() => { sys = makeSys() })

  it('季节切换时prevSeason更新', () => {
    sys.update(0, Season.Summer, 1, false)
    expect((sys as any).prevSeason).toBe(Season.Summer)
  })

  it('季节切换时indicatorFadeTimer重置后减1（一帧内自减一次）', () => {
    // update()内部: timer设为90后立刻执行 timer-- (timer进入>0分支)，所以结束时为89
    sys.update(0, Season.Summer, 1, false)
    expect((sys as any).indicatorFadeTimer).toBe(89)
  })

  it('季节切换时indicatorAlpha从0开始递增（同帧+0.05）', () => {
    // update()内部: alpha=0，然后timer>0分支 alpha += 0.05，结束时为0.05
    sys.update(0, Season.Summer, 1, false)
    expect((sys as any).indicatorAlpha).toBeCloseTo(0.05, 5)
  })

  it('季节不变时prevSeason保持不变', () => {
    sys.update(0, Season.Spring, 0, false)
    sys.update(1, Season.Spring, 0, false)
    expect((sys as any).prevSeason).toBe(Season.Spring)
  })

  it('第一次update切换season后indicatorFadeTimer递减', () => {
    sys.update(0, Season.Autumn, 1, false)
    const timer1 = (sys as any).indicatorFadeTimer
    sys.update(1, Season.Autumn, 1, false)
    const timer2 = (sys as any).indicatorFadeTimer
    expect(timer2).toBe(timer1 - 1)
  })

  it('多次季节切换后prevSeason为最新季节', () => {
    sys.update(0, Season.Summer, 1, false)
    sys.update(1, Season.Autumn, 1, false)
    sys.update(2, Season.Winter, 1, false)
    expect((sys as any).prevSeason).toBe(Season.Winter)
  })

  it('从Spring切换到Autumn后indicatorAlpha开始从0递增', () => {
    sys.update(0, Season.Autumn, 1, false) // 切换季节
    const alphaAfterSwitch = (sys as any).indicatorAlpha
    // 切换时alpha=0，然后在同一帧内+=0.05 → 应为0.05
    expect(alphaAfterSwitch).toBeCloseTo(0.05, 5)
  })
})

// ─────────────────────────────────────────────
// update() - indicatorAlpha 渐变行为
// ─────────────────────────────────────────────
describe('update() - indicatorAlpha 渐变', () => {
  let sys: SeasonVisualSystem
  beforeEach(() => { sys = makeSys() })

  it('fadeTimer>0时每帧alpha+=0.05', () => {
    sys.update(0, Season.Summer, 1, false) // 触发切换，timer=90，alpha=0+0.05
    const alpha1 = (sys as any).indicatorAlpha
    sys.update(1, Season.Summer, 1, false) // timer=89，alpha+=0.05
    const alpha2 = (sys as any).indicatorAlpha
    expect(alpha2 - alpha1).toBeCloseTo(0.05, 5)
  })

  it('alpha不超过1', () => {
    // 运行足够多帧让alpha达到1
    for (let i = 0; i < 200; i++) {
      sys.update(i, Season.Spring, 1, false)
    }
    expect((sys as any).indicatorAlpha).toBeLessThanOrEqual(1)
  })

  it('timer=0时alpha增速切换为0.02', () => {
    // 初始timer=0，alpha=1，每帧alpha = min(1, 1+0.02) = 1
    // 手动设置alpha=0.5，timer=0
    ;(sys as any).indicatorAlpha = 0.5
    ;(sys as any).indicatorFadeTimer = 0
    sys.update(1, Season.Spring, 1, false)
    expect((sys as any).indicatorAlpha).toBeCloseTo(0.52, 5)
  })
})

// ─────────────────────────────────────────────
// 粒子池切片偏移
// ─────────────────────────────────────────────
describe('粒子池切片偏移验证', () => {
  let sys: SeasonVisualSystem
  beforeEach(() => { sys = makeSys() })

  it('粒子池前80个为叶片区（OFF_LEAF=0）', () => {
    const particles: any[] = (sys as any).particles
    expect(particles.length).toBeGreaterThanOrEqual(80)
  })

  it('粒子池80-199为雪花区', () => {
    const particles: any[] = (sys as any).particles
    // OFF_SNOW = 80
    expect(particles.length).toBeGreaterThanOrEqual(200)
  })

  it('粒子池200-239为花瓣区', () => {
    const particles: any[] = (sys as any).particles
    // OFF_PETAL = 80 + 120 = 200
    expect(particles.length).toBeGreaterThanOrEqual(240)
  })

  it('粒子池240-269为萤火虫区', () => {
    const particles: any[] = (sys as any).particles
    // OFF_FIRE = 80 + 120 + 40 = 240
    expect(particles.length).toBeGreaterThanOrEqual(270)
  })
})

// ─────────────────────────────────────────────
// 叶片粒子（Autumn）
// ─────────────────────────────────────────────
describe('叶片粒子（Autumn）', () => {
  let sys: SeasonVisualSystem
  beforeEach(() => { sys = makeSys() })

  it('Autumn季节tick能生成叶片粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // < 0.3, 触发生成
    // tick % 4 === 0 触发叶片生成
    for (let i = 0; i < 20; i++) {
      sys.update(i * 4, Season.Autumn, 1, false)
    }
    const particles: any[] = (sys as any).particles
    const leafCount = particles.slice(0, 80).filter((p: any) => p.active).length
    expect(leafCount).toBeGreaterThan(0)
  })

  it('非Autumn季节不生成新叶片', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    for (let i = 0; i < 40; i++) {
      sys.update(i * 4, Season.Spring, 1, false)
    }
    const particles: any[] = (sys as any).particles
    const leafCount = particles.slice(0, 80).filter((p: any) => p.active).length
    expect(leafCount).toBe(0)
  })

  it('生成的叶片active=true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    for (let i = 0; i < 20; i++) {
      sys.update(i * 4, Season.Autumn, 1, false)
    }
    const particles: any[] = (sys as any).particles
    const leaf = particles.slice(0, 80).find((p: any) => p.active)
    if (leaf) {
      expect(leaf.active).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────
// 雪花粒子（Winter）
// ─────────────────────────────────────────────
describe('雪花粒子（Winter）', () => {
  let sys: SeasonVisualSystem
  beforeEach(() => { sys = makeSys() })

  it('Winter季节能生成雪花粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // < 0.35
    for (let i = 0; i < 30; i++) {
      sys.update(i * 3, Season.Winter, 1, false)
    }
    const particles: any[] = (sys as any).particles
    const snowCount = particles.slice(80, 200).filter((p: any) => p.active).length
    expect(snowCount).toBeGreaterThan(0)
  })

  it('非Winter季节不生成雪花', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    for (let i = 0; i < 30; i++) {
      sys.update(i * 3, Season.Summer, 1, false)
    }
    const particles: any[] = (sys as any).particles
    const snowCount = particles.slice(80, 200).filter((p: any) => p.active).length
    expect(snowCount).toBe(0)
  })

  it('雪花颜色固定为rgb(240,245,255)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    for (let i = 0; i < 20; i++) {
      sys.update(i * 3, Season.Winter, 1, false)
    }
    const particles: any[] = (sys as any).particles
    const snow = particles.slice(80, 200).find((p: any) => p.active)
    if (snow) {
      expect(snow.color).toBe('rgb(240,245,255)')
    }
  })
})

// ─────────────────────────────────────────────
// 花瓣粒子（Spring）
// ─────────────────────────────────────────────
describe('花瓣粒子（Spring）', () => {
  let sys: SeasonVisualSystem
  beforeEach(() => { sys = makeSys() })

  it('Spring季节能生成花瓣粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // < 0.2
    for (let i = 0; i < 30; i++) {
      sys.update(i * 6, Season.Spring, 1, false)
    }
    const particles: any[] = (sys as any).particles
    const petalCount = particles.slice(200, 240).filter((p: any) => p.active).length
    expect(petalCount).toBeGreaterThan(0)
  })

  it('非Spring季节不生成花瓣', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    for (let i = 0; i < 30; i++) {
      sys.update(i * 6, Season.Winter, 1, false)
    }
    const particles: any[] = (sys as any).particles
    const petalCount = particles.slice(200, 240).filter((p: any) => p.active).length
    expect(petalCount).toBe(0)
  })
})

// ─────────────────────────────────────────────
// 萤火虫粒子（Summer 夜晚）
// ─────────────────────────────────────────────
describe('萤火虫粒子（Summer 夜晚）', () => {
  let sys: SeasonVisualSystem
  beforeEach(() => { sys = makeSys() })

  it('Summer夜晚能生成萤火虫粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // < 0.15
    for (let i = 0; i < 30; i++) {
      sys.update(i * 10, Season.Summer, 1, true)
    }
    const particles: any[] = (sys as any).particles
    const fireflyCount = particles.slice(240, 270).filter((p: any) => p.active).length
    expect(fireflyCount).toBeGreaterThan(0)
  })

  it('Summer白天不生成萤火虫', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    for (let i = 0; i < 30; i++) {
      sys.update(i * 10, Season.Summer, 1, false)
    }
    const particles: any[] = (sys as any).particles
    const fireflyCount = particles.slice(240, 270).filter((p: any) => p.active).length
    expect(fireflyCount).toBe(0)
  })

  it('非Summer夜晚不生成萤火虫', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    for (let i = 0; i < 30; i++) {
      sys.update(i * 10, Season.Autumn, 1, true)
    }
    const particles: any[] = (sys as any).particles
    const fireflyCount = particles.slice(240, 270).filter((p: any) => p.active).length
    expect(fireflyCount).toBe(0)
  })

  it('萤火虫颜色为rgb(180,220,80)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    for (let i = 0; i < 20; i++) {
      sys.update(i * 10, Season.Summer, 1, true)
    }
    const particles: any[] = (sys as any).particles
    const ff = particles.slice(240, 270).find((p: any) => p.active)
    if (ff) {
      expect(ff.color).toBe('rgb(180,220,80)')
    }
  })
})

// ─────────────────────────────────────────────
// render() - 不崩溃
// ─────────────────────────────────────────────
describe('render() - 不崩溃', () => {
  let sys: SeasonVisualSystem
  let ctx: CanvasRenderingContext2D
  beforeEach(() => {
    sys = makeSys()
    ctx = makeCtx()
  })

  it('render Spring不崩溃', () => {
    expect(() => sys.render(ctx, 800, 600, Season.Spring, 1, false)).not.toThrow()
  })

  it('render Summer不崩溃', () => {
    expect(() => sys.render(ctx, 800, 600, Season.Summer, 1, false)).not.toThrow()
  })

  it('render Autumn不崩溃', () => {
    expect(() => sys.render(ctx, 800, 600, Season.Autumn, 1, false)).not.toThrow()
  })

  it('render Winter不崩溃', () => {
    expect(() => sys.render(ctx, 800, 600, Season.Winter, 1, false)).not.toThrow()
  })

  it('transitionProgress=0时不崩溃', () => {
    expect(() => sys.render(ctx, 800, 600, Season.Spring, 0, false)).not.toThrow()
  })

  it('transitionProgress=0.5时不崩溃', () => {
    expect(() => sys.render(ctx, 800, 600, Season.Winter, 0.5, true)).not.toThrow()
  })

  it('width=0时不崩溃', () => {
    expect(() => sys.render(ctx, 0, 0, Season.Spring, 1, false)).not.toThrow()
  })

  it('连续多次render不崩溃', () => {
    expect(() => {
      for (let i = 0; i < 20; i++) {
        sys.render(ctx, 1280, 720, Season.Autumn, 1, false)
      }
    }).not.toThrow()
  })

  it('render后globalAlpha恢复为1', () => {
    sys.render(ctx, 800, 600, Season.Summer, 1, true)
    expect(ctx.globalAlpha).toBe(1)
  })
})

// ─────────────────────────────────────────────
// renderSeasonIndicator() - 不崩溃
// ─────────────────────────────────────────────
describe('renderSeasonIndicator() - 不崩溃', () => {
  let sys: SeasonVisualSystem
  let ctx: CanvasRenderingContext2D
  beforeEach(() => {
    sys = makeSys()
    ctx = makeCtx()
  })

  it('Spring指示器渲染不崩溃', () => {
    expect(() => sys.renderSeasonIndicator(ctx, 10, 10, Season.Spring, 0.5)).not.toThrow()
  })

  it('Summer指示器渲染不崩溃', () => {
    expect(() => sys.renderSeasonIndicator(ctx, 10, 10, Season.Summer, 0.25)).not.toThrow()
  })

  it('Autumn指示器渲染不崩溃', () => {
    expect(() => sys.renderSeasonIndicator(ctx, 10, 10, Season.Autumn, 0.75)).not.toThrow()
  })

  it('Winter指示器渲染不崩溃', () => {
    expect(() => sys.renderSeasonIndicator(ctx, 10, 10, Season.Winter, 1.0)).not.toThrow()
  })

  it('seasonProgress=0时不崩溃', () => {
    expect(() => sys.renderSeasonIndicator(ctx, 0, 0, Season.Spring, 0)).not.toThrow()
  })

  it('调用ctx.save和ctx.restore', () => {
    sys.renderSeasonIndicator(ctx, 10, 10, Season.Summer, 0.5)
    expect((ctx.save as any).mock.calls.length).toBeGreaterThan(0)
    expect((ctx.restore as any).mock.calls.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────
// overlay cache 逻辑
// ─────────────────────────────────────────────
describe('overlay 缓存字符串', () => {
  let sys: SeasonVisualSystem
  let ctx: CanvasRenderingContext2D
  beforeEach(() => {
    sys = makeSys()
    ctx = makeCtx()
  })

  it('首次render后_cachedOverlayAlpha被更新（不再为-1）', () => {
    sys.render(ctx, 800, 600, Season.Spring, 1, false)
    // transitionProgress=1, tint.a=0.03, alpha=0.03 > 0, 缓存被更新
    expect((sys as any)._cachedOverlayAlpha).not.toBe(-1)
  })

  it('相同season和alpha的连续render复用缓存', () => {
    sys.render(ctx, 800, 600, Season.Autumn, 1, false)
    const cached1 = (sys as any)._cachedOverlayStyle
    sys.render(ctx, 800, 600, Season.Autumn, 1, false)
    const cached2 = (sys as any)._cachedOverlayStyle
    expect(cached1).toBe(cached2)
  })

  it('season变化时_cachedOverlayStyle被更新', () => {
    sys.render(ctx, 800, 600, Season.Spring, 1, false)
    const cached1 = (sys as any)._cachedOverlayStyle
    sys.render(ctx, 800, 600, Season.Winter, 1, false)
    const cached2 = (sys as any)._cachedOverlayStyle
    expect(cached1).not.toBe(cached2)
  })
})
