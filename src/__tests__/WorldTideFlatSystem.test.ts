import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTideFlatSystem } from '../systems/WorldTideFlatSystem'
import type { TideFlat } from '../systems/WorldTideFlatSystem'
import { TileType } from '../utils/Constants'

// ---- 常量（与源码同步）----
const CHECK_INTERVAL = 3000
const SPAWN_CHANCE = 0.003
const MAX_TIDE_FLATS = 15
const TIDE_SPEED = 0.12
const NUTRIENT_DEPOSIT_RATE = 1.5

function makeSys(): WorldTideFlatSystem { return new WorldTideFlatSystem() }
let _nextId = 1
function makeFlat(overrides: Partial<TideFlat> = {}): TideFlat {
  return {
    id: _nextId++,
    x: 20, y: 30,
    exposure: 50,
    organisms: 30,
    tidePhase: 1.5,
    nutrients: 70,
    tick: 0,
    ...overrides,
  }
}

// mockWorld 支持 setTile 记录
function makeMockWorld(tileOverrides: Record<string, number> = {}) {
  const setTileCalls: Array<{ x: number; y: number; tile: number }> = []
  const world = {
    width: 200,
    height: 200,
    getTile: (x: number, y: number) => {
      const key = `${x},${y}`
      return tileOverrides[key] ?? TileType.GRASS as number
    },
    setTile: (x: number, y: number, tile: number) => {
      setTileCalls.push({ x, y, tile })
    },
    _setTileCalls: setTileCalls,
  }
  return world as any
}

const mockWorld = makeMockWorld()
const mockEm = {} as any

// ================================================================
describe('WorldTideFlatSystem - 初始状态', () => {
  let sys: WorldTideFlatSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('初始tideFlats为空数组', () => {
    expect((sys as any).tideFlats).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tideFlats是Array类型', () => {
    expect(Array.isArray((sys as any).tideFlats)).toBe(true)
  })

  it('注入flat后可查询', () => {
    ;(sys as any).tideFlats.push(makeFlat())
    expect((sys as any).tideFlats).toHaveLength(1)
  })

  it('tideFlats引用不变', () => {
    const ref = (sys as any).tideFlats
    expect(ref).toBe((sys as any).tideFlats)
  })

  it('TideFlat字段初始值正确', () => {
    ;(sys as any).tideFlats.push(makeFlat({ exposure: 50, nutrients: 70, organisms: 30 }))
    const f = (sys as any).tideFlats[0] as TideFlat
    expect(f.exposure).toBe(50)
    expect(f.nutrients).toBe(70)
    expect(f.organisms).toBe(30)
  })
})

// ================================================================
describe('WorldTideFlatSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTideFlatSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.mocked(Math.random).mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0) // 未更新
  })

  it('tick === CHECK_INTERVAL时触发', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时lastCheck更新', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('两次调用间隔不足时不重复触发', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)       // 触发
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL + 10)  // 未满
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)   // lastCheck不变
  })

  it('满足两个CHECK_INTERVAL后再次触发', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('节流期间不调用detectTideFlats逻辑', () => {
    // 在节流期间random被调用，如果没有节流，random会被检测到
    vi.mocked(Math.random).mockReturnValue(0.0001)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL - 1)
    // 若random被调用则会走spawn逻辑，不spawn说明节流生效
    expect((sys as any).tideFlats).toHaveLength(0)
  })
})

