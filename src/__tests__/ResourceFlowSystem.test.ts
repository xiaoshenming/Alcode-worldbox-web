import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ResourceFlowSystem } from '../systems/ResourceFlowSystem'

const PARTICLE_SPEED = 0.008
const BASE_PARTICLES_PER_ROUTE = 3
const PARTICLES_PER_AMOUNT = 0.5

function makeSys() { return new ResourceFlowSystem() }

function makeMockCtx() {
  return {
    fillStyle: '', strokeStyle: '', font: '', globalAlpha: 1, lineWidth: 1,
    beginPath: vi.fn(), fill: vi.fn(), stroke: vi.fn(), arc: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(),
    fillRect: vi.fn(), fillText: vi.fn(),
    roundRect: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 60 }),
    canvas: { width: 800, height: 600 },
  } as unknown as CanvasRenderingContext2D
}

// ── 初始状态 ─────────────────────────────────────────────
describe('ResourceFlowSystem 初始状态', () => {
  let sys: ResourceFlowSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('routes 初始为空', () => {
    expect((sys as any).routes).toHaveLength(0)
  })
  it('routeMap 初始为空 Map', () => {
    expect((sys as any).routeMap.size).toBe(0)
  })
  it('particles 初始预分配 4096 个', () => {
    expect((sys as any).particles).toHaveLength(4096)
  })
  it('所有粒子初始 active=false', () => {
    const all: any[] = (sys as any).particles
    expect(all.every((p: any) => p.active === false)).toBe(true)
  })
  it('nextRouteId 初始为 1', () => {
    expect((sys as any).nextRouteId).toBe(1)
  })
  it('hover.visible 初始为 false', () => {
    expect((sys as any).hover.visible).toBe(false)
  })
  it('mouseTracked 初始为 false', () => {
    expect((sys as any).mouseTracked).toBe(false)
  })
})

// ── addRoute ──────────────────────────────────────────────
describe('ResourceFlowSystem.addRoute', () => {
  let sys: ResourceFlowSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('addRoute 返回递增的 ID', () => {
    const id1 = sys.addRoute(0, 0, 10, 10, 'food', 50)
    const id2 = sys.addRoute(0, 0, 20, 20, 'wood', 30)
    expect(id2).toBe(id1 + 1)
  })
  it('addRoute 后 routes 数量增加', () => {
    sys.addRoute(0, 0, 10, 10, 'food', 50)
    expect((sys as any).routes).toHaveLength(1)
  })
  it('addRoute 后 routeMap 也增加', () => {
    const id = sys.addRoute(0, 0, 10, 10, 'food', 50)
    expect((sys as any).routeMap.has(id)).toBe(true)
  })
  it('addRoute 存储正确坐标', () => {
    const id = sys.addRoute(1, 2, 3, 4, 'gold', 100)
    const route = (sys as any).routes.find((r: any) => r.id === id)
    expect(route.fromX).toBe(1)
    expect(route.fromY).toBe(2)
    expect(route.toX).toBe(3)
    expect(route.toY).toBe(4)
  })
  it('addRoute 存储 resourceType', () => {
    const id = sys.addRoute(0, 0, 5, 5, 'ore', 20)
    const route = (sys as any).routes.find((r: any) => r.id === id)
    expect(route.resourceType).toBe('ore')
  })
  it('addRoute 存储 amount', () => {
    const id = sys.addRoute(0, 0, 5, 5, 'wood', 77)
    const route = (sys as any).routes.find((r: any) => r.id === id)
    expect(route.amount).toBe(77)
  })
  it('amount=0 时 particleCount 等于 BASE_PARTICLES_PER_ROUTE', () => {
    const id = sys.addRoute(0, 0, 5, 5, 'food', 0)
    const route = (sys as any).routes.find((r: any) => r.id === id)
    expect(route.particleCount).toBe(BASE_PARTICLES_PER_ROUTE)
  })
  it('amount=10 时 particleCount=3+5=8', () => {
    const id = sys.addRoute(0, 0, 5, 5, 'food', 10)
    const route = (sys as any).routes.find((r: any) => r.id === id)
    expect(route.particleCount).toBe(Math.min(
      Math.floor(BASE_PARTICLES_PER_ROUTE + 10 * PARTICLES_PER_AMOUNT), 60
    ))
  })
  it('amount 很大时 particleCount 上限为 60', () => {
    const id = sys.addRoute(0, 0, 5, 5, 'gold', 10000)
    const route = (sys as any).routes.find((r: any) => r.id === id)
    expect(route.particleCount).toBe(60)
  })
  it('addRoute 后有粒子被激活', () => {
    sys.addRoute(0, 0, 100, 100, 'food', 50)
    const active = (sys as any).particles.filter((p: any) => p.active)
    expect(active.length).toBeGreaterThan(0)
  })
  it('连续添加多条路线', () => {
    sys.addRoute(0, 0, 10, 10, 'food', 10)
    sys.addRoute(10, 10, 20, 20, 'wood', 10)
    sys.addRoute(20, 20, 30, 30, 'ore', 10)
    expect((sys as any).routes).toHaveLength(3)
  })
})

