import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { WorldMineralSpringSystem } from "../systems/WorldMineralSpringSystem"
import type { MineralSpring } from "../systems/WorldMineralSpringSystem"

// ---- helpers ----
function makeSys(): WorldMineralSpringSystem { return new WorldMineralSpringSystem() }

function makeWorld(w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => 3,
  } as any
}

function makeEm() { return {} as any }

// CHECK_INTERVAL = 3000, FORM_CHANCE = 0.0013, MAX_SPRINGS = 14
const CHECK_INTERVAL = 3000

let nextId = 1
function makeSpring(overrides: Partial<MineralSpring> = {}): MineralSpring {
  return {
    id: nextId++,
    x: 20, y: 30,
    mineralRichness: 50, flowRate: 20,
    temperature: 25, purity: 60,
    tick: 0,
    ...overrides,
  }
}

// ---- 1. 初始状态 ----
describe("WorldMineralSpringSystem 初始状态", () => {
  let sys: WorldMineralSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it("初始 springs 数组为空", () => {
    expect((sys as any).springs).toHaveLength(0)
  })

  it("nextId 初始值为 1", () => {
    expect((sys as any).nextId).toBe(1)
  })

  it("lastCheck 初始值为 0", () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it("springs 属性为数组类型", () => {
    expect(Array.isArray((sys as any).springs)).toBe(true)
  })

  it("多次构造互不影响", () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).springs.push(makeSpring())
    expect((s2 as any).springs).toHaveLength(0)
  })

  it("手动注入后数组长度正确", () => {
    ;(sys as any).springs.push(makeSpring())
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(2)
  })
})

// ---- 2. CHECK_INTERVAL 节流 ----
describe("WorldMineralSpringSystem CHECK_INTERVAL 节流", () => {
  let sys: WorldMineralSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it("tick=0 时 lastCheck 保持为 0（首次恰好执行）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999) // 不 spawn
    sys.update(1, makeWorld(), makeEm(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it("tick < CHECK_INTERVAL 时不更新 lastCheck", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it("tick == CHECK_INTERVAL 时执行并更新 lastCheck", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it("tick > CHECK_INTERVAL 时执行并更新 lastCheck", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it("两次 update 中间差值不足时不重复执行", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)        // 执行一次
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL + 100)  // 差 100 < 3000，不执行
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
describe("WorldMineralSpringSystem spawn 条件", () => {
  let sys: WorldMineralSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it("random >= FORM_CHANCE 时不 spawn", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(0)
  })

  it("random == 0 时（< FORM_CHANCE）spawn 一个矿泉", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(1)
  })

  it("random < FORM_CHANCE（0.001）时 spawn", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.001)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(1)
  })

  it("达到 MAX_SPRINGS（14）后不再 spawn", () => {
    // 预填满 14 个
    for (let i = 0; i < 14; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(14)
  })

  it("springs 数量小于 MAX_SPRINGS 时 spawn 成功后数量 +1", () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(11)
  })

  it("spawn 后 nextId 递增", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it("spawn 后矿泉的 tick 字段等于传入 tick", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs[0].tick).toBe(CHECK_INTERVAL)
  })
})

// ---- 4. 字段范围验证 ----
describe("WorldMineralSpringSystem 字段范围", () => {
  let sys: WorldMineralSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // spawn 时：mineralRichness = 15 + rand*40 => [15, 55)
  // 但 update 之后会 clamp，初始 spawn 后立即 update 一次
  it("spawn 后 mineralRichness 在 [5, 85] 范围内", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    const s = (sys as any).springs[0]
    expect(s.mineralRichness).toBeGreaterThanOrEqual(5)
    expect(s.mineralRichness).toBeLessThanOrEqual(85)
  })

  it("spawn 后 flowRate 在 [2, 60] 范围内", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    const s = (sys as any).springs[0]
    expect(s.flowRate).toBeGreaterThanOrEqual(2)
    expect(s.flowRate).toBeLessThanOrEqual(60)
  })

  it("spawn 后 purity 在 [10, 90] 范围内", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    const s = (sys as any).springs[0]
    expect(s.purity).toBeGreaterThanOrEqual(10)
    expect(s.purity).toBeLessThanOrEqual(90)
  })

  it("spawn 后 temperature 初始值在 [10, 45] 范围内（只检查源公式，不 clamp）", () => {
    // 使用固定 random=0 => temperature = 10 + 0*35 = 10
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    const s = (sys as any).springs[0]
    expect(s.temperature).toBeGreaterThanOrEqual(10)
    expect(s.temperature).toBeLessThanOrEqual(45)
  })

  it("spawn 后 x 在 [0, world.width) 范围内", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(100, 100), makeEm(), CHECK_INTERVAL)
    const s = (sys as any).springs[0]
    expect(s.x).toBeGreaterThanOrEqual(0)
    expect(s.x).toBeLessThan(100)
  })

  it("spawn 后 y 在 [0, world.height) 范围内", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(100, 100), makeEm(), CHECK_INTERVAL)
    const s = (sys as any).springs[0]
    expect(s.y).toBeGreaterThanOrEqual(0)
    expect(s.y).toBeLessThan(100)
  })

  it("spawn 后 id 从 1 开始", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs[0].id).toBe(1)
  })
})

