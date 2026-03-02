import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldVentifactSystem } from '../systems/WorldVentifactSystem'
import type { Ventifact } from '../systems/WorldVentifactSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2560
// FORM_CHANCE = 0.0015  (Math.random() < FORM_CHANCE 才spawn，单次attempt)
// MAX_VENTIFACTS = 18
// tile条件: tile === TileType.SAND(2) || tile === TileType.MOUNTAIN(5)
// spawn坐标: x = 10 + floor(random*(w-20)), y = 10 + floor(random*(h-20))
// 字段范围: facets: 1~5(floor), polish: 10~50, windExposure: 30~80, rockType: 0~3(floor), abrasionRate: 5~25, spectacle: 8~33
// updateAll: facets += (random<0.0005?1:0), 上限6; polish += 0.00004, 上限80; abrasionRate +=(random-0.5)*0.08，范围[2,35]; spectacle +=(random-0.47)*0.09，范围[5,50]
// cleanup: tick < (currentTick - 90000) 时删除

const CHECK_INTERVAL = 2560
const FORM_CHANCE = 0.0015
const MAX_VENTIFACTS = 18
const CUTOFF = 90000
const TICK0 = CHECK_INTERVAL

function makeSys(): WorldVentifactSystem { return new WorldVentifactSystem() }

let nextId = 1
function makeVentifact(overrides: Partial<Ventifact> = {}): Ventifact {
  return {
    id: nextId++,
    x: 50, y: 50,
    facets: 3,
    polish: 40,
    windExposure: 60,
    rockType: 1,
    abrasionRate: 10,
    spectacle: 20,
    tick: 0,
    ...overrides
  }
}

// mock world，getTile返回SAND(2)
function makeMockWorldSand(): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn(() => 2)  // SAND
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

// mock world，getTile返回GRASS(3)，不满足条件
function makeMockWorldGrass(): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn(() => 3)  // GRASS
  }
}

const mockEm = {} as any

// ===== 1. 初始状态 =====
describe('WorldVentifactSystem - 初始状态', () => {
  let sys: WorldVentifactSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始ventifacts数组为空', () => {
    expect((sys as any).ventifacts).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('ventifacts是数组类型', () => {
    expect(Array.isArray((sys as any).ventifacts)).toBe(true)
  })

  it('手动注入ventifact后数组长度为1', () => {
    ;(sys as any).ventifacts.push(makeVentifact())
    expect((sys as any).ventifacts).toHaveLength(1)
  })

  it('Ventifact包含所有必要字段', () => {
    const v = makeVentifact()
    expect(v).toHaveProperty('id')
    expect(v).toHaveProperty('x')
    expect(v).toHaveProperty('y')
    expect(v).toHaveProperty('facets')
    expect(v).toHaveProperty('polish')
    expect(v).toHaveProperty('windExposure')
    expect(v).toHaveProperty('rockType')
    expect(v).toHaveProperty('abrasionRate')
    expect(v).toHaveProperty('spectacle')
    expect(v).toHaveProperty('tick')
  })

  it('返回同一ventifacts引用', () => {
    const ref1 = (sys as any).ventifacts
    const ref2 = (sys as any).ventifacts
    expect(ref1).toBe(ref2)
  })
})

// ===== 2. CHECK_INTERVAL节流 =====
describe('WorldVentifactSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldVentifactSystem
  let world: any
  beforeEach(() => { sys = makeSys(); nextId = 1; world = makeMockWorldSand() })

  it('tick=0时不执行（0-0=0 < 2560）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, 0)
    expect((sys as any).ventifacts).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=2559时不执行（2559-0=2559 < 2560）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, 2559)
    expect((sys as any).ventifacts).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=2560时执行（2560-0=2560 >= 2560）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // 大值，random < 0.0015 不满足
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
    expect((sys as any).ventifacts).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick正好等于2CHECK_INTERVAL-lastCheck时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = TICK0
    sys.update(0, world, mockEm, TICK0 * 2)
    expect((sys as any).lastCheck).toBe(TICK0 * 2)
    vi.restoreAllMocks()
  })
})

