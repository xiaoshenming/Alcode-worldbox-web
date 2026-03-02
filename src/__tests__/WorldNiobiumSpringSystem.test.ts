import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldNiobiumSpringSystem } from '../systems/WorldNiobiumSpringSystem'
import type { NiobiumSpringZone } from '../systems/WorldNiobiumSpringSystem'
import { TileType } from '../utils/Constants'

// ────────────────────────────────────────────────────────────
// 常量（与源码保持一致）
// ────────────────────────────────────────────────────────────
const CHECK_INTERVAL = 2840
const FORM_CHANCE    = 0.003
const MAX_ZONES      = 32
const LIFETIME       = 54000

// ────────────────────────────────────────────────────────────
// 工厂函数
// ────────────────────────────────────────────────────────────
function makeSys(): WorldNiobiumSpringSystem { return new WorldNiobiumSpringSystem() }

let nextId = 1
function makeZone(overrides: Partial<NiobiumSpringZone> = {}): NiobiumSpringZone {
  return {
    id: nextId++, x: 20, y: 30,
    niobiumContent: 60,
    springFlow: 35,
    columbiteLeaching: 60,
    mineralConcentration: 57,
    tick: 0, ...overrides
  }
}

function makeWorld(adjacentTile: number = TileType.MOUNTAIN, w = 100, h = 100) {
  return {
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => adjacentTile
  } as any
}

const em = {} as any

// ────────────────────────────────────────────────────────────
// 1. 初始状态
// ────────────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: WorldNiobiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始泉区列表为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入一个泉区后长度为 1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('注入两个泉区后长度为 2', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })

  it('泉区字段 niobiumContent 正确', () => {
    ;(sys as any).zones.push(makeZone({ niobiumContent: 75 }))
    expect((sys as any).zones[0].niobiumContent).toBe(75)
  })

  it('泉区字段 mineralConcentration / columbiteLeaching 正确', () => {
    ;(sys as any).zones.push(makeZone({ mineralConcentration: 80, columbiteLeaching: 55 }))
    const z = (sys as any).zones[0]
    expect(z.mineralConcentration).toBe(80)
    expect(z.columbiteLeaching).toBe(55)
  })
})

