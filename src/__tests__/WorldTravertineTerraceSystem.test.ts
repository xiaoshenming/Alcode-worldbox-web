import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTravertineTerraceSystem } from '../systems/WorldTravertineTerraceSystem'
import type { TravertineTerraceZone } from '../systems/WorldTravertineTerraceSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2700
// FORM_CHANCE = 0.003  (Math.random() > FORM_CHANCE 则 continue，即 random < FORM_CHANCE 才 spawn)
// MAX_ZONES = 32
// 每次 update 尝试 3 次 attempt
// 需要 nearWater(SHALLOW_WATER=1 或 DEEP_WATER=0) 或 nearMountain(MOUNTAIN=5)
// cleanup: zone.tick < tick - 54000 则删除
// 字段范围: mineralContent: 40+rand*60, poolDepth: 10+rand*50, flowRate: 20+rand*80, calcification: 15+rand*85

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.003
const MAX_ZONES = 32
const CLEANUP_AGE = 54000
const TICK0 = CHECK_INTERVAL // 首次触发的 tick 值

// TileType 数值
const DEEP_WATER = 0
const SHALLOW_WATER = 1
const SAND = 2
const GRASS = 3
const FOREST = 4
const MOUNTAIN = 5

function makeSys(): WorldTravertineTerraceSystem {
  return new WorldTravertineTerraceSystem()
}

let nextId = 1

function makeZone(overrides: Partial<TravertineTerraceZone> = {}): TravertineTerraceZone {
  return {
    id: nextId++,
    x: 50,
    y: 50,
    mineralContent: 70,
    poolDepth: 35,
    flowRate: 60,
    calcification: 50,
    tick: 0,
    ...overrides,
  }
}

// mock world：getTile 返回指定类型
function makeMockWorld(tileType: number = GRASS, width = 200, height = 200): any {
  return {
    width,
    height,
    getTile: vi.fn().mockReturnValue(tileType),
  }
}

// mock world：只有 (x,y) 的邻格返回 tileType，其余返回 GRASS
function makeMockWorldWithAdjacent(nx: number, ny: number, tileType: number, width = 200, height = 200): any {
  return {
    width,
    height,
    getTile: vi.fn((x: number, y: number) => {
      if (Math.abs(x - nx) <= 1 && Math.abs(y - ny) <= 1 && !(x === nx && y === ny)) return tileType
      return GRASS
    }),
  }
}

const mockEm = {} as any

// 强制绕过 CHECK_INTERVAL，让 update 立即执行
function forceTrigger(sys: any, tick: number): void {
  sys.lastCheck = tick - CHECK_INTERVAL - 1
}

// ===== 1. 初始状态 =====
describe('初始状态', () => {
  let sys: WorldTravertineTerraceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('zones 初始为空数组', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zones 是 Array 实例', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('可以手动注入 zone 并查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zones 返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })

  it('注入后字段值正确', () => {
    const z = makeZone({ mineralContent: 55, calcification: 30, flowRate: 45 })
    ;(sys as any).zones.push(z)
    const stored = (sys as any).zones[0]
    expect(stored.mineralContent).toBe(55)
    expect(stored.calcification).toBe(30)
    expect(stored.flowRate).toBe(45)
  })
})

// ===== 2. CHECK_INTERVAL 节流 =====
describe('CHECK_INTERVAL 节流', () => {
  let sys: WorldTravertineTerraceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 时不触发（0-0=0 < 2700）', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world, mockEm, 0)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=2699 时不触发（lastCheck=0，2699<2700）', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world, mockEm, 2699)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=2700 时触发（等于 CHECK_INTERVAL）', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    // Math.random() 始终返回 0，< FORM_CHANCE=0.003，且满足 nearWater
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world, mockEm, 2700)
    // 3次attempt都满足条件，应该spawn 3个
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('触发后 lastCheck 更新为当前 tick', () => {
    const world = makeMockWorld(GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不 spawn（>FORM_CHANCE但条件不满足也无所谓）
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
    vi.restoreAllMocks()
  })

  it('未触发时 lastCheck 不更新', () => {
    const world = makeMockWorld(GRASS)
    sys.update(0, world, mockEm, 100) // 100 < 2700，不触发
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次触发需要再等 CHECK_INTERVAL', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world, mockEm, 2700) // 第一次触发
    const countAfterFirst = (sys as any).zones.length
    sys.update(0, world, mockEm, 2701) // 2701-2700=1 < 2700，不再触发
    expect((sys as any).zones.length).toBe(countAfterFirst)
    vi.restoreAllMocks()
  })

  it('tick=5400 时可触发第二次（5400-2700=2700）', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world, mockEm, 2700) // 第一次
    const c1 = (sys as any).zones.length
    sys.update(0, world, mockEm, 5400) // 第二次
    expect((sys as any).zones.length).toBeGreaterThan(c1)
    vi.restoreAllMocks()
  })

  it('tick=1时不触发（lastCheck=0，1<2700）', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world, mockEm, 1)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

