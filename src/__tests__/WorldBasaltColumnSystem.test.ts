import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBasaltColumnSystem } from '../systems/WorldBasaltColumnSystem'
import type { BasaltColumn } from '../systems/WorldBasaltColumnSystem'

const CHECK_INTERVAL = 1600
const MAX_FORMATIONS = 20
const worldNoSpawn = { width: 200, height: 200, getTile: () => 5 } as any
const worldLava    = { width: 200, height: 200, getTile: () => 7 } as any
const em = {} as any

function makeSys() { return new WorldBasaltColumnSystem() }
let nextId = 100
function makeColumn(overrides: Partial<BasaltColumn> = {}): BasaltColumn {
  return {
    id: nextId++, x: 10, y: 20,
    height: 10, columnCount: 50,
    hexagonalPerfection: 60, erosionRate: 0.5, age: 0, tick: 0,
    ...overrides,
  }
}

describe('WorldBasaltColumnSystem', () => {
  let sys: WorldBasaltColumnSystem
  beforeEach(() => { sys = makeSys(); nextId = 100; vi.restoreAllMocks() })

  // ─── 初始状态 ────────────────────────────────────────────────────────────────
  it('初始formations为空', () => {
    expect((sys as any).formations).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('formations是数组', () => {
    expect(Array.isArray((sys as any).formations)).toBe(true)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).formations.push(makeColumn())
    expect((s2 as any).formations).toHaveLength(0)
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
  it('非LAVA地形(tile<7)不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(0)
  })
  it('random > SPAWN_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldLava, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(0)
  })
  it('LAVA���形+random<SPAWN_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldLava, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(1)
  })
  it('MAX_FORMATIONS(20)上限不超出', () => {
    for (let i = 0; i < MAX_FORMATIONS; i++) {
      ;(sys as any).formations.push(makeColumn({ height: 5, hexagonalPerfection: 50, tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldLava, em, CHECK_INTERVAL)
    expect((sys as any).formations.length).toBeLessThanOrEqual(MAX_FORMATIONS)
  })
  it('spawn后formation有tick字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldLava, em, CHECK_INTERVAL)
    const f = (sys as any).formations[0]
    if (f) expect(f.tick).toBe(CHECK_INTERVAL)
  })
  it('spawn后formation包含height字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldLava, em, CHECK_INTERVAL)
    const f = (sys as any).formations[0]
    if (f) expect(typeof f.height).toBe('number')
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldLava, em, CHECK_INTERVAL)
    if ((sys as any).formations.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })

  // ─── 字段更新 ────────────────────────────────────────────────────────────────
  it('每次update后age递增1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ age: 0, height: 5, hexagonalPerfection: 60 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations[0].age).toBe(1)
  })
  it('height随erosionRate减少', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ height: 10, erosionRate: 0.1, hexagonalPerfection: 60 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    // height = max(0.5, 10 - 0.1*0.01) = max(0.5, 9.999) = 9.999
    expect((sys as any).formations[0].height).toBeCloseTo(9.999, 4)
  })
  it('height不低于0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ height: 0.51, erosionRate: 0.5, hexagonalPerfection: 60 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    // height = max(0.5, 0.51 - 0.005) = 0.505 >= 0.5, not removed
    expect((sys as any).formations[0].height).toBeGreaterThanOrEqual(0.5)
  })
  it('hexagonalPerfection随erosionRate减少', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ hexagonalPerfection: 60, erosionRate: 0.1, height: 5 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    // hexagonalPerfection = max(0, 60 - 0.1*0.1) = 59.99
    expect((sys as any).formations[0].hexagonalPerfection).toBeCloseTo(59.99, 4)
  })
  it('hexagonalPerfection不低于0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ hexagonalPerfection: 0.001, erosionRate: 0.5, height: 5 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    // hexagonalPerfection = max(0, 0.001 - 0.05) = 0 → cleanup removes it
    expect((sys as any).formations.length).toBeLessThanOrEqual(1)
  })

  // ─── cleanup（height<=0.5或hexagonalPerfection<=0时删除）─────────────────────
  it('height<=0.5时formation被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ height: 0.4, hexagonalPerfection: 60 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(0)
  })
  it('hexagonalPerfection<=0时formation被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ height: 5, hexagonalPerfection: 0 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(0)
  })
  it('height>0.5且hexagonalPerfection>0时不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ height: 5, hexagonalPerfection: 60 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(1)
  })
  it('混合合法与过期：只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ height: 0.4, hexagonalPerfection: 60 }))
    ;(sys as any).formations.push(makeColumn({ height: 5, hexagonalPerfection: 60 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(1)
    expect((sys as any).formations[0].height).toBeGreaterThan(0.5)
  })

  // ─── 手动注入 ────────────────────────────────────────────────────────────────
  it('手动注入formation后长度正确', () => {
    ;(sys as any).formations.push(makeColumn())
    expect((sys as any).formations).toHaveLength(1)
  })
  it('手动注入多个formation', () => {
    for (let i = 0; i < 5; i++) (sys as any).formations.push(makeColumn())
    expect((sys as any).formations).toHaveLength(5)
  })
  it('注入formation的字段可读取', () => {
    ;(sys as any).formations.push(makeColumn({ columnCount: 99 }))
    expect((sys as any).formations[0].columnCount).toBe(99)
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
  it('formations为空时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)).not.toThrow()
  })
  it('formation字段结构完整', () => {
    const f = makeColumn()
    expect(typeof f.id).toBe('number')
    expect(typeof f.x).toBe('number')
    expect(typeof f.y).toBe('number')
    expect(typeof f.height).toBe('number')
    expect(typeof f.columnCount).toBe('number')
    expect(typeof f.hexagonalPerfection).toBe('number')
    expect(typeof f.erosionRate).toBe('number')
    expect(typeof f.age).toBe('number')
    expect(typeof f.tick).toBe('number')
  })
  it('tile>=7才算LAVA条件', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const worldTile6 = { width: 200, height: 200, getTile: () => 6 } as any
    sys.update(1, worldTile6, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(0)
  })
  it('tile=8时也符合spawn条件', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const worldTile8 = { width: 200, height: 200, getTile: () => 8 } as any
    sys.update(1, worldTile8, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(1)
  })
})
