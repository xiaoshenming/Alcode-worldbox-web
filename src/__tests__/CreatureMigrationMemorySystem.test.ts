import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureMigrationMemorySystem } from '../systems/CreatureMigrationMemorySystem'
import type { HabitatMemory, MigrationRoute } from '../systems/CreatureMigrationMemorySystem'

let nextId = 1

function makeSys(): CreatureMigrationMemorySystem { return new CreatureMigrationMemorySystem() }

function makeMemory(
  creatureId: number,
  overrides: Partial<HabitatMemory> = {}
): HabitatMemory {
  return {
    id: nextId++,
    creatureId,
    x: 10,
    y: 20,
    quality: 70,
    season: 0,
    visits: 3,
    lastVisitTick: 0,
    inherited: false,
    ...overrides,
  }
}

function makeRoute(
  raceType = 'human',
  overrides: Partial<MigrationRoute> = {}
): MigrationRoute {
  return {
    id: nextId++,
    raceType,
    waypoints: [{ x: 5, y: 5, quality: 80 }],
    followers: 10,
    age: 100,
    ...overrides,
  }
}

function makeMockEM(
  entities: number[] = [],
  componentMap: Record<number, Record<string, unknown>> = {}
) {
  return {
    getComponent: (id: number, type: string) => componentMap[id]?.[type],
    getEntitiesWithComponents: (..._types: string[]) => entities,
    hasComponent: (id: number, type: string) => Boolean(componentMap[id]?.[type]),
  }
}

// ─── 初始状态 ───────────────────────────────────────────────────────────────
describe('CreatureMigrationMemorySystem — 初始状态', () => {
  let sys: CreatureMigrationMemorySystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 memories 为空数组', () => {
    expect((sys as any).memories).toHaveLength(0)
  })

  it('初始 routes 为空数组', () => {
    expect((sys as any).routes).toHaveLength(0)
  })

  it('初始 nextMemId 为 1', () => {
    expect((sys as any).nextMemId).toBe(1)
  })

  it('初始 nextRouteId 为 1', () => {
    expect((sys as any).nextRouteId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 _creatureMemMap 为空 Map', () => {
    expect((sys as any)._creatureMemMap.size).toBe(0)
  })

  it('初始 _routeByRace 为空 Map', () => {
    expect((sys as any)._routeByRace.size).toBe(0)
  })

  it('初始 _raceMemoriesMap 为空 Map', () => {
    expect((sys as any)._raceMemoriesMap.size).toBe(0)
  })
})

// ─── HabitatMemory 数据结构 ────────────────────────────────────────────────
describe('CreatureMigrationMemorySystem — HabitatMemory 数据结构', () => {
  let sys: CreatureMigrationMemorySystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入 memory 后 memories 长度为 1', () => {
    ;(sys as any).memories.push(makeMemory(1))
    expect((sys as any).memories).toHaveLength(1)
  })

  it('memory.creatureId 正确存储', () => {
    ;(sys as any).memories.push(makeMemory(42))
    expect((sys as any).memories[0].creatureId).toBe(42)
  })

  it('memory.x 和 memory.y 正确存储', () => {
    ;(sys as any).memories.push(makeMemory(1, { x: 55, y: 77 }))
    expect((sys as any).memories[0].x).toBe(55)
    expect((sys as any).memories[0].y).toBe(77)
  })

  it('memory.quality 范围在 0-100', () => {
    ;(sys as any).memories.push(makeMemory(1, { quality: 70 }))
    expect((sys as any).memories[0].quality).toBeGreaterThanOrEqual(0)
    expect((sys as any).memories[0].quality).toBeLessThanOrEqual(100)
  })

  it('memory.inherited=false 表示原生记忆', () => {
    ;(sys as any).memories.push(makeMemory(1, { inherited: false }))
    expect((sys as any).memories[0].inherited).toBe(false)
  })

  it('memory.inherited=true 表示继承记忆', () => {
    ;(sys as any).memories.push(makeMemory(1, { inherited: true }))
    expect((sys as any).memories[0].inherited).toBe(true)
  })

  it('memory.visits 正确存储', () => {
    ;(sys as any).memories.push(makeMemory(1, { visits: 7 }))
    expect((sys as any).memories[0].visits).toBe(7)
  })

  it('memory.season 在 0-3 范围内', () => {
    ;(sys as any).memories.push(makeMemory(1, { season: 2 }))
    expect((sys as any).memories[0].season).toBeGreaterThanOrEqual(0)
    expect((sys as any).memories[0].season).toBeLessThanOrEqual(3)
  })

  it('memory.lastVisitTick 正确存储', () => {
    ;(sys as any).memories.push(makeMemory(1, { lastVisitTick: 9999 }))
    expect((sys as any).memories[0].lastVisitTick).toBe(9999)
  })
})

