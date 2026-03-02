import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TerrainDecorationSystem } from '../systems/TerrainDecorationSystem'

function makeSys() { return new TerrainDecorationSystem() }

// 构造最小 CanvasRenderingContext2D mock
function makeCtx(): CanvasRenderingContext2D {
  const calls: string[] = []
  const ctx = {
    canvas: { width: 800, height: 600 },
    beginPath: vi.fn(() => calls.push('beginPath')),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    _calls: calls,
  }
  return ctx as unknown as CanvasRenderingContext2D
}

// OffscreenCanvas mock（vitest/jsdom 不提供 OffscreenCanvas）
class MockOffscreenCanvas {
  width: number
  height: number
  _ctx: ReturnType<typeof makeCtx>
  constructor(w: number, h: number) {
    this.width = w
    this.height = h
    this._ctx = makeCtx()
  }
  getContext(_type: string) {
    return this._ctx
  }
}

// 在全局注入 OffscreenCanvas mock
if (typeof globalThis.OffscreenCanvas === 'undefined') {
  ;(globalThis as any).OffscreenCanvas = MockOffscreenCanvas
}

// ---- 辅助：为 sys 设置世界地图，让地形全部返回 type ----
function initWith(sys: TerrainDecorationSystem, w: number, h: number, terrain: number) {
  ;(sys as any).init(w, h, () => terrain)
}

describe('TerrainDecorationSystem — 初始状态', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 worldW 为 0', () => {
    expect((sys as any).worldW).toBe(0)
  })
  it('初始 worldH 为 0', () => {
    expect((sys as any).worldH).toBe(0)
  })
  it('getActiveParticleCount 初始为 0', () => {
    expect(sys.getActiveParticleCount()).toBe(0)
  })
  it('getActiveParticleCount 返回 number 类型', () => {
    expect(typeof sys.getActiveParticleCount()).toBe('number')
  })
  it('初始 windX 为 1', () => {
    expect((sys as any).windX).toBe(1)
  })
  it('初始 windY 为 0', () => {
    expect((sys as any).windY).toBe(0)
  })
  it('初始 season 为 spring', () => {
    expect((sys as any).season).toBe('spring')
  })
  it('初始 tick 为 0', () => {
    expect((sys as any).tick).toBe(0)
  })
  it('初始 ripples 为空数组', () => {
    expect((sys as any).ripples).toHaveLength(0)
  })
  it('初始 sandParticles 为空数组', () => {
    expect((sys as any).sandParticles).toHaveLength(0)
  })
  it('初始 grassCache 为空 Map', () => {
    expect((sys as any).grassCache.size).toBe(0)
  })
  it('初始 rockCache 为空 Map', () => {
    expect((sys as any).rockCache.size).toBe(0)
  })
  it('初始 flowerCache 为空 Map', () => {
    expect((sys as any).flowerCache.size).toBe(0)
  })
  it('初始 staticCacheDirty 为 true', () => {
    expect((sys as any).staticCacheDirty).toBe(true)
  })
  it('初始 frameCounter 为 0', () => {
    expect((sys as any).frameCounter).toBe(0)
  })
})

describe('TerrainDecorationSystem — setWind()', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('setWind(1, 0.5) 不崩溃', () => {
    expect(() => sys.setWind(1, 0.5)).not.toThrow()
  })
  it('setWind 更新 windX', () => {
    sys.setWind(2, 3)
    expect((sys as any).windX).toBe(2)
  })
  it('setWind 更新 windY', () => {
    sys.setWind(2, 3)
    expect((sys as any).windY).toBe(3)
  })
  it('setWind 负值', () => {
    sys.setWind(-1.5, -0.5)
    expect((sys as any).windX).toBe(-1.5)
    expect((sys as any).windY).toBe(-0.5)
  })
  it('setWind(0, 0) 零风', () => {
    sys.setWind(0, 0)
    expect((sys as any).windX).toBe(0)
    expect((sys as any).windY).toBe(0)
  })
  it('多次 setWind 保留最后一次', () => {
    sys.setWind(1, 1)
    sys.setWind(5, 7)
    expect((sys as any).windX).toBe(5)
    expect((sys as any).windY).toBe(7)
  })
})

