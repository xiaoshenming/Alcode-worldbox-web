import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldDrumlinSystem } from '../systems/WorldDrumlinSystem'
import type { Drumlin } from '../systems/WorldDrumlinSystem'

const CHECK_INTERVAL = 2750
const MAX_DRUMLINS = 16

// world mock: GRASS=3, SNOW=6, SAND=2（阻断spawn）
const worldGrass  = { width: 200, height: 200, getTile: () => 3, setTile: () => {} } as any
const worldSnow   = { width: 200, height: 200, getTile: () => 6, setTile: () => {} } as any
const worldSand   = { width: 200, height: 200, getTile: () => 2, setTile: () => {} } as any // 阻断
const worldShallow= { width: 200, height: 200, getTile: () => 1, setTile: () => {} } as any // 阻断
const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any

function makeSys(): WorldDrumlinSystem { return new WorldDrumlinSystem() }

let nextId = 1
function makeDrumlin(overrides: Partial<Drumlin> = {}): Drumlin {
  return {
    id: nextId++,
    x: 30, y: 40,
    length: 30,
    width: 12,
    height: 10,
    orientation: 90,
    soilFertility: 60,
    glacialOrigin: 400,
    tick: 0,
    ...overrides,
  }
}

describe('WorldDrumlinSystem — 基础数据结构', () => {
  let sys: WorldDrumlinSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无鼓丘', () => {
    expect((sys as any).drumlins).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('直接注入后可查询到', () => {
    ;(sys as any).drumlins.push(makeDrumlin())
    expect((sys as any).drumlins).toHaveLength(1)
  })

  it('多个鼓丘全部保留', () => {
    ;(sys as any).drumlins.push(makeDrumlin())
    ;(sys as any).drumlins.push(makeDrumlin())
    expect((sys as any).drumlins).toHaveLength(2)
  })

  it('鼓丘字段结构完整', () => {
    ;(sys as any).drumlins.push(makeDrumlin())
    const d = (sys as any).drumlins[0]
    expect(d).toHaveProperty('id')
    expect(d).toHaveProperty('x')
    expect(d).toHaveProperty('y')
    expect(d).toHaveProperty('length')
    expect(d).toHaveProperty('width')
    expect(d).toHaveProperty('height')
    expect(d).toHaveProperty('orientation')
    expect(d).toHaveProperty('soilFertility')
    expect(d).toHaveProperty('glacialOrigin')
    expect(d).toHaveProperty('tick')
  })

  it('字段值与注入时一致', () => {
    ;(sys as any).drumlins.push(makeDrumlin({ soilFertility: 70, glacialOrigin: 90, orientation: 45 }))
    const d = (sys as any).drumlins[0]
    expect(d.soilFertility).toBe(70)
    expect(d.glacialOrigin).toBe(90)
    expect(d.orientation).toBe(45)
  })
})

describe('WorldDrumlinSystem — CHECK_INTERVAL 节流', () => {
  let sys: WorldDrumlinSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 不足 CHECK_INTERVAL 时不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL - 1)
    expect((sys as any).drumlins).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次调用间隔不足则跳过（lastCheck 不变）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    sys.update(0, worldGrass, em, CHECK_INTERVAL + 1)
    // lastCheck 应仍为 CHECK_INTERVAL（第二次被节流）
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次间隔足够时均更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(0, worldGrass, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('WorldDrumlinSystem — spawn 逻辑', () => {
  let sys: WorldDrumlinSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('GRASS tile + random < FORM_CHANCE → spawn 成功', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).drumlins).toHaveLength(1)
  })

  it('SNOW tile + random < FORM_CHANCE → spawn 成功', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).drumlins).toHaveLength(1)
  })

  it('SAND tile（非目标tile）→ 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).drumlins).toHaveLength(0)
  })

  it('SHALLOW_WATER tile（非目标tile）→ 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldShallow, em, CHECK_INTERVAL)
    expect((sys as any).drumlins).toHaveLength(0)
  })

  it('random >= FORM_CHANCE → 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).drumlins).toHaveLength(0)
  })

  it('spawn 后 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 的鼓丘 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).drumlins[0].tick).toBe(CHECK_INTERVAL)
  })

  it('达到 MAX_DRUMLINS 后不再 spawn', () => {
    for (let i = 0; i < MAX_DRUMLINS; i++) {
      ;(sys as any).drumlins.push(makeDrumlin())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).drumlins).toHaveLength(MAX_DRUMLINS)
  })

  it('spawn 时 height 初始值 ≥ 5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).drumlins[0].height).toBeGreaterThanOrEqual(5)
  })

  it('spawn 时 soilFertility 初始值（spawn公式:30+rand*40，update后仍≥10）', () => {
    // random=0.0001: spawn初始≈30.004，update后 +(0.0001-0.45)*0.1≈30.004-0.045≈29.96，clamped到max(10,...)仍≥10
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).drumlins[0].soilFertility).toBeGreaterThanOrEqual(10)
  })

  it('spawn 时 glacialOrigin 初始值 ≥ 200', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).drumlins[0].glacialOrigin).toBeGreaterThanOrEqual(200)
  })
})

