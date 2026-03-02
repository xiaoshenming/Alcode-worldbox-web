import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRockShelterSystem } from '../systems/WorldRockShelterSystem'
import type { RockShelter } from '../systems/WorldRockShelterSystem'

// CHECK_INTERVAL=2590, FORM_CHANCE=0.0013, MAX_SHELTERS=14
// spawn tile: MOUNTAIN(5) or SAND(2)
// Spawn order in update():
//   1) if shelters.length < MAX_SHELTERS && random() < FORM_CHANCE => spawn
//   2) for each shelter: update fields
//   3) cleanup: shelter.tick < (currentTick-94000) => splice (strict <)
// cleanup: strict < (equals cutoff stays)

const CHECK_INTERVAL = 2590
const MAX_SHELTERS = 14

function makeSys(): WorldRockShelterSystem { return new WorldRockShelterSystem() }

let nextId = 1

function makeShelter(overrides: Partial<RockShelter> = {}): RockShelter {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    depth: 8,
    width: 10,
    ceilingHeight: 4,
    stability: 70,
    habitability: 50,
    spectacle: 35,
    tick: 0,
    ...overrides
  }
}

function makeWorld(tileValue: number = 5): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn().mockReturnValue(tileValue)
  }
}

function makeEM(): any { return {} }

// Helper: setup Math.random mock with a sequence
// first call used for FORM_CHANCE gate, rest for coordinates/fields
let mockCallCount = 0
function setupSpawnMock(formChanceVal: number, fieldVal: number = 0.5): void {
  mockCallCount = 0
  vi.spyOn(Math, 'random').mockImplementation(() => {
    mockCallCount++
    if (mockCallCount === 1) return formChanceVal
    return fieldVal
  })
}

// ───────────────────────────��─────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldRockShelterSystem - 初始状态', () => {
  let sys: WorldRockShelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始shelters数组为空', () => {
    expect((sys as any).shelters).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入一个shelter后长度为1', () => {
    ;(sys as any).shelters.push(makeShelter())
    expect((sys as any).shelters).toHaveLength(1)
  })

  it('注入多个shelter后长度正确', () => {
    ;(sys as any).shelters.push(makeShelter(), makeShelter(), makeShelter())
    expect((sys as any).shelters).toHaveLength(3)
  })

  it('shelter字段depth正确', () => {
    ;(sys as any).shelters.push(makeShelter())
    expect((sys as any).shelters[0].depth).toBe(8)
  })

  it('shelter字段habitability正确', () => {
    ;(sys as any).shelters.push(makeShelter())
    expect((sys as any).shelters[0].habitability).toBe(50)
  })

  it('shelter字段stability正确', () => {
    ;(sys as any).shelters.push(makeShelter())
    expect((sys as any).shelters[0].stability).toBe(70)
  })
})

// ─────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────
describe('WorldRockShelterSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldRockShelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（0-0=0<2590）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2589时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 2589)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2590时触发（2590-0=2590不<2590）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).lastCheck).toBe(2590)
  })

  it('触发后lastCheck更新到当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('连续调用：第二次需再过2590才触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    sys.update(1, makeWorld(5), makeEM(), 5179)
    expect((sys as any).lastCheck).toBe(2590)
    sys.update(1, makeWorld(5), makeEM(), 5180)
    expect((sys as any).lastCheck).toBe(5180)
  })

  it('未达阈值时shelters不变', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2589)
    expect((sys as any).shelters).toHaveLength(0)
  })

  it('达到阈值且概率满足时可以spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters).toHaveLength(1)
  })

  it('大tick值正常工作', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 999000)
    expect((sys as any).lastCheck).toBe(999000)
  })
})

// ─────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────
describe('WorldRockShelterSystem - spawn条件', () => {
  let sys: WorldRockShelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('Math.random>=FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters).toHaveLength(0)
  })

  it('MOUNTAIN(5) tile时spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters).toHaveLength(1)
  })

  it('SAND(2) tile时spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(2), makeEM(), 2590)
    expect((sys as any).shelters).toHaveLength(1)
  })

  it('GRASS(3) tile时不spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(3), makeEM(), 2590)
    expect((sys as any).shelters).toHaveLength(0)
  })

  it('DEEP_WATER(0) tile时不spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(0), makeEM(), 2590)
    expect((sys as any).shelters).toHaveLength(0)
  })

  it('SNOW(6) tile时不spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(6), makeEM(), 2590)
    expect((sys as any).shelters).toHaveLength(0)
  })

  it('shelters达到MAX_SHELTERS时不再spawn', () => {
    for (let i = 0; i < MAX_SHELTERS; i++) {
      ;(sys as any).shelters.push(makeShelter())
    }
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters).toHaveLength(MAX_SHELTERS)
  })

  it('shelters=MAX_SHELTERS-1时仍可spawn', () => {
    for (let i = 0; i < MAX_SHELTERS - 1; i++) {
      ;(sys as any).shelters.push(makeShelter())
    }
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters).toHaveLength(MAX_SHELTERS)
  })

  it('spawn后nextId递增', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).nextId).toBe(2)
  })
})

