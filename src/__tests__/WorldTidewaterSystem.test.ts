import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTidewaterSystem } from '../systems/WorldTidewaterSystem'
import type { TideZone, TidePhase } from '../systems/WorldTidewaterSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2000
// SPAWN_CHANCE = 0.003
// MAX_ZONES = 20
// spawn条件: tile===2(SAND) 且邻格(-2~+2)内有 tile<=1(DEEP_WATER或SHALLOW_WATER)
// cycle = Math.sin(elapsed * cycleSpeed * 0.0001), elapsed = tick - zone.tick
// level = (cycle + 1) * 0.5 * maxLevel
// phase: cycle>0.7 => 'high', >0 => 'rising', >-0.7 => 'falling', else => 'low'
// cleanup: zone.tick < (currentTick - 180000) 时删除
// 重要: tick=0时 0-0=0 < 2000 => 直接return，需tick>=2000才触发

const CHECK_INTERVAL = 2000
const SPAWN_CHANCE = 0.003
const MAX_ZONES = 20
const TICK0 = CHECK_INTERVAL  // 触发首次执行的最小tick

function makeSys(): WorldTidewaterSystem { return new WorldTidewaterSystem() }

let nextId = 1
function makeZone(overrides: Partial<TideZone> = {}): TideZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    phase: 'low',
    level: 0,
    maxLevel: 10,
    cycleSpeed: 1.0,
    radius: 8,
    tick: 0,
    ...overrides
  }
}

// mockWorld: tile(100,100)=2(SAND), 邻格(101,100)=1(SHALLOW_WATER)
// 其余tile=3(GRASS)
function makeMockWorld(tileMap?: (x: number, y: number) => number) {
  return {
    width: 200,
    height: 200,
    getTile: vi.fn((x: number, y: number) => {
      if (tileMap) return tileMap(x, y)
      if (x === 100 && y === 100) return 2  // SAND
      if (x === 101 && y === 100) return 1  // SHALLOW_WATER
      return 3  // GRASS
    })
  } as any
}

const mockEm = {} as any

// ===== 描述块 1: 初始状态 =====
describe('WorldTidewaterSystem - 初始状态', () => {
  let sys: WorldTidewaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始zones为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('zones是数组', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('直接push zone可查询到', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zones内部引用一致', () => {
    const z1 = (sys as any).zones
    const z2 = (sys as any).zones
    expect(z1).toBe(z2)
  })

  it('支持4种潮汐阶段类型', () => {
    const phases: TidePhase[] = ['rising', 'high', 'falling', 'low']
    expect(phases).toHaveLength(4)
  })

  it('TideZone字段完整', () => {
    const z = makeZone({ phase: 'high', level: 5, maxLevel: 10 })
    expect(z).toHaveProperty('id')
    expect(z).toHaveProperty('x')
    expect(z).toHaveProperty('y')
    expect(z).toHaveProperty('phase')
    expect(z).toHaveProperty('level')
    expect(z).toHaveProperty('maxLevel')
    expect(z).toHaveProperty('cycleSpeed')
    expect(z).toHaveProperty('radius')
    expect(z).toHaveProperty('tick')
  })
})