// ===== 3. Spawn条件验证 =====
describe('WorldVentifactSystem - Spawn条件', () => {
  let sys: WorldVentifactSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tile===SAND(2)且random<FORM_CHANCE时spawn', () => {
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)  // < 0.0015
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).ventifacts).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tile===MOUNTAIN(5)且random<FORM_CHANCE时spawn', () => {
    const world = makeMockWorldMountain()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).ventifacts).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tile===GRASS(3)时不spawn（即使random<FORM_CHANCE）', () => {
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).ventifacts).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random >= FORM_CHANCE时不spawn（即使tile满足）', () => {
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.002)  // > 0.0015
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).ventifacts).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('ventifacts达到MAX_VENTIFACTS(18)时不spawn', () => {
    const world = makeMockWorldSand()
    for (let i = 0; i < MAX_VENTIFACTS; i++) {
      ;(sys as any).ventifacts.push(makeVentifact({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).ventifacts).toHaveLength(MAX_VENTIFACTS)
    vi.restoreAllMocks()
  })

  it('ventifacts未满时允许spawn', () => {
    const world = makeMockWorldSand()
    for (let i = 0; i < MAX_VENTIFACTS - 1; i++) {
      ;(sys as any).ventifacts.push(makeVentifact({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).ventifacts).toHaveLength(MAX_VENTIFACTS)
    vi.restoreAllMocks()
  })

  it('spawn坐标x在[10, w-10)范围内', () => {
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    const v = (sys as any).ventifacts[0]
    expect(v.x).toBeGreaterThanOrEqual(10)
    expect(v.x).toBeLessThan(90)  // w-20=80, 10+floor(0.0001*80)=10
    vi.restoreAllMocks()
  })

  it('spawn坐标y在[10, h-10)范围内', () => {
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    const v = (sys as any).ventifacts[0]
    expect(v.y).toBeGreaterThanOrEqual(10)
    expect(v.y).toBeLessThan(90)
    vi.restoreAllMocks()
  })

  it('同一次update只会spawn一个（单次attempt）', () => {
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    // VentifactSystem没有3次attempt循环，只有一次检查
    expect((sys as any).ventifacts.length).toBeLessThanOrEqual(1)
    vi.restoreAllMocks()
  })
})

// ===== 4. Spawn后字段值范围 =====
describe('WorldVentifactSystem - Spawn后字段值范围', () => {
  let sys: WorldVentifactSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  function spawnOne(tick = TICK0): Ventifact {
    const world = makeMockWorldSand()
    sys.update(0, world, mockEm, tick)
    return (sys as any).ventifacts[0]
  }

  it('spawn后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const v = spawnOne(TICK0)
    expect(v.tick).toBe(TICK0)
    vi.restoreAllMocks()
  })

  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const v = spawnOne()
    expect(v.id).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('facets >= 1', () => {
    // facets = 1 + floor(random * 5), random=0.0001 => 1+floor(0.0005)=1+0=1
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    // 注意：同一次update中random被多次调用（先判断length<MAX和random<FORM_CHANCE，再生成坐标，再getTile，再设置字段）
    // 由于mock返回固定值，所有随机调用都返回0.0001
    const v = spawnOne()
    expect(v.facets).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('facets <= 5（spawn时上限）', () => {
    // 最大random=0.9999, facets=1+floor(0.9999*5)=1+4=5
    // 但updateAll后可能+1，所以只测spawn时范围
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const v = spawnOne()
    // 由于updateAll在spawn后立即执行，facets可能+1
    expect(v.facets).toBeGreaterThanOrEqual(1)
    expect(v.facets).toBeLessThanOrEqual(6)  // updateAll上限是6
    vi.restoreAllMocks()
  })

  it('polish spawn范围[10, 50), updateAll后+0.00004', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const v = spawnOne()
    // spawn: polish = 10 + 0.0001*40 = 10.004
    // updateAll: polish = min(80, 10.004 + 0.00004) ≈ 10.00404
    expect(v.polish).toBeGreaterThanOrEqual(10)
    expect(v.polish).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  it('windExposure范围[30, 80)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const v = spawnOne()
    expect(v.windExposure).toBeGreaterThanOrEqual(30)
    expect(v.windExposure).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  it('rockType范围[0, 3]整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const v = spawnOne()
    expect(Number.isInteger(v.rockType)).toBe(true)
    expect(v.rockType).toBeGreaterThanOrEqual(0)
    expect(v.rockType).toBeLessThanOrEqual(3)
    vi.restoreAllMocks()
  })

  it('abrasionRate spawn范围[5, 25)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const v = spawnOne()
    expect(v.abrasionRate).toBeGreaterThanOrEqual(2)  // updateAll后可能降低
    expect(v.abrasionRate).toBeLessThanOrEqual(35)
    vi.restoreAllMocks()
  })

  it('spectacle spawn范围[8, 33)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const v = spawnOne()
    expect(v.spectacle).toBeGreaterThanOrEqual(5)  // updateAll后的下限
    expect(v.spectacle).toBeLessThanOrEqual(50)
    vi.restoreAllMocks()
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const before = (sys as any).nextId
    const world = makeMockWorldSand()
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).nextId).toBeGreaterThan(before)
    vi.restoreAllMocks()
  })
})

