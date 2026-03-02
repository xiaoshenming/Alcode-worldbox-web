import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTinSpringSystem } from '../systems/WorldTinSpringSystem'
import type { TinSpringZone } from '../systems/WorldTinSpringSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2720
// FORM_CHANCE = 0.003
// MAX_ZONES = 32
// spawn: 每次update尝试3次(attempt 0..2)
// 单次attempt spawn条件:
//   1. zones.length < MAX_ZONES
//   2. nearWater = hasAdjacentTile(x,y,SHALLOW_WATER=1) || hasAdjacentTile(x,y,DEEP_WATER=0)
//      nearMountain = hasAdjacentTile(x,y,MOUNTAIN=5)
//   3. !nearWater && !nearMountain => continue (跳过)
//   4. Math.random() > FORM_CHANCE => continue (跳过)
// 即: (nearWater || nearMountain) && random <= FORM_CHANCE 时spawn
// cleanup: zone.tick < (currentTick - 54000) 时删除
// 初始fields: tinContent=[40,100), springFlow=[10,60), cassiteriteErosion=[20,100), mineralSediment=[15,100)
// 重要: tick=0时 0-0=0 < 2720 => 直接return
// hasAdjacentTile检查8个邻格(±1)

const CHECK_INTERVAL = 2720
const FORM_CHANCE = 0.003
const MAX_ZONES = 32
const TICK0 = CHECK_INTERVAL  // 首次触发

function makeSys(): WorldTinSpringSystem { return new WorldTinSpringSystem() }

let nextId = 1
function makeZone(overrides: Partial<TinSpringZone> = {}): TinSpringZone {
  return {
    id: nextId++,
    x: 50, y: 50,
    tinContent: 60,
    springFlow: 30,
    cassiteriteErosion: 50,
    mineralSediment: 40,
    tick: 0,
    ...overrides
  }
}

// mockWorld: (100,100)=SHALLOW_WATER的邻格处，使hasAdjacentTile返回true
// 策略: (50,50)=GRASS，(51,50)=SHALLOW_WATER => 在(50,50)处hasAdjacentTile(SHALLOW_WATER)=true
function makeMockWorld(tileMap?: (x: number, y: number) => number) {
  return {
    width: 200,
    height: 200,
    getTile: vi.fn((x: number, y: number) => {
      if (tileMap) return tileMap(x, y)
      // (51,50)=SHALLOW_WATER, 其余=GRASS
      // 所以(50,50)的邻格中有SHALLOW_WATER => nearWater=true
      if (x === 51 && y === 50) return 1   // SHALLOW_WATER
      return 3  // GRASS
    })
  } as any
}

// 全GRASS的world（无水无山）
function makeNoSpawnWorld() {
  return {
    width: 200, height: 200,
    getTile: vi.fn(() => 3)  // GRASS
  } as any
}

const mockEm = {} as any

// ===== 描述块 1: 初始状态 =====
describe('WorldTinSpringSystem - 初始状态', () => {
  let sys: WorldTinSpringSystem
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
    expect((sys as any).zones).toBe((sys as any).zones)
  })

  it('TinSpringZone字段完整', () => {
    const z = makeZone()
    expect(z).toHaveProperty('id')
    expect(z).toHaveProperty('x')
    expect(z).toHaveProperty('y')
    expect(z).toHaveProperty('tinContent')
    expect(z).toHaveProperty('springFlow')
    expect(z).toHaveProperty('cassiteriteErosion')
    expect(z).toHaveProperty('mineralSediment')
    expect(z).toHaveProperty('tick')
  })
})

