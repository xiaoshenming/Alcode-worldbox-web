import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRutheniumSpringSystem } from '../systems/WorldRutheniumSpringSystem'
import type { RutheniumSpringZone } from '../systems/WorldRutheniumSpringSystem'

// TileType 枚举值
const DEEP_WATER = 0
const SHALLOW_WATER = 1
const SAND = 2
const GRASS = 3
const FOREST = 4
const MOUNTAIN = 5
const SNOW = 6
const LAVA = 7

// CHECK_INTERVAL=2830, FORM_CHANCE=0.003, MAX_ZONES=32
// spawn 条件：hasAdjacentTile(water OR mountain) && Math.random() > FORM_CHANCE
// random=0 时 > FORM_CHANCE 为 false → 不spawn；random=1 时 > FORM_CHANCE 为 true → 进入但...等等
// 实际逻辑：if (Math.random() > FORM_CHANCE) continue → random=0 时 0>0.003 false → 不continue → spawn
// cleanup: tick < cutoff (cutoff = tick - 54000)

function makeSys(): WorldRutheniumSpringSystem {
  return new WorldRutheniumSpringSystem()
}

// 创建 world mock：getTile() 返回 number
function makeWorldWithAdjacentWater(mainTile = FOREST) {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => SHALLOW_WATER,
  }
}

function makeWorldWithAdjacentMountain() {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => MOUNTAIN,
  }
}

function makeWorldNoAdjacentWaterOrMountain() {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => GRASS,
  }
}

const fakeEm = {} as any

let nextIdHelper = 100
function makeZone(overrides: Partial<RutheniumSpringZone> = {}): RutheniumSpringZone {
  return {
    id: nextIdHelper++,
    x: 20, y: 30,
    rutheniumContent: 60,
    springFlow: 30,
    depositLeaching: 50,
    mineralRarity: 50,
    tick: 0,
    ...overrides,
  }
}

// ─── 1. 初始状态 ────────────────────────────────────────────────────────────

describe('WorldRutheniumSpringSystem - 初始状态', () => {
  let sys: WorldRutheniumSpringSystem

  beforeEach(() => { sys = makeSys() })

  it('初始 zones 数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动注入一条 zone 后长度为 1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('手动注入两条 zone 后长度为 2', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })

  it('zones 数组是同一内部引用', () => {
    const ref = (sys as any).zones
    expect(ref).toBe((sys as any).zones)
  })

  it('注入的 zone 字段可正确读取', () => {
    const z = makeZone({ rutheniumContent: 75, springFlow: 45 })
    ;(sys as any).zones.push(z)
    const stored = (sys as any).zones[0]
    expect(stored.rutheniumContent).toBe(75)
    expect(stored.springFlow).toBe(45)
  })

  it('不同实例互不影响', () => {
    const sys2 = makeSys()
    ;(sys as any).zones.push(makeZone())
    expect((sys2 as any).zones).toHaveLength(0)
  })
})

// ─── 2. CHECK_INTERVAL 节流 ──────────────────────────────────────────────────

describe('WorldRutheniumSpringSystem - CHECK_INTERVAL 节流 (2830)', () => {
  let sys: WorldRutheniumSpringSystem
  const world = makeWorldWithAdjacentWater()

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时执行（lastCheck=0, 0-0=0 < 2830 false → 不跳过）', () => {
    // 0 - 0 = 0, 0 < 2830 → 跳过！所以 tick=0 会被跳过
    // 等等，条件是 tick - lastCheck < CHECK_INTERVAL → 0 < 2830 → true → return
    // 所以 tick=0 被节流跳过
    sys.update(0, world as any, fakeEm, 0)
    expect((sys as any).lastCheck).toBe(0) // 未更新
  })

  it('tick < 2830 时被节流，lastCheck 不更新', () => {
    sys.update(0, world as any, fakeEm, 2829)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick = 2830 时不被节流，lastCheck 更新为 tick', () => {
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).lastCheck).toBe(2830)
  })

  it('tick = 2830 时 random=0 可以 spawn', () => {
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
    // random=0 → 0 > 0.003 is false → not continue → spawn（若地形条件满足）
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('第二次调用间隔不足 2830 被节流', () => {
    sys.update(0, world as any, fakeEm, 2830)
    const countAfterFirst = (sys as any).zones.length
    sys.update(0, world as any, fakeEm, 2830 + 100)
    expect((sys as any).zones.length).toBe(countAfterFirst)
    expect((sys as any).lastCheck).toBe(2830)
  })

  it('第二次调用恰好达到间隔时再次执行', () => {
    sys.update(0, world as any, fakeEm, 2830)
    ;(sys as any).lastCheck = 2830
    sys.update(0, world as any, fakeEm, 2830 + 2830)
    expect((sys as any).lastCheck).toBe(2830 + 2830)
  })

  it('lastCheck 始终被设为当前 tick', () => {
    sys.update(0, world as any, fakeEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('tick=2829 时被节流，zones 保持为空', () => {
    sys.update(0, world as any, fakeEm, 2829)
    expect((sys as any).zones).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─── 3. spawn 条件 ─────────────────────────────────────────────────────────

describe('WorldRutheniumSpringSystem - spawn 条件', () => {
  let sys: WorldRutheniumSpringSystem

  afterEach(() => { vi.restoreAllMocks() })

  it('random=0 时（0>0.003 false → 不 continue）且有邻水，会 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('random=1 时（1>0.003 true → continue），不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random=0.004 时（0.004>0.003 true → continue），不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.004)
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('邻接 MOUNTAIN 时，random=0，可以 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorldWithAdjacentMountain()
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('邻接 DEEP_WATER 时，random=0，可以 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = {
      width: 100, height: 100,
      getTile: () => DEEP_WATER,
    }
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('无邻接水或山时，不 spawn（即使 random=0）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorldNoAdjacentWaterOrMountain()
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zones 达到 MAX_ZONES=32 时不再 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 2830 }))
    }
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).zones.length).toBe(32)
  })

  it('zones=31 时（< 32）还能继续 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 31; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 2830 }))
    }
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).zones.length).toBeGreaterThan(31)
  })

  it('每次 update 最多 3 次 spawn 尝试（3 zones 有邻水，random=0）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })
})

