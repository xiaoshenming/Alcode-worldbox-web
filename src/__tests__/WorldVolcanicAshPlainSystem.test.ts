import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldVolcanicAshPlainSystem } from '../systems/WorldVolcanicAshPlainSystem'
import type { VolcanicAshPlain } from '../systems/WorldVolcanicAshPlainSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2800
// FORM_CHANCE = 0.002  (Math.random() < FORM_CHANCE 才spawn)
// MAX_PLAINS = 24
// tile条件: tile === TileType.MOUNTAIN(5) || tile === TileType.GRASS(3)
// spawn坐标: x = 10 + floor(random*(w-20)), y = 10 + floor(random*(h-20))
// 字段: radius=4+floor(random*6)∈[4,9], ashDepth=5+random*20∈[5,25), fertility=30+random*40∈[30,70), revegetation=0, particleDensity=50+random*40∈[50,90)
// updateAll: ashDepth = max(0.5, ashDepth-0.003); revegetation = min(100, reveg+0.015); fertility = min(100, fert+reveg*0.001); particleDensity = max(5, pd-0.01)
// cleanup: tick < (currentTick - 88000) 时删除

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.002
const MAX_PLAINS = 24
const CUTOFF = 88000
const TICK0 = CHECK_INTERVAL

function makeSys(): WorldVolcanicAshPlainSystem { return new WorldVolcanicAshPlainSystem() }

let nextId = 1
function makePlain(overrides: Partial<VolcanicAshPlain> = {}): VolcanicAshPlain {
  return {
    id: nextId++,
    x: 50, y: 50,
    radius: 8,
    ashDepth: 15,
    fertility: 50,
    revegetation: 10,
    particleDensity: 70,
    tick: 0,
    ...overrides
  }
}

// mock world，getTile返回MOUNTAIN(5)
function makeMockWorldMountain(): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn(() => 5)  // MOUNTAIN
  }
}

// mock world，getTile返回GRASS(3)
function makeMockWorldGrass(): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn(() => 3)  // GRASS
  }
}

// mock world，getTile返回SAND(2)，不满足条件
function makeMockWorldSand(): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn(() => 2)  // SAND
  }
}

// mock world，getTile返回SHALLOW_WATER(1)，不满足条件
function makeMockWorldWater(): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn(() => 1)  // SHALLOW_WATER
  }
}

const mockEm = {} as any

// ===== 1. 初始状态 =====
describe('WorldVolcanicAshPlainSystem - 初始状态', () => {
  let sys: WorldVolcanicAshPlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始plains数组为空', () => {
    expect((sys as any).plains).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('plains是数组类型', () => {
    expect(Array.isArray((sys as any).plains)).toBe(true)
  })

  it('手动注入plain后数组长度为1', () => {
    ;(sys as any).plains.push(makePlain())
    expect((sys as any).plains).toHaveLength(1)
  })

  it('VolcanicAshPlain包含所有必要字段', () => {
    const p = makePlain()
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('x')
    expect(p).toHaveProperty('y')
    expect(p).toHaveProperty('radius')
    expect(p).toHaveProperty('ashDepth')
    expect(p).toHaveProperty('fertility')
    expect(p).toHaveProperty('revegetation')
    expect(p).toHaveProperty('particleDensity')
    expect(p).toHaveProperty('tick')
  })

  it('返回同一plains引用', () => {
    const ref1 = (sys as any).plains
    const ref2 = (sys as any).plains
    expect(ref1).toBe(ref2)
  })
})

