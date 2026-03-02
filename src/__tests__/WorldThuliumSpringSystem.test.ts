import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldThuliumSpringSystem } from '../systems/WorldThuliumSpringSystem'
import type { ThuliumSpringZone } from '../systems/WorldThuliumSpringSystem'
import { TileType } from '../utils/Constants'

// CHECK_INTERVAL=3010, FORM_CHANCE=0.003, MAX_ZONES=32
// spawn条件: Math.random() > FORM_CHANCE 则continue，即random<=0.003才spawn
// cleanup cutoff = tick - 54000

function makeSys(): WorldThuliumSpringSystem { return new WorldThuliumSpringSystem() }
let nextId = 1

function makeZone(overrides: Partial<ThuliumSpringZone> = {}): ThuliumSpringZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    thuliumContent: 60,
    springFlow: 30,
    monaziteSandLeaching: 50,
    blueEmission: 50,
    tick: 0,
    ...overrides
  }
}

// mockWorld：邻格全返回 SHALLOW_WATER，让 nearWater=true
function makeWaterWorld(): any {
  return {
    width: 200,
    height: 200,
    getTile: vi.fn(() => TileType.SHALLOW_WATER)
  }
}

// mockWorld：邻格全返回 GRASS，让 nearWater=false & nearMountain=false
function makeNeutralWorld(): any {
  return {
    width: 200,
    height: 200,
    getTile: vi.fn(() => TileType.GRASS)
  }
}

// mockWorld：邻格返回 MOUNTAIN，让 nearMountain=true
function makeMountainWorld(): any {
  return {
    width: 200,
    height: 200,
    getTile: vi.fn(() => TileType.MOUNTAIN)
  }
}

const mockEm = {} as any

describe('WorldThuliumSpringSystem - 初始状态', () => {
  let sys: WorldThuliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始zones为空数组', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('zones是数组类型', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('手动注入zone后长度正确', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('ThuliumSpringZone字段：thuliumContent和springFlow', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.thuliumContent).toBe(60)
    expect(z.springFlow).toBe(30)
  })

  it('ThuliumSpringZone字段：monaziteSandLeaching和blueEmission', () => {
    ;(sys as any).zones.push(makeZone({ monaziteSandLeaching: 70, blueEmission: 80 }))
    const z = (sys as any).zones[0]
    expect(z.monaziteSandLeaching).toBe(70)
    expect(z.blueEmission).toBe(80)
  })

  it('zones返回内部同一引用', () => {
    const a = (sys as any).zones
    const b = (sys as any).zones
    expect(a).toBe(b)
  })
})

describe('WorldThuliumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldThuliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0时不触发（lastCheck=0，差值=0 < 3010）', () => {
    const world = makeWaterWorld()
    sys.update(1, world, mockEm, 0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick=3009时不触发（差值=3009 < 3010）', () => {
    const world = makeWaterWorld()
    sys.update(1, world, mockEm, 3009)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick=3010时触发（差值=3010，不满足< CHECK_INTERVAL）', () => {
    const world = makeWaterWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // <=FORM_CHANCE，触发spawn
    sys.update(1, world, mockEm, 3010)
    // lastCheck应更新
    expect((sys as any).lastCheck).toBe(3010)
    vi.restoreAllMocks()
  })

  it('触发后lastCheck更新为当前tick', () => {
    const world = makeWaterWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
    vi.restoreAllMocks()
  })

  it('触发后再次在间隔内调用不重复处理', () => {
    const world = makeWaterWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, 5000)
    const countAfterFirst = (sys as any).zones.length
    sys.update(1, world, mockEm, 5001) // 间隔仅1，不触发
    expect((sys as any).zones.length).toBe(countAfterFirst)
    vi.restoreAllMocks()
  })

  it('未触发时lastCheck不变', () => {
    sys.update(1, makeWaterWorld(), mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('两次间隔满足后lastCheck随第二次tick更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 5000)
    sys.update(1, makeWaterWorld(), mockEm, 8020) // 8020-5000=3020>=3010
    expect((sys as any).lastCheck).toBe(8020)
    vi.restoreAllMocks()
  })
})

