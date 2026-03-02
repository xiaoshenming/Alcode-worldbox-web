import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRavineSystem } from '../systems/WorldRavineSystem'
import type { Ravine } from '../systems/WorldRavineSystem'

// TileType: DEEP_WATER=0,SHALLOW_WATER=1,SAND=2,GRASS=3,FOREST=4,MOUNTAIN=5,SNOW=6,LAVA=7
const TileType = { DEEP_WATER:0, SHALLOW_WATER:1, SAND:2, GRASS:3, FOREST:4, MOUNTAIN:5, SNOW:6, LAVA:7 }

function makeSys(): WorldRavineSystem { return new WorldRavineSystem() }

let _id = 1
function makeRavine(overrides: Partial<Ravine> = {}): Ravine {
  return {
    id: _id++, x: 20, y: 30,
    length: 20, depth: 8, wallSteepness: 75,
    waterFlow: 30, erosionRate: 3, spectacle: 65, tick: 0,
    ...overrides
  }
}

function makeWorld(tile: number = TileType.MOUNTAIN) {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn().mockReturnValue(tile),
    setTile: vi.fn(),
  }
}

function makeEM() {
  return { getEntitiesWithComponents: vi.fn().mockReturnValue([]) }
}

// CHECK_INTERVAL = 2590, FORM_CHANCE = 0.0015, MAX_RAVINES = 15
// cutoff = tick - 89000  =>  tick < cutoff 删除 (strict <)
// depth min=10 max=50, waterFlow min=5 max=30, wallSteepness min=40 max=85, spectacle min=18 max=58

describe('WorldRavineSystem - 初始状态', () => {
  let sys: WorldRavineSystem

  beforeEach(() => { sys = makeSys(); _id = 1 })

  it('ravines 初始为空数组', () => {
    expect((sys as any).ravines).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入一个 ravine 后 length 为 1', () => {
    ;(sys as any).ravines.push(makeRavine())
    expect((sys as any).ravines).toHaveLength(1)
  })
  it('注入两个 ravine 后 length 为 2', () => {
    ;(sys as any).ravines.push(makeRavine(), makeRavine())
    expect((sys as any).ravines).toHaveLength(2)
  })
  it('ravines 返回内部同一引用', () => {
    const a = (sys as any).ravines
    const b = (sys as any).ravines
    expect(a).toBe(b)
  })
  it('冲沟 wallSteepness 字段正确读取', () => {
    ;(sys as any).ravines.push(makeRavine({ wallSteepness: 60 }))
    expect((sys as any).ravines[0].wallSteepness).toBe(60)
  })
  it('冲沟 erosionRate 字段正确读取', () => {
    ;(sys as any).ravines.push(makeRavine({ erosionRate: 5 }))
    expect((sys as any).ravines[0].erosionRate).toBe(5)
  })
})

describe('WorldRavineSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldRavineSystem
  const world = makeWorld(TileType.GRASS) // 不会 spawn（需 MOUNTAIN/FOREST）
  const em = makeEM()

  beforeEach(() => { sys = makeSys(); _id = 1 })

  it('tick < CHECK_INTERVAL(2590) 时不执行 lastCheck 更新', () => {
    sys.update(0, world as any, em as any, 2589)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick === CHECK_INTERVAL(2590) 时执行并更新 lastCheck', () => {
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).lastCheck).toBe(2590)
  })
  it('tick > CHECK_INTERVAL 时执行', () => {
    sys.update(0, world as any, em as any, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('执行一次后再次 tick 不足 CHECK_INTERVAL 不再执行', () => {
    sys.update(0, world as any, em as any, 2590)
    const prevCheck = (sys as any).lastCheck
    sys.update(0, world as any, em as any, 2590 + 2589)
    expect((sys as any).lastCheck).toBe(prevCheck)
  })
  it('第二次满足间隔后 lastCheck 更新', () => {
    sys.update(0, world as any, em as any, 2590)
    sys.update(0, world as any, em as any, 2590 + 2590)
    expect((sys as any).lastCheck).toBe(5180)
  })
  it('tick=0 不执行（0-0=0 < 2590）', () => {
    sys.update(0, world as any, em as any, 0)
    expect((sys as any).lastCheck).toBe(0)
    // lastCheck 未变说明 guard 生效
    // 但 lastCheck 初始也是 0，所以检查 ravines 不变
    expect((sys as any).ravines).toHaveLength(0)
  })
  it('大 tick 值也能正确节流', () => {
    sys.update(0, world as any, em as any, 100000)
    expect((sys as any).lastCheck).toBe(100000)
  })
  it('节流期间 ravines 不增加', () => {
    // 先执行一次
    sys.update(0, world as any, em as any, 2590)
    const len = (sys as any).ravines.length
    // 不足间隔不再执行
    sys.update(0, world as any, em as any, 2590 + 100)
    expect((sys as any).ravines.length).toBe(len)
  })
})

describe('WorldRavineSystem - spawn 条件', () => {
  let sys: WorldRavineSystem
  const em = makeEM()

  beforeEach(() => { sys = makeSys(); _id = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tile=MOUNTAIN 且 random 满足时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0015
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines.length).toBeGreaterThanOrEqual(1)
  })
  it('tile=FOREST 且 random 满足时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.FOREST)
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines.length).toBeGreaterThanOrEqual(1)
  })
  it('tile=GRASS 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines).toHaveLength(0)
  })
  it('tile=SNOW 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.SNOW)
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines).toHaveLength(0)
  })
  it('tile=DEEP_WATER 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.DEEP_WATER)
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines).toHaveLength(0)
  })
  it('random >= FORM_CHANCE(0.0015) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002) // > 0.0015
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines).toHaveLength(0)
  })
  it('ravines 达到 MAX_RAVINES(15) 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.MOUNTAIN)
    for (let i = 0; i < 15; i++) {
      ;(sys as any).ravines.push(makeRavine({ tick: 2590 }))
    }
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines).toHaveLength(15)
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.MOUNTAIN)
    const prevId = (sys as any).nextId
    sys.update(0, world as any, em as any, 2590)
    if ((sys as any).ravines.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(prevId)
    }
  })
  it('spawn 的 ravine.tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(0, world as any, em as any, 2590)
    if ((sys as any).ravines.length > 0) {
      expect((sys as any).ravines[0].tick).toBe(2590)
    }
  })
})