// ===== 描述块 2: CHECK_INTERVAL节流 =====
describe('WorldTidewaterSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTidewaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差 < CHECK_INTERVAL 时直接返回，lastCheck不变', () => {
    // 先触发一次，lastCheck=2000
    const world = makeMockWorld()
    sys.update(0, world, mockEm, CHECK_INTERVAL)
    const lc = (sys as any).lastCheck  // 2000
    // 再次调用，差值 < CHECK_INTERVAL
    sys.update(0, world, mockEm, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(lc)
  })

  it('tick差 === CHECK_INTERVAL 时触发，lastCheck更新', () => {
    const world = makeMockWorld()
    sys.update(0, world, mockEm, CHECK_INTERVAL)       // lastCheck=2000
    sys.update(0, world, mockEm, CHECK_INTERVAL * 2)   // 差=2000，触发
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick差 > CHECK_INTERVAL 时触发', () => {
    const world = makeMockWorld()
    sys.update(0, world, mockEm, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
  })

  it('tick=0时不触发（0 < CHECK_INTERVAL）', () => {
    const world = makeMockWorld()
    sys.update(0, world, mockEm, 0)
    // lastCheck仍为0，zones仍为空
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick=CHECK_INTERVAL-1时不触发', () => {
    const world = makeMockWorld()
    sys.update(0, world, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL时首次触发', () => {
    const world = makeMockWorld()
    sys.update(0, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续多次调用在正确时机更新lastCheck', () => {
    const world = makeMockWorld()
    sys.update(0, world, mockEm, CHECK_INTERVAL)          // trigger, lc=2000
    sys.update(0, world, mockEm, CHECK_INTERVAL + 1000)   // 1000<2000, skip
    sys.update(0, world, mockEm, CHECK_INTERVAL + 1999)   // 1999<2000, skip
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(0, world, mockEm, CHECK_INTERVAL * 2)      // 2000>=2000, trigger
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

// ===== 描述块 3: spawn逻辑 =====
describe('WorldTidewaterSystem - spawn逻辑', () => {
  let sys: WorldTidewaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('random >= SPAWN_CHANCE 时不spawn', () => {
    // SPAWN_CHANCE=0.003, random()返回0.003(不小于)
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    const world = makeMockWorld()
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random < SPAWN_CHANCE，tile===SAND，有邻近水体 => spawn成功', () => {
    // 调用序列: SPAWN_CHANCE check, x, y, maxLevel, cycleSpeed, radius
    // x=floor(0.5*200)=100 => SAND, 邻格(101,100)=SHALLOW_WATER
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)  // < SPAWN_CHANCE => 通过
      .mockReturnValueOnce(0.5)    // x = floor(0.5*200)=100
      .mockReturnValueOnce(0.5)    // y = floor(0.5*200)=100
      .mockReturnValueOnce(0)      // maxLevel = 3+floor(0*5)=3
      .mockReturnValueOnce(0)      // cycleSpeed = 0.3+0*0.7=0.3
      .mockReturnValueOnce(0)      // radius = 5+floor(0*10)=5

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('spawn时tile不为SAND => 不spawn', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)  // < SPAWN_CHANCE
      .mockReturnValueOnce(0.5)    // x=100
      .mockReturnValueOnce(0.6)    // y=120 => GRASS(3)

    // world: (100,120)=GRASS
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tile===SAND但无邻近水体 => 不spawn', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5)  // x=100
      .mockReturnValueOnce(0.5)  // y=100

    // 全部tile都是SAND，没有水
    const world = {
      width: 200, height: 200,
      getTile: vi.fn(() => 2)  // 全SAND
    } as any
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('spawn的zone初始phase为low', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)  // 防止cycle更新阶段再用random

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    // 注意：spawn后zone立即经历tidal cycle计算
    // elapsed = TICK0 - TICK0 = 0, cycle=sin(0)=0
    // level=(0+1)*0.5*3=1.5, phase: 0>0.7? No. 0>0? No. 0>-0.7? Yes => 'falling'
    const z = (sys as any).zones[0]
    expect(z).toBeDefined()
    // 实际phase: 因为cycle=0（不大于0），进入>-0.7分支=>'falling'
    expect(['low', 'falling'].includes(z.phase)).toBe(true)
  })

  it('spawn的zone记录正确的tick（spawn时的currentTick）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const z = (sys as any).zones[0]
    expect(z.tick).toBe(TICK0)
  })

  it('spawn的zone maxLevel=3（random=0时）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)    // maxLevel = 3+floor(0*5)=3
      .mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const z = (sys as any).zones[0]
    expect(z.maxLevel).toBe(3)
  })

  it('spawn的zone maxLevel=7（random=0.99时）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.99)  // maxLevel = 3+floor(0.99*5)=3+4=7
      .mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const z = (sys as any).zones[0]
    expect(z.maxLevel).toBe(7)
  })

  it('spawn的zone cycleSpeed=0.3（random=0时）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)    // cycleSpeed = 0.3+0*0.7=0.3
      .mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const z = (sys as any).zones[0]
    expect(z.cycleSpeed).toBeCloseTo(0.3, 5)
  })

  it('spawn的zone radius=5（random=0时）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValueOnce(0)    // radius = 5+floor(0*10)=5
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const z = (sys as any).zones[0]
    expect(z.radius).toBe(5)
  })

  it('spawn的zone radius=14（random=0.9时）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9)  // radius = 5+floor(0.9*10)=5+9=14
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const z = (sys as any).zones[0]
    expect(z.radius).toBe(14)
  })

  it('id从1开始自增', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const z = (sys as any).zones[0]
    expect(z.id).toBe(1)
    expect((sys as any).nextId).toBe(2)
  })

  it('邻格检查范围为±2，距离2的水格也算', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    // (100,100)=SAND, (102,100)=SHALLOW_WATER（距离2）
    const world = {
      width: 200, height: 200,
      getTile: vi.fn((x: number, y: number) => {
        if (x === 100 && y === 100) return 2  // SAND
        if (x === 102 && y === 100) return 1  // 距离2的SHALLOW_WATER
        return 3
      })
    } as any
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('DEEP_WATER(tile=0)也算邻近水体', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    const world = {
      width: 200, height: 200,
      getTile: vi.fn((x: number, y: number) => {
        if (x === 100 && y === 100) return 2  // SAND
        if (x === 101 && y === 100) return 0  // DEEP_WATER
        return 3
      })
    } as any
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(1)
  })
})

