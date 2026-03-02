import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMangroveSystem } from '../systems/WorldMangroveSystem'
import type { MangroveForest, MangroveHealth } from '../systems/WorldMangroveSystem'

// CHECK_INTERVAL=1300, MAX_MANGROVES=14, GROW_CHANCE=0.004, GROWTH_RATE=0.04

function makeSys(): WorldMangroveSystem { return new WorldMangroveSystem() }

let nextId = 1
function makeForest(overrides: Partial<MangroveForest> = {}): MangroveForest {
  return {
    id: nextId++,
    x: 30, y: 20,
    health: 'healthy',
    density: 50,
    stormProtection: 40,
    biodiversityBonus: 30,
    waterQuality: 25,
    startTick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number = 1, w = 100, h = 100) {
  return {
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => tile,
  } as any
}

const em = {} as any

// ─────────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────────
describe('WorldMangroveSystem 初始状态', () => {
  let sys: WorldMangroveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 forests 数组为空', () => {
    expect((sys as any).forests).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入一条后 length 为 1', () => {
    ;(sys as any).forests.push(makeForest())
    expect((sys as any).forests).toHaveLength(1)
  })

  it('forests 返回内部同一引用', () => {
    const ref = (sys as any).forests
    expect(ref).toBe((sys as any).forests)
  })

  it('MangroveHealth 支持 4 种合法值', () => {
    const types: MangroveHealth[] = ['flourishing', 'healthy', 'stressed', 'dying']
    expect(types).toHaveLength(4)
  })

  it('MangroveForest 接口必需字段均存在', () => {
    const f = makeForest()
    const keys = ['id','x','y','health','density','stormProtection','biodiversityBonus','waterQuality','startTick']
    for (const k of keys) expect(f).toHaveProperty(k)
  })
})

// ─────────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────────
describe('WorldMangroveSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldMangroveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=1299 时不执行，lastCheck 保持 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em, 1299)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1300 时执行，lastCheck 更新为 1300', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeWorld(), em, 1300)
    expect((sys as any).lastCheck).toBe(1300)
  })

  it('tick=1301 时执行，lastCheck 更新为 1301', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeWorld(), em, 1301)
    expect((sys as any).lastCheck).toBe(1301)
  })

  it('tick=0 时不执行，forests 保持为空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em, 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).forests).toHaveLength(0)
  })

  it('第二次 tick < lastCheck+1300 时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeWorld(), em, 1300)  // lastCheck=1300
    sys.update(0, makeWorld(), em, 2599)  // 2599-1300=1299 < 1300, skip
    expect((sys as any).lastCheck).toBe(1300)
  })

  it('第二次 tick = lastCheck+1300 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeWorld(), em, 1300)
    sys.update(0, makeWorld(), em, 2600)  // 2600-1300=1300, execute
    expect((sys as any).lastCheck).toBe(2600)
  })
})

// ─────────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────────
describe('WorldMangroveSystem spawn 条件', () => {
  let sys: WorldMangroveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('Math.random>GROW_CHANCE(0.004) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    sys.update(0, makeWorld(1), em, 1300)
    expect((sys as any).forests).toHaveLength(0)
  })

  it('tile=GRASS(3) 时不 spawn', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 0.001 : 0.5)
    sys.update(0, makeWorld(3), em, 1300)
    expect((sys as any).forests).toHaveLength(0)
  })

  it('tile=DEEP_WATER(0) 时不 spawn', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 0.001 : 0.5)
    sys.update(0, makeWorld(0), em, 1300)
    expect((sys as any).forests).toHaveLength(0)
  })

  it('tile=MOUNTAIN(5) 时不 spawn', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 0.001 : 0.5)
    sys.update(0, makeWorld(5), em, 1300)
    expect((sys as any).forests).toHaveLength(0)
  })

  it('forests=MAX_MANGROVES(14) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 14; i++) (sys as any).forests.push(makeForest())
    sys.update(0, makeWorld(1), em, 1300)
    expect((sys as any).forests).toHaveLength(14)
  })

  it('tile=SHALLOW_WATER 且有水陆边界时 spawn 成功', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const v = call++
      if (v === 0) return 0.001  // pass GROW_CHANCE
      return 0.5                 // x=50, y=50, density portion
    })
    const w = {
      width: 100, height: 100,
      getTile: (x: number, y: number) => {
        if (x === 50 && y === 50) return 1  // SHALLOW_WATER
        if (x === 51 && y === 50) return 3  // GRASS => hasLand
        return 1                             // SHALLOW_WATER => hasWater
      },
    } as any
    sys.update(0, w, em, 1300)
    expect((sys as any).forests).toHaveLength(1)
  })

  it('tile=SAND(2) 且有水陆边界时 spawn 成功', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const v = call++
      if (v === 0) return 0.001
      return 0.5
    })
    const w = {
      width: 100, height: 100,
      getTile: (x: number, y: number) => {
        if (x === 50 && y === 50) return 2  // SAND
        if (x === 51 && y === 50) return 1  // SHALLOW_WATER => hasWater
        return 3                             // GRASS => hasLand
      },
    } as any
    sys.update(0, w, em, 1300)
    expect((sys as any).forests).toHaveLength(1)
  })

  it('tile=SHALLOW_WATER 但无陆地邻居时不 spawn', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const v = call++
      if (v === 0) return 0.001
      return 0.5
    })
    // All tiles = SHALLOW_WATER => hasWater=true but hasLand=false
    sys.update(0, makeWorld(1), em, 1300)
    expect((sys as any).forests).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────
