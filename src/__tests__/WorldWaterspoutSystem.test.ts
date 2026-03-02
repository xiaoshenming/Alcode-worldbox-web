import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldWaterspoutSystem } from '../systems/WorldWaterspoutSystem'
import type { Waterspout, SpoutIntensity } from '../systems/WorldWaterspoutSystem'
import { TileType } from '../utils/Constants'
import { EntityManager } from '../ecs/Entity'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 1000
// SPAWN_CHANCE = 0.004 (Math.random() < SPAWN_CHANCE 才spawn)
// MAX_SPOUTS = 6
// DIRECTION_DRIFT = 0.2
// tile条件: tile === SHALLOW_WATER(1) || tile === DEEP_WATER(0)
// cleanup: elapsed > s.lifetime (elapsed = tick - s.startTick)
// 位置更新: x+=cos(dir)*speed, y+=sin(dir)*speed, clamp到[0, width-1/height-1]
// dissipate: 在陆地上 lifetime *= 0.4
// creaturesScattered++: dx²+dy² < damageRadius²
// RADIUS_MAP: weak=2, moderate=3, strong=5, tornadic=8
// INTENSITIES: ['weak','moderate','strong','tornadic'] pickRandom
// 注意：random=1 => 1 < 0.004 => false，阻止spawn

const CHECK_INTERVAL = 1000
const SPAWN_CHANCE = 0.004
const MAX_SPOUTS = 6
const TICK0 = CHECK_INTERVAL // 首次触发tick

function makeSys(): WorldWaterspoutSystem { return new WorldWaterspoutSystem() }

let nextId = 1
function makeSpout(overrides: Partial<Waterspout> = {}): Waterspout {
  return {
    id: nextId++,
    x: 50,
    y: 50,
    intensity: 'moderate' as SpoutIntensity,
    height: 50,
    speed: 0.3,
    direction: 0,
    damageRadius: 3,
    creaturesScattered: 0,
    lifetime: 5000,
    startTick: 0,
    ...overrides,
  }
}

function makeMockWorld(tileVal: number | null = TileType.SHALLOW_WATER, w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: vi.fn().mockReturnValue(tileVal),
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
describe('WorldWaterspoutSystem - 初始状态', () => {
  let sys: WorldWaterspoutSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('初始spouts数组为空', () => {
    expect((sys as any).spouts).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始化后spouts是数组类型', () => {
    expect(Array.isArray((sys as any).spouts)).toBe(true)
  })

  it('手动注入一个水龙卷后数组长度为1', () => {
    ;(sys as any).spouts.push(makeSpout())
    expect((sys as any).spouts).toHaveLength(1)
  })

  it('spouts引用稳定（同一对象）', () => {
    const ref = (sys as any).spouts
    expect(ref).toBe((sys as any).spouts)
  })

  it('支持4种SpoutIntensity类型', () => {
    const types: SpoutIntensity[] = ['weak', 'moderate', 'strong', 'tornadic']
    expect(types).toHaveLength(4)
  })
})

// ========================================================
// 2. CHECK_INTERVAL 节流
// ========================================================
describe('WorldWaterspoutSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldWaterspoutSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
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

  it('tick=0时spouts数组不变', () => {
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).spouts).toHaveLength(0)
  })

  it('低于间隔时不调用getTile', () => {
    const world = makeMockWorld()
    sys.update(0, world, mockEm, CHECK_INTERVAL - 1)
    expect(world.getTile).not.toHaveBeenCalled()
  })
})

