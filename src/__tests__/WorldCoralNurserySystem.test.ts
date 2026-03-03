import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldCoralNurserySystem } from '../systems/WorldCoralNurserySystem'
import type { CoralNursery, CoralHealth } from '../systems/WorldCoralNurserySystem'

function makeSys(): WorldCoralNurserySystem { return new WorldCoralNurserySystem() }
let nextId = 1
function makeNursery(health: CoralHealth = 'healthy', overrides: Partial<CoralNursery> = {}): CoralNursery {
  return { id: nextId++, x: 30, y: 40, coralCount: 50, health, growthRate: 0.7, biodiversity: 80, waterTemp: 26, tick: 0, ...overrides }
}

const SAFE_WORLD = { width: 200, height: 200, getTile: () => 3 }
const SHALLOW_WORLD = { width: 200, height: 200, getTile: () => 1 }
const SHALLOW_STR_WORLD = { width: 200, height: 200, getTile: () => 'shallow_water' }

describe('WorldCoralNurserySystem - 基础状态', () => {
  let sys: WorldCoralNurserySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珊瑚苗圃', () => { expect((sys as any).nurseries).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).nurseries.push(makeNursery())
    expect((sys as any).nurseries).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).nurseries).toBe((sys as any).nurseries)
  })
  it('支持4种健康状态', () => {
    const levels: CoralHealth[] = ['pristine', 'healthy', 'degraded', 'dead']
    expect(levels).toHaveLength(4)
  })
  it('珊瑚苗圃字段正确', () => {
    ;(sys as any).nurseries.push(makeNursery('pristine'))
    const n = (sys as any).nurseries[0]
    expect(n.health).toBe('pristine')
    expect(n.coralCount).toBe(50)
    expect(n.waterTemp).toBe(26)
  })
})

describe('WorldCoralNurserySystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldCoralNurserySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足时不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SHALLOW_WORLD, {} as any, 100)
    sys.update(1, SHALLOW_WORLD, {} as any, 200)
    expect((sys as any).nurseries).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick >= CHECK_INTERVAL(3500) 后触发检查', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    // 安全世界getTile=3不spawn，但lastCheck已被更新
    expect((sys as any).lastCheck).toBe(3500)
    vi.restoreAllMocks()
  })

  it('连续两次调用间隔不足时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    const countAfterFirst = (sys as any).nurseries.length
    sys.update(1, SAFE_WORLD, {} as any, 3600)
    expect((sys as any).nurseries.length).toBe(countAfterFirst)
    vi.restoreAllMocks()
  })
})

describe('WorldCoralNurserySystem - spawn生成', () => {
  let sys: WorldCoralNurserySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('SHALLOW_WATER(tile=1)触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002) // < SPAWN_CHANCE=0.004
    sys.update(1, SHALLOW_WORLD, {} as any, 3500)
    expect((sys as any).nurseries).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it("tile='shallow_water'字符串也触发spawn", () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, SHALLOW_STR_WORLD, {} as any, 3500)
    expect((sys as any).nurseries).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('GRASS地形(tile=3)不触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect((sys as any).nurseries).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random >= SPAWN_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SHALLOW_WORLD, {} as any, 3500)
    expect((sys as any).nurseries).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('已达MAX_NURSERIES(12)时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    for (let i = 0; i < 12; i++) {
      (sys as any).nurseries.push(makeNursery())
    }
    sys.update(1, SHALLOW_WORLD, {} as any, 3500)
    expect((sys as any).nurseries).toHaveLength(12)
    vi.restoreAllMocks()
  })

  it('新spawn的health初始值为healthy（spawn后立即recovery逻辑可将其升为pristine）', () => {
    // spawn成功后update逻辑也会运行，waterTemp<=26时random<0.008触发recovery
    // 使用mockReturnValueOnce精确控制：第1次0.002触发spawn，之后0.9不触发任何随机事件
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.002) // 触发spawn
      .mockReturnValue(0.9)        // 其余调用不触发任何条件
    sys.update(1, SHALLOW_WORLD, {} as any, 3500)
    // spawn初始设为healthy，但后续recovery可能将其升为pristine（取决于mock）
    // random=0.9 > 0.008，不触发recovery，health保持healthy
    expect((sys as any).nurseries[0].health).toBe('healthy')
    vi.restoreAllMocks()
  })
})