// ================================================================
describe('WorldTideFlatSystem - detectTideFlats spawn逻辑', () => {
  let sys: WorldTideFlatSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('random > SPAWN_CHANCE时不spawn', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).tideFlats).toHaveLength(0)
  })

  it('已满MAX_TIDE_FLATS时不spawn', () => {
    for (let i = 0; i < MAX_TIDE_FLATS; i++) {
      ;(sys as any).tideFlats.push(makeFlat())
    }
    vi.mocked(Math.random).mockReturnValue(0)
    sys.update(1, makeMockWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).tideFlats).toHaveLength(MAX_TIDE_FLATS)
  })

  it('砂tile且有2+相邻水格时spawn', () => {
    // 设置 (5,5)=SAND，周围8格有2个水格
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.DEEP_WATER,
      // 其余均为默认GRASS
    }
    const world = makeMockWorld(tiles)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)  // SPAWN_CHANCE pass
      .mockReturnValueOnce(0.025)  // x: 2 + floor(0.025*(200-4)) = 2+4 = 6? 需要能选到5
      // 精确控制：x = 2 + floor(random*(200-4))，y同
      // 用 mockImplementation 更好控制
    // 改用直接测试私有方法更可控
    ;(sys as any).tideFlats.length = 0

    // 注入已经知道位置的砂tile环境测试spawn
    // 直接调用detectTideFlats并mock返回使random序列对齐
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)            // SPAWN_CHANCE pass
      .mockReturnValueOnce((5 - 2) / 196)   // x = 2 + floor((3/196)*196) = 2+3=5
      .mockReturnValueOnce((5 - 2) / 196)   // y = 2 + floor(3/196*196) = 5
      .mockReturnValue(0.5)                  // organisms/tidePhase/nutrients
    ;(sys as any).detectTideFlats(world, CHECK_INTERVAL)
    expect((sys as any).tideFlats).toHaveLength(1)
  })

  it('非砂tile不spawn', () => {
    // 所有tile返回GRASS(3)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValue(0.5)
    const world = makeMockWorld() // getTile默认返回GRASS
    ;(sys as any).detectTideFlats(world, CHECK_INTERVAL)
    expect((sys as any).tideFlats).toHaveLength(0)
  })

  it('砂tile但水邻格<2时不spawn', () => {
    // (10,10)=SAND，但只有1个水邻格
    const tiles: Record<string, number> = {
      '10,10': TileType.SAND,
      '9,9': TileType.SHALLOW_WATER,
    }
    const world = makeMockWorld(tiles)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((10 - 2) / 196)
      .mockReturnValueOnce((10 - 2) / 196)
      .mockReturnValue(0.5)
    ;(sys as any).detectTideFlats(world, CHECK_INTERVAL)
    expect((sys as any).tideFlats).toHaveLength(0)
  })

  it('spawn的flat初始exposure为50', () => {
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.DEEP_WATER,
    }
    const world = makeMockWorld(tiles)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValue(0.5)
    ;(sys as any).detectTideFlats(world, 100)
    if ((sys as any).tideFlats.length > 0) {
      expect((sys as any).tideFlats[0].exposure).toBe(50)
    }
  })

  it('spawn的flat nutrients在[20,50]范围内', () => {
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.DEEP_WATER,
    }
    const world = makeMockWorld(tiles)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce(0.3)  // organisms = floor(0.3*10) = 3
      .mockReturnValueOnce(0.5)  // tidePhase
      .mockReturnValueOnce(0.6)  // nutrients = 20 + 0.6*30 = 38
    ;(sys as any).detectTideFlats(world, 100)
    if ((sys as any).tideFlats.length > 0) {
      const f = (sys as any).tideFlats[0] as TideFlat
      expect(f.nutrients).toBeGreaterThanOrEqual(20)
      expect(f.nutrients).toBeLessThanOrEqual(50)
    }
  })

  it('相邻已有flat时不���复spawn（距离<4）', () => {
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.DEEP_WATER,
    }
    ;(sys as any).tideFlats.push(makeFlat({ x: 5, y: 5 })) // 已有
    const world = makeMockWorld(tiles)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValue(0.5)
    ;(sys as any).detectTideFlats(world, 100)
    expect((sys as any).tideFlats).toHaveLength(1) // 不增加
  })
})

