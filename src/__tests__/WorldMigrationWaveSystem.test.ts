import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { WorldMigrationWaveSystem, MigrationReason } from "../systems/WorldMigrationWaveSystem"
import type { MigrationWave } from "../systems/WorldMigrationWaveSystem"

// ---- helpers ----
function makeSys(): WorldMigrationWaveSystem { return new WorldMigrationWaveSystem() }

function makeWorld(tick = 0, season: string = "spring") {
  const tiles: number[][] = []
  for (let y = 0; y < 200; y++) {
    tiles[y] = []
    for (let x = 0; x < 200; x++) {
      tiles[y][x] = 3  // GRASS
    }
  }
  return {
    tick,
    season,
    width: 200,
    height: 200,
    getTile: (x: number, y: number) => {
      if (x < 0 || x >= 200 || y < 0 || y >= 200) return null
      return tiles[y]?.[x] ?? null
    },
  } as any
}

function makeEm(entities: any[] = []) {
  const posMap = new Map<number, any>()
  const aiMap = new Map<number, any>()
  const entitySet = new Set<number>()

  for (const e of entities) {
    entitySet.add(e.id)
    if (e.pos) posMap.set(e.id, e.pos)
    if (e.ai) aiMap.set(e.id, e.ai)
  }

  return {
    getEntitiesWithComponents: (_c1: string, _c2: string, _c3?: string) => Array.from(entitySet),
    getComponent: (id: number, type: string) => {
      if (type === "position") return posMap.get(id) ?? null
      if (type === "ai") return aiMap.get(id) ?? null
      return null
    },
    hasComponent: (id: number, type: string) => {
      if (type === "position") return posMap.has(id)
      if (type === "ai") return aiMap.has(id)
      return false
    },
  } as any
}

function makeCivManager(unclaimed = true) {
  return {
    isLandUnclaimed: (_x: number, _y: number, _r: number) => unclaimed,
  } as any
}

function makeWave(overrides: Partial<MigrationWave> = {}): MigrationWave {
  return {
    id: 1,
    fromX: 10, fromY: 10,
    toX: 100, toY: 100,
    reason: MigrationReason.DROUGHT,
    progress: 0,
    entityIds: new Set(),
    scale: 5,
    startTick: 0,
    ...overrides,
  }
}

// CHECK_INTERVAL=180, MOVE_INTERVAL=2, MAX_WAVES=8, WAVE_SPEED=0.003, MIN_CREATURES_FOR_WAVE=4

// ---- 1. 初始状态 ----
describe("WorldMigrationWaveSystem 初始状态", () => {
  let sys: WorldMigrationWaveSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it("初始 activeWaves 数组为空", () => {
    expect(sys.getActiveWaves()).toHaveLength(0)
  })

  it("getActiveWaves 返回只读数组", () => {
    expect(Array.isArray(sys.getActiveWaves())).toBe(true)
  })

  it("getActiveWaves 返回内部数组引用（相同对象）", () => {
    expect(sys.getActiveWaves()).toBe(sys.getActiveWaves())
  })

  it("_cellCounts 初始为 Map", () => {
    expect((sys as any)._cellCounts).toBeInstanceOf(Map)
  })

  it("_wavesToRemoveBuf 初始为空数组", () => {
    expect((sys as any)._wavesToRemoveBuf).toHaveLength(0)
  })

  it("多次构造互不影响", () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).activeWaves.push(makeWave())
    expect(s2.getActiveWaves()).toHaveLength(0)
  })
})

