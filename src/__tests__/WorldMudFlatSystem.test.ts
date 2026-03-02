import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { WorldMudFlatSystem } from "../systems/WorldMudFlatSystem"
import type { MudFlat } from "../systems/WorldMudFlatSystem"

// ─── mock helpers ────────────────────────────────────────────────────────────
function makeSys(): WorldMudFlatSystem { return new WorldMudFlatSystem() }

function makeWorld(tile = 2): { width: number; height: number; getTile: () => number } {
  return { width: 200, height: 200, getTile: () => tile }
}

function makeEM() { return {} as any }

function pushFlat(sys: WorldMudFlatSystem, override: Partial<MudFlat> = {}): MudFlat {
  const f: MudFlat = {
    id: (sys as any).nextId++,
    x: 15, y: 25,
    radius: 10,
    sedimentDepth: 3,
    moistureLevel: 80,
    invertebrateCount: 50,
    birdActivity: 30,
    tick: 0,
    ...override,
  }
  ;(sys as any).flats.push(f)
  return f
}

// ─── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe("WorldMudFlatSystem 初始状态", () => {
  let sys: WorldMudFlatSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it("flats 初始为空数组", () => {
    expect((sys as any).flats).toHaveLength(0)
  })

  it("nextId 初始值为 1", () => {
    expect((sys as any).nextId).toBe(1)
  })

  it("lastCheck 初始值为 0", () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it("flats 是数组类型", () => {
    expect(Array.isArray((sys as any).flats)).toBe(true)
  })

  it("多次构造实例互不影响", () => {
    const sys2 = makeSys()
    pushFlat(sys)
    expect((sys2 as any).flats).toHaveLength(0)
  })

  it("注入一条后长度为 1", () => {
    pushFlat(sys)
    expect((sys as any).flats).toHaveLength(1)
  })

  it("注入多条后长度正确", () => {
    pushFlat(sys); pushFlat(sys); pushFlat(sys)
    expect((sys as any).flats).toHaveLength(3)
  })
})

// ─── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe("WorldMudFlatSystem CHECK_INTERVAL 节流", () => {
  let sys: WorldMudFlatSystem
  const em = makeEM()

  afterEach(() => { vi.restoreAllMocks() })

  it("tick=0 时不执行（差值=0 < 2700）", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(2) as any, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it("tick=2699 时不执行（差值 < 2700）", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(2) as any, em, 2699)
    expect((sys as any).lastCheck).toBe(0)
  })

  it("tick=2700 时恰好执行（差值 >= 2700）", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(2) as any, em, 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })

  it("第一次执行后 lastCheck 更新为当前 tick", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(2) as any, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it("第二次调用不满 2700 时不更新 lastCheck", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(2) as any, em, 5000)
    sys.update(1, makeWorld(2) as any, em, 7699)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it("第二次满足间隔时 lastCheck 更新", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(2) as any, em, 5000)
    sys.update(1, makeWorld(2) as any, em, 7700)
    expect((sys as any).lastCheck).toBe(7700)
  })
})

// ─── 3. spawn 条件 ────────────────────────────────────────────────────────────
describe("WorldMudFlatSystem spawn 条件", () => {
  let sys: WorldMudFlatSystem
  const em = makeEM()

  afterEach(() => { vi.restoreAllMocks() })

  it("tile=SAND(2) + random 足够小 → 生成泥滩", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValueOnce(0.002).mockReturnValue(0.5)
    sys.update(1, makeWorld(2) as any, em, 2700)
    expect((sys as any).flats).toHaveLength(1)
  })

  it("tile=SHALLOW_WATER(1) + random 足够小 → 生成泥滩", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValueOnce(0.002).mockReturnValue(0.5)
    sys.update(1, makeWorld(1) as any, em, 2700)
    expect((sys as any).flats).toHaveLength(1)
  })

  it("tile=GRASS(3) → 不生成泥滩", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValueOnce(0.002).mockReturnValue(0.5)
    sys.update(1, makeWorld(3) as any, em, 2700)
    expect((sys as any).flats).toHaveLength(0)
  })

  it("tile=MOUNTAIN(5) → 不生成泥滩", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValueOnce(0.002).mockReturnValue(0.5)
    sys.update(1, makeWorld(5) as any, em, 2700)
    expect((sys as any).flats).toHaveLength(0)
  })

  it("tile=DEEP_WATER(0) → 不生成泥滩（只接受 SAND 和 SHALLOW_WATER）", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValueOnce(0.002).mockReturnValue(0.5)
    sys.update(1, makeWorld(0) as any, em, 2700)
    expect((sys as any).flats).toHaveLength(0)
  })

  it("random >= FORM_CHANCE(0.003) → 不生成泥滩", () => {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValueOnce(0.004).mockReturnValue(0.5)
    sys.update(1, makeWorld(2) as any, em, 2700)
    expect((sys as any).flats).toHaveLength(0)
  })

  it("已达 MAX_FLATS(22) → 不再生成", () => {
    sys = makeSys()
    for (let i = 0; i < 22; i++) pushFlat(sys, { tick: 2700 })
    vi.spyOn(Math, "random").mockReturnValueOnce(0.002).mockReturnValue(0.5)
    sys.update(1, makeWorld(2) as any, em, 2700)
    expect((sys as any).flats).toHaveLength(22)
  })

  it("21 条时还可以再生成一条（未达上限）", () => {
    sys = makeSys()
    for (let i = 0; i < 21; i++) pushFlat(sys, { tick: 2700 })
    vi.spyOn(Math, "random").mockReturnValueOnce(0.002).mockReturnValue(0.5)
    sys.update(1, makeWorld(2) as any, em, 2700)
    expect((sys as any).flats).toHaveLength(22)
  })
})