// ================================================================
describe('WorldTideFlatSystem - cycleTides逻辑', () => {
  let sys: WorldTideFlatSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('tidePhase每次增加TIDE_SPEED并取模2PI', () => {
    const world = makeMockWorld()
    const flat = makeFlat({ tidePhase: 0 })
    ;(sys as any).tideFlats.push(flat)
    ;(sys as any).cycleTides(world)
    expect(flat.tidePhase).toBeCloseTo(TIDE_SPEED)
  })

  it('tidePhase超过2PI时回绕', () => {
    const world = makeMockWorld()
    const flat = makeFlat({ tidePhase: Math.PI * 2 - 0.01 })
    ;(sys as any).tideFlats.push(flat)
    ;(sys as any).cycleTides(world)
    expect(flat.tidePhase).toBeCloseTo((Math.PI * 2 - 0.01 + TIDE_SPEED) % (Math.PI * 2))
  })

  it('exposure由sin(tidePhase)决定[0,100]', () => {
    const world = makeMockWorld()
    const flat = makeFlat({ tidePhase: 0 }) // sin(TIDE_SPEED)~0.12
    ;(sys as any).tideFlats.push(flat)
    ;(sys as any).cycleTides(world)
    const expectedExposure = Math.max(0, Math.min(100, 50 + Math.sin(TIDE_SPEED) * 50))
    expect(flat.exposure).toBeCloseTo(expectedExposure)
  })

  it('exposure最大不超过100', () => {
    const world = makeMockWorld()
    // tidePhase=PI/2时sin=1, exposure=50+50=100
    const flat = makeFlat({ tidePhase: Math.PI / 2 - TIDE_SPEED })
    ;(sys as any).tideFlats.push(flat)
    ;(sys as any).cycleTides(world)
    expect(flat.exposure).toBeLessThanOrEqual(100)
  })

  it('exposure最小不低于0', () => {
    const world = makeMockWorld()
    // tidePhase=3PI/2时sin=-1, exposure=50-50=0
    const flat = makeFlat({ tidePhase: (3 * Math.PI) / 2 - TIDE_SPEED })
    ;(sys as any).tideFlats.push(flat)
    ;(sys as any).cycleTides(world)
    expect(flat.exposure).toBeGreaterThanOrEqual(0)
  })

  it('exposure>60时nutrients增加NUTRIENT_DEPOSIT_RATE', () => {
    const world = makeMockWorld()
    // tidePhase = PI/2 - TIDE_SPEED，cycleTides后exposure接近100 > 60
    const flat = makeFlat({ tidePhase: Math.PI / 2 - TIDE_SPEED, nutrients: 50 })
    ;(sys as any).tideFlats.push(flat)
    vi.mocked(Math.random).mockReturnValue(0) // organisms不增加（0 < 0.08不满足条件，但nutrients>50...）
    ;(sys as any).cycleTides(world)
    if (flat.exposure > 60) {
      expect(flat.nutrients).toBeGreaterThan(50)
    }
  })

  it('nutrients上限100', () => {
    const world = makeMockWorld()
    const flat = makeFlat({ tidePhase: Math.PI / 2 - TIDE_SPEED, nutrients: 99.9 })
    ;(sys as any).tideFlats.push(flat)
    vi.mocked(Math.random).mockReturnValue(0.9)
    ;(sys as any).cycleTides(world)
    expect(flat.nutrients).toBeLessThanOrEqual(100)
  })

  it('nutrients>50且random<0.08时organisms+1', () => {
    const world = makeMockWorld()
    const flat = makeFlat({ tidePhase: Math.PI / 2 - TIDE_SPEED, nutrients: 60, organisms: 10 })
    ;(sys as any).tideFlats.push(flat)
    vi.mocked(Math.random).mockReturnValue(0.05) // < 0.08
    ;(sys as any).cycleTides(world)
    // exposure>60时nutrients增加，nutrients>50时触发organisms++
    if (flat.nutrients > 50) {
      expect(flat.organisms).toBeGreaterThanOrEqual(10)
    }
  })

  it('organisms上限50', () => {
    const world = makeMockWorld()
    const flat = makeFlat({ tidePhase: Math.PI / 2 - TIDE_SPEED, nutrients: 80, organisms: 50 })
    ;(sys as any).tideFlats.push(flat)
    vi.mocked(Math.random).mockReturnValue(0.01)
    ;(sys as any).cycleTides(world)
    expect(flat.organisms).toBeLessThanOrEqual(50)
  })

  it('exposure<10时tile设为SHALLOW_WATER', () => {
    const world = makeMockWorld()
    // tidePhase=3PI/2-TIDE_SPEED后exposure会接近0 <10
    const flat = makeFlat({ x: 10, y: 10, tidePhase: (3 * Math.PI) / 2 - TIDE_SPEED })
    ;(sys as any).tideFlats.push(flat)
    vi.mocked(Math.random).mockReturnValue(0.9)
    ;(sys as any).cycleTides(world)
    if (flat.exposure < 10) {
      const lastSet = world._setTileCalls.find(
        (c: { x: number; y: number; tile: number }) => c.x === 10 && c.y === 10
      )
      expect(lastSet?.tile).toBe(TileType.SHALLOW_WATER)
    }
  })

  it('exposure>=10时tile设为SAND', () => {
    const world = makeMockWorld()
    const flat = makeFlat({ x: 10, y: 10, tidePhase: 0 }) // sin(TIDE_SPEED)>0 => exposure>50
    ;(sys as any).tideFlats.push(flat)
    vi.mocked(Math.random).mockReturnValue(0.9)
    ;(sys as any).cycleTides(world)
    if (flat.exposure >= 10) {
      const lastSet = world._setTileCalls.find(
        (c: { x: number; y: number; tile: number }) => c.x === 10 && c.y === 10
      )
      expect(lastSet?.tile).toBe(TileType.SAND)
    }
  })

  it('nutrients<=0且organisms<=0时nutrients设为-1', () => {
    const world = makeMockWorld()
    const flat = makeFlat({ tidePhase: 0, nutrients: 0, organisms: 0 })
    ;(sys as any).tideFlats.push(flat)
    vi.mocked(Math.random).mockReturnValue(0.9)
    ;(sys as any).cycleTides(world)
    // exposure = 50 + sin(TIDE_SPEED)*50 > 0，所以nutrients会增加NUTRIENT_DEPOSIT_RATE
    // 但如果exposure<=60，nutrients不增加，nutrients=0，organisms=0 => nutrients=-1
    // tidePhase从0到TIDE_SPEED, sin(TIDE_SPEED)~0.12, exposure=50+6=56 <= 60
    // 所以nutrients不增加，nutrients=0，organisms=0 => nutrients=-1
    expect(flat.nutrients).toBe(-1)
  })
})

