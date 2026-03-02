import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { WorldMoraineSystem } from "../systems/WorldMoraineSystem"
import type { Moraine } from "../systems/WorldMoraineSystem"

// ─── mock helpers ────────────────────────────────────────────────────────────
function makeSys(): WorldMoraineSystem { return new WorldMoraineSystem() }

function makeWorld(tile = 5): { width: number; height: number; getTile: () => number } {
  return { width: 200, height: 200, getTile: () => tile }
}

function makeEM() { return {} as any }

/** push一条冰碛直接进内部数组 */
function pushMoraine(sys: WorldMoraineSystem, override: Partial<Moraine> = {}): Moraine {
  const m: Moraine = {
    id: (sys as any).nextId++,
    x: 25, y: 35,
    length: 20, height: 8,
    debrisType: 2, glacialAge: 10000,
    vegetationCover: 30, stability: 70,
    tick: 0,
    ...override,
  }
  ;(sys as any).moraines.push(m)
  return m
}

// ─── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe("WorldMoraineSystem 初始状态", () => {
  let sys: WorldMoraineSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it("moraines 初始为空数组", () => {
    expect((sys as any).moraines).toHaveLength(0)
  })

  it("nextId 初始值为 1", () => {
    expect((sys as any).nextId).toBe(1)
  })

  it("lastCheck 初始值为 0", () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it("moraines 是数组类型", () => {
    expect(Array.isArray((sys as any).moraines)).toBe(true)
  })

  it("多次构造互不影响", () => {
    const sys2 = makeSys()
    pushMoraine(sys)
    expect((sys2 as any).moraines).toHaveLength(0)
  })

  it("注入一条后长度为 1", () => {
    pushMoraine(sys)
    expect((sys as any).moraines).toHaveLength(1)
  })

  it("注入多条后长度正确", () => {
    pushMoraine(sys); pushMoraine(sys); pushMoraine(sys)
    expect((sys as any).moraines).toHaveLength(3)
  })
})

// ─── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe("WorldMoraineSystem CHECK_INTERVAL 节流", () => {
  let sys: WorldMoraineSystem
  const world = makeWorld(5) // MOUNTAIN=5
  const em = makeEM()

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it("tick=0 时不执行（lastCheck=0, 差值=0 < 2800）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it("tick=2799 时不执行（差值 < 2800）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 2799)
    expect((sys as any).lastCheck).toBe(0)
  })

  it("tick=2800 时恰好执行（差值 >= 2800）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it("第一次执行后 lastCheck 更新为当前 tick", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it("第二次调用需要再过 2800 tick 才执行", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 3000)
    sys.update(1, world as any, em, 5799)
    expect((sys as any).lastCheck).toBe(3000) // 没有更新
  })

  it("第二次调用恰好 2800 后执行，lastCheck 更新", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 3000)
    sys.update(1, world as any, em, 5800)
    expect((sys as any).lastCheck).toBe(5800)
  })
})

// ─── 3. spawn 条件 ────────────────────────────────────────────────────────────
describe("WorldMoraineSystem spawn 条件", () => {
  let sys: WorldMoraineSystem
  const em = makeEM()

  afterEach(() => { vi.restoreAllMocks() })

  it("tile=MOUNTAIN(5) + random 足够小 → 生成冰碛", () => {
    sys = makeSys()
    const world = makeWorld(5)
    // 第一个 random < FORM_CHANCE(0.0016)，第二、三个 random 用于坐标
    vi.spyOn(Math, "random").mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines).toHaveLength(1)
  })

  it("tile=SNOW(6) + random 足够小 → 生成冰碛", () => {
    sys = makeSys()
    const world = makeWorld(6)
    vi.spyOn(Math, "random").mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines).toHaveLength(1)
  })

  it("tile=GRASS(3) → 不生成冰碛（条件不满足）", () => {
    sys = makeSys()
    const world = makeWorld(3)
    vi.spyOn(Math, "random").mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines).toHaveLength(0)
  })

  it("tile=LAVA(7) → 不生成冰碛", () => {
    sys = makeSys()
    const world = makeWorld(7)
    vi.spyOn(Math, "random").mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines).toHaveLength(0)
  })

  it("random >= FORM_CHANCE(0.0016) → 不生成冰碛", () => {
    sys = makeSys()
    const world = makeWorld(5)
    vi.spyOn(Math, "random").mockReturnValueOnce(0.002).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines).toHaveLength(0)
  })

  it("已达 MAX_MORAINES(14) → 不再生成", () => {
    sys = makeSys()
    const world = makeWorld(5)
    for (let i = 0; i < 14; i++) pushMoraine(sys, { tick: 2800 })
    vi.spyOn(Math, "random").mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines).toHaveLength(14)
  })

  it("13 条时还可以再生成一条（未达上限）", () => {
    sys = makeSys()
    const world = makeWorld(5)
    for (let i = 0; i < 13; i++) pushMoraine(sys, { tick: 2800 })
    vi.spyOn(Math, "random").mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines).toHaveLength(14)
  })
})