// ────────────────────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ────────────────────────────────────────────────────────────
describe('CHECK_INTERVAL 节流', () => {
  let sys: WorldNiobiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL 时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick == CHECK_INTERVAL 时执行（差值等于 CHECK_INTERVAL，不 < 它）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 <= 0.003 → spawn
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('lastCheck 在执行后更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次调用间隔不足 CHECK_INTERVAL 不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, em, CHECK_INTERVAL)
    const countAfterFirst = (sys as any).zones.length
    sys.update(1, world, em, CHECK_INTERVAL + 100)
    expect((sys as any).zones.length).toBe(countAfterFirst)
  })

  it('满足间隔后第二次执行（zones 可能再次增加）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, em, CHECK_INTERVAL)
    const countAfterFirst = (sys as any).zones.length
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(countAfterFirst)
  })

  it('tick = 0 时不执行（差值 0 < CHECK_INTERVAL）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, 0)
    expect((sys as any).zones).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────
// 3. Spawn 条件
// ────────────────────────────────────────────────────────────
describe('Spawn 条件', () => {
  let sys: WorldNiobiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('邻近 MOUNTAIN 且 random <= FORM_CHANCE → spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('邻近 SHALLOW_WATER 且 random <= FORM_CHANCE → spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.SHALLOW_WATER), em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('邻近 DEEP_WATER 且 random <= FORM_CHANCE → spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.DEEP_WATER), em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('无邻近水或山（GRASS=3）→ 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = { width: 100, height: 100, getTile: () => 3 } as any
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random > FORM_CHANCE → 不 spawn（即使邻近山）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('已达 MAX_ZONES 时不 spawn（break 跳出 attempt 循环）', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const before = (sys as any).nextId
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(before)
  })

  it('spawn 后 tick 字段等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.tick).toBe(CHECK_INTERVAL)
  })

  it('一次 update 最多尝试 3 次（zones 增量 <= 3）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })
})

// ────────────────────────────────────────────────────────────
// 4. Spawn 字段范围
// ────────────────────────────────────────────────────────────
describe('Spawn 字段范围', () => {
  let sys: WorldNiobiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  function spawnOne(r = 0) {
    vi.spyOn(Math, 'random').mockReturnValue(r)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    return (sys as any).zones[0] as NiobiumSpringZone
  }

  it('niobiumContent 范围 [40, 100]', () => {
    const z = spawnOne(0)
    expect(z.niobiumContent).toBeGreaterThanOrEqual(40)
    expect(z.niobiumContent).toBeLessThanOrEqual(100)
  })

  it('springFlow 范围 [10, 60]', () => {
    const z = spawnOne(0)
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
    expect(z.springFlow).toBeLessThanOrEqual(60)
  })

  it('columbiteLeaching 范围 [20, 100]', () => {
    const z = spawnOne(0)
    expect(z.columbiteLeaching).toBeGreaterThanOrEqual(20)
    expect(z.columbiteLeaching).toBeLessThanOrEqual(100)
  })

  it('mineralConcentration 范围 [15, 100]', () => {
    const z = spawnOne(0)
    expect(z.mineralConcentration).toBeGreaterThanOrEqual(15)
    expect(z.mineralConcentration).toBeLessThanOrEqual(100)
  })

  it('niobiumContent 最小值约 40（random=0）', () => {
    const z = spawnOne(0)
    expect(z.niobiumContent).toBeGreaterThanOrEqual(40)
  })

  it('x/y 在 [0, width/height) 区间', () => {
    const z = spawnOne(0)
    expect(z.x).toBeGreaterThanOrEqual(0)
    expect(z.x).toBeLessThan(100)
    expect(z.y).toBeGreaterThanOrEqual(0)
    expect(z.y).toBeLessThan(100)
  })

  it('spawn 的泉区 id 从 1 开始', () => {
    const z = spawnOne(0)
    expect(z.id).toBe(1)
  })

  it('columbiteLeaching 最小值约 20（random=0）', () => {
    const z = spawnOne(0)
    // random=0: columbiteLeaching = 20 + 0*80 = 20
    expect(z.columbiteLeaching).toBeGreaterThanOrEqual(20)
  })
})

// ────────────────────────────────────────────────────────────
// 5. Cleanup 逻辑
// ────────────────────────────────────────────────────────────
describe('Cleanup 逻辑', () => {
  let sys: WorldNiobiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  function runCleanup(zoneTick: number, currentTick: number) {
    ;(sys as any).zones.push(makeZone({ tick: zoneTick }))
    ;(sys as any).lastCheck = currentTick - CHECK_INTERVAL - 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > FORM_CHANCE，不 spawn
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, currentTick)
    return (sys as any).zones as NiobiumSpringZone[]
  }

  it('tick 恰好等于 cutoff（currentTick - 54000）时保留（严格 <）', () => {
    const cur = 100000
    const cutoff = cur - LIFETIME
    const zones = runCleanup(cutoff, cur)
    expect(zones).toHaveLength(1)
  })

  it('tick = cutoff - 1（刚过期）时删除', () => {
    const cur = 100000
    const cutoff = cur - LIFETIME
    const zones = runCleanup(cutoff - 1, cur)
    expect(zones).toHaveLength(0)
  })

  it('tick = cutoff + 1（仍有效）时保留', () => {
    const cur = 100000
    const cutoff = cur - LIFETIME
    const zones = runCleanup(cutoff + 1, cur)
    expect(zones).toHaveLength(1)
  })

  it('多个泉区：部分过期，部分保留', () => {
    const cur = 200000
    const cutoff = cur - LIFETIME
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 1 }))
    ;(sys as any).zones.push(makeZone({ tick: cur }))
    ;(sys as any).lastCheck = cur - CHECK_INTERVAL - 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, cur)
    expect((sys as any).zones).toHaveLength(2)
  })

  it('全部过期时列表清空', () => {
    const cur = 200000
    const cutoff = cur - LIFETIME
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 100 }))
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 200 }))
    ;(sys as any).lastCheck = cur - CHECK_INTERVAL - 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, cur)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick=0 的泉区在 currentTick=54001 时被删除', () => {
    const zones = runCleanup(0, LIFETIME + 1)
    expect(zones).toHaveLength(0)
  })

  it('tick=0 的泉区在 currentTick=54000 时保留（cutoff=0，0 不 < 0）', () => {
    const zones = runCleanup(0, LIFETIME)
    // cutoff = 54000 - 54000 = 0; t.tick = 0; 0 < 0 → false → 保留
    expect(zones).toHaveLength(1)
  })

  it('cleanup 在 spawn 之后执行（新 spawn 的极早期泉区也会被清理）', () => {
    // 验证即使 spawn 了泉区，如果超过 lifetime 也会被清理
    const cur = 200000
    const cutoff = cur - LIFETIME
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 500 })) // 过期
    ;(sys as any).lastCheck = cur - CHECK_INTERVAL - 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不 spawn
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, cur)
    expect((sys as any).zones).toHaveLength(0)
  })
})
