import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldCinderConeSystem } from '../systems/WorldCinderConeSystem'
import type { CinderCone } from '../systems/WorldCinderConeSystem'

const CHECK_INTERVAL = 2800
const world = { width: 200, height: 200, getTile: () => 0 } as any
const em = {} as any

function makeSys(): WorldCinderConeSystem { return new WorldCinderConeSystem() }
let nextId = 1
function makeCone(overrides: Partial<CinderCone> = {}): CinderCone {
  return {
    id: nextId++, x: 30, y: 40, radius: 8,
    height: 20, ashDeposit: 60, activity: 50,
    erosion: 10, temperature: 300, tick: 0,
    ...overrides
  }
}

describe('WorldCinderConeSystem.getCones', () => {
  let sys: WorldCinderConeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // === 基础状态测试 ===
  it('初始无火山渣锥', () => { expect((sys as any).cones).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).cones.push(makeCone())
    expect((sys as any).cones).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).cones).toBe((sys as any).cones)
  })

  it('火山渣锥字段正确', () => {
    ;(sys as any).cones.push(makeCone())
    const c = (sys as any).cones[0]
    expect(c.ashDeposit).toBe(60)
    expect(c.temperature).toBe(300)
    expect(c.height).toBe(20)
  })

  it('多个火山渣锥全部返回', () => {
    ;(sys as any).cones.push(makeCone())
    ;(sys as any).cones.push(makeCone())
    expect((sys as any).cones).toHaveLength(2)
  })

  // === CHECK_INTERVAL 节流测试 ===
  it('tick不足CHECK_INTERVAL不触发更新', () => {
    ;(sys as any).cones.push(makeCone({ activity: 50, ashDeposit: 10 }))
    const before = (sys as any).cones[0].ashDeposit
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).cones[0].ashDeposit).toBe(before)
  })

  it('tick达到CHECK_INTERVAL时执行字段更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cones.push(makeCone({ activity: 50, ashDeposit: 10 }))
    const before = (sys as any).cones[0].ashDeposit
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones[0].ashDeposit).toBeGreaterThan(before)
  })

  it('lastCheck在update后被记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次间隔不足不重复更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cones.push(makeCone({ ashDeposit: 10 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    const after1 = (sys as any).cones[0].ashDeposit
    sys.update(1, world, em, CHECK_INTERVAL + 100)
    expect((sys as any).cones[0].ashDeposit).toBe(after1)
  })

  // === spawn 测试 ===
  it('DEEP_WATER地形不触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones).toHaveLength(0)
  })

  it('MOUNTAIN(5)地形可以spawn', () => {
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).cones.length).toBeGreaterThanOrEqual(1)
  })

  it('LAVA(7)地形可以spawn', () => {
    const lavaWorld = { width: 200, height: 200, getTile: () => 7 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, lavaWorld, em, CHECK_INTERVAL)
    expect((sys as any).cones.length).toBeGreaterThanOrEqual(1)
  })

  it('random超过FORM_CHANCE不spawn', () => {
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).cones).toHaveLength(0)
  })

  it('spawn锥体的tick等于当前tick', () => {
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    if ((sys as any).cones.length > 0) {
      expect((sys as any).cones[0].tick).toBe(CHECK_INTERVAL)
    }
  })

  it('spawn锥体的id从1开始递增', () => {
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    if ((sys as any).cones.length > 0) {
      expect((sys as any).cones[0].id).toBe(1)
    }
  })

  it('达到MAX_CONES(16)后不再spawn', () => {
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
    for (let i = 0; i < 16; i++) {
      ;(sys as any).cones.push(makeCone())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).cones).toHaveLength(16)
  })

  // === 字段更新逻辑测试 ===
  it('ashDeposit随activity增长且不超过80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cones.push(makeCone({ activity: 100, ashDeposit: 79.95 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones[0].ashDeposit).toBeLessThanOrEqual(80)
    expect((sys as any).cones[0].ashDeposit).toBeGreaterThan(79.95)
  })

  it('ashDeposit已达80时不再增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cones.push(makeCone({ activity: 100, ashDeposit: 80 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones[0].ashDeposit).toBe(80)
  })

  it('erosion每次update增加0.005且不超过60', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cones.push(makeCone({ erosion: 10 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones[0].erosion).toBeCloseTo(10.005, 5)
  })

  it('erosion上限为60', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cones.push(makeCone({ erosion: 60 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones[0].erosion).toBe(60)
  })

  it('height随erosion下降且下限为10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cones.push(makeCone({ height: 10, erosion: 60 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones[0].height).toBe(10)
  })

  it('temperature高activity时上升', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // activity=100, (100-30)*0.02=1.4 → temperature升高
    ;(sys as any).cones.push(makeCone({ activity: 100, temperature: 300 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones[0].temperature).toBeGreaterThan(300)
  })

  it('temperature上限为1200', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cones.push(makeCone({ activity: 100, temperature: 1200 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones[0].temperature).toBeLessThanOrEqual(1200)
  })

  it('temperature下限为50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // activity=0, (0-30)*0.02=-0.6, 但temperature=50时被Math.max(50,...)保护
    ;(sys as any).cones.push(makeCone({ activity: 0, temperature: 50 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones[0].temperature).toBeGreaterThanOrEqual(50)
  })

  // === cleanup 测试 ===
  it('过期锥体被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cones.push(makeCone({ tick: 0 }))
    // tick=100000 → cutoff=5000, cone.tick=0 < 5000 → 被删除
    sys.update(1, world, em, 100000)
    expect((sys as any).cones).toHaveLength(0)
  })

  it('未过期锥体不被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cones.push(makeCone({ tick: CHECK_INTERVAL }))
    // tick=CHECK_INTERVAL → cutoff=CHECK_INTERVAL-95000<0, cone.tick=CHECK_INTERVAL > cutoff
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones).toHaveLength(1)
  })

  it('cleanup只删除过期的，保留未过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cones.push(makeCone({ tick: 0 }))       // 过期: cutoff=5000, 0<5000
    ;(sys as any).cones.push(makeCone({ tick: 99000 }))   // 未过期: 99000>5000
    sys.update(1, world, em, 100000)
    expect((sys as any).cones).toHaveLength(1)
    expect((sys as any).cones[0].tick).toBe(99000)
  })

  it('activity被clamp在0-100之间', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    // random=0, (0-0.55)*0.3=-0.165, activity=0 → Math.max(0,...) = 0
    ;(sys as any).cones.push(makeCone({ activity: 0 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cones[0].activity).toBeGreaterThanOrEqual(0)
  })
})