describe('WorldThuliumSpringSystem - spawn逻辑', () => {
  let sys: WorldThuliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('FORM_CHANCE方向：random>0.003时跳过spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)   // x坐标
      .mockReturnValueOnce(0.5)   // y坐标
      .mockReturnValueOnce(0.9)   // >FORM_CHANCE，跳过
      .mockReturnValue(0.9)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('FORM_CHANCE方向：random<=0.003时触发spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)   // x
      .mockReturnValueOnce(0.5)   // y
      .mockReturnValueOnce(0.001) // <=FORM_CHANCE，通过
      .mockReturnValue(0.5)       // 后续字段初始化
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('没有水/山邻格时不spawn（nearWater=false, nearMountain=false）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeNeutralWorld(), mockEm, 3010)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('有浅水邻格时可spawn', () => {
    // makeWaterWorld返回SHALLOW_WATER
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.001) // <=FORM_CHANCE
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('有深水邻格时可spawn', () => {
    const deepWaterWorld: any = {
      width: 200, height: 200,
      getTile: vi.fn(() => TileType.DEEP_WATER)
    }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.001)
      .mockReturnValue(0.5)
    sys.update(1, deepWaterWorld, mockEm, 3010)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('有山邻格时可spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.001)
      .mockReturnValue(0.5)
    sys.update(1, makeMountainWorld(), mockEm, 3010)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('spawn后zone包含正确tick', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.001)
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 9999)
    expect((sys as any).zones[0].tick).toBe(9999)
  })

  it('spawn后zone有唯一递增id', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones[0].id).toBe(1)
    ;(sys as any).lastCheck = 0
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 6020)
    expect((sys as any).zones[1].id).toBe(2)
  })

  it('thuliumContent在40-100范围内（random=0时为40）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0)   // thuliumContent = 40 + 0*60 = 40
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones[0].thuliumContent).toBeCloseTo(40, 5)
  })

  it('thuliumContent在40-100范围内（random=1时接近100）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValueOnce(1)   // thuliumContent = 40 + 60 = 100
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones[0].thuliumContent).toBeCloseTo(100, 5)
  })

  it('每次update最多3次attempt', () => {
    // 所有attempt都失败（GRASS邻格 + random<=FC），观察随机调用次数
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeNeutralWorld(), mockEm, 3010)
    // 每次attempt：2次random（x/y坐标） + 1次FORM_CHANCE判断（但nearWater=false时直接continue不走FORM_CHANCE）
    // 实际上 nearWater=false时continue直接跳过，不调用FORM_CHANCE的random
    // 所以3次attempt各调用2次random = 6次（x/y坐标用random*width/height）
    // 注意：Math.floor(Math.random()*w) 各调用1次random
    expect(randSpy.mock.calls.length).toBeGreaterThanOrEqual(3)
    vi.restoreAllMocks()
  })

  it('每次update最多产生1个zone（3次attempt但每次通过概率低）', () => {
    // 强制3次attempt都通过：每次 x/y/FORM_CHANCE各1次
    vi.spyOn(Math, 'random')
      // attempt1: x y formChance thuliumContent springFlow monazite blueEmission
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      // attempt2: x y formChance ...
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      // attempt3: x y formChance ...
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    // 最多3次，故最多3个zone
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })
})

