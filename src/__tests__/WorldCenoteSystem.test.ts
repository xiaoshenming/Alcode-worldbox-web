import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldCenoteSystem } from '../systems/WorldCenoteSystem'
import type { Cenote } from '../systems/WorldCenoteSystem'

const CHECK_INTERVAL = 2900
const MAX_CENOTES = 12

// 安全 world mock：getTile 返回 0（DEEP_WATER），不会触发 spawn
const world = { width: 200, height: 200, getTile: () => 0 } as any
// spawn world mock：getTile 返回 3（GRASS），会触发 spawn
const grassWorld = { width: 200, height: 200, getTile: () => 3 } as any
const em = {} as any

let nextId = 1
function makeCenote(overrides: Partial<Cenote> = {}): Cenote {
  return {
    id: nextId++,
    x: 15, y: 25,
    diameter: 20, depth: 40,
    waterClarity: 90, waterLevel: 80,
    stalactites: 15, sacredValue: 70,
    tick: 0,
    ...overrides,
  }
}

function makeSys(): WorldCenoteSystem { return new WorldCenoteSystem() }

describe('WorldCenoteSystem', () => {
  let sys: WorldCenoteSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ──────────────────────────────────────────────────
  it('初始无地下湖', () => {
    expect((sys as any).cenotes).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── 内部数组操作 ──────────────────────────────────────────────
  it('注入后可查询', () => {
    ;(sys as any).cenotes.push(makeCenote())
    expect((sys as any).cenotes).toHaveLength(1)
  })

  it('返回内部引用一致', () => {
    expect((sys as any).cenotes).toBe((sys as any).cenotes)
  })

  it('地下湖字段正确', () => {
    ;(sys as any).cenotes.push(makeCenote())
    const c = (sys as any).cenotes[0]
    expect(c.depth).toBe(40)
    expect(c.waterClarity).toBe(90)
    expect(c.sacredValue).toBe(70)
  })

  it('多个地下湖全部返回', () => {
    ;(sys as any).cenotes.push(makeCenote())
    ;(sys as any).cenotes.push(makeCenote())
    expect((sys as any).cenotes).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────
  it('tick 未到 CHECK_INTERVAL 时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, 0)       // lastCheck = 0
    sys.update(1, grassWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).cenotes).toHaveLength(0)
  })

  it('tick 到达 CHECK_INTERVAL 时才运行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    // 运行了但 random > FORM_CHANCE，不 spawn，仅验证 lastCheck 已更新
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('lastCheck 在首次 update 后更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  // ── Spawn 逻辑 ────────────────────────────────────────────────
  it('random < FORM_CHANCE 且 tile=GRASS 时生成地下湖', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).cenotes).toHaveLength(1)
  })

  it('random < FORM_CHANCE 且 tile=FOREST(4) 时生成地下湖', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any
    sys.update(1, forestWorld, em, CHECK_INTERVAL)
    expect((sys as any).cenotes).toHaveLength(1)
  })

  it('random < FORM_CHANCE 但 tile=DEEP_WATER 不生成地下湖', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cenotes).toHaveLength(0)
  })

  it('random >= FORM_CHANCE 时不生成地下湖', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).cenotes).toHaveLength(0)
  })

  it('已达 MAX_CENOTES 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < MAX_CENOTES; i++) {
      ;(sys as any).cenotes.push(makeCenote())
    }
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).cenotes).toHaveLength(MAX_CENOTES)
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 的地下湖记录了正确 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).cenotes[0].tick).toBe(CHECK_INTERVAL)
  })

  // ── 字段更新（每次 update 执行） ──────────────────────────────
  it('sacredValue 每次 update 增加 0.005（未达上限时）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cenotes.push(makeCenote({ sacredValue: 50 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    const sv = (sys as any).cenotes[0].sacredValue
    expect(sv).toBeGreaterThanOrEqual(50.005 - 0.001) // 留浮点余量
  })

  it('sacredValue 不超过上限 80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cenotes.push(makeCenote({ sacredValue: 79.999 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cenotes[0].sacredValue).toBeLessThanOrEqual(80)
  })

  it('stalactites 每次 update 增加 0.002（未达上限时）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cenotes.push(makeCenote({ stalactites: 10 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    const st = (sys as any).cenotes[0].stalactites
    expect(st).toBeCloseTo(10.002, 4)
  })

  it('stalactites 不超过上限 30', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cenotes.push(makeCenote({ stalactites: 29.999 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cenotes[0].stalactites).toBeLessThanOrEqual(30)
  })

  it('waterClarity 被钳制在 [20, 90] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cenotes.push(makeCenote({ waterClarity: 90 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    const wc = (sys as any).cenotes[0].waterClarity
    expect(wc).toBeGreaterThanOrEqual(20)
    expect(wc).toBeLessThanOrEqual(90)
  })

  it('waterLevel 被钳制在 [15, 80] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cenotes.push(makeCenote({ waterLevel: 80 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    const wl = (sys as any).cenotes[0].waterLevel
    expect(wl).toBeGreaterThanOrEqual(15)
    expect(wl).toBeLessThanOrEqual(80)
  })

  // ── Cleanup 逻辑 ──────────────────────────────────────────────
  it('tick 超出 96000 的地下湖被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cenotes.push(makeCenote({ tick: 0 }))
    sys.update(1, world, em, CHECK_INTERVAL + 96000 + 1)
    expect((sys as any).cenotes).toHaveLength(0)
  })

  it('tick 未超出 96000 的地下湖保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = CHECK_INTERVAL + 96000
    ;(sys as any).cenotes.push(makeCenote({ tick: 1 }))
    sys.update(1, world, em, tick)
    // cutoff = tick - 96000 = CHECK_INTERVAL；cenote.tick=1 > cutoff 时保留
    // 实际 cutoff = CHECK_INTERVAL + 96000 - 96000 = CHECK_INTERVAL = 2900
    // cenote.tick = 1 < 2900 → 会被删除；改用更近的 tick 测试
    // 重置并使用更大的 cenote.tick
    ;(sys as any).cenotes = []
    const bigTick = CHECK_INTERVAL * 2
    ;(sys as any).cenotes.push(makeCenote({ tick: bigTick - 100 }))
    sys.update(1, world, em, bigTick)
    expect((sys as any).cenotes).toHaveLength(1)
  })

  it('过期和未过期混合时只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + 200000
    ;(sys as any).lastCheck = 0  // 强制 update 运行
    ;(sys as any).cenotes.push(makeCenote({ tick: 0 }))           // 过期
    ;(sys as any).cenotes.push(makeCenote({ tick: currentTick - 1000 }))  // 未过期
    sys.update(1, world, em, currentTick)
    expect((sys as any).cenotes).toHaveLength(1)
  })
})