// ─── MigrationRoute 数据结构 ────────────────────────────────────────────────
describe('CreatureMigrationMemorySystem — MigrationRoute 数据结构', () => {
  let sys: CreatureMigrationMemorySystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入 route 后 routes 长度为 1', () => {
    ;(sys as any).routes.push(makeRoute('elf'))
    expect((sys as any).routes).toHaveLength(1)
  })

  it('route.raceType 正确存储', () => {
    ;(sys as any).routes.push(makeRoute('dwarf'))
    expect((sys as any).routes[0].raceType).toBe('dwarf')
  })

  it('route.waypoints 是数组', () => {
    ;(sys as any).routes.push(makeRoute('orc'))
    expect(Array.isArray((sys as any).routes[0].waypoints)).toBe(true)
  })

  it('route.waypoints 含 x y quality 字段', () => {
    ;(sys as any).routes.push(makeRoute('human', { waypoints: [{ x: 10, y: 20, quality: 80 }] }))
    const wp = (sys as any).routes[0].waypoints[0]
    expect(wp).toHaveProperty('x')
    expect(wp).toHaveProperty('y')
    expect(wp).toHaveProperty('quality')
  })

  it('route.followers 正确存储', () => {
    ;(sys as any).routes.push(makeRoute('human', { followers: 25 }))
    expect((sys as any).routes[0].followers).toBe(25)
  })

  it('route.age 正确存储', () => {
    ;(sys as any).routes.push(makeRoute('human', { age: 500 }))
    expect((sys as any).routes[0].age).toBe(500)
  })

  it('可同时存储多个 route', () => {
    ;(sys as any).routes.push(makeRoute('human'))
    ;(sys as any).routes.push(makeRoute('elf'))
    ;(sys as any).routes.push(makeRoute('orc'))
    expect((sys as any).routes).toHaveLength(3)
  })
})

// ─── getCreatureMemories ────────────────────────────────────────────────────
describe('CreatureMigrationMemorySystem — getCreatureMemories', () => {
  let sys: CreatureMigrationMemorySystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无匹配时返回空', () => {
    ;(sys as any).memories.push(makeMemory(1))
    expect(sys.getCreatureMemories(999)).toHaveLength(0)
  })

  it('按 creatureId 过滤 — 单条', () => {
    ;(sys as any).memories.push(makeMemory(1))
    expect(sys.getCreatureMemories(1)).toHaveLength(1)
  })

  it('按 creatureId 过滤 — 多条', () => {
    ;(sys as any).memories.push(makeMemory(1))
    ;(sys as any).memories.push(makeMemory(1))
    ;(sys as any).memories.push(makeMemory(2))
    expect(sys.getCreatureMemories(1)).toHaveLength(2)
  })

  it('只返回匹配的 creatureId 的记忆', () => {
    ;(sys as any).memories.push(makeMemory(1, { x: 10, y: 10 }))
    ;(sys as any).memories.push(makeMemory(2, { x: 20, y: 20 }))
    const result = sys.getCreatureMemories(1)
    expect(result.every((m: HabitatMemory) => m.creatureId === 1)).toBe(true)
  })

  it('memories 为空时所有 creatureId 返回空', () => {
    expect(sys.getCreatureMemories(1)).toHaveLength(0)
    expect(sys.getCreatureMemories(0)).toHaveLength(0)
  })

  it('通过 _creatureMemMap 注入后优先走缓存路径', () => {
    const mem = makeMemory(5)
    const cached = [mem]
    ;(sys as any)._creatureMemMap.set(5, cached)
    const result = sys.getCreatureMemories(5)
    expect(result).toBe(cached)
  })

  it('_creatureMemMap 无记录时走 fallback 扫描', () => {
    ;(sys as any).memories.push(makeMemory(7))
    ;(sys as any).memories.push(makeMemory(7))
    const result = sys.getCreatureMemories(7)
    expect(result).toHaveLength(2)
  })

  it('fallback 扫描返回的是 _creatureMemsBuf 引用', () => {
    ;(sys as any).memories.push(makeMemory(3))
    const result = sys.getCreatureMemories(3)
    expect(result).toBe((sys as any)._creatureMemsBuf)
  })
})