describe('WorldDrumlinSystem — 字段更新', () => {
  let sys: WorldDrumlinSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('soilFertility 每次 update 后仍在 [10, 85] 范围内', () => {
    ;(sys as any).drumlins.push(makeDrumlin({ soilFertility: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL) // SAND阻断spawn，只跑更新
    const val = (sys as any).drumlins[0].soilFertility
    expect(val).toBeGreaterThanOrEqual(10)
    expect(val).toBeLessThanOrEqual(85)
  })

  it('height 每次 update 减少 0.0003（但不低于 2）', () => {
    ;(sys as any).drumlins.push(makeDrumlin({ height: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    const val = (sys as any).drumlins[0].height
    expect(val).toBeCloseTo(10 - 0.0003, 5)
  })

  it('height 下限为 2（不会低于 2）', () => {
    ;(sys as any).drumlins.push(makeDrumlin({ height: 2 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).drumlins[0].height).toBe(2)
  })

  it('glacialOrigin 每次 update 增加 0.01', () => {
    ;(sys as any).drumlins.push(makeDrumlin({ glacialOrigin: 400 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).drumlins[0].glacialOrigin).toBeCloseTo(400.01, 5)
  })

  it('多个鼓丘 update 后均更新', () => {
    ;(sys as any).drumlins.push(makeDrumlin({ glacialOrigin: 300 }))
    ;(sys as any).drumlins.push(makeDrumlin({ glacialOrigin: 500 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).drumlins[0].glacialOrigin).toBeCloseTo(300.01, 5)
    expect((sys as any).drumlins[1].glacialOrigin).toBeCloseTo(500.01, 5)
  })
})

describe('WorldDrumlinSystem — cleanup（按 tick 过期删除）', () => {
  let sys: WorldDrumlinSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期鼓丘（tick < cutoff=tick-95000）被删除', () => {
    const currentTick = CHECK_INTERVAL + 95001
    ;(sys as any).drumlins.push(makeDrumlin({ tick: 0 })) // 0 < currentTick-95000 → 过期
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, currentTick)
    expect((sys as any).drumlins).toHaveLength(0)
  })

  it('未过期鼓丘（tick >= cutoff）保留', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).drumlins.push(makeDrumlin({ tick: currentTick }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // currentTick*2=5500, cutoff=5500-95000<0，不会过期
    sys.update(0, worldSand, em, currentTick * 2)
    expect((sys as any).drumlins).toHaveLength(1)
  })

  it('混合过期与未过期：只删过期的', () => {
    const bigTick = 200000
    ;(sys as any).drumlins.push(makeDrumlin({ tick: 0 }))        // 0 < 200000-95000=105000 → 过期
    ;(sys as any).drumlins.push(makeDrumlin({ tick: 150000 }))   // 150000 >= 105000 → 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, bigTick)
    expect((sys as any).drumlins).toHaveLength(1)
    expect((sys as any).drumlins[0].tick).toBe(150000)
  })

  it('全部过期则清空', () => {
    const bigTick = 500000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).drumlins.push(makeDrumlin({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, bigTick)
    expect((sys as any).drumlins).toHaveLength(0)
  })
})
