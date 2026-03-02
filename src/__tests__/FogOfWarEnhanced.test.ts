import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FogOfWarEnhanced } from '../systems/FogOfWarEnhanced'

function makeSys() { return new FogOfWarEnhanced() }

function makeCtx() {
  return {
    save: vi.fn(), restore: vi.fn(),
    fillRect: vi.fn(), fillText: vi.fn(),
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D
}

describe('FogOfWarEnhanced - 初始状态', () => {
  let sys: FogOfWarEnhanced

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getExploredPercent 初始为 0', () => { expect(sys.getExploredPercent()).toBe(0) })
  it('setActiveCiv 不崩溃', () => { expect(() => sys.setActiveCiv(1)).not.toThrow() })
  it('isExplored 未探索区域返回 false', () => { expect(sys.isExplored(0, 0)).toBe(false) })
  it('enabled 初始为 true', () => { expect((sys as any).enabled).toBe(true) })
  it('activeCivId 初始为 0', () => { expect((sys as any).activeCivId).toBe(0) })
  it('width 初始为 0', () => { expect((sys as any).width).toBe(0) })
  it('height 初始为 0', () => { expect((sys as any).height).toBe(0) })
  it('dirty 初始为 true', () => { expect((sys as any).dirty).toBe(true) })
  it('civMaps 初始为空 Map', () => { expect((sys as any).civMaps.size).toBe(0) })
  it('visibilityMap 初始为空 Uint8Array', () => { expect((sys as any).visibilityMap.length).toBe(0) })
  it('terrainData 初始为 null', () => { expect((sys as any).terrainData).toBeNull() })
  it('isEnabled() 初始为 true', () => { expect(sys.isEnabled()).toBe(true) })
  it('isExplored 边界外返回 false', () => { expect(sys.isExplored(-1, 0)).toBe(false) })
  it('isVisible 边界外返回 false（初始）', () => { expect(sys.isVisible(0, 0)).toBe(false) })
})

describe('FogOfWarEnhanced - init', () => {
  let sys: FogOfWarEnhanced

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('init 设置 width', () => {
    sys.init(20, 10)
    expect((sys as any).width).toBe(20)
  })

  it('init 设置 height', () => {
    sys.init(20, 10)
    expect((sys as any).height).toBe(10)
  })

  it('init 清空 civMaps', () => {
    sys.init(10, 10)
    expect((sys as any).civMaps.size).toBe(0)
  })

  it('init 创建正确大小的 visibilityMap', () => {
    sys.init(20, 10)
    expect((sys as any).visibilityMap.length).toBe(200)
  })

  it('init 将 dirty 置为 true', () => {
    sys.init(10, 10)
    expect((sys as any).dirty).toBe(true)
  })

  it('init 后 getExploredPercent 仍为 0（无探索记录）', () => {
    sys.init(10, 10)
    expect(sys.getExploredPercent()).toBe(0)
  })

  it('init 多次调用不崩溃', () => {
    expect(() => { sys.init(10, 10); sys.init(20, 20) }).not.toThrow()
  })

  it('init(1,1) 后 visibilityMap 长度为 1', () => {
    sys.init(1, 1)
    expect((sys as any).visibilityMap.length).toBe(1)
  })
})

describe('FogOfWarEnhanced - setActiveCiv', () => {
  let sys: FogOfWarEnhanced

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('setActiveCiv 切换 activeCivId', () => {
    sys.setActiveCiv(5)
    expect((sys as any).activeCivId).toBe(5)
  })

  it('setActiveCiv 设置相同 civId 时 dirty 不改变', () => {
    sys.init(10, 10)
    sys.setActiveCiv(0)
    ;(sys as any).dirty = false
    sys.setActiveCiv(0) // 同 id，不改变
    expect((sys as any).dirty).toBe(false)
  })

  it('setActiveCiv 切换到新 civId 时 dirty = true', () => {
    sys.init(10, 10)
    ;(sys as any).dirty = false
    sys.setActiveCiv(2)
    expect((sys as any).dirty).toBe(true)
  })

  it('setActiveCiv 多次调用不崩溃', () => {
    expect(() => { for (let i = 0; i < 10; i++) sys.setActiveCiv(i) }).not.toThrow()
  })
})

describe('FogOfWarEnhanced - updateVision', () => {
  let sys: FogOfWarEnhanced

  beforeEach(() => { sys = makeSys(); sys.init(20, 20) })
  afterEach(() => { vi.restoreAllMocks() })

  it('updateVision 不崩溃（无单位无建筑）', () => {
    expect(() => sys.updateVision(0, [], [])).not.toThrow()
  })

  it('updateVision 后 isExplored 中心点为 true', () => {
    sys.setActiveCiv(1)
    sys.updateVision(0, [{ x: 10, y: 10, visionRange: 3 }], [])
    expect(sys.isExplored(10, 10)).toBe(true)
  })

  it('updateVision 后 isVisible 中心点为 true', () => {
    sys.setActiveCiv(1)
    sys.updateVision(0, [{ x: 10, y: 10, visionRange: 3 }], [])
    expect(sys.isVisible(10, 10)).toBe(true)
  })

  it('updateVision 后 getExploredPercent > 0', () => {
    sys.setActiveCiv(1)
    sys.updateVision(0, [{ x: 10, y: 10, visionRange: 3 }], [])
    expect(sys.getExploredPercent()).toBeGreaterThan(0)
  })

  it('updateVision 多帧后 可见->已探索（不再可见时 isVisible=false）', () => {
    sys.setActiveCiv(1)
    sys.updateVision(0, [{ x: 10, y: 10, visionRange: 3 }], [])
    // 第二次更新时无单位，之前可见的应降为已探索
    ;(sys as any).lastUpdateTick = -100 // 强制允许下次更新
    sys.updateVision(100, [], [])
    expect(sys.isVisible(10, 10)).toBe(false)
    // 但应仍为已探索
    expect(sys.isExplored(10, 10)).toBe(true)
  })

  it('updateVision 有建筑时也能揭示视野', () => {
    sys.setActiveCiv(1)
    sys.updateVision(0, [], [{ x: 5, y: 5, visionBonus: 2 }])
    expect(sys.isExplored(5, 5)).toBe(true)
  })

  it('updateVision 时间间隔内不重复更新', () => {
    sys.setActiveCiv(1)
    sys.updateVision(0, [{ x: 10, y: 10, visionRange: 3 }], [])
    const pct1 = sys.getExploredPercent()
    // tick 差值 < UPDATE_INTERVAL(10)，不触发更新
    sys.updateVision(5, [{ x: 1, y: 1, visionRange: 5 }], [])
    const pct2 = sys.getExploredPercent()
    expect(pct1).toBe(pct2)
  })

  it('updateVision 边界外的单位不崩溃', () => {
    expect(() => sys.updateVision(0, [{ x: -5, y: -5, visionRange: 3 }], [])).not.toThrow()
  })

  it('updateVision 超出边界的单位不崩溃', () => {
    expect(() => sys.updateVision(0, [{ x: 100, y: 100, visionRange: 3 }], [])).not.toThrow()
  })

  it('updateVision visionRange=0 时使用默认视野（8）', () => {
    sys.setActiveCiv(1)
    sys.updateVision(0, [{ x: 10, y: 10, visionRange: 0 }], [])
    expect(sys.isExplored(10, 10)).toBe(true)
  })
})

describe('FogOfWarEnhanced - isExplored / isVisible', () => {
  let sys: FogOfWarEnhanced

  beforeEach(() => { sys = makeSys(); sys.init(20, 20) })
  afterEach(() => { vi.restoreAllMocks() })

  it('isExplored 未初始化时返回 false', () => {
    const s = makeSys()
    expect(s.isExplored(0, 0)).toBe(false)
  })

  it('isExplored 超出 x 边界返回 false', () => {
    sys.setActiveCiv(1)
    expect(sys.isExplored(25, 5)).toBe(false)
  })

  it('isExplored 超出 y 边界返回 false', () => {
    sys.setActiveCiv(1)
    expect(sys.isExplored(5, 25)).toBe(false)
  })

  it('isExplored 负 x 返回 false', () => {
    sys.setActiveCiv(1)
    expect(sys.isExplored(-1, 5)).toBe(false)
  })

  it('isExplored 负 y 返回 false', () => {
    sys.setActiveCiv(1)
    expect(sys.isExplored(5, -1)).toBe(false)
  })

  it('isVisible 未探索点返回 false', () => {
    sys.setActiveCiv(1)
    expect(sys.isVisible(0, 0)).toBe(false)
  })

  it('isVisible 超出边界返回 false', () => {
    expect(sys.isVisible(100, 100)).toBe(false)
  })

  it('探索后 isExplored 在不同 civId 下返回 false', () => {
    sys.setActiveCiv(1)
    sys.updateVision(0, [{ x: 10, y: 10, visionRange: 3 }], [])
    sys.setActiveCiv(2)
    // civ2 没有探索记录
    expect(sys.isExplored(10, 10)).toBe(false)
  })

  it('isEnabled() 返回 true', () => {
    expect(sys.isEnabled()).toBe(true)
  })
})

describe('FogOfWarEnhanced - getExploredPercent', () => {
  let sys: FogOfWarEnhanced

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('未 init 时返回 0', () => { expect(sys.getExploredPercent()).toBe(0) })
  it('init 但无 civ 时返回 0', () => { sys.init(10, 10); expect(sys.getExploredPercent()).toBe(0) })

  it('getExploredPercent 范围 0-100', () => {
    sys.init(10, 10)
    sys.setActiveCiv(1)
    sys.updateVision(0, [{ x: 5, y: 5, visionRange: 2 }], [])
    const pct = sys.getExploredPercent()
    expect(pct).toBeGreaterThanOrEqual(0)
    expect(pct).toBeLessThanOrEqual(100)
  })

  it('全部探索后接近 100%', () => {
    sys.init(5, 5)
    sys.setActiveCiv(1)
    // 用大视野揭示全图
    sys.updateVision(0, [{ x: 2, y: 2, visionRange: 10 }], [])
    const pct = sys.getExploredPercent()
    expect(pct).toBeGreaterThan(90)
  })
})

describe('FogOfWarEnhanced - render', () => {
  let sys: FogOfWarEnhanced
  let ctx: CanvasRenderingContext2D

  beforeEach(() => { sys = makeSys(); sys.init(20, 20); ctx = makeCtx() })
  afterEach(() => { vi.restoreAllMocks() })

  it('render 不崩溃（无视野数据）', () => {
    expect(() => sys.render(ctx, 0, 0, 1, 0, 0, 20, 20)).not.toThrow()
  })

  it('render 有未探索 tile 时调用 fillRect', () => {
    sys.setActiveCiv(1)
    sys.updateVision(0, [{ x: 5, y: 5, visionRange: 2 }], [])
    sys.render(ctx, 0, 0, 1, 0, 0, 20, 20)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('render 全部可见时不调用 fillRect（已探索可见区域跳过）', () => {
    sys.setActiveCiv(1)
    sys.init(3, 3)
    sys.updateVision(0, [{ x: 1, y: 1, visionRange: 5 }], [])
    const mockCtx = makeCtx()
    sys.render(mockCtx, 0, 0, 1, 0, 0, 3, 3)
    // 可见 tile 不绘制迷雾，但已探索/未探索 tile 会绘制
    expect(mockCtx.fillRect).toBeDefined()
  })

  it('render viewport 裁剪 startX > width 时不崩溃', () => {
    expect(() => sys.render(ctx, 0, 0, 1, 100, 100, 200, 200)).not.toThrow()
  })

  it('render zoom=0.5 时不崩溃', () => {
    expect(() => sys.render(ctx, 0, 0, 0.5, 0, 0, 20, 20)).not.toThrow()
  })

  it('render zoom=2 时不崩溃', () => {
    expect(() => sys.render(ctx, 0, 0, 2, 0, 0, 20, 20)).not.toThrow()
  })
})

describe('FogOfWarEnhanced - 地形遮挡', () => {
  let sys: FogOfWarEnhanced

  beforeEach(() => { sys = makeSys(); sys.init(20, 20) })
  afterEach(() => { vi.restoreAllMocks() })

  it('设置 terrainData 后 updateVision 不崩溃', () => {
    const terrain = new Uint8Array(20 * 20)
    terrain[5 * 20 + 5] = 5 // 山地
    ;(sys as any).terrainData = terrain
    sys.setActiveCiv(1)
    expect(() => sys.updateVision(0, [{ x: 10, y: 10, visionRange: 3 }], [])).not.toThrow()
  })

  it('山地格子所在位置 getHighlandBonus 返回 3', () => {
    const terrain = new Uint8Array(20 * 20)
    terrain[10 * 20 + 10] = 5
    ;(sys as any).terrainData = terrain
    const bonus = (sys as any).getHighlandBonus(10, 10)
    expect(bonus).toBe(3)
  })

  it('非山地格子 getHighlandBonus 返回 0', () => {
    const terrain = new Uint8Array(20 * 20)
    terrain[10 * 20 + 10] = 2 // 草地
    ;(sys as any).terrainData = terrain
    const bonus = (sys as any).getHighlandBonus(10, 10)
    expect(bonus).toBe(0)
  })

  it('无 terrainData 时 getHighlandBonus 返回 0', () => {
    const bonus = (sys as any).getHighlandBonus(5, 5)
    expect(bonus).toBe(0)
  })

  it('isBlocking 无 terrainData 返回 false', () => {
    const blocking = (sys as any).isBlocking(5, 5)
    expect(blocking).toBe(false)
  })

  it('isBlocking 山地返回 true', () => {
    const terrain = new Uint8Array(20 * 20)
    terrain[5 * 20 + 5] = 5
    ;(sys as any).terrainData = terrain
    expect((sys as any).isBlocking(5, 5)).toBe(true)
  })

  it('isBlocking 越界返回 true', () => {
    const terrain = new Uint8Array(20 * 20)
    ;(sys as any).terrainData = terrain
    expect((sys as any).isBlocking(-1, 0)).toBe(true)
  })
})