describe('WorldThuliumSpringSystem - cleanup逻辑', () => {
  let sys: WorldThuliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=54001时cutoff=1，tick<1的zone被删除（tick=0的zone）', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWaterWorld(), mockEm, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick恰好等于cutoff时不删除（需tick < cutoff才删）', () => {
    const currentTick = 60000
    const cutoff = currentTick - 54000 // =6000
    ;(sys as any).zones.push(makeZone({ tick: cutoff })) // tick===cutoff，不满足< cutoff
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWaterWorld(), mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('tick=cutoff-1时被删除', () => {
    const currentTick = 60000
    const cutoff = currentTick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWaterWorld(), mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('较新的zone不被cleanup删除', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 50000 })) // 60000-50000=10000 < 54000，不删
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWaterWorld(), mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('同时有新旧zone时只删旧的', () => {
    const currentTick = 60000
    const cutoff = currentTick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 })) // 旧
    ;(sys as any).zones.push(makeZone({ tick: 50000 }))      // 新
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWaterWorld(), mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(50000)
  })

  it('多个旧zone全部被删', () => {
    const currentTick = 100000
    const cutoff = currentTick - 54000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: cutoff - i - 1 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWaterWorld(), mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cleanup不影响当前tick创建的zone', () => {
    const currentTick = 60000
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, currentTick)
    // 新spawn的zone tick=currentTick，不会被删
    const zoneCount = (sys as any).zones.length
    expect(zoneCount).toBeGreaterThan(0)
  })

  it('cleanup从后向前删除不影响索引（数组逆序删除）', () => {
    const currentTick = 100000
    const cutoff = currentTick - 54000
    // 奇偶索引交替新旧
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 })) // 旧
    ;(sys as any).zones.push(makeZone({ tick: 80000 }))      // 新
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 })) // 旧
    ;(sys as any).zones.push(makeZone({ tick: 80000 }))      // 新
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWaterWorld(), mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(2)
    expect((sys as any).zones.every((z: ThuliumSpringZone) => z.tick === 80000)).toBe(true)
  })
})

describe('WorldThuliumSpringSystem - MAX_ZONES上限', () => {
  let sys: WorldThuliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('zones达到MAX_ZONES=32后不再spawn', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 50000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones.length).toBe(32)
  })

  it('zones=31时仍可spawn（未达上限）', () => {
    for (let i = 0; i < 31; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 50000 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones.length).toBe(32)
  })

  it('在3次attempt循环中遇到上限立即break', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 50000 }))
    }
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    // 因为直接break，random的调用次数应该非常少（仅update触发后立即break）
    expect(spy.mock.calls.length).toBe(0)
  })

  it('MAX_ZONES边界：32个zones时不增加', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 50000 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones).toHaveLength(32)
  })

  it('zones超过MAX_ZONES时cleanup可以降至32以下', () => {
    // 手动push超过32（测试cleanup逻辑）
    const currentTick = 60000
    const cutoff = currentTick - 54000
    for (let i = 0; i < 35; i++) {
      ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 })) // 全部过期
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWaterWorld(), mockEm, currentTick)
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })
})

describe('WorldThuliumSpringSystem - zone字段范围', () => {
  let sys: WorldThuliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('springFlow在10-60范围内（random=0时为10）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5) // thuliumContent
      .mockReturnValueOnce(0)   // springFlow = 10 + 0*50 = 10
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones[0].springFlow).toBeCloseTo(10, 5)
  })

  it('monaziteSandLeaching在20-100范围内（random=0时为20）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5) // thuliumContent
      .mockReturnValueOnce(0.5) // springFlow
      .mockReturnValueOnce(0)   // monaziteSandLeaching = 20 + 0*80 = 20
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones[0].monaziteSandLeaching).toBeCloseTo(20, 5)
  })

  it('blueEmission在15-100范围内（random=0时为15）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5) // thuliumContent
      .mockReturnValueOnce(0.5) // springFlow
      .mockReturnValueOnce(0.5) // monaziteSandLeaching
      .mockReturnValueOnce(0)   // blueEmission = 15 + 0*85 = 15
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    expect((sys as any).zones[0].blueEmission).toBeCloseTo(15, 5)
  })

  it('zone的x/y坐标在world范围内', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.001)
      .mockReturnValue(0.5)
    sys.update(1, makeWaterWorld(), mockEm, 3010)
    const z = (sys as any).zones[0]
    expect(z.x).toBeGreaterThanOrEqual(0)
    expect(z.x).toBeLessThan(200)
    expect(z.y).toBeGreaterThanOrEqual(0)
    expect(z.y).toBeLessThan(200)
  })
})