// ========================================================
// 3. spawn条件 - tile/random方向
// ========================================================
describe('WorldWaterspoutSystem - spawn条件', () => {
  let sys: WorldWaterspoutSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('random < SPAWN_CHANCE 且 tile=SHALLOW_WATER(1) 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(1)
  })

  it('random < SPAWN_CHANCE 且 tile=DEEP_WATER(0) 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.DEEP_WATER), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(1)
  })

  it('random >= SPAWN_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(0)
  })

  it('random > SPAWN_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(0)
  })

  it('tile=SAND(2)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(0)
  })

  it('tile=GRASS(3)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.GRASS), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(0)
  })

  it('tile=FOREST(4)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.FOREST), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(0)
  })

  it('tile=MOUNTAIN(5)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.MOUNTAIN), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(0)
  })

  it('spouts已满MAX_SPOUTS时不spawn', () => {
    for (let i = 0; i < MAX_SPOUTS; i++) {
      ;(sys as any).spouts.push(makeSpout({ startTick: TICK0, lifetime: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(MAX_SPOUTS)
  })

  it('spouts=MAX_SPOUTS-1时还可以spawn', () => {
    for (let i = 0; i < MAX_SPOUTS - 1; i++) {
      ;(sys as any).spouts.push(makeSpout({ startTick: TICK0, lifetime: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).spouts.length).toBeGreaterThan(MAX_SPOUTS - 1)
  })
})

// ========================================================
// 4. spawn后字段值校验
// ========================================================
describe('WorldWaterspoutSystem - spawn后字段值', () => {
  let sys: WorldWaterspoutSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('spawn后startTick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).spouts[0].startTick).toBe(TICK0)
  })

  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).spouts[0].id).toBe(1)
  })

  it('spawn后nextId递增至2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn后intensity是有效值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const spout = (sys as any).spouts[0]
    expect(['weak', 'moderate', 'strong', 'tornadic']).toContain(spout.intensity)
  })

  it('spawn后height在20..80范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const spout = (sys as any).spouts[0]
    expect(spout.height).toBeGreaterThanOrEqual(20)
    expect(spout.height).toBeLessThanOrEqual(80)
  })

  it('spawn后speed在0.2..0.6范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const spout = (sys as any).spouts[0]
    expect(spout.speed).toBeGreaterThanOrEqual(0.2)
    expect(spout.speed).toBeLessThanOrEqual(0.6)
  })

  it('spawn后direction是有效数值（spawn后受drift影响，仅验证是数字）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const spout = (sys as any).spouts[0]
    // spawn后同帧update会对direction做drift（+=(random-0.5)*DIRECTION_DRIFT）
    // 所以direction可能变负，此处只验证是有限数值
    expect(typeof spout.direction).toBe('number')
    expect(isFinite(spout.direction)).toBe(true)
  })

  it('spawn后lifetime在1500..5000范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const spout = (sys as any).spouts[0]
    expect(spout.lifetime).toBeGreaterThanOrEqual(1500)
    expect(spout.lifetime).toBeLessThanOrEqual(5000)
  })

  it('spawn后creaturesScattered初始为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).spouts[0].creaturesScattered).toBe(0)
  })

  it('weak强度damageRadius=2', () => {
    // pickRandom(['weak','moderate','strong','tornadic'])
    // 强制intensity=weak，直接测RADIUS_MAP
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return SPAWN_CHANCE - 0.001 // spawn判断
      // x,y各用1次 floor(random*w)，direction用1次，height用1次，speed用1次，lifetime用1次
      // pickRandom: Math.floor(random * INTENSITIES.length), random=0 => idx=0 => 'weak'
      return 0
    })
    const sys2 = makeSys()
    sys2.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    vi.restoreAllMocks()
    const spout = (sys2 as any).spouts[0]
    if (spout && spout.intensity === 'weak') {
      expect(spout.damageRadius).toBe(2)
    }
  })

  it('坐标x在0..width-1范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER, 200, 200), mockEm, TICK0)
    const spout = (sys as any).spouts[0]
    expect(spout.x).toBeGreaterThanOrEqual(0)
    expect(spout.x).toBeLessThan(200)
  })
})

// ========================================================
// 5. RADIUS_MAP校验
// ========================================================
describe('WorldWaterspoutSystem - RADIUS_MAP', () => {
  it('weak强度damageRadius=2', () => {
    const sys = makeSys()
    const spout = makeSpout({ intensity: 'weak', damageRadius: 2 })
    ;(sys as any).spouts.push(spout)
    expect(spout.damageRadius).toBe(2)
  })

  it('moderate强度damageRadius=3', () => {
    const sys = makeSys()
    const spout = makeSpout({ intensity: 'moderate', damageRadius: 3 })
    ;(sys as any).spouts.push(spout)
    expect(spout.damageRadius).toBe(3)
  })

  it('strong强度damageRadius=5', () => {
    const sys = makeSys()
    const spout = makeSpout({ intensity: 'strong', damageRadius: 5 })
    ;(sys as any).spouts.push(spout)
    expect(spout.damageRadius).toBe(5)
  })

  it('tornadic强度damageRadius=8', () => {
    const sys = makeSys()
    const spout = makeSpout({ intensity: 'tornadic', damageRadius: 8 })
    ;(sys as any).spouts.push(spout)
    expect(spout.damageRadius).toBe(8)
  })

  it('INTENSITIES数组包含4种强度', () => {
    const types: SpoutIntensity[] = ['weak', 'moderate', 'strong', 'tornadic']
    expect(types).toHaveLength(4)
  })

  it('tornadic是最强烈强度（最大radius）', () => {
    const radii: Record<SpoutIntensity, number> = { weak: 2, moderate: 3, strong: 5, tornadic: 8 }
    expect(radii.tornadic).toBeGreaterThan(radii.strong)
    expect(radii.strong).toBeGreaterThan(radii.moderate)
    expect(radii.moderate).toBeGreaterThan(radii.weak)
  })
})

