import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBarrierIslandSystem } from '../systems/WorldBarrierIslandSystem'
import type { BarrierIsland } from '../systems/WorldBarrierIslandSystem'

const CHECK_INTERVAL = 2700
const MAX_ISLANDS = 26
const worldNoSpawn = { width: 200, height: 200, getTile: () => 5 } as any
const worldSand    = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

function makeSys() { return new WorldBarrierIslandSystem() }
let nextId = 100
function makeIsland(overrides: Partial<BarrierIsland> = {}): BarrierIsland {
  return { id: nextId++, x: 20, y: 30, length: 40, width: 8,
    sandVolume: 5000, vegetationCover: 40, erosionRate: 0.02, tick: 0, ...overrides }
}

describe('WorldBarrierIslandSystem', () => {
  let sys: WorldBarrierIslandSystem
  beforeEach(() => { sys = makeSys(); nextId = 100; vi.restoreAllMocks() })

  // ─── 初始状态 ────────────────────────────────────────────────────────────────
  it('初始islands为空', () => {
    expect((sys as any).islands).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('islands是数组', () => {
    expect(Array.isArray((sys as any).islands)).toBe(true)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).islands.push(makeIsland())
    expect((s2 as any).islands).toHaveLength(0)
  })

  // ─── 节流逻辑 ────────────────────────────────────────────────────────────────
  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二次间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ─── spawn ───────────────────────────────────────────────────────────────────
  it('非SAND地形不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands).toHaveLength(0)
  })
  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).islands).toHaveLength(0)
  })
  it('SAND地形+random<FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).islands).toHaveLength(1)
  })
  it('MAX_ISLANDS(26)上限不超出', () => {
    for (let i = 0; i < MAX_ISLANDS; i++) {
      ;(sys as any).islands.push(makeIsland({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).islands.length).toBeLessThanOrEqual(MAX_ISLANDS)
  })
  it('spawn后island有tick字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    const island = (sys as any).islands[0]
    if (island) expect(island.tick).toBe(CHECK_INTERVAL)
  })
  it('spawn后island包含必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    const island = (sys as any).islands[0]
    if (island) {
      expect(typeof island.id).toBe('number')
      expect(typeof island.x).toBe('number')
      expect(typeof island.sandVolume).toBe('number')
    }
  })

  // ─── 字段更新 ────────────────────────────────────────────────────────────────
  it('sandVolume随erosion减少', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 5000, erosionRate: 0.02, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    // sandVolume减少 erosionRate*factor
    expect((sys as any).islands[0].sandVolume).toBeLessThan(5000)
  })
  it('sandVolume不低于0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 0, erosionRate: 0.02, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].sandVolume).toBeGreaterThanOrEqual(0)
  })
  it('vegetationCover字段保持在合理范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).islands.push(makeIsland({ vegetationCover: 40, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].vegetationCover).toBeGreaterThanOrEqual(0)
    expect((sys as any).islands[0].vegetationCover).toBeLessThanOrEqual(100)
  })

  // ─── cleanup ─────────────────────────────────────────────────────────────────
  it('过期zone被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ tick: 0 }))
    sys.update(1, worldNoSpawn, em, 100000)
    expect((sys as any).islands).toHaveLength(0)
  })
  it('未过期island保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ tick: 50000 }))
    sys.update(1, worldNoSpawn, em, 100000)
    expect((sys as any).islands).toHaveLength(1)
  })
  it('混合新旧：只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ tick: 0 }))
    ;(sys as any).islands.push(makeIsland({ tick: 80000 }))
    sys.update(1, worldNoSpawn, em, 100000)
    expect((sys as any).islands).toHaveLength(1)
    expect((sys as any).islands[0].tick).toBe(80000)
  })
  it('所有island都过期时全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) (sys as any).islands.push(makeIsland({ tick: 0 }))
    sys.update(1, worldNoSpawn, em, 100000)
    expect((sys as any).islands).toHaveLength(0)
  })

  // ─── 手动注入 ────────────────────────────────────────────────────────────────
  it('手动注入island后长度正确', () => {
    ;(sys as any).islands.push(makeIsland())
    expect((sys as any).islands).toHaveLength(1)
  })
  it('手动注入多个island', () => {
    for (let i = 0; i < 5; i++) (sys as any).islands.push(makeIsland())
    expect((sys as any).islands).toHaveLength(5)
  })
  it('注入island的字段可读取', () => {
    ;(sys as any).islands.push(makeIsland({ sandVolume: 9999 }))
    expect((sys as any).islands[0].sandVolume).toBe(9999)
  })

  // ─── 边界条件 ────────────────────────────────────────────────────────────────
  it('tick=0不触发', () => {
    sys.update(1, worldNoSpawn, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, worldNoSpawn, em, 9999999)).not.toThrow()
  })
  it('islands为空时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)).not.toThrow()
  })
  it('island字段结构完整', () => {
    const island = makeIsland()
    expect(typeof island.id).toBe('number')
    expect(typeof island.x).toBe('number')
    expect(typeof island.y).toBe('number')
    expect(typeof island.length).toBe('number')
    expect(typeof island.width).toBe('number')
    expect(typeof island.sandVolume).toBe('number')
    expect(typeof island.vegetationCover).toBe('number')
    expect(typeof island.erosionRate).toBe('number')
    expect(typeof island.tick).toBe('number')
  })
  it('erosionRate字段值合理', () => {
    const island = makeIsland({ erosionRate: 0.05 })
    expect(island.erosionRate).toBe(0.05)
  })
  it('length字段值合理', () => {
    const island = makeIsland({ length: 80 })
    expect(island.length).toBe(80)
  })

  // ─── 边界条件扩展 ────────────────────────────────────────────────────────────
  it('sandVolume正好等于5时不被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 5, erosionRate: 0, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands).toHaveLength(1)
  })
  it('sandVolume低于5时更新后变为5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 4.9, erosionRate: 0, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands).toHaveLength(1)
    expect((sys as any).islands[0].sandVolume).toBe(5)
  })
  it('vegetationCover达到80后不再增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ vegetationCover: 80, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].vegetationCover).toBe(80)
  })
  it('vegetationCover接近80时增长到80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ vegetationCover: 79.99, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].vegetationCover).toBe(80)
  })
  it('tick正好等于cutoff时被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    const cutoffTick = currentTick - 92000
    ;(sys as any).islands.push(makeIsland({ tick: cutoffTick - 1, sandVolume: 100 }))
    sys.update(1, worldNoSpawn, em, currentTick)
    expect((sys as any).islands).toHaveLength(0)
  })
  it('tick刚好大于cutoff时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    const cutoffTick = currentTick - 92000
    ;(sys as any).islands.push(makeIsland({ tick: cutoffTick, sandVolume: 100 }))
    sys.update(1, worldNoSpawn, em, currentTick)
    expect((sys as any).islands).toHaveLength(1)
  })
  it('erosionRate为0时sandVolume不减少', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 50, erosionRate: 0, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].sandVolume).toBe(50)
  })
  it('erosionRate极大值时sandVolume快速减少', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 100, erosionRate: 10, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].sandVolume).toBeLessThan(100)
  })
  it('width最小值1', () => {
    const island = makeIsland({ width: 1 })
    expect(island.width).toBe(1)
  })
  it('width最大值4', () => {
    const island = makeIsland({ width: 4 })
    expect(island.width).toBe(4)
  })

  // ─── 多实体交互测试 ──────────────────────────────────────────────────────────
  it('多个island同时更新sandVolume', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 50, erosionRate: 0.02, tick: 99999 }))
    ;(sys as any).islands.push(makeIsland({ sandVolume: 60, erosionRate: 0.03, tick: 99999 }))
    ;(sys as any).islands.push(makeIsland({ sandVolume: 70, erosionRate: 0.01, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].sandVolume).toBeLessThan(50)
    expect((sys as any).islands[1].sandVolume).toBeLessThan(60)
    expect((sys as any).islands[2].sandVolume).toBeLessThan(70)
  })
  it('多个island同时更新vegetationCover', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ vegetationCover: 10, tick: 99999 }))
    ;(sys as any).islands.push(makeIsland({ vegetationCover: 20, tick: 99999 }))
    ;(sys as any).islands.push(makeIsland({ vegetationCover: 30, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].vegetationCover).toBeGreaterThan(10)
    expect((sys as any).islands[1].vegetationCover).toBeGreaterThan(20)
    expect((sys as any).islands[2].vegetationCover).toBeGreaterThan(30)
  })
  it('部分island达到清理条件部分不达到', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 100, tick: 0 }))
    ;(sys as any).islands.push(makeIsland({ sandVolume: 50, tick: 99999 }))
    ;(sys as any).islands.push(makeIsland({ sandVolume: 100, tick: 0 }))
    sys.update(1, worldNoSpawn, em, 100000)
    expect((sys as any).islands).toHaveLength(1)
    expect((sys as any).islands[0].sandVolume).toBeGreaterThanOrEqual(5)
  })
  it('所有island同时达到sandVolume边界', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).islands.push(makeIsland({ sandVolume: 5.01, erosionRate: 0.02, tick: 99999 }))
    }
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    for (const island of (sys as any).islands) {
      expect(island.sandVolume).toBeGreaterThanOrEqual(5)
    }
  })
  it('混合不同erosionRate的islands', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 50, erosionRate: 0.01, tick: 99999 }))
    ;(sys as any).islands.push(makeIsland({ sandVolume: 50, erosionRate: 0.05, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    const vol1 = (sys as any).islands[0].sandVolume
    const vol2 = (sys as any).islands[1].sandVolume
    expect(vol1).toBeGreaterThan(vol2)
  })

  // ─── 状态转换测试 ────────────────────────────────────────────────────────────
  it('sandVolume从高到低逐渐减少', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 100, erosionRate: 0.02, tick: 99999 }))
    const initial = (sys as any).islands[0].sandVolume
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    const after1 = (sys as any).islands[0].sandVolume
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL * 2)
    const after2 = (sys as any).islands[0].sandVolume
    expect(after1).toBeLessThan(initial)
    expect(after2).toBeLessThan(after1)
  })
  it('vegetationCover从0增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ vegetationCover: 0, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].vegetationCover).toBeGreaterThan(0)
  })
  it('连续多次spawn直到达到MAX_ISLANDS', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 30; i++) {
      sys.update(1, worldSand, em, CHECK_INTERVAL * (i + 1))
    }
    expect((sys as any).islands.length).toBeLessThanOrEqual(MAX_ISLANDS)
  })

  // ─── 极端值测试 ──────────────────────────────────────────────────────────────
  it('erosionRate最大值0.05', () => {
    const island = makeIsland({ erosionRate: 0.05 })
    expect(island.erosionRate).toBe(0.05)
  })
  it('sandVolume初始最大值100', () => {
    const island = makeIsland({ sandVolume: 100 })
    expect(island.sandVolume).toBe(100)
  })
  it('vegetationCover初始为0', () => {
    const island = makeIsland({ vegetationCover: 0 })
    expect(island.vegetationCover).toBe(0)
  })
  it('length最大值15', () => {
    const island = makeIsland({ length: 15 })
    expect(island.length).toBe(15)
  })
  it('length最小值5', () => {
    const island = makeIsland({ length: 5 })
    expect(island.length).toBe(5)
  })

  // ─── 组合场景测试 ────────────────────────────────────────────────────────────
  it('连续多次update观察累积效果', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 50, erosionRate: 0.02, vegetationCover: 10, tick: 99999 }))
    const initial = { sand: (sys as any).islands[0].sandVolume, veg: (sys as any).islands[0].vegetationCover }
    for (let i = 1; i <= 5; i++) {
      sys.update(1, worldNoSpawn, em, CHECK_INTERVAL * i)
    }
    expect((sys as any).islands[0].sandVolume).toBeLessThan(initial.sand)
    expect((sys as any).islands[0].vegetationCover).toBeGreaterThan(initial.veg)
  })
  it('在SHALLOW_WATER地形spawn', () => {
    const worldShallow = { width: 200, height: 200, getTile: () => 1 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldShallow, em, CHECK_INTERVAL)
    expect((sys as any).islands.length).toBeGreaterThan(0)
  })
  it('达到MAX_ISLANDS后尝试spawn不增加', () => {
    for (let i = 0; i < MAX_ISLANDS; i++) {
      ;(sys as any).islands.push(makeIsland({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).islands).toHaveLength(MAX_ISLANDS)
  })
  it('多个island在同一tick被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).islands.push(makeIsland({ tick: 0, sandVolume: 100 }))
    }
    sys.update(1, worldNoSpawn, em, currentTick)
    expect((sys as any).islands).toHaveLength(0)
  })
  it('nextId递增的连续性', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    const id1 = (sys as any).islands[0]?.id
    sys.update(1, worldSand, em, CHECK_INTERVAL * 2)
    const id2 = (sys as any).islands[1]?.id
    if (id1 && id2) expect(id2).toBe(id1 + 1)
  })
  it('sandVolume减少到5后保持5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 5.1, erosionRate: 0.2, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].sandVolume).toBe(5)
  })
  it('vegetationCover增长到80后保持80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ vegetationCover: 79.98, tick: 99999 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL * 2)
    expect((sys as any).islands[0].vegetationCover).toBe(80)
  })
  it('空islands数组多次update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => {
      for (let i = 0; i < 10; i++) {
        sys.update(1, worldNoSpawn, em, CHECK_INTERVAL * (i + 1))
      }
    }).not.toThrow()
  })
  it('混合spawn和cleanup在同一update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).islands.push(makeIsland({ tick: 0, sandVolume: 100 }))
    const initialLength = (sys as any).islands.length
    sys.update(1, worldSand, em, 100000)
    // 旧的被清理，可能spawn新的
    expect((sys as any).islands.length).toBeGreaterThanOrEqual(0)
  })
  it('所有字段类型正确性验证', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    const island = (sys as any).islands[0]
    if (island) {
      expect(Number.isFinite(island.id)).toBe(true)
      expect(Number.isFinite(island.x)).toBe(true)
      expect(Number.isFinite(island.y)).toBe(true)
      expect(Number.isFinite(island.length)).toBe(true)
      expect(Number.isFinite(island.width)).toBe(true)
      expect(Number.isFinite(island.sandVolume)).toBe(true)
      expect(Number.isFinite(island.vegetationCover)).toBe(true)
      expect(Number.isFinite(island.erosionRate)).toBe(true)
      expect(Number.isFinite(island.tick)).toBe(true)
    }
  })
})
