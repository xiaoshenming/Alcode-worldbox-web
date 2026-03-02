import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldKelpForestSystem } from '../systems/WorldKelpForestSystem'
import type { KelpForest } from '../systems/WorldKelpForestSystem'

function makeSys(): WorldKelpForestSystem { return new WorldKelpForestSystem() }

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3
// KelpForest生长条件：tile >= 0 && tile <= 1 (DEEP_WATER 或 SHALLOW_WATER)
const mockWorldSand         = { width: 200, height: 200, getTile: () => 2 } // SAND - spawn不了
const mockWorldDeepWater    = { width: 200, height: 200, getTile: () => 0 } // DEEP_WATER - 可spawn
const mockWorldShallowWater = { width: 200, height: 200, getTile: () => 1 } // SHALLOW_WATER - 可spawn
const mockWorldNull         = { width: 200, height: 200, getTile: () => null } // null - spawn不了
const mockEM = {} as any

let nextId = 1
function makeForest(overrides: Partial<KelpForest> = {}): KelpForest {
  return {
    id: nextId++, x: 20, y: 30,
    density: 15, height: 8,
    biodiversity: 10, carbonAbsorption: 5,
    growthRate: 1.0,
    tick: 0,
    ...overrides,
  }
}

// CHECK_INTERVAL = 1700, MAX_FORESTS = 22, SPAWN_CHANCE = 0.004
// cleanup: tick - f.tick > 90000 AND f.density < 10

describe('WorldKelpForestSystem - 初始状态', () => {
  let sys: WorldKelpForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始forests为空', () => {
    expect((sys as any).forests).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('forests是数组', () => {
    expect(Array.isArray((sys as any).forests)).toBe(true)
  })
  it('注入forest后长度为1', () => {
    ;(sys as any).forests.push(makeForest())
    expect((sys as any).forests).toHaveLength(1)
  })
  it('forest字段density正确', () => {
    ;(sys as any).forests.push(makeForest({ density: 15 }))
    expect((sys as any).forests[0].density).toBe(15)
  })
  it('forest字段height正确', () => {
    ;(sys as any).forests.push(makeForest({ height: 8 }))
    expect((sys as any).forests[0].height).toBe(8)
  })
  it('forest字段biodiversity正确', () => {
    ;(sys as any).forests.push(makeForest({ biodiversity: 10 }))
    expect((sys as any).forests[0].biodiversity).toBe(10)
  })
  it('forest字段carbonAbsorption正确', () => {
    ;(sys as any).forests.push(makeForest({ carbonAbsorption: 5 }))
    expect((sys as any).forests[0].carbonAbsorption).toBe(5)
  })
  it('forest字段growthRate正确', () => {
    ;(sys as any).forests.push(makeForest({ growthRate: 1.0 }))
    expect((sys as any).forests[0].growthRate).toBe(1.0)
  })
  it('内部forests引用一致', () => {
    expect((sys as any).forests).toBe((sys as any).forests)
  })
})

describe('WorldKelpForestSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldKelpForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=100 < CHECK_INTERVAL(1700)时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1699时仍被节流不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldDeepWater as any, mockEM, 1699)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('tick=1700时lastCheck更新为1700', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    expect((sys as any).lastCheck).toBe(1700)
  })
  it('第一次执行后第二次tick未满间隔不再执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    const lc = (sys as any).lastCheck
    sys.update(0, mockWorldDeepWater as any, mockEM, 1701)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('第二个完整间隔（3400）lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    sys.update(0, mockWorldSand as any, mockEM, 3400)
    expect((sys as any).lastCheck).toBe(3400)
  })
})

describe('WorldKelpForestSystem - spawn条件', () => {
  let sys: WorldKelpForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0.9时不spawn（超出SPAWN_CHANCE=0.004）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldDeepWater as any, mockEM, 1700)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('tile=SAND(2)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('tile=null时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldNull as any, mockEM, 1700)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('tile=GRASS(3)时不spawn（超出范围）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const mockGrass = { width: 200, height: 200, getTile: () => 3 }
    sys.update(0, mockGrass as any, mockEM, 1700)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('tile=DEEP_WATER(0)且random<0.004时spawn成功', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.001 : 0.5
    })
    sys.update(0, mockWorldDeepWater as any, mockEM, 1700)
    expect((sys as any).forests).toHaveLength(1)
  })
  it('tile=SHALLOW_WATER(1)且random<0.004时spawn成功', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.001 : 0.5
    })
    sys.update(0, mockWorldShallowWater as any, mockEM, 1700)
    expect((sys as any).forests).toHaveLength(1)
  })
  it('spawn时id自增', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount <= 2 ? 0.001 : 0.5
    })
    sys.update(0, mockWorldDeepWater as any, mockEM, 1700)
    callCount = 0
    sys.update(0, mockWorldDeepWater as any, mockEM, 3400)
    const ids = (sys as any).forests.map((f: KelpForest) => f.id)
    expect(ids[0]).not.toBe(ids[1])
  })
  it('spawn的forest带有正确tick', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.001 : 0.5
    })
    sys.update(0, mockWorldDeepWater as any, mockEM, 1700)
    expect((sys as any).forests[0].tick).toBe(1700)
  })
})

