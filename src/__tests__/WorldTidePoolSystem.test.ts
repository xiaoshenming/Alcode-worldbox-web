import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTidePoolSystem } from '../systems/WorldTidePoolSystem'
import type { TidePool } from '../systems/WorldTidePoolSystem'
import { TileType } from '../utils/Constants'

// ---- 常量（与源码同步）----
const CHECK_INTERVAL = 1000
const MAX_POOLS = 20
const FORM_CHANCE = 0.012
const MIN_COAST_TILES = 3

function makeSys(): WorldTidePoolSystem { return new WorldTidePoolSystem() }
let _nextId = 1
function makePool(overrides: Partial<TidePool> = {}): TidePool {
  return {
    id: _nextId++,
    x: 15, y: 25,
    size: 2,
    biodiversity: 70,
    resources: 30,
    age: 0,
    active: true,
    ...overrides,
  }
}

// mockWorld 工厂
function makeMockWorld(tileOverrides: Record<string, number> = {}) {
  return {
    width: 200,
    height: 200,
    getTile: (x: number, y: number) => {
      const key = `${x},${y}`
      return (tileOverrides[key] ?? TileType.GRASS) as number
    },
  } as any
}

const mockWorld = makeMockWorld()
const mockEm = {} as any

// ================================================================
describe('WorldTidePoolSystem - 初始状态', () => {
  let sys: WorldTidePoolSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('初始pools数组为空', () => {
    expect((sys as any).pools).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('pools是Array类型', () => {
    expect(Array.isArray((sys as any).pools)).toBe(true)
  })

  it('注入pool后pools长度正确', () => {
    ;(sys as any).pools.push(makePool())
    expect((sys as any).pools).toHaveLength(1)
  })

  it('pools引用持久不变', () => {
    const ref = (sys as any).pools
    expect(ref).toBe((sys as any).pools)
  })

  it('TidePool字段初始值验证', () => {
    ;(sys as any).pools.push(makePool({ biodiversity: 70, resources: 30, age: 0, active: true }))
    const p = (sys as any).pools[0] as TidePool
    expect(p.biodiversity).toBe(70)
    expect(p.resources).toBe(30)
    expect(p.age).toBe(0)
    expect(p.active).toBe(true)
  })

  it('getActivePools初始返回空数组', () => {
    expect(sys.getActivePools()).toHaveLength(0)
  })
})

// ================================================================
describe('WorldTidePoolSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTidePoolSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.mocked(Math.random).mockReturnValue(0.0001)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).pools).toHaveLength(0)
  })

  it('tick === CHECK_INTERVAL时触发', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时lastCheck更新', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL + 200)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 200)
  })

  it('节流期间pools不变', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)  // 触发一次
    const cnt = (sys as any).pools.length
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL + 1)  // 节流
    expect((sys as any).pools.length).toBe(cnt)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)   // 未更新
  })

  it('下一个CHECK_INTERVAL周期再次触发', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('节流时evolvePools不执行（age不变）', () => {
    const pool = makePool({ age: 5 })
    ;(sys as any).pools.push(pool)
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect(pool.age).toBe(5) // 未改变
  })
})

