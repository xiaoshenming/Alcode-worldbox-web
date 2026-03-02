import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldQuicksandSystem } from '../systems/WorldQuicksandSystem'
import type { QuicksandPit } from '../systems/WorldQuicksandSystem'
import { TileType } from '../utils/Constants'

// 与源码一致的常量
const CHECK_INTERVAL = 2800
const SPAWN_CHANCE = 0.004
const MAX_PITS = 15

function makeSys(): WorldQuicksandSystem { return new WorldQuicksandSystem() }
let nextId = 1
function makePit(overrides: Partial<QuicksandPit> = {}): QuicksandPit {
  return {
    id: nextId++, x: 30, y: 40,
    depth: 3, viscosity: 0.5, radius: 2,
    trappedCount: 0, active: true, tick: 0,
    ...overrides
  }
}

// world 模拟（getTile 返回 SAND=2 允许 spawn）
function makeWorld(tileValue: number = TileType.SAND) {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn().mockReturnValue(tileValue)
  } as any
}

// EntityManager 模拟（无实体，避免陷阱逻辑干扰）
function makeEm(entityIds: number[] = []) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue(entityIds),
    getComponent: vi.fn().mockReturnValue(null)
  } as any
}

// ─────────────────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────────────────
describe('WorldQuicksandSystem 初始状态', () => {
  let sys: WorldQuicksandSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 pits 为空数组', () => {
    expect((sys as any).pits).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('pits 是 Array 实例', () => {
    expect(Array.isArray((sys as any).pits)).toBe(true)
  })

  it('手动注入一个 pit 后长度为 1', () => {
    ;(sys as any).pits.push(makePit())
    expect((sys as any).pits).toHaveLength(1)
  })

  it('手动注入多个 pit 后长度正确', () => {
    ;(sys as any).pits.push(makePit(), makePit(), makePit())
    expect((sys as any).pits).toHaveLength(3)
  })

  it('pit 字段 depth 读取正确', () => {
    ;(sys as any).pits.push(makePit({ depth: 7 }))
    expect((sys as any).pits[0].depth).toBe(7)
  })

  it('pit 字段 viscosity 读取正确', () => {
    ;(sys as any).pits.push(makePit({ viscosity: 0.9 }))
    expect((sys as any).pits[0].viscosity).toBe(0.9)
  })

  it('pit 字段 active 默认为 true', () => {
    ;(sys as any).pits.push(makePit())
    expect((sys as any).pits[0].active).toBe(true)
  })

  it('pit 字段 trappedCount 默认为 0', () => {
    ;(sys as any).pits.push(makePit())
    expect((sys as any).pits[0].trappedCount).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────────────────
describe('WorldQuicksandSystem CHECK_INTERVAL节流', () => {
  let sys: WorldQuicksandSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 小于 CHECK_INTERVAL 时 lastCheck 不更新', () => {
    const world = makeWorld()
    sys.update(1, world, makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 等于 CHECK_INTERVAL 时触发更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick 超过 CHECK_INTERVAL 时 lastCheck 设为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, makeEm(), CHECK_INTERVAL + 600)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 600)
  })

  it('第二次 tick 未超过间隔不再触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    sys.update(1, world, makeEm(), CHECK_INTERVAL + 200)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次都满足间隔时 lastCheck 都更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    sys.update(1, world, makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick=0 不触发更新', () => {
    const world = makeWorld()
    sys.update(1, world, makeEm(), 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).pits).toHaveLength(0)
  })

  it('CHECK_INTERVAL 值为 2800', () => {
    expect(CHECK_INTERVAL).toBe(2800)
  })

  it('lastCheck=0 时首次触发门槛为 CHECK_INTERVAL', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

// ─────────────────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────────────────
describe('WorldQuicksandSystem spawn条件', () => {
  let sys: WorldQuicksandSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random < SPAWN_CHANCE 且 tile=SAND(2) 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits).toHaveLength(1)
  })

  it('random < SPAWN_CHANCE 且 tile=GRASS(3) 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.GRASS)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits).toHaveLength(1)
  })

  it('random >= SPAWN_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits).toHaveLength(0)
  })

  it('tile 为 SHALLOW_WATER(1) 时不 spawn', () => {
    // random < SPAWN_CHANCE 时通过概率检查，但 getTile 返回 1（不是 2 或 3）
    const randomMock = vi.spyOn(Math, 'random')
    // 第一次 random() 用于 SPAWN_CHANCE 检查，返回 0（<0.004 通过）
    // 第二、三次用于 x, y 坐标（不影响）
    randomMock.mockReturnValue(0)
    const world = makeWorld(TileType.SHALLOW_WATER)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits).toHaveLength(0)
  })

  it('tile 为 MOUNTAIN(5) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits).toHaveLength(0)
  })

  it('pits 已满 MAX_PITS 时不 spawn', () => {
    for (let i = 0; i < MAX_PITS; i++) {
      ;(sys as any).pits.push(makePit({ active: true, tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits).toHaveLength(MAX_PITS)
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 的 pit 记录正确的 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits[0].tick).toBe(CHECK_INTERVAL)
  })

  it('spawn 的 pit active 为 true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits[0].active).toBe(true)
  })

  it('spawn 的 pit trappedCount 初始为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits[0].trappedCount).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────────────────────
describe('WorldQuicksandSystem spawn字段范围', () => {
  let sys: WorldQuicksandSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnPit(): QuicksandPit {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    return (sys as any).pits[0] as QuicksandPit
  }

  it('depth 在 [1, 3] 范围内（1 + floor(random * 3)）', () => {
    const pit = spawnPit()
    expect(pit.depth).toBeGreaterThanOrEqual(1)
    expect(pit.depth).toBeLessThanOrEqual(3)
  })

  it('viscosity 在 [0.3, 1.0] 范围内', () => {
    const pit = spawnPit()
    expect(pit.viscosity).toBeGreaterThanOrEqual(0.3)
    expect(pit.viscosity).toBeLessThanOrEqual(1.0)
  })

  it('radius 在 [1, 3] 范围内（1 + floor(random * 3)）', () => {
    const pit = spawnPit()
    expect(pit.radius).toBeGreaterThanOrEqual(1)
    expect(pit.radius).toBeLessThanOrEqual(3)
  })

  it('random=0 时 depth 初始值为 1（spawn 阶段 1+floor(0*3)=1，update 阶段可能+1）', () => {
    // depth = 1 + floor(random*3)，random=0 时初始为 1；update 同一帧内可能因 random<0.015 波动
    // 结果在 [1,2] 之间
    const pit = spawnPit()
    expect(pit.depth).toBeGreaterThanOrEqual(1)
    expect(pit.depth).toBeLessThanOrEqual(2)
  })

  it('random=0 时 viscosity 最小值约为 0.3', () => {
    const pit = spawnPit()
    expect(pit.viscosity).toBeCloseTo(0.3, 1)
  })

  it('random=0 时 radius 初始值为 1（spawn 阶段 1+floor(0*3)=1，update 阶段可能+1）', () => {
    // radius = 1 + floor(random*3)，random=0 时初始为 1；update 同一帧内可能因 random<0.005 扩张
    // 结果在 [1,2] 之间
    const pit = spawnPit()
    expect(pit.radius).toBeGreaterThanOrEqual(1)
    expect(pit.radius).toBeLessThanOrEqual(2)
  })

  it('spawn 的 pit 坐标在世界范围内', () => {
    const pit = spawnPit()
    expect(pit.x).toBeGreaterThanOrEqual(0)
    expect(pit.x).toBeLessThan(100)
    expect(pit.y).toBeGreaterThanOrEqual(0)
    expect(pit.y).toBeLessThan(100)
  })

  it('spawn 的 pit 有正整数 id', () => {
    const pit = spawnPit()
    expect(Number.isInteger(pit.id)).toBe(true)
    expect(pit.id).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────
// 5. update 数值逻辑（depth 波动、radius 扩张、trappedCount 增加）
// ─────────────────────────────────────────────────────────
describe('WorldQuicksandSystem update数值逻辑', () => {
  let sys: WorldQuicksandSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('depth 波动：random<0.015 且 random<0.5 时 depth 加 1（不超过 10）', () => {
    // 第一次 random: SPAWN_CHANCE 检查（>0.004 不 spawn）
    // 后续 random: 0.01 (<0.015 触发波动) 再 0.1 (<0.5 加 1)
    const seq = [0.9, 0.01, 0.1]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length])
    ;(sys as any).pits.push(makePit({ depth: 5, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits[0].depth).toBe(6)
  })

  it('depth 波动：random<0.015 且 random>=0.5 时 depth 减 1（不低于 1）', () => {
    const seq = [0.9, 0.01, 0.9]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length])
    ;(sys as any).pits.push(makePit({ depth: 5, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits[0].depth).toBe(4)
  })

  it('depth 不会低于 1', () => {
    const seq = [0.9, 0.01, 0.9]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length])
    ;(sys as any).pits.push(makePit({ depth: 1, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits[0].depth).toBeGreaterThanOrEqual(1)
  })

  it('depth 不会超过 10', () => {
    const seq = [0.9, 0.01, 0.1]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length])
    ;(sys as any).pits.push(makePit({ depth: 10, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits[0].depth).toBeLessThanOrEqual(10)
  })

  it('radius 扩张：random<0.005 时 radius 加 1（不超过 8）', () => {
    // seq: SPAWN_CHANCE检查=0.9, depth波动=0.9(不触发), radius扩张=0.001(<0.005)
    const seq = [0.9, 0.9, 0.001]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length])
    ;(sys as any).pits.push(makePit({ radius: 3, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits[0].radius).toBe(4)
  })

  it('radius 不会超过 8', () => {
    const seq = [0.9, 0.9, 0.001]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length])
    ;(sys as any).pits.push(makePit({ radius: 8, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits[0].radius).toBeLessThanOrEqual(8)
  })

  it('附近实体且 random<0.002*viscosity 时 trappedCount 增加', () => {
    // 安排：spawn检查=0.9, depth=0.9, radius=0.9, trap=0（< 0.002*1.0=0.002）
    const seq = [0.9, 0.9, 0.9, 0]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length])
    const pit = makePit({ x: 50, y: 50, radius: 10, viscosity: 1.0, tick: CHECK_INTERVAL })
    ;(sys as any).pits.push(pit)
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([1]),
      getComponent: vi.fn().mockReturnValue({ x: 50, y: 50 })
    } as any
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).pits[0].trappedCount).toBe(1)
  })

  it('无实体时 trappedCount 不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).pits.push(makePit({ trappedCount: 5, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm([]), CHECK_INTERVAL)
    expect((sys as any).pits[0].trappedCount).toBe(5)
  })

  it('实体不在 radius 范围内时 trappedCount 不增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const pit = makePit({ x: 50, y: 50, radius: 2, tick: CHECK_INTERVAL })
    ;(sys as any).pits.push(pit)
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([1]),
      getComponent: vi.fn().mockReturnValue({ x: 100, y: 100 }) // 超出 radius
    } as any
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).pits[0].trappedCount).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────────────────────
describe('WorldQuicksandSystem cleanup逻辑', () => {
  let sys: WorldQuicksandSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('active=false 的 pit 被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).pits.push(makePit({ active: false, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits).toHaveLength(0)
  })

  it('active=true 的 pit 不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).pits.push(makePit({ active: true, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits).toHaveLength(1)
  })

  it('age > 250000 且 random<0.001 时 pit 变为 inactive 并被删除', () => {
    // 安排：spawn=0.9, depth=0.9, radius=0.9, dryUp=0（<0.001）
    const seq = [0.9, 0.9, 0.9, 0]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length])
    const pitTick = 0
    const currentTick = CHECK_INTERVAL + 250001
    ;(sys as any).pits.push(makePit({ active: true, tick: pitTick }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), currentTick)
    expect((sys as any).pits).toHaveLength(0)
  })

  it('age <= 250000 时 pit 不因干涸而变 inactive', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL
    ;(sys as any).pits.push(makePit({ active: true, tick: currentTick - 1000 }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), currentTick)
    expect((sys as any).pits).toHaveLength(1)
    expect((sys as any).pits[0].active).toBe(true)
  })

  it('混合 active/inactive pit，只删除 inactive', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).pits.push(makePit({ active: false, tick: CHECK_INTERVAL }))
    ;(sys as any).pits.push(makePit({ active: true, tick: CHECK_INTERVAL }))
    ;(sys as any).pits.push(makePit({ active: false, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits).toHaveLength(1)
    expect((sys as any).pits[0].active).toBe(true)
  })

  it('所有 pit active=false 时 pits 变为空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).pits.push(makePit({ active: false, tick: CHECK_INTERVAL }))
    }
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits).toHaveLength(0)
  })

  it('age > 250000 但 random >= 0.001 时 pit 不变 inactive', () => {
    // 安排：spawn=0.9, depth=0.9, radius=0.9, dryUp=0.5（>=0.001 不干涸）
    const seq = [0.9, 0.9, 0.9, 0.5]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length])
    const currentTick = CHECK_INTERVAL + 250001
    ;(sys as any).pits.push(makePit({ active: true, tick: 0 }))
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), currentTick)
    expect((sys as any).pits[0].active).toBe(true)
  })

  it('cleanup 使用逆序遍历，多个 inactive 全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 8; i++) {
      ;(sys as any).pits.push(makePit({ active: false, tick: CHECK_INTERVAL }))
    }
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    expect((sys as any).pits).toHaveLength(0)
  })
})