describe('WorldRavineSystem - spawn 字段范围', () => {
  let sys: WorldRavineSystem
  const em = makeEM()

  beforeEach(() => { sys = makeSys(); _id = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(tick = 2590): Ravine | null {
    // mock random 到 0.001（满足 FORM_CHANCE）且 0.5 分量，确保 update 后字段变化有限
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(0, world as any, em as any, tick)
    return (sys as any).ravines[0] ?? null
  }

  it('spawn 后 length 在 [15, 55) 范围内（spawn初始值+update微调）', () => {
    const r = spawnOne()
    if (r) { expect(r.length).toBeGreaterThanOrEqual(15); expect(r.length).toBeLessThan(56) }
  })
  it('spawn 后 depth 不超过 50（上限约束）', () => {
    const r = spawnOne()
    if (r) { expect(r.depth).toBeLessThanOrEqual(50) }
  })
  it('spawn 后 depth 大于等于 10（初始最小值）', () => {
    const r = spawnOne()
    if (r) { expect(r.depth).toBeGreaterThanOrEqual(10) }
  })
  it('spawn 后 wallSteepness 大于等于 25（clamp 下限）', () => {
    const r = spawnOne()
    if (r) { expect(r.wallSteepness).toBeGreaterThanOrEqual(25) }
  })
  it('spawn 后 wallSteepness 小于等于 90（clamp 上限）', () => {
    const r = spawnOne()
    if (r) { expect(r.wallSteepness).toBeLessThanOrEqual(90) }
  })
  it('spawn 后 waterFlow 大于等于 2（clamp 下限）', () => {
    const r = spawnOne()
    if (r) { expect(r.waterFlow).toBeGreaterThanOrEqual(2) }
  })
  it('spawn 后 waterFlow 小于等于 50（clamp 上限）', () => {
    const r = spawnOne()
    if (r) { expect(r.waterFlow).toBeLessThanOrEqual(50) }
  })
  it('spawn 后 spectacle 大于等于 10（clamp 下限）', () => {
    const r = spawnOne()
    if (r) { expect(r.spectacle).toBeGreaterThanOrEqual(10) }
  })
  it('spawn 后 erosionRate 大于 0', () => {
    const r = spawnOne()
    if (r) { expect(r.erosionRate).toBeGreaterThan(0) }
  })
})

describe('WorldRavineSystem - update 数值逻辑', () => {
  let sys: WorldRavineSystem
  const world = makeWorld(TileType.GRASS) // 不会 spawn
  const em = makeEM()

  beforeEach(() => { sys = makeSys(); _id = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('depth 随 erosionRate 增长（上限 50）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).ravines.push(makeRavine({ depth: 40, erosionRate: 5, tick: 2590 }))
    sys.update(0, world as any, em as any, 2590)
    const r = (sys as any).ravines[0]
    // depth += 5 * 0.00004 = 0.0002  => 40.0002
    expect(r.depth).toBeGreaterThan(40)
    expect(r.depth).toBeLessThanOrEqual(50)
  })
  it('depth 达到 50 时不再增长（clamp）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).ravines.push(makeRavine({ depth: 50, erosionRate: 10, tick: 2590 }))
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines[0].depth).toBe(50)
  })
  it('waterFlow clamp 下限为 2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // random()-0.5 = -0.5, 0.2*-0.5= -0.1
    ;(sys as any).ravines.push(makeRavine({ waterFlow: 2, tick: 2590 }))
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines[0].waterFlow).toBeGreaterThanOrEqual(2)
  })
  it('waterFlow clamp 上限为 50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // random()-0.5=0.5, delta=+0.1
    ;(sys as any).ravines.push(makeRavine({ waterFlow: 50, tick: 2590 }))
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines[0].waterFlow).toBeLessThanOrEqual(50)
  })
  it('wallSteepness clamp 下限为 25', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).ravines.push(makeRavine({ wallSteepness: 25, tick: 2590 }))
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines[0].wallSteepness).toBeGreaterThanOrEqual(25)
  })
  it('wallSteepness clamp 上限为 90', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).ravines.push(makeRavine({ wallSteepness: 90, tick: 2590 }))
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines[0].wallSteepness).toBeLessThanOrEqual(90)
  })
  it('spectacle clamp 下限为 10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).ravines.push(makeRavine({ spectacle: 10, tick: 2590 }))
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines[0].spectacle).toBeGreaterThanOrEqual(10)
  })
  it('spectacle clamp 上限为 70', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).ravines.push(makeRavine({ spectacle: 70, tick: 2590 }))
    sys.update(0, world as any, em as any, 2590)
    expect((sys as any).ravines[0].spectacle).toBeLessThanOrEqual(70)
  })
})

