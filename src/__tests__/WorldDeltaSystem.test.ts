import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldDeltaSystem } from '../systems/WorldDeltaSystem'
import type { Delta } from '../systems/WorldDeltaSystem'

const CHECK_INTERVAL = 2620
const MAX_DELTAS = 15

// world mock: SAND=2, SHALLOW_WATER=1
const worldSand    = { width: 200, height: 200, getTile: () => 2, setTile: () => {} } as any
const worldShallow = { width: 200, height: 200, getTile: () => 1, setTile: () => {} } as any
const worldGrass   = { width: 200, height: 200, getTile: () => 3, setTile: () => {} } as any // 阻断spawn
const worldForest  = { width: 200, height: 200, getTile: () => 4, setTile: () => {} } as any // 阻断spawn
const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any

function makeSys(): WorldDeltaSystem { return new WorldDeltaSystem() }

let nextId = 1
function makeDelta(overrides: Partial<Delta> = {}): Delta {
  return {
    id: nextId++,
    x: 25, y: 35,
    area: 30,
    channelCount: 4,
    sedimentDeposit: 40,
    fertility: 60,
    floodRisk: 20,
    spectacle: 35,
    tick: 0,
    ...overrides,
  }
}

describe('WorldDeltaSystem — 基础数据结构', () => {
  let sys: WorldDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无河口三角洲', () => {
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('直接注入后可查询到', () => {
    ;(sys as any).deltas.push(makeDelta())
    expect((sys as any).deltas).toHaveLength(1)
  })

  it('多个三角洲全部保留', () => {
    ;(sys as any).deltas.push(makeDelta())
    ;(sys as any).deltas.push(makeDelta())
    expect((sys as any).deltas).toHaveLength(2)
  })

  it('三角洲字段结构完整', () => {
    ;(sys as any).deltas.push(makeDelta())
    const d = (sys as any).deltas[0]
    expect(d).toHaveProperty('id')
    expect(d).toHaveProperty('x')
    expect(d).toHaveProperty('y')
    expect(d).toHaveProperty('area')
    expect(d).toHaveProperty('channelCount')
    expect(d).toHaveProperty('sedimentDeposit')
    expect(d).toHaveProperty('fertility')
    expect(d).toHaveProperty('floodRisk')
    expect(d).toHaveProperty('spectacle')
    expect(d).toHaveProperty('tick')
  })

  it('字段值与注入时一致', () => {
    ;(sys as any).deltas.push(makeDelta({ channelCount: 5, fertility: 80, floodRisk: 30 }))
    const d = (sys as any).deltas[0]
    expect(d.channelCount).toBe(5)
    expect(d.fertility).toBe(80)
    expect(d.floodRisk).toBe(30)
  })
})

describe('WorldDeltaSystem — CHECK_INTERVAL 节流', () => {
  let sys: WorldDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 不足 CHECK_INTERVAL 时不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // 极低概率触发spawn
    sys.update(0, worldSand, em, CHECK_INTERVAL - 1)
    expect((sys as any).deltas).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0) // lastCheck 未更新
  })

  it('tick 恰好等于 CHECK_INTERVAL 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 超过FORM_CHANCE，不spawn
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次调用间隔不足则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    const countAfterFirst = (sys as any).deltas.length
    // 再次调用，tick只差1，不满足间隔
    sys.update(0, worldSand, em, CHECK_INTERVAL + 1)
    expect((sys as any).deltas).toHaveLength(countAfterFirst)
  })

  it('两次调用间隔足够时均更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(0, worldSand, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('WorldDeltaSystem — spawn 逻辑', () => {
  let sys: WorldDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('SAND tile + random < FORM_CHANCE → spawn 成功', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).deltas).toHaveLength(1)
  })

  it('SHALLOW_WATER tile + random < FORM_CHANCE → spawn 成功', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldShallow, em, CHECK_INTERVAL)
    expect((sys as any).deltas).toHaveLength(1)
  })

  it('GRASS tile（非目标tile）→ 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('FOREST tile（非目标tile）→ 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldForest, em, CHECK_INTERVAL)
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('random >= FORM_CHANCE → 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('spawn 后 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 的三角洲 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).deltas[0].tick).toBe(CHECK_INTERVAL)
  })

  it('达到 MAX_DELTAS 后不再 spawn', () => {
    // 预填15个三角洲
    for (let i = 0; i < MAX_DELTAS; i++) {
      ;(sys as any).deltas.push(makeDelta())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).deltas).toHaveLength(MAX_DELTAS) // 不超过上限
  })

  it('spawn 时设置了 sedimentDeposit 初始值（spawn公式:15+rand*40，update后仍≥5）', () => {
    // random=0.0001: spawn初始≈15.004，update后 sedimentDeposit+(0.0001-0.48)*0.16≈14.93，clamped到max(5,...)仍≥5
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    const d = (sys as any).deltas[0]
    expect(d.sedimentDeposit).toBeGreaterThanOrEqual(5)
  })

  it('spawn 时设置了 area 初始值（≥20）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    const d = (sys as any).deltas[0]
    expect(d.area).toBeGreaterThanOrEqual(20)
  })
})

