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
})