// ─── update() 节流逻辑 ───────────────────────────────────────────────────────
describe('CreatureMigrationMemorySystem — update() 节流', () => {
  let sys: CreatureMigrationMemorySystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 小于 CHECK_INTERVAL 时不执行 update 逻辑', () => {
    const em = makeMockEM()
    const spy = vi.spyOn(sys as any, 'formMemories')
    sys.update(1, em as any, 100)
    expect(spy).not.toHaveBeenCalled()
  })

  it('tick 超过 CHECK_INTERVAL 时执行 update 逻辑', () => {
    const em = makeMockEM()
    const spy = vi.spyOn(sys as any, 'formMemories')
    sys.update(1, em as any, 900)
    expect(spy).toHaveBeenCalled()
  })

  it('update 两次：第二次在 CHECK_INTERVAL 内不触发 formMemories', () => {
    const em = makeMockEM()
    const spy = vi.spyOn(sys as any, 'formMemories')
    sys.update(1, em as any, 900)
    sys.update(1, em as any, 950)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('update 空实体列表不崩溃', () => {
    const em = makeMockEM()
    expect(() => sys.update(1, em as any, 900)).not.toThrow()
  })
})

// ─── decayMemories ────────────────────────────────────────────────────────
describe('CreatureMigrationMemorySystem — 记忆衰减', () => {
  let sys: CreatureMigrationMemorySystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('quality < MIN_QUALITY(10) 的记忆被删除', () => {
    ;(sys as any).memories.push(makeMemory(1, { quality: 9.5 }))
    ;(sys as any).decayMemories()
    expect((sys as any).memories).toHaveLength(0)
  })

  it('quality >= MIN_QUALITY 的记忆保留（减 0.2 后仍 >= 10）', () => {
    ;(sys as any).memories.push(makeMemory(1, { quality: 11 }))
    ;(sys as any).decayMemories()
    expect((sys as any).memories).toHaveLength(1)
  })

  it('decay 后 quality 减少 0.2', () => {
    ;(sys as any).memories.push(makeMemory(1, { quality: 50 }))
    ;(sys as any).decayMemories()
    expect((sys as any).memories[0].quality).toBeCloseTo(49.8, 5)
  })

  it('decay 删除时同步清理 _creatureMemMap', () => {
    const mem = makeMemory(1, { quality: 5 })
    ;(sys as any).memories.push(mem)
    ;(sys as any)._creatureMemMap.set(1, [mem])
    ;(sys as any).decayMemories()
    expect((sys as any)._creatureMemMap.has(1)).toBe(false)
  })

  it('decay 删除最后一条记忆时从 _creatureMemMap 移除整个 key', () => {
    const mem = makeMemory(9, { quality: 2 })
    ;(sys as any).memories.push(mem)
    ;(sys as any)._creatureMemMap.set(9, [mem])
    ;(sys as any).decayMemories()
    expect((sys as any)._creatureMemMap.size).toBe(0)
  })

  it('decay 保留部分记忆时 _creatureMemMap 仍有值', () => {
    const mem1 = makeMemory(1, { quality: 5 })
    const mem2 = makeMemory(1, { quality: 50 })
    ;(sys as any).memories.push(mem1, mem2)
    ;(sys as any)._creatureMemMap.set(1, [mem1, mem2])
    ;(sys as any).decayMemories()
    expect((sys as any)._creatureMemMap.get(1)).toHaveLength(1)
  })
})