describe('TerrainDecorationSystem — setSeason()', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('setSeason("winter") 不崩溃', () => {
    expect(() => sys.setSeason('winter')).not.toThrow()
  })
  it('setSeason("summer") 不崩溃', () => {
    expect(() => sys.setSeason('summer')).not.toThrow()
  })
  it('setSeason("autumn") 不崩溃', () => {
    expect(() => sys.setSeason('autumn')).not.toThrow()
  })
  it('setSeason("spring") 设置 season 字段', () => {
    sys.setSeason('winter')
    sys.setSeason('spring')
    expect((sys as any).season).toBe('spring')
  })
  it('setSeason("winter") 设置 season 字段', () => {
    sys.setSeason('winter')
    expect((sys as any).season).toBe('winter')
  })
  it('setSeason("summer") 设置 season 字段', () => {
    sys.setSeason('summer')
    expect((sys as any).season).toBe('summer')
  })
  it('setSeason 后 flowerCache 清空', () => {
    // 先填充 flowerCache
    ;(sys as any).flowerCache.set(0, [])
    expect((sys as any).flowerCache.size).toBe(1)
    sys.setSeason('autumn')
    expect((sys as any).flowerCache.size).toBe(0)
  })
  it('setSeason 后 staticCacheDirty 变为 true', () => {
    ;(sys as any).staticCacheDirty = false
    sys.setSeason('summer')
    expect((sys as any).staticCacheDirty).toBe(true)
  })
})

describe('TerrainDecorationSystem — init()', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('init 设置 worldW', () => {
    initWith(sys, 100, 50, 3)
    expect((sys as any).worldW).toBe(100)
  })
  it('init 设置 worldH', () => {
    initWith(sys, 100, 50, 3)
    expect((sys as any).worldH).toBe(50)
  })
  it('init 后 grassCache 清空', () => {
    ;(sys as any).grassCache.set(0, { blades: [] })
    initWith(sys, 10, 10, 3)
    expect((sys as any).grassCache.size).toBe(0)
  })
  it('init 后 rockCache 清空', () => {
    ;(sys as any).rockCache.set(0, [])
    initWith(sys, 10, 10, 5)
    expect((sys as any).rockCache.size).toBe(0)
  })
  it('init 后 flowerCache 清空', () => {
    ;(sys as any).flowerCache.set(0, [])
    initWith(sys, 10, 10, 3)
    expect((sys as any).flowerCache.size).toBe(0)
  })
  it('init 后 ripples 清空', () => {
    ;(sys as any).ripples.push({ x: 0, y: 0, radius: 1, maxRadius: 5, alpha: 0.5 })
    initWith(sys, 10, 10, 1)
    expect((sys as any).ripples).toHaveLength(0)
  })
  it('init 后 sandParticles 清空', () => {
    ;(sys as any).sandParticles.push({ x: 0, y: 0, speed: 1, alpha: 0.5 })
    initWith(sys, 10, 10, 2)
    expect((sys as any).sandParticles).toHaveLength(0)
  })
  it('init 存储 getTerrain 回调', () => {
    const fn = vi.fn(() => 3)
    ;(sys as any).init(10, 10, fn)
    ;(sys as any).getTerrain(5, 5)
    expect(fn).toHaveBeenCalledWith(5, 5)
  })
})

describe('TerrainDecorationSystem — update()', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => {
    sys = makeSys()
    initWith(sys, 50, 50, 3)
  })
  afterEach(() => vi.restoreAllMocks())

  it('update 不崩溃', () => {
    expect(() => sys.update(0)).not.toThrow()
  })
  it('update 更新 tick 字段', () => {
    sys.update(42)
    expect((sys as any).tick).toBe(42)
  })
  it('update 多次后 tick 跟随最新值', () => {
    sys.update(1)
    sys.update(100)
    expect((sys as any).tick).toBe(100)
  })
  it('update tick=0 时 getActiveParticleCount 仍为数字', () => {
    sys.update(0)
    expect(typeof sys.getActiveParticleCount()).toBe('number')
  })
})

describe('TerrainDecorationSystem — updateRipples() 内部逻辑', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => {
    sys = makeSys()
  })
  afterEach(() => vi.restoreAllMocks())

  it('alpha <= 0 的波纹被移除', () => {
    ;(sys as any).tick = 1  // 避免 tick%8===0 时自动生成新波纹
    ;(sys as any).ripples.push({ x: 10, y: 10, radius: 1, maxRadius: 5, alpha: 0.0 })
    ;(sys as any).updateRipples()
    expect((sys as any).ripples).toHaveLength(0)
  })
  it('radius >= maxRadius 的波纹被移除', () => {
    ;(sys as any).tick = 1
    ;(sys as any).ripples.push({ x: 10, y: 10, radius: 8, maxRadius: 8, alpha: 0.5 })
    ;(sys as any).updateRipples()
    expect((sys as any).ripples).toHaveLength(0)
  })
  it('活跃波纹 radius 增长', () => {
    ;(sys as any).ripples.push({ x: 10, y: 10, radius: 1, maxRadius: 100, alpha: 0.6 })
    ;(sys as any).updateRipples()
    expect((sys as any).ripples[0]?.radius).toBeGreaterThan(1)
  })
  it('活跃波纹 alpha 减小', () => {
    ;(sys as any).ripples.push({ x: 10, y: 10, radius: 1, maxRadius: 100, alpha: 0.6 })
    ;(sys as any).updateRipples()
    expect((sys as any).ripples[0]?.alpha).toBeLessThan(0.6)
  })
})

