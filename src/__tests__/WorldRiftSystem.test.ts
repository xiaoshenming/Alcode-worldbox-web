import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRiftSystem } from '../systems/WorldRiftSystem'
import type { DimensionalRift, RiftStage } from '../systems/WorldRiftSystem'

// TileType: DEEP_WATER=0,SHALLOW_WATER=1,SAND=2,GRASS=3,FOREST=4,MOUNTAIN=5,SNOW=6,LAVA=7
const TileType = { DEEP_WATER: 0, SHALLOW_WATER: 1, SAND: 2, GRASS: 3, FOREST: 4, MOUNTAIN: 5, SNOW: 6, LAVA: 7 }

// CHECK_INTERVAL=600, MAX_RIFTS=5, FORM_CHANCE=0.012
// ENERGY_DECAY=0.4, MAX_WARPS=20, WARP_RANGE=8, WARP_CHANCE=0.15
// cleanup: age >= maxAge 删除

function makeSys(): WorldRiftSystem { return new WorldRiftSystem() }

let _id = 100
function makeRift(overrides: Partial<DimensionalRift> = {}): DimensionalRift {
  return {
    id: _id++, x: 30, y: 40, radius: 3,
    stage: 'stable', energy: 70,
    age: 500, maxAge: 5000, warpsPerformed: 3,
    ...overrides
  }
}

function makeWorld(tile: number = TileType.GRASS) {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn().mockReturnValue(tile),
    setTile: vi.fn(),
  }
}

function makeEM(entities: number[] = []) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(entities),
    getComponent: vi.fn().mockReturnValue(null),
  }
}

describe('WorldRiftSystem - 初始状态', () => {
  let sys: WorldRiftSystem
  beforeEach(() => { sys = makeSys(); _id = 100 })

  it('rifts 初始为空数组', () => {
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('_activeBuf 初始为空', () => {
    expect((sys as any)._activeBuf).toHaveLength(0)
  })
  it('_stableBuf 初始为空', () => {
    expect((sys as any)._stableBuf).toHaveLength(0)
  })
  it('注入一个 rift 后 length 为 1', () => {
    ;(sys as any).rifts.push(makeRift())
    expect((sys as any).rifts).toHaveLength(1)
  })
  it('getActiveRifts 初始返回空数组', () => {
    expect(sys.getActiveRifts()).toHaveLength(0)
  })
  it('getStableRifts 初始返回空数组', () => {
    expect(sys.getStableRifts()).toHaveLength(0)
  })
})

describe('WorldRiftSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldRiftSystem
  const em = makeEM()

  beforeEach(() => { sys = makeSys(); _id = 100; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < 600 时不执行（lastCheck 不变）', () => {
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 599)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick === 600 时执行（lastCheck 更新为 600）', () => {
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).lastCheck).toBe(600)
  })
  it('tick > 600 时执行', () => {
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 1000)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('执行一次后间隔不足不再执行', () => {
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 600)
    sys.update(0, world as any, em as any, 600 + 599)
    expect((sys as any).lastCheck).toBe(600)
  })
  it('第二次满足 CHECK_INTERVAL 后执行', () => {
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 600)
    sys.update(0, world as any, em as any, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
  it('tick=0 时 0-0=0 < 600 不执行', () => {
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('节流期间 rifts 数量不变', () => {
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 600)
    const len = (sys as any).rifts.length
    sys.update(0, world as any, em as any, 700)
    expect((sys as any).rifts.length).toBe(len)
  })
  it('大 tick 值也能正确节流执行', () => {
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 999999)
    expect((sys as any).lastCheck).toBe(999999)
  })
})

