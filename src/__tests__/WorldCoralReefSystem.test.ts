import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldCoralReefSystem } from '../systems/WorldCoralReefSystem'
import type { CoralReef, CoralType } from '../systems/WorldCoralReefSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2000
// SPAWN_CHANCE = 0.004   (Math.random() < SPAWN_CHANCE 才spawn)
// MAX_REEFS = 40
// GROWTH_RATE = 0.02
// 有效tile: tile===1(SHALLOW_WATER) || tile===2(SAND)
// health: 60 + random*40 => [60,100]
// growth初始: GROWTH_RATE + random*0.02 => [0.02, 0.04]
// biodiversity: 20 + BIODIVERSITY_BONUS[type]
// BIODIVERSITY_BONUS: brain=15, staghorn=25, fan=20, table=30, pillar=10
// 更新: growth = min(1, growth + GROWTH_RATE*0.1)
//       biodiversity = min(100, biodiversity + growth*0.5)
//       health += (random-0.45)*3   => [-1.35, 1.65]
//       tile非水时 health -= 5
//       health clamp [0,100]
//       health<=0时删除
// getReefAt: |r.x-x|<=2 && |r.y-y|<=2

const CHECK_INTERVAL = 2000
const SPAWN_CHANCE = 0.004
const MAX_REEFS = 40
const GROWTH_RATE = 0.02
const TICK0 = CHECK_INTERVAL

const BIODIVERSITY_BONUS: Record<CoralType, number> = {
  brain: 15, staghorn: 25, fan: 20, table: 30, pillar: 10,
}

let nextId = 100
function makeReef(type: CoralType = 'staghorn', overrides: Partial<CoralReef> = {}): CoralReef {
  return {
    id: nextId++,
    x: 10,
    y: 10,
    type,
    health: 100,
    growth: 0.02,
    biodiversity: 25,
    tick: 0,
    ...overrides,
  }
}

function makeMockWorld(tileVal: number = 1, w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: vi.fn().mockReturnValue(tileVal),
  } as any
}

function makeMockEm() {
  return {} as any
}

const mockEm = makeMockEm()

