import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldArchipelagoSystem } from '../systems/WorldArchipelagoSystem'
import type { Archipelago } from '../systems/WorldArchipelagoSystem'

const CHECK_INTERVAL = 2900
const MAX_ARCHIPELAGOS = 12
const CUTOFF = 98000

let nextId = 1
function makeSys() { return new WorldArchipelagoSystem() }
function makeArchipelago(overrides: Partial<Archipelago> = {}): Archipelago {
  return {
    id: nextId++,
    x: 40, y: 50,
    radius: 20,
    islandCount: 8,
    volcanicActivity: 30,
    coralGrowth: 60,
    biodiversity: 80,
    seaDepth: 50,
    tick: 0,
    ...overrides,
  }
}

const makeWorld = () => ({ width: 200, height: 200, getTile: () => 5 }) as any
const makeWorldWater = () => ({ width: 200, height: 200, getTile: () => 0 }) as any
const em = {} as any

describe('WorldArchipelagoSystem', () => {
  let sys: WorldArchipelagoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ─── 初始状态 ───
  it('初始archipelagos为空', () => {
    expect((sys as any).archipelagos).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('archipelagos是数组', () => {
    expect(Array.isArray((sys as any).archipelagos)).toBe(true)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).archipelagos.push(makeArchipelago())
    expect((s2 as any).archipelagos).toHaveLength(0)
  })

  // ─── 节流逻辑 ───
  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二次间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('三次触发lastCheck正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })

  // ─── spawn ───
  it('非DEEP_WATER/SHALLOW_WATER地形不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos).toHaveLength(0)
  })
  it('DEEP_WATER+random<FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldWater(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos).toHaveLength(1)
  })
  it('FORM_CHANCE超出时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldWater(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos).toHaveLength(0)
  })
  it('MAX_ARCHIPELAGOS(12)上限不超出', () => {
    for (let i = 0; i < MAX_ARCHIPELAGOS; i++) {
      ;(sys as any).archipelagos.push(makeArchipelago({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldWater(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos.length).toBeLessThanOrEqual(MAX_ARCHIPELAGOS)
  })
  it('spawn后archipelago包含必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldWater(), em, CHECK_INTERVAL)
    const a = (sys as any).archipelagos[0]
    if (a) {
      expect(typeof a.id).toBe('number')
      expect(typeof a.x).toBe('number')
      expect(typeof a.y).toBe('number')
      expect(typeof a.radius).toBe('number')
      expect(typeof a.islandCount).toBe('number')
      expect(typeof a.tick).toBe('number')
    }
  })
  it('spawn后archipelago tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldWater(), em, CHECK_INTERVAL)
    const a = (sys as any).archipelagos[0]
    if (a) expect(a.tick).toBe(CHECK_INTERVAL)
  })

  // ─── 字段更新 ───
  it('coralGrowth每次update增加0.008', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ coralGrowth: 60, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].coralGrowth).toBeCloseTo(60.008, 5)
  })
  it('coralGrowth最大不超过80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ coralGrowth: 80, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].coralGrowth).toBe(80)
  })
  it('biodiversity每次update增加0.006', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ biodiversity: 80, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].biodiversity).toBeCloseTo(80.006, 5)
  })
  it('biodiversity最大不超过90', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ biodiversity: 90, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].biodiversity).toBe(90)
  })
  it('volcanicActivity不低于0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).archipelagos.push(makeArchipelago({ volcanicActivity: 0, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].volcanicActivity).toBeGreaterThanOrEqual(0)
  })
  it('volcanicActivity不高于50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).archipelagos.push(makeArchipelago({ volcanicActivity: 50, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].volcanicActivity).toBeLessThanOrEqual(50)
  })
  it('seaDepth保持在[20, 160]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ seaDepth: 50, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].seaDepth).toBeGreaterThanOrEqual(20)
    expect((sys as any).archipelagos[0].seaDepth).toBeLessThanOrEqual(160)
  })

  // ─── cleanup ───
  it('tick < cutoff(tick-98000)时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 0 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).archipelagos).toHaveLength(0)
  })
  it('tick >= cutoff时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 50000 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).archipelagos).toHaveLength(1)
  })
  it('cutoff边界时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 100000
    const cutoff = bigTick - CUTOFF  // 2000
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: cutoff }))
    sys.update(1, makeWorld(), em, bigTick)
    expect((sys as any).archipelagos).toHaveLength(1)
  })
  it('混合新旧：只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 0, id: 1 }))
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 50000, id: 2 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).archipelagos).toHaveLength(1)
    expect((sys as any).archipelagos[0].tick).toBe(50000)
  })
  it('所有都过期时全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).archipelagos.push(makeArchipelago({ tick: 0 }))
    }
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).archipelagos).toHaveLength(0)
  })

  // ─── 手动注入 ───
  it('手动注入后长度正确', () => {
    ;(sys as any).archipelagos.push(makeArchipelago())
    expect((sys as any).archipelagos).toHaveLength(1)
  })
  it('手动注入多个后长度正确', () => {
    for (let i = 0; i < 4; i++) (sys as any).archipelagos.push(makeArchipelago())
    expect((sys as any).archipelagos).toHaveLength(4)
  })

  // ─── 边界条件 ───
  it('tick=0不触发', () => {
    sys.update(1, makeWorld(), em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), em, 9999999)).not.toThrow()
  })
  it('空archipelagos时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), em, CHECK_INTERVAL)).not.toThrow()
  })
  it('注入archipelago的id可读取', () => {
    ;(sys as any).archipelagos.push(makeArchipelago({ id: 42 }))
    expect((sys as any).archipelagos[0].id).toBe(42)
  })
  it('SHALLOW_WATER地形也可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const worldShallow = { width: 200, height: 200, getTile: () => 1 } as any
    sys.update(1, worldShallow, em, CHECK_INTERVAL)
    expect((sys as any).archipelagos).toHaveLength(1)
  })
})
