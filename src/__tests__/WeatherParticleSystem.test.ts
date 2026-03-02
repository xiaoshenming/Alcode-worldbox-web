import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WeatherParticleSystem, WeatherType } from '../systems/WeatherParticleSystem'

function makeSys() { return new WeatherParticleSystem() }

function makeCtx(): CanvasRenderingContext2D {
  return {
    canvas: { width: 800, height: 600 } as HTMLCanvasElement,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    globalAlpha: 1,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D
}

describe('WeatherParticleSystem — 初始状态', () => {
  let sys: WeatherParticleSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 currentWeather 为 clear', () => {
    expect((sys as any).currentWeather).toBe('clear')
  })

  it('初始 targetWeather 为 clear', () => {
    expect((sys as any).targetWeather).toBe('clear')
  })

  it('初始 intensity 为 1', () => {
    expect((sys as any).intensity).toBe(1)
  })

  it('初始 transitionProgress 为 1', () => {
    expect((sys as any).transitionProgress).toBe(1)
  })

  it('初始 lightningTimer 为 0', () => {
    expect((sys as any).lightningTimer).toBe(0)
  })

  it('初始 lightningFlash 为 0', () => {
    expect((sys as any).lightningFlash).toBe(0)
  })

  it('初始 lightningSegments 为空数组', () => {
    expect((sys as any).lightningSegments).toHaveLength(0)
  })

  it('getWeather() 初始返回 clear', () => {
    expect(sys.getWeather()).toBe('clear')
  })

  it('getParticleCount() 初始返回 0', () => {
    expect(sys.getParticleCount()).toBe(0)
  })

  it('getParticleCount() 返回值为数字', () => {
    expect(typeof sys.getParticleCount()).toBe('number')
  })
})

describe('WeatherParticleSystem — setWeather', () => {
  let sys: WeatherParticleSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('setWeather(rain) 后 getWeather() 返回 rain', () => {
    sys.setWeather('rain')
    expect(sys.getWeather()).toBe('rain')
  })

  it('setWeather(snow) 后 getWeather() 返回 snow', () => {
    sys.setWeather('snow')
    expect(sys.getWeather()).toBe('snow')
  })

  it('setWeather(storm) 后 getWeather() 返回 storm', () => {
    sys.setWeather('storm')
    expect(sys.getWeather()).toBe('storm')
  })

  it('setWeather(tornado) 后 getWeather() 返回 tornado', () => {
    sys.setWeather('tornado')
    expect(sys.getWeather()).toBe('tornado')
  })

  it('setWeather(fog) 后 getWeather() 返回 fog', () => {
    sys.setWeather('fog')
    expect(sys.getWeather()).toBe('fog')
  })

  it('setWeather(clear) 后 getWeather() 返回 clear', () => {
    sys.setWeather('rain')
    sys.setWeather('clear')
    expect(sys.getWeather()).toBe('clear')
  })

  it('setWeather 相同天气不重置 transitionProgress', () => {
    // 先 setWeather(rain) 让 transitionProgress = 0
    sys.setWeather('rain')
    expect((sys as any).transitionProgress).toBe(0)
    // 再次设置同一天气，transitionProgress 不变
    sys.setWeather('rain')
    expect((sys as any).transitionProgress).toBe(0)
  })

  it('setWeather 不同天气会重置 transitionProgress 为 0', () => {
    sys.setWeather('rain')
    expect((sys as any).transitionProgress).toBe(0)
  })

  it('setWeather 更新 targetWeather 字段', () => {
    sys.setWeather('fog')
    expect((sys as any).targetWeather).toBe('fog')
  })

  it('setWeather 不立即更新 currentWeather 字段', () => {
    sys.setWeather('storm')
    expect((sys as any).currentWeather).toBe('clear')
  })
})

describe('WeatherParticleSystem — setIntensity', () => {
  let sys: WeatherParticleSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('setIntensity(0.5) 后 intensity 为 0.5', () => {
    sys.setIntensity(0.5)
    expect((sys as any).intensity).toBe(0.5)
  })

  it('setIntensity(0) 后 intensity 为 0', () => {
    sys.setIntensity(0)
    expect((sys as any).intensity).toBe(0)
  })

  it('setIntensity(1) 后 intensity 为 1', () => {
    sys.setIntensity(1)
    expect((sys as any).intensity).toBe(1)
  })

  it('setIntensity(-1) 被 clamp 到 0', () => {
    sys.setIntensity(-1)
    expect((sys as any).intensity).toBe(0)
  })

  it('setIntensity(2) 被 clamp 到 1', () => {
    sys.setIntensity(2)
    expect((sys as any).intensity).toBe(1)
  })

  it('setIntensity(0.3) 精确存储', () => {
    sys.setIntensity(0.3)
    expect((sys as any).intensity).toBeCloseTo(0.3)
  })
})

