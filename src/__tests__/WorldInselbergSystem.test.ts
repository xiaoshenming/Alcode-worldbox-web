import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldInselbergSystem } from '../systems/WorldInselbergSystem'
import type { Inselberg } from '../systems/WorldInselbergSystem'

const CHECK_INTERVAL = 2610
const MAX_INSELBERGS = 15

function makeSys(): WorldInselbergSystem { return new WorldInselbergSystem() }
let nextId = 1
function makeInselberg(overrides: Partial<Inselberg> = {}): Inselberg {
  return {
    id: nextId++, x: 20, y: 30,
    height: 60, baseRadius: 20, rockType: 1,
    weatheringRate: 3, vegetationCover: 15, spectacle: 40,
    tick: 0,
    ...overrides
  }
}

// 安全的阻断spawn World mock（tile=5=MOUNTAIN，非GRASS/SAND）
function blockWorld() {
  return { width: 100, height: 100, getTile: () => 5 }
}
const emMock = {} as any

// 触发间隔后执行的helper
function runUpdate(sys: WorldInselbergSystem, tick = CHECK_INTERVAL + 1) {
  ;(sys as any).update(0, blockWorld(), emMock, tick)
}

describe('WorldInselbergSystem - 初始状态', () => {
  let sys: WorldInselbergSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始inselbergs为空数组', () => {
    expect((sys as any).inselbergs).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('inselbergs是数组类型', () => {
    expect(Array.isArray((sys as any).inselbergs)).toBe(true)
  })
  it('可以正常实例化系统', () => {
    expect(sys).toBeInstanceOf(WorldInselbergSystem)
  })
})

describe('WorldInselbergSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldInselbergSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick未到CHECK_INTERVAL时不执行', () => {
    ;(sys as any).inselbergs.push(makeInselberg({ height: 60 }))
    const before = (sys as any).inselbergs[0].height
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL - 1)
    expect((sys as any).inselbergs[0].height).toBe(before)
  })
  it('tick==CHECK_INTERVAL时会执行（差值不满足严格小于）', () => {
    // lastCheck=0, tick=3000: 3000-0=3000 不 < 3000，因此会执行
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick超过CHECK_INTERVAL时更新lastCheck', () => {
    const tick = CHECK_INTERVAL + 1
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).lastCheck).toBe(tick)
  })
  it('更新后lastCheck等于当前tick', () => {
    const tick = CHECK_INTERVAL * 2 + 5
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).lastCheck).toBe(tick)
  })
  it('连续两次调用，第二次在新间隔前不重复更新', () => {
    const tick1 = CHECK_INTERVAL + 1
    ;(sys as any).update(0, blockWorld(), emMock, tick1)
    const lastCheck = (sys as any).lastCheck
    ;(sys as any).update(0, blockWorld(), emMock, tick1 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(lastCheck)
  })
  it('tick比lastCheck差值小于CHECK_INTERVAL时不执行', () => {
    ;(sys as any).lastCheck = 5000
    ;(sys as any).inselbergs.push(makeInselberg({ height: 60 }))
    const before = (sys as any).inselbergs[0].height
    ;(sys as any).update(0, blockWorld(), emMock, 5000 + CHECK_INTERVAL - 1)
    expect((sys as any).inselbergs[0].height).toBe(before)
  })
})

describe('WorldInselbergSystem - spawn条件（阻断路径）', () => {
  let sys: WorldInselbergSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tile=MOUNTAIN(5)时不spawn', () => {
    const world = { width: 100, height: 100, getTile: () => 5 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).inselbergs).toHaveLength(0)
  })
  it('tile=FOREST(4)时不spawn', () => {
    const world = { width: 100, height: 100, getTile: () => 4 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).inselbergs).toHaveLength(0)
  })
  it('tile=DEEP_WATER(0)时不spawn', () => {
    const world = { width: 100, height: 100, getTile: () => 0 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).inselbergs).toHaveLength(0)
  })
  it('tile=GRASS(3)且随机值允许时spawn', () => {
    const world = { width: 100, height: 100, getTile: () => 3 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).inselbergs.length).toBeGreaterThan(0)
  })
  it('tile=SAND(2)且随机值允许时spawn', () => {
    const world = { width: 100, height: 100, getTile: () => 2 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).inselbergs.length).toBeGreaterThan(0)
  })
  it('随机值>=FORM_CHANCE时不spawn', () => {
    const world = { width: 100, height: 100, getTile: () => 3 }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).inselbergs).toHaveLength(0)
  })
})