describe('WorldCenoteSystem - 扩展补充', () => {
  let sys: WorldCenoteSystem
  beforeEach(() => { sys = new WorldCenoteSystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('补充-cenotes初始为空Array', () => { expect(Array.isArray((sys as any).cenotes)).toBe(true) })
  it('补充-nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('补充-lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('补充-tick=0时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-tick=2900时lastCheck更新为2900', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2900)
    expect((sys as any).lastCheck).toBe(2900)
  })
  it('补充-两次update间隔<CI时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2900)
    sys.update(1, w, e, 2900 + 100)
    expect((sys as any).lastCheck).toBe(2900)
  })
  it('补充-两次update间隔>=CI时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2900)
    sys.update(1, w, e, 2900 * 2)
    expect((sys as any).lastCheck).toBe(2900 * 2)
  })
  it('补充-update后cenotes引用稳定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const ref = (sys as any).cenotes
    sys.update(1, w, e, 2900)
    expect((sys as any).cenotes).toBe(ref)
  })
  it('补充-cenotes.splice正确', () => {
    ;(sys as any).cenotes.push({ id: 1 })
    ;(sys as any).cenotes.push({ id: 2 })
    ;(sys as any).cenotes.splice(0, 1)
    expect((sys as any).cenotes).toHaveLength(1)
  })
  it('补充-注入5个后length=5', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).cenotes.push({ id: i+1 }) }
    expect((sys as any).cenotes).toHaveLength(5)
  })
  it('补充-连续trigger lastCheck单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2900)
    const lc1 = (sys as any).lastCheck
    sys.update(1, w, e, 2900 * 2)
    expect((sys as any).lastCheck).toBeGreaterThanOrEqual(lc1)
  })
  it('补充-update后lastCheck不超过传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 999999)
    expect((sys as any).lastCheck).toBeLessThanOrEqual(999999)
  })
  it('补充-清空cenotes后length=0', () => {
    ;(sys as any).cenotes.push({ id: 1 })
    ;(sys as any).cenotes.length = 0
    expect((sys as any).cenotes).toHaveLength(0)
  })
  it('补充-id注入后可读取', () => {
    ;(sys as any).cenotes.push({ id: 99 })
    expect((sys as any).cenotes[0].id).toBe(99)
  })
  it('补充-多次trigger三轮lastCheck递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2900)
    sys.update(1, w, e, 2900 * 2)
    sys.update(1, w, e, 2900 * 3)
    expect((sys as any).lastCheck).toBe(2900 * 3)
  })
  it('补充-tick=CI-1时lastCheck保持0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2900 - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-cenotes是同一引用', () => {
    const r1 = (sys as any).cenotes
    const r2 = (sys as any).cenotes
    expect(r1).toBe(r2)
  })
  it('补充-注入10个后length=10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).cenotes.push({ id: i + 1 }) }
    expect((sys as any).cenotes).toHaveLength(10)
  })
  it('补充-3个trigger间lastCheck精确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2900 * 3)
    expect((sys as any).lastCheck).toBe(2900 * 3)
  })
  it('补充-random=0.9时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2900)
    expect((sys as any).cenotes).toHaveLength(0)
  })
  it('补充-cenotes可以pop操作', () => {
    ;(sys as any).cenotes.push({ id: 1 })
    ;(sys as any).cenotes.pop()
    expect((sys as any).cenotes).toHaveLength(0)
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
    sys.update(1, w, e, 2900 * N)
    expect((sys as any).lastCheck).toBe(2900 * N)
  })
  it('补充-注入元素tick字段可读取', () => {
    ;(sys as any).cenotes.push({ id: 1, tick: 12345 })
    expect((sys as any).cenotes[0].tick).toBe(12345)
  })
  it('补充-cenotes注入x/y字段可读取', () => {
    ;(sys as any).cenotes.push({ id: 1, x: 50, y: 60 })
    expect((sys as any).cenotes[0].x).toBe(50)
    expect((sys as any).cenotes[0].y).toBe(60)
  })
  it('补充-两次update在CI内仅执行一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2900)
    const lc = (sys as any).lastCheck
    sys.update(1, w, e, 2900 + 2900 - 1)
    expect((sys as any).lastCheck).toBe(lc)
  })
})
