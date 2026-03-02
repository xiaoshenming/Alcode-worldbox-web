import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { WorldMirageSystem } from "../systems/WorldMirageSystem"
import type { Mirage, MirageType } from "../systems/WorldMirageSystem"

// ---- helpers ----
function makeSys(): WorldMirageSystem { return new WorldMirageSystem() }

// tile=3=GRASS: 不会触发 spawn（只有 SAND=2 才能 spawn）
function makeWorld(tileValue = 3, w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => tileValue,
  } as any
}

// makeWorldSand: tile=2=SAND，用于 spawn 相关测试
function makeWorldSand(w = 200, h = 200) {
  return makeWorld(2, w, h)
}

function makeEm() { return {} as any }

// CHECK_INTERVAL=3600, SPAWN_CHANCE=0.003, MAX_MIRAGES=8
// TileType.SAND = 2  (只有 SAND tile 才能 spawn)
const CHECK_INTERVAL = 3600

let nextId = 1
function makeMirage(overrides: Partial<Mirage> = {}): Mirage {
  return {
    id: nextId++,
    x: 50, y: 60,
    mirageType: "oasis",
    intensity: 70,
    duration: 30000,
    creaturesDeceived: 0,
    tick: 0,
    ...overrides,
  }
}

// TYPE_INTENSITY: oasis=70, city=50, lake=80, mountain=40

// ---- 1. 初始状态 ----
describe("WorldMirageSystem 初始状态", () => {
  let sys: WorldMirageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it("初始 mirages 数组为空", () => {
    expect((sys as any).mirages).toHaveLength(0)
  })

  it("nextId 初始值为 1", () => {
    expect((sys as any).nextId).toBe(1)
  })

  it("lastCheck 初始值为 0", () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it("mirages 属性为数组类型", () => {
    expect(Array.isArray((sys as any).mirages)).toBe(true)
  })

  it("多次构造互不影响", () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).mirages.push(makeMirage())
    expect((s2 as any).mirages).toHaveLength(0)
  })

  it("手动注入后数组长度正确", () => {
    ;(sys as any).mirages.push(makeMirage())
    ;(sys as any).mirages.push(makeMirage())
    expect((sys as any).mirages).toHaveLength(2)
  })

  it("支持4种幻景类型", () => {
    const types: MirageType[] = ["oasis", "city", "lake", "mountain"]
    expect(types).toHaveLength(4)
  })
})

// ---- 2. CHECK_INTERVAL 节流 ----
describe("WorldMirageSystem CHECK_INTERVAL 节流", () => {
  let sys: WorldMirageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it("tick=0 时（差值=0 < 3600）不执行，lastCheck 保持 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it("tick < CHECK_INTERVAL 时不更新 lastCheck", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it("tick == CHECK_INTERVAL 时执行并更新 lastCheck", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it("tick 远大于 CHECK_INTERVAL 时执行并更新", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 10000)
    expect((sys as any).lastCheck).toBe(10000)
  })

  it("连续两次差不足时不重复执行", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it("差值恰好等于 CHECK_INTERVAL 时再次执行", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

// ---- 3. spawn 条件 ----
describe("WorldMirageSystem spawn 条件", () => {
  let sys: WorldMirageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it("random >= SPAWN_CHANCE（0.003）时不 spawn", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9)
    sys.update(1, makeWorldSand(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(0)
  })

  it("random == 0（< SPAWN_CHANCE）且 tile==SAND 时 spawn", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorldSand(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(1)
  })

  it("tile != SAND（tile=3=GRASS）时不 spawn", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(3), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(0)
  })

  it("tile == null 时不 spawn", () => {
    const world = { width: 200, height: 200, getTile: () => null } as any
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(0)
  })

  it("达到 MAX_MIRAGES（8）后不再 spawn", () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).mirages.push(makeMirage({ tick: CHECK_INTERVAL, intensity: 50, duration: 999999 }))
    }
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorldSand(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(8)
  })

  it("低于 MAX_MIRAGES 时 spawn 后数量 +1", () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).mirages.push(makeMirage({ tick: CHECK_INTERVAL, intensity: 50, duration: 999999 }))
    }
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorldSand(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(6)
  })

  it("spawn 后 nextId 递增", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorldSand(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it("spawn 后 tick 字段等于传入 tick", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorldSand(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages[0].tick).toBe(CHECK_INTERVAL)
  })

  it("不是 SAND 的 tile（DEEP_WATER=0）时不 spawn", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(0), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(0)
  })
})

// ---- 4. 字段范围验证 ----
describe("WorldMirageSystem 字段范围", () => {
  let sys: WorldMirageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it("spawn 后 intensity 在 (0, 80] 范围内（初始时 age≈0）", () => {
    // spawn 后立即 update: age = 0（tick_spawn == tick_current）=> intensity = TYPE_INTENSITY * 1
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorldSand(), makeEm(), CHECK_INTERVAL)
    const m = (sys as any).mirages[0]
    expect(m.intensity).toBeGreaterThan(0)
    expect(m.intensity).toBeLessThanOrEqual(80)
  })

  it("spawn 后 duration 在 [20000, 60000) 范围内（random=0 时 duration=20000）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorldSand(), makeEm(), CHECK_INTERVAL)
    const m = (sys as any).mirages[0]
    expect(m.duration).toBeGreaterThanOrEqual(20000)
    expect(m.duration).toBeLessThan(60000)
  })

  it("spawn 后 x 在 [0, world.width) 范围内", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorldSand(100, 100), makeEm(), CHECK_INTERVAL)
    const m = (sys as any).mirages[0]
    expect(m.x).toBeGreaterThanOrEqual(0)
    expect(m.x).toBeLessThan(100)
  })

  it("spawn 后 y 在 [0, world.height) 范围内", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorldSand(100, 100), makeEm(), CHECK_INTERVAL)
    const m = (sys as any).mirages[0]
    expect(m.y).toBeGreaterThanOrEqual(0)
    expect(m.y).toBeLessThan(100)
  })

  it("spawn 后 id 从 1 开始", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorldSand(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages[0].id).toBe(1)
  })

  it("spawn 后 mirageType 是有效类型之一", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorldSand(), makeEm(), CHECK_INTERVAL)
    const validTypes: MirageType[] = ["oasis", "city", "lake", "mountain"]
    expect(validTypes).toContain((sys as any).mirages[0].mirageType)
  })
})

