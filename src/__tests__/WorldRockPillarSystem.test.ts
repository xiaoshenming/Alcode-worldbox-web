import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRockPillarSystem } from '../systems/WorldRockPillarSystem'
import type { RockPillar } from '../systems/WorldRockPillarSystem'

// CHECK_INTERVAL=2600, FORM_CHANCE=0.0013, MAX_PILLARS=14
// spawn tile: MOUNTAIN(5) or SAND(2)
// Spawn order in update():
//   1) if pillars.length < MAX_PILLARS && random() < FORM_CHANCE => spawn (fields set)
//   2) for each pillar: height=max(2,h-erosionRate), stability=max(10,s-0.00003), spectacle clamp[8,70]
//   3) cleanup: pillar.tick < (currentTick-92000) => splice
// So fields are mutated once AFTER spawn in same frame.
// cleanup: strict < (equals cutoff stays)

const CHECK_INTERVAL = 2600
const MAX_PILLARS = 14

function makeSys(): WorldRockPillarSystem { return new WorldRockPillarSystem() }

let nextId = 1

function makePillar(overrides: Partial<RockPillar> = {}): RockPillar {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    height: 20,
    diameter: 4,
    stability: 70,
    erosionRate: 0.002,
    spectacle: 50,
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

// Helper: mock random with sequence of values
// First call for FORM_CHANCE check, subsequent for coords and field init
let mockCallCount = 0
function setupSpawnMock(formChanceVal: number, fieldVal: number = 0.5): void {
  mockCallCount = 0
  vi.spyOn(Math, 'random').mockImplementation(() => {
    mockCallCount++
    // first call is for FORM_CHANCE check
    if (mockCallCount === 1) return formChanceVal
    return fieldVal
  })
}

// ─────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldRockPillarSystem - 初始状态', () => {
  let sys: WorldRockPillarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始pillars数组为空', () => {
    expect((sys as any).pillars).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入一个pillar后长度为1', () => {
    ;(sys as any).pillars.push(makePillar())
    expect((sys as any).pillars).toHaveLength(1)
  })

  it('注入多个pillar后长度正确', () => {
    ;(sys as any).pillars.push(makePillar(), makePillar(), makePillar())
    expect((sys as any).pillars).toHaveLength(3)
  })

  it('pillar字段height正确', () => {
    ;(sys as any).pillars.push(makePillar())
    expect((sys as any).pillars[0].height).toBe(20)
  })

  it('pillar字段stability正确', () => {
    ;(sys as any).pillars.push(makePillar())
    expect((sys as any).pillars[0].stability).toBe(70)
  })

  it('pillar字段erosionRate正确', () => {
    ;(sys as any).pillars.push(makePillar())
    expect((sys as any).pillars[0].erosionRate).toBe(0.002)
  })
})

// ─────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────
describe('WorldRockPillarSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldRockPillarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（lastCheck=0,差值0<2600）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2599时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 2599)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2600时触发，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('触发后再次触发需再加2600', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    sys.update(1, makeWorld(5), makeEM(), 5199)
    expect((sys as any).lastCheck).toBe(2600)
    sys.update(1, makeWorld(5), makeEM(), 5200)
    expect((sys as any).lastCheck).toBe(5200)
  })

  it('大tick值能正常触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 100000)
    expect((sys as any).lastCheck).toBe(100000)
  })

  it('未达阈值时pillars不变', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2599)
    expect((sys as any).pillars).toHaveLength(0)
  })

  it('达到阈值且概率满足时可以spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).pillars).toHaveLength(1)
  })

  it('等于CHECK_INTERVAL时触发（边界=2600不<2600）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })
})

