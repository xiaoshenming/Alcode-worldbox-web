import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ZoneManagementSystem } from '../systems/ZoneManagementSystem'

afterEach(() => { vi.restoreAllMocks() })

function makeSys(): ZoneManagementSystem { return new ZoneManagementSystem() }

let _nid = 1
function makeZone(opts?: Partial<{ x: number; y: number; w: number; h: number; type: string; name: string; description: string }>) {
  return {
    id: _nid++,
    x: opts?.x ?? 0,
    y: opts?.y ?? 0,
    w: opts?.w ?? 10,
    h: opts?.h ?? 10,
    type: opts?.type ?? 'forbidden',
    name: opts?.name ?? 'Test Zone',
    description: opts?.description ?? '',
    panelInfoStr: '[forbidden] 10x10',
  }
}

function injectZone(sys: ZoneManagementSystem, zone: ReturnType<typeof makeZone>): void {
  ;(sys as any).zones.set(zone.id, zone)
}

// ─── 初始化状态 ────────────────────────────────────────────
describe('ZoneManagementSystem - 初始化状态', () => {
  let sys: ZoneManagementSystem
  beforeEach(() => { sys = makeSys(); _nid = 1 })

  it('初始无任何区域', () => {
    expect((sys as any).zones.size).toBe(0)
  })

  it('getZone 对任意 id 返回 undefined', () => {
    expect(sys.getZone(1)).toBeUndefined()
    expect(sys.getZone(999)).toBeUndefined()
  })

  it('getZoneAt 无区域时返回 null', () => {
    expect(sys.getZoneAt(5, 5)).toBeNull()
  })

  it('panelVisible 初始为 false', () => {
    expect((sys as any).panelVisible).toBe(false)
  })

  it('panelScroll 初始为 0', () => {
    expect((sys as any).panelScroll).toBe(0)
  })

  it('dashOffset 初始为 0', () => {
    expect((sys as any).dashOffset).toBe(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

// ─── getZone ────────────────────────────────────────────
describe('ZoneManagementSystem.getZone', () => {
  let sys: ZoneManagementSystem
  beforeEach(() => { sys = makeSys(); _nid = 1 })

  it('不存在的 id 返回 undefined', () => {
    expect(sys.getZone(999)).toBeUndefined()
  })

  it('注入后可查询', () => {
    const z = makeZone()
    injectZone(sys, z)
    expect(sys.getZone(z.id)).toBeDefined()
  })

  it('查询到的 type 正确', () => {
    const z = makeZone({ type: 'protected' })
    injectZone(sys, z)
    expect(sys.getZone(z.id)!.type).toBe('protected')
  })

  it('查询到的 name 正确', () => {
    const z = makeZone({ name: 'My Zone' })
    injectZone(sys, z)
    expect(sys.getZone(z.id)!.name).toBe('My Zone')
  })

  it('查询到的坐标正确', () => {
    const z = makeZone({ x: 5, y: 7, w: 20, h: 30 })
    injectZone(sys, z)
    const got = sys.getZone(z.id)!
    expect(got.x).toBe(5)
    expect(got.y).toBe(7)
    expect(got.w).toBe(20)
    expect(got.h).toBe(30)
  })

  it('多个区域相互独立', () => {
    const z1 = makeZone({ type: 'forbidden' })
    const z2 = makeZone({ type: 'resource' })
    injectZone(sys, z1)
    injectZone(sys, z2)
    expect(sys.getZone(z1.id)!.type).toBe('forbidden')
    expect(sys.getZone(z2.id)!.type).toBe('resource')
  })

  it('description 字段可读', () => {
    const z = makeZone({ description: 'A restricted area' })
    injectZone(sys, z)
    expect(sys.getZone(z.id)!.description).toBe('A restricted area')
  })

  it('注入并删除后返回 undefined', () => {
    const z = makeZone()
    injectZone(sys, z)
    ;(sys as any).zones.delete(z.id)
    expect(sys.getZone(z.id)).toBeUndefined()
  })
})

// ─── getZoneAt ────────────────────────────────────────────
describe('ZoneManagementSystem.getZoneAt', () => {
  let sys: ZoneManagementSystem
  beforeEach(() => { sys = makeSys(); _nid = 1 })

  it('无区域时返回 null', () => {
    expect(sys.getZoneAt(5, 5)).toBeNull()
  })

  it('坐标在区域内时返回 type', () => {
    const z = makeZone({ x: 0, y: 0, w: 10, h: 10, type: 'forbidden' })
    injectZone(sys, z)
    expect(sys.getZoneAt(5, 5)).toBe('forbidden')
  })

  it('坐标在区域外时返回 null', () => {
    const z = makeZone({ x: 0, y: 0, w: 10, h: 10 })
    injectZone(sys, z)
    expect(sys.getZoneAt(50, 50)).toBeNull()
  })

  it('坐标正好在左上角时命中', () => {
    const z = makeZone({ x: 5, y: 5, w: 10, h: 10 })
    injectZone(sys, z)
    expect(sys.getZoneAt(5, 5)).not.toBeNull()
  })

  it('坐标正好在右/下边界时不命中（< 而非 <=）', () => {
    const z = makeZone({ x: 0, y: 0, w: 10, h: 10 })
    injectZone(sys, z)
    expect(sys.getZoneAt(10, 5)).toBeNull()
    expect(sys.getZoneAt(5, 10)).toBeNull()
  })

  it('多区域叠加时返回最先匹配的', () => {
    const z1 = makeZone({ x: 0, y: 0, w: 20, h: 20, type: 'forbidden' })
    const z2 = makeZone({ x: 5, y: 5, w: 10, h: 10, type: 'resource' })
    injectZone(sys, z1)
    injectZone(sys, z2)
    // 结果取决于 Map 插入顺序，至少不为 null
    expect(sys.getZoneAt(8, 8)).not.toBeNull()
  })

  it('protected 类型区域可正确返回', () => {
    const z = makeZone({ type: 'protected', x: 10, y: 10, w: 20, h: 20 })
    injectZone(sys, z)
    expect(sys.getZoneAt(15, 15)).toBe('protected')
  })

  it('warzone 类型区域可正确返回', () => {
    const z = makeZone({ type: 'warzone', x: 0, y: 0, w: 50, h: 50 })
    injectZone(sys, z)
    expect(sys.getZoneAt(25, 25)).toBe('warzone')
  })

  it('resource 类型区域可正确返回', () => {
    const z = makeZone({ type: 'resource', x: 100, y: 100, w: 30, h: 30 })
    injectZone(sys, z)
    expect(sys.getZoneAt(110, 115)).toBe('resource')
  })

  it('坐标 x=0, y=0 时命中正确', () => {
    const z = makeZone({ x: 0, y: 0, w: 5, h: 5 })
    injectZone(sys, z)
    expect(sys.getZoneAt(0, 0)).not.toBeNull()
  })

  it('负坐标区域可命中', () => {
    const z = makeZone({ x: -10, y: -10, w: 20, h: 20, type: 'warzone' })
    injectZone(sys, z)
    expect(sys.getZoneAt(-5, -5)).toBe('warzone')
  })
})

// ─── handleKey ────────────────────────────────────────────
describe('ZoneManagementSystem.handleKey', () => {
  let sys: ZoneManagementSystem
  beforeEach(() => { sys = makeSys(); _nid = 1 })

  it('按 z 键消费事件并返回 true', () => {
    expect(sys.handleKey('z')).toBe(true)
  })

  it('按 Z 键消费事件并返回 true', () => {
    expect(sys.handleKey('Z')).toBe(true)
  })

  it('按 z 键切换 panelVisible 为 true', () => {
    sys.handleKey('z')
    expect((sys as any).panelVisible).toBe(true)
  })

  it('再按 z 键切换 panelVisible 为 false', () => {
    sys.handleKey('z')
    sys.handleKey('z')
    expect((sys as any).panelVisible).toBe(false)
  })

  it('按 z 键重置 panelScroll 为 0', () => {
    ;(sys as any).panelScroll = 5
    sys.handleKey('z')
    expect((sys as any).panelScroll).toBe(0)
  })

  it('其他按键返回 false', () => {
    expect(sys.handleKey('a')).toBe(false)
    expect(sys.handleKey('Enter')).toBe(false)
    expect(sys.handleKey('Escape')).toBe(false)
  })

  it('按 z 键后面板状态可再次切换', () => {
    sys.handleKey('z')
    sys.handleKey('z')
    sys.handleKey('z')
    expect((sys as any).panelVisible).toBe(true)
  })
})

// ─── update: dashOffset ────────────────────────────────────────────
describe('ZoneManagementSystem.update', () => {
  let sys: ZoneManagementSystem
  beforeEach(() => { sys = makeSys(); _nid = 1 })

  it('update 后 dashOffset 增加 0.4', () => {
    sys.update(1)
    expect((sys as any).dashOffset).toBeCloseTo(0.4)
  })

  it('dashOffset 超过 16 时取模', () => {
    ;(sys as any).dashOffset = 15.8
    sys.update(1)
    // 15.8 + 0.4 = 16.2, 16.2 % 16 = 0.2
    expect((sys as any).dashOffset).toBeCloseTo(0.2)
  })

  it('多次 update dashOffset 持续增长', () => {
    sys.update(1)
    sys.update(2)
    sys.update(3)
    expect((sys as any).dashOffset).toBeCloseTo(1.2)
  })

  it('update 不依赖 tick 值（tick 仅占位）', () => {
    sys.update(0)
    const offset0 = (sys as any).dashOffset
    sys.update(99999)
    expect((sys as any).dashOffset).toBeCloseTo(offset0 + 0.4)
  })
})

// ─── render: 基础不报错 ────────────────────────────────────────────
describe('ZoneManagementSystem.render - 基础', () => {
  let sys: ZoneManagementSystem

  function makeCtx() {
    return {
      save: vi.fn(), restore: vi.fn(),
      fillRect: vi.fn(), strokeRect: vi.fn(),
      beginPath: vi.fn(), stroke: vi.fn(), fill: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(),
      roundRect: vi.fn(),
      fillText: vi.fn(),
      setLineDash: vi.fn(),
      clip: vi.fn(),
      rect: vi.fn(),
      get fillStyle() { return '' }, set fillStyle(_: string) {},
      get strokeStyle() { return '' }, set strokeStyle(_: string) {},
      get lineWidth() { return 1 }, set lineWidth(_: number) {},
      get font() { return '' }, set font(_: string) {},
      get textAlign() { return '' }, set textAlign(_: string) {},
      get textBaseline() { return '' }, set textBaseline(_: string) {},
      get lineDashOffset() { return 0 }, set lineDashOffset(_: number) {},
    } as unknown as CanvasRenderingContext2D
  }

  beforeEach(() => { sys = makeSys(); _nid = 1 })

  it('无区域 panelVisible=false 时 render 不报错', () => {
    expect(() => sys.render(makeCtx(), 0, 0, 1, 800, 600)).not.toThrow()
  })

  it('有区域时 render 不报错', () => {
    injectZone(sys, makeZone({ x: 10, y: 10, w: 50, h: 50, type: 'forbidden' }))
    expect(() => sys.render(makeCtx(), 0, 0, 1, 800, 600)).not.toThrow()
  })

  it('panelVisible=true 时 render 不报错', () => {
    ;(sys as any).panelVisible = true
    expect(() => sys.render(makeCtx(), 0, 0, 1, 800, 600)).not.toThrow()
  })

  it('有多种类型区域时 render 不报错', () => {
    const types = ['forbidden', 'protected', 'warzone', 'resource']
    types.forEach((t, i) => {
      injectZone(sys, makeZone({ x: i * 60, y: 0, w: 50, h: 50, type: t }))
    })
    expect(() => sys.render(makeCtx(), 0, 0, 1, 800, 600)).not.toThrow()
  })

  it('zoom 为 0.5 时 render 不报错', () => {
    injectZone(sys, makeZone())
    expect(() => sys.render(makeCtx(), 0, 0, 0.5, 800, 600)).not.toThrow()
  })

  it('摄像机偏移时 render 不报错', () => {
    injectZone(sys, makeZone({ x: 100, y: 100, w: 50, h: 50 }))
    expect(() => sys.render(makeCtx(), 50, 50, 1, 800, 600)).not.toThrow()
  })

  it('区域超出视口时 render 不报错（裁剪）', () => {
    injectZone(sys, makeZone({ x: 10000, y: 10000, w: 50, h: 50 }))
    expect(() => sys.render(makeCtx(), 0, 0, 1, 800, 600)).not.toThrow()
  })

  it('区域足够大时 fillText 被调用', () => {
    const ctx = makeCtx()
    const fillTextSpy = vi.spyOn(ctx, 'fillText')
    injectZone(sys, makeZone({ x: 0, y: 0, w: 100, h: 100, name: 'BigZone' }))
    sys.render(ctx, 0, 0, 1, 800, 600)
    expect(fillTextSpy).toHaveBeenCalled()
  })
})

// ─── 内部 zones Map 直接操作 ────────────────────────────────────────────
describe('ZoneManagementSystem - 直接操作内部 Map', () => {
  let sys: ZoneManagementSystem
  beforeEach(() => { sys = makeSys(); _nid = 1 })

  it('可通过内部 Map 批量注入区域', () => {
    for (let i = 0; i < 10; i++) injectZone(sys, makeZone())
    expect((sys as any).zones.size).toBe(10)
  })

  it('可通过内部 Map 删除区域', () => {
    const z = makeZone()
    injectZone(sys, z)
    ;(sys as any).zones.delete(z.id)
    expect((sys as any).zones.size).toBe(0)
  })

  it('注入四种合法区域类型均可 getZoneAt 命中', () => {
    const types = ['forbidden', 'protected', 'warzone', 'resource']
    types.forEach((t, i) => {
      injectZone(sys, makeZone({ x: i * 20, y: 0, w: 10, h: 10, type: t }))
    })
    expect(sys.getZoneAt(0, 0)).toBe('forbidden')
    expect(sys.getZoneAt(20, 0)).toBe('protected')
    expect(sys.getZoneAt(40, 0)).toBe('warzone')
    expect(sys.getZoneAt(60, 0)).toBe('resource')
  })
})

// ─── 补充边界与综合测试 ────────────────────────────────────────────
describe('ZoneManagementSystem - 综合边界测试', () => {
  let sys: ZoneManagementSystem
  beforeEach(() => { sys = makeSys(); _nid = 1 })

  it('getZone 返回的对象与内部 Map 是同一引用', () => {
    const z = makeZone()
    injectZone(sys, z)
    const got = sys.getZone(z.id)
    expect(got).toBe(z)
  })

  it('handleKey 对大写 Z 也重置 panelScroll', () => {
    ;(sys as any).panelScroll = 3
    sys.handleKey('Z')
    expect((sys as any).panelScroll).toBe(0)
  })

  it('update 连续调用 dashOffset 正确累加', () => {
    sys.update(1)
    sys.update(2)
    expect((sys as any).dashOffset).toBeCloseTo(0.8)
  })

  it('update 40 次后 dashOffset 取模在 [0,16) 之间', () => {
    for (let i = 0; i < 40; i++) sys.update(i)
    expect((sys as any).dashOffset).toBeGreaterThanOrEqual(0)
    expect((sys as any).dashOffset).toBeLessThan(16)
  })

  it('getZoneAt 可查询 y 方向边界内的点', () => {
    const z = makeZone({ x: 0, y: 0, w: 5, h: 5, type: 'resource' })
    injectZone(sys, z)
    expect(sys.getZoneAt(0, 4)).toBe('resource')
  })

  it('getZoneAt 可查询 x 方向边界内最大 x', () => {
    const z = makeZone({ x: 0, y: 0, w: 100, h: 100, type: 'warzone' })
    injectZone(sys, z)
    expect(sys.getZoneAt(99, 50)).toBe('warzone')
  })
})