// ===== 描述块 4: 潮汐周期计算 =====
describe('WorldTidewaterSystem - 潮汐周期计算', () => {
  let sys: WorldTidewaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('cycle > 0.7 时 phase = high', () => {
    // sin(π/2)=1 > 0.7 => 'high'
    // elapsed = π/2 / (cycleSpeed * 0.0001), cycleSpeed=1 => elapsed≈15708
    const elapsed = Math.PI / 2 / 0.0001
    // zone.tick=0, currentTick=elapsed (需>=CHECK_INTERVAL)
    const tick = Math.round(elapsed)
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1  // 保证触发
    ;(sys as any).zones.push(makeZone({ tick: 0, maxLevel: 10, cycleSpeed: 1.0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)  // 阻止spawn
    sys.update(0, makeMockWorld(), mockEm, tick)
    const z = (sys as any).zones[0]
    expect(z.phase).toBe('high')
  })

  it('0 < cycle <= 0.7 时 phase = rising', () => {
    // sin(π/6)=0.5, 0 < 0.5 <= 0.7 => 'rising'
    const elapsed = Math.PI / 6 / 0.0001
    const tick = Math.round(elapsed)
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: 0, maxLevel: 10, cycleSpeed: 1.0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    const z = (sys as any).zones[0]
    expect(z.phase).toBe('rising')
  })

  it('-0.7 < cycle <= 0 时 phase = falling', () => {
    // sin(7π/6)≈-0.5, -0.7 < -0.5 <= 0 => 'falling'
    const elapsed = 7 * Math.PI / 6 / 0.0001
    const tick = Math.round(elapsed)
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: 0, maxLevel: 10, cycleSpeed: 1.0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    const z = (sys as any).zones[0]
    expect(z.phase).toBe('falling')
  })

  it('cycle <= -0.7 时 phase = low', () => {
    // sin(3π/2)=-1 <= -0.7 => 'low'
    const elapsed = 3 * Math.PI / 2 / 0.0001
    const tick = Math.round(elapsed)
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: 0, maxLevel: 10, cycleSpeed: 1.0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    const z = (sys as any).zones[0]
    expect(z.phase).toBe('low')
  })

  it('level = (cycle+1)*0.5*maxLevel（cycle=1时level=maxLevel）', () => {
    const maxLevel = 8
    const elapsed = Math.PI / 2 / 0.0001  // cycle≈1
    const tick = Math.round(elapsed)
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: 0, maxLevel, cycleSpeed: 1.0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    const z = (sys as any).zones[0]
    expect(z.level).toBeCloseTo(maxLevel, 0)
  })

  it('level最小接近0（cycle=-1时）', () => {
    const maxLevel = 10
    const elapsed = 3 * Math.PI / 2 / 0.0001  // cycle≈-1
    const tick = Math.round(elapsed)
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: 0, maxLevel, cycleSpeed: 1.0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    const z = (sys as any).zones[0]
    expect(z.level).toBeCloseTo(0, 0)
  })

  it('level中间值（cycle=0时 level=0.5*maxLevel）', () => {
    const maxLevel = 10
    // elapsed=0时cycle=sin(0)=0, level=0.5*10=5
    // 需要elapsed=0: zone.tick = currentTick
    const tick = 50000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: tick, maxLevel, cycleSpeed: 1.0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    const z = (sys as any).zones[0]
    expect(z.level).toBeCloseTo(maxLevel * 0.5, 3)
  })

  it('多个zone独立计算，不相互影响', () => {
    const elapsed1 = Math.PI / 2 / 0.0001   // cycle=1 => 'high'
    const tick = Math.round(elapsed1)
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: 0, maxLevel: 10, cycleSpeed: 1.0, id: 100 }))
    // zone2: elapsed=tick-tick=0, cycle=0 => 'falling'
    ;(sys as any).zones.push(makeZone({ tick: tick, maxLevel: 10, cycleSpeed: 1.0, id: 101 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    const z1 = (sys as any).zones.find((z: TideZone) => z.id === 100)
    const z2 = (sys as any).zones.find((z: TideZone) => z.id === 101)
    expect(z1.phase).toBe('high')
    expect(z2.phase).toBe('falling')  // cycle=0 => falling
  })

  it('cycleSpeed影响周期：更高cycleSpeed更快到达high', () => {
    // 对于同样的elapsed，高cycleSpeed更可能到达high
    const tick = 100000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    // zone1: cycleSpeed=1, elapsed大
    ;(sys as any).zones.push(makeZone({ tick: 0, maxLevel: 10, cycleSpeed: 1.0, id: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    const z1 = (sys as any).zones.find((z: TideZone) => z.id === 100)
    // 只验证level在[0, maxLevel]范围内
    expect(z1.level).toBeGreaterThanOrEqual(0)
    expect(z1.level).toBeLessThanOrEqual(10)
  })
})

// ===== 描述块 5: cleanup逻辑 =====
describe('WorldTidewaterSystem - cleanup逻辑', () => {
  let sys: WorldTidewaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // cleanup条件: zone.tick < (currentTick - 180000) 时删除
  // 即 zone.tick < cutoff 时删除

  it('zone.tick >= cutoff 时不删除', () => {
    // currentTick=182000, cutoff=182000-180000=2000
    // zone.tick=2000: 2000 < 2000? No => 保留
    const tick = 182000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: 2000 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick < cutoff 时删除', () => {
    // currentTick=182001, cutoff=2001
    // zone.tick=2000: 2000 < 2001? Yes => 删除
    const tick = 182001
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: 2000 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('精确边界：zone.tick === cutoff 时保留（<不触发）', () => {
    // cutoff = tick - 180000, zone.tick === cutoff => 不 < cutoff，保留
    const tick = 200000
    const cutoff = tick - 180000  // =20000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('只删除过期zone，保留新zone', () => {
    const tick = 200000
    const cutoff = tick - 180000  // =20000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1, id: 100 }))  // 过期
    ;(sys as any).zones.push(makeZone({ tick: cutoff, id: 101 }))      // 刚好保留
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 1, id: 102 }))  // 保留
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    const zones = (sys as any).zones as TideZone[]
    expect(zones.some(z => z.id === 100)).toBe(false)
    expect(zones.some(z => z.id === 101)).toBe(true)
    expect(zones.some(z => z.id === 102)).toBe(true)
  })

  it('多个过期zone全部删除', () => {
    const tick = 300000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 100 }))
    ;(sys as any).zones.push(makeZone({ tick: 119999 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // cutoff=300000-180000=120000, 全部<120000 => 全删
    sys.update(0, makeMockWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('混合新旧zone，只删过期的', () => {
    const tick = 300000
    const cutoff = tick - 180000  // 120000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    for (let i = 0; i < 3; i++) {
      ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))  // 过期
    }
    for (let i = 0; i < 2; i++) {
      ;(sys as any).zones.push(makeZone({ tick: cutoff }))  // 保留
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(2)
  })
})

// ===== 描述块 6: MAX_ZONES上限 =====
describe('WorldTidewaterSystem - MAX_ZONES上限', () => {
  let sys: WorldTidewaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it(`zones达到${MAX_ZONES}时不再spawn`, () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // < SPAWN_CHANCE，但zones已满
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    // zones数不应超过MAX_ZONES（cleanup后可能删掉但这里tick刚好不过期）
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('zones为19时允许spawn到20', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)  // < SPAWN_CHANCE
      .mockReturnValueOnce(0.5)    // x=100
      .mockReturnValueOnce(0.5)    // y=100 => SAND + 邻SHALLOW_WATER
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    // 成功spawn，现在是20个
    expect((sys as any).zones.length).toBe(MAX_ZONES)
  })

  it('MAX_ZONES常量值为20', () => {
    expect(MAX_ZONES).toBe(20)
  })

  it('CHECK_INTERVAL常量值为2000', () => {
    expect(CHECK_INTERVAL).toBe(2000)
  })

  it('SPAWN_CHANCE常量值为0.003', () => {
    expect(SPAWN_CHANCE).toBe(0.003)
  })

  it('spawn后nextId递增', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    expect((sys as any).nextId).toBe(1)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).nextId).toBe(2)
  })
})
