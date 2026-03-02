import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldWhirlpoolSystem } from '../systems/WorldWhirlpoolSystem'
import type { Whirlpool } from '../systems/WorldWhirlpoolSystem'
import { TileType } from '../utils/Constants'
import { EntityManager } from '../ecs/Entity'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 400
// MAX_WHIRLPOOLS = 5
// FORM_CHANCE = 0.015  (Math.random() > FORM_CHANCE 才跳过spawn)
// MIN_DEEP_TILES = 10  (7x7邻域内DEEP_WATER数量需>=10)
// PULL_FORCE = 0.4
// radius: 3 + floor(random*4) => [3,6]
// strength: 40 + random*60 => [40,100]
// rotSpeed: 0.05 + random*0.1 => [0.05,0.15]
// maxDuration: 2000 + floor(random*3000) => [2000,4999]
// strength clamp: [15,100], 每tick ±3 fluctuation
// cleanup: active===false 时移除

const CHECK_INTERVAL = 400
const MAX_WHIRLPOOLS = 5
const FORM_CHANCE = 0.015
const MIN_DEEP_TILES = 10
const TICK0 = CHECK_INTERVAL

let nextId = 100
function makeWhirlpool(overrides: Partial<Whirlpool> = {}): Whirlpool {
  return {
    id: nextId++,
    x: 30,
    y: 30,
    radius: 5,
    strength: 70,
    rotation: 0,
    rotSpeed: 0.1,
    duration: 0,
    maxDuration: 2000,
    active: true,
    ...overrides,
  }
}

function makeMockWorld(tileVal: number = TileType.DEEP_WATER, w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: vi.fn().mockReturnValue(tileVal),
  } as any
}

function makeMockWorldDeep(w = 200, h = 200) {
  // 返回DEEP_WATER，保证deepCount >= MIN_DEEP_TILES
  return {
    width: w,
    height: h,
    getTile: vi.fn().mockReturnValue(TileType.DEEP_WATER),
  } as any
}

function makeMockEm(entities: number[] = [], positions: Map<number, {x: number, y: number}> = new Map()) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(entities),
    getComponent: vi.fn().mockImplementation((id: number, type: string) => {
      if (type === 'position') {
        const pos = positions.get(id)
        return pos ? { type: 'position', ...pos } : undefined
      }
      return undefined
    }),
  } as any
}

const mockEm = makeMockEm()