// ─── 4. spawn 后字段范围 ──────────────────────────────────────────────────────
describe("WorldMoraineSystem spawn 后字段范围", () => {
  let sys: WorldMoraineSystem
  const em = makeEM()

  afterEach(() => { vi.restoreAllMocks() })

  function spawnAndGet(): Moraine {
    sys = makeSys()
    const world = makeWorld(5)
    vi.spyOn(Math, "random").mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2800)
    return (sys as any).moraines[0]
  }

  it("id 从 1 开始递增", () => {
    const m = spawnAndGet()
    expect(m.id).toBe(1)
  })

  it("length 在 [15, 55] 之间（15 + random*40）", () => {
    // random=0.5 → length = 15+0.5*40 = 35
    const m = spawnAndGet()
    expect(m.length).toBeGreaterThanOrEqual(15)
    expect(m.length).toBeLessThanOrEqual(55)
  })

  it("height 在 [5, 25] 之间（5 + random*20）", () => {
    const m = spawnAndGet()
    expect(m.height).toBeGreaterThanOrEqual(5)
    expect(m.height).toBeLessThanOrEqual(25)
  })

  it("debrisType 在 [0, 4] 之间（floor(random*5)）", () => {
    const m = spawnAndGet()
    expect(m.debrisType).toBeGreaterThanOrEqual(0)
    expect(m.debrisType).toBeLessThanOrEqual(4)
  })

  it("glacialAge 在 [100, 600] 之间（100 + random*500）", () => {
    const m = spawnAndGet()
    expect(m.glacialAge).toBeGreaterThanOrEqual(100)
    expect(m.glacialAge).toBeLessThanOrEqual(600)
  })

  it("vegetationCover 在 [5, 35] 之间（5 + random*30）", () => {
    const m = spawnAndGet()
    expect(m.vegetationCover).toBeGreaterThanOrEqual(5)
    expect(m.vegetationCover).toBeLessThanOrEqual(35)
  })

  it("stability 在 [40, 80] 之间（40 + random*40）", () => {
    const m = spawnAndGet()
    expect(m.stability).toBeGreaterThanOrEqual(40)
    expect(m.stability).toBeLessThanOrEqual(80)
  })

  it("tick 等于当前 tick(2800)", () => {
    const m = spawnAndGet()
    expect(m.tick).toBe(2800)
  })
})

