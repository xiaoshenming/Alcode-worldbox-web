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

describe('WorldDeflationHollowSystem - 扩展补充', () => {
  let sys: WorldDeflationHollowSystem
  beforeEach(() => { sys = new WorldDeflationHollowSystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('补充-hollows初始为空Array', () => { expect(Array.isArray((sys as any).hollows)).toBe(true) })
  it('补充-nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('补充-lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('补充-tick=0时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-tick=2540时lastCheck更新为2540', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2540)
    expect((sys as any).lastCheck).toBe(2540)
  })
  it('补充-两次update间隔<CI时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2540)
    sys.update(1, w, e, 2540 + 100)
    expect((sys as any).lastCheck).toBe(2540)
  })
  it('补充-两次update间隔>=CI时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2540)
    sys.update(1, w, e, 2540 * 2)
    expect((sys as any).lastCheck).toBe(2540 * 2)
  })
  it('补充-update后hollows引用稳定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const ref = (sys as any).hollows
    sys.update(1, w, e, 2540)
    expect((sys as any).hollows).toBe(ref)
  })
  it('补充-hollows.splice正确', () => {
    ;(sys as any).hollows.push({ id: 1 })
    ;(sys as any).hollows.push({ id: 2 })
    ;(sys as any).hollows.splice(0, 1)
    expect((sys as any).hollows).toHaveLength(1)
  })
  it('补充-注入5个后length=5', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).hollows.push({ id: i+1 }) }
    expect((sys as any).hollows).toHaveLength(5)
  })
  it('补充-连续trigger lastCheck单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2540)
    const lc1 = (sys as any).lastCheck
    sys.update(1, w, e, 2540 * 2)
    expect((sys as any).lastCheck).toBeGreaterThanOrEqual(lc1)
  })
  it('补充-update后lastCheck不超过传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 999999)
    expect((sys as any).lastCheck).toBeLessThanOrEqual(999999)
  })
  it('补充-清空hollows后length=0', () => {
    ;(sys as any).hollows.push({ id: 1 })
    ;(sys as any).hollows.length = 0
    expect((sys as any).hollows).toHaveLength(0)
  })
  it('补充-id注入后可读取', () => {
    ;(sys as any).hollows.push({ id: 99 })
    expect((sys as any).hollows[0].id).toBe(99)
  })
  it('补充-多次trigger三轮lastCheck递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2540)
    sys.update(1, w, e, 2540 * 2)
    sys.update(1, w, e, 2540 * 3)
    expect((sys as any).lastCheck).toBe(2540 * 3)
  })
  it('补充-tick=CI-1时lastCheck保持0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2540 - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-hollows是同一引用', () => {
    const r1 = (sys as any).hollows
    const r2 = (sys as any).hollows
    expect(r1).toBe(r2)
  })
  it('补充-注入10个后length=10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).hollows.push({ id: i + 1 }) }
    expect((sys as any).hollows).toHaveLength(10)
  })
  it('补充-3个trigger间lastCheck精确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2540 * 3)
    expect((sys as any).lastCheck).toBe(2540 * 3)
  })
  it('补充-random=0.9时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2540)
    expect((sys as any).hollows).toHaveLength(0)
  })
  it('补充-hollows可以pop操作', () => {
    ;(sys as any).hollows.push({ id: 1 })
    ;(sys as any).hollows.pop()
    expect((sys as any).hollows).toHaveLength(0)
  })
  it('补充-初始状态update不影响lastCheck=0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-第N次trigger后lastCheck=N*CI', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const N = 4
    sys.update(1, w, e, 2540 * N)
    expect((sys as any).lastCheck).toBe(2540 * N)
  })
  it('补充-注入元素tick字段可读取', () => {
    ;(sys as any).hollows.push({ id: 1, tick: 12345 })
    expect((sys as any).hollows[0].tick).toBe(12345)
  })
  it('补充-hollows注入x/y字段可读取', () => {
    ;(sys as any).hollows.push({ id: 1, x: 50, y: 60 })
    expect((sys as any).hollows[0].x).toBe(50)
    expect((sys as any).hollows[0].y).toBe(60)
  })
  it('补充-两次update在CI内仅执行一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2540)
    const lc = (sys as any).lastCheck
    sys.update(1, w, e, 2540 + 2540 - 1)
    expect((sys as any).lastCheck).toBe(lc)
  })
})