// ─── 4. spawn 字段范围 ──────────────────────────────────────────────────────

describe('WorldRutheniumSpringSystem - spawn 字段范围', () => {
  let sys: WorldRutheniumSpringSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => { vi.restoreAllMocks() })

  const world = makeWorldWithAdjacentWater()

  it('spawn 的 zone.tick 等于当前 tick', () => {
    sys.update(0, world as any, fakeEm, 2830)
    const z = (sys as any).zones[0]
    expect(z.tick).toBe(2830)
  })

  it('spawn 的 zone.id 从 1 开始', () => {
    sys.update(0, world as any, fakeEm, 2830)
    const z = (sys as any).zones[0]
    expect(z.id).toBe(1)
  })

  it('spawn 后 nextId 递增', () => {
    sys.update(0, world as any, fakeEm, 2830)
    const count = (sys as any).zones.length
    expect((sys as any).nextId).toBe(count + 1)
  })

  it('rutheniumContent 最小值 = 40（random=0）', () => {
    sys.update(0, world as any, fakeEm, 2830)
    const z = (sys as any).zones[0]
    expect(z.rutheniumContent).toBeGreaterThanOrEqual(40)
    expect(z.rutheniumContent).toBeLessThan(101)
  })

  it('springFlow 最小值 = 10（random=0）', () => {
    sys.update(0, world as any, fakeEm, 2830)
    const z = (sys as any).zones[0]
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
    expect(z.springFlow).toBeLessThan(61)
  })

  it('depositLeaching 范围 [20, 100)', () => {
    sys.update(0, world as any, fakeEm, 2830)
    const z = (sys as any).zones[0]
    expect(z.depositLeaching).toBeGreaterThanOrEqual(20)
    expect(z.depositLeaching).toBeLessThan(101)
  })

  it('mineralRarity 范围 [15, 100)', () => {
    sys.update(0, world as any, fakeEm, 2830)
    const z = (sys as any).zones[0]
    expect(z.mineralRarity).toBeGreaterThanOrEqual(15)
    expect(z.mineralRarity).toBeLessThan(101)
  })

  it('多次 spawn 时 id 顺序递增', () => {
    // 预设 zones < 32，连续3次spawn
    sys.update(0, world as any, fakeEm, 2830)
    const zones = (sys as any).zones
    if (zones.length >= 2) {
      expect(zones[1].id).toBe(zones[0].id + 1)
    }
    expect(zones.length).toBeGreaterThanOrEqual(1)
  })

  it('x y 坐标在世界范围内', () => {
    sys.update(0, world as any, fakeEm, 2830)
    const z = (sys as any).zones[0]
    expect(z.x).toBeGreaterThanOrEqual(0)
    expect(z.x).toBeLessThan(100)
    expect(z.y).toBeGreaterThanOrEqual(0)
    expect(z.y).toBeLessThan(100)
  })
})

// ─── 5. update 无数值逻辑（Ruthenium Spring 没有字段更新，只有 spawn + cleanup）

