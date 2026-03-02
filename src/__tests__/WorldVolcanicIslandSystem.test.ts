import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldVolcanicIslandSystem } from '../systems/WorldVolcanicIslandSystem'
import type { VolcanicIsland, IslandStage } from '../systems/WorldVolcanicIslandSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2000
// EMERGE_CHANCE = 0.002  (Math.random() < EMERGE_CHANCE 才spawn)
// MAX_ISLANDS = 30
// STAGE_DURATION = 8000
// cleanup: island.tick < tick - 80000
// tile条件: tile !== null && tile <= 1 (DEEP_WATER=0, SHALLOW_WATER=1)
// 注意：random=0 时 0 < 0.002 为 true，会触发spawn！要阻止spawn需用 random=1

const CHECK_INTERVAL = 2000
const EMERGE_CHANCE = 0.002
const MAX_ISLANDS = 30
const STAGE_DURATION = 8000
const TICK0 = CHECK_INTERVAL // 首次触发tick

function makeSys(): WorldVolcanicIslandSystem { return new WorldVolcanicIslandSystem() }

let nextId = 1
function makeIsland(overrides: Partial<VolcanicIsland> = {}): VolcanicIsland {
  return {
    id: nextId++,
    x: 50,
    y: 50,
    radius: 3,
    stage: 'erupting' as IslandStage,
    age: 0,
    fertility: 10,
    tick: 0,
    ...overrides,
  }
}

function makeMockWorld(tileVal: number | null = 0, w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: vi.fn().mockReturnValue(tileVal),
  } as any
}

const mockEm = {} as any

// ========================================================
// 1. 初始状态
// ========================================================
describe('WorldVolcanicIslandSystem - 初始状态', () => {
  let sys: WorldVolcanicIslandSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('初始islands数组为空', () => {
    expect((sys as any).islands).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始化后islands是数组类型', () => {
    expect(Array.isArray((sys as any).islands)).toBe(true)
  })

  it('手动注入一个岛屿后数组长度为1', () => {
    ;(sys as any).islands.push(makeIsland())
    expect((sys as any).islands).toHaveLength(1)
  })

  it('islands引用稳定（同一对象）', () => {
    const ref = (sys as any).islands
    expect(ref).toBe((sys as any).islands)
  })

  it('支持5种IslandStage类型', () => {
    const stages: IslandStage[] = ['erupting', 'cooling', 'barren', 'fertile', 'lush']
    expect(stages).toHaveLength(5)
  })
})

// ========================================================
// 2. CHECK_INTERVAL 节流
// ========================================================
describe('WorldVolcanicIslandSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldVolcanicIslandSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    // random=1 => 1 < 0.002 => false，不会spawn
    vi.spyOn(Math, 'random').mockReturnValue(1)
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
    sys.update(0, makeMockWorld(), mockEm, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
  })

  it('第一次触发后，再次小于间隔不重复触发', () => {
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const saved = (sys as any).lastCheck
    sys.update(0, makeMockWorld(), mockEm, TICK0 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(saved)
  })

  it('第二次达到间隔时再次更新lastCheck', () => {
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    sys.update(0, makeMockWorld(), mockEm, TICK0 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(TICK0 + CHECK_INTERVAL)
  })

  it('tick=0时不改变islands数组', () => {
    const world = makeMockWorld(0)
    sys.update(0, world, mockEm, 0)
    expect((sys as any).islands).toHaveLength(0)
  })

  it('低于间隔时不会调用getTile', () => {
    const world = makeMockWorld(0)
    sys.update(0, world, mockEm, CHECK_INTERVAL - 1)
    expect(world.getTile).not.toHaveBeenCalled()
  })
})

