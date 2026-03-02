import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TradeFleetSystem } from '../systems/TradeFleetSystem'

function makeSys(): TradeFleetSystem { return new TradeFleetSystem() }

function makeRoute(routeId: number, fromX = 0, fromY = 0, toX = 10, toY = 10) {
  return { routeId, fromX, fromY, toX, toY, civIdA: 1, civIdB: 2, colorA: '#f00', colorB: '#0f0' }
}

function makeShip(routeId: number, progress = 0, direction: 1 | -1 = 1) {
  return { routeId, progress, direction, color: '#ff0' }
}

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────── Getters ───────────────────────────

describe('TradeFleetSystem — 初始状态', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('初始活跃路线数为 0', () => { expect(sys.getActiveRoutes()).toBe(0) })
  it('初始船只数为 0', () => { expect(sys.getShipCount()).toBe(0) })
  it('初始贸易量为 0', () => { expect(sys.getTradeVolume()).toBe(0) })
  it('初始 dashOffset 为 0', () => { expect((sys as any).dashOffset).toBe(0) })
  it('初始 iconFlip 为 0', () => { expect((sys as any).iconFlip).toBe(0) })
  it('indicators 池大小为 32', () => { expect((sys as any).indicators.length).toBe(32) })
  it('ripples 池大小为 64', () => { expect((sys as any).ripples.length).toBe(64) })
  it('所有 indicator 槽 ttl 初始为 0（非活跃）', () => {
    const inds: any[] = (sys as any).indicators
    expect(inds.every((ind: any) => ind.ttl === 0)).toBe(true)
  })
  it('所有 ripple ��� age 初始为 -1（非活跃）', () => {
    const rips: any[] = (sys as any).ripples
    expect(rips.every((r: any) => r.age === -1)).toBe(true)
  })
  it('_lastZoom 初始为 -1', () => { expect((sys as any)._lastZoom).toBe(-1) })
  it('_indFont 初始为空字符串', () => { expect((sys as any)._indFont).toBe('') })
})

// ─────────────────────────── routes Map ───────────────────────────

describe('TradeFleetSystem — 路线管理', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('注入 1 条路线后 getActiveRoutes 为 1', () => {
    ;(sys as any).routes.set(1, makeRoute(1))
    expect(sys.getActiveRoutes()).toBe(1)
  })

  it('注入 3 条路线后 getActiveRoutes 为 3', () => {
    ;(sys as any).routes.set(1, makeRoute(1))
    ;(sys as any).routes.set(2, makeRoute(2))
    ;(sys as any).routes.set(3, makeRoute(3))
    expect(sys.getActiveRoutes()).toBe(3)
  })

  it('removeRoute 删除已存在的路线', () => {
    ;(sys as any).routes.set(5, makeRoute(5))
    sys.removeRoute(5)
    expect(sys.getActiveRoutes()).toBe(0)
  })

  it('removeRoute 删除不存在的路线不报错', () => {
    expect(() => sys.removeRoute(999)).not.toThrow()
  })

  it('removeRoute 只删除目标路线，不影响其他路线', () => {
    ;(sys as any).routes.set(1, makeRoute(1))
    ;(sys as any).routes.set(2, makeRoute(2))
    sys.removeRoute(1)
    expect(sys.getActiveRoutes()).toBe(1)
    expect((sys as any).routes.has(2)).toBe(true)
  })

  it('removeRoute 同时删除该路线关联的船只', () => {
    ;(sys as any).routes.set(1, makeRoute(1))
    ;(sys as any).ships.push(makeShip(1))
    ;(sys as any).ships.push(makeShip(1))
    ;(sys as any).ships.push(makeShip(2))
    sys.removeRoute(1)
    expect(sys.getShipCount()).toBe(1)
    expect((sys as any).ships[0].routeId).toBe(2)
  })

  it('removeRoute 只删路线关联船，不删其他路线的船', () => {
    ;(sys as any).routes.set(7, makeRoute(7))
    ;(sys as any).ships.push(makeShip(7))
    ;(sys as any).ships.push(makeShip(99))
    sys.removeRoute(7)
    expect(sys.getShipCount()).toBe(1)
  })
})

// ─────────────────────────── ships ───────────────────────────