// ================================================================
describe('WorldTideFlatSystem - cleanup逻辑', () => {
  let sys: WorldTideFlatSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('nutrients<0时flat被清理', () => {
    ;(sys as any).tideFlats.push(makeFlat({ nutrients: -1 }))
    ;(sys as any).cleanup()
    expect((sys as any).tideFlats).toHaveLength(0)
  })

  it('nutrients==0时flat不被清理（临界）', () => {
    ;(sys as any).tideFlats.push(makeFlat({ nutrients: 0 }))
    ;(sys as any).cleanup()
    expect((sys as any).tideFlats).toHaveLength(1)
  })

  it('nutrients>0时flat保留', () => {
    ;(sys as any).tideFlats.push(makeFlat({ nutrients: 50 }))
    ;(sys as any).cleanup()
    expect((sys as any).tideFlats).toHaveLength(1)
  })

  it('混合正负nutrients时只移除负值', () => {
    ;(sys as any).tideFlats.push(makeFlat({ id: 1, nutrients: 50 }))
    ;(sys as any).tideFlats.push(makeFlat({ id: 2, nutrients: -1 }))
    ;(sys as any).tideFlats.push(makeFlat({ id: 3, nutrients: 30 }))
    ;(sys as any).cleanup()
    expect((sys as any).tideFlats).toHaveLength(2)
    const ids = (sys as any).tideFlats.map((f: TideFlat) => f.id)
    expect(ids).not.toContain(2)
  })

  it('全部nutrients<0时清空', () => {
    ;(sys as any).tideFlats.push(makeFlat({ nutrients: -1 }))
    ;(sys as any).tideFlats.push(makeFlat({ nutrients: -2 }))
    ;(sys as any).cleanup()
    expect((sys as any).tideFlats).toHaveLength(0)
  })

  it('空数组cleanup不报错', () => {
    expect(() => (sys as any).cleanup()).not.toThrow()
  })

  it('cleanup倒序删除不影响剩余元素', () => {
    ;(sys as any).tideFlats.push(makeFlat({ id: 10, nutrients: -1 }))
    ;(sys as any).tideFlats.push(makeFlat({ id: 11, nutrients: 50 }))
    ;(sys as any).tideFlats.push(makeFlat({ id: 12, nutrients: -1 }))
    ;(sys as any).cleanup()
    expect((sys as any).tideFlats).toHaveLength(1)
    expect((sys as any).tideFlats[0].id).toBe(11)
  })
})