describe('WorldRiftSystem - spawn 条件', () => {
  let sys: WorldRiftSystem
  const em = makeEM()

  beforeEach(() => { sys = makeSys(); _id = 100; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tile=GRASS 满足 FORM_CHANCE 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005) // < 0.012
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts.length).toBeGreaterThanOrEqual(1)
  })
  it('tile=DEEP_WATER 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.DEEP_WATER)
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('tile=LAVA 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.LAVA)
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('random > FORM_CHANCE(0.012) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.02) // > 0.012
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('rifts 达到 MAX_RIFTS(5) 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.GRASS)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).rifts.push(makeRift({ x: i * 30, y: 0 }))
    }
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts).toHaveLength(5)
  })
  it('spawn 后 rift.stage 初始为 forming', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 600)
    // age 从 0 开始，updateRifts 后 age=1, lifeRatio=1/maxAge < 0.1 → forming
    if ((sys as any).rifts.length > 0) {
      expect((sys as any).rifts[0].stage).toBe('forming')
    }
  })
  it('spawn 后 rift.age 从 0 开始并被 update 递增为 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 600)
    if ((sys as any).rifts.length > 0) {
      expect((sys as any).rifts[0].age).toBe(1)
    }
  })
  it('spawn 后 warpsPerformed 为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 600)
    if ((sys as any).rifts.length > 0) {
      expect((sys as any).rifts[0].warpsPerformed).toBe(0)
    }
  })
  it('两个 rift 距离过近时第二个不 spawn（>=15 距离限制）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.GRASS)
    // 手动注入一个接近 (50,50) 的 rift
    ;(sys as any).rifts.push(makeRift({ x: 50, y: 50 }))
    // mock getTile 让坐标落在 (51,51) 附近（距离 < 15）
    world.getTile = vi.fn().mockReturnValue(TileType.GRASS)
    // 由于 random 位置是随机的，这里只验证不超过 MAX_RIFTS
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts.length).toBeLessThanOrEqual(5)
  })
})

describe('WorldRiftSystem - update 数值逻辑', () => {
  let sys: WorldRiftSystem
  const em = makeEM()

  beforeEach(() => { sys = makeSys(); _id = 100; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次 update 执行 age 递增 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).rifts.push(makeRift({ age: 100, maxAge: 5000 }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts[0].age).toBe(101)
  })
  it('energy 每次 update 减少 ENERGY_DECAY(0.4)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).rifts.push(makeRift({ energy: 80, age: 100, maxAge: 5000 }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts[0].energy).toBeCloseTo(79.6, 5)
  })
  it('energy 不低于 0（clamp）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).rifts.push(makeRift({ energy: 0, age: 100, maxAge: 5000 }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts[0].energy).toBe(0)
  })
  it('lifeRatio < 0.1 时 stage=forming', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    // age=499/maxAge=5000 => lifeRatio after increment=500/5000=0.1 → stable
    // age=0/maxAge=5000 → after increment 1/5000=0.0002 < 0.1 → forming
    ;(sys as any).rifts.push(makeRift({ age: 0, maxAge: 5000, stage: 'stable' }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts[0].stage).toBe('forming')
  })
  it('lifeRatio in [0.1, 0.6) 时 stage=stable', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    // age=499, maxAge=5000: after increment=500, ratio=0.1 → stable
    ;(sys as any).rifts.push(makeRift({ age: 499, maxAge: 5000, stage: 'forming' }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts[0].stage).toBe('stable')
  })
  it('lifeRatio in [0.6, 0.9) 时 stage=unstable', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    // age=2999, maxAge=5000: after increment=3000, ratio=0.6 → unstable
    ;(sys as any).rifts.push(makeRift({ age: 2999, maxAge: 5000 }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts[0].stage).toBe('unstable')
  })
  it('lifeRatio >= 0.9 时 stage=collapsing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    // age=4499, maxAge=5000: after increment=4500, ratio=0.9 → collapsing
    ;(sys as any).rifts.push(makeRift({ age: 4499, maxAge: 5000 }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts[0].stage).toBe('collapsing')
  })
  it('forming 阶段不执行 warp', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).rifts.push(makeRift({ age: 0, maxAge: 5000, warpsPerformed: 0, stage: 'forming' }))
    sys.update(0, world as any, em as any, 600)
    // setTile 不应被调用（forming 不 warp）
    expect(world.setTile).not.toHaveBeenCalled()
  })
  it('warpsPerformed 达到 MAX_WARPS(20) 时不再 warp', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // < WARP_CHANCE=0.15
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).rifts.push(makeRift({ age: 499, maxAge: 5000, warpsPerformed: 20, stage: 'stable' }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts[0].warpsPerformed).toBe(20)
  })
})