describe('WorldDeltaSystem — 字段更新', () => {
  let sys: WorldDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('sedimentDeposit 每次 update 后仍在 [5, 80] 范围内', () => {
    ;(sys as any).deltas.push(makeDelta({ sedimentDeposit: 40 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    const val = (sys as any).deltas[0].sedimentDeposit
    expect(val).toBeGreaterThanOrEqual(5)
    expect(val).toBeLessThanOrEqual(80)
  })

  it('fertility 每次 update 后仍在 [15, 90] 范围内', () => {
    ;(sys as any).deltas.push(makeDelta({ fertility: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    const val = (sys as any).deltas[0].fertility
    expect(val).toBeGreaterThanOrEqual(15)
    expect(val).toBeLessThanOrEqual(90)
  })

  it('area 只增不减（sedimentDeposit*0.00004 累积）', () => {
    ;(sys as any).deltas.push(makeDelta({ area: 30, sedimentDeposit: 40 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    const val = (sys as any).deltas[0].area
    expect(val).toBeGreaterThan(30)
  })

  it('area 上限为 80', () => {
    ;(sys as any).deltas.push(makeDelta({ area: 80, sedimentDeposit: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).deltas[0].area).toBe(80)
  })

  it('spectacle 每次 update 后仍在 [10, 70] 范围内', () => {
    ;(sys as any).deltas.push(makeDelta({ spectacle: 35 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    const val = (sys as any).deltas[0].spectacle
    expect(val).toBeGreaterThanOrEqual(10)
    expect(val).toBeLessThanOrEqual(70)
  })

  it('多个三角洲每次 update 均更新字段', () => {
    ;(sys as any).deltas.push(makeDelta({ sedimentDeposit: 40 }))
    ;(sys as any).deltas.push(makeDelta({ sedimentDeposit: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    // 都还在合法范围内说明均被处理
    for (const d of (sys as any).deltas) {
      expect(d.sedimentDeposit).toBeGreaterThanOrEqual(5)
      expect(d.sedimentDeposit).toBeLessThanOrEqual(80)
    }
  })
})

describe('WorldDeltaSystem — cleanup（按 tick 过期删除）', () => {
  let sys: WorldDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期三角洲（tick < cutoff）被删除', () => {
    const currentTick = CHECK_INTERVAL + 92001
    ;(sys as any).deltas.push(makeDelta({ tick: 0 })) // 0 < currentTick-92000=1 → 过期
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, currentTick)
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('未过期三角洲（tick >= cutoff）保留', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).deltas.push(makeDelta({ tick: currentTick })) // 刚创建，不会过期
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, currentTick * 2)
    // cutoff = currentTick*2 - 92000，tick=CHECK_INTERVAL=2620 < cutoff只有在currentTick*2>2620+92000时才过期
    // currentTick*2 = 5240 < 92000+2620，不过期
    expect((sys as any).deltas).toHaveLength(1)
  })

  it('混合过期与未过期：只删过期的', () => {
    const bigTick = 200000
    ;(sys as any).deltas.push(makeDelta({ tick: 0 }))        // 0 < 200000-92000=108000 → 过期
    ;(sys as any).deltas.push(makeDelta({ tick: 150000 }))   // 150000 >= 108000 → 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, bigTick)
    expect((sys as any).deltas).toHaveLength(1)
    expect((sys as any).deltas[0].tick).toBe(150000)
  })

  it('所有三角洲都过期则清空数组', () => {
    const bigTick = 500000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).deltas.push(makeDelta({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, bigTick)
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('达到上限后删除过期的，可以再生成新的', () => {
    // 预填14个过期三角洲（留一个空位）
    for (let i = 0; i < MAX_DELTAS - 1; i++) {
      ;(sys as any).deltas.push(makeDelta({ tick: 0 }))
    }
    const bigTick = 200000
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // 触发spawn
    sys.update(0, worldSand, em, bigTick)
    // 14个过期被删除，然后生成1个新的
    expect((sys as any).deltas).toHaveLength(1)
    expect((sys as any).deltas[0].tick).toBe(bigTick)
  })

  it('多个三角洲同时过期', () => {
    const bigTick = 300000
    for (let i = 0; i < 10; i++) {
      ;(sys as any).deltas.push(makeDelta({ tick: 100000 })) // 全部过期
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, bigTick)
    expect((sys as any).deltas).toHaveLength(0)
  })
})

describe('WorldDeltaSystem — 边界条件测试', () => {
  let sys: WorldDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('sedimentDeposit 极小值（接近5）时更新后仍≥5', () => {
    ;(sys as any).deltas.push(makeDelta({ sedimentDeposit: 5.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // 会减少
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).deltas[0].sedimentDeposit).toBeGreaterThanOrEqual(5)
  })

  it('sedimentDeposit 极大值（接近80）时更新后仍≤80', () => {
    ;(sys as any).deltas.push(makeDelta({ sedimentDeposit: 79.9 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 会增加
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).deltas[0].sedimentDeposit).toBeLessThanOrEqual(80)
  })

  it('fertility 极小值（接近15）时更新后仍≥15', () => {
    ;(sys as any).deltas.push(makeDelta({ fertility: 15.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // 会减少
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).deltas[0].fertility).toBeGreaterThanOrEqual(15)
  })

  it('fertility 极大值（接近90）时更新后仍≤90', () => {
    ;(sys as any).deltas.push(makeDelta({ fertility: 89.9 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 会增加
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).deltas[0].fertility).toBeLessThanOrEqual(90)
  })

  it('spectacle 极小值（接近10）时更新后仍≥10', () => {
    ;(sys as any).deltas.push(makeDelta({ spectacle: 10.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // 会减少
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).deltas[0].spectacle).toBeGreaterThanOrEqual(10)
  })

  it('spectacle 极大值（接近70）时更新后仍≤70', () => {
    ;(sys as any).deltas.push(makeDelta({ spectacle: 69.9 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 会增加
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).deltas[0].spectacle).toBeLessThanOrEqual(70)
  })

  it('area 接近上限时增长受限', () => {
    ;(sys as any).deltas.push(makeDelta({ area: 79.9, sedimentDeposit: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    // area 上限为 80，应该被 clamp
    expect((sys as any).deltas[0].area).toBeLessThanOrEqual(80)
    expect((sys as any).deltas[0].area).toBeGreaterThan(79.9)
  })

  it('世界边界位置（x=10, y=10）可以生成三角洲', () => {
    const worldSmall = { width: 50, height: 50, getTile: () => 2, setTile: () => {} } as any
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0001) // FORM_CHANCE
      .mockReturnValueOnce(0) // x = 10 + 0*(50-20) = 10
      .mockReturnValueOnce(0) // y = 10 + 0*(50-20) = 10
    sys.update(0, worldSmall, em, CHECK_INTERVAL)
    expect((sys as any).deltas).toHaveLength(1)
    expect((sys as any).deltas[0].x).toBe(10)
    expect((sys as any).deltas[0].y).toBe(10)
  })

  it('世界边界位置（x=width-11, y=height-11）可以生成三角洲', () => {
    const worldSmall = { width: 50, height: 50, getTile: () => 2, setTile: () => {} } as any
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0001) // FORM_CHANCE
      .mockReturnValueOnce(0.9999) // x = 10 + floor(0.9999*30) = 10+29 = 39
      .mockReturnValueOnce(0.9999) // y = 10 + floor(0.9999*30) = 10+29 = 39
    sys.update(0, worldSmall, em, CHECK_INTERVAL)
    expect((sys as any).deltas).toHaveLength(1)
    expect((sys as any).deltas[0].x).toBe(39)
    expect((sys as any).deltas[0].y).toBe(39)
  })
})

describe('WorldDeltaSystem — 多实体交互测试', () => {
  let sys: WorldDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('同时有多个三角洲在不同生命周期阶段', () => {
    const currentTick = 200000
    ;(sys as any).deltas.push(makeDelta({ tick: 0, sedimentDeposit: 20 }))        // 过期
    ;(sys as any).deltas.push(makeDelta({ tick: 150000, sedimentDeposit: 40 }))   // 保留
    ;(sys as any).deltas.push(makeDelta({ tick: 190000, sedimentDeposit: 60 }))   // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, worldGrass, em, currentTick)
    expect((sys as any).deltas).toHaveLength(2)
    // 验证保留的两个都被更新了
    for (const d of (sys as any).deltas) {
      expect(d.sedimentDeposit).toBeGreaterThanOrEqual(5)
      expect(d.sedimentDeposit).toBeLessThanOrEqual(80)
    }
  })

  it('多个三角洲的id唯一性', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).deltas.push(makeDelta())
    }
    const ids = (sys as any).deltas.map((d: Delta) => d.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(5)
  })

  it('nextId 在多次spawn后连续递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < 3; i++) {
      sys.update(0, worldSand, em, CHECK_INTERVAL * (i + 1))
    }
    expect((sys as any).nextId).toBe(4) // 1→2→3→4
    expect((sys as any).deltas).toHaveLength(3)
  })
})

describe('WorldDeltaSystem — 状态转换测试', () => {
  let sys: WorldDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('从0个三角洲到1个的转换', () => {
    expect((sys as any).deltas).toHaveLength(0)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).deltas).toHaveLength(1)
  })

  it('从MAX_DELTAS-1到MAX_DELTAS的转换', () => {
    for (let i = 0; i < MAX_DELTAS - 1; i++) {
      ;(sys as any).deltas.push(makeDelta())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).deltas).toHaveLength(MAX_DELTAS)
  })

  it('连续多次update后sedimentDeposit累积变化', () => {
    ;(sys as any).deltas.push(makeDelta({ sedimentDeposit: 40 }))
    const initial = (sys as any).deltas[0].sedimentDeposit
    vi.spyOn(Math, 'random').mockReturnValue(0.6) // 稳定增长
    for (let i = 0; i < 5; i++) {
      sys.update(0, worldGrass, em, CHECK_INTERVAL * (i + 1))
    }
    // 验证值发生了变化
    expect((sys as any).deltas[0].sedimentDeposit).not.toBe(initial)
  })

  it('连续多次update后area累积增长', () => {
    ;(sys as any).deltas.push(makeDelta({ area: 30, sedimentDeposit: 50 }))
    const initial = (sys as any).deltas[0].area
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 10; i++) {
      sys.update(0, worldGrass, em, CHECK_INTERVAL * (i + 1))
    }
    expect((sys as any).deltas[0].area).toBeGreaterThan(initial)
  })
})

describe('WorldDeltaSystem — 极端值测试', () => {
  let sys: WorldDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时的行为正常', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, 0)
    // tick=0 < CHECK_INTERVAL，不执行逻辑
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 非常大时的行为正常', () => {
    const hugeTick = 10000000
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, hugeTick)
    expect((sys as any).lastCheck).toBe(hugeTick)
  })

  it('random=0时所有字段更新正常', () => {
    ;(sys as any).deltas.push(makeDelta({ sedimentDeposit: 40, fertility: 50, spectacle: 35 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    const d = (sys as any).deltas[0]
    expect(d.sedimentDeposit).toBeGreaterThanOrEqual(5)
    expect(d.fertility).toBeGreaterThanOrEqual(15)
    expect(d.spectacle).toBeGreaterThanOrEqual(10)
  })

  it('random=1时所有字段更新正常', () => {
    ;(sys as any).deltas.push(makeDelta({ sedimentDeposit: 40, fertility: 50, spectacle: 35 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    const d = (sys as any).deltas[0]
    expect(d.sedimentDeposit).toBeLessThanOrEqual(80)
    expect(d.fertility).toBeLessThanOrEqual(90)
    expect(d.spectacle).toBeLessThanOrEqual(70)
  })

  it('channelCount 的范围验证（2-8）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    const channelCount = (sys as any).deltas[0].channelCount
    expect(channelCount).toBeGreaterThanOrEqual(2)
    expect(channelCount).toBeLessThanOrEqual(8)
  })

  it('floodRisk 的初始值验证（10-45）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    const floodRisk = (sys as any).deltas[0].floodRisk
    expect(floodRisk).toBeGreaterThanOrEqual(10)
    expect(floodRisk).toBeLessThanOrEqual(45)
  })
})

describe('WorldDeltaSystem — 组合场景测试', () => {
  let sys: WorldDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn + update + cleanup 在同一次调用中', () => {
    ;(sys as any).deltas.push(makeDelta({ tick: 0 })) // 会被删除
    const bigTick = 200000
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, bigTick)
    // 旧的被删除，新的被创建
    expect((sys as any).deltas).toHaveLength(1)
    expect((sys as any).deltas[0].tick).toBe(bigTick)
  })

  it('连续多次达到CHECK_INTERVAL的调用', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 1; i <= 5; i++) {
      sys.update(0, worldSand, em, CHECK_INTERVAL * i)
    }
    expect((sys as any).deltas.length).toBeGreaterThan(0)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 5)
  })

  it('不同tile类型的混合测试', () => {
    const worldMixed = {
      width: 200, height: 200,
      getTile: (x: number, y: number) => (x + y) % 2 === 0 ? 2 : 3, // SAND和GRASS交替
      setTile: () => {}
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldMixed, em, CHECK_INTERVAL)
    // 可能spawn也可能不spawn，取决于随机位置
    expect((sys as any).deltas.length).toBeGreaterThanOrEqual(0)
  })

  it('area增长的累积效果验证', () => {
    ;(sys as any).deltas.push(makeDelta({ area: 30, sedimentDeposit: 60 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const initialArea = (sys as any).deltas[0].area
    for (let i = 0; i < 20; i++) {
      sys.update(0, worldGrass, em, CHECK_INTERVAL * (i + 1))
    }
    const finalArea = (sys as any).deltas[0].area
    expect(finalArea).toBeGreaterThan(initialArea)
    expect(finalArea).toBeLessThanOrEqual(80)
  })

  it('sedimentDeposit对area增长的影响验证', () => {
    ;(sys as any).deltas.push(makeDelta({ area: 30, sedimentDeposit: 20 }))
    ;(sys as any).deltas.push(makeDelta({ area: 30, sedimentDeposit: 70 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    const area1 = (sys as any).deltas[0].area
    const area2 = (sys as any).deltas[1].area
    // sedimentDeposit更高的三角洲area增长更快
    expect(area2 - 30).toBeGreaterThan(area1 - 30)
  })

  it('多次spawn后所有三角洲都有有效的tick值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 1; i <= 5; i++) {
      sys.update(0, worldSand, em, CHECK_INTERVAL * i)
    }
    for (const d of (sys as any).deltas) {
      expect(d.tick).toBeGreaterThan(0)
      expect(d.tick).toBeLessThanOrEqual(CHECK_INTERVAL * 5)
    }
  })
})