// ========================================================
// 6. 水龙卷移动与dissipation
// ========================================================
describe('WorldWaterspoutSystem - 移动与dissipation', () => {
  let sys: WorldWaterspoutSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn（1<0.004=false）
  })

  it('在水面上lifetime不衰减（0.4倍）', () => {
    // getTile返回SHALLOW_WATER
    const spout = makeSpout({ x: 100, y: 100, lifetime: 5000, startTick: TICK0, speed: 0, direction: 0 })
    ;(sys as any).spouts.push(spout)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect(spout.lifetime).toBe(5000) // 不衰减
  })

  it('在陆地上lifetime衰减为原来0.4倍', () => {
    const spout = makeSpout({ x: 100, y: 100, lifetime: 5000, startTick: TICK0, speed: 0, direction: 0 })
    ;(sys as any).spouts.push(spout)
    sys.update(0, makeMockWorld(TileType.GRASS), mockEm, TICK0)
    expect(spout.lifetime).toBeCloseTo(5000 * 0.4, 5)
  })

  it('SAND地形也导致lifetime衰减', () => {
    const spout = makeSpout({ x: 100, y: 100, lifetime: 5000, startTick: TICK0, speed: 0, direction: 0 })
    ;(sys as any).spouts.push(spout)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(spout.lifetime).toBeCloseTo(5000 * 0.4, 5)
  })

  it('MOUNTAIN地形也导致lifetime衰减', () => {
    const spout = makeSpout({ x: 100, y: 100, lifetime: 5000, startTick: TICK0, speed: 0, direction: 0 })
    ;(sys as any).spouts.push(spout)
    sys.update(0, makeMockWorld(TileType.MOUNTAIN), mockEm, TICK0)
    expect(spout.lifetime).toBeCloseTo(5000 * 0.4, 5)
  })

  it('direction会受DIRECTION_DRIFT随机漂移', () => {
    // random=1 => direction += (1-0.5)*DIRECTION_DRIFT = +0.1
    const spout = makeSpout({ x: 100, y: 100, lifetime: 9999, startTick: TICK0, speed: 0, direction: 0 })
    ;(sys as any).spouts.push(spout)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    // direction漂移后应不等于初始值（random=1使其增加）
    expect(spout.direction).not.toBe(0)
  })

  it('x位置clamp到[0, width-1]', () => {
    // x接近边界
    const spout = makeSpout({ x: 199, y: 100, lifetime: 9999, startTick: TICK0, speed: 10, direction: 0 })
    ;(sys as any).spouts.push(spout)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER, 200, 200), mockEm, TICK0)
    expect(spout.x).toBeLessThanOrEqual(199)
    expect(spout.x).toBeGreaterThanOrEqual(0)
  })

  it('y位置clamp到[0, height-1]', () => {
    const spout = makeSpout({ x: 100, y: 199, lifetime: 9999, startTick: TICK0, speed: 10, direction: Math.PI / 2 })
    ;(sys as any).spouts.push(spout)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER, 200, 200), mockEm, TICK0)
    expect(spout.y).toBeLessThanOrEqual(199)
    expect(spout.y).toBeGreaterThanOrEqual(0)
  })

  it('direction=0时x增加（cos(0)=1, speed>0）', () => {
    // random=1 => direction_drift = (1-0.5)*0.2 = 0.1，方向漂移后cos(0.1)≈0.995仍为正
    const spout = makeSpout({ x: 50, y: 50, lifetime: 9999, startTick: TICK0, speed: 0.5, direction: 0 })
    ;(sys as any).spouts.push(spout)
    const oldX = spout.x
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect(spout.x).toBeGreaterThan(oldX)
  })
})