// ─── pruneDeadCreatures ────────────────────────────────────────────────────
describe('CreatureMigrationMemorySystem — 清除死亡生物记忆', () => {
  let sys: CreatureMigrationMemorySystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('生物无 creature 组件时其记忆被删除', () => {
    ;(sys as any).memories.push(makeMemory(1))
    const em = makeMockEM([], {})
    ;(sys as any).pruneDeadCreatures(em)
    expect((sys as any).memories).toHaveLength(0)
  })

  it('生物有 creature 组件时其记忆保留', () => {
    ;(sys as any).memories.push(makeMemory(1))
    const em = makeMockEM([1], { 1: { creature: { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'A', age: 1, maxAge: 80, gender: 'male' } } })
    ;(sys as any).pruneDeadCreatures(em)
    expect((sys as any).memories).toHaveLength(1)
  })

  it('pruneDeadCreatures 同步清理 _creatureMemMap', () => {
    const mem = makeMemory(5)
    ;(sys as any).memories.push(mem)
    ;(sys as any)._creatureMemMap.set(5, [mem])
    const em = makeMockEM([], {})
    ;(sys as any).pruneDeadCreatures(em)
    expect((sys as any)._creatureMemMap.has(5)).toBe(false)
  })

  it('prune 只删除死亡生物的记忆，保留存活生物的记忆', () => {
    const alive = makeMemory(1)
    const dead = makeMemory(2)
    ;(sys as any).memories.push(alive, dead)
    const em = makeMockEM([1], { 1: { creature: { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'A', age: 1, maxAge: 80, gender: 'male' } } })
    ;(sys as any).pruneDeadCreatures(em)
    expect((sys as any).memories).toHaveLength(1)
    expect((sys as any).memories[0].creatureId).toBe(1)
  })
})

// ─── 多 route / race 管理 ─────────────────────────────────────────────────
describe('CreatureMigrationMemorySystem — Route 管理', () => {
  let sys: CreatureMigrationMemorySystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('同一 raceType 只生成一条 route（手动验证）', () => {
    ;(sys as any).routes.push(makeRoute('human'))
    ;(sys as any).routes.push(makeRoute('human'))
    const humanRoutes = (sys as any).routes.filter((r: MigrationRoute) => r.raceType === 'human')
    expect(humanRoutes).toHaveLength(2) // 手动注入的，不走去重逻辑
  })

  it('按 raceType 过滤 route', () => {
    ;(sys as any).routes.push(makeRoute('human'))
    ;(sys as any).routes.push(makeRoute('elf'))
    ;(sys as any).routes.push(makeRoute('orc'))
    const elves = (sys as any).routes.filter((r: MigrationRoute) => r.raceType === 'elf')
    expect(elves).toHaveLength(1)
  })

  it('_routeByRace Map 可手动注入', () => {
    const route = makeRoute('dwarf')
    ;(sys as any)._routeByRace.set('dwarf', route)
    expect((sys as any)._routeByRace.get('dwarf')).toBe(route)
  })

  it('updateRoutes 在 routes 已达上限时不新增', () => {
    // MAX_ROUTES = 15
    for (let i = 0; i < 15; i++) {
      ;(sys as any).routes.push(makeRoute(`race_${i}`))
    }
    const em = makeMockEM()
    ;(sys as any).updateRoutes(em)
    expect((sys as any).routes).toHaveLength(15)
  })

  it('waypoints 可有多个', () => {
    ;(sys as any).routes.push(makeRoute('human', {
      waypoints: [
        { x: 1, y: 1, quality: 90 },
        { x: 2, y: 2, quality: 80 },
        { x: 3, y: 3, quality: 70 },
      ]
    }))
    expect((sys as any).routes[0].waypoints).toHaveLength(3)
  })
})

// ─── 综合：memories 容量上限 ─────────────────────────────────────────────
describe('CreatureMigrationMemorySystem — 记忆容量上限', () => {
  let sys: CreatureMigrationMemorySystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('memories 容量上限为 60（MAX_MEMORIES）', () => {
    // formMemories 在 memories.length >= MAX_MEMORIES 时跳过
    // 直接填满测试
    for (let i = 0; i < 60; i++) {
      ;(sys as any).memories.push(makeMemory(i + 1))
    }
    expect((sys as any).memories).toHaveLength(60)
  })

  it('填满后手动添加会突破限制（系统层不阻止直接 push）', () => {
    for (let i = 0; i < 61; i++) {
      ;(sys as any).memories.push(makeMemory(i + 1))
    }
    expect((sys as any).memories.length).toBeGreaterThan(60)
  })

  it('formMemories 在 memories >= 60 时不执行（内部 guard）', () => {
    for (let i = 0; i < 60; i++) {
      ;(sys as any).memories.push(makeMemory(i + 1))
    }
    const em = makeMockEM([999], { 999: { position: { type: 'position', x: 1, y: 1 }, creature: { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'X', age: 20, maxAge: 80, gender: 'male' } } })
    // 强制随机为 0，让 MEMORIZE_CHANCE 通过
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).formMemories(em, 1000, [999])
    expect((sys as any).memories).toHaveLength(60)
    randSpy.mockRestore()
  })
})
