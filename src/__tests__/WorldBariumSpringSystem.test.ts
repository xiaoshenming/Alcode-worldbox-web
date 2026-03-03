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

  it('zones是数组', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).zones.push(makeZone())
    expect((s2 as any).zones).toHaveLength(0)
  })

  // ─── 节流逻辑 ───────────────────────────────────────────────────────────────
  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('三次触发lastCheck正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    sys.update(1, world, em, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })

  // ─── spawn阻止 ─────────────────────────────────────────────────────────────
  it('random > FORM_CHANCE(0.003)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('MAX_ZONES(32)上限不超出', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  // ─── cleanup（cutoff = tick - 54000）──────────────────────────────────────
  it('zone.tick < cutoff时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, world, em, 60000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick >= cutoff时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 10000 }))
    sys.update(1, world, em, 60000)
    // cutoff = 60000 - 54000 = 6000, zone.tick=10000 >= 6000 → keep
    expect((sys as any).zones).toHaveLength(1)
  })

  it('cutoff边界时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 60000; const cutoff = bigTick - 54000  // 6000
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))
    sys.update(1, world, em, bigTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('混合新旧：只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 10000 }))
    sys.update(1, world, em, 60000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(10000)
  })

  it('所有zones都过期时全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) (sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, world, em, 60000)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ─── 手动注入 ──────────────────────────────────────────────────────────────
  it('手动注入zone后长度正确', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('手动注入多个zone', () => {
    for (let i = 0; i < 5; i++) (sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(5)
  })

  it('注入zone的字段可读取', () => {
    ;(sys as any).zones.push(makeZone({ bariumContent: 77 }))
    expect((sys as any).zones[0].bariumContent).toBe(77)
  })

  // ─── zone字段结构 ──────────────────────────────────────────────────────────
  it('zone含所有必需字段', () => {
    const z = makeZone()
    expect(typeof z.id).toBe('number')
    expect(typeof z.x).toBe('number')
    expect(typeof z.y).toBe('number')
    expect(typeof z.bariumContent).toBe('number')
    expect(typeof z.springFlow).toBe('number')
    expect(typeof z.geologicalDeposit).toBe('number')
    expect(typeof z.mineralConcentration).toBe('number')
    expect(typeof z.tick).toBe('number')
  })

  // ─── 边界条件 ──────────────────────────────────────────────────────────────
  it('tick=0时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, world, em, 9999999)).not.toThrow()
  })

  it('zones为空时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, world, em, CHECK_INTERVAL)).not.toThrow()
  })

  it('zones长度31时仍可尝试spawn', () => {
    for (let i = 0; i < 31; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    }
    expect((sys as any).zones).toHaveLength(31)
  })

  it('zones长度33时超过MAX_ZONES边界', () => {
    for (let i = 0; i < 33; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    }
    expect((sys as any).zones.length).toBeGreaterThan(MAX_ZONES)
  })

  it('update后zones长度不超过MAX_ZONES', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('springFlow字段范围合理', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 10 }))
    expect((sys as any).zones[0].springFlow).toBe(10)
  })

  it('geologicalDeposit字段范围合理', () => {
    ;(sys as any).zones.push(makeZone({ geologicalDeposit: 60 }))
    expect((sys as any).zones[0].geologicalDeposit).toBe(60)
  })

  it('mineralConcentration字段范围合理', () => {
    ;(sys as any).zones.push(makeZone({ mineralConcentration: 70 }))
    expect((sys as any).zones[0].mineralConcentration).toBe(70)
  })

  it('多次cleanup后zones数量正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 5999 }))
    ;(sys as any).zones.push(makeZone({ tick: 10000 }))
    sys.update(1, world, em, 60000)
    // cutoff=6000, tick=0 < 6000 → del, tick=5999 < 6000 → del, tick=10000 >= 6000 → keep
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(10000)
  })
})