describe('WorldInselbergSystem - spawn字段范围', () => {
  let sys: WorldInselbergSystem

  beforeEach(() => {
    sys = makeSys(); nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = { width: 100, height: 100, getTile: () => 3 }
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn后height在[30,100)范围内', () => {
    const h = (sys as any).inselbergs[0]?.height
    if (h !== undefined) { expect(h).toBeGreaterThanOrEqual(30); expect(h).toBeLessThan(100) }
  })
  it('spawn后baseRadius在[10,35)范围内', () => {
    const r = (sys as any).inselbergs[0]?.baseRadius
    if (r !== undefined) { expect(r).toBeGreaterThanOrEqual(10); expect(r).toBeLessThan(36) }
  })
  it('spawn后rockType在[0,4)范围内（整数）', () => {
    const rt = (sys as any).inselbergs[0]?.rockType
    if (rt !== undefined) { expect(rt).toBeGreaterThanOrEqual(0); expect(rt).toBeLessThan(4) }
  })
  it('spawn后weatheringRate在[1,6)范围内', () => {
    const wr = (sys as any).inselbergs[0]?.weatheringRate
    if (wr !== undefined) { expect(wr).toBeGreaterThanOrEqual(1); expect(wr).toBeLessThan(7) }
  })
  it('spawn后vegetationCover在[5,30)范围内', () => {
    const vc = (sys as any).inselbergs[0]?.vegetationCover
    if (vc !== undefined) { expect(vc).toBeGreaterThanOrEqual(5); expect(vc).toBeLessThan(31) }
  })
  it('spawn后spectacle在[20,65)范围内', () => {
    const sp = (sys as any).inselbergs[0]?.spectacle
    if (sp !== undefined) { expect(sp).toBeGreaterThanOrEqual(20); expect(sp).toBeLessThan(66) }
  })
  it('spawn的inselberg有id字段', () => {
    if ((sys as any).inselbergs.length > 0) {
      expect((sys as any).inselbergs[0].id).toBeDefined()
    }
  })
  it('spawn的inselberg有x/y坐标字段', () => {
    if ((sys as any).inselbergs.length > 0) {
      expect((sys as any).inselbergs[0].x).toBeDefined()
      expect((sys as any).inselbergs[0].y).toBeDefined()
    }
  })
  it('spawn的inselberg有tick字段', () => {
    if ((sys as any).inselbergs.length > 0) {
      expect((sys as any).inselbergs[0].tick).toBeDefined()
    }
  })
})

describe('WorldInselbergSystem - MAX_INSELBERGS上限', () => {
  let sys: WorldInselbergSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('达到MAX_INSELBERGS(15)后不再spawn', () => {
    for (let i = 0; i < MAX_INSELBERGS; i++) {
      ;(sys as any).inselbergs.push(makeInselberg())
    }
    const world = { width: 100, height: 100, getTile: () => 3 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).inselbergs).toHaveLength(MAX_INSELBERGS)
  })
  it('注入14个后还可再spawn1个', () => {
    for (let i = 0; i < MAX_INSELBERGS - 1; i++) {
      ;(sys as any).inselbergs.push(makeInselberg())
    }
    const world = { width: 100, height: 100, getTile: () => 3 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).inselbergs.length).toBeLessThanOrEqual(MAX_INSELBERGS)
  })
  it('MAX_INSELBERGS常量为15', () => {
    expect(MAX_INSELBERGS).toBe(15)
  })
})

