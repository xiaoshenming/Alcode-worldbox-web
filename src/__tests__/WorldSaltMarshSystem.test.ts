import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSaltMarshSystem } from '../systems/WorldSaltMarshSystem'
import type { SaltMarsh } from '../systems/WorldSaltMarshSystem'

// TileType 枚举值
const DEEP_WATER = 0
const SHALLOW_WATER = 1
const SAND = 2
const GRASS = 3
const FOREST = 4
const MOUNTAIN = 5

// CHECK_INTERVAL=2600, FORM_CHANCE=0.003, MAX_MARSHES=24
// spawn 条件：Math.random() < FORM_CHANCE → random=0 时 0<0.003 true → spawn
// 地形：SAND=2 或 SHALLOW_WATER=1
// update: vegetationDensity+=0.02(max90), biodiversity+=0.015(max100), salinity随机游走[5,80]
// cleanup: tick < cutoff (cutoff = tick - 90000)
// 顺序：spawn → updateAll → cleanup

function makeSys(): WorldSaltMarshSystem {
  return new WorldSaltMarshSystem()
}

function makeWorld(tileValue: number = SAND) {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => tileValue,
  }
}

const fakeEm = {} as any

let idHelper = 300
function makeMarsh(overrides: Partial<SaltMarsh> = {}): SaltMarsh {
  return {
    id: idHelper++,
    x: 20, y: 30,
    radius: 8,
    salinity: 40,
    vegetationDensity: 30,
    tidalRange: 3,
    biodiversity: 50,
    tick: 0,
    ...overrides,
  }
}

// ─── 1. 初始状态 ────────────────────────────────────────────────────────────

describe('WorldSaltMarshSystem - 初始状态', () => {
  let sys: WorldSaltMarshSystem

  beforeEach(() => { sys = makeSys() })

  it('初始 marshes 数组为��', () => {
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动注入一条 marsh 后长度为 1', () => {
    ;(sys as any).marshes.push(makeMarsh())
    expect((sys as any).marshes).toHaveLength(1)
  })

  it('手动注入多条 marsh 后长度正确', () => {
    ;(sys as any).marshes.push(makeMarsh(), makeMarsh(), makeMarsh())
    expect((sys as any).marshes).toHaveLength(3)
  })

  it('marshes 是同一内部引用', () => {
    const ref = (sys as any).marshes
    expect(ref).toBe((sys as any).marshes)
  })

  it('注入 marsh 的字段可正确读取', () => {
    const m = makeMarsh({ salinity: 35, biodiversity: 65, tidalRange: 2 })
    ;(sys as any).marshes.push(m)
    const stored = (sys as any).marshes[0]
    expect(stored.salinity).toBe(35)
    expect(stored.biodiversity).toBe(65)
    expect(stored.tidalRange).toBe(2)
  })

  it('不同实例互不影响', () => {
    const sys2 = makeSys()
    ;(sys as any).marshes.push(makeMarsh())
    expect((sys2 as any).marshes).toHaveLength(0)
  })
})

// ─── 2. CHECK_INTERVAL 节流 ──────────────────────────────────────────────────