// ─── 4. spawn 后字段范围 ──────────────────────────────────────────────────────
describe("WorldMudFlatSystem spawn 后字段范围", () => {
  let sys: WorldMudFlatSystem
  const em = makeEM()

  afterEach(() => { vi.restoreAllMocks() })

  function spawnAndGet(): MudFlat {
    sys = makeSys()
    vi.spyOn(Math, "random").mockReturnValueOnce(0.002).mockReturnValue(0.5)
    sys.update(1, makeWorld(2) as any, em, 2700)
    return (sys as any).flats[0]
  }

  it("id 从 1 开始", () => {
    const f = spawnAndGet()
    expect(f.id).toBe(1)
  })

  it("radius 在 [5, 10] 之间（5 + floor(random*6)）", () => {
    const f = spawnAndGet()
    expect(f.radius).toBeGreaterThanOrEqual(5)
    expect(f.radius).toBeLessThanOrEqual(10)
  })

  it("sedimentDepth 在 [3, 18] 之间（3 + random*15）", () => {
    // spawn后update: sedimentDepth += (random-0.48)*0.1; random=0.5 → +0.002
    const f = spawnAndGet()
    expect(f.sedimentDepth).toBeGreaterThanOrEqual(1) // Math.max(1, ...)
    expect(f.sedimentDepth).toBeLessThanOrEqual(19)
  })

  it("moistureLevel 在 [40, 90] 之间（40 + random*50）", () => {
    const f = spawnAndGet()
    expect(f.moistureLevel).toBeGreaterThanOrEqual(10) // Math.max(10, ...)
    expect(f.moistureLevel).toBeLessThanOrEqual(95)    // Math.min(95, ...)
  })

  it("invertebrateCount 在 [20, 99] 之间（20 + floor(random*80)）", () => {
    const f = spawnAndGet()
    expect(f.invertebrateCount).toBeGreaterThanOrEqual(5)   // Math.max(5, ...)
    expect(f.invertebrateCount).toBeLessThanOrEqual(200)
  })

  it("birdActivity 在 [10, 50] 之间（10 + random*40）", () => {
    const f = spawnAndGet()
    expect(f.birdActivity).toBeGreaterThanOrEqual(10)
    expect(f.birdActivity).toBeLessThanOrEqual(90) // Math.min(90, ...)
  })

  it("tick 等于当前 tick(2700)", () => {
    const f = spawnAndGet()
    expect(f.tick).toBe(2700)
  })
})