describe('WorldRavineSystem - cleanup 逻辑', () => {
  let sys: WorldRavineSystem
  const world = makeWorld(TileType.GRASS) // 不会 spawn
  const em = makeEM()

  // cutoff = tick - 89000; 删除条件: ravine.tick < cutoff (strict <)

  beforeEach(() => { sys = makeSys(); _id = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 未到 cutoff 时不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).ravines.push(makeRavine({ tick: 0 }))
    // tick=89000: cutoff=0, ravine.tick=0, 0 < 0 为 false，不删除
    sys.update(0, world as any, em as any, 2590 * 34) // 88060 < 89000
    // 直接设置 lastCheck 为 0 后调用 tick=89000
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, em as any, 89000)
    // ravine.tick=0, cutoff=89000-89000=0, 0 < 0 = false → 保留
    expect((sys as any).ravines).toHaveLength(1)
  })
  it('ravine.tick 等于 cutoff 时不删除（strict <）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).ravines.push(makeRavine({ tick: 1000 }))
    ;(sys as any).lastCheck = 0
    // tick=1000+89000=90000, cutoff=1000, ravine.tick=1000, 1000<1000 false → 保留
    sys.update(0, world as any, em as any, 90000)
    expect((sys as any).ravines).toHaveLength(1)
  })
  it('ravine.tick < cutoff 时删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).ravines.push(makeRavine({ tick: 999 }))
    ;(sys as any).lastCheck = 0
    // tick=90000, cutoff=1000, ravine.tick=999, 999<1000 true → 删除
    sys.update(0, world as any, em as any, 90000)
    expect((sys as any).ravines).toHaveLength(0)
  })
  it('多个 ravine 中只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).ravines.push(makeRavine({ tick: 500 }))  // 过期
    ;(sys as any).ravines.push(makeRavine({ tick: 2000 })) // 保留 (2000>=1000)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, em as any, 90000) // cutoff=1000
    expect((sys as any).ravines).toHaveLength(1)
    expect((sys as any).ravines[0].tick).toBe(2000)
  })
  it('所有 ravine 均过期时清空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).ravines.push(makeRavine({ tick: 0 }))
    ;(sys as any).ravines.push(makeRavine({ tick: 100 }))
    ;(sys as any).lastCheck = 0
    // tick=90001, cutoff=1001, 0<1001 true, 100<1001 true → 全删
    sys.update(0, world as any, em as any, 90001)
    expect((sys as any).ravines).toHaveLength(0)
  })
  it('cleanup 不影响未过期 ravine 的字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).ravines.push(makeRavine({ tick: 5000, wallSteepness: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, em as any, 90000) // cutoff=1000, 5000>=1000 保留
    expect((sys as any).ravines[0].wallSteepness).toBeGreaterThanOrEqual(25)
  })
  it('cleanup 按 tick 顺序删除（从末尾向前）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).ravines.push(makeRavine({ id: 10, tick: 0 }))   // 过期
    ;(sys as any).ravines.push(makeRavine({ id: 11, tick: 5000 })) // 保留
    ;(sys as any).ravines.push(makeRavine({ id: 12, tick: 200 }))  // 过期
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, em as any, 90000) // cutoff=1000
    expect((sys as any).ravines).toHaveLength(1)
    expect((sys as any).ravines[0].id).toBe(11)
  })
  it('节流期间不执行 cleanup', () => {
    ;(sys as any).ravines.push(makeRavine({ tick: 0 }))
    ;(sys as any).lastCheck = 2590
    // 间隔不足不执行
    sys.update(0, world as any, em as any, 2590 + 100)
    expect((sys as any).ravines).toHaveLength(1)
  })
})
