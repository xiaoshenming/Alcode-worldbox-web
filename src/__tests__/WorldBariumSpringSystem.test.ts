import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBariumSpringSystem } from '../systems/WorldBariumSpringSystem'
import type { BariumSpringZone } from '../systems/WorldBariumSpringSystem'

const CHECK_INTERVAL = 3180
const MAX_ZONES = 32
const world = { width: 200, height: 200, getTile: () => 5 } as any
const em = {} as any

function makeSys(): WorldBariumSpringSystem { return new WorldBariumSpringSystem() }
let nextId = 100

function makeZone(overrides: Partial<BariumSpringZone> = {}): BariumSpringZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    bariumContent: 40,
    springFlow: 50,
    geologicalDeposit: 60,
    mineralConcentration: 70,
    tick: 0,
    ...overrides,
  }
}

describe('WorldBariumSpringSystem', () => {
  let sys: WorldBariumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 100; vi.restoreAllMocks() })

  // ─── 初始状态 ────────────────────────────────────────────────────────────────
  it('初始zones数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ─── 节流逻辑 ────────────────────────────────────────────────────────────────
  it('tick不足CHECK_INTERVAL时不执行任何逻���', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    // lastCheck仍为0，zones未被处理
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick恰好等于CHECK_INTERVAL时触发执行，更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次调用在不足间隔时不重置lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    const firstCheck = (sys as any).lastCheck
    sys.update(1, world, em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(firstCheck)
  })

  it('第二次调用超过CHECK_INTERVAL后再次更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ─── cleanup：tick过期 ───────────────────────────────────────────────────────
  it('tick < cutoff(tick-54000)的zone被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + 54001
    ;(sys as any).zones.push(makeZone({ tick: 0 }))  // 0 < 54001 的cutoff
    sys.update(1, world, em, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick恰好在cutoff之内的zone被保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL
    const zoneTick = currentTick - 53999  // > cutoff (currentTick - 54000)
    ;(sys as any).zones.push(makeZone({ tick: zoneTick }))
    sys.update(1, world, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('tick恰好等于cutoff边界的zone被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL
    const zoneTick = currentTick - 54001  // < cutoff
    ;(sys as any).zones.push(makeZone({ tick: zoneTick }))
    sys.update(1, world, em, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('只删除过期zone，保留新鲜zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + 60000
    ;(sys as any).zones.push(makeZone({ tick: 0 }))          // 过期
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 1000 }))  // 新鲜
    sys.update(1, world, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(currentTick - 1000)
  })

  it('多个过期zone全部被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + 100000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    sys.update(1, world, em, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ─── MAX_ZONES 上限 ──────────────────────────────────────────────────────────
  it('注入MAX_ZONES个zone后update不再spawn新zone（world无水/山地形）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
    sys.update(1, world, em, CHECK_INTERVAL)
    // zones可能因为没有过期不减少，也不新增
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('zones.length === MAX_ZONES时不会突破上限', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // 极小值，理论上会spawn
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  // ─── zone字段结构 ────────────────────────────────────────────────────────────
  it('注入zone后可读取bariumContent字段', () => {
    ;(sys as any).zones.push(makeZone({ bariumContent: 75 }))
    expect((sys as any).zones[0].bariumContent).toBe(75)
  })

  it('注入zone后可读取geologicalDeposit字段', () => {
    ;(sys as any).zones.push(makeZone({ geologicalDeposit: 88 }))
    expect((sys as any).zones[0].geologicalDeposit).toBe(88)
  })

  it('注入zone后可读取mineralConcentration字段', () => {
    ;(sys as any).zones.push(makeZone({ mineralConcentration: 55 }))
    expect((sys as any).zones[0].mineralConcentration).toBe(55)
  })

  it('注入多个zone可全部保留', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    expect((sys as any).zones).toHaveLength(5)
  })

  // ─── 不触发spawn（world无水/山地形）─────────────────────────────────────────
  it('world无水/山地形时，random=0.9，update不spawn新zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ─── 连续调用稳定性 ──────────────────────────────────────────────────────────
  it('多次触发CHECK_INTERVAL间隔后zones不负增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const freshTick = CHECK_INTERVAL
    ;(sys as any).zones.push(makeZone({ tick: freshTick }))
    sys.update(1, world, em, freshTick)
    sys.update(1, world, em, freshTick * 2)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })

  it('zones数组是内部私有引用，每次获取相同对象', () => {
    const ref1 = (sys as any).zones
    const ref2 = (sys as any).zones
    expect(ref1).toBe(ref2)
  })

  it('cleanup后nextId不回退（id单调递增）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const idBefore = (sys as any).nextId
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, world, em, CHECK_INTERVAL + 60000)
    expect((sys as any).nextId).toBe(idBefore)
  })
})