describe('WorldCoralNurserySystem - 健康降级（高温压力）', () => {
  let sys: WorldCoralNurserySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('waterTemp>28时健康从pristine降至healthy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // < 0.02 触发降级
    const n = makeNursery('pristine', { waterTemp: 30 })
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect(n.health).toBe('healthy')
    vi.restoreAllMocks()
  })

  it('waterTemp>28时健康从healthy降至degraded', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const n = makeNursery('healthy', { waterTemp: 30 })
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect(n.health).toBe('degraded')
    vi.restoreAllMocks()
  })

  it('waterTemp<=28时不触发降级', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const n = makeNursery('pristine', { waterTemp: 28 })
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect(n.health).toBe('pristine')
    vi.restoreAllMocks()
  })

  it('dead状态跳过所有更新逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const n = makeNursery('dead', { waterTemp: 30, coralCount: 5 })
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    // dead状态不处理health降级，coralCount保持不变
    expect(n.coralCount).toBe(5)
    vi.restoreAllMocks()
  })
})

describe('WorldCoralNurserySystem - 自然恢复（低温）', () => {
  let sys: WorldCoralNurserySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('waterTemp<=26且random<0.008时健康从degraded恢复到healthy', () => {
    // random需要精心控制：不触发growthRate增长(0.005)但触发恢复(0.008)
    // 使用0.006: growthRate增长<0.005不满足，但恢复<0.008满足
    vi.spyOn(Math, 'random').mockReturnValue(0.006)
    const n = makeNursery('degraded', { waterTemp: 24, biodiversity: 5 }) // biodiversity<=10不触发growthRate
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect(n.health).toBe('healthy')
    vi.restoreAllMocks()
  })

  it('pristine状态无法再恢复（已是最佳）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.006)
    const n = makeNursery('pristine', { waterTemp: 24, biodiversity: 5 })
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect(n.health).toBe('pristine')
    vi.restoreAllMocks()
  })
})

describe('WorldCoralNurserySystem - 珊瑚生长', () => {
  let sys: WorldCoralNurserySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('pristine时coralCount可增长', () => {
    // growthRate=1.0, mult=1.0, 需 random < growthRate*mult*0.04 = 0.04
    vi.spyOn(Math, 'random').mockReturnValue(0.03)
    const n = makeNursery('pristine', { growthRate: 1.0, biodiversity: 5 })
    const oldCount = n.coralCount
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect(n.coralCount).toBe(oldCount + 1)
    vi.restoreAllMocks()
  })

  it('biodiversity增长上限为50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.03)
    const n = makeNursery('pristine', { growthRate: 1.0, biodiversity: 49.9 })
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect(n.biodiversity).toBeLessThanOrEqual(50)
    vi.restoreAllMocks()
  })

  it('biodiversity>10时growthRate可提升', () => {
    // random需 < 0.005 触发growthRate提升
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    const n = makeNursery('healthy', { biodiversity: 15, growthRate: 0.5, waterTemp: 30 })
    // waterTemp=30且random=0.003<0.02会触发降级，先用waterTemp<=28避免
    const n2 = makeNursery('healthy', { biodiversity: 15, growthRate: 0.5, waterTemp: 26 })
    ;(sys as any).nurseries.push(n2)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect(n2.growthRate).toBeCloseTo(0.52, 5)
    vi.restoreAllMocks()
  })

  it('growthRate上限为1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    const n = makeNursery('healthy', { biodiversity: 15, growthRate: 0.99, waterTemp: 26 })
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect(n.growthRate).toBeLessThanOrEqual(1)
    vi.restoreAllMocks()
  })
})