// ── removeRoute ───────────────────────────────────────────
describe('ResourceFlowSystem.removeRoute', () => {
  let sys: ResourceFlowSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('removeRoute 后 routes 数量减少', () => {
    const id = sys.addRoute(0, 0, 10, 10, 'food', 50)
    sys.removeRoute(id)
    expect((sys as any).routes).toHaveLength(0)
  })
  it('removeRoute 后 routeMap 中不再有该 ID', () => {
    const id = sys.addRoute(0, 0, 10, 10, 'food', 50)
    sys.removeRoute(id)
    expect((sys as any).routeMap.has(id)).toBe(false)
  })
  it('removeRoute 使相关粒子 active=false', () => {
    const id = sys.addRoute(0, 0, 100, 100, 'food', 20)
    sys.removeRoute(id)
    const leaked = (sys as any).particles.filter((p: any) => p.active && p.routeId === id)
    expect(leaked).toHaveLength(0)
  })
  it('removeRoute 不存在的 ID 不崩溃', () => {
    expect(() => sys.removeRoute(9999)).not.toThrow()
  })
  it('removeRoute 只移除指定路线', () => {
    const id1 = sys.addRoute(0, 0, 10, 10, 'food', 5)
    const id2 = sys.addRoute(10, 10, 20, 20, 'wood', 5)
    sys.removeRoute(id1)
    expect((sys as any).routes).toHaveLength(1)
    expect((sys as any).routes[0].id).toBe(id2)
  })
  it('重复 removeRoute 同一 ID 不崩溃', () => {
    const id = sys.addRoute(0, 0, 10, 10, 'ore', 10)
    sys.removeRoute(id)
    expect(() => sys.removeRoute(id)).not.toThrow()
  })
})

// ── update ────────────────────────────────────────────────
describe('ResourceFlowSystem.update', () => {
  let sys: ResourceFlowSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 后活跃粒子的 t 增大', () => {
    sys.addRoute(0, 0, 100, 100, 'food', 5)
    const p = (sys as any).particles.find((pp: any) => pp.active)
    const oldT = p.t
    sys.update(1)
    expect(p.t).toBeGreaterThan(oldT)
  })
  it('粒子 t >= 1 时循环回绕', () => {
    sys.addRoute(0, 0, 100, 100, 'food', 5)
    const p = (sys as any).particles.find((pp: any) => pp.active)
    p.t = 0.999
    p.speed = 0.01
    sys.update(1)
    expect(p.t).toBeLessThan(1)
  })
  it('inactive 粒子 update 后 t 不变', () => {
    const p = (sys as any).particles[0]
    p.active = false
    p.t = 0.5
    sys.update(1)
    expect(p.t).toBe(0.5)
  })
  it('update 多次粒子 t 持续推进', () => {
    sys.addRoute(0, 0, 100, 100, 'food', 5)
    const p = (sys as any).particles.find((pp: any) => pp.active)
    p.t = 0
    p.speed = PARTICLE_SPEED
    sys.update(1)
    sys.update(2)
    expect(p.t).toBeCloseTo(PARTICLE_SPEED * 2, 10)
  })
  it('无路线时 update 不崩溃', () => {
    expect(() => sys.update(1)).not.toThrow()
  })
})

// ── findRoute (内部) ──────────────────────────────────────
describe('ResourceFlowSystem findRoute 内部', () => {
  let sys: ResourceFlowSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('存在路线时 findRoute 返回正确路线', () => {
    const id = sys.addRoute(1, 2, 3, 4, 'gold', 10)
    const route = (sys as any).findRoute(id)
    expect(route).not.toBeNull()
    expect(route.id).toBe(id)
  })
  it('不存在路线时 findRoute 返回 null', () => {
    expect((sys as any).findRoute(9999)).toBeNull()
  })
  it('removeRoute 后 findRoute 返回 null', () => {
    const id = sys.addRoute(0, 0, 5, 5, 'wood', 10)
    sys.removeRoute(id)
    expect((sys as any).findRoute(id)).toBeNull()
  })
})