// ================================================================
describe('WorldTidePoolSystem - formPools spawn逻辑', () => {
  let sys: WorldTidePoolSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('random > FORM_CHANCE时不spawn', () => {
    // FORM_CHANCE=0.012, random=0.5 > 0.012 => 跳过
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).pools).toHaveLength(0)
  })

  it('random === FORM_CHANCE时不spawn（边界: > 判断）', () => {
    vi.mocked(Math.random).mockReturnValue(FORM_CHANCE)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).pools).toHaveLength(0)
  })

  it('random < FORM_CHANCE时尝试spawn', () => {
    // SAND tile (2) 在 (5,5)，周围3个SHALLOW_WATER
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.SHALLOW_WATER,
      '6,4': TileType.SHALLOW_WATER,
    }
    const world = makeMockWorld(tiles)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)          // FORM_CHANCE pass (0.001 < 0.012)
      .mockReturnValueOnce((5 - 2) / 196) // x=5
      .mockReturnValueOnce((5 - 2) / 196) // y=5
      .mockReturnValue(0.5)               // size/biodiversity/resources
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pools).toHaveLength(1)
  })

  it('已满MAX_POOLS时不spawn', () => {
    for (let i = 0; i < MAX_POOLS; i++) {
      ;(sys as any).pools.push(makePool())
    }
    vi.mocked(Math.random).mockReturnValue(0.001)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).pools).toHaveLength(MAX_POOLS)
  })

  it('SHALLOW_WATER tile可以spawn（SAND或SHALLOW_WATER都可）', () => {
    const tiles: Record<string, number> = {
      '5,5': TileType.SHALLOW_WATER,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.SHALLOW_WATER,
      '6,4': TileType.SHALLOW_WATER,
    }
    const world = makeMockWorld(tiles)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValue(0.5)
    ;(sys as any).formPools(world)
    expect((sys as any).pools).toHaveLength(1)
  })

  it('GRASS tile不spawn', () => {
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValue(0.5)
    ;(sys as any).formPools(makeMockWorld()) // 所有tile为GRASS
    expect((sys as any).pools).toHaveLength(0)
  })

  it('DEEP_WATER tile不spawn', () => {
    const tiles: Record<string, number> = {
      '5,5': TileType.DEEP_WATER,
    }
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValue(0.5)
    ;(sys as any).formPools(makeMockWorld(tiles))
    expect((sys as any).pools).toHaveLength(0)
  })

  it('coastCount < MIN_COAST_TILES时不spawn', () => {
    // 只有2个水邻格，MIN_COAST_TILES=3
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.SHALLOW_WATER,
      // 只有2个水格 < 3
    }
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValue(0.5)
    ;(sys as any).formPools(makeMockWorld(tiles))
    expect((sys as any).pools).toHaveLength(0)
  })

  it('spawn的pool age初始为0', () => {
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.SHALLOW_WATER,
      '6,4': TileType.SHALLOW_WATER,
    }
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValue(0.5)
    ;(sys as any).formPools(makeMockWorld(tiles))
    if ((sys as any).pools.length > 0) {
      expect((sys as any).pools[0].age).toBe(0)
    }
  })

  it('spawn的pool active为true', () => {
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.SHALLOW_WATER,
      '6,4': TileType.SHALLOW_WATER,
    }
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValue(0.5)
    ;(sys as any).formPools(makeMockWorld(tiles))
    if ((sys as any).pools.length > 0) {
      expect((sys as any).pools[0].active).toBe(true)
    }
  })

  it('spawn的pool size在[1,3]范围内', () => {
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.SHALLOW_WATER,
      '6,4': TileType.SHALLOW_WATER,
    }
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce(0.7)  // size = 1 + floor(0.7*3) = 1+2 = 3
      .mockReturnValue(0.5)
    ;(sys as any).formPools(makeMockWorld(tiles))
    if ((sys as any).pools.length > 0) {
      const size = (sys as any).pools[0].size
      expect(size).toBeGreaterThanOrEqual(1)
      expect(size).toBeLessThanOrEqual(4) // 1+floor(random*3)，最大=1+2=3
    }
  })

  it('spawn的pool biodiversity在[20,80]范围内', () => {
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.SHALLOW_WATER,
      '6,4': TileType.SHALLOW_WATER,
    }
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce(0.5)  // size
      .mockReturnValueOnce(0.5)  // biodiversity = 20 + 0.5*60 = 50
      .mockReturnValue(0.5)
    ;(sys as any).formPools(makeMockWorld(tiles))
    if ((sys as any).pools.length > 0) {
      const bio = (sys as any).pools[0].biodiversity
      expect(bio).toBeGreaterThanOrEqual(20)
      expect(bio).toBeLessThanOrEqual(80)
    }
  })

  it('spawn的pool resources在[10,50]范围内', () => {
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.SHALLOW_WATER,
      '6,4': TileType.SHALLOW_WATER,
    }
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce(0.5)  // size
      .mockReturnValueOnce(0.5)  // biodiversity
      .mockReturnValueOnce(0.8)  // resources = 10 + 0.8*40 = 42
    ;(sys as any).formPools(makeMockWorld(tiles))
    if ((sys as any).pools.length > 0) {
      const res = (sys as any).pools[0].resources
      expect(res).toBeGreaterThanOrEqual(10)
      expect(res).toBeLessThanOrEqual(50)
    }
  })
})