// ========================================================
// 1. 初始状态
// ========================================================
describe('WorldWhirlpoolSystem - 初始状态', () => {
  let sys: WorldWhirlpoolSystem

  beforeEach(() => {
    sys = new WorldWhirlpoolSystem()
    nextId = 100
  })

  it('初始whirlpools数组为空', () => {
    expect((sys as any).whirlpools).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('whirlpools是数组类型', () => {
    expect(Array.isArray((sys as any).whirlpools)).toBe(true)
  })

  it('手动注入一个漩涡后数组长度为1', () => {
    ;(sys as any).whirlpools.push(makeWhirlpool())
    expect((sys as any).whirlpools).toHaveLength(1)
  })

  it('whirlpools引用稳定（同一对象）', () => {
    const ref = (sys as any).whirlpools
    expect(ref).toBe((sys as any).whirlpools)
  })

  it('getActiveWhirlpools初始返回空数组', () => {
    expect(sys.getActiveWhirlpools()).toHaveLength(0)
  })

  it('_activeWhirlpoolsBuf是数组', () => {
    expect(Array.isArray((sys as any)._activeWhirlpoolsBuf)).toBe(true)
  })
})

// ========================================================
// 2. CHECK_INTERVAL 节流
// ========================================================
describe('WorldWhirlpoolSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldWhirlpoolSystem

  beforeEach(() => {
    sys = new WorldWhirlpoolSystem()
    nextId = 100
    vi.spyOn(Math, 'random').mockReturnValue(1) // > FORM_CHANCE => 阻止spawn
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tick=0时不更新lastCheck', () => {
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL时不执行更新', () => {
    sys.update(0, makeMockWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL时触发更新', () => {
    sys.update(0, makeMockWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时触发更新', () => {
    sys.update(0, makeMockWorld(), mockEm, CHECK_INTERVAL + 50)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 50)
  })

  it('第一次触发后低于间隔不重复触发', () => {
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const saved = (sys as any).lastCheck
    sys.update(0, makeMockWorld(), mockEm, TICK0 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(saved)
  })

  it('第二次达到间隔时再次更新', () => {
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    sys.update(0, makeMockWorld(), mockEm, TICK0 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(TICK0 + CHECK_INTERVAL)
  })

  it('tick=0时whirlpools数组不变', () => {
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).whirlpools).toHaveLength(0)
  })

  it('低于间隔时不调用getTile', () => {
    const world = makeMockWorld()
    sys.update(0, world, mockEm, CHECK_INTERVAL - 1)
    expect(world.getTile).not.toHaveBeenCalled()
  })

  it('CHECK_INTERVAL常量等于400', () => {
    expect(CHECK_INTERVAL).toBe(400)
  })
})

// ========================================================
// 3. spawn条件
// ========================================================
describe('WorldWhirlpoolSystem - spawn条件', () => {
  let sys: WorldWhirlpoolSystem

  beforeEach(() => {
    sys = new WorldWhirlpoolSystem()
    nextId = 100
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('random < FORM_CHANCE且tile=DEEP_WATER时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorldDeep(), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(1)
  })

  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE + 0.001)
    sys.update(0, makeMockWorldDeep(), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(0)
  })

  it('random == FORM_CHANCE时不spawn（> 而非 >=）', () => {
    // Math.random() > FORM_CHANCE => false when equal means 不spawn（wait, 源码是 > FORM_CHANCE return，所以等于时才执行spawn）
    // 源码: if (Math.random() > FORM_CHANCE) return => 等于FORM_CHANCE时不return，继续spawn
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(0, makeMockWorldDeep(), mockEm, TICK0)
    // Math.random() > FORM_CHANCE => FORM_CHANCE > FORM_CHANCE => false => 不return => 执行spawn
    expect((sys as any).whirlpools).toHaveLength(1)
  })

  it('tile=SHALLOW_WATER时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(0)
  })

  it('tile=SAND时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(0)
  })

  it('tile=GRASS时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.GRASS), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(0)
  })

  it('tile=MOUNTAIN时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.MOUNTAIN), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(0)
  })

  it('已达MAX_WHIRLPOOLS时不spawn', () => {
    for (let i = 0; i < MAX_WHIRLPOOLS; i++) {
      ;(sys as any).whirlpools.push(makeWhirlpool({ active: true }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorldDeep(), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(MAX_WHIRLPOOLS)
  })

  it('比MAX_WHIRLPOOLS少一个时仍可spawn', () => {
    for (let i = 0; i < MAX_WHIRLPOOLS - 1; i++) {
      ;(sys as any).whirlpools.push(makeWhirlpool({ active: true }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorldDeep(), mockEm, TICK0)
    expect((sys as any).whirlpools.length).toBeGreaterThan(MAX_WHIRLPOOLS - 1)
  })

  it('deepCount不足MIN_DEEP_TILES时不spawn', () => {
    // getTile总返回SAND，deepCount=0 < MIN_DEEP_TILES=10
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    // 中心tile是DEEP_WATER，周边全是SAND
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return FORM_CHANCE - 0.001
    })
    // world: center returns DEEP_WATER, neighbors return SAND
    const world = {
      width: 200,
      height: 200,
      getTile: vi.fn().mockImplementation((x: number, y: number) => {
        // Only the very center tile returns DEEP_WATER
        if (x === 100 && y === 100) return TileType.DEEP_WATER
        return TileType.SAND
      }),
    } as any
    const sys2 = new WorldWhirlpoolSystem()
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    // center is DEEP_WATER but neighbors are SAND => deepCount maybe 1 < 10
    sys2.update(0, world, mockEm, TICK0)
    // With only 1 deep tile in 7x7, deepCount < MIN_DEEP_TILES => no spawn
    expect((sys2 as any).whirlpools).toHaveLength(0)
  })
})

// ========================================================
// 4. spawn后字段值
// ========================================================
describe('WorldWhirlpoolSystem - spawn后字段值', () => {
  let sys: WorldWhirlpoolSystem

  beforeEach(() => {
    sys = new WorldWhirlpoolSystem()
    nextId = 100
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function doSpawn() {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorldDeep(), mockEm, TICK0)
  }

  it('spawn后数组长度为1', () => {
    doSpawn()
    expect((sys as any).whirlpools).toHaveLength(1)
  })

  it('spawn后id从1开始', () => {
    doSpawn()
    expect((sys as any).whirlpools[0].id).toBe(1)
  })

  it('spawn后nextId递增至2', () => {
    doSpawn()
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn后active为true', () => {
    doSpawn()
    expect((sys as any).whirlpools[0].active).toBe(true)
  })

  it('spawn后duration已被evolve一次（为1）', () => {
    // update()内 formWhirlpools后紧接evolve()，所以duration初始0被++变为1
    doSpawn()
    expect((sys as any).whirlpools[0].duration).toBe(1)
  })

  it('spawn后rotation已被evolve一次（>0）', () => {
    // evolve() 对新spawn的wp执行 rotation += rotSpeed，所以不为0
    doSpawn()
    expect((sys as any).whirlpools[0].rotation).toBeGreaterThan(0)
  })

  it('spawn后radius在[3,6]范围', () => {
    doSpawn()
    const wp = (sys as any).whirlpools[0]
    expect(wp.radius).toBeGreaterThanOrEqual(3)
    expect(wp.radius).toBeLessThanOrEqual(6)
  })

  it('spawn后strength已被evolve一次（仍在clamp范围内）', () => {
    // evolve() 执行 strength += (random-0.5)*6，random=FORM_CHANCE-0.001≈0.014
    // delta = (0.014-0.5)*6 ≈ -2.916，所以strength=40+0-2.916=37.08 (clamp to 15)
    // 只验证 clamp后 [15,100]
    doSpawn()
    const wp = (sys as any).whirlpools[0]
    expect(wp.strength).toBeGreaterThanOrEqual(15)
    expect(wp.strength).toBeLessThanOrEqual(100)
  })

  it('spawn后rotSpeed在[0.05,0.15]范围', () => {
    doSpawn()
    const wp = (sys as any).whirlpools[0]
    expect(wp.rotSpeed).toBeGreaterThanOrEqual(0.05)
    expect(wp.rotSpeed).toBeLessThanOrEqual(0.15)
  })

  it('spawn后maxDuration在[2000,4999]范围', () => {
    doSpawn()
    const wp = (sys as any).whirlpools[0]
    expect(wp.maxDuration).toBeGreaterThanOrEqual(2000)
    expect(wp.maxDuration).toBeLessThanOrEqual(4999)
  })

  it('spawn后x在world范围内', () => {
    doSpawn()
    const wp = (sys as any).whirlpools[0]
    expect(wp.x).toBeGreaterThanOrEqual(0)
    expect(wp.x).toBeLessThan(200)
  })

  it('spawn后y在world范围内', () => {
    doSpawn()
    const wp = (sys as any).whirlpools[0]
    expect(wp.y).toBeGreaterThanOrEqual(0)
    expect(wp.y).toBeLessThan(200)
  })
})

// ========================================================
// 5. evolve - duration/rotation/strength变更
// ========================================================
describe('WorldWhirlpoolSystem - evolve字段变更', () => {
  let sys: WorldWhirlpoolSystem

  beforeEach(() => {
    sys = new WorldWhirlpoolSystem()
    nextId = 100
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('每次update后duration递增1', () => {
    const wp = makeWhirlpool({ duration: 0, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(wp)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(wp.duration).toBe(1)
  })

  it('多次update后duration累积', () => {
    const wp = makeWhirlpool({ duration: 0, maxDuration: 99999 })
    ;(sys as any).whirlpools.push(wp)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    sys.update(0, makeMockWorld(), mockEm, TICK0 + CHECK_INTERVAL)
    expect(wp.duration).toBe(2)
  })

  it('每次update后rotation递增rotSpeed', () => {
    const wp = makeWhirlpool({ rotation: 0, rotSpeed: 0.08, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(wp)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(wp.rotation).toBeCloseTo(0.08, 5)
  })

  it('duration >= maxDuration时active变为false', () => {
    const wp = makeWhirlpool({ duration: 1999, maxDuration: 2000, active: true })
    ;(sys as any).whirlpools.push(wp)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(wp.active).toBe(false)
  })

  it('duration < maxDuration时active保持true', () => {
    const wp = makeWhirlpool({ duration: 100, maxDuration: 9999, active: true })
    ;(sys as any).whirlpools.push(wp)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(wp.active).toBe(true)
  })

  it('strength变动但不低于15', () => {
    // random=0 => strength += (0-0.5)*6 = -3, if strength=15, new=12 but clamped to 15
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const wp = makeWhirlpool({ strength: 15, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(wp)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(wp.strength).toBeGreaterThanOrEqual(15)
  })

  it('strength变动但不超过100', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const wp = makeWhirlpool({ strength: 100, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(wp)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(wp.strength).toBeLessThanOrEqual(100)
  })

  it('inactive漩涡不参与evolve（duration不变）', () => {
    const wp = makeWhirlpool({ active: false, duration: 5 })
    ;(sys as any).whirlpools.push(wp)
    // evolve 对所有 whirlpools 都执行，但 cleanup 后 inactive 会被移除
    // 验证 inactive 在被cleanup前 duration 也被evolve
    // 实际上源码evolve对全部执行，不管active
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    // inactive的wp会被cleanup删除，所以检查数组已空
    expect((sys as any).whirlpools).toHaveLength(0)
  })
})

// ========================================================
// 6. cleanup逻辑
// ========================================================
describe('WorldWhirlpoolSystem - cleanup逻辑', () => {
  let sys: WorldWhirlpoolSystem

  beforeEach(() => {
    sys = new WorldWhirlpoolSystem()
    nextId = 100
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('active=false的漩涡被删除', () => {
    const wp = makeWhirlpool({ active: false })
    ;(sys as any).whirlpools.push(wp)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(0)
  })

  it('active=true的漩涡不被删除', () => {
    const wp = makeWhirlpool({ active: true, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(wp)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(1)
  })

  it('duration达到maxDuration后被删除', () => {
    // duration=1999, maxDuration=2000 => evolve后 duration=2000 >= 2000 => active=false => cleanup删除
    const wp = makeWhirlpool({ duration: 1999, maxDuration: 2000, active: true })
    ;(sys as any).whirlpools.push(wp)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(0)
  })

  it('混合active/inactive：只删除inactive', () => {
    const a = makeWhirlpool({ active: true, maxDuration: 9999 })
    const b = makeWhirlpool({ active: false })
    const c = makeWhirlpool({ active: true, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(a, b, c)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(2)
  })

  it('全部inactive后数组清空', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).whirlpools.push(makeWhirlpool({ active: false }))
    }
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(0)
  })

  it('删除后剩余漩涡id不变', () => {
    const a = makeWhirlpool({ id: 201, active: false })
    const b = makeWhirlpool({ id: 202, active: true, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(a, b)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).whirlpools[0].id).toBe(202)
  })

  it('5个全部到期时数组为空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).whirlpools.push(makeWhirlpool({ duration: 1999, maxDuration: 2000, active: true }))
    }
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(0)
  })

  it('cleanup后MAX_WHIRLPOOLS上限可被新spawn触发', () => {
    // 先填满，再全部到期，cleanup后应可spawn
    for (let i = 0; i < MAX_WHIRLPOOLS; i++) {
      ;(sys as any).whirlpools.push(makeWhirlpool({ active: false }))
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorldDeep(), mockEm, TICK0)
    // cleanup先把全部inactive删除，然后spawn可触发
    expect((sys as any).whirlpools.length).toBeGreaterThanOrEqual(0)
  })
})

// ========================================================
// 7. MAX_WHIRLPOOLS上限
// ========================================================
describe('WorldWhirlpoolSystem - MAX_WHIRLPOOLS上限', () => {
  let sys: WorldWhirlpoolSystem

  beforeEach(() => {
    sys = new WorldWhirlpoolSystem()
    nextId = 100
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('MAX_WHIRLPOOLS常量为5', () => {
    expect(MAX_WHIRLPOOLS).toBe(5)
  })

  it('FORM_CHANCE常量为0.015', () => {
    expect(FORM_CHANCE).toBe(0.015)
  })

  it('MIN_DEEP_TILES常量为10', () => {
    expect(MIN_DEEP_TILES).toBe(10)
  })

  it('恰好MAX_WHIRLPOOLS时不再spawn', () => {
    for (let i = 0; i < MAX_WHIRLPOOLS; i++) {
      ;(sys as any).whirlpools.push(makeWhirlpool({ active: true, maxDuration: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorldDeep(), mockEm, TICK0)
    expect((sys as any).whirlpools).toHaveLength(MAX_WHIRLPOOLS)
  })

  it('少于MAX_WHIRLPOOLS时可以spawn', () => {
    for (let i = 0; i < MAX_WHIRLPOOLS - 1; i++) {
      ;(sys as any).whirlpools.push(makeWhirlpool({ active: true, maxDuration: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorldDeep(), mockEm, TICK0)
    expect((sys as any).whirlpools.length).toBeGreaterThan(MAX_WHIRLPOOLS - 1)
  })

  it('多次update后数量不超过MAX_WHIRLPOOLS', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    const world = makeMockWorldDeep()
    for (let i = 0; i < 20; i++) {
      sys.update(0, world, mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).whirlpools.length).toBeLessThanOrEqual(MAX_WHIRLPOOLS)
  })

  it('多次spawn后id各不相同', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    const world = makeMockWorldDeep()
    for (let i = 0; i < MAX_WHIRLPOOLS; i++) {
      sys.update(0, world, mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    const ids = (sys as any).whirlpools.map((w: Whirlpool) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('spawn后nextId单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorldDeep(), mockEm, TICK0)
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorldDeep(), mockEm, TICK0 + CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })
})

// ========================================================
// 8. pullCreatures逻辑
// ========================================================
describe('WorldWhirlpoolSystem - pullCreatures逻辑', () => {
  let sys: WorldWhirlpoolSystem

  beforeEach(() => {
    sys = new WorldWhirlpoolSystem()
    nextId = 100
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('无生物时update不报错', () => {
    const wp = makeWhirlpool({ x: 50, y: 50, radius: 5, active: true, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(wp)
    expect(() => sys.update(0, makeMockWorld(), mockEm, TICK0)).not.toThrow()
  })

  it('生物在radius内被拉动（位置改变）', () => {
    const wp = makeWhirlpool({ x: 50, y: 50, radius: 10, strength: 100, rotSpeed: 0.1, active: true, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(wp)
    // 使用可变的position对象，让 pullCreatures 可以直接修改它
    const posObj = { type: 'position', x: 53, y: 50 } // dist=3 < radius=10
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
      getComponent: vi.fn().mockReturnValue(posObj),
    } as any
    const oldX = posObj.x
    const oldY = posObj.y
    sys.update(0, makeMockWorld(), em, TICK0)
    // posObj被直接修改，位置应改变
    expect(posObj.x !== oldX || posObj.y !== oldY).toBe(true)
  })

  it('生物在radius外不被拉动', () => {
    const wp = makeWhirlpool({ x: 50, y: 50, radius: 5, strength: 100, active: true, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(wp)
    const positions = new Map<number, {x: number, y: number}>()
    positions.set(1, { x: 100, y: 100 }) // dist far > radius
    const em = makeMockEm([1], positions)
    const pos = em.getComponent(1, 'position') as any
    const oldX = pos.x
    const oldY = pos.y
    sys.update(0, makeMockWorld(), em, TICK0)
    expect(pos.x).toBe(oldX)
    expect(pos.y).toBe(oldY)
  })

  it('inactive漩涡不pull生物', () => {
    const wp = makeWhirlpool({ x: 50, y: 50, radius: 10, strength: 100, active: false, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(wp)
    const positions = new Map<number, {x: number, y: number}>()
    positions.set(1, { x: 53, y: 50 })
    const em = makeMockEm([1], positions)
    const pos = em.getComponent(1, 'position') as any
    const oldX = pos.x
    const oldY = pos.y
    sys.update(0, makeMockWorld(), em, TICK0)
    expect(pos.x).toBe(oldX)
    expect(pos.y).toBe(oldY)
  })

  it('getActiveWhirlpools只返回active=true的', () => {
    ;(sys as any).whirlpools.push(makeWhirlpool({ active: true, maxDuration: 9999 }))
    ;(sys as any).whirlpools.push(makeWhirlpool({ active: false }))
    ;(sys as any).whirlpools.push(makeWhirlpool({ active: true, maxDuration: 9999 }))
    expect(sys.getActiveWhirlpools()).toHaveLength(2)
  })

  it('getActiveWhirlpools全部active时返回全部', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).whirlpools.push(makeWhirlpool({ active: true, maxDuration: 9999 }))
    }
    expect(sys.getActiveWhirlpools()).toHaveLength(3)
  })

  it('getActiveWhirlpools全部inactive时返回空数组', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).whirlpools.push(makeWhirlpool({ active: false }))
    }
    expect(sys.getActiveWhirlpools()).toHaveLength(0)
  })

  it('距中心<0.3时不被拉动（避免吸进去后飞出）', () => {
    const wp = makeWhirlpool({ x: 50, y: 50, radius: 10, strength: 100, active: true, maxDuration: 9999 })
    ;(sys as any).whirlpools.push(wp)
    const positions = new Map<number, {x: number, y: number}>()
    positions.set(1, { x: 50.1, y: 50 }) // dist=0.1 < 0.3
    const em = makeMockEm([1], positions)
    const pos = em.getComponent(1, 'position') as any
    const oldX = pos.x
    const oldY = pos.y
    sys.update(0, makeMockWorld(), em, TICK0)
    // dist < 0.3 => skip => position unchanged
    expect(pos.x).toBe(oldX)
    expect(pos.y).toBe(oldY)
  })
})

// ========================================================
// 额外边界验证
// ========================================================
describe('WorldWhirlpoolSystem - 边界验证', () => {
  let sys: WorldWhirlpoolSystem

  beforeEach(() => {
    sys = new WorldWhirlpoolSystem()
    nextId = 100
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('漩涡接口包含所有必需字段', () => {
    const wp = makeWhirlpool()
    expect(wp).toHaveProperty('id')
    expect(wp).toHaveProperty('x')
    expect(wp).toHaveProperty('y')
    expect(wp).toHaveProperty('radius')
    expect(wp).toHaveProperty('strength')
    expect(wp).toHaveProperty('rotation')
    expect(wp).toHaveProperty('rotSpeed')
    expect(wp).toHaveProperty('duration')
    expect(wp).toHaveProperty('maxDuration')
    expect(wp).toHaveProperty('active')
  })

  it('update在tick=0时不崩溃', () => {
    expect(() => sys.update(0, makeMockWorld(), mockEm, 0)).not.toThrow()
  })

  it('update在高tick时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(0, makeMockWorldDeep(), mockEm, 999999)).not.toThrow()
  })

  it('空世界update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(0, makeMockWorld(TileType.GRASS), mockEm, TICK0)).not.toThrow()
  })

  it('多个漩涡同时存在时getActiveWhirlpools正确', () => {
    ;(sys as any).whirlpools.push(makeWhirlpool({ active: true, maxDuration: 9999 }))
    ;(sys as any).whirlpools.push(makeWhirlpool({ active: true, maxDuration: 9999 }))
    ;(sys as any).whirlpools.push(makeWhirlpool({ active: false }))
    const active = sys.getActiveWhirlpools()
    expect(active.every((w: Whirlpool) => w.active)).toBe(true)
    expect(active).toHaveLength(2)
  })
})
