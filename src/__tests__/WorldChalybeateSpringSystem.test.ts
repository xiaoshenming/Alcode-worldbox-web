import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldChalybeateSpringSystem } from '../systems/WorldChalybeateSpringSystem'
import type { ChalybeateSpring } from '../systems/WorldChalybeateSpringSystem'

const CHECK_INTERVAL = 3060
const MAX_SPRINGS = 12

const world = { width: 200, height: 200, getTile: () => 0 } as any
const em = {} as any

let nextId = 1
function makeSpring(overrides: Partial<ChalybeateSpring> = {}): ChalybeateSpring {
  return {
    id: nextId++,
    x: 20, y: 30,
    ironContent: 50,
    flowRate: 40,
    rustDeposit: 20,
    waterTaste: 60,
    tick: 0,
    ...overrides,
  }
}

function makeSys(): WorldChalybeateSpringSystem { return new WorldChalybeateSpringSystem() }

describe('WorldChalybeateSpringSystem', () => {
  let sys: WorldChalybeateSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ──────────────────────────────────────────────────
  it('初始无铁泉', () => {
    expect((sys as any).springs).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── 内部数组操作 ──────────────────────────────────────────────
  it('注入后可查询', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })

  it('返回内部引用一致', () => {
    expect((sys as any).springs).toBe((sys as any).springs)
  })

  it('铁泉字段正确', () => {
    ;(sys as any).springs.push(makeSpring())
    const s = (sys as any).springs[0]
    expect(s.ironContent).toBe(50)
    expect(s.flowRate).toBe(40)
    expect(s.rustDeposit).toBe(20)
    expect(s.waterTaste).toBe(60)
  })

  it('多个铁泉全部返回', () => {
    ;(sys as any).springs.push(makeSpring())
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────
  it('tick 未到 CHECK_INTERVAL 时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('tick 到达 CHECK_INTERVAL 时才运行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次 update 在同一周期内只触发一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    const check1 = (sys as any).lastCheck
    sys.update(1, world, em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(check1)
  })

  // ── Spawn 逻辑（无 tile 检查） ────────────────────────────────
  it('random < FORM_CHANCE 时生成铁泉', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(1)
  })

  it('random >= FORM_CHANCE 时不生成铁泉', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('已达 MAX_SPRINGS 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < MAX_SPRINGS; i++) {
      ;(sys as any).springs.push(makeSpring())
    }
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(MAX_SPRINGS)
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 的铁泉记录了正确 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).springs[0].tick).toBe(CHECK_INTERVAL)
  })

  it('spawn 的铁泉 ironContent 在字段更新后仍在钳制范围内（5~75）', () => {
    // spawn: ironContent = 15 + rand*35；随后字段更新循环立即执行（同一 update 调用），
    // random=0.001 使 delta 为负，可能使值低于 15，但 max(5,...) 保证下限为 5
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    const s = (sys as any).springs[0]
    expect(s.ironContent).toBeGreaterThanOrEqual(5)
    expect(s.ironContent).toBeLessThanOrEqual(75)
  })

  it('spawn 的铁泉 flowRate 在字段更新后仍在钳制范围内（2~50）', () => {
    // spawn: flowRate = 5 + rand*25；随后字段更新循环立即执行（同一 update 调用），
    // random=0.001 使 delta 为负，可能使值低于 5，但 max(2,...) 保证下限为 2
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    const s = (sys as any).springs[0]
    expect(s.flowRate).toBeGreaterThanOrEqual(2)
    expect(s.flowRate).toBeLessThanOrEqual(50)
  })

  it('spawn 的铁泉 x/y 坐标在世界范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    const s = (sys as any).springs[0]
    expect(s.x).toBeGreaterThanOrEqual(0)
    expect(s.x).toBeLessThan(world.width)
    expect(s.y).toBeGreaterThanOrEqual(0)
    expect(s.y).toBeLessThan(world.height)
  })

  // ── 字段更新 ──────────────────────────────────────────────────
  it('rustDeposit 每次 update 增加 0.006（未达上限时）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ rustDeposit: 30 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).springs[0].rustDeposit).toBeCloseTo(30.006, 4)
  })

  it('rustDeposit 不超过上限 70', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ rustDeposit: 69.999 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).springs[0].rustDeposit).toBeLessThanOrEqual(70)
  })

  it('ironContent 被钳制在 [5, 75] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ ironContent: 74 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    const ic = (sys as any).springs[0].ironContent
    expect(ic).toBeGreaterThanOrEqual(5)
    expect(ic).toBeLessThanOrEqual(75)
  })

  it('flowRate 被钳制在 [2, 50] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ flowRate: 49 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    const fr = (sys as any).springs[0].flowRate
    expect(fr).toBeGreaterThanOrEqual(2)
    expect(fr).toBeLessThanOrEqual(50)
  })

  it('偏正随机（random=0.9）使 ironContent 有增大趋势', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ ironContent: 40 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    // random=0.9 > 0.48，delta = (0.9-0.48)*0.2 = +0.084，应该增大
    expect((sys as any).springs[0].ironContent).toBeGreaterThan(40)
  })

  // ── Cleanup 逻辑 ──────────────────────────────────────────────
  it('tick 超出 83000 的铁泉被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ tick: 0 }))
    sys.update(1, world, em, CHECK_INTERVAL + 83001)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('tick 未超出 83000 的铁泉保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL * 2
    ;(sys as any).springs.push(makeSpring({ tick: currentTick - 1000 }))
    sys.update(1, world, em, currentTick)
    expect((sys as any).springs).toHaveLength(1)
  })

  it('过期和未过期混合时只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + 200000
    ;(sys as any).lastCheck = 0
    ;(sys as any).springs.push(makeSpring({ tick: 0 }))                    // 过期
    ;(sys as any).springs.push(makeSpring({ tick: currentTick - 1000 }))   // 未过期
    sys.update(1, world, em, currentTick)
    expect((sys as any).springs).toHaveLength(1)
    expect((sys as any).springs[0].tick).toBe(currentTick - 1000)
  })
})

