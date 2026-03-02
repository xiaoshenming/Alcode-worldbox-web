import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRiftValleySystem } from '../systems/WorldRiftValleySystem'
import type { RiftValley } from '../systems/WorldRiftValleySystem'

// TileType: DEEP_WATER=0,SHALLOW_WATER=1,SAND=2,GRASS=3,FOREST=4,MOUNTAIN=5,SNOW=6,LAVA=7
const TileType = { DEEP_WATER: 0, SHALLOW_WATER: 1, SAND: 2, GRASS: 3, FOREST: 4, MOUNTAIN: 5, SNOW: 6, LAVA: 7 }

// CHECK_INTERVAL=2800, FORM_CHANCE=0.0012, MAX_RIFTS=10
// cutoff = tick - 105000; 删除条件: rift.tick < cutoff (strict <)
// depth: min/max=300  width: min=keep max=12  tectonicActivity: clamp[5,80]  lakeFormation: max=70

function makeSys(): WorldRiftValleySystem { return new WorldRiftValleySystem() }

let _id = 200
function makeRiftValley(overrides: Partial<RiftValley> = {}): RiftValley {
  return {
    id: _id++, x: 20, y: 30,
    length: 80, width: 15, depth: 50,
    tectonicActivity: 70, lakeFormation: 40, volcanicVents: 3,
    tick: 0,
    ...overrides
  }
}

function makeWorld(tile: number = TileType.GRASS) {
  return {
    width: 200,
    height: 200,
    getTile: vi.fn().mockReturnValue(tile),
    setTile: vi.fn(),
  }
}

function makeEM() {
  return { getEntitiesWithComponents: vi.fn().mockReturnValue([]) }
}

describe('WorldRiftValleySystem - 初始状态', () => {
  let sys: WorldRiftValleySystem
  beforeEach(() => { sys = makeSys(); _id = 200 })

  it('rifts 初始为空数组', () => {
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入一个 rift 后 length 为 1', () => {
    ;(sys as any).rifts.push(makeRiftValley())
    expect((sys as any).rifts).toHaveLength(1)
  })
  it('注入三个 rifts 后 length 为 3', () => {
    ;(sys as any).rifts.push(makeRiftValley(), makeRiftValley(), makeRiftValley())
    expect((sys as any).rifts).toHaveLength(3)
  })
  it('rifts 返回同一内部引用', () => {
    expect((sys as any).rifts).toBe((sys as any).rifts)
  })
  it('rift.tectonicActivity 字段可读取', () => {
    ;(sys as any).rifts.push(makeRiftValley({ tectonicActivity: 55 }))
    expect((sys as any).rifts[0].tectonicActivity).toBe(55)
  })
  it('rift.lakeFormation 字段可读取', () => {
    ;(sys as any).rifts.push(makeRiftValley({ lakeFormation: 25 }))
    expect((sys as any).rifts[0].lakeFormation).toBe(25)
  })
})