// ---- 5. update 数值逻辑 ----
describe("WorldMirageSystem update 数值逻辑", () => {
  let sys: WorldMirageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it("intensity 随 age 增大而衰减（不在起始位置时）", () => {
    // age = CHECK_INTERVAL（3600），duration=30000 => intensity = 70*(1-3600/30000) ≈ 61.6
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration: 30000, tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    const m = (sys as any).mirages[0]
    expect(m.intensity).toBeLessThan(70)
    expect(m.intensity).toBeGreaterThan(0)
  })

  it("oasis 的基础 intensity 是 70", () => {
    // age ≈ 0 => intensity ≈ 70
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration: 99999999, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages[0].intensity).toBeCloseTo(70, 0)
  })

  it("lake 的基础 intensity 是 80", () => {
    ;(sys as any).mirages.push(makeMirage({ mirageType: "lake", intensity: 80, duration: 99999999, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages[0].intensity).toBeCloseTo(80, 0)
  })

  it("city 的基础 intensity 是 50", () => {
    ;(sys as any).mirages.push(makeMirage({ mirageType: "city", intensity: 50, duration: 99999999, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages[0].intensity).toBeCloseTo(50, 0)
  })

  it("mountain 的基础 intensity 是 40", () => {
    ;(sys as any).mirages.push(makeMirage({ mirageType: "mountain", intensity: 40, duration: 99999999, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages[0].intensity).toBeCloseTo(40, 0)
  })

  it("intensity > 20 且 random < 0.01 时 creaturesDeceived 递增", () => {
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration: 99999999, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, "random").mockReturnValue(0)  // 0 < 0.01 => deceive
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages[0].creaturesDeceived).toBe(1)
  })

  it("intensity > 20 且 random >= 0.01 时 creaturesDeceived 不递增", () => {
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration: 99999999, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages[0].creaturesDeceived).toBe(0)
  })

  it("intensity <= 20 时即使 random < 0.01 也不递增 creaturesDeceived", () => {
    // intensity=70*(1-age/duration)，设 age=duration*0.75 => intensity=70*0.25=17.5 < 20 => 不触发
    const duration = 40000
    const age = Math.floor(duration * 0.75)  // 30000
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration, tick: CHECK_INTERVAL - age }))
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    // intensity = 70*(1-30000/40000) = 70*0.25 = 17.5 <= 20 => 不 deceive
    expect((sys as any).mirages[0].creaturesDeceived).toBe(0)
  })

  it("tick 不足 CHECK_INTERVAL 时 intensity 不变", () => {
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration: 30000, tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).mirages[0].intensity).toBe(70)
  })
})

// ---- 6. cleanup 逻辑 ----
describe("WorldMirageSystem cleanup 逻辑", () => {
  let sys: WorldMirageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it("age >= duration 时 intensity 变为 0 且被删除", () => {
    const duration = CHECK_INTERVAL
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration, tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(0)
  })

  it("intensity > 0 的幻景被保留", () => {
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration: 9999999, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(1)
  })

  it("intensity 计算结果恰好 <= 0 时被删除", () => {
    // duration=1 => age=CHECK_INTERVAL >> duration => intensity=70*(1-3600/1) << 0 => max(0,...) = 0 => 删除
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration: 1, tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(0)
  })

  it("只删除 intensity<=0 的幻景，保留存活的", () => {
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration: 1, tick: 0 }))
    ;(sys as any).mirages.push(makeMirage({ mirageType: "lake", intensity: 80, duration: 9999999, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(1)
    expect((sys as any).mirages[0].mirageType).toBe("lake")
  })

  it("多个 intensity<=0 的幻景全部被删除", () => {
    for (let i = 0; i < 4; i++) {
      ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration: 1, tick: 0 }))
    }
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).mirages).toHaveLength(0)
  })

  it("cleanup 后 nextId 不重置", () => {
    ;(sys as any).nextId = 5
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 70, duration: 1, tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(5)
    expect((sys as any).mirages).toHaveLength(0)
  })

  it("tick 不足 CHECK_INTERVAL 时不执行 cleanup", () => {
    ;(sys as any).mirages.push(makeMirage({ mirageType: "oasis", intensity: 0, duration: 1, tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
    // 未执行 update，intensity 仍为注入值 0，但 cleanup 也没跑
    expect((sys as any).mirages).toHaveLength(1)
  })

  it("同一次 update 中 spawn 的新幻景不被误删（age=0 时 intensity=TYPE_INTENSITY > 0）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)  // spawn + 不 deceive（random<0.01 触发 deceive）
    sys.update(1, makeWorldSand(), makeEm(), CHECK_INTERVAL)
    // spawn 的新幻景 age=0 => intensity=TYPE_INTENSITY > 0 => 不应被 cleanup
    expect((sys as any).mirages).toHaveLength(1)
  })
})
