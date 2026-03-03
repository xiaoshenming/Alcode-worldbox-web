import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAlluvialFanSystem } from '../systems/WorldAlluvialFanSystem'
import type { AlluvialFan } from '../systems/WorldAlluvialFanSystem'

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

  it('fans是数组类型', () => {
    expect(Array.isArray((sys as any).fans)).toBe(true)
  })

  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).fans.push(makeFan())
    expect((s2 as any).fans).toHaveLength(0)
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

  it('三次连续触发lastCheck正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })

  // ── spawn阻止（tile=MOUNTAIN不符合spawn条件）──
  it('getTile返回MOUNTAIN时不spawn新fan', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), em, CHECK_INTERVAL)
    expect((sys as any).fans).toHaveLength(0)
  })

  it('FORM_CHANCE(0.002)时random=0.9不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(3), em, CHECK_INTERVAL)
    expect((sys as any).fans).toHaveLength(0)
  })

  it('tile=SAND(2)+random=0.001时spawn fan', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
    expect((sys as any).fans).toHaveLength(1)
  })

  it('tile=GRASS(3)+random=0.001时spawn fan', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), em, CHECK_INTERVAL)
    expect((sys as any).fans).toHaveLength(1)
  })

  // ── 字段更新（每帧update fans） ──────────────
  it('sedimentDepth每次update增加0.003', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fans.push(makeFan({ sedimentDepth: 10, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
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
    expect((sys as any).fans[0].waterFlow).toBeCloseTo(20.16, 4)
  })

  it('waterFlow最低不低于3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).fans.push(makeFan({ waterFlow: 3, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).fans[0].waterFlow).toBe(3)
  })

  it('waterFlow最高不超过50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).fans.push(makeFan({ waterFlow: 50, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).fans[0].waterFlow).toBeLessThanOrEqual(50)
  })

  it('多个fans同时更新sedimentDepth', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).fans.push(makeFan({ sedimentDepth: 10 + i, tick: 99999 }))
    }
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    for (let i = 0; i < 3; i++) {
      expect((sys as any).fans[i].sedimentDepth).toBeCloseTo(10 + i + 0.003, 4)
    }
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
    ;(sys as any).fans.push(makeFan({ tick: 0 }))
    ;(sys as any).fans.push(makeFan({ tick: 50000 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).fans).toHaveLength(1)
    expect((sys as any).fans[0].tick).toBe(50000)
  })

  it('cutoff边界：fan.tick===cutoff时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 100000
    const cutoff = bigTick - CUTOFF_OFFSET  // 10000
    ;(sys as any).fans.push(makeFan({ tick: cutoff }))
    sys.update(1, makeWorld(), em, bigTick)
    expect((sys as any).fans).toHaveLength(1)
  })

  it('所有fan都过期时全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).fans.push(makeFan({ tick: 0 }))
    }
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).fans).toHaveLength(0)
  })

  // ── MAX_FANS上限 ─────────────────────────────
  it('fans达到MAX_FANS时不再spawn（即使通过random条件）', () => {
    for (let i = 0; i < MAX_FANS; i++) (sys as any).fans.push(makeFan({ tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), em, 100000)
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

  it('手动注入fan的字段可读取', () => {
    const f = makeFan({ sedimentDepth: 25, fertility: 60 })
    ;(sys as any).fans.push(f)
    expect((sys as any).fans[0].sedimentDepth).toBe(25)
    expect((sys as any).fans[0].fertility).toBe(60)
  })

  // ── 边界条件 ────────────────────────────────
  it('tick=0时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), em, 9999999)).not.toThrow()
  })

  it('fans为空时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), em, CHECK_INTERVAL)).not.toThrow()
  })
})