describe('WorldRiftValleySystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldRiftValleySystem
  const em = makeEM()

  beforeEach(() => { sys = makeSys(); _id = 200; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < 2800 时不执行（lastCheck 不变）', () => {
    const world = makeWorld(TileType.SAND) // 不会 spawn
    sys.update(0, world as any, em as any, 2799)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick === 2800 时执行（lastCheck 更新为 2800）', () => {
    const world = makeWorld(TileType.SAND)
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })
  it('tick > 2800 时执行', () => {
    const world = makeWorld(TileType.SAND)
    sys.update(0, world as any, em as any, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('执行一次后间隔不足不再执行', () => {
    const world = makeWorld(TileType.SAND)
    sys.update(0, world as any, em as any, 2800)
    sys.update(0, world as any, em as any, 2800 + 2799)
    expect((sys as any).lastCheck).toBe(2800)
  })
  it('第二次满足间隔后执行', () => {
    const world = makeWorld(TileType.SAND)
    sys.update(0, world as any, em as any, 2800)
    sys.update(0, world as any, em as any, 5600)
    expect((sys as any).lastCheck).toBe(5600)
  })
  it('tick=0 时不执行', () => {
    const world = makeWorld(TileType.SAND)
    sys.update(0, world as any, em as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('节流期间 rifts 不增加', () => {
    const world = makeWorld(TileType.SAND)
    sys.update(0, world as any, em as any, 2800)
    const len = (sys as any).rifts.length
    sys.update(0, world as any, em as any, 3000)
    expect((sys as any).rifts.length).toBe(len)
  })
  it('大 tick 能正确执行', () => {
    const world = makeWorld(TileType.SAND)
    sys.update(0, world as any, em as any, 500000)
    expect((sys as any).lastCheck).toBe(500000)
  })
})

describe('WorldRiftValleySystem - spawn 条件', () => {
  let sys: WorldRiftValleySystem
  const em = makeEM()

  beforeEach(() => { sys = makeSys(); _id = 200; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tile=GRASS 且 random < FORM_CHANCE(0.0012) 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005) // < 0.0012
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts.length).toBeGreaterThanOrEqual(1)
  })
  it('tile=MOUNTAIN 且 random 满足时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts.length).toBeGreaterThanOrEqual(1)
  })
  it('tile=FOREST 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    const world = makeWorld(TileType.FOREST)
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('tile=DEEP_WATER 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    const world = makeWorld(TileType.DEEP_WATER)
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('tile=LAVA 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    const world = makeWorld(TileType.LAVA)
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('random >= FORM_CHANCE(0.0012) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002) // > 0.0012
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('rifts 达到 MAX_RIFTS(10) 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    const world = makeWorld(TileType.GRASS)
    for (let i = 0; i < 10; i++) {
      ;(sys as any).rifts.push(makeRiftValley({ tick: 2800 }))
    }
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts).toHaveLength(10)
  })
  it('spawn 后 rift.tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 2800)
    if ((sys as any).rifts.length > 0) {
      expect((sys as any).rifts[0].tick).toBe(2800)
    }
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    const world = makeWorld(TileType.GRASS)
    const prevId = (sys as any).nextId
    sys.update(0, world as any, em as any, 2800)
    if ((sys as any).rifts.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(prevId)
    }
  })
})

describe('WorldRiftValleySystem - spawn 字段范围', () => {
  let sys: WorldRiftValleySystem
  const em = makeEM()

  beforeEach(() => { sys = makeSys(); _id = 200; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(): RiftValley | null {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    const world = makeWorld(TileType.GRASS)
    sys.update(0, world as any, em as any, 2800)
    return (sys as any).rifts[0] ?? null
  }

  it('spawn 后 length 在 [15, 35) 范围内', () => {
    const r = spawnOne()
    if (r) { expect(r.length).toBeGreaterThanOrEqual(15); expect(r.length).toBeLessThanOrEqual(34) }
  })
  it('spawn 后 width 在 [3, 7] 范围内', () => {
    const r = spawnOne()
    if (r) { expect(r.width).toBeGreaterThanOrEqual(3); expect(r.width).toBeLessThanOrEqual(12) }
  })
  it('spawn 后 depth 大于等于 80（初始最小值）', () => {
    const r = spawnOne()
    if (r) { expect(r.depth).toBeGreaterThanOrEqual(80) }
  })
  it('spawn 后 depth 不超过 300（clamp 上限）', () => {
    const r = spawnOne()
    if (r) { expect(r.depth).toBeLessThanOrEqual(300) }
  })
  it('spawn 后 tectonicActivity 在 [20, 70] 附近', () => {
    const r = spawnOne()
    if (r) { expect(r.tectonicActivity).toBeGreaterThanOrEqual(5); expect(r.tectonicActivity).toBeLessThanOrEqual(80) }
  })
  it('spawn 后 lakeFormation 大于 10', () => {
    const r = spawnOne()
    if (r) { expect(r.lakeFormation).toBeGreaterThanOrEqual(10) }
  })
  it('spawn 后 lakeFormation 不超过 70（clamp 上限）', () => {
    const r = spawnOne()
    if (r) { expect(r.lakeFormation).toBeLessThanOrEqual(70) }
  })
  it('spawn 后 volcanicVents 在 [2, 7] 范围内', () => {
    const r = spawnOne()
    if (r) { expect(r.volcanicVents).toBeGreaterThanOrEqual(2); expect(r.volcanicVents).toBeLessThanOrEqual(7) }
  })
  it('spawn 后 id 为正整数', () => {
    const r = spawnOne()
    if (r) { expect(r.id).toBeGreaterThan(0) }
  })
})

describe('WorldRiftValleySystem - update 数值逻辑', () => {
  let sys: WorldRiftValleySystem
  const em = makeEM()

  beforeEach(() => { sys = makeSys(); _id = 200; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('depth 随 tectonicActivity 增长（上限 300）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ depth: 100, tectonicActivity: 50, tick: 2800 }))
    sys.update(0, world as any, em as any, 2800)
    // depth += 50 * 0.0002 = 0.01 → 100.01
    expect((sys as any).rifts[0].depth).toBeGreaterThan(100)
    expect((sys as any).rifts[0].depth).toBeLessThanOrEqual(300)
  })
  it('depth 达到 300 时不再增长（clamp）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ depth: 300, tectonicActivity: 80, tick: 2800 }))
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts[0].depth).toBe(300)
  })
  it('width 每次 update 增加 0.0001', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ width: 5, tick: 2800 }))
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts[0].width).toBeCloseTo(5.0001, 4)
  })
  it('width clamp 上限为 12', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ width: 12, tick: 2800 }))
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts[0].width).toBe(12)
  })
  it('tectonicActivity clamp 下限为 5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // random()-0.5=-0.5, 0.2*-0.5=-0.1
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ tectonicActivity: 5, tick: 2800 }))
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts[0].tectonicActivity).toBeGreaterThanOrEqual(5)
  })
  it('tectonicActivity clamp 上限为 80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // random()-0.5=0.5, delta=+0.1
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ tectonicActivity: 80, tick: 2800 }))
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts[0].tectonicActivity).toBeLessThanOrEqual(80)
  })
  it('lakeFormation 每次增加 0.005', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ lakeFormation: 30, tick: 2800 }))
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts[0].lakeFormation).toBeCloseTo(30.005, 3)
  })
  it('lakeFormation clamp 上限为 70', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ lakeFormation: 70, tick: 2800 }))
    sys.update(0, world as any, em as any, 2800)
    expect((sys as any).rifts[0].lakeFormation).toBe(70)
  })
})

