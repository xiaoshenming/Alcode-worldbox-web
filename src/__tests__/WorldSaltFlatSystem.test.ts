import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSaltFlatSystem } from '../systems/WorldSaltFlatSystem'
import type { SaltFlat } from '../systems/WorldSaltFlatSystem'

// TileType 枚举值
const DEEP_WATER = 0
const SHALLOW_WATER = 1
const SAND = 2
const GRASS = 3
const FOREST = 4
const MOUNTAIN = 5

// CHECK_INTERVAL=2800, FORM_CHANCE=0.002, MAX_FLATS=20
// spawn 条件：Math.random() < FORM_CHANCE → random=0 时 0<0.002 true → spawn
// 地形：SAND=2 或 GRASS=3
// cleanup: tick < cutoff (cutoff = tick - 92000)
// update 顺序：spawn → updateAll → cleanup

function makeSys(): WorldSaltFlatSystem {
  return new WorldSaltFlatSystem()
}

function makeWorld(tileValue: number = SAND) {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => tileValue,
  }
}

const fakeEm = {} as any

let idHelper = 200
function makeFlat(overrides: Partial<SaltFlat> = {}): SaltFlat {
  return {
    id: idHelper++,
    x: 20, y: 30,
    radius: 8,
    crustThickness: 10,
    mineralPurity: 60,
    reflectivity: 70,
    moistureLevel: 15,
    hexagonalPatterns: 30,
    tick: 0,
    ...overrides,
  }
}

// ─── 1. 初始状态 ────────────────────────────────────────────────────────────

describe('WorldSaltFlatSystem - 初始状态', () => {
  let sys: WorldSaltFlatSystem

  beforeEach(() => { sys = makeSys() })

  it('初始 flats 数组为空', () => {
    expect((sys as any).flats).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动注入一条 flat 后长度为 1', () => {
    ;(sys as any).flats.push(makeFlat())
    expect((sys as any).flats).toHaveLength(1)
  })

  it('手动注入多条 flat 后长度正确', () => {
    ;(sys as any).flats.push(makeFlat(), makeFlat(), makeFlat())
    expect((sys as any).flats).toHaveLength(3)
  })

  it('flats 是同一内部引用', () => {
    const ref = (sys as any).flats
    expect(ref).toBe((sys as any).flats)
  })

  it('注入 flat 的字段可正确读取', () => {
    const f = makeFlat({ crustThickness: 12, mineralPurity: 75, reflectivity: 85 })
    ;(sys as any).flats.push(f)
    const stored = (sys as any).flats[0]
    expect(stored.crustThickness).toBe(12)
    expect(stored.mineralPurity).toBe(75)
    expect(stored.reflectivity).toBe(85)
  })

  it('不同实例互不影响', () => {
    const sys2 = makeSys()
    ;(sys as any).flats.push(makeFlat())
    expect((sys2 as any).flats).toHaveLength(0)
  })
})

// ─── 2. CHECK_INTERVAL 节流 ──────────────────────────────────────────────────

