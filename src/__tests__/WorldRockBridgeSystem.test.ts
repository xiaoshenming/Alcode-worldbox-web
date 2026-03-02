import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRockBridgeSystem } from '../systems/WorldRockBridgeSystem'
import type { RockBridge } from '../systems/WorldRockBridgeSystem'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5, SNOW=6, LAVA=7
const MOUNTAIN = 5
const GRASS = 3
const SAND = 2

function makeSys(): WorldRockBridgeSystem { return new WorldRockBridgeSystem() }
let nextId = 1

function makeBridge(overrides: Partial<RockBridge> = {}): RockBridge {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    span: 15,
    width: 4,
    thickness: 3,
    loadCapacity: 50,
    erosionRate: 6,
    spectacle: 40,
    tick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number = MOUNTAIN, w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: vi.fn().mockReturnValue(tile),
  } as any
}

function makeEm() { return {} as any }

// CHECK_INTERVAL = 2610, FORM_CHANCE = 0.0012, MAX_BRIDGES = 12, cutoff = tick - 93000

describe('WorldRockBridgeSystem - 初始状态', () => {
  let sys: WorldRockBridgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始bridges为空数组', () => {
    expect((sys as any).bridges).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入一条记录后长度为1', () => {
    ;(sys as any).bridges.push(makeBridge())
    expect((sys as any).bridges).toHaveLength(1)
  })
  it('bridges是同一个引用', () => {
    const b = (sys as any).bridges
    expect(b).toBe((sys as any).bridges)
  })
  it('天然石桥字段值正确', () => {
    const bridge = makeBridge()
    ;(sys as any).bridges.push(bridge)
    const b = (sys as any).bridges[0]
    expect(b.span).toBe(15)
    expect(b.width).toBe(4)
    expect(b.thickness).toBe(3)
    expect(b.loadCapacity).toBe(50)
    expect(b.erosionRate).toBe(6)
    expect(b.spectacle).toBe(40)
  })
  it('注入多条记录后长度正确', () => {
    for (let i = 0; i < 5; i++) (sys as any).bridges.push(makeBridge())
    expect((sys as any).bridges).toHaveLength(5)
  })
  it('不传tick=0时update不执行（节流）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 0)
    expect((sys as any).bridges).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('WorldRockBridgeSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldRockBridgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=2609时不触发（2609-0<2610）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 2609)
    expect((sys as any).bridges).toHaveLength(0)
  })
  it('tick=2610时触发（2610-0不<2610）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 2610)
    expect((sys as any).lastCheck).toBe(2610)
  })
  it('触发后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('第一次触发后第二次需要再等CHECK_INTERVAL', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 2610)
    const lastCheck = (sys as any).lastCheck
    sys.update(1, makeWorld(), makeEm(), 2610 + 2609)
    expect((sys as any).lastCheck).toBe(lastCheck)
  })
  it('第二次间隔足够时再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 2610)
    sys.update(1, makeWorld(), makeEm(), 2610 + 2610)
    expect((sys as any).lastCheck).toBe(2610 + 2610)
  })
  it('tick=0时不触发（0-0=0<2610）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).bridges).toHaveLength(0)
  })
  it('tick=10000时一次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 10000)
    expect((sys as any).lastCheck).toBe(10000)
  })
  it('节流期间bridges不增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 2610) // 第一次触发
    const lenBefore = (sys as any).bridges.length
    sys.update(1, makeWorld(), makeEm(), 2610 + 100) // 不触发
    expect((sys as any).bridges.length).toBe(lenBefore)
  })
})