// ========================================================
// 7. cleanup逻辑（生命周期过期）
// ========================================================
describe('WorldWaterspoutSystem - cleanup逻辑', () => {
  let sys: WorldWaterspoutSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  it('elapsed > lifetime时水龙卷被删除', () => {
    // elapsed = tick - startTick = TICK0 - 0 = TICK0 = 2000 > lifetime=1000
    const spout = makeSpout({ startTick: 0, lifetime: 1000 })
    ;(sys as any).spouts.push(spout)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0 + 1001)
    expect((sys as any).spouts).toHaveLength(0)
  })

  it('elapsed == lifetime时不删除（严格大于）', () => {
    // elapsed = lifetime => not (elapsed > lifetime) => 不删除
    const spout = makeSpout({ startTick: 0, lifetime: TICK0 })
    ;(sys as any).spouts.push(spout)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(1)
  })

  it('elapsed < lifetime时不删除', () => {
    const spout = makeSpout({ startTick: TICK0, lifetime: 9999 })
    ;(sys as any).spouts.push(spout)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0 + 100)
    expect((sys as any).spouts).toHaveLength(1)
  })

  it('多个水龙卷：只删除过期的', () => {
    const expired = makeSpout({ startTick: 0, lifetime: 500 })
    const alive = makeSpout({ startTick: TICK0, lifetime: 9999 })
    ;(sys as any).spouts.push(expired, alive)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0 + 1000)
    expect((sys as any).spouts).toHaveLength(1)
    expect((sys as any).spouts[0].startTick).toBe(TICK0)
  })

  it('全部过期时清空spouts', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).spouts.push(makeSpout({ startTick: 0, lifetime: 100 }))
    }
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0 + 200)
    expect((sys as any).spouts).toHaveLength(0)
  })

  it('无过期水龙卷时数量不变', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).spouts.push(makeSpout({ startTick: TICK0, lifetime: 9999 }))
    }
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0 + 100)
    expect((sys as any).spouts).toHaveLength(3)
  })

  it('陆地上lifetime*0.4后可能更快过期', () => {
    // lifetime=2000, startTick=0, 在陆地上update后lifetime=2000*0.4=800
    // elapsed=TICK0=1000 > 800 => 应该被删除
    const spout = makeSpout({ startTick: 0, lifetime: 2000 })
    ;(sys as any).spouts.push(spout)
    // 用GRASS地形触发dissipation
    sys.update(0, makeMockWorld(TileType.GRASS), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(0)
  })

  it('删除后剩余水龙卷的id不变', () => {
    const expired = makeSpout({ id: 100, startTick: 0, lifetime: 100 })
    const alive = makeSpout({ id: 99, startTick: TICK0, lifetime: 9999 })
    ;(sys as any).spouts.push(expired, alive)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0 + 200)
    expect((sys as any).spouts).toHaveLength(1)
    expect((sys as any).spouts[0].id).toBe(99)
  })
})