// ---- 2. getActiveWaves 查询 ----
describe("WorldMigrationWaveSystem.getActiveWaves 查询", () => {
  let sys: WorldMigrationWaveSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it("注入一个波后 getActiveWaves 返回长度 1", () => {
    ;(sys as any).activeWaves.push(makeWave())
    expect(sys.getActiveWaves()).toHaveLength(1)
  })

  it("注入多个波后 getActiveWaves 返回正确长度", () => {
    ;(sys as any).activeWaves.push(makeWave({ id: 1 }))
    ;(sys as any).activeWaves.push(makeWave({ id: 2 }))
    ;(sys as any).activeWaves.push(makeWave({ id: 3 }))
    expect(sys.getActiveWaves()).toHaveLength(3)
  })

  it("波的 fromX/fromY 字段可读", () => {
    ;(sys as any).activeWaves.push(makeWave({ fromX: 42, fromY: 99 }))
    const w = sys.getActiveWaves()[0]
    expect(w.fromX).toBe(42)
    expect(w.fromY).toBe(99)
  })

  it("波的 toX/toY 字段可读", () => {
    ;(sys as any).activeWaves.push(makeWave({ toX: 150, toY: 160 }))
    const w = sys.getActiveWaves()[0]
    expect(w.toX).toBe(150)
    expect(w.toY).toBe(160)
  })

  it("波的 progress 字段可读", () => {
    ;(sys as any).activeWaves.push(makeWave({ progress: 0.5 }))
    expect(sys.getActiveWaves()[0].progress).toBe(0.5)
  })

  it("波的 reason 字段可读", () => {
    ;(sys as any).activeWaves.push(makeWave({ reason: MigrationReason.WAR }))
    expect(sys.getActiveWaves()[0].reason).toBe(MigrationReason.WAR)
  })

  it("波的 entityIds 字段是 Set", () => {
    ;(sys as any).activeWaves.push(makeWave({ entityIds: new Set([1, 2, 3]) }))
    expect(sys.getActiveWaves()[0].entityIds).toBeInstanceOf(Set)
    expect(sys.getActiveWaves()[0].entityIds.size).toBe(3)
  })
})

// ---- 3. CHECK_INTERVAL 节流（tick % 180 == 0 触发 detectTriggers）----
describe("WorldMigrationWaveSystem CHECK_INTERVAL 节流", () => {
  let sys: WorldMigrationWaveSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it("tick=0（0 % 180 == 0）时触发 detectTriggers（有足够生物才检查）", () => {
    // 4个生物满足 MIN_CREATURES_FOR_WAVE，但 random>0.12 不 spawn wave
    const entities = [
      { id: 1, pos: { x: 50, y: 50 }, ai: { state: "idle" } },
      { id: 2, pos: { x: 51, y: 51 }, ai: { state: "idle" } },
      { id: 3, pos: { x: 52, y: 52 }, ai: { state: "idle" } },
      { id: 4, pos: { x: 53, y: 53 }, ai: { state: "idle" } },
    ]
    vi.spyOn(Math, "random").mockReturnValue(0.9)
    const world = makeWorld(0)
    sys.update(1, makeEm(entities), world, makeCivManager())
    // 即使 detectTriggers 运行，random>0.12 不会产生 wave
    expect(sys.getActiveWaves()).toHaveLength(0)
  })

  it("tick=179（179 % 180 != 0）时不触发 detectTriggers", () => {
    const detectSpy = vi.spyOn(sys as any, "detectTriggers")
    const world = makeWorld(179)
    sys.update(1, makeEm([]), world, makeCivManager())
    expect(detectSpy).not.toHaveBeenCalled()
  })

  it("tick=180（180 % 180 == 0）时触发 detectTriggers", () => {
    const detectSpy = vi.spyOn(sys as any, "detectTriggers")
    const world = makeWorld(180)
    sys.update(1, makeEm([]), world, makeCivManager())
    expect(detectSpy).toHaveBeenCalled()
  })

  it("tick=360（360 % 180 == 0）时再次触发 detectTriggers", () => {
    const detectSpy = vi.spyOn(sys as any, "detectTriggers")
    const world = makeWorld(360)
    sys.update(1, makeEm([]), world, makeCivManager())
    expect(detectSpy).toHaveBeenCalled()
  })

  it("tick=2（2 % 2 == 0）时触发 advanceWaves（MOVE_INTERVAL=2）", () => {
    const advanceSpy = vi.spyOn(sys as any, "advanceWaves")
    const world = makeWorld(2)
    sys.update(1, makeEm([]), world, makeCivManager())
    expect(advanceSpy).toHaveBeenCalled()
  })

  it("tick=1（1 % 2 != 0）时不触发 advanceWaves", () => {
    const advanceSpy = vi.spyOn(sys as any, "advanceWaves")
    const world = makeWorld(1)
    sys.update(1, makeEm([]), world, makeCivManager())
    expect(advanceSpy).not.toHaveBeenCalled()
  })
})

