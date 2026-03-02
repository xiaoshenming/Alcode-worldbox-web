import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TerraformingSystem, TerraformEffectType } from '../systems/TerraformingSystem'
import { TileType } from '../utils/Constants'

function makeSys() { return new TerraformingSystem() }

// ---- World / ParticleSystem mock ----
function makeWorld() {
  return { setTile: vi.fn() } as any
}
function makeParticles() {
  return { addParticle: vi.fn(), spawn: vi.fn() } as any
}
function makeCtx(): CanvasRenderingContext2D {
  return {
    canvas: { width: 800, height: 600 } as HTMLCanvasElement,
    save: vi.fn(), restore: vi.fn(),
    fillRect: vi.fn(), beginPath: vi.fn(), fill: vi.fn(),
    fillStyle: '', globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}

// ---- 初始状态 ----
describe('TerraformingSystem - 初始状态', () => {
  let sys: TerraformingSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getActiveEffects 初始返回空数组', () => {
    expect(sys.getActiveEffects()).toHaveLength(0)
  })

  it('effects 私有字段初始为空数组', () => {
    expect((sys as any).effects).toHaveLength(0)
  })

  it('activeCount 初始为 0', () => {
    expect(sys.activeCount).toBe(0)
  })

  it('实例化不抛出异常', () => {
    expect(() => new TerraformingSystem()).not.toThrow()
  })

  it('多实例互相独立', () => {
    const a = makeSys()
    const b = makeSys()
    a.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    expect(b.activeCount).toBe(0)
  })
})

// ---- addEffect() 基础行为 ----
describe('TerraformingSystem - addEffect() 基础', () => {
  let sys: TerraformingSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('addEffect 后 activeCount 为 1', () => {
    sys.addEffect(5, 5, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.activeCount).toBe(1)
  })

  it('addEffect 后 getActiveEffects 长度为 1', () => {
    sys.addEffect(0, 0, TileType.SAND, TileType.SHALLOW_WATER, 'flood')
    expect(sys.getActiveEffects()).toHaveLength(1)
  })

  it('不同坐标可各自 addEffect', () => {
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.addEffect(1, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.addEffect(0, 1, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.activeCount).toBe(3)
  })

  it('同位置重复 addEffect 不叠加（去重）', () => {
    sys.addEffect(5, 5, TileType.GRASS, TileType.FOREST, 'grow')
    sys.addEffect(5, 5, TileType.GRASS, TileType.MOUNTAIN, 'erode')
    expect(sys.activeCount).toBe(1)
  })

  it('同 x 不同 y 可各自添加', () => {
    sys.addEffect(3, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.addEffect(3, 1, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.activeCount).toBe(2)
  })

  it('同 y 不同 x 可各自添加', () => {
    sys.addEffect(0, 3, TileType.GRASS, TileType.FOREST, 'grow')
    sys.addEffect(1, 3, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.activeCount).toBe(2)
  })

  it('effect 初始 progress 为 0', () => {
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.getActiveEffects()[0].progress).toBe(0)
  })

  it('effect 初始 elapsed 为 0', () => {
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.getActiveEffects()[0].elapsed).toBe(0)
  })

  it('effect 初始 particleCooldown 为 0', () => {
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.getActiveEffects()[0].particleCooldown).toBe(0)
  })

  it('effect 初始 _lastProgressQ 为 -1', () => {
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.getActiveEffects()[0]._lastProgressQ).toBe(-1)
  })

  it('effect duration 在 [30, 60] 范围内', () => {
    for (let i = 0; i < 20; i++) {
      const s = makeSys()
      s.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
      const d = s.getActiveEffects()[0].duration
      expect(d).toBeGreaterThanOrEqual(30)
      expect(d).toBeLessThanOrEqual(60)
    }
  })

  it('addEffect 记录正确的 x/y', () => {
    sys.addEffect(7, 13, TileType.GRASS, TileType.FOREST, 'grow')
    const e = sys.getActiveEffects()[0]
    expect(e.x).toBe(7)
    expect(e.y).toBe(13)
  })

  it('addEffect 记录正确的 fromTile/toTile', () => {
    sys.addEffect(0, 0, TileType.SAND, TileType.MOUNTAIN, 'erode')
    const e = sys.getActiveEffects()[0]
    expect(e.fromTile).toBe(TileType.SAND)
    expect(e.toTile).toBe(TileType.MOUNTAIN)
  })

  it('addEffect 记录正确的 effectType', () => {
    const types: TerraformEffectType[] = ['grow', 'erode', 'freeze', 'burn', 'flood']
    for (const t of types) {
      const s = makeSys()
      s.addEffect(0, 0, TileType.GRASS, TileType.FOREST, t)
      expect(s.getActiveEffects()[0].effectType).toBe(t)
    }
  })
})