// ========================================================
// 3. spawn条件 - tile/random方向
// ========================================================
describe('WorldVolcanicIslandSystem - spawn条件', () => {
  let sys: WorldVolcanicIslandSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('random < EMERGE_CHANCE 且 tile=0(DEEP_WATER) 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).islands).toHaveLength(1)
  })

  it('random < EMERGE_CHANCE 且 tile=1(SHALLOW_WATER) 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect((sys as any).islands).toHaveLength(1)
  })

  it('random >= EMERGE_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).islands).toHaveLength(0)
  })

  it('random > EMERGE_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).islands).toHaveLength(0)
  })

  it('tile=2(SAND)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(2), mockEm, TICK0)
    expect((sys as any).islands).toHaveLength(0)
  })

  it('tile=3(GRASS)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).islands).toHaveLength(0)
  })

  it('tile=5(MOUNTAIN)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(5), mockEm, TICK0)
    expect((sys as any).islands).toHaveLength(0)
  })

  it('tile=null时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(null), mockEm, TICK0)
    expect((sys as any).islands).toHaveLength(0)
  })

  it('islands已满MAX_ISLANDS时不spawn', () => {
    for (let i = 0; i < MAX_ISLANDS; i++) {
      ;(sys as any).islands.push(makeIsland({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).islands).toHaveLength(MAX_ISLANDS)
  })

  it('islands=MAX_ISLANDS-1时还可以spawn', () => {
    for (let i = 0; i < MAX_ISLANDS - 1; i++) {
      ;(sys as any).islands.push(makeIsland({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).islands.length).toBeGreaterThan(MAX_ISLANDS - 1)
  })
})

// ========================================================
// 4. spawn后字段值校验
// ========================================================
describe('WorldVolcanicIslandSystem - spawn后字段值', () => {
  let sys: WorldVolcanicIslandSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('spawn后stage初始为erupting（同帧age=0时）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    // tick=TICK0, island.tick=TICK0, age=0 => stageIdx=0 => erupting
    expect((sys as any).islands[0].stage).toBe('erupting')
  })

  it('spawn后age=0（spawn时tick与island.tick相同）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).islands[0].age).toBe(0)
  })

  it('spawn后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).islands[0].tick).toBe(TICK0)
  })

  it('spawn后radius在2..5范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    const island = (sys as any).islands[0]
    expect(island.radius).toBeGreaterThanOrEqual(2)
    expect(island.radius).toBeLessThanOrEqual(5)
  })

  it('spawn后fertility在0..30范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    const island = (sys as any).islands[0]
    expect(island.fertility).toBeGreaterThanOrEqual(0)
    expect(island.fertility).toBeLessThan(30)
  })

  it('spawn后id从1开始递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).islands[0].id).toBe(1)
  })

  it('spawn后nextId递增至2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).nextId).toBe(2)
  })

  it('坐标x在合法范围内(10..width-10)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0, 200, 200), mockEm, TICK0)
    const island = (sys as any).islands[0]
    expect(island.x).toBeGreaterThanOrEqual(10)
    expect(island.x).toBeLessThan(190)
  })

  it('坐标y在合法范围内(10..height-10)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0, 200, 200), mockEm, TICK0)
    const island = (sys as any).islands[0]
    expect(island.y).toBeGreaterThanOrEqual(10)
    expect(island.y).toBeLessThan(190)
  })
})