// ─────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────
describe('WorldRockPillarSystem - spawn条件', () => {
  let sys: WorldRockPillarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('Math.random>=FORM_CHANCE时不spawn（概率门槛）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).pillars).toHaveLength(0)
  })

  it('Math.random<FORM_CHANCE且MOUNTAIN时spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2600) // MOUNTAIN=5
    expect((sys as any).pillars).toHaveLength(1)
  })

  it('Math.random<FORM_CHANCE且SAND时spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(2), makeEM(), 2600) // SAND=2
    expect((sys as any).pillars).toHaveLength(1)
  })

  it('GRASS tile时不spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(3), makeEM(), 2600) // GRASS=3
    expect((sys as any).pillars).toHaveLength(0)
  })

  it('FOREST tile时不spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(4), makeEM(), 2600) // FOREST=4
    expect((sys as any).pillars).toHaveLength(0)
  })

  it('LAVA tile时不spawn', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(7), makeEM(), 2600) // LAVA=7
    expect((sys as any).pillars).toHaveLength(0)
  })

  it('pillars达到MAX_PILLARS时不再spawn', () => {
    for (let i = 0; i < MAX_PILLARS; i++) {
      ;(sys as any).pillars.push(makePillar())
    }
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).pillars).toHaveLength(MAX_PILLARS)
  })

  it('pillars=MAX_PILLARS-1时仍可spawn', () => {
    for (let i = 0; i < MAX_PILLARS - 1; i++) {
      ;(sys as any).pillars.push(makePillar())
    }
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).pillars).toHaveLength(MAX_PILLARS)
  })

  it('spawn后nextId递增', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).nextId).toBe(2)
  })
})

// ─────────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────────
describe('WorldRockPillarSystem - spawn字段范围', () => {
  let sys: WorldRockPillarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn后tick等于传入tick', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    const p = (sys as any).pillars[0]
    expect(p.tick).toBe(2600)
  })

  it('spawn后id从1开始', () => {
    setupSpawnMock(0.0001)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    const p = (sys as any).pillars[0]
    expect(p.id).toBe(1)
  })

  it('height在spawn+update后范围>=2且<=33', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    const p = (sys as any).pillars[0]
    expect(p.height).toBeGreaterThanOrEqual(2)
    expect(p.height).toBeLessThanOrEqual(33)
  })

  it('stability在spawn+update后范围>=10', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    const p = (sys as any).pillars[0]
    expect(p.stability).toBeGreaterThanOrEqual(10)
  })

  it('stability在spawn+update后范围<=85', () => {
    setupSpawnMock(0.0001, 0.999)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    const p = (sys as any).pillars[0]
    expect(p.stability).toBeLessThanOrEqual(85)
  })

  it('diameter在spawn后范围[2,8]', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    const p = (sys as any).pillars[0]
    expect(p.diameter).toBeGreaterThanOrEqual(2)
    expect(p.diameter).toBeLessThanOrEqual(8)
  })

  it('spectacle在spawn+update后范围[8,70]', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    const p = (sys as any).pillars[0]
    expect(p.spectacle).toBeGreaterThanOrEqual(8)
    expect(p.spectacle).toBeLessThanOrEqual(70)
  })

  it('erosionRate在spawn后范围[0.001,0.004]', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    const p = (sys as any).pillars[0]
    expect(p.erosionRate).toBeGreaterThanOrEqual(0.001)
    expect(p.erosionRate).toBeLessThanOrEqual(0.004)
  })

  it('两次spawn产生不同id', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 5200)
    const ids = (sys as any).pillars.map((p: RockPillar) => p.id)
    expect(ids[0]).not.toBe(ids[1])
  })
})