// ─── 5. update 数值逻辑 ───────────────────────────────────────────────────────
describe("WorldMoraineSystem update 数值逻辑", () => {
  let sys: WorldMoraineSystem
  const em = makeEM()
  const world = makeWorld(5)

  afterEach(() => { vi.restoreAllMocks() })

  it("glacialAge 每次 update 增加 0.01", () => {
    sys = makeSys()
    pushMoraine(sys, { glacialAge: 1000, tick: 2800 })
    vi.spyOn(Math, "random").mockReturnValue(0.5) // random-0.45>0, random-0.5=0
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines[0].glacialAge).toBeCloseTo(1000.01, 5)
  })

  it("height 每次 update 减少 0.0002", () => {
    sys = makeSys()
    pushMoraine(sys, { height: 10, tick: 2800 })
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines[0].height).toBeCloseTo(10 - 0.0002, 5)
  })

  it("height 不低于最小值 2", () => {
    sys = makeSys()
    pushMoraine(sys, { height: 2, tick: 2800 })
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    sys.update(1, world as any, em, 2800)
    // 2 - 0.0002 = 1.9998, Math.max(2, 1.9998) = 2
    expect((sys as any).moraines[0].height).toBeGreaterThanOrEqual(2)
  })

  it("vegetationCover 上限为 80", () => {
    sys = makeSys()
    pushMoraine(sys, { vegetationCover: 79.99, tick: 2800 })
    vi.spyOn(Math, "random").mockReturnValue(1) // (1-0.45)*0.12 = 0.066
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines[0].vegetationCover).toBeLessThanOrEqual(80)
  })

  it("vegetationCover 下限为 2", () => {
    sys = makeSys()
    pushMoraine(sys, { vegetationCover: 2.01, tick: 2800 })
    vi.spyOn(Math, "random").mockReturnValue(0) // (0-0.45)*0.12 = -0.054
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines[0].vegetationCover).toBeGreaterThanOrEqual(2)
  })

  it("stability 上限为 90", () => {
    sys = makeSys()
    pushMoraine(sys, { stability: 90, tick: 2800 })
    vi.spyOn(Math, "random").mockReturnValue(1) // (1-0.5)*0.1 = 0.05
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines[0].stability).toBeLessThanOrEqual(90)
  })

  it("stability 下限为 15", () => {
    sys = makeSys()
    pushMoraine(sys, { stability: 15.05, tick: 2800 })
    vi.spyOn(Math, "random").mockReturnValue(0) // (0-0.5)*0.1 = -0.05
    sys.update(1, world as any, em, 2800)
    expect((sys as any).moraines[0].stability).toBeGreaterThanOrEqual(15)
  })
})

// ─── 6. cleanup 逻辑 ──────────────────────────────────────────────────────────
describe("WorldMoraineSystem cleanup 逻辑", () => {
  let sys: WorldMoraineSystem
  const em = makeEM()
  const world = makeWorld(3) // 不符合spawn条件，避免干扰

  afterEach(() => { vi.restoreAllMocks() })

  // cutoff = tick - 94000
  it("tick=0 的冰碛在 tick=94001 时被删除", () => {
    sys = makeSys()
    pushMoraine(sys, { tick: 0 })
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 94001)
    expect((sys as any).moraines).toHaveLength(0)
  })

  it("tick=1 的冰碛在 tick=94001 时恰好被删除（0 < 1 不成立，保留）", () => {
    // cutoff = 94001 - 94000 = 1，条件是 moraine.tick < cutoff → 1 < 1 → false
    sys = makeSys()
    pushMoraine(sys, { tick: 1 })
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 94001)
    expect((sys as any).moraines).toHaveLength(1)
  })

  it("tick=0 的冰碛在 tick=94000 时保留（0 < 0 不成立）", () => {
    // cutoff = 94000 - 94000 = 0，0 < 0 → false
    sys = makeSys()
    pushMoraine(sys, { tick: 0 })
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 94000)
    expect((sys as any).moraines).toHaveLength(1)
  })

  it("只删除过期的，保留未过期的", () => {
    sys = makeSys()
    pushMoraine(sys, { tick: 0 })     // 过期
    pushMoraine(sys, { tick: 10000 }) // 未过期（cutoff=94001-94000=1）
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 94001)
    // cutoff=1, tick=0 < 1 → 删除; tick=10000 < 1 → false 保留
    expect((sys as any).moraines).toHaveLength(1)
    expect((sys as any).moraines[0].tick).toBe(10000)
  })

  it("全部过期时数组为空", () => {
    sys = makeSys()
    for (let i = 0; i < 5; i++) pushMoraine(sys, { tick: 0 })
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, world as any, em, 94001)
    expect((sys as any).moraines).toHaveLength(0)
  })

  it("无过期记录时数组长度不变", () => {
    sys = makeSys()
    pushMoraine(sys, { tick: 5000 })
    pushMoraine(sys, { tick: 5000 })
    vi.spyOn(Math, "random").mockReturnValue(0)
    // tick=5000, cutoff=5000-94000 < 0, 没有任何 tick < cutoff
    sys.update(1, world as any, em, 5000)
    expect((sys as any).moraines).toHaveLength(2)
  })

  it("nextId 在每次 spawn 后递增", () => {
    sys = makeSys()
    const worldM = makeWorld(5)
    vi.spyOn(Math, "random").mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, worldM as any, em, 2800)
    expect((sys as any).nextId).toBe(2)
  })
})