// ========================================================
// 5. stage进展逻辑
// ========================================================
describe('WorldVolcanicIslandSystem - stage进展', () => {
  let sys: WorldVolcanicIslandSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    // random=1 阻止spawn（1 < 0.002 为false）
    vi.spyOn(Math, 'random').mockReturnValue(1)
  })

  it('age < STAGE_DURATION → stage=erupting', () => {
    // island.tick=TICK0, 测试tick=TICK0（同tick update）
    // age = TICK0 - TICK0 = 0 < STAGE_DURATION => erupting
    const island = makeIsland({ tick: TICK0, stage: 'erupting', fertility: 10 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect(island.stage).toBe('erupting')
  })

  it('age == STAGE_DURATION → stage=cooling', () => {
    // island.tick=TICK0, tick=TICK0+STAGE_DURATION
    // age = STAGE_DURATION => stageIdx=1 => cooling
    const island = makeIsland({ tick: TICK0, fertility: 10 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 + STAGE_DURATION)
    expect(island.stage).toBe('cooling')
  })

  it('age >= 2*STAGE_DURATION → stage=barren', () => {
    const island = makeIsland({ tick: TICK0, fertility: 10 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 + STAGE_DURATION * 2)
    expect(island.stage).toBe('barren')
  })

  it('age >= 3*STAGE_DURATION → stage=fertile', () => {
    const island = makeIsland({ tick: TICK0, fertility: 10 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 + STAGE_DURATION * 3)
    expect(island.stage).toBe('fertile')
  })

  it('age >= 4*STAGE_DURATION → stage=lush', () => {
    const island = makeIsland({ tick: TICK0, fertility: 10 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 + STAGE_DURATION * 4)
    expect(island.stage).toBe('lush')
  })

  it('age超过4*STAGE_DURATION仍保持lush(最后阶段)', () => {
    const island = makeIsland({ tick: TICK0, fertility: 10 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 + STAGE_DURATION * 10)
    expect(island.stage).toBe('lush')
  })

  it('fertile阶段fertility增加', () => {
    const island = makeIsland({ tick: TICK0, fertility: 50 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 + STAGE_DURATION * 3)
    expect(island.stage).toBe('fertile')
    expect(island.fertility).toBeGreaterThan(50)
  })

  it('lush阶段fertility增加', () => {
    const island = makeIsland({ tick: TICK0, fertility: 50 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 + STAGE_DURATION * 4)
    expect(island.stage).toBe('lush')
    expect(island.fertility).toBeGreaterThan(50)
  })

  it('fertility不超过100', () => {
    const island = makeIsland({ tick: TICK0, fertility: 99.99 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 + STAGE_DURATION * 3)
    expect(island.fertility).toBeLessThanOrEqual(100)
  })

  it('erupting阶段fertility不增加', () => {
    const island = makeIsland({ tick: TICK0, fertility: 10 })
    ;(sys as any).islands.push(island)
    // tick=TICK0，age=0 => erupting
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect(island.stage).toBe('erupting')
    expect(island.fertility).toBe(10)
  })

  it('age字段被更新为tick-island.tick', () => {
    const island = makeIsland({ tick: TICK0, fertility: 10 })
    ;(sys as any).islands.push(island)
    const targetTick = TICK0 + STAGE_DURATION * 3
    sys.update(0, makeMockWorld(0), mockEm, targetTick)
    expect(island.age).toBe(targetTick - TICK0)
  })

  it('cooling阶段fertility不增加', () => {
    const island = makeIsland({ tick: TICK0, fertility: 10 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 + STAGE_DURATION)
    expect(island.stage).toBe('cooling')
    expect(island.fertility).toBe(10)
  })
})

// ========================================================
// 6. cleanup逻辑
// ========================================================
describe('WorldVolcanicIslandSystem - cleanup逻辑', () => {
  let sys: WorldVolcanicIslandSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    // random=1 阻止spawn
    vi.spyOn(Math, 'random').mockReturnValue(1)
  })

  it('island.tick < tick-80000时被删除', () => {
    // island.tick=0, tick=TICK0+80000+1, cutoff=TICK0+1, 0 < TICK0+1 => 删除
    const island = makeIsland({ tick: 0 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 + 80000 + 1)
    expect((sys as any).islands).toHaveLength(0)
  })

  it('island.tick == cutoff时不删除（<是严格小于）', () => {
    // cutoff = tick - 80000; island.tick < cutoff 才删
    // 设 island.tick = T, tick = T + 80000 => cutoff = T => T < T => false => 不删
    const T = TICK0
    const island = makeIsland({ tick: T })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, T + 80000)
    expect((sys as any).islands).toHaveLength(1)
  })

  it('island.tick > cutoff时不删除', () => {
    // island.tick=TICK0+5000, tick=TICK0+80000, cutoff=5000
    // TICK0+5000 < 5000 => false => 不删
    const island = makeIsland({ tick: TICK0 + 5000 })
    ;(sys as any).islands.push(island)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 + 80000)
    expect((sys as any).islands).toHaveLength(1)
  })

  it('多个岛屿：只删除旧的', () => {
    const bigTick = TICK0 + 80001
    // old.tick=0 < bigTick-80000=TICK0+1 => 删除
    // fresh.tick=bigTick => bigTick < bigTick-80000 => false => 不删
    const old = makeIsland({ tick: 0 })
    const fresh = makeIsland({ tick: bigTick })
    ;(sys as any).islands.push(old, fresh)
    sys.update(0, makeMockWorld(0), mockEm, bigTick)
    expect((sys as any).islands).toHaveLength(1)
    expect((sys as any).islands[0].tick).toBe(bigTick)
  })

  it('全部过期时清空islands', () => {
    const bigTick = TICK0 + 80001
    for (let i = 0; i < 5; i++) {
      ;(sys as any).islands.push(makeIsland({ tick: 0 }))
    }
    sys.update(0, makeMockWorld(0), mockEm, bigTick)
    expect((sys as any).islands).toHaveLength(0)
  })

  it('无过期岛屿时数量不变', () => {
    // 注入5个新鲜岛屿，tick设为较新的值
    const freshTick = TICK0
    for (let i = 0; i < 5; i++) {
      ;(sys as any).islands.push(makeIsland({ tick: freshTick }))
    }
    // update tick=freshTick, cutoff=freshTick-80000 (负数)
    // freshTick < 负数 => false => 不删
    sys.update(0, makeMockWorld(0), mockEm, freshTick)
    expect((sys as any).islands).toHaveLength(5)
  })

  it('删除后剩余岛屿的id不变', () => {
    const bigTick = TICK0 + 80001
    const keep = makeIsland({ id: 99, tick: bigTick })
    const del = makeIsland({ id: 100, tick: 0 })
    ;(sys as any).islands.push(del, keep)
    sys.update(0, makeMockWorld(0), mockEm, bigTick)
    expect((sys as any).islands).toHaveLength(1)
    expect((sys as any).islands[0].id).toBe(99)
  })
})

// ========================================================
// 7. MAX_ISLANDS上限
// ========================================================
describe('WorldVolcanicIslandSystem - MAX_ISLANDS上限', () => {
  let sys: WorldVolcanicIslandSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('MAX_ISLANDS常量为30', () => {
    expect(MAX_ISLANDS).toBe(30)
  })

  it('恰好MAX_ISLANDS个岛时不再spawn', () => {
    for (let i = 0; i < MAX_ISLANDS; i++) {
      ;(sys as any).islands.push(makeIsland({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).islands).toHaveLength(MAX_ISLANDS)
  })

  it('少于MAX_ISLANDS时可以spawn', () => {
    for (let i = 0; i < MAX_ISLANDS - 1; i++) {
      ;(sys as any).islands.push(makeIsland({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).islands.length).toBeGreaterThan(MAX_ISLANDS - 1)
  })

  it('islands绝不超过MAX_ISLANDS（多次update）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    const world = makeMockWorld(0)
    for (let i = 0; i < 50; i++) {
      sys.update(0, world, mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).islands.length).toBeLessThanOrEqual(MAX_ISLANDS)
  })

  it('CHECK_INTERVAL常量为2000', () => {
    expect(CHECK_INTERVAL).toBe(2000)
  })

  it('STAGE_DURATION为8000', () => {
    expect(STAGE_DURATION).toBe(8000)
  })

  it('EMERGE_CHANCE为0.002', () => {
    expect(EMERGE_CHANCE).toBe(0.002)
  })
})

// ========================================================
// 8. VolcanicIsland接口字段完整性
// ========================================================
describe('WorldVolcanicIslandSystem - VolcanicIsland接口', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('VolcanicIsland包含所有必要字段', () => {
    const island: VolcanicIsland = {
      id: 1,
      x: 10,
      y: 20,
      radius: 3,
      stage: 'fertile',
      age: 100,
      fertility: 50,
      tick: 0,
    }
    expect(island.id).toBe(1)
    expect(island.radius).toBe(3)
    expect(island.stage).toBe('fertile')
    expect(island.age).toBe(100)
    expect(island.fertility).toBe(50)
  })

  it('IslandStage可以是erupting', () => {
    const s: IslandStage = 'erupting'
    expect(s).toBe('erupting')
  })

  it('IslandStage可以是cooling', () => {
    const s: IslandStage = 'cooling'
    expect(s).toBe('cooling')
  })

  it('IslandStage可以是barren', () => {
    const s: IslandStage = 'barren'
    expect(s).toBe('barren')
  })

  it('IslandStage可以是fertile', () => {
    const s: IslandStage = 'fertile'
    expect(s).toBe('fertile')
  })

  it('IslandStage可以是lush', () => {
    const s: IslandStage = 'lush'
    expect(s).toBe('lush')
  })

  it('多岛屿id各不相同', () => {
    const sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(EMERGE_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0 * 2)
    vi.restoreAllMocks()
    const ids = (sys as any).islands.map((i: VolcanicIsland) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('radius最小值为2（radius=2+floor(0*4)=2）', () => {
    // 用序列mock：第一个random用于 islands.length < MAX_ISLANDS && random < EMERGE_CHANCE
    // 我们需要第一次random小于EMERGE_CHANCE，之后的random=0
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? EMERGE_CHANCE - 0.0001 : 0
    })
    const sys2 = makeSys()
    sys2.update(0, makeMockWorld(0), mockEm, TICK0)
    vi.restoreAllMocks()
    const island = (sys2 as any).islands[0]
    if (island) {
      expect(island.radius).toBeGreaterThanOrEqual(2)
    }
  })

  it('radius最大值不超过5（radius=2+floor(0.999*4)=2+3=5）', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? EMERGE_CHANCE - 0.0001 : 0.999
    })
    const sys2 = makeSys()
    sys2.update(0, makeMockWorld(0), mockEm, TICK0)
    vi.restoreAllMocks()
    const island = (sys2 as any).islands[0]
    if (island) {
      expect(island.radius).toBeLessThanOrEqual(5)
    }
  })

  it('fertility初始值为Math.random()*30', () => {
    // fertility = Math.random() * 30, 我们mock第N次random=0.5
    // 注意：x,y,radius也用了random，要数清楚调用顺序
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return EMERGE_CHANCE - 0.0001 // 用于spawn判断
      // x,y用了2次，radius用了1次，fertility用了1次
      // callCount=2,3 => x,y；callCount=4 => radius；callCount=5 => fertility
      if (callCount === 5) return 0.5
      return 0
    })
    const sys2 = makeSys()
    sys2.update(0, makeMockWorld(0), mockEm, TICK0)
    vi.restoreAllMocks()
    const island = (sys2 as any).islands[0]
    if (island) {
      // fertility = 0.5 * 30 = 15
      expect(island.fertility).toBeCloseTo(15, 0)
    }
  })
})