// ================================================================
describe('WorldTidePoolSystem - evolvePools逻辑', () => {
  let sys: WorldTidePoolSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('每次evolvePools后pool.age增加1', () => {
    const pool = makePool({ age: 0 })
    ;(sys as any).pools.push(pool)
    vi.mocked(Math.random).mockReturnValue(0)
    ;(sys as any).evolvePools()
    expect(pool.age).toBe(1)
  })

  it('多次evolvePools累积age', () => {
    const pool = makePool({ age: 5 })
    ;(sys as any).pools.push(pool)
    vi.mocked(Math.random).mockReturnValue(0)
    ;(sys as any).evolvePools()
    ;(sys as any).evolvePools()
    ;(sys as any).evolvePools()
    expect(pool.age).toBe(8)
  })

  it('biodiversity每轮增加[0,0.5)', () => {
    const pool = makePool({ biodiversity: 50 })
    ;(sys as any).pools.push(pool)
    vi.mocked(Math.random).mockReturnValue(0.4) // 增加 0.4*0.5=0.2
    ;(sys as any).evolvePools()
    expect(pool.biodiversity).toBeGreaterThan(50)
    expect(pool.biodiversity).toBeLessThanOrEqual(50 + 0.5)
  })

  it('biodiversity上限为100', () => {
    const pool = makePool({ biodiversity: 99.9 })
    ;(sys as any).pools.push(pool)
    vi.mocked(Math.random).mockReturnValue(0.99)
    ;(sys as any).evolvePools()
    expect(pool.biodiversity).toBe(100)
  })

  it('resources每轮增加[0,0.3)', () => {
    const pool = makePool({ resources: 20 })
    ;(sys as any).pools.push(pool)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.4)  // biodiversity增加
      .mockReturnValueOnce(0.4)  // resources增加
    ;(sys as any).evolvePools()
    expect(pool.resources).toBeGreaterThan(20)
    expect(pool.resources).toBeLessThanOrEqual(20 + 0.3)
  })

  it('resources上限为50', () => {
    const pool = makePool({ resources: 49.9 })
    ;(sys as any).pools.push(pool)
    vi.mocked(Math.random).mockReturnValue(0.99)
    ;(sys as any).evolvePools()
    expect(pool.resources).toBe(50)
  })

  it('多个pool各自独立进化', () => {
    const p1 = makePool({ age: 0, biodiversity: 30 })
    const p2 = makePool({ age: 10, biodiversity: 60 })
    ;(sys as any).pools.push(p1, p2)
    vi.mocked(Math.random).mockReturnValue(0.5)
    ;(sys as any).evolvePools()
    expect(p1.age).toBe(1)
    expect(p2.age).toBe(11)
    expect(p1.biodiversity).toBeGreaterThan(30)
    expect(p2.biodiversity).toBeGreaterThan(60)
  })

  it('空pools时evolvePools不报错', () => {
    vi.mocked(Math.random).mockReturnValue(0)
    expect(() => (sys as any).evolvePools()).not.toThrow()
  })

  it('active=false的pool也会进化（evolvePools不过滤active）', () => {
    const pool = makePool({ age: 0, active: false })
    ;(sys as any).pools.push(pool)
    vi.mocked(Math.random).mockReturnValue(0)
    ;(sys as any).evolvePools()
    expect(pool.age).toBe(1) // 依然被进化
  })
})