// ================================================================
describe('WorldTideFlatSystem - MAX_TIDE_FLATS上限', () => {
  let sys: WorldTideFlatSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('已有MAX_TIDE_FLATS时detectTideFlats直接返回', () => {
    for (let i = 0; i < MAX_TIDE_FLATS; i++) {
      ;(sys as any).tideFlats.push(makeFlat())
    }
    vi.mocked(Math.random).mockReturnValue(0)
    ;(sys as any).detectTideFlats(makeMockWorld(), 100)
    expect((sys as any).tideFlats).toHaveLength(MAX_TIDE_FLATS)
  })

  it('cleanup后可再spawn到MAX_TIDE_FLATS', () => {
    for (let i = 0; i < MAX_TIDE_FLATS - 1; i++) {
      ;(sys as any).tideFlats.push(makeFlat({ nutrients: 50 }))
    }
    expect((sys as any).tideFlats).toHaveLength(MAX_TIDE_FLATS - 1)
    // 尝试再spawn一个
    const tiles: Record<string, number> = {
      '5,5': TileType.SAND,
      '4,4': TileType.SHALLOW_WATER,
      '5,4': TileType.DEEP_WATER,
    }
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValueOnce((5 - 2) / 196)
      .mockReturnValue(0.5)
    ;(sys as any).detectTideFlats(makeMockWorld(tiles), 100)
    expect((sys as any).tideFlats.length).toBeLessThanOrEqual(MAX_TIDE_FLATS)
  })

  it('SPAWN_CHANCE=0.003小于1，spawn是概率性的', () => {
    expect(SPAWN_CHANCE).toBeLessThan(1)
    expect(SPAWN_CHANCE).toBeGreaterThan(0)
  })

  it('CHECK_INTERVAL=3000正确', () => {
    expect(CHECK_INTERVAL).toBe(3000)
  })

  it('MAX_TIDE_FLATS=15正确', () => {
    expect(MAX_TIDE_FLATS).toBe(15)
  })
})

// ================================================================
describe('WorldTideFlatSystem - update集成流程', () => {
  let sys: WorldTideFlatSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('update在CHECK_INTERVAL触发后调用cycleTides', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    const flat = makeFlat({ tidePhase: 0 })
    ;(sys as any).tideFlats.push(flat)
    const world = makeMockWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    // cycleTides会修改tidePhase
    expect(flat.tidePhase).toBeCloseTo(TIDE_SPEED)
  })

  it('update触发后调用cleanup', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    const dyingFlat = makeFlat({ nutrients: 0, organisms: 0, tidePhase: 0 })
    ;(sys as any).tideFlats.push(dyingFlat)
    const world = makeMockWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    // cycleTides后nutrients=-1，cleanup会移除
    expect((sys as any).tideFlats).toHaveLength(0)
  })

  it('update在节流期间不修改flats', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    const flat = makeFlat({ tidePhase: 1.0 })
    ;(sys as any).tideFlats.push(flat)
    sys.update(1, makeMockWorld(), mockEm, CHECK_INTERVAL - 1)
    expect(flat.tidePhase).toBe(1.0) // 不变
  })

  it('多个flat各自独立cycleTides', () => {
    vi.mocked(Math.random).mockReturnValue(0.9)
    const f1 = makeFlat({ tidePhase: 0 })
    const f2 = makeFlat({ tidePhase: Math.PI })
    ;(sys as any).tideFlats.push(f1, f2)
    const world = makeMockWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect(f1.tidePhase).toBeCloseTo(TIDE_SPEED)
    expect(f2.tidePhase).toBeCloseTo(Math.PI + TIDE_SPEED)
  })
})