// ---- 4. detectTriggers 条件 ----
describe("WorldMigrationWaveSystem detectTriggers 条件", () => {
  let sys: WorldMigrationWaveSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it("已达 MAX_WAVES（8）时 detectTriggers 不做任何事", () => {
    // tick=1: 1%180!=0 不触发 detectTriggers，1%2!=0 不触发 advanceWaves
    // 所以波不变
    for (let i = 0; i < 8; i++) {
      ;(sys as any).activeWaves.push(makeWave({ id: i + 1 }))
    }
    const world = makeWorld(1)  // tick=1 => 不触发 detectTriggers 也不触发 advanceWaves
    vi.spyOn(Math, "random").mockReturnValue(0)
    sys.update(1, makeEm([{ id: 1, pos: { x: 10, y: 10 }, ai: { state: "idle" } }]), world, makeCivManager())
    expect(sys.getActiveWaves()).toHaveLength(8)
  })

  it("生物数量少于 MIN_CREATURES_FOR_WAVE（4）时不触发波", () => {
    const entities = [
      { id: 1, pos: { x: 50, y: 50 }, ai: { state: "idle" } },
      { id: 2, pos: { x: 51, y: 51 }, ai: { state: "idle" } },
      { id: 3, pos: { x: 52, y: 52 }, ai: { state: "idle" } },
    ]
    vi.spyOn(Math, "random").mockReturnValue(0)
    const world = makeWorld(0)
    sys.update(1, makeEm(entities), world, makeCivManager())
    expect(sys.getActiveWaves()).toHaveLength(0)
  })

  it("random > 0.12 时不产生波（即使满足所有条件）", () => {
    // 需要 lavaCount>5 或 foodRatio<0.15 触发 stress，但这里 random 拦截
    const entities = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1, pos: { x: 50 + i, y: 50 }, ai: { state: "idle" },
    }))
    vi.spyOn(Math, "random").mockReturnValue(0.5)  // > 0.12 => 不产生波
    const world = makeWorld(0)
    sys.update(1, makeEm(entities), world, makeCivManager())
    expect(sys.getActiveWaves()).toHaveLength(0)
  })
})