// ─────────────────────────────────────────────
// 5. update 数值逻辑
// ─────────────────────────────────────────────
describe('WorldRockPillarSystem - update数值逻辑', () => {
  let sys: WorldRockPillarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次触发height减少erosionRate', () => {
    ;(sys as any).pillars.push(makePillar({ height: 20, erosionRate: 0.002 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    const p = (sys as any).pillars[0]
    expect(p.height).toBeCloseTo(19.998)
  })

  it('height不会低于2（下限保护）', () => {
    ;(sys as any).pillars.push(makePillar({ height: 2, erosionRate: 0.002 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).pillars[0].height).toBe(2)
  })

  it('stability每次减少0.00003', () => {
    ;(sys as any).pillars.push(makePillar({ stability: 70 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).pillars[0].stability).toBeCloseTo(69.99997)
  })

  it('stability不会低于10（下限保护）', () => {
    ;(sys as any).pillars.push(makePillar({ stability: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).pillars[0].stability).toBe(10)
  })

  it('spectacle不超过70（上限保护）', () => {
    ;(sys as any).pillars.push(makePillar({ spectacle: 70 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0) // (1-0.47)*0.08=正增量
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).pillars[0].spectacle).toBeLessThanOrEqual(70)
  })

  it('spectacle不低于8（下限保护）', () => {
    ;(sys as any).pillars.push(makePillar({ spectacle: 8 }))
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.47)*0.08=负增量
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).pillars[0].spectacle).toBe(8)
  })

  it('多个pillar都被update', () => {
    ;(sys as any).pillars.push(
      makePillar({ height: 20, erosionRate: 0.002 }),
      makePillar({ height: 15, erosionRate: 0.001 })
    )
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).pillars[0].height).toBeCloseTo(19.998)
    expect((sys as any).pillars[1].height).toBeCloseTo(14.999)
  })

  it('未达CHECK_INTERVAL时不执行update', () => {
    ;(sys as any).pillars.push(makePillar({ height: 20, erosionRate: 0.002 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 100) // lastCheck=0, 100<2600
    expect((sys as any).pillars[0].height).toBe(20)
  })
})

// ─────────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────────
describe('WorldRockPillarSystem - cleanup逻辑', () => {
  let sys: WorldRockPillarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // cutoff = tick - 92000
  // 删除条件: pillar.tick < cutoff（严格小于，等于cutoff保留）

  it('pillar.tick=0，currentTick=92001时删除（cutoff=1，0<1）', () => {
    ;(sys as any).pillars.push(makePillar({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 92001)
    expect((sys as any).pillars).toHaveLength(0)
  })

  it('pillar.tick=0，currentTick=92000时cutoff=0，0<0为false，保留', () => {
    ;(sys as any).pillars.push(makePillar({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 92000)
    expect((sys as any).pillars).toHaveLength(1)
  })

  it('pillar.tick=1000，currentTick=93000时cutoff=1000，1000<1000为false，保留', () => {
    ;(sys as any).pillars.push(makePillar({ tick: 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 93000)
    expect((sys as any).pillars).toHaveLength(1)
  })

  it('pillar.tick=1000，currentTick=93001时删除（cutoff=1001，1000<1001）', () => {
    ;(sys as any).pillars.push(makePillar({ tick: 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 93001)
    expect((sys as any).pillars).toHaveLength(0)
  })

  it('新pillar不会被立即cleanup', () => {
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 2600)
    expect((sys as any).pillars).toHaveLength(1)
  })

  it('混合新旧pillar时只删旧的', () => {
    // tick=0会被删（cutoff=200001-92000=108001, 0 < 108001）
    // tick=150000会被保留（150000 < 108001? No, 150000 > 108001 => not deleted）
    ;(sys as any).pillars.push(
      makePillar({ tick: 0 }),
      makePillar({ tick: 150000 })
    )
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 200001)
    expect((sys as any).pillars).toHaveLength(1)
    expect((sys as any).pillars[0].tick).toBe(150000)
  })

  it('所有pillar过期时数组清空', () => {
    ;(sys as any).pillars.push(
      makePillar({ tick: 0 }),
      makePillar({ tick: 1 }),
      makePillar({ tick: 2 })
    )
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), makeEM(), 92003)
    expect((sys as any).pillars).toHaveLength(0)
  })

  it('cleanup后空间重新可用（spawn检查在cleanup之前）', () => {
    // In update: spawn happens BEFORE cleanup
    // So if we start with MAX_PILLARS items (all old), spawn check sees length>=MAX_PILLARS => no spawn
    // Then cleanup removes expired ones
    // Net result: 0 items
    for (let i = 0; i < MAX_PILLARS; i++) {
      ;(sys as any).pillars.push(makePillar({ tick: 0 }))
    }
    setupSpawnMock(0.0001, 0.5)
    sys.update(1, makeWorld(5), makeEM(), 92001)
    // spawn skipped (14 >= 14), cleanup removes 14 => 0
    expect((sys as any).pillars).toHaveLength(0)
  })
})