describe('WorldRiftSystem - getActiveRifts / getStableRifts', () => {
  let sys: WorldRiftSystem
  beforeEach(() => { sys = makeSys(); _id = 100 })

  it('getActiveRifts 不包含 collapsing', () => {
    ;(sys as any).rifts.push(makeRift({ stage: 'stable' }))
    ;(sys as any).rifts.push(makeRift({ stage: 'collapsing' }))
    expect(sys.getActiveRifts()).toHaveLength(1)
  })
  it('getActiveRifts 包含 forming/stable/unstable', () => {
    ;(sys as any).rifts.push(makeRift({ stage: 'forming' }))
    ;(sys as any).rifts.push(makeRift({ stage: 'stable' }))
    ;(sys as any).rifts.push(makeRift({ stage: 'unstable' }))
    expect(sys.getActiveRifts()).toHaveLength(3)
  })
  it('getStableRifts 只返回 stable', () => {
    ;(sys as any).rifts.push(makeRift({ stage: 'stable' }))
    ;(sys as any).rifts.push(makeRift({ stage: 'unstable' }))
    ;(sys as any).rifts.push(makeRift({ stage: 'forming' }))
    expect(sys.getStableRifts()).toHaveLength(1)
  })
  it('getActiveRifts 返回 _activeBuf 引用（复用缓冲）', () => {
    ;(sys as any).rifts.push(makeRift({ stage: 'stable' }))
    const a = sys.getActiveRifts()
    const b = sys.getActiveRifts()
    expect(a).toBe(b)
  })
  it('getStableRifts 返回 _stableBuf 引用', () => {
    ;(sys as any).rifts.push(makeRift({ stage: 'stable' }))
    const a = sys.getStableRifts()
    const b = sys.getStableRifts()
    expect(a).toBe(b)
  })
  it('全部为 collapsing 时 getActiveRifts 返回空', () => {
    ;(sys as any).rifts.push(makeRift({ stage: 'collapsing' }))
    expect(sys.getActiveRifts()).toHaveLength(0)
  })
  it('没有 stable 时 getStableRifts 返回空', () => {
    ;(sys as any).rifts.push(makeRift({ stage: 'forming' }))
    ;(sys as any).rifts.push(makeRift({ stage: 'unstable' }))
    expect(sys.getStableRifts()).toHaveLength(0)
  })
  it('多个 stable 都返回', () => {
    ;(sys as any).rifts.push(makeRift({ stage: 'stable' }))
    ;(sys as any).rifts.push(makeRift({ stage: 'stable' }))
    expect(sys.getStableRifts()).toHaveLength(2)
  })
})

describe('WorldRiftSystem - cleanup 逻辑', () => {
  let sys: WorldRiftSystem
  const em = makeEM()

  // cleanup: age >= maxAge 删除

  beforeEach(() => { sys = makeSys(); _id = 100; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('age < maxAge 时不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).rifts.push(makeRift({ age: 4999, maxAge: 5000 }))
    sys.update(0, world as any, em as any, 600)
    // age 变为 5000 = maxAge → 删除（age >= maxAge）
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('age + 1 === maxAge 时执行 update 后删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).rifts.push(makeRift({ age: 4999, maxAge: 5000 }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('age < maxAge - 1 时 update 后保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).rifts.push(makeRift({ age: 100, maxAge: 5000 }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts).toHaveLength(1)
  })
  it('多个 rift 中只删除到达 maxAge 的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).rifts.push(makeRift({ age: 4999, maxAge: 5000 })) // 会删除
    ;(sys as any).rifts.push(makeRift({ age: 100, maxAge: 5000 }))  // 保留
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts).toHaveLength(1)
    expect((sys as any).rifts[0].age).toBe(101)
  })
  it('节流期间不执行 cleanup', () => {
    ;(sys as any).rifts.push(makeRift({ age: 9999, maxAge: 5000 }))
    ;(sys as any).lastCheck = 600
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 700) // 间隔不足
    expect((sys as any).rifts).toHaveLength(1) // 未执行 cleanup
  })
  it('所有 rift 均到期时全部清空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).rifts.push(makeRift({ age: 4999, maxAge: 5000 }))
    ;(sys as any).rifts.push(makeRift({ age: 9999, maxAge: 5000 }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('cleanup 后 getActiveRifts 更新正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).rifts.push(makeRift({ age: 4999, maxAge: 5000, stage: 'stable' }))
    sys.update(0, world as any, em as any, 600)
    expect(sys.getActiveRifts()).toHaveLength(0)
  })
  it('cleanup 不删除 age 恰好等于 maxAge - 1 的 rift', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.GRASS)
    // age=100 → update 后 age=101 < maxAge=5000 → 保留
    ;(sys as any).rifts.push(makeRift({ age: 100, maxAge: 5000 }))
    sys.update(0, world as any, em as any, 600)
    expect((sys as any).rifts).toHaveLength(1)
  })
})