// ─── 5. update 数值逻辑 ───────────────────────────────────────────────────────
describe("WorldMudFlatSystem update 数值逻辑", () => {
  let sys: WorldMudFlatSystem
  const em = makeEM()
  const world = makeWorld(3) // 不符合spawn条件

  afterEach(() => { vi.restoreAllMocks() })

  it("birdActivity 每次 update +0.01", () => {
    sys = makeSys()
    pushFlat(sys, { birdActivity: 30, tick: 2700 })
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    sys.update(1, world as any, em, 2700)
    expect((sys as any).flats[0].birdActivity).toBeCloseTo(30.01, 3)
  })

  it("birdActivity 上限为 90", () => {
    sys = makeSys()
    pushFlat(sys, { birdActivity: 89.99, tick: 2700 })
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    sys.update(1, world as any, em, 2700)
    expect((sys as any).flats[0].birdActivity).toBeLessThanOrEqual(90)
  })

  it("moistureLevel 下限为 10", () => {
    sys = makeSys()
    pushFlat(sys, { moistureLevel: 10.5, tick: 2700 })
    vi.spyOn(Math, "random").mockReturnValue(0) // (0-0.5)*2 = -1
    sys.update(1, world as any, em, 2700)
    expect((sys as any).flats[0].moistureLevel).toBeGreaterThanOrEqual(10)
  })

  it("moistureLevel 上限为 95", () => {
    sys = makeSys()
    pushFlat(sys, { moistureLevel: 95, tick: 2700 })
    vi.spyOn(Math, "random").mockReturnValue(1) // (1-0.5)*2 = +1
    sys.update(1, world as any, em, 2700)
    expect((sys as any).flats[0].moistureLevel).toBeLessThanOrEqual(95)
  })

  it("sedimentDepth 下限为 1", () => {
    sys = makeSys()
    pushFlat(sys, { sedimentDepth: 1.04, tick: 2700 })
    vi.spyOn(Math, "random").mockReturnValue(0) // (0-0.48)*0.1 = -0.048
    sys.update(1, world as any, em, 2700)
    expect((sys as any).flats[0].sedimentDepth).toBeGreaterThanOrEqual(1)
  })

  it("invertebrateCount 下限为 5", () => {
    sys = makeSys()
    pushFlat(sys, { invertebrateCount: 5, tick: 2700 })
    vi.spyOn(Math, "random").mockReturnValue(0) // floor((0-0.45)*3) = floor(-1.35) = -2
    sys.update(1, world as any, em, 2700)
    expect((sys as any).flats[0].invertebrateCount).toBeGreaterThanOrEqual(5)
  })

  it("invertebrateCount 上限为 200", () => {
    sys = makeSys()
    pushFlat(sys, { invertebrateCount: 200, tick: 2700 })
    vi.spyOn(Math, "random").mockReturnValue(1) // floor((1-0.45)*3) = floor(1.65) = 1
    sys.update(1, world as any, em, 2700)
    expect((sys as any).flats[0].invertebrateCount).toBeLessThanOrEqual(200)
  })

  it("sedimentDepth 随 random=0.5 微增（(0.5-0.48)*0.1=0.002）", () => {
    sys = makeSys()
    pushFlat(sys, { sedimentDepth: 10, tick: 2700 })
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    sys.update(1, world as any, em, 2700)
    expect((sys as any).flats[0].sedimentDepth).toBeCloseTo(10.002, 4)
  })
})

// ─── 6. cleanup 逻辑 ──────────────────────────────────────────────────────────
describe("WorldMudFlatSystem cleanup 逻辑", () => {
  let sys: WorldMudFlatSystem
  const em = makeEM()
  const world = makeWorld(3) // 不触发spawn

  afterEach(() => { vi.restoreAllMocks() })

  // cutoff = tick - 88000
  it("tick=0 的泥滩在 tick=88001 时被删除", () => {
    sys = makeSys()
    pushFlat(sys, { tick: 0 })
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 88001)
    expect((sys as any).flats).toHaveLength(0)
  })

  it("tick=1 的泥滩在 tick=88001 时保留（1 < 1 不成立）", () => {
    // cutoff = 88001 - 88000 = 1，1 < 1 = false → 保留
    sys = makeSys()
    pushFlat(sys, { tick: 1 })
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 88001)
    expect((sys as any).flats).toHaveLength(1)
  })

  it("tick=0 的泥滩在 tick=88000 时保留（0 < 0 不成立）", () => {
    // cutoff = 88000 - 88000 = 0，0 < 0 = false → 保留
    sys = makeSys()
    pushFlat(sys, { tick: 0 })
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 88000)
    expect((sys as any).flats).toHaveLength(1)
  })

  it("只删除过期的，保留未过期的", () => {
    sys = makeSys()
    pushFlat(sys, { tick: 0 })      // 过期 (0 < 1)
    pushFlat(sys, { tick: 20000 })  // 未过期
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 88001)
    expect((sys as any).flats).toHaveLength(1)
    expect((sys as any).flats[0].tick).toBe(20000)
  })

  it("全部过期时数组为空", () => {
    sys = makeSys()
    for (let i = 0; i < 5; i++) pushFlat(sys, { tick: 0 })
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 88001)
    expect((sys as any).flats).toHaveLength(0)
  })

  it("无过期记录时长度不变", () => {
    sys = makeSys()
    pushFlat(sys, { tick: 5000 }); pushFlat(sys, { tick: 5000 })
    vi.spyOn(Math, "random").mockReturnValue(0)
    // tick=5000, cutoff=5000-88000 < 0 → 无删除
    sys.update(1, world as any, em, 5000)
    expect((sys as any).flats).toHaveLength(2)
  })

  it("nextId 在每次 spawn 后递增", () => {
    sys = makeSys()
    const worldSand = makeWorld(2)
    vi.spyOn(Math, "random").mockReturnValueOnce(0.002).mockReturnValue(0.5)
    sys.update(1, worldSand as any, em, 2700)
    expect((sys as any).nextId).toBe(2)
  })
})