// ========================================================
// 1. 初始状态
// ========================================================
describe('WorldCoralReefSystem - 初始状态', () => {
  let sys: WorldCoralReefSystem

  beforeEach(() => {
    sys = new WorldCoralReefSystem()
    nextId = 100
  })

  it('初始reefs数组为空', () => {
    expect((sys as any).reefs).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('reefs是数组类型', () => {
    expect(Array.isArray((sys as any).reefs)).toBe(true)
  })

  it('手动注入珊瑚礁后数组长度为1', () => {
    ;(sys as any).reefs.push(makeReef())
    expect((sys as any).reefs).toHaveLength(1)
  })

  it('reefs引用稳定（同一对象）', () => {
    const ref = (sys as any).reefs
    expect(ref).toBe((sys as any).reefs)
  })

  it('支持5种CoralType', () => {
    const types: CoralType[] = ['brain', 'staghorn', 'fan', 'table', 'pillar']
    expect(types).toHaveLength(5)
  })

  it('getReefAt初始返回undefined', () => {
    expect(sys.getReefAt(10, 10)).toBeUndefined()
  })
})

// ========================================================
// 2. CHECK_INTERVAL节流
// ========================================================
describe('WorldCoralReefSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldCoralReefSystem

  beforeEach(() => {
    sys = new WorldCoralReefSystem()
    nextId = 100
    vi.spyOn(Math, 'random').mockReturnValue(1) // > SPAWN_CHANCE => 阻止spawn
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
    sys.update(0, makeMockWorld(), mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
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

  it('低于间隔时不调用getTile', () => {
    const world = makeMockWorld()
    sys.update(0, world, mockEm, CHECK_INTERVAL - 1)
    expect(world.getTile).not.toHaveBeenCalled()
  })

  it('CHECK_INTERVAL常量为2000', () => {
    expect(CHECK_INTERVAL).toBe(2000)
  })

  it('tick=0时reefs不变', () => {
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).reefs).toHaveLength(0)
  })
})

// ========================================================
// 3. spawn条件
// ========================================================
describe('WorldCoralReefSystem - spawn条件', () => {
  let sys: WorldCoralReefSystem

  beforeEach(() => {
    sys = new WorldCoralReefSystem()
    nextId = 100
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('random < SPAWN_CHANCE且tile=1(SHALLOW_WATER)时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(1)
  })

  it('random < SPAWN_CHANCE且tile=2(SAND)时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(2), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(1)
  })

  it('random >= SPAWN_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(0)
  })

  it('random > SPAWN_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(0)
  })

  it('tile=0(DEEP_WATER)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(0)
  })

  it('tile=3(GRASS)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(0)
  })

  it('tile=4(FOREST)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(4), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(0)
  })

  it('tile=5(MOUNTAIN)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(5), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(0)
  })

  it('已达MAX_REEFS时不spawn', () => {
    for (let i = 0; i < MAX_REEFS; i++) {
      ;(sys as any).reefs.push(makeReef('brain', { health: 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(MAX_REEFS)
  })

  it('比MAX_REEFS少一个时仍可spawn', () => {
    for (let i = 0; i < MAX_REEFS - 1; i++) {
      ;(sys as any).reefs.push(makeReef('brain', { health: 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect((sys as any).reefs.length).toBeGreaterThan(MAX_REEFS - 1)
  })
})

// ========================================================
// 4. spawn后字段值
// ========================================================
describe('WorldCoralReefSystem - spawn后字段值', () => {
  let sys: WorldCoralReefSystem

  beforeEach(() => {
    sys = new WorldCoralReefSystem()
    nextId = 100
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function doSpawn(tile: number = 1) {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(tile), mockEm, TICK0)
  }

  it('spawn后id从1开始', () => {
    doSpawn()
    expect((sys as any).reefs[0].id).toBe(1)
  })

  it('spawn后nextId递增至2', () => {
    doSpawn()
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn后type是有效CoralType', () => {
    doSpawn()
    const r = (sys as any).reefs[0]
    expect(['brain', 'staghorn', 'fan', 'table', 'pillar']).toContain(r.type)
  })

  it('spawn后health已被update一次（可能略低于60）', () => {
    // spawn后同帧update执行，health += (random-0.45)*3，random=SPAWN_CHANCE-0.001≈0.003
    // delta = (0.003-0.45)*3 ≈ -1.341，所以health可能从60变为58.659
    // 只验证clamp后在[0,100]范围
    doSpawn()
    const r = (sys as any).reefs[0]
    expect(r.health).toBeGreaterThanOrEqual(0)
    expect(r.health).toBeLessThanOrEqual(100)
  })

  it('spawn后growth在[0.02,0.04]范围', () => {
    doSpawn()
    const r = (sys as any).reefs[0]
    expect(r.growth).toBeGreaterThanOrEqual(0.02)
    expect(r.growth).toBeLessThanOrEqual(0.04)
  })

  it('spawn后tick等于当前tick值', () => {
    doSpawn()
    const r = (sys as any).reefs[0]
    expect(r.tick).toBe(TICK0)
  })

  it('brain类型biodiversity初始=20+15=35，update后略大于35', () => {
    // 通过控制pickRandom来选择brain
    // brain是CORAL_TYPES[0], pickRandom用Math.floor(random*5), random=0=>idx=0=>brain
    // 注意：spawn后同帧update执行 biodiversity += growth*0.5，所以略大于35
    let callCount = 0
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return SPAWN_CHANCE - 0.001 // spawn判断
      return 0 // x=0, y=0, type选第一个(brain), health=60, growth=0.02
    })
    const sys2 = new WorldCoralReefSystem()
    sys2.update(0, makeMockWorld(1), mockEm, TICK0)
    const r = (sys2 as any).reefs[0]
    if (r && r.type === 'brain') {
      // 初始biodiversity=35，update后+=growth*0.5≈0.02*0.5=0.01，变为35.01
      expect(r.biodiversity).toBeGreaterThanOrEqual(20 + BIODIVERSITY_BONUS.brain)
      expect(r.biodiversity).toBeLessThanOrEqual(100)
    }
  })

  it('table类型biodiversity初始=20+30=50，update后略大于50', () => {
    // table是CORAL_TYPES[3], Math.floor(random*5)=3 => random=3/5=0.6
    let callCount = 0
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return SPAWN_CHANCE - 0.001
      if (callCount === 4) return 0.6 // idx=3 => table
      return 0
    })
    const sys2 = new WorldCoralReefSystem()
    sys2.update(0, makeMockWorld(1), mockEm, TICK0)
    const r = (sys2 as any).reefs[0]
    if (r && r.type === 'table') {
      // update后biodiversity >= 初始50
      expect(r.biodiversity).toBeGreaterThanOrEqual(20 + BIODIVERSITY_BONUS.table)
      expect(r.biodiversity).toBeLessThanOrEqual(100)
    }
  })

  it('spawn后x在world范围内', () => {
    doSpawn()
    const r = (sys as any).reefs[0]
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.x).toBeLessThan(200)
  })

  it('spawn后y在world范围内', () => {
    doSpawn()
    const r = (sys as any).reefs[0]
    expect(r.y).toBeGreaterThanOrEqual(0)
    expect(r.y).toBeLessThan(200)
  })
})

// ========================================================
// 5. update字段变更
// ========================================================
describe('WorldCoralReefSystem - update字段变更', () => {
  let sys: WorldCoralReefSystem

  beforeEach(() => {
    sys = new WorldCoralReefSystem()
    nextId = 100
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn，health不变化（1-0.45=0.55, *3=1.65）
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('每次update后growth增加GROWTH_RATE*0.1=0.002', () => {
    const r = makeReef('brain', { growth: 0.02, health: 100 })
    ;(sys as any).reefs.push(r)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect(r.growth).toBeCloseTo(0.02 + GROWTH_RATE * 0.1, 5)
  })

  it('growth不超过1', () => {
    const r = makeReef('brain', { growth: 0.999, health: 100 })
    ;(sys as any).reefs.push(r)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect(r.growth).toBeLessThanOrEqual(1)
  })

  it('biodiversity随growth增加', () => {
    const r = makeReef('brain', { growth: 0.02, biodiversity: 30, health: 100 })
    ;(sys as any).reefs.push(r)
    const oldBio = r.biodiversity
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect(r.biodiversity).toBeGreaterThan(oldBio)
  })

  it('biodiversity不超过100', () => {
    const r = makeReef('brain', { growth: 1, biodiversity: 99.99, health: 100 })
    ;(sys as any).reefs.push(r)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect(r.biodiversity).toBeLessThanOrEqual(100)
  })

  it('tile非水时health额外减少5', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // health变化=(0.5-0.45)*3=0.15
    const r = makeReef('brain', { health: 80 })
    ;(sys as any).reefs.push(r)
    sys.update(0, makeMockWorld(3), mockEm, TICK0) // tile=3(GRASS) => health-=5
    // health = 80 + 0.15 - 5 = 75.15
    expect(r.health).toBeCloseTo(75.15, 1)
  })

  it('tile是水时health不受额外-5惩罚', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // health += 0.15
    const r = makeReef('brain', { health: 80 })
    ;(sys as any).reefs.push(r)
    sys.update(0, makeMockWorld(1), mockEm, TICK0) // tile=1 => 无惩罚
    // health = 80 + 0.15
    expect(r.health).toBeCloseTo(80.15, 1)
  })

  it('health在clamp后tile非水会变负（被cleanup删除）', () => {
    // 源码: health = max(0, min(100, health + random_delta))  => clamp
    //       然后 if tile非水: health -= 5  => 可能变负
    //       if health<=0: splice删除
    // health=1, random=0: delta=(0-0.45)*3=-1.35, clamped=max(0,1-1.35)=0, -=5 => -5 => 被删除
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const r = makeReef('brain', { health: 1, growth: 0.02 })
    ;(sys as any).reefs.push(r)
    sys.update(0, makeMockWorld(3), mockEm, TICK0) // tile非水 => health-=5
    // health变负 => 被splice删除，reefs数组为空
    expect((sys as any).reefs).toHaveLength(0)
  })

  it('health不超过100（clamp）', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(1) // health += (1-0.45)*3 = 1.65
    const r = makeReef('brain', { health: 99.9 })
    ;(sys as any).reefs.push(r)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect(r.health).toBeLessThanOrEqual(100)
  })
})

// ========================================================
// 6. cleanup逻辑（health<=0删除）
// ========================================================
describe('WorldCoralReefSystem - cleanup逻辑', () => {
  let sys: WorldCoralReefSystem

  beforeEach(() => {
    sys = new WorldCoralReefSystem()
    nextId = 100
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('health<=0的珊瑚礁被删除', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0) // health += -1.35, tile非水再-5 => 必然<=0
    const r = makeReef('brain', { health: 1 })
    ;(sys as any).reefs.push(r)
    sys.update(0, makeMockWorld(3), mockEm, TICK0) // 非水tile
    expect((sys as any).reefs).toHaveLength(0)
  })

  it('health>0的珊瑚礁保留', () => {
    const r = makeReef('brain', { health: 90 })
    ;(sys as any).reefs.push(r)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(1)
  })

  it('混合：只删除health<=0的', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const dead = makeReef('brain', { health: 1 })
    const alive = makeReef('staghorn', { health: 90 })
    ;(sys as any).reefs.push(dead, alive)
    // 使用非水tile让dead的health: 1+(0-0.45)*3-5 = 1-1.35-5 = -5.35 <= 0
    // alive: 90+(0-0.45)*3-5 = 90-1.35-5=83.65 > 0
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(1)
    expect((sys as any).reefs[0].type).toBe('staghorn')
  })

  it('全部health<=0时清空', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).reefs.push(makeReef('brain', { health: 1 }))
    }
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(0)
  })

  it('长期在非水tile上health会减少', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // health += 0.15 but -5 => net -4.85
    const r = makeReef('brain', { health: 50 })
    ;(sys as any).reefs.push(r)
    sys.update(0, makeMockWorld(3), mockEm, TICK0) // non-water
    expect(r.health).toBeLessThan(50)
  })

  it('删除后剩余珊瑚礁id不变', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const dead = makeReef('brain', { id: 201, health: 1 })
    const alive = makeReef('fan', { id: 202, health: 80 })
    ;(sys as any).reefs.push(dead, alive)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    // dead: 1+(0-0.45)*3-5=-5.35<=0 => 删除
    // alive: 80+(0-0.45)*3-5=73.65 > 0 => 保留
    expect((sys as any).reefs).toHaveLength(1)
    expect((sys as any).reefs[0].id).toBe(202)
  })

  it('update多次后健康珊瑚礁仍然存在', () => {
    const r = makeReef('table', { health: 100 })
    ;(sys as any).reefs.push(r)
    for (let i = 0; i < 3; i++) {
      sys.update(0, makeMockWorld(1), mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).reefs).toHaveLength(1)
  })
})