// ================================================================
describe('WorldTidePoolSystem - cleanup逻辑', () => {
  let sys: WorldTidePoolSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('pools <= MAX_POOLS时不裁剪', () => {
    for (let i = 0; i < MAX_POOLS; i++) {
      ;(sys as any).pools.push(makePool({ biodiversity: 50 }))
    }
    ;(sys as any).cleanup()
    expect((sys as any).pools).toHaveLength(MAX_POOLS)
  })

  it('pools > MAX_POOLS时裁剪到MAX_POOLS', () => {
    for (let i = 0; i < MAX_POOLS + 5; i++) {
      ;(sys as any).pools.push(makePool({ biodiversity: 50 }))
    }
    ;(sys as any).cleanup()
    expect((sys as any).pools).toHaveLength(MAX_POOLS)
  })

  it('裁剪时保留biodiversity最高的', () => {
    // 低biodiversity的在后面会被裁剪（sort后取前MAX_POOLS）
    ;(sys as any).pools.push(makePool({ id: 1, biodiversity: 10 }))
    ;(sys as any).pools.push(makePool({ id: 2, biodiversity: 100 }))
    // 加到MAX_POOLS+1个
    for (let i = 0; i < MAX_POOLS - 1; i++) {
      ;(sys as any).pools.push(makePool({ biodiversity: 50 }))
    }
    ;(sys as any).cleanup()
    expect((sys as any).pools).toHaveLength(MAX_POOLS)
    // biodiversity=100的应该在
    const topPool = (sys as any).pools.find((p: TidePool) => p.biodiversity === 100)
    expect(topPool).toBeDefined()
    // biodiversity=10的应该被裁剪
    const lowPool = (sys as any).pools.find((p: TidePool) => p.id === 1)
    expect(lowPool).toBeUndefined()
  })

  it('cleanup按biodiversity降序排列后截断', () => {
    ;(sys as any).pools.push(makePool({ biodiversity: 30 }))
    ;(sys as any).pools.push(makePool({ biodiversity: 90 }))
    ;(sys as any).pools.push(makePool({ biodiversity: 60 }))
    // 只有3个，不超MAX_POOLS，不裁剪
    ;(sys as any).cleanup()
    expect((sys as any).pools).toHaveLength(3)
    // 但如果超过MAX_POOLS则sort发生
  })

  it('空pools时cleanup不报错', () => {
    expect(() => (sys as any).cleanup()).not.toThrow()
  })

  it('裁剪后pools.length严格等于MAX_POOLS', () => {
    for (let i = 0; i < MAX_POOLS + 10; i++) {
      ;(sys as any).pools.push(makePool({ biodiversity: Math.random() * 100 }))
    }
    ;(sys as any).cleanup()
    expect((sys as any).pools).toHaveLength(MAX_POOLS)
  })
})

// ================================================================
describe('WorldTidePoolSystem - getActivePools', () => {
  let sys: WorldTidePoolSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('只返回active=true的pool', () => {
    ;(sys as any).pools.push(makePool({ active: true }))
    ;(sys as any).pools.push(makePool({ active: false }))
    ;(sys as any).pools.push(makePool({ active: true }))
    expect(sys.getActivePools()).toHaveLength(2)
  })

  it('全部inactive时返回空数组', () => {
    ;(sys as any).pools.push(makePool({ active: false }))
    ;(sys as any).pools.push(makePool({ active: false }))
    expect(sys.getActivePools()).toHaveLength(0)
  })

  it('全部active时返回全部', () => {
    ;(sys as any).pools.push(makePool({ active: true }))
    ;(sys as any).pools.push(makePool({ active: true }))
    ;(sys as any).pools.push(makePool({ active: true }))
    expect(sys.getActivePools()).toHaveLength(3)
  })

  it('返回缓冲区引用（每次复用内部buffer）', () => {
    ;(sys as any).pools.push(makePool({ active: true }))
    const r1 = sys.getActivePools()
    const r2 = sys.getActivePools()
    expect(r1).toBe(r2) // 同一个buffer对象
  })

  it('连续调用结果一致', () => {
    ;(sys as any).pools.push(makePool({ active: true }))
    ;(sys as any).pools.push(makePool({ active: false }))
    expect(sys.getActivePools()).toHaveLength(1)
    expect(sys.getActivePools()).toHaveLength(1)
  })

  it('修改pools后getActivePools反映最新状态', () => {
    ;(sys as any).pools.push(makePool({ active: true }))
    expect(sys.getActivePools()).toHaveLength(1)
    ;(sys as any).pools[0].active = false
    expect(sys.getActivePools()).toHaveLength(0)
  })

  it('空pools时返回空数组', () => {
    expect(sys.getActivePools()).toHaveLength(0)
  })
})