describe('TerrainDecorationSystem — updateSandParticles() 内部逻辑', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => {
    sys = makeSys()
    initWith(sys, 50, 50, 2) // 全是沙地 terrain=2
  })
  afterEach(() => vi.restoreAllMocks())

  it('alpha <= 0 的沙粒被移除', () => {
    ;(sys as any).tick = 1  // 避免 tick%4===0 时自动生成新粒子
    ;(sys as any).sandParticles.push({ x: 16, y: 16, speed: 1, alpha: 0.0 })
    ;(sys as any).updateSandParticles()
    expect((sys as any).sandParticles).toHaveLength(0)
  })
  it('越界的沙粒被移除', () => {
    // tick=0 时 tick%4===0 会触发自动生成粒子，先把 tick 设成非 4 的倍数
    ;(sys as any).tick = 1
    ;(sys as any).sandParticles.push({ x: -100, y: -100, speed: 1, alpha: 0.5 })
    ;(sys as any).updateSandParticles()
    expect((sys as any).sandParticles).toHaveLength(0)
  })
  it('沙粒 x 受 windX 影响', () => {
    sys.setWind(2, 0)
    const p = { x: 400, y: 400, speed: 1, alpha: 0.5 }
    ;(sys as any).sandParticles.push(p)
    const oldX = p.x
    ;(sys as any).updateSandParticles()
    // 如果还存在就检查x增加了
    if ((sys as any).sandParticles.length > 0) {
      expect((sys as any).sandParticles[0].x).toBeGreaterThan(oldX)
    }
  })
})

describe('TerrainDecorationSystem — getGrassTile() 缓存', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => {
    sys = makeSys()
    initWith(sys, 50, 50, 3)
  })
  afterEach(() => vi.restoreAllMocks())

  it('getGrassTile 返回包含 blades 的对象', () => {
    const tile = (sys as any).getGrassTile(5, 5)
    expect(tile).toHaveProperty('blades')
    expect(Array.isArray(tile.blades)).toBe(true)
  })
  it('blades 数量在 2~4 之间', () => {
    const tile = (sys as any).getGrassTile(5, 5)
    expect(tile.blades.length).toBeGreaterThanOrEqual(2)
    expect(tile.blades.length).toBeLessThanOrEqual(4)
  })
  it('getGrassTile 相同坐标返回同一对象（缓存命中）', () => {
    const t1 = (sys as any).getGrassTile(3, 3)
    const t2 = (sys as any).getGrassTile(3, 3)
    expect(t1).toBe(t2)
  })
  it('不同坐标返回不同对象', () => {
    const t1 = (sys as any).getGrassTile(0, 0)
    const t2 = (sys as any).getGrassTile(1, 0)
    expect(t1).not.toBe(t2)
  })
  it('blade 包含 ox/oy/height/phase 字段', () => {
    const tile = (sys as any).getGrassTile(2, 2)
    for (const blade of tile.blades) {
      expect(blade).toHaveProperty('ox')
      expect(blade).toHaveProperty('oy')
      expect(blade).toHaveProperty('height')
      expect(blade).toHaveProperty('phase')
    }
  })
})

describe('TerrainDecorationSystem — getRockCracks() 缓存', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => {
    sys = makeSys()
    initWith(sys, 50, 50, 5) // 全山地
  })
  afterEach(() => vi.restoreAllMocks())

  it('getRockCracks 返回数组', () => {
    const cracks = (sys as any).getRockCracks(5, 5)
    expect(Array.isArray(cracks)).toBe(true)
  })
  it('裂纹数量在 1~3 之间', () => {
    const cracks = (sys as any).getRockCracks(5, 5)
    expect(cracks.length).toBeGreaterThanOrEqual(1)
    expect(cracks.length).toBeLessThanOrEqual(3)
  })
  it('相同坐标返回同一引用', () => {
    const c1 = (sys as any).getRockCracks(2, 3)
    const c2 = (sys as any).getRockCracks(2, 3)
    expect(c1).toBe(c2)
  })
  it('crack 包含 x1/y1/x2/y2 字段', () => {
    const cracks = (sys as any).getRockCracks(1, 1)
    for (const c of cracks) {
      expect(c).toHaveProperty('x1')
      expect(c).toHaveProperty('y1')
      expect(c).toHaveProperty('x2')
      expect(c).toHaveProperty('y2')
    }
  })
})

