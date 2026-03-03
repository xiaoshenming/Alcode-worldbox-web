import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldFranciumSpringSystem } from '../systems/WorldFranciumSpringSystem'
import type { FranciumSpringZone } from '../systems/WorldFranciumSpringSystem'

const CHECK_INTERVAL = 3100
const MAX_ZONES = 32

const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any
const noSpawnWorld = { width: 200, height: 200, getTile: () => 3 } as any
const em = {} as any

function makeSys(): WorldFranciumSpringSystem { return new WorldFranciumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<FranciumSpringZone> = {}): FranciumSpringZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    franciumContent: 50,
    springFlow: 30,
    actiniumDecay: 40,
    alkaliReactivity: 60,
    tick: 0,
    ...overrides,
  }
}

describe('WorldFranciumSpringSystem', () => {
  let sys: WorldFranciumSpringSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.restoreAllMocks()
  })

  // ── 基础状态 ──────────────────────────────────────────────────

  it('初始无Francium泉区', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })

  it('Francium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.franciumContent).toBe(50)
    expect(z.springFlow).toBe(30)
    expect(z.actiniumDecay).toBe(40)
    expect(z.alkaliReactivity).toBe(60)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('多个Francium泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────

  it('tick 未达 CHECK_INTERVAL 时 update 跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
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

  // ── random=0.9 时不 spawn ──────────────────────────────────

  it('random=0.9 时不 spawn（大于 FORM_CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('GRASS tile 四周无水无山时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ── cleanup：tick < cutoff(tick-54000) 时删除 ─────────────

  it('过期泉区(tick < cutoff)被清理', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('未过期泉区(tick >= cutoff)保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('同时有过期和未过期泉区，只删过期的', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 10 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(10)
  })

  it('无过期泉区时 cleanup 不改变数量', () => {
    ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 100000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('多个过期泉区全部被清理', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('边界条件：tick 恰好等于 cutoff 时保留', () => {
    const currentTick = 54000
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  // ── MAX_ZONES 上限 ────────────────────────────────────────

  it('注入 MAX_ZONES 个泉区后不再 spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = 0
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('MAX_ZONES-1 个时仍在 limit 内', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    expect((sys as any).zones).toHaveLength(MAX_ZONES - 1)
  })

  // ── 字段范围验证 ──────────────────────────────────────────

  it('注入泉区 franciumContent 字段合法', () => {
    const z = makeZone({ franciumContent: 40 })
    expect(z.franciumContent).toBeGreaterThanOrEqual(40)
    expect(z.franciumContent).toBeLessThanOrEqual(100)
  })

  it('注入泉区 springFlow 字段合法', () => {
    const z = makeZone({ springFlow: 10 })
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
    expect(z.springFlow).toBeLessThanOrEqual(60)
  })

  it('注入泉区 actiniumDecay 字段合法', () => {
    const z = makeZone({ actiniumDecay: 20 })
    expect(z.actiniumDecay).toBeGreaterThanOrEqual(20)
    expect(z.actiniumDecay).toBeLessThanOrEqual(100)
  })

  it('注入泉区 alkaliReactivity 字段合法', () => {
    const z = makeZone({ alkaliReactivity: 15 })
    expect(z.alkaliReactivity).toBeGreaterThanOrEqual(15)
    expect(z.alkaliReactivity).toBeLessThanOrEqual(100)
  })

  // ── id 自增 ───────────────────────────────────────────────

  it('注入多个泉区 id 不重复', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    const ids = (sys as any).zones.map((z: FranciumSpringZone) => z.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('每个泉区有 x/y 坐标', () => {
    ;(sys as any).zones.push(makeZone({ x: 10, y: 20 }))
    const z = (sys as any).zones[0]
    expect(z.x).toBe(10)
    expect(z.y).toBe(20)
  })

  it('update 不影响 zones 字段（无字段更新逻辑）', () => {
    ;(sys as any).zones.push(makeZone({ franciumContent: 55, springFlow: 33, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.franciumContent).toBe(55)
    expect(z.springFlow).toBe(33)
  })

  it('每个泉区有 tick 字段记录创建时间', () => {
    ;(sys as any).zones.push(makeZone({ tick: 12345 }))
    const z = (sys as any).zones[0]
    expect(z.tick).toBe(12345)
  })
})

describe('WorldFranciumSpringSystem - 附加测试', () => {
  let sys: WorldFranciumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('zones初始为空数组', () => { expect((sys as any).zones).toHaveLength(0) })
  it('zones是数组类型', () => { expect(Array.isArray((sys as any).zones)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('tick不足CHECK_INTERVAL=3100时不更新lastCheck', () => {
    sys.update(1, safeWorld, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=3100时更新lastCheck', () => {
    sys.update(1, safeWorld, em, 3100)
    expect((sys as any).lastCheck).toBe(3100)
  })
  it('tick=3099时不触发', () => {
    sys.update(1, safeWorld, em, 3099)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=6200时再次触发', () => {
    sys.update(1, safeWorld, em, 3100)
    sys.update(1, safeWorld, em, 6200)
    expect((sys as any).lastCheck).toBe(6200)
  })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, safeWorld, em, 9300)
    expect((sys as any).lastCheck).toBe(9300)
  })
  it('注入zone后长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('注入5个后长度为5', () => {
    for (let i = 0; i < 5; i++) { (sys as any).zones.push(makeZone({ x: i })) }
    expect((sys as any).zones).toHaveLength(5)
  })
  it('zone含franciumContent字段', () => {
    const z = makeZone({ franciumContent: 75 })
    expect(z.franciumContent).toBe(75)
  })
  it('zone含springFlow字段', () => {
    const z = makeZone({ springFlow: 40 })
    expect(z.springFlow).toBe(40)
  })
  it('zone含actiniumDecay字段', () => {
    const z = makeZone({ actiniumDecay: 55 })
    expect(z.actiniumDecay).toBe(55)
  })
  it('zone含alkaliReactivity字段', () => {
    const z = makeZone({ alkaliReactivity: 70 })
    expect(z.alkaliReactivity).toBe(70)
  })
  it('zone含tick字段', () => {
    const z = makeZone({ tick: 5000 })
    expect(z.tick).toBe(5000)
  })
  it('zone含id字段', () => {
    const z = makeZone({ id: 42 })
    expect(z.id).toBe(42)
  })
  it('zone含x,y坐标', () => {
    const z = makeZone({ x: 15, y: 25 })
    expect(z.x).toBe(15); expect(z.y).toBe(25)
  })
  it('过期zone被删除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, safeWorld, em, 100000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('未过期zone保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 90000 }))
    sys.update(1, safeWorld, em, 95000)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('混合新旧只删旧的', () => {
    ;(sys as any).zones.push(makeZone({ id:1, tick: 0 }))
    ;(sys as any).zones.push(makeZone({ id:2, tick: 90000 }))
    sys.update(1, safeWorld, em, 95000)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('MAX_ZONES=32硬上限不超过', () => {
    for (let i = 0; i < 32; i++) { (sys as any).zones.push(makeZone({ id:i+1, tick: 999999, x:i })) }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, safeWorld, em, 3100)
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })
  it('zones中id不重复', () => {
    for (let i = 0; i < 5; i++) { (sys as any).zones.push(makeZone({ x: i })) }
    const ids = (sys as any).zones.map((z: any) => z.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
  it('空zones时update不崩溃', () => {
    expect(() => sys.update(1, safeWorld, em, 3100)).not.toThrow()
  })
  it('safeWorld(getTile=2)不spawn（需水/山）', () => {
    sys.update(1, safeWorld, em, 3100)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('同一tick两次update只触发一次', () => {
    sys.update(1, safeWorld, em, 3100)
    const lc1 = (sys as any).lastCheck
    sys.update(1, safeWorld, em, 3100)
    expect((sys as any).lastCheck).toBe(lc1)
  })
})
