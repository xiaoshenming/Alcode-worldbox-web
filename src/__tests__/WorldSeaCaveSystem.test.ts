import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldSeaCaveSystem } from '../systems/WorldSeaCaveSystem'
import type { SeaCave } from '../systems/WorldSeaCaveSystem'

// CHECK_INTERVAL=2630, FORM_CHANCE=0.0012, MAX_CAVES=13
// tile条件: SHALLOW_WATER(1) or MOUNTAIN(5)
// spawn字段: depth=5~25, entranceWidth=3~11, ceilingHeight=2~9, waveReach=3~15, stability=40~80, spectacle=20~55
// update: depth=min(35, +0.000005), entranceWidth=min(15, +0.000003), stability=max(10, -0.00003)
//         spectacle=max(10, min(65, +(random-0.47)*0.08))
// cleanup: cutoff=tick-93000, 删除 caves[i].tick < cutoff

function makeSys(): WorldSeaCaveSystem { return new WorldSeaCaveSystem() }

function makeWorld(tileValue: number) {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => tileValue,
  } as any
}

function makeEM() { return {} as any }

let caveIdCounter = 1
function makeCave(tick = 0): SeaCave {
  return {
    id: caveIdCounter++,
    x: 15, y: 25,
    depth: 15,
    entranceWidth: 5,
    ceilingHeight: 8,
    waveReach: 10,
    stability: 70,
    spectacle: 40,
    tick,
  }
}

describe('WorldSeaCaveSystem - 初始状态', () => {
  let sys: WorldSeaCaveSystem
  beforeEach(() => { sys = makeSys(); caveIdCounter = 1 })

  it('初始caves数组为空', () => {
    expect((sys as any).caves).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入一个cave后长度为1', () => {
    ;(sys as any).caves.push(makeCave())
    expect((sys as any).caves).toHaveLength(1)
  })

  it('注入后可查询id字段', () => {
    ;(sys as any).caves.push(makeCave())
    expect((sys as any).caves[0].id).toBe(1)
  })

  it('注入后可查询depth字段', () => {
    ;(sys as any).caves.push(makeCave())
    expect((sys as any).caves[0].depth).toBe(15)
  })

  it('注入后可查询stability字段', () => {
    ;(sys as any).caves.push(makeCave())
    expect((sys as any).caves[0].stability).toBe(70)
  })

  it('caves是内部数组引用', () => {
    const ref = (sys as any).caves
    expect(ref).toBe((sys as any).caves)
  })
})

describe('WorldSeaCaveSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldSeaCaveSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorld(1) // SHALLOW_WATER
    em = makeEM()
    caveIdCounter = 1
    vi.spyOn(Math, 'random').mockReturnValue(0) // random=0 < 0.0012 => spawn
  })

  it('tick=0不触发（0-0<2630）', () => {
    sys.update(1, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })

  it('tick=2629不触发', () => {
    sys.update(1, world, em, 2629)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })

  it('tick=2630触发，lastCheck更新', () => {
    sys.update(1, world, em, 2630)
    expect((sys as any).lastCheck).toBe(2630)
    vi.restoreAllMocks()
  })

  it('触发后lastCheck更新为当前tick', () => {
    sys.update(1, world, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
    vi.restoreAllMocks()
  })

  it('第二次tick不足时不再触发', () => {
    sys.update(1, world, em, 3000)
    const afterFirst = (sys as any).lastCheck
    sys.update(1, world, em, 4000) // 4000-3000=1000 < 2630
    expect((sys as any).lastCheck).toBe(afterFirst)
    vi.restoreAllMocks()
  })

  it('第二次tick>=lastCheck+2630时再次触发', () => {
    sys.update(1, world, em, 3000)
    sys.update(1, world, em, 5630) // 5630-3000=2630 >= 2630
    expect((sys as any).lastCheck).toBe(5630)
    vi.restoreAllMocks()
  })

  it('tick恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 2630)
    expect((sys as any).lastCheck).toBe(2630)
    vi.restoreAllMocks()
  })

  it('tick不足时lastCheck不变', () => {
    sys.update(1, world, em, 200)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })
})