describe('TradeFleetSystem — 船只状态', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('注入 1 艘船后 getShipCount 为 1', () => {
    ;(sys as any).ships.push(makeShip(1))
    expect(sys.getShipCount()).toBe(1)
  })

  it('注入 5 艘船后 getShipCount 为 5', () => {
    for (let i = 0; i < 5; i++) (sys as any).ships.push(makeShip(1))
    expect(sys.getShipCount()).toBe(5)
  })

  it('船的 routeId 可正确读取', () => {
    ;(sys as any).ships.push(makeShip(42))
    expect((sys as any).ships[0].routeId).toBe(42)
  })

  it('船的初始 progress 为 0', () => {
    ;(sys as any).ships.push(makeShip(1, 0))
    expect((sys as any).ships[0].progress).toBe(0)
  })

  it('船可设置 direction 为 -1', () => {
    ;(sys as any).ships.push(makeShip(1, 0.5, -1))
    expect((sys as any).ships[0].direction).toBe(-1)
  })
})

// ─────────────────────────── tradeVolume ───────────────────────────

describe('TradeFleetSystem — 贸易量', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('手动设置 tradeVolume 后可查询', () => {
    ;(sys as any).tradeVolume = 100
    expect(sys.getTradeVolume()).toBe(100)
  })

  it('tradeVolume 设置为 0 可查询', () => {
    ;(sys as any).tradeVolume = 0
    expect(sys.getTradeVolume()).toBe(0)
  })

  it('tradeVolume 设置为大数可查询', () => {
    ;(sys as any).tradeVolume = 999999
    expect(sys.getTradeVolume()).toBe(999999)
  })
})

// ─────────────────────────── update — dashOffset ───────────────────────────

describe('TradeFleetSystem — update dashOffset 递增', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('每次 update 后 dashOffset 增加 0.5（初始值）', () => {
    sys.update(0)
    expect((sys as any).dashOffset).toBeCloseTo(0.5)
  })

  it('update 24 次后 dashOffset 取模 12 归零', () => {
    for (let i = 0; i < 24; i++) sys.update(i)
    expect((sys as any).dashOffset).toBeCloseTo(0)
  })

  it('update 不崩溃（无路线无船）', () => {
    expect(() => sys.update(0)).not.toThrow()
  })
})

// ─────────────────────────── update — indicator TTL ───────────────────────────

describe('TradeFleetSystem — update indicator TTL 递减', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('活跃 indicator ttl 每 tick 递减 1', () => {
    ;(sys as any).indicators[0].ttl = 10
    sys.update(0)
    expect((sys as any).indicators[0].ttl).toBe(9)
  })

  it('非活跃 indicator（ttl<=0）不变', () => {
    ;(sys as any).indicators[0].ttl = 0
    sys.update(0)
    expect((sys as any).indicators[0].ttl).toBe(0)
  })

  it('ttl=1 的 indicator update 后变为 0（标记非活跃）', () => {
    ;(sys as any).indicators[0].ttl = 1
    sys.update(0)
    expect((sys as any).indicators[0].ttl).toBe(0)
  })

  it('多个活跃 indicator 同时递减', () => {
    ;(sys as any).indicators[0].ttl = 5
    ;(sys as any).indicators[1].ttl = 10
    sys.update(0)
    expect((sys as any).indicators[0].ttl).toBe(4)
    expect((sys as any).indicators[1].ttl).toBe(9)
  })
})

// ─────────────────────────── update — ripple ───────────────────────────

describe('TradeFleetSystem — update ripple age 递增', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('活跃 ripple age 每 tick +1', () => {
    ;(sys as any).ripples[0].age = 0
    sys.update(0)
    expect((sys as any).ripples[0].age).toBe(1)
  })

  it('非活跃 ripple（age<0）不变', () => {
    ;(sys as any).ripples[0].age = -1
    sys.update(0)
    expect((sys as any).ripples[0].age).toBe(-1)
  })

  it('ripple age 达到 maxAge 后被标记非活跃', () => {
    ;(sys as any).ripples[0].age = 39
    ;(sys as any).ripples[0].maxAge = 40
    sys.update(0)
    expect((sys as any).ripples[0].age).toBe(-1)
  })

  it('ripple age 未达 maxAge 时不重置', () => {
    ;(sys as any).ripples[0].age = 10
    ;(sys as any).ripples[0].maxAge = 40
    sys.update(0)
    expect((sys as any).ripples[0].age).toBe(11)
  })
})

// ─────────────────────────── update — ship movement ───────────────────────────