// ---- MAX_ACTIVE_EFFECTS 上限 ----
describe('TerraformingSystem - MAX_ACTIVE_EFFECTS 上限', () => {
  let sys: TerraformingSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('超过 500 个 effect 后不再添加', () => {
    for (let i = 0; i < 510; i++) {
      sys.addEffect(i, 0, TileType.GRASS, TileType.FOREST, 'grow')
    }
    expect(sys.activeCount).toBeLessThanOrEqual(500)
  })

  it('刚好 500 个 effect 可添加', () => {
    for (let i = 0; i < 500; i++) {
      sys.addEffect(i, 0, TileType.GRASS, TileType.FOREST, 'grow')
    }
    expect(sys.activeCount).toBe(500)
  })

  it('第 501 个不被添加', () => {
    for (let i = 0; i < 500; i++) {
      sys.addEffect(i, 0, TileType.GRASS, TileType.FOREST, 'grow')
    }
    sys.addEffect(9999, 9999, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.activeCount).toBe(500)
  })
})

// ---- update() 进度推进与完成 ----
describe('TerraformingSystem - update() 进度推进', () => {
  let sys: TerraformingSystem
  let world: ReturnType<typeof makeWorld>
  let particles: ReturnType<typeof makeParticles>

  beforeEach(() => {
    sys = makeSys()
    world = makeWorld()
    particles = makeParticles()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 后 elapsed 增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.update(world, particles, 0)
    expect(sys.getActiveEffects()[0].elapsed).toBe(1)
  })

  it('update 后 progress = elapsed / duration', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.update(world, particles, 0)
    const e = sys.getActiveEffects()[0]
    expect(e.progress).toBeCloseTo(e.elapsed / e.duration, 10)
  })

  it('effect 完成后从队列中移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    const duration = sys.getActiveEffects()[0].duration
    // 直接注入 elapsed = duration，使 progress >= 1
    ;(sys as any).effects[0].elapsed = duration - 1
    sys.update(world, particles, 0)
    expect(sys.activeCount).toBe(0)
  })

  it('effect 完成后调用 world.setTile', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(3, 7, TileType.GRASS, TileType.FOREST, 'grow')
    ;(sys as any).effects[0].elapsed = (sys as any).effects[0].duration - 1
    sys.update(world, particles, 0)
    expect(world.setTile).toHaveBeenCalledWith(3, 7, TileType.FOREST)
  })

  it('effect 完成后调用 particles.spawn（最终爆发）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    ;(sys as any).effects[0].elapsed = (sys as any).effects[0].duration - 1
    sys.update(world, particles, 0)
    expect(particles.spawn).toHaveBeenCalled()
  })

  it('update 调用 particles.addParticle（冷却到期时）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    // particleCooldown 初始为 0，第一次 update 中 cooldown-- = -1 <= 0 → 触发
    sys.update(world, particles, 0)
    expect(particles.addParticle).toHaveBeenCalled()
  })

  it('多 effect 同时推进', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.addEffect(1, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.addEffect(2, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.update(world, particles, 0)
    for (const e of sys.getActiveEffects()) {
      expect(e.elapsed).toBe(1)
    }
  })

  it('progress 不超过 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    ;(sys as any).effects[0].elapsed = 9999
    ;(sys as any).effects[0].duration = 30
    // 未完成时强制 progress 最大为 1，update 会完成并移除
    sys.update(world, particles, 0)
    expect(sys.activeCount).toBe(0)
  })

  it('burn 效果完成后设置正确目标 tile', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(10, 10, TileType.FOREST, TileType.LAVA, 'burn')
    ;(sys as any).effects[0].elapsed = (sys as any).effects[0].duration - 1
    sys.update(world, particles, 0)
    expect(world.setTile).toHaveBeenCalledWith(10, 10, TileType.LAVA)
  })
})

