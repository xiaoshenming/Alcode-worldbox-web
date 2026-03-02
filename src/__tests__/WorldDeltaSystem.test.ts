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
})