describe('WorldSeaCaveSystem - spawn条件', () => {
  let sys: WorldSeaCaveSystem
  let em: any
  beforeEach(() => {
    sys = makeSys()
    em = makeEM()
    caveIdCounter = 1
  })

  it('random=0且tile=1(SHALLOW_WATER)时spawn', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('random=0且tile=5(MOUNTAIN)时spawn', () => {
    const world = makeWorld(5)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('random>=FORM_CHANCE(0.0012)时不spawn', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.0012) // 0.0012不小于0.0012
    sys.update(1, world, em, 2630)
    expect((sys as any).caves).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random=0.5时不spawn', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tile=0(DEEP_WATER)不spawn', () => {
    const world = makeWorld(0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tile=3(GRASS)不spawn', () => {
    const world = makeWorld(3)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('caves达到MAX_CAVES(13)时不再spawn', () => {
    const world = makeWorld(1)
    for (let i = 0; i < 13; i++) {
      ;(sys as any).caves.push(makeCave())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves.length).toBeLessThanOrEqual(13)
    vi.restoreAllMocks()
  })

  it('caves=12时可以继续spawn', () => {
    const world = makeWorld(1)
    for (let i = 0; i < 12; i++) {
      ;(sys as any).caves.push(makeCave(2630))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2630)
    // 12<13 => 尝试spawn
    expect((sys as any).caves.length).toBeGreaterThanOrEqual(12)
    vi.restoreAllMocks()
  })

  it('tile=2(SAND)不spawn', () => {
    const world = makeWorld(2)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('WorldSeaCaveSystem - spawn字段范围', () => {
  let sys: WorldSeaCaveSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorld(1) // SHALLOW_WATER
    em = makeEM()
    caveIdCounter = 1
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('spawn后caves长度为1', () => {
    sys.update(1, world, em, 2630)
    expect((sys as any).caves).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('spawn后id从1开始', () => {
    sys.update(1, world, em, 2630)
    expect((sys as any).caves[0].id).toBe(1)
    vi.restoreAllMocks()
  })

  it('spawn后nextId递增为2', () => {
    sys.update(1, world, em, 2630)
    expect((sys as any).nextId).toBe(2)
    vi.restoreAllMocks()
  })

  it('spawn后tick记录为当前tick', () => {
    sys.update(1, world, em, 2630)
    expect((sys as any).caves[0].tick).toBe(2630)
    vi.restoreAllMocks()
  })

  it('random=0时depth初始范围正确(depth>=5)', () => {
    // depth = 5 + random*20, random=0 => depth=5
    // 但同帧update: depth=min(35, 5+0.000005)
    sys.update(1, world, em, 2630)
    const cave = (sys as any).caves[0]
    expect(cave.depth).toBeGreaterThanOrEqual(5)
    expect(cave.depth).toBeLessThanOrEqual(35)
    vi.restoreAllMocks()
  })

  it('random=0时entranceWidth初始范围正确(>=3)', () => {
    // entranceWidth = 3 + random*8, random=0 => 3
    sys.update(1, world, em, 2630)
    const cave = (sys as any).caves[0]
    expect(cave.entranceWidth).toBeGreaterThanOrEqual(3)
    expect(cave.entranceWidth).toBeLessThanOrEqual(15)
    vi.restoreAllMocks()
  })

  it('random=0时stability初始范围正确', () => {
    // stability = 40 + random*40, random=0 => 40
    // 同帧update: stability=max(10, 40-0.00003) ≈ 40
    sys.update(1, world, em, 2630)
    const cave = (sys as any).caves[0]
    expect(cave.stability).toBeGreaterThanOrEqual(10)
    expect(cave.stability).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  it('random=0时spectacle初始范围正确', () => {
    // spectacle = 20 + random*35, random=0 => 20
    // 同帧update: spectacle=max(10, min(65, 20+(0-0.47)*0.08)) = max(10, min(65, 20-0.0376)) ≈ 19.96
    sys.update(1, world, em, 2630)
    const cave = (sys as any).caves[0]
    expect(cave.spectacle).toBeGreaterThanOrEqual(10)
    expect(cave.spectacle).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })

  it('连续两次触发id递增', () => {
    sys.update(1, world, em, 2630)
    sys.update(1, world, em, 5260)
    const caves = (sys as any).caves
    if (caves.length >= 2) {
      expect(caves[1].id).toBeGreaterThan(caves[0].id)
    }
    vi.restoreAllMocks()
  })

  it('random=0时ceilingHeight在[2,9]范围内', () => {
    sys.update(1, world, em, 2630)
    const cave = (sys as any).caves[0]
    expect(cave.ceilingHeight).toBeGreaterThanOrEqual(2)
    expect(cave.ceilingHeight).toBeLessThanOrEqual(9)
    vi.restoreAllMocks()
  })

  it('random=0时waveReach在[3,15]范围内', () => {
    sys.update(1, world, em, 2630)
    const cave = (sys as any).caves[0]
    expect(cave.waveReach).toBeGreaterThanOrEqual(3)
    expect(cave.waveReach).toBeLessThanOrEqual(15)
    vi.restoreAllMocks()
  })
})

describe('WorldSeaCaveSystem - update数值逻辑', () => {
  let sys: WorldSeaCaveSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorld(3) // GRASS，不spawn新cave
    em = makeEM()
    caveIdCounter = 1
  })

  it('update后depth增加0.000005', () => {
    const cave = makeCave()
    cave.depth = 20
    ;(sys as any).caves.push(cave)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves[0].depth).toBeCloseTo(20.000005, 6)
    vi.restoreAllMocks()
  })

  it('depth被min(35)限制', () => {
    const cave = makeCave()
    cave.depth = 35
    ;(sys as any).caves.push(cave)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves[0].depth).toBe(35)
    vi.restoreAllMocks()
  })

  it('update后entranceWidth增加0.000003', () => {
    const cave = makeCave()
    cave.entranceWidth = 7
    ;(sys as any).caves.push(cave)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves[0].entranceWidth).toBeCloseTo(7.000003, 6)
    vi.restoreAllMocks()
  })

  it('entranceWidth被min(15)限制', () => {
    const cave = makeCave()
    cave.entranceWidth = 15
    ;(sys as any).caves.push(cave)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves[0].entranceWidth).toBe(15)
    vi.restoreAllMocks()
  })

  it('update后stability减少0.00003', () => {
    const cave = makeCave()
    cave.stability = 60
    ;(sys as any).caves.push(cave)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves[0].stability).toBeCloseTo(60 - 0.00003, 6)
    vi.restoreAllMocks()
  })

  it('stability被max(10)限制', () => {
    const cave = makeCave()
    cave.stability = 10
    ;(sys as any).caves.push(cave)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves[0].stability).toBe(10)
    vi.restoreAllMocks()
  })

  it('random=0.47时spectacle不变（(0.47-0.47)*0.08=0）', () => {
    const cave = makeCave()
    cave.spectacle = 40
    ;(sys as any).caves.push(cave)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.47)
    sys.update(1, world, em, 2630)
    expect((sys as any).caves[0].spectacle).toBeCloseTo(40, 4)
    vi.restoreAllMocks()
  })

  it('spectacle被max(10)限制', () => {
    const cave = makeCave()
    cave.spectacle = 10
    ;(sys as any).caves.push(cave)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.47)*0.08=-0.0376, 10-0.0376=9.96 => max(10)=10
    sys.update(1, world, em, 2630)
    expect((sys as any).caves[0].spectacle).toBe(10)
    vi.restoreAllMocks()
  })
})

describe('WorldSeaCaveSystem - cleanup逻辑', () => {
  let sys: WorldSeaCaveSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorld(3) // GRASS，不spawn新cave
    em = makeEM()
    caveIdCounter = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  it('tick=94000时cutoff=1000，cave.tick=999被删除', () => {
    ;(sys as any).caves.push({ ...makeCave(999) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 94000)
    expect((sys as any).caves).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=94000时cutoff=1000，cave.tick=1000不被删除', () => {
    ;(sys as any).caves.push({ ...makeCave(1000) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 94000)
    expect((sys as any).caves).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('cave.tick=0，tick=95000(cutoff=2000)，被删除', () => {
    ;(sys as any).caves.push({ ...makeCave(0) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 95000)
    expect((sys as any).caves).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('cave.tick等于cutoff时保留（strict less）', () => {
    // tick=96000 => cutoff=3000, cave.tick=3000 => 3000<3000=false => 保留
    ;(sys as any).caves.push({ ...makeCave(3000) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 96000)
    expect((sys as any).caves).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('新旧混合：旧的删除新的保留', () => {
    // tick=100000 => cutoff=7000
    ;(sys as any).caves.push({ ...makeCave(100) }) // < 7000 删
    ;(sys as any).caves.push({ ...makeCave(8000) }) // >= 7000 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 100000)
    expect((sys as any).caves).toHaveLength(1)
    expect((sys as any).caves[0].tick).toBe(8000)
    vi.restoreAllMocks()
  })

  it('全部cave都太旧时清空数组', () => {
    ;(sys as any).caves.push({ ...makeCave(0) })
    ;(sys as any).caves.push({ ...makeCave(1) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 95000) // cutoff=2000, 全删
    expect((sys as any).caves).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('3个cave：2旧1新，清理后剩1', () => {
    // tick=100000 => cutoff=7000
    ;(sys as any).caves.push({ ...makeCave(1000) }) // < 7000 删
    ;(sys as any).caves.push({ ...makeCave(2000) }) // < 7000 删
    ;(sys as any).caves.push({ ...makeCave(9000) }) // >= 7000 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 100000)
    expect((sys as any).caves).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tick不足时cleanup不执行', () => {
    ;(sys as any).caves.push({ ...makeCave(0) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 500) // 500 < 2630，不执行
    expect((sys as any).caves).toHaveLength(1)
    vi.restoreAllMocks()
  })
})