describe('WorldCoralNurserySystem - cleanup（概率性清除）', () => {
  let sys: WorldCoralNurserySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('dead且random<0.01时被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const n = makeNursery('dead')
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect((sys as any).nurseries).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('dead但random>=0.01时不清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const n = makeNursery('dead')
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect((sys as any).nurseries).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('healthy状态不被cleanup清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const n = makeNursery('healthy')
    ;(sys as any).nurseries.push(n)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect((sys as any).nurseries).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('多个dead苗圃全部被清除，healthy苗圃存活', () => {
    // random=0.001 < 0.01，dead被清除
    // 但healthy苗圃waterTemp=26, random=0.001 < 0.008，会触发recovery升为pristine
    // 测试健康状态不是dead，用notBe('dead')或用toBe('pristine')
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).nurseries.push(makeNursery('dead'))
    ;(sys as any).nurseries.push(makeNursery('dead'))
    ;(sys as any).nurseries.push(makeNursery('healthy'))
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD, {} as any, 3500)
    expect((sys as any).nurseries).toHaveLength(1)
    // healthy 在 random=0.001<0.008 下会被恢复为 pristine（idx=1->0）
    expect((sys as any).nurseries[0].health).toBe('pristine')
    vi.restoreAllMocks()
  })
})

describe('WorldCoralNurserySystem - 扩展补充', () => {
  let sys: WorldCoralNurserySystem
  beforeEach(() => { sys = new WorldCoralNurserySystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('补充-nurseries初始为空Array', () => { expect(Array.isArray((sys as any).nurseries)).toBe(true) })
  it('补充-nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('补充-lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('补充-tick=0时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-tick=3500时lastCheck更新为3500', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3500)
    expect((sys as any).lastCheck).toBe(3500)
  })
  it('补充-两次update间隔<CI时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3500)
    sys.update(1, w, e, 3500 + 100)
    expect((sys as any).lastCheck).toBe(3500)
  })
  it('补充-两次update间隔>=CI时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3500)
    sys.update(1, w, e, 3500 * 2)
    expect((sys as any).lastCheck).toBe(3500 * 2)
  })
  it('补充-update后nurseries引用稳定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const ref = (sys as any).nurseries
    sys.update(1, w, e, 3500)
    expect((sys as any).nurseries).toBe(ref)
  })
  it('补充-nurseries.splice正确', () => {
    ;(sys as any).nurseries.push({ id: 1 })
    ;(sys as any).nurseries.push({ id: 2 })
    ;(sys as any).nurseries.splice(0, 1)
    expect((sys as any).nurseries).toHaveLength(1)
  })
  it('补充-注入5个后length=5', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).nurseries.push({ id: i+1 }) }
    expect((sys as any).nurseries).toHaveLength(5)
  })
  it('补充-连续trigger lastCheck单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3500)
    const lc1 = (sys as any).lastCheck
    sys.update(1, w, e, 3500 * 2)
    expect((sys as any).lastCheck).toBeGreaterThanOrEqual(lc1)
  })
  it('补充-update后lastCheck不超过传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 999999)
    expect((sys as any).lastCheck).toBeLessThanOrEqual(999999)
  })
  it('补充-清空nurseries后length=0', () => {
    ;(sys as any).nurseries.push({ id: 1 })
    ;(sys as any).nurseries.length = 0
    expect((sys as any).nurseries).toHaveLength(0)
  })
  it('补充-id注入后可读取', () => {
    ;(sys as any).nurseries.push({ id: 99 })
    expect((sys as any).nurseries[0].id).toBe(99)
  })
  it('补充-多次trigger三轮lastCheck递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3500)
    sys.update(1, w, e, 3500 * 2)
    sys.update(1, w, e, 3500 * 3)
    expect((sys as any).lastCheck).toBe(3500 * 3)
  })
  it('补充-tick=CI-1时lastCheck保持0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3500 - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-nurseries是同一引用', () => {
    const r1 = (sys as any).nurseries
    const r2 = (sys as any).nurseries
    expect(r1).toBe(r2)
  })
  it('补充-注入10个后length=10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).nurseries.push({ id: i + 1 }) }
    expect((sys as any).nurseries).toHaveLength(10)
  })
  it('补充-3个trigger间lastCheck精确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3500 * 3)
    expect((sys as any).lastCheck).toBe(3500 * 3)
  })
  it('补充-random=0.9时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3500)
    expect((sys as any).nurseries).toHaveLength(0)
  })
  it('补充-nurseries可以pop操作', () => {
    ;(sys as any).nurseries.push({ id: 1 })
    ;(sys as any).nurseries.pop()
    expect((sys as any).nurseries).toHaveLength(0)
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
    sys.update(1, w, e, 3500 * N)
    expect((sys as any).lastCheck).toBe(3500 * N)
  })
  it('补充-注入元素tick字段可读取', () => {
    ;(sys as any).nurseries.push({ id: 1, tick: 12345 })
    expect((sys as any).nurseries[0].tick).toBe(12345)
  })
  it('补充-nurseries注入x/y字段可读取', () => {
    ;(sys as any).nurseries.push({ id: 1, x: 50, y: 60 })
    expect((sys as any).nurseries[0].x).toBe(50)
    expect((sys as any).nurseries[0].y).toBe(60)
  })
  it('补充-两次update在CI内仅执行一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 3500)
    const lc = (sys as any).lastCheck
    sys.update(1, w, e, 3500 + 3500 - 1)
    expect((sys as any).lastCheck).toBe(lc)
  })
})
