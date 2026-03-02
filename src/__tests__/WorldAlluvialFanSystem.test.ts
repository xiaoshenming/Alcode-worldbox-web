import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAlluvialFanSystem } from '../systems/WorldAlluvialFanSystem'
import type { AlluvialFan } from '../systems/WorldAlluvialFanSystem'

// 常量镜像
const CHECK_INTERVAL = 2700
const MAX_FANS = 20
const CUTOFF_OFFSET = 90000

let nextId = 1
function makeSys(): WorldAlluvialFanSystem { return new WorldAlluvialFanSystem() }
function makeFan(overrides: Partial<AlluvialFan> = {}): AlluvialFan {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    radius: 6,
    sedimentDepth: 10,
    channelCount: 4,
    fertility: 40,
    waterFlow: 20,
    gravelContent: 40,
    tick: 0,
    ...overrides,
  }
}

// world mock：getTile返回5（MOUNTAIN）→ tile !== SAND(2) && tile !== GRASS(3) → 不spawn
const makeWorld = (tile = 5) => ({ width: 200, height: 200, getTile: () => tile }) as any
const em = {} as any

describe('WorldAlluvialFanSystem', () => {
  let sys: WorldAlluvialFanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ────────────────────────────────
  it('初始fans数组为空', () => {
    expect((sys as any).fans).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── CHECK_INTERVAL节流 ───────────────────────
  it('tick < CHECK_INTERVAL时不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('多次update后lastCheck持续递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick在两个CHECK_INTERVAL之间时不再次更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  // ── spawn阻止（tile=MOUNTAIN不符合spawn条件）──
  it('getTile返回MOUNTAIN时不spawn新fan', () => {
    // FORM_CHANCE=0.002 < 1.0，random=0.001 < FORM_CHANCE → 走到spawn判断
    // 但tile=5=MOUNTAIN不满足SAND||GRASS → 不spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), em, CHECK_INTERVAL)
    expect((sys as any).fans).toHaveLength(0)
  })

  // ── 字段更新（每帧update fans） ──────────────
  it('sedimentDepth每次update增加0.003', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fans.push(makeFan({ sedimentDepth: 10, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // cutoff = CHECK_INTERVAL - 90000 < 0 → 不删除；字段更新发生
    expect((sys as any).fans[0].sedimentDepth).toBeCloseTo(10.003, 5)
  })

  it('sedimentDepth最大不超过35', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fans.push(makeFan({ sedimentDepth: 35, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).fans[0].sedimentDepth).toBe(35)
  })

  it('fertility每次update增加0.01', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fans.push(makeFan({ fertility: 40, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).fans[0].fertility).toBeCloseTo(40.01, 5)
  })

  it('fertility最大不超过80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fans.push(makeFan({ fertility: 80, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).fans[0].fertility).toBe(80)
  })

  it('gravelContent每次update减少0.002', () => {
    // Math.random=0.9，waterFlow更新为 20+(0.9-0.5)*0.4=20.16，不影响gravelContent
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fans.push(makeFan({ gravelContent: 40, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).fans[0].gravelContent).toBeCloseTo(39.998, 4)
  })

  it('gravelContent最低不低于10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fans.push(makeFan({ gravelContent: 10, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).fans[0].gravelContent).toBe(10)
  })

  it('waterFlow在最小3和最大50之间（random=0.9时+方向浮动）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fans.push(makeFan({ waterFlow: 20, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // waterFlow = max(3, min(50, 20 + (0.9-0.5)*0.4)) = max(3, min(50, 20.16)) = 20.16
    expect((sys as any).fans[0].waterFlow).toBeCloseTo(20.16, 4)
  })

  it('waterFlow最低不低于3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).fans.push(makeFan({ waterFlow: 3, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // waterFlow = max(3, min(50, 3+(0-0.5)*0.4)) = max(3, 2.8) = 3
    expect((sys as any).fans[0].waterFlow).toBe(3)
  })

  // ── cleanup（过期fan删除）─────────────────────
  it('tick < cutoff的fan被删除（zone.tick=0，total=100000，cutoff=10000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fans.push(makeFan({ tick: 0 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).fans).toHaveLength(0)
  })

  it('tick >= cutoff的fan保留（zone.tick=95000，total=100000，cutoff=10000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fans.push(makeFan({ tick: 95000 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).fans).toHaveLength(1)
  })

  it('混合过期与未过期：只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 100000 - 90000 = 10000
    ;(sys as any).fans.push(makeFan({ tick: 0 }))     // 0 < 10000 → 删
    ;(sys as any).fans.push(makeFan({ tick: 50000 })) // 50000 >= 10000 → 保留
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).fans).toHaveLength(1)
    expect((sys as any).fans[0].tick).toBe(50000)
  })

  // ── MAX_FANS上限 ─────────────────────────────
  it('fans达到MAX_FANS时不再spawn（即使通过random条件）', () => {
    for (let i = 0; i < MAX_FANS; i++) (sys as any).fans.push(makeFan({ tick: 99999 }))
    // random=0.001 < FORM_CHANCE=0.002 → 尝试spawn，但 fans.length >= MAX_FANS → 短路
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), em, 100000)
    // cutoff=10000，fan.tick=99999>10000 → 保留；不新增
    expect((sys as any).fans).toHaveLength(MAX_FANS)
  })

  // ── 手动注入 ────────────────────────────────
  it('手动注入fan后长度正确', () => {
    ;(sys as any).fans.push(makeFan())
    expect((sys as any).fans).toHaveLength(1)
  })

  it('手动注入多个fan后长度正确', () => {
    for (let i = 0; i < 3; i++) (sys as any).fans.push(makeFan())
    expect((sys as any).fans).toHaveLength(3)
  })

  // ── fan字段结构 ──────────────────────────────
  it('fan含所有必需字段', () => {
    const f = makeFan()
    expect(typeof f.id).toBe('number')
    expect(typeof f.x).toBe('number')
    expect(typeof f.y).toBe('number')
    expect(typeof f.radius).toBe('number')
    expect(typeof f.sedimentDepth).toBe('number')
    expect(typeof f.channelCount).toBe('number')
    expect(typeof f.fertility).toBe('number')
    expect(typeof f.waterFlow).toBe('number')
    expect(typeof f.gravelContent).toBe('number')
    expect(typeof f.tick).toBe('number')
  })
})