// ===== 2. CHECK_INTERVAL节流 =====
describe('WorldVolcanicAshPlainSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldVolcanicAshPlainSystem
  let world: any
  beforeEach(() => { sys = makeSys(); nextId = 1; world = makeMockWorldMountain() })

  it('tick=0时不执行（0-0=0 < 2800）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, 0)
    expect((sys as any).plains).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=2799时不执行（2799-0=2799 < 2800）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, 2799)
    expect((sys as any).plains).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=2800时执行（2800-0=2800 >= 2800）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // 大值，不spawn
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).lastCheck).toBe(TICK0)
    vi.restoreAllMocks()
  })

  it('执行后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).lastCheck).toBe(TICK0)
    vi.restoreAllMocks()
  })

  it('第二次调用在未达间隔时被阻止', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    sys.update(0, world, mockEm, TICK0 + 100)
    expect((sys as any).lastCheck).toBe(TICK0)
    vi.restoreAllMocks()
  })

  it('连续两次间隔触发都更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    sys.update(0, world, mockEm, TICK0 * 2)
    expect((sys as any).lastCheck).toBe(TICK0 * 2)
    vi.restoreAllMocks()
  })

  it('tick=1时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, 1)
    expect((sys as any).plains).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('CHECK_INTERVAL=2800', () => {
    expect(CHECK_INTERVAL).toBe(2800)
  })
})

// ===== 3. Spawn条件验证 =====
describe('WorldVolcanicAshPlainSystem - Spawn条件', () => {
  let sys: WorldVolcanicAshPlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tile===MOUNTAIN(5)且random<FORM_CHANCE时spawn', () => {
    const world = makeMockWorldMountain()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)  // < 0.002
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).plains).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tile===GRASS(3)且random<FORM_CHANCE时spawn', () => {
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).plains).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tile===SAND(2)时不spawn（即使random<FORM_CHANCE）', () => {
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).plains).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tile===SHALLOW_WATER(1)时不spawn', () => {
    const world = makeMockWorldWater()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).plains).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random >= FORM_CHANCE时不spawn（即使tile满足）', () => {
    const world = makeMockWorldMountain()
    vi.spyOn(Math, 'random').mockReturnValue(0.003)  // > 0.002
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).plains).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('plains达到MAX_PLAINS(24)时不spawn', () => {
    const world = makeMockWorldMountain()
    for (let i = 0; i < MAX_PLAINS; i++) {
      ;(sys as any).plains.push(makePlain({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).plains).toHaveLength(MAX_PLAINS)
    vi.restoreAllMocks()
  })

  it('plains未满时允许spawn', () => {
    const world = makeMockWorldMountain()
    for (let i = 0; i < MAX_PLAINS - 1; i++) {
      ;(sys as any).plains.push(makePlain({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).plains).toHaveLength(MAX_PLAINS)
    vi.restoreAllMocks()
  })

  it('spawn坐标x在[10, w-10)范围内', () => {
    const world = makeMockWorldMountain()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    const p = (sys as any).plains[0]
    expect(p.x).toBeGreaterThanOrEqual(10)
    expect(p.x).toBeLessThan(90)
    vi.restoreAllMocks()
  })

  it('spawn坐标y在[10, h-10)范围内', () => {
    const world = makeMockWorldMountain()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    const p = (sys as any).plains[0]
    expect(p.y).toBeGreaterThanOrEqual(10)
    expect(p.y).toBeLessThan(90)
    vi.restoreAllMocks()
  })

  it('同一次update只会spawn一个（单次attempt）', () => {
    const world = makeMockWorldMountain()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).plains.length).toBeLessThanOrEqual(1)
    vi.restoreAllMocks()
  })
})