describe('WorldRockBridgeSystem - spawn条件', () => {
  let sys: WorldRockBridgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('MOUNTAIN地形时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    expect((sys as any).bridges.length).toBeGreaterThanOrEqual(1)
  })
  it('GRASS地形时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), 2610)
    expect((sys as any).bridges.length).toBeGreaterThanOrEqual(1)
  })
  it('SAND地形时不spawn（非MOUNTAIN/GRASS）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(SAND), makeEm(), 2610)
    expect((sys as any).bridges).toHaveLength(0)
  })
  it('DEEP_WATER(0)地形时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), makeEm(), 2610)
    expect((sys as any).bridges).toHaveLength(0)
  })
  it('LAVA(7)地形时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), makeEm(), 2610)
    expect((sys as any).bridges).toHaveLength(0)
  })
  it('Math.random>=FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    expect((sys as any).bridges).toHaveLength(0)
  })
  it('达到MAX_BRIDGES(12)上限时不再spawn', () => {
    for (let i = 0; i < 12; i++) (sys as any).bridges.push(makeBridge())
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    expect((sys as any).bridges.length).toBe(12)
  })
  it('bridges=11时（低于MAX）可以再spawn', () => {
    for (let i = 0; i < 11; i++) (sys as any).bridges.push(makeBridge({ tick: 2610 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    expect((sys as any).bridges.length).toBeGreaterThanOrEqual(12)
  })
  it('spawn时tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 7000)
    const spawned = (sys as any).bridges.find((b: RockBridge) => b.tick === 7000)
    expect(spawned).toBeDefined()
  })
})

describe('WorldRockBridgeSystem - spawn字段范围', () => {
  let sys: WorldRockBridgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(randomVal: number) {
    vi.spyOn(Math, 'random').mockReturnValue(randomVal)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    return (sys as any).bridges[0] as RockBridge
  }

  it('span范围[8,33)', () => {
    const b = spawnOne(0)
    // 初始: 8 + r*25, r=0 => 8; update不改span
    expect(b.span).toBeGreaterThanOrEqual(8)
    expect(b.span).toBeLessThan(34)
  })
  it('width范围[2,10)', () => {
    const b = spawnOne(0)
    expect(b.width).toBeGreaterThanOrEqual(2)
    expect(b.width).toBeLessThan(11)
  })
  it('thickness初始>0.5（经过update仍>0.5）', () => {
    const b = spawnOne(0)
    expect(b.thickness).toBeGreaterThan(0.4)
  })
  it('loadCapacity初始[30,80]经过一次update仍>=10', () => {
    const b = spawnOne(0)
    expect(b.loadCapacity).toBeGreaterThanOrEqual(10)
    expect(b.loadCapacity).toBeLessThanOrEqual(80)
  })
  it('erosionRate初始[2,14)经过一次update仍在[1,20]', () => {
    const b = spawnOne(0)
    expect(b.erosionRate).toBeGreaterThanOrEqual(1)
    expect(b.erosionRate).toBeLessThanOrEqual(20)
  })
  it('spectacle经过一次update仍在[10,70]', () => {
    const b = spawnOne(0)
    expect(b.spectacle).toBeGreaterThanOrEqual(10)
    expect(b.spectacle).toBeLessThanOrEqual(70)
  })
  it('spawn id从1开始递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    const id1 = (sys as any).bridges[0].id
    expect(id1).toBeGreaterThanOrEqual(1)
  })
  it('x坐标在[10, world.width-10)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    const b = (sys as any).bridges[0] as RockBridge
    expect(b.x).toBeGreaterThanOrEqual(10)
    expect(b.x).toBeLessThan(200 - 10)
  })
  it('y坐标在[10, world.height-10)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    const b = (sys as any).bridges[0] as RockBridge
    expect(b.y).toBeGreaterThanOrEqual(10)
    expect(b.y).toBeLessThan(200 - 10)
  })
})