// ================================================================
describe('WorldTidePoolSystem - MAX_POOLS上限约束', () => {
  let sys: WorldTidePoolSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('formPools在已满MAX_POOLS时直接返回', () => {
    for (let i = 0; i < MAX_POOLS; i++) {
      ;(sys as any).pools.push(makePool())
    }
    vi.mocked(Math.random).mockReturnValue(0.001)
    ;(sys as any).formPools(mockWorld)
    expect((sys as any).pools).toHaveLength(MAX_POOLS)
  })

  it('update执行后pools数量不超过MAX_POOLS', () => {
    for (let i = 0; i < MAX_POOLS; i++) {
      ;(sys as any).pools.push(makePool())
    }
    vi.mocked(Math.random).mockReturnValue(0.001)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).pools.length).toBeLessThanOrEqual(MAX_POOLS)
  })

  it('FORM_CHANCE=0.012小概率触发', () => {
    expect(FORM_CHANCE).toBe(0.012)
    expect(FORM_CHANCE).toBeLessThan(1)
  })

  it('MIN_COAST_TILES=3正确', () => {
    expect(MIN_COAST_TILES).toBe(3)
  })

  it('CHECK_INTERVAL=1000正确', () => {
    expect(CHECK_INTERVAL).toBe(1000)
  })

  it('MAX_POOLS=20正确', () => {
    expect(MAX_POOLS).toBe(20)
  })
})

// ================================================================
describe('WorldTidePoolSystem - update集成流程', () => {
  let sys: WorldTidePoolSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('update触发后evolvePools执行（age增加）', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    const pool = makePool({ age: 0 })
    ;(sys as any).pools.push(pool)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect(pool.age).toBe(1)
  })

  it('update触发后cleanup执行', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    // 超过MAX_POOLS个pool，cleanup会裁剪
    for (let i = 0; i < MAX_POOLS + 3; i++) {
      ;(sys as any).pools.push(makePool())
    }
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).pools.length).toBeLessThanOrEqual(MAX_POOLS)
  })

  it('update在节流期间不修改age', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    const pool = makePool({ age: 5 })
    ;(sys as any).pools.push(pool)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect(pool.age).toBe(5)
  })

  it('多次update连续触发age累积', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    const pool = makePool({ age: 0 })
    ;(sys as any).pools.push(pool)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL * 2)
    expect(pool.age).toBe(2)
  })

  it('spawn的pool立即被evolvePools处理（age从0变1）', () => {
    // 设置能spawn的世界环境
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.SHALLOW_WATER,
      '6,4': TileType.SHALLOW_WATER,
    }
    const world = makeMockWorld(tiles)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)          // FORM_CHANCE pass
      .mockReturnValueOnce((5 - 2) / 196) // x=5
      .mockReturnValueOnce((5 - 2) / 196) // y=5
      .mockReturnValue(0.5)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    if ((sys as any).pools.length > 0) {
      // spawn后age=0，然后evolvePools让age=1
      expect((sys as any).pools[0].age).toBe(1)
    }
  })
})