describe('WorldCinderConeSystem - 扩展补充', () => {
  let sys: WorldCinderConeSystem
  beforeEach(() => { sys = new WorldCinderConeSystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('补充-cones初始为空Array', () => { expect(Array.isArray((sys as any).cones)).toBe(true) })
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
  it('补充-update后cones引用稳定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const ref = (sys as any).cones
    sys.update(1, w, e, 2800)
    expect((sys as any).cones).toBe(ref)
  })
  it('补充-cones.splice正确', () => {
    ;(sys as any).cones.push({ id: 1 })
    ;(sys as any).cones.push({ id: 2 })
    ;(sys as any).cones.splice(0, 1)
    expect((sys as any).cones).toHaveLength(1)
  })
  it('补充-注入5个后length=5', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).cones.push({ id: i+1 }) }
    expect((sys as any).cones).toHaveLength(5)
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
  it('补充-清空cones后length=0', () => {
    ;(sys as any).cones.push({ id: 1 })
    ;(sys as any).cones.length = 0
    expect((sys as any).cones).toHaveLength(0)
  })
  it('补充-id注入后可读取', () => {
    ;(sys as any).cones.push({ id: 99 })
    expect((sys as any).cones[0].id).toBe(99)
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
  it('补充-cones是同一引用', () => {
    const r1 = (sys as any).cones
    const r2 = (sys as any).cones
    expect(r1).toBe(r2)
  })
  it('补充-注入10个后length=10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).cones.push({ id: i + 1 }) }
    expect((sys as any).cones).toHaveLength(10)
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
    expect((sys as any).cones).toHaveLength(0)
  })
  it('补充-cones可以pop操作', () => {
    ;(sys as any).cones.push({ id: 1 })
    ;(sys as any).cones.pop()
    expect((sys as any).cones).toHaveLength(0)
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
    ;(sys as any).cones.push({ id: 1, tick: 12345 })
    expect((sys as any).cones[0].tick).toBe(12345)
  })
  it('补充-cones注入x/y字段可读取', () => {
    ;(sys as any).cones.push({ id: 1, x: 50, y: 60 })
    expect((sys as any).cones[0].x).toBe(50)
    expect((sys as any).cones[0].y).toBe(60)
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