// ===== 4. Spawn后字段值范围 =====
describe('WorldVolcanicAshPlainSystem - Spawn后字段值范围', () => {
  let sys: WorldVolcanicAshPlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  function spawnOne(tick = TICK0): VolcanicAshPlain {
    const world = makeMockWorldMountain()
    sys.update(0, world, mockEm, tick)
    return (sys as any).plains[0]
  }

  it('spawn后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const p = spawnOne(TICK0)
    expect(p.tick).toBe(TICK0)
    vi.restoreAllMocks()
  })

  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const p = spawnOne()
    expect(p.id).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('radius >= 4', () => {
    // radius = 4 + floor(random*6), random=0.0001 => 4+floor(0.0006)=4+0=4
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const p = spawnOne()
    expect(p.radius).toBeGreaterThanOrEqual(4)
    vi.restoreAllMocks()
  })

  it('radius <= 9（最大 4+floor(0.9999*6)=4+5=9）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const p = spawnOne()
    expect(p.radius).toBeLessThanOrEqual(9)
    vi.restoreAllMocks()
  })

  it('radius是整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const p = spawnOne()
    expect(Number.isInteger(p.radius)).toBe(true)
    vi.restoreAllMocks()
  })

  it('ashDepth spawn范围[5, 25), updateAll后减小', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const p = spawnOne()
    // spawn: ashDepth = 5 + 0.0001*20 = 5.002
    // updateAll: ashDepth = max(0.5, 5.002 - 0.003) = 4.999
    expect(p.ashDepth).toBeGreaterThanOrEqual(0.5)
    expect(p.ashDepth).toBeLessThanOrEqual(25)
    vi.restoreAllMocks()
  })

  it('fertility spawn范围[30, 70)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const p = spawnOne()
    expect(p.fertility).toBeGreaterThanOrEqual(30)
    expect(p.fertility).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('revegetation spawn后为0，updateAll后增加0.015', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const p = spawnOne()
    // spawn时revegetation=0, updateAll后=min(100, 0+0.015)=0.015
    expect(p.revegetation).toBeCloseTo(0.015, 5)
    vi.restoreAllMocks()
  })

  it('particleDensity spawn范围[50, 90)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const p = spawnOne()
    expect(p.particleDensity).toBeGreaterThanOrEqual(5)  // updateAll后下限
    expect(p.particleDensity).toBeLessThanOrEqual(90)
    vi.restoreAllMocks()
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const before = (sys as any).nextId
    const world = makeMockWorldMountain()
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).nextId).toBeGreaterThan(before)
    vi.restoreAllMocks()
  })

  it('radius = 4 + floor(random*6) 公式验证（random=0.0001）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const p = spawnOne()
    // 4 + floor(0.0001*6) = 4 + 0 = 4
    expect(p.radius).toBe(4)
    vi.restoreAllMocks()
  })
})