// 4. spawn 后字段范围
// ─────────────────────────────────────────────────
describe('WorldMangroveSystem spawn 字段范围', () => {
  let sys: WorldMangroveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnForest(densityRandom: number): MangroveForest {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const v = call++
      if (v === 0) return 0.001     // pass GROW_CHANCE
      if (v === 1) return 0.5       // x
      if (v === 2) return 0.5       // y
      if (v === 3) return densityRandom  // density portion
      return 0.5
    })
    const w = {
      width: 100, height: 100,
      getTile: (x: number, y: number) => {
        if (x === 50 && y === 50) return 2  // SAND
        if (x === 51 && y === 50) return 1  // hasWater
        return 3                             // hasLand
      },
    } as any
    sys.update(0, w, em, 1300)
    return (sys as any).forests[0] as MangroveForest
  }

  it('spawn 后 id 为 1', () => {
    const f = spawnForest(0.5)
    expect(f.id).toBe(1)
  })

  it('spawn 后 stormProtection = density * 0.8 (update 后)', () => {
    const f = spawnForest(0.5)
    expect(f.stormProtection).toBeCloseTo(f.density * 0.8, 5)
  })

  it('spawn 后 biodiversityBonus = density * 0.6 (update 后)', () => {
    const f = spawnForest(0.5)
    expect(f.biodiversityBonus).toBeCloseTo(f.density * 0.6, 5)
  })

  it('spawn 后 waterQuality = density * 0.5 (update 后)', () => {
    const f = spawnForest(0.5)
    expect(f.waterQuality).toBeCloseTo(f.density * 0.5, 5)
  })

  it('density 最小情况 (random=0): > 20', () => {
    const f = spawnForest(0)
    // initial=20+0*30=20, after update+0.04=20.04
    expect(f.density).toBeGreaterThan(20)
  })

  it('density 最大情况 (random=1): <= 100', () => {
    const f = spawnForest(1)
    // initial=20+1*30=50, after update+0.04=50.04
    expect(f.density).toBeLessThanOrEqual(100)
  })

  it('spawn 后 startTick 等于当前 tick', () => {
    const f = spawnForest(0.5)
    expect(f.startTick).toBe(1300)
  })
})

// ─────────────────────────────────────────────────
// 5. update 数值逻辑
// ─────────────────────────────────────────────────
describe('WorldMangroveSystem update 数值逻辑', () => {
  let sys: WorldMangroveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('density=71 => health=flourishing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 71 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 1300)
    expect(f.health).toBe('flourishing')
  })

  it('density=41 => health=healthy (>40)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 41 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 1300)
    expect(f.health).toBe('healthy')
  })

  it('density=16 => health=stressed (>15)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 16 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 1300)
    expect(f.health).toBe('stressed')
  })

  it('density=10 => health=dying (<=15)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 10 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 1300)
    expect(f.health).toBe('dying')
  })

  it('每次 update density 增加 0.04', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 50 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 1300)
    expect(f.density).toBeCloseTo(50.04, 5)
  })

  it('density 上限为 100 (Math.min)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 99.99 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 1300)
    expect(f.density).toBeLessThanOrEqual(100)
  })

  it('density 穿越 70 阈值时 health 升为 flourishing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 69.97 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 1300)
    // 69.97+0.04=70.01 > 70 => flourishing
    expect(f.health).toBe('flourishing')
  })

  it('stormProtection = density * 0.8 after update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 60 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 1300)
    expect(f.stormProtection).toBeCloseTo(60.04 * 0.8, 5)
  })
})

// ─────────────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────────────
describe('WorldMangroveSystem cleanup 逻辑', () => {
  let sys: WorldMangroveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('dying + tick-startTick>40000 时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 10, startTick: 0 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 41300)  // 41300-0=41300 > 40000 => delete
    expect((sys as any).forests).toHaveLength(0)
  })

  it('dying + tick-startTick=40000 时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 10, startTick: 0 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 41300)
    ;(sys as any).forests = []
    ;(sys as any).lastCheck = 0
    const f2 = makeForest({ density: 10, startTick: 1300 })
    ;(sys as any).forests.push(f2)
    sys.update(0, makeWorld(), em, 41300)  // 41300-1300=40000, NOT > 40000 => keep
    expect((sys as any).forests).toHaveLength(1)
  })

  it('health=healthy 超大 tick 也不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 50, startTick: 0 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 99999)
    expect((sys as any).forests).toHaveLength(1)
  })

  it('health=flourishing 超大 tick 也不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 80, startTick: 0 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 99999)
    expect((sys as any).forests).toHaveLength(1)
  })

  it('多条记录只删除满足条件的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const dying = makeForest({ density: 10, startTick: 0 })
    const healthy = makeForest({ density: 60, startTick: 0 })
    ;(sys as any).forests.push(dying, healthy)
    sys.update(0, makeWorld(), em, 41300)
    // dying: density 10.04<=15 => dying, 41300>40000 => deleted
    // healthy: density 60.04 => healthy => not deleted
    expect((sys as any).forests).toHaveLength(1)
    expect((sys as any).forests[0].density).toBeGreaterThan(50)
  })

  it('3 条 dying 超时记录全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 3; i++) (sys as any).forests.push(makeForest({ density: 10, startTick: 0 }))
    sys.update(0, makeWorld(), em, 41300)
    expect((sys as any).forests).toHaveLength(0)
  })

  it('startTick=tick 时刚创建不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 10, startTick: 1300 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 1300)  // tick-startTick=0 not > 40000
    expect((sys as any).forests).toHaveLength(1)
  })

  it('stressed 状态超大 tick 不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const f = makeForest({ density: 20, startTick: 0 })
    ;(sys as any).forests.push(f)
    sys.update(0, makeWorld(), em, 99999)
    // density 20.04 > 15 => stressed, not dying => not deleted
    expect((sys as any).forests).toHaveLength(1)
  })
})