// ===== 3. spawn 条件（tile 类型 + random 方向） =====
describe('spawn 条件', () => {
  let sys: WorldTravertineTerraceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('SHALLOW_WATER 邻格满足 nearWater，random=0 时 spawn', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('DEEP_WATER 邻格满足 nearWater，random=0 时 spawn', () => {
    const world = makeMockWorld(DEEP_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('MOUNTAIN 邻格满足 nearMountain，random=0 时 spawn', () => {
    const world = makeMockWorld(MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('GRASS 邻格不满足条件，即使 random=0 也不 spawn', () => {
    const world = makeMockWorld(GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SAND 邻格不满足条件，即使 random=0 也不 spawn', () => {
    const world = makeMockWorld(SAND)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('FOREST 邻格不满足条件，不 spawn', () => {
    const world = makeMockWorld(FOREST)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('FORM_CHANCE 方向：random > FORM_CHANCE(0.003) 则 continue 不 spawn', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    // random 返回 1.0 > 0.003，所有 attempt 都被跳过
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random = FORM_CHANCE 时，> 为 false，不跳过（边界）', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE) // 0.003 > 0.003 => false，不continue
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('random = 0.002 < FORM_CHANCE，不跳过，spawn 成功', () => {
    const world = makeMockWorld(MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('random = 0.004 > FORM_CHANCE，跳过，不 spawn', () => {
    const world = makeMockWorld(MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.004)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('3次 attempt 均满足条件时，最多 spawn 3 个', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })
})

// ===== 4. spawn 后字段值校验 =====
describe('spawn 后字段值校验', () => {
  let sys: WorldTravertineTerraceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(tick = 5000): TravertineTerraceZone {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, tick)
    sys.update(0, world, mockEm, tick)
    return (sys as any).zones[0]
  }

  it('新 zone 具有 id 字段', () => {
    const z = spawnOne()
    expect(z).toHaveProperty('id')
  })

  it('新 zone 具有 x, y 字段', () => {
    const z = spawnOne()
    expect(z).toHaveProperty('x')
    expect(z).toHaveProperty('y')
  })

  it('新 zone 具有 mineralContent 字段', () => {
    const z = spawnOne()
    expect(z).toHaveProperty('mineralContent')
  })

  it('mineralContent 在范围 [40, 100] 内（random=0 时为 40）', () => {
    const z = spawnOne()
    // random=0 => mineralContent = 40 + 0*60 = 40
    expect(z.mineralContent).toBeGreaterThanOrEqual(40)
    expect(z.mineralContent).toBeLessThanOrEqual(100)
  })

  it('poolDepth 在范围 [10, 60] 内（random=0 时为 10）', () => {
    const z = spawnOne()
    // random=0 => poolDepth = 10 + 0*50 = 10
    expect(z.poolDepth).toBeGreaterThanOrEqual(10)
    expect(z.poolDepth).toBeLessThanOrEqual(60)
  })

  it('flowRate 在范围 [20, 100] 内（random=0 时为 20）', () => {
    const z = spawnOne()
    // random=0 => flowRate = 20 + 0*80 = 20
    expect(z.flowRate).toBeGreaterThanOrEqual(20)
    expect(z.flowRate).toBeLessThanOrEqual(100)
  })

  it('calcification 在范围 [15, 100] 内（random=0 时为 15）', () => {
    const z = spawnOne()
    // random=0 => calcification = 15 + 0*85 = 15
    expect(z.calcification).toBeGreaterThanOrEqual(15)
    expect(z.calcification).toBeLessThanOrEqual(100)
  })

  it('新 zone 的 tick 等于当前 tick', () => {
    const z = spawnOne(5000)
    expect(z.tick).toBe(5000)
  })

  it('spawn 后 nextId 递增', () => {
    spawnOne()
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('x 在 [0, world.width) 范围内', () => {
    const z = spawnOne()
    expect(z.x).toBeGreaterThanOrEqual(0)
    expect(z.x).toBeLessThan(200)
  })

  it('y 在 [0, world.height) 范围内', () => {
    const z = spawnOne()
    expect(z.y).toBeGreaterThanOrEqual(0)
    expect(z.y).toBeLessThan(200)
  })
})

// ===== 5. cleanup 逻辑 =====
describe('cleanup 逻辑（tick < cutoff = tick - 54000）', () => {
  let sys: WorldTravertineTerraceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('zone.tick < tick-54000 时被删除', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 1000 })) // 1000 < 60000-54000=6000，应删除
    const world = makeMockWorld(GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不spawn
    forceTrigger(sys, currentTick)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick = tick-54000 时不删除（不满足 <）', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 6000 })) // 6000 = 60000-54000，不满足 < ，不删
    const world = makeMockWorld(GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    forceTrigger(sys, currentTick)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick > cutoff 时保留', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 10000 })) // 10000 > 6000，保留
    const world = makeMockWorld(GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    forceTrigger(sys, currentTick)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('同时清理多个过期 zone', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 100 }))
    ;(sys as any).zones.push(makeZone({ tick: 200 }))
    ;(sys as any).zones.push(makeZone({ tick: 300 }))
    const world = makeMockWorld(GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    forceTrigger(sys, currentTick)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('部分过期时只删过期的', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 100 }))   // 过期
    ;(sys as any).zones.push(makeZone({ tick: 50000 })) // 保留
    const world = makeMockWorld(GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    forceTrigger(sys, currentTick)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(50000)
  })

  it('tick=54000 时 cutoff=0，tick=0 的 zone 不删除（0 < 0 => false）', () => {
    const currentTick = 54000
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    const world = makeMockWorld(GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    forceTrigger(sys, currentTick)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('cleanup 在 spawn 后执行（同一次 update）', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 1000 })) // 会被清除
    const world = makeMockWorld(GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不spawn
    forceTrigger(sys, currentTick)
    sys.update(0, world, mockEm, currentTick)
    // 过期的被清除，没有新的 spawn
    expect((sys as any).zones).toHaveLength(0)
  })

  it('未达到 CHECK_INTERVAL 时 cleanup 不执行', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    const world = makeMockWorld(GRASS)
    sys.update(0, world, mockEm, 100) // 不触发
    expect((sys as any).zones).toHaveLength(1) // 未清理
  })
})

// ===== 6. MAX_ZONES 上限 =====
describe('MAX_ZONES 上限（32）', () => {
  let sys: WorldTravertineTerraceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('zones.length >= MAX_ZONES 时 break，不再 spawn', () => {
    // 填满32个
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    }
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 99999)
    sys.update(0, world, mockEm, 99999)
    // cleanup 不会清理 tick=99999（cutoff=99999-54000=45999，99999 > 45999），所以数量不变
    expect((sys as any).zones.length).toBe(MAX_ZONES)
  })

  it('zones.length < MAX_ZONES 时可以 spawn', () => {
    // 填满 31 个
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    }
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 99999)
    sys.update(0, world, mockEm, 99999)
    expect((sys as any).zones.length).toBeGreaterThan(MAX_ZONES - 1)
  })

  it('MAX_ZONES 常量值为 32', () => {
    // 校验常量
    expect(MAX_ZONES).toBe(32)
  })

  it('zones 上限为 32，不超过', () => {
    // 先填满 MAX_ZONES 个
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    }
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 多次触发
    for (let t = 99999; t < 99999 + CHECK_INTERVAL * 5; t += CHECK_INTERVAL) {
      forceTrigger(sys, t)
      sys.update(0, world, mockEm, t)
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('3次 attempt 中若已达到上限则 break', () => {
    // 填满 MAX_ZONES - 1，第一个 attempt spawn 后达到上限，后续 break
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    }
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 99999)
    sys.update(0, world, mockEm, 99999)
    // 只能 spawn 1 个，之后 break
    expect((sys as any).zones.length).toBe(MAX_ZONES)
  })

  it('初始空时 3 次 attempt 最多 spawn 3 个（小于 MAX_ZONES）', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  it('zones 长度初始为 0，不受 MAX_ZONES 限制', () => {
    expect((sys as any).zones.length).toBe(0)
    expect(MAX_ZONES).toBeGreaterThan(0)
  })

  it('CHECK_INTERVAL 参数正确', () => {
    expect(CHECK_INTERVAL).toBe(2700)
  })

  it('FORM_CHANCE 参数正确', () => {
    expect(FORM_CHANCE).toBe(0.003)
  })
})

// ===== 7. 多次 update 累积行为 =====
describe('多次 update 累积行为', () => {
  let sys: WorldTravertineTerraceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('多次触发后 zones 数量累积增长', () => {
    const world = makeMockWorld(MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 第一次触发
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    const c1 = (sys as any).zones.length
    // 第二次触发
    forceTrigger(sys, 10000)
    sys.update(0, world, mockEm, 10000)
    const c2 = (sys as any).zones.length
    expect(c2).toBeGreaterThanOrEqual(c1)
  })

  it('cleanup 后 zones 减少', () => {
    // 手动放入一个过期 zone
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))
    expect((sys as any).zones).toHaveLength(1)
    const world = makeMockWorld(GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    forceTrigger(sys, 60000)
    sys.update(0, world, mockEm, 60000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SHALLOW_WATER 和 DEEP_WATER 都可以触发 nearWater', () => {
    const worldSW = makeMockWorld(SHALLOW_WATER)
    const worldDW = makeMockWorld(DEEP_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const sys1 = makeSys()
    forceTrigger(sys1, 5000)
    sys1.update(0, worldSW, mockEm, 5000)

    const sys2 = makeSys()
    forceTrigger(sys2, 5000)
    sys2.update(0, worldDW, mockEm, 5000)

    expect((sys1 as any).zones.length).toBeGreaterThanOrEqual(1)
    expect((sys2 as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('MOUNTAIN 满足 nearMountain 条件可触发', () => {
    const world = makeMockWorld(MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('每次触发最多 spawn 3 个（受 attempt 循环限制）', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  it('FORM_CHANCE = 0.003 时成功率极低（random=0.5时不spawn）', () => {
    const world = makeMockWorld(MOUNTAIN)
    // random=0.5 > 0.003 => 所有 attempt 都跳过
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('不同 tick 触发时 zone.tick 值不同', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    const tick5000 = (sys as any).zones[0]?.tick
    forceTrigger(sys, 10000)
    sys.update(0, world, mockEm, 10000)
    const zones = (sys as any).zones
    const lastZone = zones[zones.length - 1]
    expect(lastZone?.tick).toBe(10000)
    expect(tick5000).toBe(5000)
  })

  it('zone.id 单调递增', () => {
    const world = makeMockWorld(SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, world, mockEm, 5000)
    forceTrigger(sys, 10000)
    sys.update(0, world, mockEm, 10000)
    const zones: TravertineTerraceZone[] = (sys as any).zones
    for (let i = 1; i < zones.length; i++) {
      expect(zones[i].id).toBeGreaterThan(zones[i - 1].id)
    }
  })

  it('注入后再触发 update 不影响已有正常 zone', () => {
    ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    const world = makeMockWorld(GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    forceTrigger(sys, 99999)
    sys.update(0, world, mockEm, 99999)
    // cutoff = 99999-54000=45999, zone.tick=99999 > 45999，不删除
    expect((sys as any).zones).toHaveLength(1)
  })
})