describe('WorldSaltMarshSystem - CHECK_INTERVAL 节流 (2600)', () => {
  let sys: WorldSaltMarshSystem
  const world = makeWorld(SAND)

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时 0-0=0 < 2600 → 被节流，lastCheck 不更新', () => {
    sys.update(0, world as any, fakeEm, 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('tick=2599 时被节流，lastCheck 不更新', () => {
    sys.update(0, world as any, fakeEm, 2599)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('tick=2600 时不被节流，lastCheck 更新为 2600', () => {
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('tick=2600 时 random=0，地形 SAND，会 spawn', () => {
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).marshes.length).toBeGreaterThanOrEqual(1)
  })

  it('第二次调用间隔不足 2600 被节流', () => {
    sys.update(0, world as any, fakeEm, 2600)
    const countAfterFirst = (sys as any).marshes.length
    sys.update(0, world as any, fakeEm, 2600 + 100)
    expect((sys as any).marshes.length).toBe(countAfterFirst)
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('第二次调用恰好达到间隔时再次执行', () => {
    sys.update(0, world as any, fakeEm, 2600)
    sys.update(0, world as any, fakeEm, 2600 + 2600)
    expect((sys as any).lastCheck).toBe(2600 + 2600)
  })

  it('lastCheck 始终被设为当前 tick', () => {
    sys.update(0, world as any, fakeEm, 8000)
    expect((sys as any).lastCheck).toBe(8000)
  })

  it('被节流时 marshes 不变', () => {
    ;(sys as any).marshes.push(makeMarsh({ tick: 100 }))
    sys.update(0, world as any, fakeEm, 100)
    // 100 < 2600 → 节流
    expect((sys as any).marshes).toHaveLength(1)
  })
})

// ─── 3. spawn 条件 ─────────────────────────────────────────────────────────

describe('WorldSaltMarshSystem - spawn 条件', () => {
  let sys: WorldSaltMarshSystem

  afterEach(() => { vi.restoreAllMocks() })

  it('random=0（0<0.003 true）且地形 SAND，会 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(SAND)
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).marshes.length).toBeGreaterThanOrEqual(1)
  })

  it('random=0，地形 SHALLOW_WATER，会 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(SHALLOW_WATER)
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).marshes.length).toBeGreaterThanOrEqual(1)
  })

  it('random=0.004（0.004>0.003，0.004<0.003 false），不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.004)
    const world = makeWorld(SAND)
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('random=1 时，不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeWorld(SAND)
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('地形为 GRASS，不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(GRASS)
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('地形为 DEEP_WATER，不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(DEEP_WATER)
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('地形为 FOREST，不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(FOREST)
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('marshes 达到 MAX_MARSHES=24 时不再 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 24; i++) {
      ;(sys as any).marshes.push(makeMarsh({ tick: 2600 }))
    }
    const world = makeWorld(SAND)
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).marshes.length).toBe(24)
  })

  it('marshes=23 时（< 24），还能继续 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 23; i++) {
      ;(sys as any).marshes.push(makeMarsh({ tick: 2600 }))
    }
    const world = makeWorld(SAND)
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).marshes.length).toBeGreaterThan(23)
  })
})

// ─── 4. spawn 字段范围 ──────────────────────────────────────────────────────