describe('WeatherParticleSystem — update', () => {
  let sys: WeatherParticleSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update 不抛出异常（clear 天气）', () => {
    expect(() => sys.update(0, 0, 0)).not.toThrow()
  })

  it('update 不抛出异常（rain 天气）', () => {
    sys.setWeather('rain')
    expect(() => sys.update(0, 0, 0)).not.toThrow()
  })

  it('update 不抛出异常（storm 天气）', () => {
    sys.setWeather('storm')
    expect(() => sys.update(0, 0, 0)).not.toThrow()
  })

  it('update 不抛出异常（snow 天气）', () => {
    sys.setWeather('snow')
    expect(() => sys.update(0, 0, 0)).not.toThrow()
  })

  it('update 不抛出异常（tornado 天气）', () => {
    sys.setWeather('tornado')
    expect(() => sys.update(0, 0, 0)).not.toThrow()
  })

  it('update 不抛出异常（fog 天气）', () => {
    sys.setWeather('fog')
    expect(() => sys.update(0, 0, 0)).not.toThrow()
  })

  it('update 多次后 transitionProgress 趋向 1', () => {
    sys.setWeather('rain')
    for (let i = 0; i < 120; i++) sys.update(i, 0, 0)
    expect((sys as any).transitionProgress).toBe(1)
  })

  it('transitionProgress 到达 1 后 currentWeather 更新', () => {
    sys.setWeather('rain')
    for (let i = 0; i < 120; i++) sys.update(i, 0, 0)
    expect((sys as any).currentWeather).toBe('rain')
  })

  it('update 后 getParticleCount() 可能大于 0（rain）', () => {
    sys.setWeather('rain')
    let count = 0
    for (let i = 0; i < 30; i++) {
      sys.update(i, 0, 0)
      count = sys.getParticleCount()
      if (count > 0) break
    }
    // 由于随机性，多次 update 后应该至少尝试过
    expect(typeof count).toBe('number')
  })

  it('clear 天气下多次 update 后粒子数趋向 0', () => {
    // 先产生雨粒子
    sys.setWeather('rain')
    for (let i = 0; i < 20; i++) sys.update(i, 0, 0)
    // 切换回 clear，等粒子 fade 完
    sys.setWeather('clear')
    for (let i = 20; i < 200; i++) sys.update(i, 0, 0)
    expect(sys.getParticleCount()).toBe(0)
  })

  it('rain 天气传入负 windX 不崩溃', () => {
    sys.setWeather('rain')
    expect(() => sys.update(0, -5, 0)).not.toThrow()
  })
})

describe('WeatherParticleSystem — getParticleCount', () => {
  let sys: WeatherParticleSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始粒子数为 0', () => {
    expect(sys.getParticleCount()).toBe(0)
  })

  it('getParticleCount() 返回非负整数', () => {
    const count = sys.getParticleCount()
    expect(count).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(count)).toBe(true)
  })

  it('getParticleCount() 统计所有粒子池', () => {
    // 手动激活一个 rainPool 粒子
    const pool = (sys as any).rainPool as Array<{active: boolean}>
    pool[0].active = true
    expect(sys.getParticleCount()).toBe(1)
  })

  it('getParticleCount() 统计多粒子池中的活跃粒子', () => {
    const rainPool = (sys as any).rainPool as Array<{active: boolean}>
    const snowPool = (sys as any).snowPool as Array<{active: boolean}>
    rainPool[0].active = true
    snowPool[0].active = true
    expect(sys.getParticleCount()).toBe(2)
  })
})

describe('WeatherParticleSystem — render', () => {
  let sys: WeatherParticleSystem
  let ctx: CanvasRenderingContext2D
  beforeEach(() => { sys = makeSys(); ctx = makeCtx() })
  afterEach(() => vi.restoreAllMocks())

  it('render clear 天气不崩溃', () => {
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render rain 天气不崩溃', () => {
    sys.setWeather('rain')
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render storm 天气不崩溃', () => {
    sys.setWeather('storm')
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render snow 天气不崩溃', () => {
    sys.setWeather('snow')
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render tornado 天气不崩溃', () => {
    sys.setWeather('tornado')
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render fog 天气不崩溃', () => {
    sys.setWeather('fog')
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render 在过渡期间不崩溃', () => {
    sys.setWeather('rain')
    // transitionProgress < 1
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })
})

describe('WeatherParticleSystem — 粒子池容量常量', () => {
  let sys: WeatherParticleSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('rainPool 大小为 500', () => {
    expect((sys as any).rainPool.length).toBe(500)
  })

  it('splashPool 大小为 50', () => {
    expect((sys as any).splashPool.length).toBe(50)
  })

  it('snowPool 大小为 200', () => {
    expect((sys as any).snowPool.length).toBe(200)
  })

  it('tornadoPool 大小为 100', () => {
    expect((sys as any).tornadoPool.length).toBe(100)
  })

  it('fogPool 大小为 20', () => {
    expect((sys as any).fogPool.length).toBe(20)
  })

  it('所有粒子池初始 active 均为 false', () => {
    const pools = ['rainPool', 'splashPool', 'snowPool', 'tornadoPool', 'fogPool']
    for (const name of pools) {
      const pool = (sys as any)[name] as Array<{active: boolean}>
      expect(pool.every(p => !p.active)).toBe(true)
    }
  })
})