describe('WorldRockBridgeSystem - update数值逻辑', () => {
  let sys: WorldRockBridgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('thickness每次update减少0.000007', () => {
    const bridge = makeBridge({ thickness: 5, tick: 2610 })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), 2610)
    expect(bridge.thickness).toBeCloseTo(5 - 0.000007, 6)
  })
  it('thickness不低于0.5（min guard）', () => {
    const bridge = makeBridge({ thickness: 0.5, tick: 2610 })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), 2610)
    expect(bridge.thickness).toBeGreaterThanOrEqual(0.5)
  })
  it('loadCapacity每次update减少0.00002', () => {
    const bridge = makeBridge({ loadCapacity: 50, tick: 2610 })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), 2610)
    expect(bridge.loadCapacity).toBeCloseTo(50 - 0.00002, 6)
  })
  it('loadCapacity不低于10（min guard）', () => {
    const bridge = makeBridge({ loadCapacity: 10, tick: 2610 })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), 2610)
    expect(bridge.loadCapacity).toBeGreaterThanOrEqual(10)
  })
  it('erosionRate不超过20（max guard）', () => {
    const bridge = makeBridge({ erosionRate: 20, tick: 2610 })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(SAND), makeEm(), 2610)
    expect(bridge.erosionRate).toBeLessThanOrEqual(20)
  })
  it('erosionRate不低于1（min guard）', () => {
    const bridge = makeBridge({ erosionRate: 1, tick: 2610 })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(SAND), makeEm(), 2610)
    expect(bridge.erosionRate).toBeGreaterThanOrEqual(1)
  })
  it('spectacle不超过70（max guard）', () => {
    const bridge = makeBridge({ spectacle: 70, tick: 2610 })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(SAND), makeEm(), 2610)
    expect(bridge.spectacle).toBeLessThanOrEqual(70)
  })
  it('spectacle不低于10（min guard）', () => {
    const bridge = makeBridge({ spectacle: 10, tick: 2610 })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(SAND), makeEm(), 2610)
    expect(bridge.spectacle).toBeGreaterThanOrEqual(10)
  })
})

describe('WorldRockBridgeSystem - cleanup逻辑', () => {
  let sys: WorldRockBridgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // cutoff = tick - 93000; 删除条件: bridge.tick < cutoff（strict less）

  it('tick刚好等于cutoff时保留（strict <）', () => {
    const tick = 100000
    const cutoff = tick - 93000 // = 7000
    const bridge = makeBridge({ tick: cutoff })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).bridges).toHaveLength(1)
  })
  it('tick比cutoff小1时删除', () => {
    const tick = 100000
    const cutoff = tick - 93000
    const bridge = makeBridge({ tick: cutoff - 1 })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).bridges).toHaveLength(0)
  })
  it('tick远小于cutoff时删除', () => {
    const bridge = makeBridge({ tick: 0 })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(SAND), makeEm(), 200000)
    expect((sys as any).bridges).toHaveLength(0)
  })
  it('新bridges不会被cleanup删除', () => {
    const tick = 100000
    const bridge = makeBridge({ tick: tick })
    ;(sys as any).bridges.push(bridge)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).bridges).toHaveLength(1)
  })
  it('混合新旧：旧的删除，新的保留', () => {
    const tick = 200000
    const oldBridge = makeBridge({ tick: 0 })
    const newBridge = makeBridge({ tick: tick })
    ;(sys as any).bridges.push(oldBridge, newBridge)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).bridges).toHaveLength(1)
    expect((sys as any).bridges[0].tick).toBe(tick)
  })
  it('cleanup后bridges数组长度正确', () => {
    const tick = 200000
    for (let i = 0; i < 5; i++) (sys as any).bridges.push(makeBridge({ tick: 0 }))
    for (let i = 0; i < 3; i++) (sys as any).bridges.push(makeBridge({ tick: tick }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).bridges).toHaveLength(3)
  })
  it('空数组cleanup不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    expect(() => sys.update(1, makeWorld(SAND), makeEm(), 200000)).not.toThrow()
  })
  it('cleanup与spawn同帧：新bridge不被删', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    expect((sys as any).bridges.length).toBeGreaterThanOrEqual(1)
    expect((sys as any).bridges.every((b: RockBridge) => b.tick === 2610)).toBe(true)
  })
})