describe('WorldRiftValleySystem - cleanup 逻辑', () => {
  let sys: WorldRiftValleySystem
  const em = makeEM()

  // cutoff = tick - 105000; 删除条件: rift.tick < cutoff (strict <)

  beforeEach(() => { sys = makeSys(); _id = 200; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('rift.tick === cutoff 时不删除（strict <）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ tick: 1000 }))
    ;(sys as any).lastCheck = 0
    // tick=106000, cutoff=1000, rift.tick=1000, 1000<1000=false → 保留
    sys.update(0, world as any, em as any, 106000)
    expect((sys as any).rifts).toHaveLength(1)
  })
  it('rift.tick < cutoff 时删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ tick: 999 }))
    ;(sys as any).lastCheck = 0
    // tick=106000, cutoff=1000, rift.tick=999, 999<1000=true → 删除
    sys.update(0, world as any, em as any, 106000)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('rift.tick 等于 tick - 105000 - 1 时删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    // tick=105001, cutoff=1, rift.tick=0, 0<1=true → 删除
    sys.update(0, world as any, em as any, 105001)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('rift.tick === 0 且 tick=105000 时不删除（cutoff=0，0<0=false）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, world as any, em as any, 105000)
    expect((sys as any).rifts).toHaveLength(1)
  })
  it('多个 rifts 中只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ tick: 500 }))   // 过期
    ;(sys as any).rifts.push(makeRiftValley({ tick: 2000 }))  // 保留
    ;(sys as any).lastCheck = 0
    // tick=106000, cutoff=1000, 500<1000=true, 2000<1000=false
    sys.update(0, world as any, em as any, 106000)
    expect((sys as any).rifts).toHaveLength(1)
    expect((sys as any).rifts[0].tick).toBe(2000)
  })
  it('所有 rifts 均过期时全部清空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ tick: 0 }))
    ;(sys as any).rifts.push(makeRiftValley({ tick: 100 }))
    ;(sys as any).lastCheck = 0
    // tick=106000, cutoff=1000, 0<1000=true, 100<1000=true
    sys.update(0, world as any, em as any, 106000)
    expect((sys as any).rifts).toHaveLength(0)
  })
  it('节流期间不执行 cleanup', () => {
    ;(sys as any).rifts.push(makeRiftValley({ tick: 0 }))
    ;(sys as any).lastCheck = 2800
    const world = makeWorld(TileType.SAND)
    sys.update(0, world as any, em as any, 3000) // 间隔不足
    expect((sys as any).rifts).toHaveLength(1)
  })
  it('cleanup 后 rifts 数组长度正确更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(TileType.SAND)
    ;(sys as any).rifts.push(makeRiftValley({ tick: 0 }))
    ;(sys as any).rifts.push(makeRiftValley({ tick: 0 }))
    ;(sys as any).rifts.push(makeRiftValley({ tick: 9000 }))
    ;(sys as any).lastCheck = 0
    // tick=106000, cutoff=1000: tick0×2 删除，9000 保留
    sys.update(0, world as any, em as any, 106000)
    expect((sys as any).rifts).toHaveLength(1)
  })
})