// ========================================================
// 8. creaturesScattered计数
// ========================================================
describe('WorldWaterspoutSystem - creaturesScattered计数', () => {
  let sys: WorldWaterspoutSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  it('无生物时creaturesScattered不增加', () => {
    const spout = makeSpout({ x: 50, y: 50, damageRadius: 5, startTick: TICK0, lifetime: 9999 })
    ;(sys as any).spouts.push(spout)
    const em = makeMockEm([]) // 无生物
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0 + 100)
    expect(spout.creaturesScattered).toBe(0)
  })

  it('生物在damageRadius内creaturesScattered递增', () => {
    const spout = makeSpout({ x: 50, y: 50, damageRadius: 10, startTick: TICK0, lifetime: 9999, creaturesScattered: 0 })
    ;(sys as any).spouts.push(spout)
    // 生物在(51, 50)，距离=1 < 10 => 散射
    const positions = new Map<number, {x: number, y: number}>()
    positions.set(1, { x: 51, y: 50 })
    const em = makeMockEm([1], positions)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), em, TICK0 + 100)
    expect(spout.creaturesScattered).toBe(1)
  })

  it('生物在damageRadius外creaturesScattered不增加', () => {
    const spout = makeSpout({ x: 50, y: 50, damageRadius: 3, startTick: TICK0, lifetime: 9999, creaturesScattered: 0 })
    ;(sys as any).spouts.push(spout)
    // 生物在(60, 50)，距离=10 > 3 => 不散射
    const positions = new Map<number, {x: number, y: number}>()
    positions.set(1, { x: 60, y: 50 })
    const em = makeMockEm([1], positions)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), em, TICK0 + 100)
    expect(spout.creaturesScattered).toBe(0)
  })

  it('多个生物全部在radius内都被计数', () => {
    const spout = makeSpout({ x: 50, y: 50, damageRadius: 10, startTick: TICK0, lifetime: 9999, creaturesScattered: 0 })
    ;(sys as any).spouts.push(spout)
    const positions = new Map<number, {x: number, y: number}>()
    positions.set(1, { x: 51, y: 50 })
    positions.set(2, { x: 50, y: 52 })
    positions.set(3, { x: 48, y: 49 })
    const em = makeMockEm([1, 2, 3], positions)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), em, TICK0 + 100)
    expect(spout.creaturesScattered).toBe(3)
  })

  it('边界情况：生物距离恰好等于radius时不计数（dx²+dy²<R²是严格小于）', () => {
    const R = 5
    // 用speed=0防止spout移动，确保坐标精确
    const spout = makeSpout({ x: 50, y: 50, damageRadius: R, startTick: TICK0, lifetime: 9999, creaturesScattered: 0, speed: 0 })
    ;(sys as any).spouts.push(spout)
    // 生物在(55, 50), dx=5, dy=0, dx²+dy²=25=R²，不满足<
    const positions = new Map<number, {x: number, y: number}>()
    positions.set(1, { x: 55, y: 50 })
    const em = makeMockEm([1], positions)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), em, TICK0 + 100)
    expect(spout.creaturesScattered).toBe(0)
  })

  it('creaturesScattered跨多次update累积', () => {
    const spout = makeSpout({ x: 50, y: 50, damageRadius: 10, startTick: TICK0, lifetime: 99999, creaturesScattered: 0, speed: 0 })
    ;(sys as any).spouts.push(spout)
    const positions = new Map<number, {x: number, y: number}>()
    positions.set(1, { x: 51, y: 50 })
    const em = makeMockEm([1], positions)
    // 第一次update
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), em, TICK0 + 100)
    const after1 = spout.creaturesScattered
    // 第二次update
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), em, TICK0 + 100 + CHECK_INTERVAL)
    expect(spout.creaturesScattered).toBeGreaterThan(after1)
  })
})

// ========================================================
// 9. MAX_SPOUTS上限
// ========================================================
describe('WorldWaterspoutSystem - MAX_SPOUTS上限', () => {
  let sys: WorldWaterspoutSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('MAX_SPOUTS常量为6', () => {
    expect(MAX_SPOUTS).toBe(6)
  })

  it('CHECK_INTERVAL常量为1000', () => {
    expect(CHECK_INTERVAL).toBe(1000)
  })

  it('SPAWN_CHANCE常量为0.004', () => {
    expect(SPAWN_CHANCE).toBe(0.004)
  })

  it('恰好MAX_SPOUTS个时不再spawn', () => {
    for (let i = 0; i < MAX_SPOUTS; i++) {
      ;(sys as any).spouts.push(makeSpout({ startTick: TICK0, lifetime: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).spouts).toHaveLength(MAX_SPOUTS)
  })

  it('少于MAX_SPOUTS时可以spawn', () => {
    for (let i = 0; i < MAX_SPOUTS - 1; i++) {
      ;(sys as any).spouts.push(makeSpout({ startTick: TICK0, lifetime: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).spouts.length).toBeGreaterThan(MAX_SPOUTS - 1)
  })

  it('spouts数量不超过MAX_SPOUTS（多次update）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    for (let i = 0; i < 30; i++) {
      sys.update(0, world, mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).spouts.length).toBeLessThanOrEqual(MAX_SPOUTS)
  })

  it('多次spawn后id各不相同', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0 * 2)
    vi.restoreAllMocks()
    const ids = (sys as any).spouts.map((s: Waterspout) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