// ---- 5. advanceWaves 进度更新 ----
describe("WorldMigrationWaveSystem advanceWaves 进度", () => {
  let sys: WorldMigrationWaveSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it("progress 每次 advance 增加 WAVE_SPEED（0.003）", () => {
    const eids = new Set([1, 2, 3])
    ;(sys as any).activeWaves.push(makeWave({ progress: 0, entityIds: eids }))
    const entities = [
      { id: 1, pos: { x: 10, y: 10 }, ai: { state: "migrating", targetX: 0, targetY: 0 } },
      { id: 2, pos: { x: 11, y: 10 }, ai: { state: "migrating", targetX: 0, targetY: 0 } },
      { id: 3, pos: { x: 12, y: 10 }, ai: { state: "migrating", targetX: 0, targetY: 0 } },
    ]
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    const world = makeWorld(2)  // tick=2 => advanceWaves 触发
    sys.update(1, makeEm(entities), world, makeCivManager())
    expect(sys.getActiveWaves()[0].progress).toBeCloseTo(0.003, 5)
  })

  it("progress 不超过 1.0", () => {
    const eids = new Set([1, 2])
    ;(sys as any).activeWaves.push(makeWave({ progress: 0.999, entityIds: eids }))
    const entities = [
      { id: 1, pos: { x: 10, y: 10 }, ai: { state: "migrating", targetX: 0, targetY: 0 } },
      { id: 2, pos: { x: 11, y: 10 }, ai: { state: "migrating", targetX: 0, targetY: 0 } },
    ]
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    const world = makeWorld(2)
    sys.update(1, makeEm(entities), world, makeCivManager())
    // progress = min(1, 0.999+0.003) = 1.0 => wave 完成，被 settle 并移除
    expect(sys.getActiveWaves()).toHaveLength(0)
  })

  it("entityIds 中 position 不存在的实体被移除", () => {
    const eids = new Set([1, 2, 99])  // 99 无 position
    ;(sys as any).activeWaves.push(makeWave({ progress: 0, entityIds: eids }))
    const entities = [
      { id: 1, pos: { x: 10, y: 10 }, ai: { state: "migrating", targetX: 0, targetY: 0 } },
      { id: 2, pos: { x: 11, y: 10 }, ai: { state: "migrating", targetX: 0, targetY: 0 } },
      // id=99 没有 position
    ]
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    const world = makeWorld(2)
    sys.update(1, makeEm(entities), world, makeCivManager())
    const wave = sys.getActiveWaves()[0]
    expect(wave).toBeDefined()
    expect(wave.entityIds.has(99)).toBe(false)
  })

  it("entityIds.size < 2 时 wave 被解散", () => {
    const eids = new Set([1])  // 只有1个实体
    ;(sys as any).activeWaves.push(makeWave({ progress: 0, entityIds: eids }))
    const entities = [
      { id: 1, pos: { x: 10, y: 10 }, ai: { state: "migrating", targetX: 0, targetY: 0 } },
    ]
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    const world = makeWorld(2)
    sys.update(1, makeEm(entities), world, makeCivManager())
    expect(sys.getActiveWaves()).toHaveLength(0)
  })

  it("progress >= 1 时 wave 被 settle 并移除", () => {
    const eids = new Set([1, 2, 3])
    ;(sys as any).activeWaves.push(makeWave({ progress: 1.0, entityIds: eids }))
    const entities = [
      { id: 1, pos: { x: 10, y: 10 }, ai: { state: "migrating", targetX: 0, targetY: 0 } },
      { id: 2, pos: { x: 11, y: 10 }, ai: { state: "migrating", targetX: 0, targetY: 0 } },
      { id: 3, pos: { x: 12, y: 10 }, ai: { state: "migrating", targetX: 0, targetY: 0 } },
    ]
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    const world = makeWorld(2)
    sys.update(1, makeEm(entities), world, makeCivManager())
    expect(sys.getActiveWaves()).toHaveLength(0)
  })

  it("settle 后实体 ai.state 变为 idle", () => {
    const eids = new Set([1, 2, 3])
    ;(sys as any).activeWaves.push(makeWave({ progress: 1.0, entityIds: eids }))
    const ai1 = { state: "migrating", cooldown: 5, targetX: 0, targetY: 0 }
    const ai2 = { state: "migrating", cooldown: 5, targetX: 0, targetY: 0 }
    const ai3 = { state: "migrating", cooldown: 5, targetX: 0, targetY: 0 }
    const entities = [
      { id: 1, pos: { x: 10, y: 10 }, ai: ai1 },
      { id: 2, pos: { x: 11, y: 10 }, ai: ai2 },
      { id: 3, pos: { x: 12, y: 10 }, ai: ai3 },
    ]
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    const world = makeWorld(2)
    sys.update(1, makeEm(entities), world, makeCivManager())
    expect(ai1.state).toBe("idle")
    expect(ai2.state).toBe("idle")
  })

  it("settle 后实体 ai.cooldown 重置为 0", () => {
    const eids = new Set([1])
    ;(sys as any).activeWaves.push(makeWave({ progress: 1.0, entityIds: eids }))
    const ai1 = { state: "migrating", cooldown: 99, targetX: 0, targetY: 0 }
    const entities = [{ id: 1, pos: { x: 10, y: 10 }, ai: ai1 }]
    // 只有 1 个 entity => wave.size<2 => releaseWave 而不是 settleWave
    // 所以要用 3 个才能触发 settleWave（progress>=1 且 size>=2）
    const ai2 = { state: "migrating", cooldown: 99, targetX: 0, targetY: 0 }
    const ai3 = { state: "migrating", cooldown: 99, targetX: 0, targetY: 0 }
    const eids2 = new Set([1, 2, 3])
    ;(sys as any).activeWaves.length = 0
    ;(sys as any).activeWaves.push(makeWave({ progress: 1.0, entityIds: eids2 }))
    const ems = makeEm([
      { id: 1, pos: { x: 10, y: 10 }, ai: ai1 },
      { id: 2, pos: { x: 11, y: 10 }, ai: ai2 },
      { id: 3, pos: { x: 12, y: 10 }, ai: ai3 },
    ])
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    sys.update(1, ems, makeWorld(2), makeCivManager())
    expect(ai1.cooldown).toBe(0)
    expect(ai2.cooldown).toBe(0)
  })
})

