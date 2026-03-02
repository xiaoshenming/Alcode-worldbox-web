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

  // ─── 节流逻辑 ────────────────────────────────────────────────────────────────
  it('tick不足CHECK_INTERVAL时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ tick: 0 }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  // ─── 字段更新：sandVolume & vegetationCover ──────────────────────────────────
  it('每次update后sandVolume减少erosionRate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 50, erosionRate: 0.05, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].sandVolume).toBeCloseTo(49.95)
  })

  it('sandVolume被夹到最小值5（Math.max保护）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // sandVolume=5.001, erosionRate=0.1 → 5.001-0.1=4.901 → Math.max(5, 4.901)=5
    ;(sys as any).islands.push(makeIsland({ sandVolume: 5.001, erosionRate: 0.1, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].sandVolume).toBe(5)
  })

  it('每次update后vegetationCover增加0.02', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ vegetationCover: 30, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].vegetationCover).toBeCloseTo(30.02)
  })

  it('vegetationCover不超过80（Math.min上限）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ vegetationCover: 79.99, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].vegetationCover).toBeLessThanOrEqual(80)
  })

  it('多个island字段同时更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 100, erosionRate: 0.1, vegetationCover: 10, tick: CHECK_INTERVAL }))
    ;(sys as any).islands.push(makeIsland({ sandVolume: 200, erosionRate: 0.2, vegetationCover: 20, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands[0].sandVolume).toBeCloseTo(99.9)
    expect((sys as any).islands[1].sandVolume).toBeCloseTo(199.8)
  })

  // ─── cleanup：tick过期 ───────────────────────────────────────────────────────
  it('tick < cutoff(currentTick-92000)的island被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + 92001
    ;(sys as any).islands.push(makeIsland({ tick: 0 }))
    sys.update(1, worldNoSpawn, em, currentTick)
    expect((sys as any).islands).toHaveLength(0)
  })

  it('tick在cutoff之内的island被保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL
    ;(sys as any).islands.push(makeIsland({ tick: currentTick - 91999 }))
    sys.update(1, worldNoSpawn, em, currentTick)
    expect((sys as any).islands).toHaveLength(1)
  })

  it('tick恰好等于cutoff(currentTick-92000)的island被保留（不满足 < 条件）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + 92000
    const zoneTick = currentTick - 92000  // 恰好等于cutoff，不小于cutoff
    ;(sys as any).islands.push(makeIsland({ tick: zoneTick }))
    sys.update(1, worldNoSpawn, em, currentTick)
    expect((sys as any).islands).toHaveLength(1)
  })

  it('只删除过期island，保留新鲜island', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + 100000
    ;(sys as any).islands.push(makeIsland({ tick: 0 }))                   // 过期
    ;(sys as any).islands.push(makeIsland({ tick: currentTick - 1000 }))  // 新鲜
    sys.update(1, worldNoSpawn, em, currentTick)
    expect((sys as any).islands).toHaveLength(1)
    expect((sys as any).islands[0].tick).toBe(currentTick - 1000)
  })

  // ─── cleanup：sandVolume < 5（字段更新后检查）────────────────────────────────
  // 注意：update先执行sandVolume = Math.max(5, sandVolume-erosionRate)
  // 所以直接注入sandVolume=3时，字段更新后变为5，cleanup判5<5为false不删除
  // sandVolume<5 cleanup 实际触发的场景是：sandVolume刚好在5.001并减去大erosionRate后触底
  // 但字段更新用Math.max(5)保护，所以cleanup中sandVolume<5路径在正常情况下不可达
  // 测试砂量恰好被夹在5时不被删除（侧面验证cleanup逻辑）
  it('sandVolume被Math.max保护到5时island不被cleanup删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).islands.push(makeIsland({ sandVolume: 5.001, erosionRate: 0.1, tick: CHECK_INTERVAL }))
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    // 字段更新：Math.max(5, 5.001-0.1)=5, cleanup: 5<5=false → 不删
    expect((sys as any).islands).toHaveLength(1)
  })

  // ─── spawn：沙地/浅水地形 ────────────────────────────────────────────────────
  it('getTile返回SAND(2)且random<FORM_CHANCE时spawn新island', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).islands).toHaveLength(1)
  })

  it('getTile返回SHALLOW_WATER(1)时也可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const worldShallow = { width: 200, height: 200, getTile: () => 1 } as any
    sys.update(1, worldShallow, em, CHECK_INTERVAL)
    expect((sys as any).islands).toHaveLength(1)
  })

  it('getTile返回5（草地）时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    expect((sys as any).islands).toHaveLength(0)
  })

  it('random >= FORM_CHANCE(0.003)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).islands).toHaveLength(0)
  })

  // ─── MAX_ISLANDS 上限 ────────────────────────────────────────────────────────
  it('islands达到MAX_ISLANDS时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < MAX_ISLANDS; i++) {
      ;(sys as any).islands.push(makeIsland({ tick: CHECK_INTERVAL }))
    }
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).islands.length).toBeLessThanOrEqual(MAX_ISLANDS)
  })

  // ─── spawn后字段合法性 ───────────────────────────────────────────────────────
  it('spawn的island字段在合法范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    const isle = (sys as any).islands[0]
    expect(isle.sandVolume).toBeGreaterThanOrEqual(40)
    expect(isle.sandVolume).toBeLessThanOrEqual(100)
    expect(isle.erosionRate).toBeGreaterThanOrEqual(0.01)
    expect(isle.erosionRate).toBeLessThanOrEqual(0.05)
    expect(isle.tick).toBe(CHECK_INTERVAL)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const idBefore = (sys as any).nextId
    sys.update(1, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(idBefore + 1)
  })

  it('连续两次CHECK_INTERVAL触发lastCheck各自更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL)
    sys.update(1, worldNoSpawn, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})