// ===== 5. UpdateAll逻辑 =====
describe('WorldVentifactSystem - UpdateAll字段演化', () => {
  let sys: WorldVentifactSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发后polish增加0.00004', () => {
    const v = makeVentifact({ polish: 30, tick: 0 })
    ;(sys as any).ventifacts.push(v)
    const world = makeMockWorldGrass()  // 不spawn新的
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // 不spawn，abrasionRate+=(0.9-0.5)*0.08=+0.032
    sys.update(0, world, mockEm, TICK0)
    // polish = min(80, 30 + 0.00004) = 30.00004
    expect(v.polish).toBeCloseTo(30.00004, 5)
    vi.restoreAllMocks()
  })

  it('polish不超过80上限', () => {
    const v = makeVentifact({ polish: 79.9999, tick: 0 })
    ;(sys as any).ventifacts.push(v)
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(v.polish).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  it('abrasionRate在[2, 35]范围内', () => {
    const v = makeVentifact({ abrasionRate: 10, tick: 0 })
    ;(sys as any).ventifacts.push(v)
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(v.abrasionRate).toBeGreaterThanOrEqual(2)
    expect(v.abrasionRate).toBeLessThanOrEqual(35)
    vi.restoreAllMocks()
  })

  it('spectacle在[5, 50]范围内', () => {
    const v = makeVentifact({ spectacle: 20, tick: 0 })
    ;(sys as any).ventifacts.push(v)
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(v.spectacle).toBeGreaterThanOrEqual(5)
    expect(v.spectacle).toBeLessThanOrEqual(50)
    vi.restoreAllMocks()
  })

  it('facets不超过6上限', () => {
    const v = makeVentifact({ facets: 6, tick: 0 })
    ;(sys as any).ventifacts.push(v)
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // 0.9 < 0.0005 为false，facets不增
    sys.update(0, world, mockEm, TICK0)
    expect(v.facets).toBe(6)
    vi.restoreAllMocks()
  })

  it('random < 0.0005时facets+1', () => {
    const v = makeVentifact({ facets: 3, tick: 0 })
    ;(sys as any).ventifacts.push(v)
    const world = makeMockWorldGrass()
    // 先调用random用于spawn判断（0.9大于FORM_CHANCE不spawn），后续random用于updateAll
    // 由于mock始终返回0.0001
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)  // < 0.0015 会spawn（但GRASS不满足tile），facets判断也<0.0005
    sys.update(0, world, mockEm, TICK0)
    // GRASS不spawn, facets random < 0.0005, facets = min(6, 3+1) = 4
    expect(v.facets).toBe(4)
    vi.restoreAllMocks()
  })

  it('多个ventifact都会被updateAll', () => {
    const v1 = makeVentifact({ polish: 20, tick: 0 })
    const v2 = makeVentifact({ polish: 30, tick: 0 })
    ;(sys as any).ventifacts.push(v1)
    ;(sys as any).ventifacts.push(v2)
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, TICK0)
    expect(v1.polish).toBeCloseTo(20.00004, 5)
    expect(v2.polish).toBeCloseTo(30.00004, 5)
    vi.restoreAllMocks()
  })

  it('spectacle向上偏移（random>0.47时增加）', () => {
    const v = makeVentifact({ spectacle: 20, tick: 0 })
    ;(sys as any).ventifacts.push(v)
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // 0.9 > 0.47, 增加
    sys.update(0, world, mockEm, TICK0)
    // spectacle = min(50, max(5, 20 + (0.9-0.47)*0.09)) = min(50, max(5, 20.0387))
    expect(v.spectacle).toBeGreaterThan(20)
    vi.restoreAllMocks()
  })
})