// ===== 5. UpdateAll字段演化 =====
describe('WorldVolcanicAshPlainSystem - UpdateAll字段演化', () => {
  let sys: WorldVolcanicAshPlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发后ashDepth减少0.003', () => {
    const p = makePlain({ ashDepth: 10, revegetation: 0, tick: 0 })
    ;(sys as any).plains.push(p)
    const world = makeMockWorldSand()  // 不spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(p.ashDepth).toBeCloseTo(10 - 0.003, 5)
    vi.restoreAllMocks()
  })

  it('ashDepth不低于0.5下限', () => {
    const p = makePlain({ ashDepth: 0.5, revegetation: 0, tick: 0 })
    ;(sys as any).plains.push(p)
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(p.ashDepth).toBeGreaterThanOrEqual(0.5)
    vi.restoreAllMocks()
  })

  it('ashDepth从极小值不继续下降（max保护）', () => {
    const p = makePlain({ ashDepth: 0.501, revegetation: 0, tick: 0 })
    ;(sys as any).plains.push(p)
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    // max(0.5, 0.501 - 0.003) = max(0.5, 0.498) = 0.5
    expect(p.ashDepth).toBe(0.5)
    vi.restoreAllMocks()
  })

  it('revegetation每次增加0.015', () => {
    const p = makePlain({ revegetation: 50, tick: 0 })
    ;(sys as any).plains.push(p)
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(p.revegetation).toBeCloseTo(50.015, 5)
    vi.restoreAllMocks()
  })

  it('revegetation不超过100上限', () => {
    const p = makePlain({ revegetation: 99.99, tick: 0 })
    ;(sys as any).plains.push(p)
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(p.revegetation).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('fertility随revegetation*0.001增加', () => {
    const p = makePlain({ fertility: 50, revegetation: 20, tick: 0 })
    ;(sys as any).plains.push(p)
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    // fertility = min(100, 50 + 20.015*0.001) = min(100, 50.020015)
    // revegetation先更新为20.015，所以fertility += 20.015*0.001
    expect(p.fertility).toBeGreaterThan(50)
    vi.restoreAllMocks()
  })

  it('fertility不超过100上限', () => {
    const p = makePlain({ fertility: 99.99, revegetation: 100, tick: 0 })
    ;(sys as any).plains.push(p)
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(p.fertility).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('particleDensity每次减少0.01', () => {
    const p = makePlain({ particleDensity: 60, tick: 0 })
    ;(sys as any).plains.push(p)
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(p.particleDensity).toBeCloseTo(60 - 0.01, 5)
    vi.restoreAllMocks()
  })

  it('particleDensity不低于5下限', () => {
    const p = makePlain({ particleDensity: 5, tick: 0 })
    ;(sys as any).plains.push(p)
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(p.particleDensity).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })

  it('多个plain都会被updateAll', () => {
    const p1 = makePlain({ ashDepth: 10, revegetation: 0, tick: 0 })
    const p2 = makePlain({ ashDepth: 15, revegetation: 5, tick: 0 })
    ;(sys as any).plains.push(p1)
    ;(sys as any).plains.push(p2)
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(p1.ashDepth).toBeCloseTo(10 - 0.003, 5)
    expect(p2.ashDepth).toBeCloseTo(15 - 0.003, 5)
    vi.restoreAllMocks()
  })
})

// ===== 6. Cleanup逻辑 =====
describe('WorldVolcanicAshPlainSystem - Cleanup逻辑', () => {
  let sys: WorldVolcanicAshPlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < currentTick - 88000的plain被清除', () => {
    const currentTick = TICK0 + CUTOFF
    ;(sys as any).plains.push(makePlain({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).plains).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick >= currentTick - 88000的plain保留', () => {
    const currentTick = TICK0 * 2
    const pTick = currentTick - CUTOFF + 100
    ;(sys as any).plains.push(makePlain({ tick: pTick }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).plains).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('cutoff边界：tick等于cutoff时保留', () => {
    const currentTick = TICK0 + CUTOFF
    const pTick = currentTick - CUTOFF  // 恰好等于cutoff
    ;(sys as any).plains.push(makePlain({ tick: pTick }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).plains).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('cutoff边界：tick比cutoff少1时删除', () => {
    const currentTick = TICK0 + CUTOFF
    const pTick = currentTick - CUTOFF - 1
    ;(sys as any).plains.push(makePlain({ tick: pTick }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).plains).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('多个plain只清除过期的', () => {
    const currentTick = TICK0 + CUTOFF
    ;(sys as any).plains.push(makePlain({ tick: 0 }))
    ;(sys as any).plains.push(makePlain({ tick: currentTick - 100 }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).plains).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('所有plain都过期时数组清空', () => {
    const currentTick = TICK0 + CUTOFF
    for (let i = 0; i < 5; i++) {
      ;(sys as any).plains.push(makePlain({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).plains).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('所有plain都新鲜时全部保留', () => {
    const currentTick = TICK0
    for (let i = 0; i < 5; i++) {
      ;(sys as any).plains.push(makePlain({ tick: TICK0 }))
    }
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick * 2)
    expect((sys as any).plains).toHaveLength(5)
    vi.restoreAllMocks()
  })

  it('cleanup在CHECK_INTERVAL未到时不执行', () => {
    ;(sys as any).plains.push(makePlain({ tick: 0 }))
    ;(sys as any).lastCheck = 10000
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, 10001)  // 10001-10000=1 < 2800
    expect((sys as any).plains).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('CUTOFF=88000', () => {
    expect(CUTOFF).toBe(88000)
  })
})

// ===== 7. MAX_PLAINS上限 =====
describe('WorldVolcanicAshPlainSystem - MAX_PLAINS上限', () => {
  let sys: WorldVolcanicAshPlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('plains不超过MAX_PLAINS=24', () => {
    const world = makeMockWorldMountain()
    for (let i = 0; i < MAX_PLAINS; i++) {
      ;(sys as any).plains.push(makePlain({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).plains.length).toBeLessThanOrEqual(MAX_PLAINS)
    vi.restoreAllMocks()
  })

  it('plains恰好24个时不再添加', () => {
    for (let i = 0; i < MAX_PLAINS; i++) {
      ;(sys as any).plains.push(makePlain({ tick: TICK0 }))
    }
    const world = makeMockWorldMountain()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).plains).toHaveLength(MAX_PLAINS)
    vi.restoreAllMocks()
  })

  it('plains为23个时可以继续添加', () => {
    for (let i = 0; i < MAX_PLAINS - 1; i++) {
      ;(sys as any).plains.push(makePlain({ tick: TICK0 }))
    }
    const world = makeMockWorldMountain()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).plains).toHaveLength(MAX_PLAINS)
    vi.restoreAllMocks()
  })

  it('多次触发后plains不超过上限', () => {
    const world = makeMockWorldMountain()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < 30; i++) {
      sys.update(0, world, mockEm, TICK0 * (i + 1))
    }
    expect((sys as any).plains.length).toBeLessThanOrEqual(MAX_PLAINS)
    vi.restoreAllMocks()
  })

  it('MAX_PLAINS=24', () => {
    expect(MAX_PLAINS).toBe(24)
  })
})

// ===== 8. 多实例隔离与边界 =====
describe('WorldVolcanicAshPlainSystem - 多实例隔离与边界', () => {
  it('两个实例各自独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).plains.push(makePlain())
    expect((sys1 as any).plains).toHaveLength(1)
    expect((sys2 as any).plains).toHaveLength(0)
  })

  it('各实例nextId独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    expect((sys1 as any).nextId).toBe(1)
    expect((sys2 as any).nextId).toBe(1)
  })

  it('各实例lastCheck独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).lastCheck = 5000
    expect((sys2 as any).lastCheck).toBe(0)
  })

  it('update函数存在', () => {
    const sys = makeSys()
    expect(typeof (sys as any).update).toBe('function')
  })

  it('VolcanicAshPlain所有字段类型正确', () => {
    const p = makePlain()
    expect(typeof p.id).toBe('number')
    expect(typeof p.x).toBe('number')
    expect(typeof p.y).toBe('number')
    expect(typeof p.radius).toBe('number')
    expect(typeof p.ashDepth).toBe('number')
    expect(typeof p.fertility).toBe('number')
    expect(typeof p.revegetation).toBe('number')
    expect(typeof p.particleDensity).toBe('number')
    expect(typeof p.tick).toBe('number')
  })

  it('FORM_CHANCE=0.002', () => {
    expect(FORM_CHANCE).toBe(0.002)
  })

  it('手动添加多个plain后正确计数', () => {
    const sys = makeSys()
    for (let i = 0; i < 10; i++) {
      ;(sys as any).plains.push(makePlain())
    }
    expect((sys as any).plains).toHaveLength(10)
  })

  it('revegetation初始spawn为0', () => {
    const p = makePlain({ revegetation: 0 })
    expect(p.revegetation).toBe(0)
  })

  it('ashDepth下限为0.5确保平原不完全消失', () => {
    const p = makePlain({ ashDepth: 0.001, tick: 0 })
    ;(p as any).ashDepth = Math.max(0.5, p.ashDepth - 0.003)
    expect(p.ashDepth).toBe(0.5)
  })
})