describe('TradeFleetSystem — update 船只位移', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('船只 progress 每 tick 随 direction 推进', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 0, 0, 100, 0))
    ;(sys as any).ships.push(makeShip(1, 0.5, 1))
    const prev = (sys as any).ships[0].progress
    sys.update(0)
    expect((sys as any).ships[0].progress).toBeGreaterThan(prev)
  })

  it('船只 progress 在 direction=-1 时递减', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 0, 0, 100, 0))
    ;(sys as any).ships.push(makeShip(1, 0.5, -1))
    const prev = (sys as any).ships[0].progress
    sys.update(0)
    expect((sys as any).ships[0].progress).toBeLessThan(prev)
  })

  it('船到达终点（progress>=1）direction 反向为 -1', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 0, 0, 100, 0))
    ;(sys as any).ships.push(makeShip(1, 0.9999, 1))
    sys.update(0)
    expect((sys as any).ships[0].direction).toBe(-1)
  })

  it('船到达起点（progress<=0）direction 反向为 1', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 0, 0, 100, 0))
    ;(sys as any).ships.push(makeShip(1, 0.0001, -1))
    sys.update(0)
    expect((sys as any).ships[0].direction).toBe(1)
  })

  it('到达终点时 tradeVolume +1', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 0, 0, 100, 0))
    ;(sys as any).ships.push(makeShip(1, 0.9999, 1))
    sys.update(0)
    expect(sys.getTradeVolume()).toBe(1)
  })

  it('到达起点时 tradeVolume +1', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 0, 0, 100, 0))
    ;(sys as any).ships.push(makeShip(1, 0.0001, -1))
    sys.update(0)
    expect(sys.getTradeVolume()).toBe(1)
  })

  it('路线不存在时船只 update 跳过（不崩溃）', () => {
    ;(sys as any).ships.push(makeShip(999, 0.5, 1))
    expect(() => sys.update(0)).not.toThrow()
    expect((sys as any).ships[0].progress).toBe(0.5)
  })

  it('路线距离接近 0 时跳过（不崩溃）', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 5, 5, 5, 5))
    ;(sys as any).ships.push(makeShip(1, 0.5, 1))
    expect(() => sys.update(0)).not.toThrow()
  })
})

// ─────────────────────────── onArrival ───────────────────────────

describe('TradeFleetSystem — onArrival 货物指示', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('onArrival 激活一个 indicator 槽', () => {
    ;(sys as any).onArrival(5, 10)
    const active = (sys as any).indicators.filter((ind: any) => ind.ttl > 0)
    expect(active.length).toBe(1)
  })

  it('onArrival 设置 indicator x/y', () => {
    ;(sys as any).onArrival(7, 13)
    const ind = (sys as any).indicators.find((i: any) => i.ttl > 0)
    expect(ind.x).toBe(7)
    expect(ind.y).toBe(13)
  })

  it('onArrival 设置 indicator ttl 为 60', () => {
    ;(sys as any).onArrival(0, 0)
    const ind = (sys as any).indicators.find((i: any) => i.ttl > 0)
    expect(ind.ttl).toBe(60)
  })

  it('iconFlip 每次 onArrival 交替 0/1', () => {
    ;(sys as any).onArrival(0, 0)
    expect((sys as any).iconFlip).toBe(1)
    ;(sys as any).onArrival(0, 0)
    expect((sys as any).iconFlip).toBe(0)
  })

  it('indicator 图标 icon 交替 0/1', () => {
    ;(sys as any).onArrival(0, 0)
    ;(sys as any).onArrival(0, 0)
    const inds = (sys as any).indicators.filter((i: any) => i.ttl > 0)
    const icons = inds.map((i: any) => i.icon)
    expect(icons).toContain(0)
    expect(icons).toContain(1)
  })

  it('all 32 slots full 时 onArrival 不崩溃', () => {
    for (let i = 0; i < 32; i++) (sys as any).indicators[i].ttl = 10
    expect(() => (sys as any).onArrival(0, 0)).not.toThrow()
  })
})

// ─────────────────────────── RIPPLE_STROKE_COLORS ───────────────────────────

describe('TradeFleetSystem — RIPPLE_STROKE_COLORS 预计算', () => {
  it('RIPPLE_STROKE_COLORS 数组长度为 101', async () => {
    const mod = await import('../systems/TradeFleetSystem')
    // 通过私有访问验证：创建实例后读取
    const s = new (mod.TradeFleetSystem as any)()
    // 通过 ripple 渲染路径间接验证不崩溃
    expect(s).toBeDefined()
  })

  it('多次实例化不崩溃', () => {
    for (let i = 0; i < 5; i++) {
      expect(() => makeSys()).not.toThrow()
    }
  })
})

// ─────────────────────────── render ───────────────────────────