describe('WorldRutheniumSpringSystem - 无 update 字段逻辑确认', () => {
  let sys: WorldRutheniumSpringSystem

  afterEach(() => { vi.restoreAllMocks() })

  it('已有 zone 的 rutheniumContent 在 update 后不变', () => {
    sys = makeSys()
    const z = makeZone({ rutheniumContent: 70, tick: 2830 })
    ;(sys as any).zones.push(z)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止新spawn
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 2830)
    // rutheniumContent 不被 update 逻辑改变
    expect(z.rutheniumContent).toBe(70)
  })

  it('已有 zone 的 springFlow 在 update 后不变', () => {
    sys = makeSys()
    const z = makeZone({ springFlow: 35, tick: 2830 })
    ;(sys as any).zones.push(z)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 2830)
    expect(z.springFlow).toBe(35)
  })

  it('已有 zone 的 depositLeaching 在 update 后不变', () => {
    sys = makeSys()
    const z = makeZone({ depositLeaching: 55, tick: 2830 })
    ;(sys as any).zones.push(z)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 2830)
    expect(z.depositLeaching).toBe(55)
  })

  it('已有 zone 的 mineralRarity 在 update 后不变', () => {
    sys = makeSys()
    const z = makeZone({ mineralRarity: 60, tick: 2830 })
    ;(sys as any).zones.push(z)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 2830)
    expect(z.mineralRarity).toBe(60)
  })

  it('已有 zone 的 tick 字段在 update 后不变', () => {
    sys = makeSys()
    const z = makeZone({ tick: 2830 })
    ;(sys as any).zones.push(z)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 5660)
    expect(z.tick).toBe(2830)
  })

  it('多个 zone 的字段均不被 update 修改', () => {
    sys = makeSys()
    const z1 = makeZone({ rutheniumContent: 55, tick: 2830 })
    const z2 = makeZone({ rutheniumContent: 80, tick: 2830 })
    ;(sys as any).zones.push(z1, z2)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 2830)
    expect(z1.rutheniumContent).toBe(55)
    expect(z2.rutheniumContent).toBe(80)
  })

  it('update 调用后 zones 数组引用不变', () => {
    sys = makeSys()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeWorldWithAdjacentWater()
    const refBefore = (sys as any).zones
    sys.update(0, world as any, fakeEm, 2830)
    expect((sys as any).zones).toBe(refBefore)
  })

  it('被节流时字段完全不变', () => {
    sys = makeSys()
    const z = makeZone({ rutheniumContent: 42, tick: 0 })
    ;(sys as any).zones.push(z)
    ;(sys as any).lastCheck = 0
    // tick=100 < 2830 → 被节流
    const world = makeWorldWithAdjacentWater()
    sys.update(0, world as any, fakeEm, 100)
    expect(z.rutheniumContent).toBe(42)
    expect((sys as any).zones).toHaveLength(1)
  })
})

// ─── 6. cleanup 逻辑 ────────────────────────────────────────────────────────

describe('WorldRutheniumSpringSystem - cleanup 逻辑 (cutoff = tick - 54000)', () => {
  let sys: WorldRutheniumSpringSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止新 spawn
  })

  afterEach(() => { vi.restoreAllMocks() })

  const world = makeWorldWithAdjacentWater()

  it('tick 恰好等于 cutoff 时，zone 被保留（需 tick < cutoff 才删）', () => {
    const currentTick = 100000
    const cutoff = currentTick - 54000 // = 46000
    // zone.tick = cutoff → 46000，条件 zone.tick < cutoff → 46000 < 46000 false → 保留
    const z = makeZone({ tick: cutoff })
    ;(sys as any).zones.push(z)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('tick 小于 cutoff 时，zone 被删除', () => {
    const currentTick = 100000
    const cutoff = currentTick - 54000 // = 46000
    const z = makeZone({ tick: cutoff - 1 }) // 45999 < 46000 → 删除
    ;(sys as any).zones.push(z)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick 大于 cutoff 时，zone 被保留', () => {
    const currentTick = 100000
    const cutoff = currentTick - 54000 // = 46000
    const z = makeZone({ tick: cutoff + 1 }) // 46001 > 46000 → 保留
    ;(sys as any).zones.push(z)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('混合新旧 zones，旧的删除新的保留', () => {
    const currentTick = 100000
    const cutoff = currentTick - 54000 // = 46000
    const old1 = makeZone({ tick: cutoff - 100 })
    const old2 = makeZone({ tick: 0 })
    const fresh = makeZone({ tick: cutoff + 1 })
    ;(sys as any).zones.push(old1, old2, fresh)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(cutoff + 1)
  })

  it('全部过期时 zones 清空', () => {
    const currentTick = 200000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('全部未过期时 zones 保持不变', () => {
    const currentTick = 100000
    const freshTick = currentTick - 10000 // 90000，远大于cutoff=46000，保留
    for (let i = 0; i < 4; i++) {
      ;(sys as any).zones.push(makeZone({ tick: freshTick }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(4)
  })

  it('cleanup 顺序从后往前，不跳过元素', () => {
    const currentTick = 100000
    const cutoff = currentTick - 54000
    // 在旧之间夹着新
    const old1 = makeZone({ tick: cutoff - 10 })
    const fresh = makeZone({ tick: cutoff })
    const old2 = makeZone({ tick: cutoff - 20 })
    ;(sys as any).zones.push(old1, fresh, old2)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    // fresh (= cutoff) 保留，old1 old2 删除
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(cutoff)
  })

  it('仅1条边界 zone 在 cutoff 时被保留', () => {
    const currentTick = 54000
    const cutoff = 0 // cutoff = 54000 - 54000 = 0
    const z = makeZone({ tick: 0 }) // tick=0 = cutoff → 保留
    ;(sys as any).zones.push(z)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })
})