describe('WorldSaltMarshSystem - spawn 字段范围', () => {
  let sys: WorldSaltMarshSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => { vi.restoreAllMocks() })

  const world = makeWorld(SAND)

  it('spawn 的 marsh.tick 等于当前 tick', () => {
    sys.update(0, world as any, fakeEm, 2600)
    const m = (sys as any).marshes[0]
    expect(m.tick).toBe(2600)
  })

  it('spawn 的 marsh.id 从 1 开始', () => {
    sys.update(0, world as any, fakeEm, 2600)
    const m = (sys as any).marshes[0]
    expect(m.id).toBe(1)
  })

  it('spawn 后 nextId 变为 2', () => {
    sys.update(0, world as any, fakeEm, 2600)
    expect((sys as any).nextId).toBe(2)
  })

  it('radius 范围 [4, 10]（4+Math.floor(random*7)，random=0 → 4）', () => {
    sys.update(0, world as any, fakeEm, 2600)
    const m = (sys as any).marshes[0]
    expect(m.radius).toBeGreaterThanOrEqual(4)
    expect(m.radius).toBeLessThanOrEqual(10)
  })

  it('salinity 初始范围 [20, 70)，random=0 → 20，update 后可能变化', () => {
    sys.update(0, world as any, fakeEm, 2600)
    const m = (sys as any).marshes[0]
    // salinity 被 update 随机游走，最终在 [5,80]
    expect(m.salinity).toBeGreaterThanOrEqual(5)
    expect(m.salinity).toBeLessThanOrEqual(80)
  })

  it('vegetationDensity 初始范围 [10, 40)，random=0 → 10，update 后约 10.02', () => {
    sys.update(0, world as any, fakeEm, 2600)
    const m = (sys as any).marshes[0]
    // 初始10 + 0.02(update) = 10.02
    expect(m.vegetationDensity).toBeCloseTo(10.02, 2)
  })

  it('tidalRange 初始范围 [1, 5)，random=0 → 1（不被update修改）', () => {
    sys.update(0, world as any, fakeEm, 2600)
    const m = (sys as any).marshes[0]
    expect(m.tidalRange).toBeGreaterThanOrEqual(1)
    expect(m.tidalRange).toBeLessThan(5)
  })

  it('biodiversity 初始范围 [15, 55)，random=0 → 15，update 后约 15.015', () => {
    sys.update(0, world as any, fakeEm, 2600)
    const m = (sys as any).marshes[0]
    expect(m.biodiversity).toBeCloseTo(15.015, 2)
  })

  it('x y 坐标在 [8, w-8) 范围内（world.width=100, x=8..91）', () => {
    sys.update(0, world as any, fakeEm, 2600)
    const m = (sys as any).marshes[0]
    expect(m.x).toBeGreaterThanOrEqual(8)
    expect(m.x).toBeLessThan(92)
    expect(m.y).toBeGreaterThanOrEqual(8)
    expect(m.y).toBeLessThan(92)
  })

  it('多次 spawn 时 id 顺序递增', () => {
    // 先手动预置几条使nextId递增
    sys.update(0, world as any, fakeEm, 2600)
    sys.update(0, world as any, fakeEm, 5200)
    const marshes = (sys as any).marshes
    if (marshes.length >= 2) {
      expect(marshes[1].id).toBe(marshes[0].id + 1)
    }
    expect(marshes.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── 5. update 数值逻辑 ─────────────────────────────────────────────────────

describe('WorldSaltMarshSystem - update 数值逻辑', () => {
  let sys: WorldSaltMarshSystem

  afterEach(() => { vi.restoreAllMocks() })

  const world = makeWorld(DEEP_WATER) // 阻止新 spawn（非 SAND/SHALLOW_WATER）

  it('vegetationDensity 每次 update +0.02，不超过 90', () => {
    sys = makeSys()
    const m = makeMarsh({ vegetationDensity: 40, tick: 2600 })
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2600)
    expect(m.vegetationDensity).toBeCloseTo(40.02, 3)
  })

  it('vegetationDensity 达到上限 90 后不再增加', () => {
    sys = makeSys()
    const m = makeMarsh({ vegetationDensity: 89.985, tick: 2600 })
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2600)
    expect(m.vegetationDensity).toBe(90)
  })

  it('biodiversity 每次 update +0.015，不超过 100', () => {
    sys = makeSys()
    const m = makeMarsh({ biodiversity: 60, tick: 2600 })
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2600)
    expect(m.biodiversity).toBeCloseTo(60.015, 3)
  })

  it('biodiversity 达到上限 100 后不再增加', () => {
    sys = makeSys()
    const m = makeMarsh({ biodiversity: 99.99, tick: 2600 })
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2600)
    expect(m.biodiversity).toBe(100)
  })

  it('salinity 随机游走，random=0.5 → delta=(0.5-0.5)*0.3=0 → 不变', () => {
    sys = makeSys()
    const m = makeMarsh({ salinity: 40, tick: 2600 })
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2600)
    expect(m.salinity).toBeCloseTo(40, 5)
  })

  it('salinity 下限 5，不低于 5', () => {
    sys = makeSys()
    const m = makeMarsh({ salinity: 5.05, tick: 2600 })
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.5)*0.3 = -0.15 → 5.05-0.15=4.9 → clamp 5
    sys.update(0, world as any, fakeEm, 2600)
    expect(m.salinity).toBeGreaterThanOrEqual(5)
  })

  it('salinity 上限 80，不超过 80', () => {
    sys = makeSys()
    const m = makeMarsh({ salinity: 79.95, tick: 2600 })
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.5)*0.3 = 0.15 → 79.95+0.15=80.1 → clamp 80
    sys.update(0, world as any, fakeEm, 2600)
    expect(m.salinity).toBeLessThanOrEqual(80)
  })

  it('多个 marsh 的 vegetationDensity 都被 update', () => {
    sys = makeSys()
    const m1 = makeMarsh({ vegetationDensity: 30, tick: 2600 })
    const m2 = makeMarsh({ vegetationDensity: 50, tick: 2600 })
    ;(sys as any).marshes.push(m1, m2)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2600)
    expect(m1.vegetationDensity).toBeCloseTo(30.02, 3)
    expect(m2.vegetationDensity).toBeCloseTo(50.02, 3)
  })

  it('tidalRange 不被 update 逻辑修改', () => {
    sys = makeSys()
    const m = makeMarsh({ tidalRange: 3.5, tick: 2600 })
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2600)
    expect(m.tidalRange).toBe(3.5)
  })
})