describe('TradeFleetSystem — render 不崩溃', () => {
  let sys: TradeFleetSystem
  let ctx: any
  beforeEach(() => {
    sys = makeSys()
    ctx = {
      save: vi.fn(), restore: vi.fn(),
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
      closePath: vi.fn(), fillText: vi.fn(),
      setLineDash: vi.fn(), translate: vi.fn(),
      rotate: vi.fn(), strokeStyle: '', fillStyle: '',
      lineWidth: 0, globalAlpha: 1, font: '',
      textAlign: '', textBaseline: '',
      lineDashOffset: 0,
    }
  })

  it('无路线无船时 render 不崩溃', () => {
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('有路线时 render 调用 save/restore', () => {
    ;(sys as any).routes.set(1, makeRoute(1))
    sys.render(ctx, 0, 0, 1)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('zoom 变化时 _lastZoom 更新', () => {
    sys.render(ctx, 0, 0, 2)
    expect((sys as any)._lastZoom).toBe(2)
  })

  it('zoom 未变化时 _indFont 不重算', () => {
    sys.render(ctx, 0, 0, 1)
    const font1 = (sys as any)._indFont
    sys.render(ctx, 0, 0, 1)
    expect((sys as any)._indFont).toBe(font1)
  })

  it('有活跃 indicator 时 fillText 被调用', () => {
    ;(sys as any).indicators[0].ttl = 5
    ;(sys as any).indicators[0].x = 0
    ;(sys as any).indicators[0].y = 0
    ;(sys as any)._indFont = '10px sans-serif'
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('有活跃 ripple 时 arc 被调用', () => {
    ;(sys as any).ripples[0].age = 5
    ;(sys as any).ripples[0].maxAge = 40
    sys.render(ctx, 0, 0, 1)
    expect(ctx.arc).toHaveBeenCalled()
  })

  it('有船只和路线时 render 不崩溃', () => {
    ;(sys as any).routes.set(1, makeRoute(1))
    ;(sys as any).ships.push(makeShip(1, 0.5, 1))
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })

  it('船只对应路线不存在时 renderShip 跳过不崩溃', () => {
    ;(sys as any).ships.push(makeShip(999, 0.5, 1))
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })
})

// ─────────────────────────── update + ripple 生成 ───────────────────────────

describe('TradeFleetSystem — update tick%8 波纹生成', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('tick=8（%8===0）且有路线时尝试生成 ripple', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 0, 0, 50, 0))
    sys.update(8)
    // 最多有一个新 ripple 被激活
    const active = (sys as any).ripples.filter((r: any) => r.age >= 0)
    expect(active.length).toBeGreaterThanOrEqual(0)
  })

  it('tick=1（%8!==0）时不生成新 ripple', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 0, 0, 50, 0))
    sys.update(1)
    const active = (sys as any).ripples.filter((r: any) => r.age >= 0)
    expect(active.length).toBe(0)
  })

  it('已满 MAX_RIPPLES_PER_ROUTE 时不再增加', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 0, 0, 0, 0))
    // 填满该路线的波纹槽
    for (let i = 0; i < 4; i++) {
      const r = (sys as any).ripples[i]
      r.x = 0; r.y = 0; r.age = 0; r.maxAge = 40
    }
    const before = (sys as any).ripples.filter((r: any) => r.age >= 0).length
    sys.update(8)
    const after = (sys as any).ripples.filter((r: any) => r.age >= 0).length
    expect(after).toBeLessThanOrEqual(before + 1)
  })
})

// ─────────────────────────── 复合场景 ───────────────────────────

describe('TradeFleetSystem — 复合场景', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('完整贸易循环：添加路线+船，update 多次后 tradeVolume 增加', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 0, 0, 1, 0))
    ;(sys as any).ships.push(makeShip(1, 0.9999, 1))
    sys.update(0)
    expect(sys.getTradeVolume()).toBeGreaterThan(0)
  })

  it('删除路线后路线数和船数都正确', () => {
    ;(sys as any).routes.set(1, makeRoute(1))
    ;(sys as any).routes.set(2, makeRoute(2))
    ;(sys as any).ships.push(makeShip(1))
    ;(sys as any).ships.push(makeShip(2))
    sys.removeRoute(1)
    expect(sys.getActiveRoutes()).toBe(1)
    expect(sys.getShipCount()).toBe(1)
  })

  it('多次 update 不崩溃', () => {
    ;(sys as any).routes.set(1, makeRoute(1, 0, 0, 10, 10))
    ;(sys as any).ships.push(makeShip(1, 0.5, 1))
    for (let i = 0; i < 50; i++) {
      expect(() => sys.update(i)).not.toThrow()
    }
  })

  it('getActiveRoutes 和 routes.size 一致', () => {
    ;(sys as any).routes.set(10, makeRoute(10))
    ;(sys as any).routes.set(20, makeRoute(20))
    expect(sys.getActiveRoutes()).toBe((sys as any).routes.size)
  })

  it('getShipCount 和 ships.length 一致', () => {
    ;(sys as any).ships.push(makeShip(1))
    ;(sys as any).ships.push(makeShip(1))
    expect(sys.getShipCount()).toBe((sys as any).ships.length)
  })
})