describe('WorldKelpForestSystem - 字段动态更新', () => {
  let sys: WorldKelpForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('update后density增加（基于growthRate）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).forests.push(makeForest({ tick: 99000, density: 15, growthRate: 1.0 }))
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    expect((sys as any).forests[0].density).toBeGreaterThan(15)
  })
  it('update后density不超过100（clamp上限）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).forests.push(makeForest({ tick: 99000, density: 100, growthRate: 1.0 }))
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    expect((sys as any).forests[0].density).toBeLessThanOrEqual(100)
  })
  it('update后height增加0.03', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).forests.push(makeForest({ tick: 99000, height: 8 }))
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    expect((sys as any).forests[0].height).toBeCloseTo(8.03)
  })
  it('update后height不超过20（clamp上限）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).forests.push(makeForest({ tick: 99000, height: 20 }))
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    expect((sys as any).forests[0].height).toBeLessThanOrEqual(20)
  })
  it('update后biodiversity增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).forests.push(makeForest({ tick: 99000, biodiversity: 10, density: 50 }))
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    expect((sys as any).forests[0].biodiversity).toBeGreaterThan(10)
  })
  it('update后carbonAbsorption根据density和height重新计算', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const density = 50
    const height = 10
    ;(sys as any).forests.push(makeForest({ tick: 99000, density, height, growthRate: 1.0 }))
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    // carbonAbsorption = density * 0.15 + height * 0.3，density/height在update后略有增加
    const f = (sys as any).forests[0]
    const expected = f.density * 0.15 + f.height * 0.3
    expect(f.carbonAbsorption).toBeCloseTo(expected, 5)
  })
  it('update不修改forest的growthRate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).forests.push(makeForest({ tick: 99000, growthRate: 1.2 }))
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    expect((sys as any).forests[0].growthRate).toBe(1.2)
  })
  it('update不修改forest的tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).forests.push(makeForest({ tick: 99000 }))
    sys.update(0, mockWorldSand as any, mockEM, 1700)
    expect((sys as any).forests[0].tick).toBe(99000)
  })
})

describe('WorldKelpForestSystem - cleanup（tick-f.tick>90000 && density<10）', () => {
  let sys: WorldKelpForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('超时且density<10时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).forests.push(makeForest({ tick: 0, density: 5 }))
    sys.update(0, mockWorldSand as any, mockEM, 91700)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('超时但density>=10时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).forests.push(makeForest({ tick: 0, density: 15 }))
    sys.update(0, mockWorldSand as any, mockEM, 91700)
    expect((sys as any).forests).toHaveLength(1)
  })
  it('density<10但未超时时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).forests.push(makeForest({ tick: 90000, density: 5 }))
    sys.update(0, mockWorldSand as any, mockEM, 91700)
    expect((sys as any).forests).toHaveLength(1)
  })
  it('混合cleanup：超时低密度删除，高密度保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 200000
    ;(sys as any).forests.push(makeForest({ id: 10, tick: 0, density: 5 }))    // 删除
    ;(sys as any).forests.push(makeForest({ id: 11, tick: 0, density: 20 }))   // 保留
    ;(sys as any).forests.push(makeForest({ id: 12, tick: 150000, density: 5 })) // 保留（未超时）
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).forests).toHaveLength(2)
  })
  it('全部超时且低密度时forests清空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).forests.push(makeForest({ tick: 0, density: 3 }))
    }
    sys.update(0, mockWorldSand as any, mockEM, 100000)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('tick-f.tick恰好等于90000时不删除（严格大于）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 91700
    const fTick = currentTick - 90000 // 差值 = 90000 (不满足 > 90000)
    ;(sys as any).forests.push(makeForest({ tick: fTick, density: 5 }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).forests).toHaveLength(1)
  })
})

describe('WorldKelpForestSystem - MAX_FORESTS上限', () => {
  let sys: WorldKelpForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('forests满22个时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 22; i++) {
      ;(sys as any).forests.push(makeForest({ tick: 999999, density: 50 }))
    }
    sys.update(0, mockWorldDeepWater as any, mockEM, 999999 + 1700)
    expect((sys as any).forests.length).toBe(22)
  })
  it('forests为21个时仍可spawn', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.001 : 0.5
    })
    for (let i = 0; i < 21; i++) {
      ;(sys as any).forests.push(makeForest({ tick: 999999, density: 50 }))
    }
    sys.update(0, mockWorldDeepWater as any, mockEM, 999999 + 1700)
    expect((sys as any).forests.length).toBe(22)
  })
})

describe('WorldKelpForestSystem - id唯一性', () => {
  let sys: WorldKelpForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入多个forest时id各不相同', () => {
    const f1 = makeForest()
    const f2 = makeForest()
    const f3 = makeForest()
    ;(sys as any).forests.push(f1, f2, f3)
    const ids = (sys as any).forests.map((f: KelpForest) => f.id)
    expect(new Set(ids).size).toBe(3)
  })
  it('多个forests全部返回', () => {
    ;(sys as any).forests.push(makeForest())
    ;(sys as any).forests.push(makeForest())
    ;(sys as any).forests.push(makeForest())
    expect((sys as any).forests).toHaveLength(3)
  })
})