// ---- 5. update 数值变化逻辑 ----
describe("WorldMineralSpringSystem update 数值逻辑", () => {
  let sys: WorldMineralSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it("mineralRichness 不低于下限 5（clamp 到 5）", () => {
    ;(sys as any).springs.push(makeSpring({ mineralRichness: 5, tick: 0 }))
    // random=0 => delta = (0-0.48)*0.2 = -0.096 => max(5, 5-0.096) = 5
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs[0].mineralRichness).toBeGreaterThanOrEqual(5)
  })

  it("mineralRichness 不超过上限 85（clamp 到 85）", () => {
    ;(sys as any).springs.push(makeSpring({ mineralRichness: 85, tick: 0 }))
    // random=1 => delta = (1-0.48)*0.2 = 0.104 => min(85, 85+0.104) = 85
    vi.spyOn(Math, "random").mockReturnValue(1)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs[0].mineralRichness).toBeLessThanOrEqual(85)
  })

  it("flowRate 不低于下限 2（clamp 到 2）", () => {
    ;(sys as any).springs.push(makeSpring({ flowRate: 2, tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs[0].flowRate).toBeGreaterThanOrEqual(2)
  })

  it("flowRate 不超过上限 60（clamp 到 60）", () => {
    ;(sys as any).springs.push(makeSpring({ flowRate: 60, tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(1)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs[0].flowRate).toBeLessThanOrEqual(60)
  })

  it("purity 不低于下限 10", () => {
    ;(sys as any).springs.push(makeSpring({ purity: 10, tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs[0].purity).toBeGreaterThanOrEqual(10)
  })

  it("purity 不超过上限 90", () => {
    ;(sys as any).springs.push(makeSpring({ purity: 90, tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(1)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs[0].purity).toBeLessThanOrEqual(90)
  })

  it("tick 未到 CHECK_INTERVAL 时各字段不变", () => {
    const sp = makeSpring({ mineralRichness: 50, flowRate: 20, purity: 60, tick: 0 })
    ;(sys as any).springs.push(sp)
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
    // lastCheck=0, tick-lastCheck=2999 < 3000 => 不执行
    expect((sys as any).springs[0].mineralRichness).toBe(50)
    expect((sys as any).springs[0].flowRate).toBe(20)
    expect((sys as any).springs[0].purity).toBe(60)
  })
})

// ---- 6. cleanup 逻辑 ----
describe("WorldMineralSpringSystem cleanup 逻辑", () => {
  let sys: WorldMineralSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // cutoff = tick - 87000，spring.tick < cutoff 时删除
  it("tick - spring.tick > 87000 时删除该矿泉", () => {
    ;(sys as any).springs.push(makeSpring({ tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(0.9)
    // 当前 tick = CHECK_INTERVAL，cutoff = CHECK_INTERVAL - 87000 < 0
    // spring.tick=0，0 >= cutoff(<0)，不删除
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(1)
  })

  it("spring.tick < cutoff（过期矿泉）时被删除", () => {
    const tick = 90000
    ;(sys as any).springs.push(makeSpring({ tick: 0 }))  // tick=0, cutoff=90000-87000=3000 > 0 => 0<3000 => 删除
    vi.spyOn(Math, "random").mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), tick)
    expect((sys as any).springs).toHaveLength(0)
  })

  it("spring.tick == cutoff 时不删除（边界保留）", () => {
    const tick = 90000
    const cutoff = tick - 87000  // = 3000
    ;(sys as any).springs.push(makeSpring({ tick: cutoff }))
    vi.spyOn(Math, "random").mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), tick)
    expect((sys as any).springs).toHaveLength(1)
  })

  it("只删除过期矿泉，保留新矿泉", () => {
    const tick = 90000
    const cutoff = tick - 87000  // = 3000
    ;(sys as any).springs.push(makeSpring({ tick: 0 }))        // 过期：0 < 3000 => 删除
    ;(sys as any).springs.push(makeSpring({ tick: cutoff }))   // 边界：== cutoff => 保留
    ;(sys as any).springs.push(makeSpring({ tick: cutoff + 1 }))// 新：> cutoff => 保留
    vi.spyOn(Math, "random").mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), tick)
    expect((sys as any).springs).toHaveLength(2)
  })

  it("多个过期矿泉全部被删除", () => {
    const tick = 90000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: 0 }))
    }
    vi.spyOn(Math, "random").mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), tick)
    expect((sys as any).springs).toHaveLength(0)
  })

  it("无过期矿泉时 springs 数量不减少", () => {
    const tick = CHECK_INTERVAL
    ;(sys as any).springs.push(makeSpring({ tick: CHECK_INTERVAL }))
    vi.spyOn(Math, "random").mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), tick)
    expect((sys as any).springs).toHaveLength(1)
  })

  it("cleanup 后 springs 为空时 nextId 不重置", () => {
    ;(sys as any).nextId = 5
    ;(sys as any).springs.push(makeSpring({ tick: 0 }))
    vi.spyOn(Math, "random").mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), 90000)
    expect((sys as any).nextId).toBe(5)
    expect((sys as any).springs).toHaveLength(0)
  })
})