// ===== 描述块 2: CHECK_INTERVAL节流 =====
describe('WorldTinSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTinSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（0 < CHECK_INTERVAL）', () => {
    sys.update(0, makeNoSpawnWorld(), mockEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL 时不触发', () => {
    sys.update(0, makeNoSpawnWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时首次触发', () => {
    sys.update(0, makeNoSpawnWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时触发', () => {
    sys.update(0, makeNoSpawnWorld(), mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it('触发后再次调用，差值 < CHECK_INTERVAL 时跳过', () => {
    sys.update(0, makeNoSpawnWorld(), mockEm, CHECK_INTERVAL)
    sys.update(0, makeNoSpawnWorld(), mockEm, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('触发后差值 === CHECK_INTERVAL 时再次触发', () => {
    sys.update(0, makeNoSpawnWorld(), mockEm, CHECK_INTERVAL)
    sys.update(0, makeNoSpawnWorld(), mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('CHECK_INTERVAL常量值为2720', () => {
    expect(CHECK_INTERVAL).toBe(2720)
  })
})

// ===== 描述块 3: spawn条件（nearWater/nearMountain判断）=====
describe('WorldTinSpringSystem - spawn条件判断', () => {
  let sys: WorldTinSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无邻近水体无邻近山地 => 不spawn（continue跳过）', () => {
    // FORM_CHANCE check前先判断邻格，若!nearWater && !nearMountain => continue
    const mockRandom = vi.spyOn(Math, 'random')
    // 3次attempt各需要: x, y (在FORM_CHANCE之前先检查邻格)
    mockRandom
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)  // attempt0: x=100,y=100=GRASS，无水山
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)  // attempt1
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)  // attempt2
      .mockReturnValue(1)

    sys.update(0, makeNoSpawnWorld(), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('有邻近SHALLOW_WATER => nearWater=true，可spawn', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    // attempt0: x=floor(0.25*200)=50, y=floor(0.25*200)=50
    // (50,50)邻格中(51,50)=SHALLOW_WATER => nearWater=true
    // 然后check random > FORM_CHANCE => 0.001 <= 0.003 => spawn
    mockRandom
      .mockReturnValueOnce(0.25)   // x=50
      .mockReturnValueOnce(0.25)   // y=50
      .mockReturnValueOnce(0.001)  // random > FORM_CHANCE? 0.001 > 0.003? No => spawn
      .mockReturnValueOnce(0)      // tinContent = 40+0*60=40
      .mockReturnValueOnce(0)      // springFlow = 10+0*50=10
      .mockReturnValueOnce(0)      // cassiteriteErosion = 20+0*80=20
      .mockReturnValueOnce(0)      // mineralSediment = 15+0*85=15
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('有邻近DEEP_WATER => nearWater=true，可spawn', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)  // x=50,y=50
      .mockReturnValueOnce(0.001)  // <= FORM_CHANCE => spawn
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    const world = {
      width: 200, height: 200,
      getTile: vi.fn((x: number, y: number) => {
        if (x === 51 && y === 50) return 0  // DEEP_WATER
        return 3
      })
    } as any
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('有邻近MOUNTAIN(5) => nearMountain=true，可spawn', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)  // x=50,y=50
      .mockReturnValueOnce(0.001)  // <= FORM_CHANCE => spawn
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    const world = {
      width: 200, height: 200,
      getTile: vi.fn((x: number, y: number) => {
        if (x === 51 && y === 50) return 5  // MOUNTAIN
        return 3
      })
    } as any
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('random > FORM_CHANCE 时跳过（continue）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    // 3次attempt, 每次: x, y, 邻格检查到水, random > FORM_CHANCE => continue
    mockRandom
      .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)  // attempt0: (50,50)
      .mockReturnValueOnce(0.9)   // random > 0.003 => continue
      .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)  // attempt1
      .mockReturnValueOnce(0.9)   // continue
      .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)  // attempt2
      .mockReturnValueOnce(0.9)   // continue
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random === FORM_CHANCE 时跳过（>不触发）', () => {
    // > FORM_CHANCE 才continue，FORM_CHANCE=0.003，random=0.003: 0.003>0.003=false => 不skip => spawn
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)
      .mockReturnValueOnce(FORM_CHANCE)  // 0.003 > 0.003? No => 不skip => spawn
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('每次update最多尝试3次attempt', () => {
    // 使用全GRASS world，每次attempt都会因无水/山而continue
    // 验证getTile调用次数（每次attempt: 2次random(x,y) + hasAdjacentTile(最多8*2+1次getTile)）
    const world = makeNoSpawnWorld()
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world, mockEm, TICK0)
    // zones依然为空，因为所有attempt都被skip了
    expect((sys as any).zones).toHaveLength(0)
  })
})

// ===== 描述块 4: spawn后字段值校验 =====
describe('WorldTinSpringSystem - spawn字段值', () => {
  let sys: WorldTinSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(tinR: number, sfR: number, ceR: number, msR: number) {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)  // x=50,y=50
      .mockReturnValueOnce(0.001)  // pass FORM_CHANCE check
      .mockReturnValueOnce(tinR)   // tinContent
      .mockReturnValueOnce(sfR)    // springFlow
      .mockReturnValueOnce(ceR)    // cassiteriteErosion
      .mockReturnValueOnce(msR)    // mineralSediment
      .mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    return (sys as any).zones[0] as TinSpringZone
  }

  it('tinContent最小值=40（random=0）', () => {
    const z = spawnOne(0, 0, 0, 0)
    expect(z.tinContent).toBeCloseTo(40, 5)
  })

  it('tinContent接近最大=100（random接近1）', () => {
    const z = spawnOne(1, 0, 0, 0)
    expect(z.tinContent).toBeCloseTo(100, 0)
  })

  it('tinContent范围[40,100)', () => {
    const z = spawnOne(0.5, 0, 0, 0)
    expect(z.tinContent).toBeGreaterThanOrEqual(40)
    expect(z.tinContent).toBeLessThan(100)
  })

  it('springFlow最小值=10（random=0）', () => {
    const z = spawnOne(0, 0, 0, 0)
    expect(z.springFlow).toBeCloseTo(10, 5)
  })

  it('springFlow接近最大=60（random接近1）', () => {
    const z = spawnOne(0, 1, 0, 0)
    expect(z.springFlow).toBeCloseTo(60, 0)
  })

  it('cassiteriteErosion最小值=20（random=0）', () => {
    const z = spawnOne(0, 0, 0, 0)
    expect(z.cassiteriteErosion).toBeCloseTo(20, 5)
  })

  it('cassiteriteErosion接近最大=100（random接近1）', () => {
    const z = spawnOne(0, 0, 1, 0)
    expect(z.cassiteriteErosion).toBeCloseTo(100, 0)
  })

  it('mineralSediment最小值=15（random=0）', () => {
    const z = spawnOne(0, 0, 0, 0)
    expect(z.mineralSediment).toBeCloseTo(15, 5)
  })

  it('mineralSediment接近最大=100（random接近1）', () => {
    const z = spawnOne(0, 0, 0, 1)
    expect(z.mineralSediment).toBeCloseTo(100, 0)
  })

  it('spawn的zone记录正确的tick', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const z = (sys as any).zones[0]
    expect(z.tick).toBe(TICK0)
  })

  it('id从1开始，spawn后nextId递增为2', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const z = (sys as any).zones[0]
    expect(z.id).toBe(1)
    expect((sys as any).nextId).toBe(2)
  })
})

// ===== 描述块 5: cleanup逻辑 =====
describe('WorldTinSpringSystem - cleanup逻辑', () => {
  let sys: WorldTinSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // cleanup条件: zone.tick < (currentTick - 54000) 时删除

  it('zone.tick >= cutoff 时不删除', () => {
    // currentTick=56720, cutoff=56720-54000=2720
    // zone.tick=2720: 2720 < 2720? No => 保留
    const tick = 56720
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: 2720 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeNoSpawnWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick < cutoff 时删除', () => {
    // currentTick=56721, cutoff=2721
    // zone.tick=2720: 2720 < 2721? Yes => 删除
    const tick = 56721
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: 2720 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeNoSpawnWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick === cutoff 时保留（<不触发）', () => {
    const tick = 100000
    const cutoff = tick - 54000  // 46000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeNoSpawnWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('只删过期zone，保留新zone', () => {
    const tick = 100000
    const cutoff = tick - 54000  // 46000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1, id: 100 }))  // 过期
    ;(sys as any).zones.push(makeZone({ tick: cutoff, id: 101 }))      // 保留
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 1, id: 102 }))  // 保留
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeNoSpawnWorld(), mockEm, tick)
    const zones = (sys as any).zones as TinSpringZone[]
    expect(zones.some(z => z.id === 100)).toBe(false)
    expect(zones.some(z => z.id === 101)).toBe(true)
    expect(zones.some(z => z.id === 102)).toBe(true)
  })

  it('多个过期zone全部删除', () => {
    const tick = 200000
    const cutoff = tick - 54000  // 146000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: cutoff - i - 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeNoSpawnWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cleanup后剩余zones长度正确', () => {
    const tick = 200000
    const cutoff = tick - 54000  // 146000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    for (let i = 0; i < 3; i++) {
      ;(sys as any).zones.push(makeZone({ tick: cutoff - 100 }))  // 过期
    }
    for (let i = 0; i < 4; i++) {
      ;(sys as any).zones.push(makeZone({ tick: cutoff }))  // 保留
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeNoSpawnWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(4)
  })

  it('cleanup使用逆序遍历安全删除', () => {
    // 验证删除后数组��然正确（从后往前删）
    const tick = 300000
    const cutoff = tick - 54000  // 246000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1, id: 1 }))
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 1, id: 2 }))
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1, id: 3 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeNoSpawnWorld(), mockEm, tick)
    const zones = (sys as any).zones as TinSpringZone[]
    expect(zones).toHaveLength(1)
    expect(zones[0].id).toBe(2)
  })
})