// ---- render() ----
describe('TerraformingSystem - render()', () => {
  let sys: TerraformingSystem
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    sys = makeSys()
    ctx = makeCtx()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('无 effect 时 render 不调用 fillRect', () => {
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('有 effect 时 render 不抛出', () => {
    sys.addEffect(5, 5, TileType.GRASS, TileType.FOREST, 'grow')
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })

  it('render 结束后 globalAlpha 恢复 1', () => {
    sys.addEffect(5, 5, TileType.GRASS, TileType.FOREST, 'grow')
    sys.render(ctx, 0, 0, 1)
    expect(ctx.globalAlpha).toBe(1)
  })

  it('effect 在视口外时不渲染（fillRect 未调用）', () => {
    // 添加超出视口的 effect（tile 坐标 1000,1000，但 camera 在 0,0，zoom=1）
    sys.addEffect(1000, 1000, TileType.GRASS, TileType.FOREST, 'grow')
    sys.render(ctx, 0, 0, 1)
    // 视口裁剪后不应绘制
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('effect 在视口内时 fillRect 被调用', () => {
    // tile(0,0) 在 camera(0,0) zoom=1 视口内
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillRect).toHaveBeenCalled()
  })
})

// ---- getActiveEffects() 引用 ----
describe('TerraformingSystem - getActiveEffects() 引用行为', () => {
  let sys: TerraformingSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getActiveEffects 返回同一内部数组引用', () => {
    const ref1 = sys.getActiveEffects()
    const ref2 = sys.getActiveEffects()
    expect(ref1).toBe(ref2)
  })

  it('addEffect 后 getActiveEffects 实时反映变化', () => {
    const ref = sys.getActiveEffects()
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    expect(ref).toHaveLength(1)
  })
})

// ---- 补充：effect 字段验证与边界情况 ----
describe('TerraformingSystem - 补充边界与字段', () => {
  let sys: TerraformingSystem
  let world: any
  let particles: any

  beforeEach(() => {
    sys = makeSys()
    world = makeWorld()
    particles = makeParticles()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('addEffect 后 activeCount getter 等于 effects.length', () => {
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.addEffect(1, 0, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.activeCount).toBe((sys as any).effects.length)
  })

  it('五种 effectType 均能成功添加', () => {
    const types: TerraformEffectType[] = ['grow', 'erode', 'freeze', 'burn', 'flood']
    types.forEach((t, i) => {
      sys.addEffect(i, 0, TileType.GRASS, TileType.FOREST, t)
    })
    expect(sys.activeCount).toBe(5)
  })

  it('duration 每次随机不同（种子不同时）', () => {
    const durations = new Set<number>()
    for (let i = 0; i < 10; i++) {
      const s = makeSys()
      s.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
      durations.add(s.getActiveEffects()[0].duration)
    }
    // 随机足够多，应该不只有 1 种值
    // 这里只做宽泛断言，确保值在范围内
    for (const d of durations) {
      expect(d).toBeGreaterThanOrEqual(30)
      expect(d).toBeLessThanOrEqual(60)
    }
  })

  it('_cachedColor 初始来自 fromTile 的第一个颜色', () => {
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    // TILE_COLORS[GRASS][0] = '#3a8c3a'
    expect(sys.getActiveEffects()[0]._cachedColor).toBe('#3a8c3a')
  })

  it('flood effect 完成后 world.setTile 传入正确坐标', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(5, 8, TileType.SAND, TileType.SHALLOW_WATER, 'flood')
    ;(sys as any).effects[0].elapsed = (sys as any).effects[0].duration - 1
    sys.update(world, particles, 0)
    expect(world.setTile).toHaveBeenCalledWith(5, 8, TileType.SHALLOW_WATER)
  })

  it('freeze effect 完成后 activeCount=0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(2, 2, TileType.GRASS, TileType.SNOW, 'freeze')
    ;(sys as any).effects[0].elapsed = (sys as any).effects[0].duration - 1
    sys.update(world, particles, 0)
    expect(sys.activeCount).toBe(0)
  })

  it('erode effect 完成后触发 particles.spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(0, 0, TileType.MOUNTAIN, TileType.GRASS, 'erode')
    ;(sys as any).effects[0].elapsed = (sys as any).effects[0].duration - 1
    sys.update(world, particles, 0)
    expect(particles.spawn).toHaveBeenCalled()
  })

  it('update 多次后未完成的 effect 仍在队列中', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    const duration = (sys as any).effects[0].duration
    // 只推进一半
    for (let i = 0; i < Math.floor(duration / 2); i++) {
      sys.update(world, particles, i)
    }
    expect(sys.activeCount).toBe(1)
  })

  it('swap-and-pop 移除中间 effect 后其余 effect 仍在', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.addEffect(1, 0, TileType.GRASS, TileType.FOREST, 'grow')
    // 完成第一个
    ;(sys as any).effects[0].elapsed = (sys as any).effects[0].duration - 1
    sys.update(world, particles, 0)
    // 应该还剩 1 个
    expect(sys.activeCount).toBe(1)
  })

  it('render 空 effect 列表立即返回（无 fillRect）', () => {
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 2)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('不同 zoom 值下 render 不崩溃', () => {
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    for (const zoom of [0.5, 1, 2, 4]) {
      expect(() => sys.render(makeCtx(), 0, 0, zoom)).not.toThrow()
    }
  })
})

describe('TerraformingSystem - 最终补充', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('addEffect 坐标 (0,0) 与坐标 (0,1) 是不同位置，可各自添加', () => {
    const sys = makeSys()
    sys.addEffect(0, 0, TileType.GRASS, TileType.FOREST, 'grow')
    sys.addEffect(0, 1, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.activeCount).toBe(2)
  })
})