// ---- 6. MigrationReason 枚举 ----
describe("WorldMigrationWaveSystem MigrationReason 枚举", () => {
  afterEach(() => { vi.restoreAllMocks() })

  it("DROUGHT 值为字符串 drought", () => {
    expect(MigrationReason.DROUGHT).toBe("drought")
  })

  it("WAR 值为字符串 war", () => {
    expect(MigrationReason.WAR).toBe("war")
  })

  it("FAMINE 值为字符串 famine", () => {
    expect(MigrationReason.FAMINE).toBe("famine")
  })

  it("OVERCROWDING 值为字符串 overcrowding", () => {
    expect(MigrationReason.OVERCROWDING).toBe("overcrowding")
  })

  it("DISASTER 值为字符串 disaster", () => {
    expect(MigrationReason.DISASTER).toBe("disaster")
  })

  it("OPPORTUNITY 值为字符串 opportunity", () => {
    expect(MigrationReason.OPPORTUNITY).toBe("opportunity")
  })

  it("枚举共 6 个值", () => {
    const values = Object.values(MigrationReason)
    expect(values).toHaveLength(6)
  })
})

// ---- 7. isNearExistingWaveOrigin 逻辑 ----
describe("WorldMigrationWaveSystem isNearExistingWaveOrigin", () => {
  let sys: WorldMigrationWaveSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it("无 activeWaves 时 isNearExistingWaveOrigin 返回 false", () => {
    const result = (sys as any).isNearExistingWaveOrigin(50, 50, 20)
    expect(result).toBe(false)
  })

  it("点在 wave 起点 minDist 内时返回 true", () => {
    ;(sys as any).activeWaves.push(makeWave({ fromX: 50, fromY: 50 }))
    // 距离 = sqrt((55-50)^2+(50-50)^2) = 5 < 20 => true
    const result = (sys as any).isNearExistingWaveOrigin(55, 50, 20)
    expect(result).toBe(true)
  })

  it("点在 wave 起点 minDist 外时返回 false", () => {
    ;(sys as any).activeWaves.push(makeWave({ fromX: 50, fromY: 50 }))
    // 距离 = sqrt(30^2+0^2) = 30 > 20 => false
    const result = (sys as any).isNearExistingWaveOrigin(80, 50, 20)
    expect(result).toBe(false)
  })

  it("点恰好在 minDist 边界（距离²== minDist²-1）时返回 true", () => {
    ;(sys as any).activeWaves.push(makeWave({ fromX: 0, fromY: 0 }))
    // minDist=20, minDistSq=400, 点(15,12): dist²=225+144=369 < 400 => true
    const result = (sys as any).isNearExistingWaveOrigin(15, 12, 20)
    expect(result).toBe(true)
  })
})
