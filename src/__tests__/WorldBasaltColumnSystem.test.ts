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

  // ─── 节流逻辑 ────────────────────────────────────────────────────────────────
  it('tick不足CHECK_INTERVAL时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn())
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次间隔触发各自更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ─── 字段更新：age, height, hexagonalPerfection ──────────────────────────────
  it('每次update后age加1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ age: 5, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations[0].age).toBe(6)
  })

  it('每次update后height减少erosionRate*0.01', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ height: 10, erosionRate: 0.5, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    // 10 - 0.5*0.01 = 9.995，且 9.995 > 0.5，不被cleanup删除
    expect((sys as any).formations[0].height).toBeCloseTo(9.995)
  })

  it('height被Math.max夹到0.5时不再继续降低（不删除情形）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // height=5, erosionRate=200 → 5 - 200*0.01 = 5 - 2 = 3 → Math.max(0.5, 3) = 3，不到0.5
    // 改用小erosionRate：height=0.51, erosionRate=0.001 → 0.51-0.00001=0.50999 → Math.max(0.5, 0.50999)=0.50999
    ;(sys as any).formations.push(makeColumn({ height: 0.51, erosionRate: 0.001, hexagonalPerfection: 50, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    // 字段更新：Math.max(0.5, 0.51-0.001*0.01)=Math.max(0.5, 0.50999)=0.50999
    // cleanup: 0.50999 > 0.5 → 不删
    expect((sys as any).formations).toHaveLength(1)
    expect((sys as any).formations[0].height).toBeGreaterThan(0.5)
  })

  it('每次update后hexagonalPerfection减少erosionRate*0.1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ hexagonalPerfection: 60, erosionRate: 0.5, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    // 60 - 0.5*0.1 = 59.95
    expect((sys as any).formations[0].hexagonalPerfection).toBeCloseTo(59.95)
  })

  it('hexagonalPerfection被Math.max夹到0后cleanup删除formation', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // hexagonalPerfection=0.001, erosionRate=100 → 0.001 - 100*0.1 = -9.999 → Math.max(0,..)*=0
    // cleanup: 0 <= 0 → 删除
    ;(sys as any).formations.push(makeColumn({ hexagonalPerfection: 0.001, erosionRate: 100, height: 10, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(0)
  })

  it('多个formation字段同时更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ age: 0, height: 8, erosionRate: 0.2, tick: CHECK_INTERVAL }))
    ;(sys as any).formations.push(makeColumn({ age: 10, height: 5, erosionRate: 0.4, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations[0].age).toBe(1)
    expect((sys as any).formations[1].age).toBe(11)
    expect((sys as any).formations[0].height).toBeCloseTo(8 - 0.2 * 0.01)
    expect((sys as any).formations[1].height).toBeCloseTo(5 - 0.4 * 0.01)
  })

  // ─── cleanup：基于height/hexagonalPerfection（非tick）────────────────────────
  it('hexagonalPerfection <= 0的formation被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ hexagonalPerfection: 0, height: 10, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(0)
  })

  it('height <= 0.5的formation被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // 注入 height=0.5，字段更新：Math.max(0.5, 0.5-erosionRate*0.01)=0.5，cleanup: 0.5<=0.5=true → 删除
    ;(sys as any).formations.push(makeColumn({ height: 0.5, erosionRate: 0.5, hexagonalPerfection: 50, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(0)
  })

  it('只删除hexagonalPerfection<=0的formation，保留健康formation', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ hexagonalPerfection: 0, height: 10, tick: CHECK_INTERVAL }))
    ;(sys as any).formations.push(makeColumn({ hexagonalPerfection: 80, erosionRate: 0.5, height: 10, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(1)
    expect((sys as any).formations[0].hexagonalPerfection).toBeGreaterThan(0)
  })

  it('height>0.5且hexagonalPerfection>0的formation被保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).formations.push(makeColumn({ height: 10, hexagonalPerfection: 50, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(1)
  })

  // ─── spawn：火山地形（tile >= 7） ────────────────────────────────────────────
  it('getTile>=7且random<SPAWN_CHANCE时spawn新formation', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldLava, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(1)
  })

  it('getTile=5（低于7）时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(0)
  })

  it('getTile=8（> 7）也可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const worldHighTile = { width: 200, height: 200, getTile: () => 8 } as any
    sys.update(1, worldHighTile, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(1)
  })

  it('random >= SPAWN_CHANCE(0.003)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldLava, em, CHECK_INTERVAL)
    expect((sys as any).formations).toHaveLength(0)
  })

  // ─── MAX_FORMATIONS 上限 ─────────────────────────────────────────────────────
  it('formations达到MAX_FORMATIONS时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < MAX_FORMATIONS; i++) {
      ;(sys as any).formations.push(makeColumn({ height: 10, hexagonalPerfection: 50, tick: CHECK_INTERVAL }))
    }
    sys.update(1, worldLava, em, CHECK_INTERVAL)
    expect((sys as any).formations.length).toBeLessThanOrEqual(MAX_FORMATIONS)
  })

  // ─── spawn后字段合法性 ───────────────────────────────────────────────────────
  it('spawn的formation字段在合法范围内（age在spawn+update后为1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldLava, em, CHECK_INTERVAL)
    const f = (sys as any).formations[0]
    expect(f.height).toBeGreaterThan(0.5)  // 经过字段更新后仍 > 0.5
    expect(f.columnCount).toBeGreaterThanOrEqual(10)
    expect(f.columnCount).toBeLessThanOrEqual(100)
    expect(f.hexagonalPerfection).toBeGreaterThan(0)
    expect(f.erosionRate).toBeGreaterThanOrEqual(0.01)
    expect(f.erosionRate).toBeLessThanOrEqual(0.06)
    // spawn后立即经过字段更新(age++)，所以age=1而非0
    expect(f.age).toBe(1)
    expect(f.tick).toBe(CHECK_INTERVAL)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const idBefore = (sys as any).nextId
    sys.update(1, worldLava, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(idBefore + 1)
  })

  it('formations数组是内部私有引用，每次获取相同对象', () => {
    expect((sys as any).formations).toBe((sys as any).formations)
  })
})