// ─────────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────────
describe('WorldRockShelterSystem - spawn字段范围', () => {
  let sys: WorldRockShelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn后tick等于传入tick', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters[0].tick).toBe(2590)
  })

  it('spawn后id从1开始', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters[0].id).toBe(1)
  })

  it('depth范围在3~18之间（spawn后update一次+0.000003）', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    const s = (sys as any).shelters[0]
    expect(s.depth).toBeGreaterThanOrEqual(3)
    expect(s.depth).toBeLessThanOrEqual(18)
  })

  it('width范围在4~16之间', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    const s = (sys as any).shelters[0]
    expect(s.width).toBeGreaterThanOrEqual(4)
    expect(s.width).toBeLessThanOrEqual(16)
  })

  it('ceilingHeight范围在2~8之间', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    const s = (sys as any).shelters[0]
    expect(s.ceilingHeight).toBeGreaterThanOrEqual(2)
    expect(s.ceilingHeight).toBeLessThanOrEqual(8)
  })

  it('stability在15~85之间（含update衰减）', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    const s = (sys as any).shelters[0]
    expect(s.stability).toBeGreaterThanOrEqual(15)
    expect(s.stability).toBeLessThanOrEqual(85)
  })

  it('habitability在10~70之间（含update后）', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    const s = (sys as any).shelters[0]
    expect(s.habitability).toBeGreaterThanOrEqual(10)
    expect(s.habitability).toBeLessThanOrEqual(70)
  })

  it('spectacle在8~55之间（含update后）', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    const s = (sys as any).shelters[0]
    expect(s.spectacle).toBeGreaterThanOrEqual(8)
    expect(s.spectacle).toBeLessThanOrEqual(55)
  })

  it('两次spawn产生不同id', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 5180)
    const ids = (sys as any).shelters.map((s: RockShelter) => s.id)
    expect(ids[0]).not.toBe(ids[1])
  })
})

// ─────────────────────────────────────────────
// 5. update 数值逻辑
// ─────────────────────────────────────────────
describe('WorldRockShelterSystem - update数值逻辑', () => {
  let sys: WorldRockShelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('depth每次增加0.000003', () => {
    ;(sys as any).shelters.push(makeShelter({ depth: 8 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters[0].depth).toBeCloseTo(8.000003)
  })

  it('depth不超过18（上限保护）', () => {
    ;(sys as any).shelters.push(makeShelter({ depth: 18 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters[0].depth).toBe(18)
  })

  it('stability每次减少0.00002', () => {
    ;(sys as any).shelters.push(makeShelter({ stability: 70 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters[0].stability).toBeCloseTo(69.99998)
  })

  it('stability不低于15（下限保护）', () => {
    ;(sys as any).shelters.push(makeShelter({ stability: 15 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters[0].stability).toBe(15)
  })

  it('spectacle不超过55（上限保护）', () => {
    ;(sys as any).shelters.push(makeShelter({ spectacle: 55 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters[0].spectacle).toBeLessThanOrEqual(55)
  })

  it('spectacle不低于8（下限保护）', () => {
    ;(sys as any).shelters.push(makeShelter({ spectacle: 8 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters[0].spectacle).toBe(8)
  })

  it('habitability不低于10（下限保护）', () => {
    ;(sys as any).shelters.push(makeShelter({ habitability: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters[0].habitability).toBe(10)
  })

  it('多个shelter都被update', () => {
    ;(sys as any).shelters.push(
      makeShelter({ depth: 8 }),
      makeShelter({ depth: 12 })
    )
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters[0].depth).toBeCloseTo(8.000003)
    expect((sys as any).shelters[1].depth).toBeCloseTo(12.000003)
  })
})

// ─────────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────────
describe('WorldRockShelterSystem - cleanup逻辑', () => {
  let sys: WorldRockShelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // cutoff = tick - 94000; 删除条件: shelter.tick < cutoff（严格<，等于保留）

  it('shelter.tick=0，currentTick=94001时删除（cutoff=1，0<1）', () => {
    ;(sys as any).shelters.push(makeShelter({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 94001)
    expect((sys as any).shelters).toHaveLength(0)
  })

  it('shelter.tick=0，currentTick=94000时cutoff=0，0<0为false，保留', () => {
    ;(sys as any).shelters.push(makeShelter({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 94000)
    expect((sys as any).shelters).toHaveLength(1)
  })

  it('shelter.tick=5000，currentTick=99000时cutoff=5000，保留', () => {
    ;(sys as any).shelters.push(makeShelter({ tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 99000)
    expect((sys as any).shelters).toHaveLength(1)
  })

  it('shelter.tick=5000，currentTick=99001时删除（cutoff=5001，5000<5001）', () => {
    ;(sys as any).shelters.push(makeShelter({ tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 99001)
    expect((sys as any).shelters).toHaveLength(0)
  })

  it('新spawn的shelter不会被立即删除', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2590)
    expect((sys as any).shelters).toHaveLength(1)
  })

  it('混合新旧shelter时只删旧的', () => {
    // cutoff = 200001 - 94000 = 106001
    // tick=0 < 106001 => deleted
    // tick=150000 < 106001? No => kept
    ;(sys as any).shelters.push(
      makeShelter({ tick: 0 }),
      makeShelter({ tick: 150000 })
    )
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 200001)
    expect((sys as any).shelters).toHaveLength(1)
    expect((sys as any).shelters[0].tick).toBe(150000)
  })

  it('所有shelter过期时数组清空', () => {
    ;(sys as any).shelters.push(
      makeShelter({ tick: 0 }),
      makeShelter({ tick: 1 }),
      makeShelter({ tick: 2 })
    )
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 94003)
    expect((sys as any).shelters).toHaveLength(0)
  })

  it('spawn在cleanup之前执行，MAX_SHELTERS满时不spawn', () => {
    // spawn happens before cleanup in update()
    // if start with MAX_SHELTERS old shelters, spawn check sees 14 >= 14 => no spawn
    // then cleanup removes all 14 => 0
    for (let i = 0; i < MAX_SHELTERS; i++) {
      ;(sys as any).shelters.push(makeShelter({ tick: 0 }))
    }
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 94001)
    expect((sys as any).shelters).toHaveLength(0)
  })
})