describe('WorldSaltFlatSystem - CHECK_INTERVAL 节流 (2800)', () => {
  let sys: WorldSaltFlatSystem
  const world = makeWorld(SAND)

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时 0-0=0 < 2800 → 被节流，lastCheck 不更新', () => {
    sys.update(0, world as any, fakeEm, 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).flats).toHaveLength(0)
  })

  it('tick=2799 时被节流，lastCheck 不更新', () => {
    sys.update(0, world as any, fakeEm, 2799)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).flats).toHaveLength(0)
  })

  it('tick=2800 时不被节流，lastCheck 更新为 2800', () => {
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('tick=2800 时 random=0 可以 spawn', () => {
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).flats.length).toBeGreaterThanOrEqual(1)
  })

  it('第二次调用间隔不足 2800 被节流', () => {
    sys.update(0, world as any, fakeEm, 2800)
    const countAfterFirst = (sys as any).flats.length
    sys.update(0, world as any, fakeEm, 2800 + 100)
    expect((sys as any).flats.length).toBe(countAfterFirst)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('第二次调用恰好达到间隔时再次执行', () => {
    sys.update(0, world as any, fakeEm, 2800)
    sys.update(0, world as any, fakeEm, 2800 + 2800)
    expect((sys as any).lastCheck).toBe(2800 + 2800)
  })

  it('lastCheck 始终被设为当前 tick', () => {
    sys.update(0, world as any, fakeEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('被节流时 flats 数组不变', () => {
    ;(sys as any).flats.push(makeFlat({ tick: 100 }))
    sys.update(0, world as any, fakeEm, 100)
    // 100 < 2800 → 节流，不 spawn 不 cleanup
    expect((sys as any).flats).toHaveLength(1)
  })
})

// ─── 3. spawn 条件 ─────────────────────────────────────────────────────────

describe('WorldSaltFlatSystem - spawn 条件', () => {
  let sys: WorldSaltFlatSystem

  afterEach(() => { vi.restoreAllMocks() })

  it('random=0 时（0<0.002 true）且地形 SAND，会 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(SAND)
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).flats.length).toBeGreaterThanOrEqual(1)
  })

  it('random=0 时，地形 GRASS，会 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(GRASS)
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).flats.length).toBeGreaterThanOrEqual(1)
  })

  it('random=0.003 时（0.003>0.002，0.003 < 0.002 false），不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    const world = makeWorld(SAND)
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).flats).toHaveLength(0)
  })

  it('random=1 时，不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeWorld(SAND)
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).flats).toHaveLength(0)
  })

  it('地形为 FOREST，不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(FOREST)
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).flats).toHaveLength(0)
  })

  it('地形为 SHALLOW_WATER，不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(SHALLOW_WATER)
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).flats).toHaveLength(0)
  })

  it('地形为 MOUNTAIN，不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(MOUNTAIN)
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).flats).toHaveLength(0)
  })

  it('flats 达到 MAX_FLATS=20 时不再 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 20; i++) {
      ;(sys as any).flats.push(makeFlat({ tick: 2800 }))
    }
    const world = makeWorld(SAND)
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).flats.length).toBe(20)
  })

  it('flats=19 时（< 20），还能继续 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 19; i++) {
      ;(sys as any).flats.push(makeFlat({ tick: 2800 }))
    }
    const world = makeWorld(SAND)
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).flats.length).toBeGreaterThan(19)
  })
})

// ─── 4. spawn 字段范围 ──────────────────────────────────────────────────────

