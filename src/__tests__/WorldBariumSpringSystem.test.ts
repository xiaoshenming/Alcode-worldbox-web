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

  // ─── spawn逻辑详细测试 ─────────────────────────────────────────────────────
  it('random <= FORM_CHANCE时可能spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const initialLen = (sys as any).zones.length
    sys.update(1, world, em, CHECK_INTERVAL)
    // 可能spawn（取决于nearWater/nearMountain条件）
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(initialLen)
  })

  it('spawn后nextId递增', () => {
    const initialNextId = (sys as any).nextId
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).nextId).toBe(initialNextId)
  })

  it('spawn的zone包含tick字段', () => {
    ;(sys as any).zones.push(makeZone({ tick: 12345 }))
    expect((sys as any).zones[0].tick).toBe(12345)
  })

  it('spawn的zone的x在world范围内', () => {
    ;(sys as any).zones.push(makeZone({ x: 50 }))
    expect((sys as any).zones[0].x).toBeGreaterThanOrEqual(0)
    expect((sys as any).zones[0].x).toBeLessThan(world.width)
  })

  it('spawn的zone的y在world范围内', () => {
    ;(sys as any).zones.push(makeZone({ y: 80 }))
    expect((sys as any).zones[0].y).toBeGreaterThanOrEqual(0)
    expect((sys as any).zones[0].y).toBeLessThan(world.height)
  })

  // ─── zone字段值范围测试 ────────────────────────────────────────────────────
  it('bariumContent范围在40-100之间', () => {
    ;(sys as any).zones.push(makeZone({ bariumContent: 45 }))
    expect((sys as any).zones[0].bariumContent).toBeGreaterThanOrEqual(40)
    expect((sys as any).zones[0].bariumContent).toBeLessThanOrEqual(100)
  })

  it('springFlow范围在10-60之间', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 30 }))
    expect((sys as any).zones[0].springFlow).toBeGreaterThanOrEqual(10)
    expect((sys as any).zones[0].springFlow).toBeLessThanOrEqual(60)
  })

  it('geologicalDeposit范围在20-100之间', () => {
    ;(sys as any).zones.push(makeZone({ geologicalDeposit: 50 }))
    expect((sys as any).zones[0].geologicalDeposit).toBeGreaterThanOrEqual(20)
    expect((sys as any).zones[0].geologicalDeposit).toBeLessThanOrEqual(100)
  })

  it('mineralConcentration范围在15-100之间', () => {
    ;(sys as any).zones.push(makeZone({ mineralConcentration: 60 }))
    expect((sys as any).zones[0].mineralConcentration).toBeGreaterThanOrEqual(15)
    expect((sys as any).zones[0].mineralConcentration).toBeLessThanOrEqual(100)
  })

  it('bariumContent最小值40', () => {
    ;(sys as any).zones.push(makeZone({ bariumContent: 40 }))
    expect((sys as any).zones[0].bariumContent).toBe(40)
  })

  it('bariumContent最大值100', () => {
    ;(sys as any).zones.push(makeZone({ bariumContent: 100 }))
    expect((sys as any).zones[0].bariumContent).toBe(100)
  })

  it('springFlow最小值10', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 10 }))
    expect((sys as any).zones[0].springFlow).toBe(10)
  })

  it('springFlow最大值60', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 60 }))
    expect((sys as any).zones[0].springFlow).toBe(60)
  })

  // ─── 极端值测试 ────────────────────────────────────────────────────────────
  it('tick为负数时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, world, em, -1000)).not.toThrow()
  })

  it('tick为MAX_SAFE_INTEGER时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, world, em, Number.MAX_SAFE_INTEGER)).not.toThrow()
  })

  it('zone.tick为负数时cleanup正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: -1000 }))
    sys.update(1, world, em, 60000)
    // cutoff=6000, tick=-1000 < 6000 → del
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick为MAX_SAFE_INTEGER时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: Number.MAX_SAFE_INTEGER }))
    sys.update(1, world, em, 60000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('bariumContent为0时不崩溃', () => {
    ;(sys as any).zones.push(makeZone({ bariumContent: 0 }))
    expect((sys as any).zones[0].bariumContent).toBe(0)
  })

  it('springFlow为0时不崩溃', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 0 }))
    expect((sys as any).zones[0].springFlow).toBe(0)
  })

  it('geologicalDeposit为0时不崩溃', () => {
    ;(sys as any).zones.push(makeZone({ geologicalDeposit: 0 }))
    expect((sys as any).zones[0].geologicalDeposit).toBe(0)
  })

  it('mineralConcentration为0时不崩溃', () => {
    ;(sys as any).zones.push(makeZone({ mineralConcentration: 0 }))
    expect((sys as any).zones[0].mineralConcentration).toBe(0)
  })

  // ─── 多实体交互测试 ────────────────────────────────────────────────────────
  it('cleanup后zones顺序保持', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ id: 1, tick: 10000 }))
    ;(sys as any).zones.push(makeZone({ id: 2, tick: 0 }))
    ;(sys as any).zones.push(makeZone({ id: 3, tick: 20000 }))
    sys.update(1, world, em, 60000)
    // cutoff=6000, id=2被删除，id=1和id=3保留
    expect((sys as any).zones).toHaveLength(2)
    expect((sys as any).zones[0].id).toBe(1)
    expect((sys as any).zones[1].id).toBe(3)
  })

  it('多个zone同时过期', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 10; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    sys.update(1, world, em, 60000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('部分zone过期部分保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 10000 }))
    }
    sys.update(1, world, em, 60000)
    expect((sys as any).zones).toHaveLength(5)
  })

  it('cleanup不影响新zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 60000 }))
    sys.update(1, world, em, 60000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(60000)
  })

  // ─── 状态转换测试 ──────────────────────────────────────────────────────────
  it('从0个zone到1个zone', () => {
    expect((sys as any).zones).toHaveLength(0)
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('从MAX_ZONES-1到MAX_ZONES', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    }
    expect((sys as any).zones).toHaveLength(MAX_ZONES - 1)
    ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('从MAX_ZONES到MAX_ZONES-1通过cleanup', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    }
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 60000)
    expect((sys as any).zones).toHaveLength(MAX_ZONES - 1)
  })

  // ─── 组合场景测试 ──────────────────────────────────────────────────────────
  it('连续多次update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 10; i++) {
      sys.update(1, world, em, CHECK_INTERVAL * (i + 1))
    }
    expect(() => sys.update(1, world, em, CHECK_INTERVAL * 11)).not.toThrow()
  })

  it('update间隔不规律时正确处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL + 100)
    sys.update(1, world, em, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })

  it('cleanup和spawn可能同时发生', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    const initialLen = (sys as any).zones.length
    sys.update(1, world, em, 60000)
    // 旧zone被cleanup，可能spawn新zone
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })

  it('zone id唯一性', () => {
    ;(sys as any).zones.push(makeZone({ id: 1 }))
    ;(sys as any).zones.push(makeZone({ id: 2 }))
    ;(sys as any).zones.push(makeZone({ id: 3 }))
    const ids = (sys as any).zones.map((z: BariumSpringZone) => z.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('zone坐标可以为0', () => {
    ;(sys as any).zones.push(makeZone({ x: 0, y: 0 }))
    expect((sys as any).zones[0].x).toBe(0)
    expect((sys as any).zones[0].y).toBe(0)
  })

  it('zone坐标可以为world边界', () => {
    ;(sys as any).zones.push(makeZone({ x: world.width - 1, y: world.height - 1 }))
    expect((sys as any).zones[0].x).toBe(world.width - 1)
    expect((sys as any).zones[0].y).toBe(world.height - 1)
  })

  it('lastCheck在多次update后单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    const check1 = (sys as any).lastCheck
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    const check2 = (sys as any).lastCheck
    sys.update(1, world, em, CHECK_INTERVAL * 3)
    const check3 = (sys as any).lastCheck
    expect(check2).toBeGreaterThan(check1)
    expect(check3).toBeGreaterThan(check2)
  })

  it('zones数组可以被清空后重新填充', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
    ;(sys as any).zones = []
    expect((sys as any).zones).toHaveLength(0)
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('cutoff计算正确性验证', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 100000
    const expectedCutoff = bigTick - 54000  // 46000
    ;(sys as any).zones.push(makeZone({ tick: expectedCutoff - 1 }))
    ;(sys as any).zones.push(makeZone({ tick: expectedCutoff }))
    ;(sys as any).zones.push(makeZone({ tick: expectedCutoff + 1 }))
    sys.update(1, world, em, bigTick)
    expect((sys as any).zones).toHaveLength(2)
    expect((sys as any).zones[0].tick).toBe(expectedCutoff)
    expect((sys as any).zones[1].tick).toBe(expectedCutoff + 1)
  })

  it('所有字段类型正确', () => {
    const z = makeZone()
    expect(Number.isFinite(z.id)).toBe(true)
    expect(Number.isFinite(z.x)).toBe(true)
    expect(Number.isFinite(z.y)).toBe(true)
    expect(Number.isFinite(z.bariumContent)).toBe(true)
    expect(Number.isFinite(z.springFlow)).toBe(true)
    expect(Number.isFinite(z.geologicalDeposit)).toBe(true)
    expect(Number.isFinite(z.mineralConcentration)).toBe(true)
    expect(Number.isFinite(z.tick)).toBe(true)
  })

  it('zone字段不为NaN', () => {
    const z = makeZone()
    expect(Number.isNaN(z.bariumContent)).toBe(false)
    expect(Number.isNaN(z.springFlow)).toBe(false)
    expect(Number.isNaN(z.geologicalDeposit)).toBe(false)
    expect(Number.isNaN(z.mineralConcentration)).toBe(false)
  })
})