describe('WorldChalybeateSpringSystem - 扩展补充', () => {
  let sys: WorldChalybeateSpringSystem
  beforeEach(() => { sys = new WorldChalybeateSpringSystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('补充-springs初始为空Array', () => { expect(Array.isArray((sys as any).springs)).toBe(true) })
  it('补充-nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('补充-lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('补充-tick=0时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-tick=3060时lastCheck更新为3060', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3060)
    expect((sys as any).lastCheck).toBe(3060)
  })
  it('补充-两次update间隔<CI时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3060)
    sys.update(1, w, e, 3060 + 100)
    expect((sys as any).lastCheck).toBe(3060)
  })
  it('补充-两次update间隔>=CI时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3060)
    sys.update(1, w, e, 3060 * 2)
    expect((sys as any).lastCheck).toBe(3060 * 2)
  })
  it('补充-update后springs引用稳定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const ref = (sys as any).springs
    sys.update(1, w, e, 3060)
    expect((sys as any).springs).toBe(ref)
  })
  it('补充-springs.splice正确', () => {
    ;(sys as any).springs.push({ id: 1 })
    ;(sys as any).springs.push({ id: 2 })
    ;(sys as any).springs.splice(0, 1)
    expect((sys as any).springs).toHaveLength(1)
  })
  it('补充-注入5个后length=5', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).springs.push({ id: i+1 }) }
    expect((sys as any).springs).toHaveLength(5)
  })
  it('补充-连续trigger lastCheck单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3060)
    const lc1 = (sys as any).lastCheck
    sys.update(1, w, e, 3060 * 2)
    expect((sys as any).lastCheck).toBeGreaterThanOrEqual(lc1)
  })
  it('补充-update后lastCheck不超过传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 999999)
    expect((sys as any).lastCheck).toBeLessThanOrEqual(999999)
  })
  it('补充-清空springs后length=0', () => {
    ;(sys as any).springs.push({ id: 1 })
    ;(sys as any).springs.length = 0
    expect((sys as any).springs).toHaveLength(0)
  })
  it('补充-id注入后可读取', () => {
    ;(sys as any).springs.push({ id: 99 })
    expect((sys as any).springs[0].id).toBe(99)
  })
  it('补充-多次trigger三轮lastCheck递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3060)
    sys.update(1, w, e, 3060 * 2)
    sys.update(1, w, e, 3060 * 3)
    expect((sys as any).lastCheck).toBe(3060 * 3)
  })
  it('补充-tick=CI-1时lastCheck保持0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3060 - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-springs是同一引用', () => {
    const r1 = (sys as any).springs
    const r2 = (sys as any).springs
    expect(r1).toBe(r2)
  })
  it('补充-注入10个后length=10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).springs.push({ id: i + 1 }) }
    expect((sys as any).springs).toHaveLength(10)
  })
  it('补充-3个trigger间lastCheck精确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3060 * 3)
    expect((sys as any).lastCheck).toBe(3060 * 3)
  })
  it('补充-random=0.9时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3060)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('补充-springs可以pop操作', () => {
    ;(sys as any).springs.push({ id: 1 })
    ;(sys as any).springs.pop()
    expect((sys as any).springs).toHaveLength(0)
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
    sys.update(1, w, e, 3060 * N)
    expect((sys as any).lastCheck).toBe(3060 * N)
  })
  it('补充-注入元素tick字段可读取', () => {
    ;(sys as any).springs.push({ id: 1, tick: 12345 })
    expect((sys as any).springs[0].tick).toBe(12345)
  })
  it('补充-springs注入x/y字段可读取', () => {
    ;(sys as any).springs.push({ id: 1, x: 50, y: 60 })
    expect((sys as any).springs[0].x).toBe(50)
    expect((sys as any).springs[0].y).toBe(60)
  })
  it('补充-两次update在CI内仅执行一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3060)
    const lc = (sys as any).lastCheck
    sys.update(1, w, e, 3060 + 3060 - 1)
    expect((sys as any).lastCheck).toBe(lc)
  })
})