describe('WorldSaltFlatSystem - spawn 字段范围', () => {
  let sys: WorldSaltFlatSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => { vi.restoreAllMocks() })

  const world = makeWorld(SAND)

  it('spawn 的 flat.tick 等于当前 tick', () => {
    sys.update(0, world as any, fakeEm, 2800)
    // flat 被 spawn 后还被 update 一次，tick 不变
    const f = (sys as any).flats[0]
    expect(f.tick).toBe(2800)
  })

  it('spawn 的 flat.id 从 1 开始', () => {
    sys.update(0, world as any, fakeEm, 2800)
    const f = (sys as any).flats[0]
    expect(f.id).toBe(1)
  })

  it('spawn 后 nextId 变为 2', () => {
    sys.update(0, world as any, fakeEm, 2800)
    expect((sys as any).nextId).toBe(2)
  })

  it('radius 范围 [5, 10]（Math.floor(random*6) + 5，random=0 → 5）', () => {
    sys.update(0, world as any, fakeEm, 2800)
    const f = (sys as any).flats[0]
    expect(f.radius).toBeGreaterThanOrEqual(5)
    expect(f.radius).toBeLessThanOrEqual(10)
  })

  it('crustThickness 范围 [2, 17)，random=0 时约为 2+0.002（含update）', () => {
    sys.update(0, world as any, fakeEm, 2800)
    const f = (sys as any).flats[0]
    // spawn 时 2 + 0*15 = 2，update 后 +0.002 = 2.002
    expect(f.crustThickness).toBeCloseTo(2.002, 2)
  })

  it('mineralPurity 范围 [40, 80)，random=0 时约为 40+0.005', () => {
    sys.update(0, world as any, fakeEm, 2800)
    const f = (sys as any).flats[0]
    expect(f.mineralPurity).toBeCloseTo(40.005, 2)
  })

  it('reflectivity 初始范围 [50, 90)，random=0 时 50，update 后可能略变', () => {
    sys.update(0, world as any, fakeEm, 2800)
    const f = (sys as any).flats[0]
    expect(f.reflectivity).toBeGreaterThanOrEqual(30) // max(30,...)
    expect(f.reflectivity).toBeLessThanOrEqual(98)
  })

  it('moistureLevel 初始范围 [5, 25)，update 后在 [0,40]', () => {
    sys.update(0, world as any, fakeEm, 2800)
    const f = (sys as any).flats[0]
    expect(f.moistureLevel).toBeGreaterThanOrEqual(0)
    expect(f.moistureLevel).toBeLessThanOrEqual(40)
  })

  it('hexagonalPatterns 初始范围 [10, 60)，random=0 → 10，update 后约 10.008', () => {
    sys.update(0, world as any, fakeEm, 2800)
    const f = (sys as any).flats[0]
    expect(f.hexagonalPatterns).toBeCloseTo(10.008, 2)
  })

  it('x y 坐标在 [10, w-10) 范围内（world.width=100, x=10..89）', () => {
    sys.update(0, world as any, fakeEm, 2800)
    const f = (sys as any).flats[0]
    expect(f.x).toBeGreaterThanOrEqual(10)
    expect(f.x).toBeLessThan(90)
    expect(f.y).toBeGreaterThanOrEqual(10)
    expect(f.y).toBeLessThan(90)
  })
})

// ─── 5. update 数值逻辑 ─────────────────────────────────────────────────────

describe('WorldSaltFlatSystem - update 数值逻辑', () => {
  let sys: WorldSaltFlatSystem

  afterEach(() => { vi.restoreAllMocks() })

  const world = makeWorld(DEEP_WATER) // 阻止新 spawn（非 SAND/GRASS）

  it('crustThickness 每次 update +0.002，不超过 30', () => {
    sys = makeSys()
    const f = makeFlat({ crustThickness: 5, tick: 2800 })
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2800)
    expect(f.crustThickness).toBeCloseTo(5.002, 3)
  })

  it('crustThickness 到达上限 30 后不再增加', () => {
    sys = makeSys()
    const f = makeFlat({ crustThickness: 29.9995, tick: 2800 })
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2800)
    expect(f.crustThickness).toBe(30)
  })

  it('mineralPurity 每次 update +0.005，不超过 95', () => {
    sys = makeSys()
    const f = makeFlat({ mineralPurity: 60, tick: 2800 })
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2800)
    expect(f.mineralPurity).toBeCloseTo(60.005, 3)
  })

  it('mineralPurity 到达上限 95 后不再增加', () => {
    sys = makeSys()
    const f = makeFlat({ mineralPurity: 94.997, tick: 2800 })
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2800)
    expect(f.mineralPurity).toBe(95)
  })

  it('hexagonalPatterns 每次 update +0.008，不超过 80', () => {
    sys = makeSys()
    const f = makeFlat({ hexagonalPatterns: 40, tick: 2800 })
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2800)
    expect(f.hexagonalPatterns).toBeCloseTo(40.008, 3)
  })

  it('hexagonalPatterns 到达上限 80 后不再增加', () => {
    sys = makeSys()
    const f = makeFlat({ hexagonalPatterns: 79.994, tick: 2800 })
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, fakeEm, 2800)
    expect(f.hexagonalPatterns).toBe(80)
  })

  it('reflectivity 下限 30，不低于 30', () => {
    sys = makeSys()
    const f = makeFlat({ reflectivity: 30.001, tick: 2800 })
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.45)*0.2 = -0.09 → 30.001-0.09 = 29.911 → clamp 30
    sys.update(0, world as any, fakeEm, 2800)
    expect(f.reflectivity).toBeGreaterThanOrEqual(30)
  })

  it('reflectivity 上限 98，不超过 98', () => {
    sys = makeSys()
    const f = makeFlat({ reflectivity: 97.99, tick: 2800 })
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.45)*0.2 = 0.11 → 97.99+0.11 = 98.1 → clamp 98
    sys.update(0, world as any, fakeEm, 2800)
    expect(f.reflectivity).toBeLessThanOrEqual(98)
  })

  it('moistureLevel 下限 0，不低于 0', () => {
    sys = makeSys()
    const f = makeFlat({ moistureLevel: 0.05, tick: 2800 })
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.55)*0.3 = -0.165 → 0.05-0.165 < 0 → clamp 0
    sys.update(0, world as any, fakeEm, 2800)
    expect(f.moistureLevel).toBeGreaterThanOrEqual(0)
  })
})