// ─── 6. cleanup 逻辑 ────────────────────────────────────────────────────────

describe('WorldSaltMarshSystem - cleanup 逻辑 (cutoff = tick - 90000)', () => {
  let sys: WorldSaltMarshSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 阻止新spawn，稳定随机游走
  })

  afterEach(() => { vi.restoreAllMocks() })

  const world = makeWorld(DEEP_WATER) // 阻止 spawn

  it('tick 等于 cutoff 时，marsh 被保留（< 才删）', () => {
    const currentTick = 150000
    const cutoff = currentTick - 90000 // = 60000
    const m = makeMarsh({ tick: cutoff })
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).marshes).toHaveLength(1)
  })

  it('tick 比 cutoff 小 1 时，marsh 被删除', () => {
    const currentTick = 150000
    const cutoff = currentTick - 90000 // = 60000
    const m = makeMarsh({ tick: cutoff - 1 }) // 59999 < 60000 → 删除
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('tick 大于 cutoff 时，marsh 被保留', () => {
    const currentTick = 150000
    const cutoff = currentTick - 90000 // = 60000
    const m = makeMarsh({ tick: cutoff + 1 }) // 60001 > 60000 → 保留
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).marshes).toHaveLength(1)
  })

  it('混合新旧 marshes，旧的删除新的保留', () => {
    const currentTick = 150000
    const cutoff = currentTick - 90000 // = 60000
    const old1 = makeMarsh({ tick: cutoff - 1000 })
    const old2 = makeMarsh({ tick: 0 })
    const fresh1 = makeMarsh({ tick: cutoff })
    const fresh2 = makeMarsh({ tick: cutoff + 10000 })
    ;(sys as any).marshes.push(old1, old2, fresh1, fresh2)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).marshes).toHaveLength(2)
  })

  it('全部过期时 marshes 清空', () => {
    const currentTick = 200000
    for (let i = 0; i < 6; i++) {
      ;(sys as any).marshes.push(makeMarsh({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('全部未过期时 marshes 数量不变', () => {
    const currentTick = 100000
    // cutoff = 100000 - 90000 = 10000
    const freshTick = 50000 // 远大于 cutoff → 保留
    for (let i = 0; i < 5; i++) {
      ;(sys as any).marshes.push(makeMarsh({ tick: freshTick }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).marshes).toHaveLength(5)
  })

  it('cleanup 从后往前遍历，不遗漏中间元素', () => {
    const currentTick = 150000
    const cutoff = currentTick - 90000 // = 60000
    const old1 = makeMarsh({ tick: cutoff - 100 })
    const fresh = makeMarsh({ tick: cutoff })
    const old2 = makeMarsh({ tick: cutoff - 200 })
    ;(sys as any).marshes.push(old1, fresh, old2)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    // fresh (= cutoff) 保留，old1 old2 删除
    expect((sys as any).marshes).toHaveLength(1)
    expect((sys as any).marshes[0].tick).toBe(cutoff)
  })

  it('cutoff 边界精确：tick=90000 时，cutoff=0，tick=0 被保留', () => {
    const currentTick = 90000
    const cutoff = 0
    const m = makeMarsh({ tick: 0 }) // tick = cutoff → 保留
    ;(sys as any).marshes.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).marshes).toHaveLength(1)
  })
})