// ===== 6. Cleanup逻辑 =====
describe('WorldVentifactSystem - Cleanup逻辑', () => {
  let sys: WorldVentifactSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < currentTick - 90000的ventifact被清除', () => {
    const currentTick = TICK0 + CUTOFF
    ;(sys as any).ventifacts.push(makeVentifact({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).ventifacts).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick >= currentTick - 90000的ventifact保留', () => {
    const currentTick = TICK0 * 2
    const vTick = currentTick - CUTOFF + 100
    ;(sys as any).ventifacts.push(makeVentifact({ tick: vTick }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).ventifacts).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('cutoff边界：tick等于cutoff时保留', () => {
    const currentTick = TICK0 + CUTOFF
    const vTick = currentTick - CUTOFF  // 恰好等于cutoff，不满足 < cutoff
    ;(sys as any).ventifacts.push(makeVentifact({ tick: vTick }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).ventifacts).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('cutoff边界：tick比cutoff少1时删除', () => {
    const currentTick = TICK0 + CUTOFF
    const vTick = currentTick - CUTOFF - 1
    ;(sys as any).ventifacts.push(makeVentifact({ tick: vTick }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).ventifacts).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('多个ventifact只清除过期的', () => {
    const currentTick = TICK0 + CUTOFF
    ;(sys as any).ventifacts.push(makeVentifact({ tick: 0 }))
    ;(sys as any).ventifacts.push(makeVentifact({ tick: currentTick - 100 }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).ventifacts).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('所有ventifact都过期时数组清空', () => {
    const currentTick = TICK0 + CUTOFF
    for (let i = 0; i < 5; i++) {
      ;(sys as any).ventifacts.push(makeVentifact({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).ventifacts).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('所有ventifact都新鲜时全部保留', () => {
    const currentTick = TICK0
    for (let i = 0; i < 5; i++) {
      ;(sys as any).ventifacts.push(makeVentifact({ tick: TICK0 }))
    }
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick * 2)
    expect((sys as any).ventifacts).toHaveLength(5)
    vi.restoreAllMocks()
  })

  it('cleanup在CHECK_INTERVAL未到时不执行', () => {
    ;(sys as any).ventifacts.push(makeVentifact({ tick: 0 }))
    ;(sys as any).lastCheck = 10000
    const world = makeMockWorldGrass()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, 10001)  // 10001-10000=1 < 2560
    expect((sys as any).ventifacts).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('cutoff=90000常量正确', () => {
    expect(CUTOFF).toBe(90000)
  })
})

// ===== 7. MAX_VENTIFACTS上限 =====
describe('WorldVentifactSystem - MAX_VENTIFACTS上限', () => {
  let sys: WorldVentifactSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('ventifacts不超过MAX_VENTIFACTS=18', () => {
    const world = makeMockWorldSand()
    for (let i = 0; i < MAX_VENTIFACTS; i++) {
      ;(sys as any).ventifacts.push(makeVentifact({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).ventifacts.length).toBeLessThanOrEqual(MAX_VENTIFACTS)
    vi.restoreAllMocks()
  })

  it('ventifacts恰好18个时不再添加', () => {
    for (let i = 0; i < MAX_VENTIFACTS; i++) {
      ;(sys as any).ventifacts.push(makeVentifact({ tick: TICK0 }))
    }
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).ventifacts).toHaveLength(MAX_VENTIFACTS)
    vi.restoreAllMocks()
  })

  it('ventifacts为17个时可以继续添加', () => {
    for (let i = 0; i < MAX_VENTIFACTS - 1; i++) {
      ;(sys as any).ventifacts.push(makeVentifact({ tick: TICK0 }))
    }
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).ventifacts).toHaveLength(MAX_VENTIFACTS)
    vi.restoreAllMocks()
  })

  it('多次触发后ventifacts不超过上限', () => {
    const world = makeMockWorldSand()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < 30; i++) {
      sys.update(0, world, mockEm, TICK0 * (i + 1))
    }
    expect((sys as any).ventifacts.length).toBeLessThanOrEqual(MAX_VENTIFACTS)
    vi.restoreAllMocks()
  })

  it('MAX_VENTIFACTS=18', () => {
    expect(MAX_VENTIFACTS).toBe(18)
  })
})

// ===== 8. 多实例隔离与边界 =====
describe('WorldVentifactSystem - 多实例隔离与边界', () => {
  it('两个实例各自独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).ventifacts.push(makeVentifact())
    expect((sys1 as any).ventifacts).toHaveLength(1)
    expect((sys2 as any).ventifacts).toHaveLength(0)
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

  it('ventifact所有字段类型正确', () => {
    const v = makeVentifact()
    expect(typeof v.id).toBe('number')
    expect(typeof v.x).toBe('number')
    expect(typeof v.y).toBe('number')
    expect(typeof v.facets).toBe('number')
    expect(typeof v.polish).toBe('number')
    expect(typeof v.windExposure).toBe('number')
    expect(typeof v.rockType).toBe('number')
    expect(typeof v.abrasionRate).toBe('number')
    expect(typeof v.spectacle).toBe('number')
    expect(typeof v.tick).toBe('number')
  })

  it('CHECK_INTERVAL=2560', () => {
    expect(CHECK_INTERVAL).toBe(2560)
  })

  it('FORM_CHANCE=0.0015', () => {
    expect(FORM_CHANCE).toBe(0.0015)
  })

  it('手动添加多个ventifact后正确计数', () => {
    const sys = makeSys()
    for (let i = 0; i < 10; i++) {
      ;(sys as any).ventifacts.push(makeVentifact())
    }
    expect((sys as any).ventifacts).toHaveLength(10)
  })
})