// ── render 不崩溃 ─────────────────────────────────────────
describe('ResourceFlowSystem.render 不崩溃', () => {
  let sys: ResourceFlowSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无路线时 render 不崩溃', () => {
    const ctx = makeMockCtx()
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })
  it('有 food 路线时 render 不崩溃', () => {
    const ctx = makeMockCtx()
    sys.addRoute(0, 0, 100, 100, 'food', 20)
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })
  it('有 wood 路线时 render 调用 stroke', () => {
    const ctx = makeMockCtx()
    sys.addRoute(0, 0, 100, 100, 'wood', 20)
    sys.render(ctx, 0, 0, 1)
    expect(ctx.stroke).toHaveBeenCalled()
  })
  it('有 ore 路线时 render 不崩溃', () => {
    const ctx = makeMockCtx()
    sys.addRoute(0, 0, 100, 100, 'ore', 20)
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })
  it('有 gold 路线时 render 不崩溃', () => {
    const ctx = makeMockCtx()
    sys.addRoute(0, 0, 100, 100, 'gold', 20)
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })
  it('未知资源类型时 render 不崩溃', () => {
    const ctx = makeMockCtx()
    sys.addRoute(0, 0, 100, 100, 'unknown', 10)
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })
  it('render 后 hover.visible=false（无鼠标跟踪）', () => {
    const ctx = makeMockCtx()
    sys.addRoute(0, 0, 100, 100, 'food', 10)
    sys.render(ctx, 0, 0, 1)
    expect((sys as any).hover.visible).toBe(false)
  })
  it('多条路线 render 不崩溃', () => {
    const ctx = makeMockCtx()
    sys.addRoute(0, 0, 50, 50, 'food', 10)
    sys.addRoute(50, 50, 100, 100, 'wood', 10)
    sys.addRoute(100, 100, 200, 200, 'ore', 10)
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })
  it('zoom=0.5 时 render 不崩溃', () => {
    const ctx = makeMockCtx()
    sys.addRoute(0, 0, 100, 100, 'gold', 10)
    expect(() => sys.render(ctx, 0, 0, 0.5)).not.toThrow()
  })
  it('zoom=2 时 render 不崩溃', () => {
    const ctx = makeMockCtx()
    sys.addRoute(0, 0, 100, 100, 'food', 10)
    expect(() => sys.render(ctx, 0, 0, 2)).not.toThrow()
  })
})

// ── 粒子分配 ─────────────────────────────────────────────
describe('ResourceFlowSystem 粒子分配', () => {
  let sys: ResourceFlowSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('添加路线后活跃粒子 routeId 与路线 ID 匹配', () => {
    const id = sys.addRoute(0, 0, 100, 100, 'food', 10)
    const linked = (sys as any).particles.filter((p: any) => p.active && p.routeId === id)
    expect(linked.length).toBeGreaterThan(0)
  })
  it('粒子 speed 在合理范围内', () => {
    sys.addRoute(0, 0, 100, 100, 'food', 10)
    const p = (sys as any).particles.find((pp: any) => pp.active)
    expect(p.speed).toBeGreaterThanOrEqual(PARTICLE_SPEED)
    expect(p.speed).toBeLessThan(PARTICLE_SPEED + 0.004 + 0.001)
  })
  it('粒子 t 初始值在 [0, 1) 范围内', () => {
    sys.addRoute(0, 0, 100, 100, 'food', 10)
    const active = (sys as any).particles.filter((p: any) => p.active)
    for (const p of active) {
      expect(p.t).toBeGreaterThanOrEqual(0)
      expect(p.t).toBeLessThan(1)
    }
  })
  it('删除路线后粒子池被回收', () => {
    const id = sys.addRoute(0, 0, 100, 100, 'food', 10)
    const beforeCount = (sys as any).particles.filter((p: any) => p.active).length
    sys.removeRoute(id)
    const afterCount = (sys as any).particles.filter((p: any) => p.active).length
    expect(afterCount).toBeLessThan(beforeCount)
  })
})
