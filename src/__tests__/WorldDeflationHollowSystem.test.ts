import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldDeflationHollowSystem } from '../systems/WorldDeflationHollowSystem'
import type { DeflationHollow } from '../systems/WorldDeflationHollowSystem'

const CHECK_INTERVAL = 2540
const MAX_HOLLOWS = 16

function makeSys(): WorldDeflationHollowSystem { return new WorldDeflationHollowSystem() }

let _nextId = 1
function makeHollow(overrides: Partial<DeflationHollow> = {}): DeflationHollow {
  return {
    id: _nextId++,
    x: 20, y: 30,
    depth: 5,
    diameter: 50,
    windExposure: 40,
    sedimentLoss: 20,
    lagDeposit: 10,
    spectacle: 15,
    tick: 0,
    ...overrides,
  }
}

const worldSand     = { width: 200, height: 200, getTile: () => 2 } as any
const worldGrass    = { width: 200, height: 200, getTile: () => 3 } as any
const worldMountain = { width: 200, height: 200, getTile: () => 5 } as any
const em = {} as any

describe('WorldDeflationHollowSystem', () => {
  let sys: WorldDeflationHollowSystem

  beforeEach(() => {
    sys = makeSys()
    _nextId = 1
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --- 1. 基础数据结构 ---
  it('hollows[] 初始为空', () => {
    expect((sys as any).hollows).toHaveLength(0)
  })

  it('hollows 是数组', () => {
    expect(Array.isArray((sys as any).hollows)).toBe(true)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入后长度正确', () => {
    ;(sys as any).hollows.push(makeHollow())
    ;(sys as any).hollows.push(makeHollow())
    expect((sys as any).hollows).toHaveLength(2)
  })

  // --- 2. CHECK_INTERVAL 节流 ---
  it('tick < CHECK_INTERVAL 时 lastCheck 保持 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次不满足间隔时 lastCheck 不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    sys.update(0, worldSand, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('满足间隔后 lastCheck 再次更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    sys.update(0, worldSand, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // --- 3. spawn 逻辑 ---
  it('SAND tile 时可 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).hollows).toHaveLength(1)
  })

  it('GRASS tile 时可 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).hollows).toHaveLength(1)
  })

  it('MOUNTAIN tile（不符合条件）时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).hollows).toHaveLength(0)
  })

  it('达到 MAX_HOLLOWS 时不再 spawn', () => {
    for (let i = 0; i < MAX_HOLLOWS; i++) {
      ;(sys as any).hollows.push(makeHollow())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).hollows).toHaveLength(MAX_HOLLOWS)
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 的记录 tick 等于传入的 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).hollows[0].tick).toBe(CHECK_INTERVAL)
  })

  // --- 4. 字段动态更新 ---
  it('update 后 depth 不超过上限 20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).hollows.push(makeHollow({ depth: 19.9999 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).hollows[0].depth).toBeLessThanOrEqual(20)
  })

  it('update 后 diameter 不超过上限 150', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).hollows.push(makeHollow({ diameter: 149.9999 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).hollows[0].diameter).toBeLessThanOrEqual(150)
  })

  it('update 后 sedimentLoss 在 [5, 60] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).hollows.push(makeHollow({ sedimentLoss: 30 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    const v = (sys as any).hollows[0].sedimentLoss
    expect(v).toBeGreaterThanOrEqual(5)
    expect(v).toBeLessThanOrEqual(60)
  })

  it('update 后 lagDeposit 不超过上限 40', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).hollows.push(makeHollow({ lagDeposit: 39.9999 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).hollows[0].lagDeposit).toBeLessThanOrEqual(40)
  })

  it('update 后 spectacle 在 [3, 40] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).hollows.push(makeHollow({ spectacle: 20 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    const s = (sys as any).hollows[0].spectacle
    expect(s).toBeGreaterThanOrEqual(3)
    expect(s).toBeLessThanOrEqual(40)
  })

  it('depth 每次 update 增加 0.00002', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).hollows.push(makeHollow({ depth: 5 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).hollows[0].depth).toBeCloseTo(5 + 0.00002, 8)
  })

  // --- 5. cleanup ---
  it('老记录（tick < cutoff）被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).hollows.push(makeHollow({ tick: 0 }))
    const tick = 89001 + CHECK_INTERVAL
    sys.update(0, worldSand, em, tick)
    expect((sys as any).hollows).toHaveLength(0)
  })

  it('新记录（tick >= cutoff）不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = CHECK_INTERVAL * 2
    ;(sys as any).hollows.push(makeHollow({ tick: tick - 1000 }))
    sys.update(0, worldSand, em, tick)
    expect((sys as any).hollows).toHaveLength(1)
  })

  it('混合新旧只删旧的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = 89001 + CHECK_INTERVAL
    ;(sys as any).hollows.push(makeHollow({ tick: 0 }))
    ;(sys as any).hollows.push(makeHollow({ tick: tick - 1000 }))
    sys.update(0, worldSand, em, tick)
    expect((sys as any).hollows).toHaveLength(1)
  })

  it('刚好等于 cutoff 边界不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = CHECK_INTERVAL
    const cutoff = tick - 89000
    ;(sys as any).hollows.push(makeHollow({ tick: cutoff }))
    sys.update(0, worldSand, em, tick)
    expect((sys as any).hollows).toHaveLength(1)
  })
})