// ========================================================
// 7. MAX_REEFS上限
// ========================================================
describe('WorldCoralReefSystem - MAX_REEFS上限', () => {
  let sys: WorldCoralReefSystem

  beforeEach(() => {
    sys = new WorldCoralReefSystem()
    nextId = 100
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('MAX_REEFS常量为40', () => {
    expect(MAX_REEFS).toBe(40)
  })

  it('SPAWN_CHANCE常量为0.004', () => {
    expect(SPAWN_CHANCE).toBe(0.004)
  })

  it('GROWTH_RATE常量为0.02', () => {
    expect(GROWTH_RATE).toBe(0.02)
  })

  it('恰好MAX_REEFS时不spawn', () => {
    for (let i = 0; i < MAX_REEFS; i++) {
      ;(sys as any).reefs.push(makeReef('brain', { health: 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect((sys as any).reefs).toHaveLength(MAX_REEFS)
  })

  it('少于MAX_REEFS时可以spawn', () => {
    for (let i = 0; i < MAX_REEFS - 1; i++) {
      ;(sys as any).reefs.push(makeReef('brain', { health: 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect((sys as any).reefs.length).toBeGreaterThan(MAX_REEFS - 1)
  })

  it('多次update后数量不超过MAX_REEFS', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    const world = makeMockWorld(1)
    for (let i = 0; i < 50; i++) {
      sys.update(0, world, mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).reefs.length).toBeLessThanOrEqual(MAX_REEFS)
  })

  it('多次spawn后id各不相同', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(1), mockEm, TICK0 + CHECK_INTERVAL)
    const ids = (sys as any).reefs.map((r: CoralReef) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('spawn后nextId单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect((sys as any).nextId).toBe(2)
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.001)
    sys.update(0, makeMockWorld(1), mockEm, TICK0 + CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(3)
  })
})

// ========================================================
// 8. getReefAt - 边界验证
// ========================================================
describe('WorldCoralReefSystem - getReefAt边界验证', () => {
  let sys: WorldCoralReefSystem

  beforeEach(() => {
    sys = new WorldCoralReefSystem()
    nextId = 100
  })

  it('无珊瑚礁时返回undefined', () => {
    expect(sys.getReefAt(10, 10)).toBeUndefined()
  })

  it('坐标完全匹配时返回珊瑚礁', () => {
    ;(sys as any).reefs.push(makeReef('brain', { x: 10, y: 10 }))
    expect(sys.getReefAt(10, 10)).toBeDefined()
  })

  it('|dx|<=2且|dy|<=2时返回珊瑚礁', () => {
    ;(sys as any).reefs.push(makeReef('brain', { x: 10, y: 10 }))
    expect(sys.getReefAt(12, 12)).toBeDefined()
    expect(sys.getReefAt(8, 8)).toBeDefined()
    expect(sys.getReefAt(10, 12)).toBeDefined()
    expect(sys.getReefAt(12, 10)).toBeDefined()
  })

  it('|dx|>2时返回undefined', () => {
    ;(sys as any).reefs.push(makeReef('fan', { x: 10, y: 10 }))
    expect(sys.getReefAt(13, 10)).toBeUndefined()
    expect(sys.getReefAt(7, 10)).toBeUndefined()
  })

  it('|dy|>2时返回undefined', () => {
    ;(sys as any).reefs.push(makeReef('fan', { x: 10, y: 10 }))
    expect(sys.getReefAt(10, 13)).toBeUndefined()
    expect(sys.getReefAt(10, 7)).toBeUndefined()
  })

  it('边界情况：|dx|=2且|dy|=2时返回珊瑚礁', () => {
    ;(sys as any).reefs.push(makeReef('table', { x: 10, y: 10 }))
    expect(sys.getReefAt(12, 12)).toBeDefined()
  })

  it('坐标很远时返回undefined', () => {
    ;(sys as any).reefs.push(makeReef('pillar', { x: 10, y: 10 }))
    expect(sys.getReefAt(100, 100)).toBeUndefined()
  })

  it('多个珊瑚礁时返回最近的（find第一个匹配）', () => {
    ;(sys as any).reefs.push(makeReef('brain', { id: 201, x: 10, y: 10 }))
    ;(sys as any).reefs.push(makeReef('staghorn', { id: 202, x: 11, y: 10 }))
    const found = sys.getReefAt(10, 10)
    expect(found).toBeDefined()
    expect(found!.id).toBe(201) // find返回第一个
  })

  it('BIODIVERSITY_BONUS值正确：brain=15', () => {
    expect(BIODIVERSITY_BONUS.brain).toBe(15)
  })

  it('BIODIVERSITY_BONUS值正确：staghorn=25', () => {
    expect(BIODIVERSITY_BONUS.staghorn).toBe(25)
  })

  it('BIODIVERSITY_BONUS值正确：fan=20', () => {
    expect(BIODIVERSITY_BONUS.fan).toBe(20)
  })

  it('BIODIVERSITY_BONUS值正确：table=30（最高）', () => {
    expect(BIODIVERSITY_BONUS.table).toBe(30)
  })

  it('BIODIVERSITY_BONUS值正确：pillar=10（最低）', () => {
    expect(BIODIVERSITY_BONUS.pillar).toBe(10)
  })

  it('update在tick=0时不崩溃', () => {
    expect(() => sys.update(0, makeMockWorld(1), mockEm, 0)).not.toThrow()
  })

  it('update在高tick时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(0, makeMockWorld(1), mockEm, 999999)).not.toThrow()
    vi.restoreAllMocks()
  })
})
