import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldCanyonSystem } from '../systems/WorldCanyonSystem'
import type { Canyon } from '../systems/WorldCanyonSystem'

const CHECK_INTERVAL = 2800
const MAX_CANYONS = 12
const FORM_CHANCE = 0.0015

// 安全 world：getTile=0(DEEP_WATER)，不满足 MOUNTAIN(5) || SAND(2) → 不 spawn
const safeWorld = { width: 200, height: 200, getTile: () => 0 } as any
// spawn world：getTile=5(MOUNTAIN) → 触发 spawn
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
const sandWorld = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

function makeSys(): WorldCanyonSystem { return new WorldCanyonSystem() }
let nextId = 1
function makeCanyon(overrides: Partial<Canyon> = {}): Canyon {
  return {
    id: nextId++,
    x: 20, y: 30,
    length: 50,
    depth: 30,
    wallHeight: 40,
    riverFlow: 5,
    rockLayers: 8,
    widthAtTop: 20,
    tick: 0,
    ...overrides,
  }
}

describe('WorldCanyonSystem', () => {
  let sys: WorldCanyonSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.restoreAllMocks()
  })

  // ── 基础状态 ──────────────────────────────────────────────────

  it('初始无峡谷', () => {
    expect((sys as any).canyons).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).canyons.push(makeCanyon())
    expect((sys as any).canyons).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).canyons).toBe((sys as any).canyons)
  })

  it('峡谷字段正确', () => {
    ;(sys as any).canyons.push(makeCanyon())
    const c = (sys as any).canyons[0]
    expect(c.depth).toBe(30)
    expect(c.wallHeight).toBe(40)
    expect(c.rockLayers).toBe(8)
    expect(c.riverFlow).toBe(5)
    expect(c.widthAtTop).toBe(20)
  })

  it('多个峡谷全部返回', () => {
    ;(sys as any).canyons.push(makeCanyon())
    ;(sys as any).canyons.push(makeCanyon())
    expect((sys as any).canyons).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────

  it('tick 未达 CHECK_INTERVAL 时 update 跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).canyons).toHaveLength(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发检查并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距小于 CHECK_INTERVAL 时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距达到 CHECK_INTERVAL 时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ── spawn 条件：tile === MOUNTAIN(5) || SAND(2) ───────────────

  it('getTile=DEEP_WATER 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).canyons).toHaveLength(0)
  })

  it('getTile=MOUNTAIN(5) + random < FORM_CHANCE 时 spawn 峡谷', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).canyons).toHaveLength(1)
  })

  it('getTile=SAND(2) + random < FORM_CHANCE 时 spawn 峡谷', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).canyons).toHaveLength(1)
  })

  it('random=0.9（> FORM_CHANCE）时即使是 MOUNTAIN 也不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).canyons).toHaveLength(0)
  })

  // ── 字段更新 ─────────────────────────────────────────────────

  it('update 后 depth += riverFlow * 0.0001（未达上限 250）', () => {
    ;(sys as any).canyons.push(makeCanyon({ depth: 100, riverFlow: 10 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // random-0.5=0 → riverFlow 不变
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    // depth = min(250, 100 + 10*0.0001) = 100.001
    expect((sys as any).canyons[0].depth).toBeCloseTo(100.001, 5)
  })

  it('depth 达到 250 时不再增加（Math.min 上限）', () => {
    ;(sys as any).canyons.push(makeCanyon({ depth: 250, riverFlow: 10 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).canyons[0].depth).toBe(250)
  })

  it('update 后 wallHeight -= 0.001（未达下限 30）', () => {
    ;(sys as any).canyons.push(makeCanyon({ wallHeight: 50, riverFlow: 5 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).canyons[0].wallHeight).toBeCloseTo(49.999, 5)
  })

  it('wallHeight 降至 30 时不再减少（Math.max 下限）', () => {
    ;(sys as any).canyons.push(makeCanyon({ wallHeight: 30, riverFlow: 5 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).canyons[0].wallHeight).toBe(30)
  })

  it('update 后 widthAtTop += 0.0005（未达上限 20）', () => {
    ;(sys as any).canyons.push(makeCanyon({ widthAtTop: 10, riverFlow: 5 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).canyons[0].widthAtTop).toBeCloseTo(10.0005, 6)
  })

  it('widthAtTop 达到 20 时不再增加（Math.min 上限）', () => {
    ;(sys as any).canyons.push(makeCanyon({ widthAtTop: 20, riverFlow: 5 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).canyons[0].widthAtTop).toBe(20)
  })

  it('riverFlow 保持在 [2, 35] 区间内', () => {
    ;(sys as any).canyons.push(makeCanyon({ riverFlow: 10 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const rf = (sys as any).canyons[0].riverFlow
    expect(rf).toBeGreaterThanOrEqual(2)
    expect(rf).toBeLessThanOrEqual(35)
  })

  // ── cleanup：tick < cutoff(tick-100000) 时删除 ────────────────

  it('过期峡谷(tick < cutoff)被清理', () => {
    ;(sys as any).canyons.push(makeCanyon({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=100001, cutoff=1, canyon.tick=0 < 1 → 删除
    sys.update(1, safeWorld, em, 100001)
    expect((sys as any).canyons).toHaveLength(0)
  })

  it('未过期峡谷(tick >= cutoff)保留', () => {
    ;(sys as any).canyons.push(makeCanyon({ tick: 1 })) // tick=1 >= cutoff=1 → 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 100001)
    expect((sys as any).canyons).toHaveLength(1)
  })

  it('同时有过期和未过期峡谷，只删过期的', () => {
    ;(sys as any).canyons.push(makeCanyon({ tick: 0 }))      // 过期
    ;(sys as any).canyons.push(makeCanyon({ tick: 50000 }))  // 未过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 100001)
    expect((sys as any).canyons).toHaveLength(1)
    expect((sys as any).canyons[0].tick).toBe(50000)
  })

  it('多个过期峡谷全部被清理', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).canyons.push(makeCanyon({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 100001)
    expect((sys as any).canyons).toHaveLength(0)
  })

  // ── MAX_CANYONS 上限 ──────────────────────────────────────────

  it('注入 MAX_CANYONS 个后不再 spawn', () => {
    for (let i = 0; i < MAX_CANYONS; i++) {
      ;(sys as any).canyons.push(makeCanyon({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // < FORM_CHANCE
    ;(sys as any).lastCheck = 0
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).canyons).toHaveLength(MAX_CANYONS)
  })

  it('MAX_CANYONS-1 个时还在上限内', () => {
    for (let i = 0; i < MAX_CANYONS - 1; i++) {
      ;(sys as any).canyons.push(makeCanyon())
    }
    expect((sys as any).canyons).toHaveLength(MAX_CANYONS - 1)
  })

  // ── id 自增 / 坐标 ────────────────────────────────────────────

  it('注入多个峡谷 id 不重复', () => {
    ;(sys as any).canyons.push(makeCanyon())
    ;(sys as any).canyons.push(makeCanyon())
    ;(sys as any).canyons.push(makeCanyon())
    const ids = (sys as any).canyons.map((c: Canyon) => c.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('每个峡谷有 x/y 坐标', () => {
    ;(sys as any).canyons.push(makeCanyon({ x: 15, y: 25 }))
    const c = (sys as any).canyons[0]
    expect(c.x).toBe(15)
    expect(c.y).toBe(25)
  })
})

describe('WorldCanyonSystem - 扩展补充', () => {
  let sys: WorldCanyonSystem
  beforeEach(() => { sys = new WorldCanyonSystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('补充-canyons初始为空Array', () => { expect(Array.isArray((sys as any).canyons)).toBe(true) })
  it('补充-nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('补充-lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('补充-tick=0时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-tick=2800时lastCheck更新为2800', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })
  it('补充-两次update间隔<CI时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2800)
    sys.update(1, w, e, 2800 + 100)
    expect((sys as any).lastCheck).toBe(2800)
  })
  it('补充-两次update间隔>=CI时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2800)
    sys.update(1, w, e, 2800 * 2)
    expect((sys as any).lastCheck).toBe(2800 * 2)
  })
  it('补充-update后canyons引用稳定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const ref = (sys as any).canyons
    sys.update(1, w, e, 2800)
    expect((sys as any).canyons).toBe(ref)
  })
  it('补充-canyons.splice正确', () => {
    ;(sys as any).canyons.push({ id: 1 })
    ;(sys as any).canyons.push({ id: 2 })
    ;(sys as any).canyons.splice(0, 1)
    expect((sys as any).canyons).toHaveLength(1)
  })
  it('补充-注入5个后length=5', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).canyons.push({ id: i+1 }) }
    expect((sys as any).canyons).toHaveLength(5)
  })
  it('补充-连续trigger lastCheck单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2800)
    const lc1 = (sys as any).lastCheck
    sys.update(1, w, e, 2800 * 2)
    expect((sys as any).lastCheck).toBeGreaterThanOrEqual(lc1)
  })
  it('补充-update后lastCheck不超过传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 999999)
    expect((sys as any).lastCheck).toBeLessThanOrEqual(999999)
  })
  it('补充-清空canyons后length=0', () => {
    ;(sys as any).canyons.push({ id: 1 })
    ;(sys as any).canyons.length = 0
    expect((sys as any).canyons).toHaveLength(0)
  })
  it('补充-id注入后可读取', () => {
    ;(sys as any).canyons.push({ id: 99 })
    expect((sys as any).canyons[0].id).toBe(99)
  })
  it('补充-多次trigger三轮lastCheck递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2800)
    sys.update(1, w, e, 2800 * 2)
    sys.update(1, w, e, 2800 * 3)
    expect((sys as any).lastCheck).toBe(2800 * 3)
  })
  it('补充-tick=CI-1时lastCheck保持0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2800 - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-canyons是同一引用', () => {
    const r1 = (sys as any).canyons
    const r2 = (sys as any).canyons
    expect(r1).toBe(r2)
  })
  it('补充-注入10个后length=10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).canyons.push({ id: i + 1 }) }
    expect((sys as any).canyons).toHaveLength(10)
  })
  it('补充-3个trigger间lastCheck精确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2800 * 3)
    expect((sys as any).lastCheck).toBe(2800 * 3)
  })
  it('补充-random=0.9时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2800)
    expect((sys as any).canyons).toHaveLength(0)
  })
  it('补充-canyons可以pop操作', () => {
    ;(sys as any).canyons.push({ id: 1 })
    ;(sys as any).canyons.pop()
    expect((sys as any).canyons).toHaveLength(0)
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
    sys.update(1, w, e, 2800 * N)
    expect((sys as any).lastCheck).toBe(2800 * N)
  })
  it('补充-注入元素tick字段可读取', () => {
    ;(sys as any).canyons.push({ id: 1, tick: 12345 })
    expect((sys as any).canyons[0].tick).toBe(12345)
  })
  it('补充-canyons注入x/y字段可读取', () => {
    ;(sys as any).canyons.push({ id: 1, x: 50, y: 60 })
    expect((sys as any).canyons[0].x).toBe(50)
    expect((sys as any).canyons[0].y).toBe(60)
  })
  it('补充-两次update在CI内仅执行一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2800)
    const lc = (sys as any).lastCheck
    sys.update(1, w, e, 2800 + 2800 - 1)
    expect((sys as any).lastCheck).toBe(lc)
  })
})