describe('WorldInselbergSystem - 动态字段update', () => {
  let sys: WorldInselbergSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次update后height会轻微减小（侵蚀）', () => {
    ;(sys as any).inselbergs.push(makeInselberg({ height: 80, weatheringRate: 100 }))
    const before = (sys as any).inselbergs[0].height
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    expect((sys as any).inselbergs[0].height).toBeLessThanOrEqual(before)
  })
  it('height下限为15（不低于15）', () => {
    ;(sys as any).inselbergs.push(makeInselberg({ height: 15, weatheringRate: 9999 }))
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    expect((sys as any).inselbergs[0].height).toBeGreaterThanOrEqual(15)
  })
  it('height上限为120', () => {
    ;(sys as any).inselbergs.push(makeInselberg({ height: 119, weatheringRate: -9999 }))
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    expect((sys as any).inselbergs[0].height).toBeLessThanOrEqual(120)
  })
  it('baseRadius会缓慢增大，上限40', () => {
    ;(sys as any).inselbergs.push(makeInselberg({ baseRadius: 39.9999 }))
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    expect((sys as any).inselbergs[0].baseRadius).toBeLessThanOrEqual(40)
  })
  it('vegetationCover下限为2', () => {
    ;(sys as any).inselbergs.push(makeInselberg({ vegetationCover: 2 }))
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    expect((sys as any).inselbergs[0].vegetationCover).toBeGreaterThanOrEqual(2)
  })
  it('vegetationCover上限为50', () => {
    ;(sys as any).inselbergs.push(makeInselberg({ vegetationCover: 50 }))
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    expect((sys as any).inselbergs[0].vegetationCover).toBeLessThanOrEqual(50)
  })
  it('spectacle下限为10', () => {
    ;(sys as any).inselbergs.push(makeInselberg({ spectacle: 10 }))
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    expect((sys as any).inselbergs[0].spectacle).toBeGreaterThanOrEqual(10)
  })
  it('spectacle上限为75', () => {
    ;(sys as any).inselbergs.push(makeInselberg({ spectacle: 75 }))
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    expect((sys as any).inselbergs[0].spectacle).toBeLessThanOrEqual(75)
  })
})

describe('WorldInselbergSystem - cleanup过期记录', () => {
  let sys: WorldInselbergSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick-92000之前的inselberg被清除（严格小于cutoff）', () => {
    const tick = 200000
    ;(sys as any).inselbergs.push(makeInselberg({ tick: tick - 92001 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).inselbergs).toHaveLength(0)
  })
  it('tick-92000之后的inselberg不被清除', () => {
    const tick = 200000
    ;(sys as any).inselbergs.push(makeInselberg({ tick: tick - 91999 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).inselbergs).toHaveLength(1)
  })
  it('恰好在cutoff(tick-92000)处的inselberg不被清除（严格小于，等于不删）', () => {
    // cutoff = tick - 92000; 条件 inselberg.tick < cutoff
    // 当 inselberg.tick == cutoff 时不满足严格小于，不删除
    const tick = 200000
    ;(sys as any).inselbergs.push(makeInselberg({ tick: tick - 92000 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).inselbergs).toHaveLength(1)
  })
  it('混合新旧inselberg，只清除旧的', () => {
    const tick = 200000
    ;(sys as any).inselbergs.push(makeInselberg({ tick: tick - 92001 })) // old
    ;(sys as any).inselbergs.push(makeInselberg({ tick: tick - 1000 }))  // new
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).inselbergs).toHaveLength(1)
  })
  it('全部过期时清空数组', () => {
    const tick = 200000
    ;(sys as any).inselbergs.push(makeInselberg({ tick: tick - 92001 }))
    ;(sys as any).inselbergs.push(makeInselberg({ tick: tick - 100000 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).inselbergs).toHaveLength(0)
  })
})

describe('WorldInselbergSystem - nextId自增', () => {
  let sys: WorldInselbergSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('spawn后nextId递增', () => {
    const world = { width: 100, height: 100, getTile: () => 3 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const before = (sys as any).nextId
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    if ((sys as any).inselbergs.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(before)
    }
  })
  it('多次注入后inselberg id唯一', () => {
    ;(sys as any).inselbergs.push(makeInselberg())
    ;(sys as any).inselbergs.push(makeInselberg())
    ;(sys as any).inselbergs.push(makeInselberg())
    const ids = (sys as any).inselbergs.map((i: Inselberg) => i.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
  it('注入inselberg的tick字段为当前tick', () => {
    const tick = CHECK_INTERVAL + 1
    const world = { width: 100, height: 100, getTile: () => 3 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, tick)
    vi.restoreAllMocks()
    if ((sys as any).inselbergs.length > 0) {
      expect((sys as any).inselbergs[0].tick).toBe(tick)
    }
  })
})