describe('TerrainDecorationSystem — getFlowers() 季节影响', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => {
    sys = makeSys()
    initWith(sys, 50, 50, 3)
  })
  afterEach(() => vi.restoreAllMocks())

  it('winter 季节时 getFlowers 返回空数组', () => {
    sys.setSeason('winter')
    // 尝试多个坐标确认 winter 一定返回空
    for (let i = 0; i < 20; i++) {
      const flowers = (sys as any).getFlowers(i, i)
      expect(flowers).toHaveLength(0)
    }
  })
  it('spring 季节时 getFlowers 可能返回非空（至少某坐标有花）', () => {
    sys.setSeason('spring')
    let found = false
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        const flowers = (sys as any).getFlowers(x, y)
        if (flowers.length > 0) { found = true; break }
      }
      if (found) break
    }
    expect(found).toBe(true)
  })
  it('相同坐标 getFlowers 缓存命中', () => {
    sys.setSeason('spring')
    const f1 = (sys as any).getFlowers(10, 10)
    const f2 = (sys as any).getFlowers(10, 10)
    expect(f1).toBe(f2)
  })
  it('flower 包含 ox/oy/color/petalCount/size 字段', () => {
    sys.setSeason('spring')
    for (let x = 0; x < 30; x++) {
      const flowers = (sys as any).getFlowers(x, 0)
      if (flowers.length > 0) {
        const f = flowers[0]
        expect(f).toHaveProperty('ox')
        expect(f).toHaveProperty('oy')
        expect(f).toHaveProperty('color')
        expect(f).toHaveProperty('petalCount')
        expect(f).toHaveProperty('size')
        break
      }
    }
  })
  it('spring 花朵 petalCount 在 4~6 之间', () => {
    sys.setSeason('spring')
    for (let x = 0; x < 30; x++) {
      const flowers = (sys as any).getFlowers(x, 0)
      for (const f of flowers) {
        expect(f.petalCount).toBeGreaterThanOrEqual(4)
        expect(f.petalCount).toBeLessThanOrEqual(6)
      }
    }
  })
})

describe('TerrainDecorationSystem — getActiveParticleCount() 聚合', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => {
    sys = makeSys()
    initWith(sys, 50, 50, 3)
  })
  afterEach(() => vi.restoreAllMocks())

  it('只有 ripples 时计数正确', () => {
    ;(sys as any).ripples.push({ x: 0, y: 0, radius: 1, maxRadius: 5, alpha: 0.5 })
    ;(sys as any).ripples.push({ x: 10, y: 10, radius: 1, maxRadius: 5, alpha: 0.5 })
    expect(sys.getActiveParticleCount()).toBe(2)
  })
  it('只有 sandParticles 时计数正确', () => {
    ;(sys as any).sandParticles.push({ x: 0, y: 0, speed: 1, alpha: 0.5 })
    expect(sys.getActiveParticleCount()).toBe(1)
  })
  it('ripples + sandParticles 合计计数', () => {
    ;(sys as any).ripples.push({ x: 0, y: 0, radius: 1, maxRadius: 5, alpha: 0.5 })
    ;(sys as any).sandParticles.push({ x: 0, y: 0, speed: 1, alpha: 0.5 })
    ;(sys as any).sandParticles.push({ x: 10, y: 10, speed: 1, alpha: 0.5 })
    expect(sys.getActiveParticleCount()).toBe(3)
  })
  it('init 后 getActiveParticleCount 重置为 0', () => {
    ;(sys as any).ripples.push({ x: 0, y: 0, radius: 1, maxRadius: 5, alpha: 0.5 })
    initWith(sys, 20, 20, 3)
    expect(sys.getActiveParticleCount()).toBe(0)
  })
})

describe('TerrainDecorationSystem — GRASS_UPDATE_INTERVAL 常量', () => {
  afterEach(() => vi.restoreAllMocks())

  it('GRASS_UPDATE_INTERVAL 为正整数', () => {
    const sys = makeSys()
    expect((sys as any).GRASS_UPDATE_INTERVAL).toBeGreaterThan(0)
    expect(Number.isInteger((sys as any).GRASS_UPDATE_INTERVAL)).toBe(true)
  })
  it('GRASS_UPDATE_INTERVAL 为 3', () => {
    const sys = makeSys()
    expect((sys as any).GRASS_UPDATE_INTERVAL).toBe(3)
  })
})