// ─── 6. cleanup 逻辑 ────────────────────────────────────────────────────────

describe('WorldSaltFlatSystem - cleanup 逻辑 (cutoff = tick - 92000)', () => {
  let sys: WorldSaltFlatSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 阻止新spawn (0.5 > 0.002)，stabilize random walk
  })

  afterEach(() => { vi.restoreAllMocks() })

  const world = makeWorld(DEEP_WATER)

  it('tick 等于 cutoff 时，flat 被保留（< 才删）', () => {
    const currentTick = 150000
    const cutoff = currentTick - 92000 // = 58000
    const f = makeFlat({ tick: cutoff })
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).flats).toHaveLength(1)
  })

  it('tick 比 cutoff 小 1 时，flat 被删除', () => {
    const currentTick = 150000
    const cutoff = currentTick - 92000 // = 58000
    const f = makeFlat({ tick: cutoff - 1 }) // 57999 < 58000 → 删除
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).flats).toHaveLength(0)
  })

  it('tick 大于 cutoff 时，flat 被保留', () => {
    const currentTick = 150000
    const cutoff = currentTick - 92000 // = 58000
    const f = makeFlat({ tick: cutoff + 1 }) // 58001 > 58000 → 保留
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).flats).toHaveLength(1)
  })

  it('混合新旧 flats，旧的删除新的保留', () => {
    const currentTick = 150000
    const cutoff = currentTick - 92000 // = 58000
    const old1 = makeFlat({ tick: cutoff - 100 })
    const old2 = makeFlat({ tick: 1000 })
    const fresh1 = makeFlat({ tick: cutoff })
    const fresh2 = makeFlat({ tick: cutoff + 5000 })
    ;(sys as any).flats.push(old1, old2, fresh1, fresh2)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).flats).toHaveLength(2)
  })

  it('全部过期时 flats 清空', () => {
    const currentTick = 200000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).flats.push(makeFlat({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).flats).toHaveLength(0)
  })

  it('全部未过期时 flats 数量不变', () => {
    const currentTick = 100000
    // cutoff = 100000 - 92000 = 8000
    const freshTick = 50000 // 远大于 cutoff → 保留
    for (let i = 0; i < 4; i++) {
      ;(sys as any).flats.push(makeFlat({ tick: freshTick }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).flats).toHaveLength(4)
  })

  it('cleanup 从后往前遍历，不遗漏中间元素', () => {
    const currentTick = 150000
    const cutoff = currentTick - 92000 // 58000
    const old1 = makeFlat({ tick: cutoff - 500 })
    const fresh = makeFlat({ tick: cutoff })
    const old2 = makeFlat({ tick: cutoff - 200 })
    ;(sys as any).flats.push(old1, fresh, old2)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).flats).toHaveLength(1)
    expect((sys as any).flats[0].tick).toBe(cutoff)
  })

  it('cutoff 边界精确：cutoff=tick-92000，tick=92000时，cutoff=0，tick=0被保留', () => {
    const currentTick = 92000
    const cutoff = 0
    const f = makeFlat({ tick: 0 }) // tick=cutoff → 保留
    ;(sys as any).flats.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, fakeEm, currentTick)
    expect((sys as any).flats).toHaveLength(1)
  })
})