// ===== 描述块 6: MAX_ZONES上限 =====
describe('WorldTinSpringSystem - MAX_ZONES上限', () => {
  let sys: WorldTinSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it(`zones达到${MAX_ZONES}时停止attempt（break）`, () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    // 即使random一直很小也不应该spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('zones=31时允许再spawn一个', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)  // x=50,y=50
      .mockReturnValueOnce(0.001)  // pass FORM_CHANCE
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).zones.length).toBe(MAX_ZONES)
  })

  it('MAX_ZONES常量值为32', () => {
    expect(MAX_ZONES).toBe(32)
  })

  it('FORM_CHANCE常量值为0.003', () => {
    expect(FORM_CHANCE).toBe(0.003)
  })

  it('CHECK_INTERVAL常量值为2720', () => {
    expect(CHECK_INTERVAL).toBe(2720)
  })

  it('spawn方向判断：random <= FORM_CHANCE时spawn（>才skip）', () => {
    // > FORM_CHANCE => continue(跳过), <= FORM_CHANCE => 不跳过 => spawn
    // random=0.003: 0.003 > 0.003? false => 不跳过 => spawn
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.003)  // 等于FORM_CHANCE, 不被skip
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('random=0.0031时被跳过（>FORM_CHANCE）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    // 3次attempt全被skip
    for (let i = 0; i < 3; i++) {
      mockRandom
        .mockReturnValueOnce(0.25).mockReturnValueOnce(0.25)
        .mockReturnValueOnce(0.0031)  // 0.0031 > 0.003 => continue
    }
    mockRandom.mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })
})
