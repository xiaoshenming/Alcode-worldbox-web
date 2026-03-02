import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRockPedestalSystem } from '../systems/WorldRockPedestalSystem'
import type { RockPedestal } from '../systems/WorldRockPedestalSystem'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5, SNOW=6, LAVA=7
const MOUNTAIN = 5
const SAND = 2
const GRASS = 3

function makeSys(): WorldRockPedestalSystem { return new WorldRockPedestalSystem() }
let nextId = 1

function makePedestal(overrides: Partial<RockPedestal> = {}): RockPedestal {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    capDiameter: 8,
    stemHeight: 5,
    stemWidth: 2,
    balanceRisk: 30,
    erosionRate: 8,
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

// CHECK_INTERVAL = 2580, FORM_CHANCE = 0.0014, MAX_PEDESTALS = 15, cutoff = tick - 88000

describe('WorldRockPedestalSystem - 初始状态', () => {
  let sys: WorldRockPedestalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始pedestals为空数组', () => {
    expect((sys as any).pedestals).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入一条记录后长度为1', () => {
    ;(sys as any).pedestals.push(makePedestal())
    expect((sys as any).pedestals).toHaveLength(1)
  })
  it('pedestals是同一个引用', () => {
    const p = (sys as any).pedestals
    expect(p).toBe((sys as any).pedestals)
  })
  it('岩石台座字段值正确', () => {
    const ped = makePedestal()
    ;(sys as any).pedestals.push(ped)
    const p = (sys as any).pedestals[0]
    expect(p.capDiameter).toBe(8)
    expect(p.stemHeight).toBe(5)
    expect(p.stemWidth).toBe(2)
    expect(p.balanceRisk).toBe(30)
    expect(p.erosionRate).toBe(8)
    expect(p.spectacle).toBe(40)
  })
  it('注入多条记录后长度正确', () => {
    for (let i = 0; i < 5; i++) (sys as any).pedestals.push(makePedestal())
    expect((sys as any).pedestals).toHaveLength(5)
  })
  it('不传tick=0时update不执行（节流）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 0)
    expect((sys as any).pedestals).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('WorldRockPedestalSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldRockPedestalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=2579时不触发（2579-0<2580）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 2579)
    expect((sys as any).pedestals).toHaveLength(0)
  })
  it('tick=2580时触发（2580-0不<2580）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 2580)
    expect((sys as any).lastCheck).toBe(2580)
  })
  it('触发后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('第一次触发后第二次需要再等CHECK_INTERVAL', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 2580)
    const lastCheck = (sys as any).lastCheck
    sys.update(1, makeWorld(), makeEm(), 2580 + 2579)
    expect((sys as any).lastCheck).toBe(lastCheck)
  })
  it('第二次间隔足够时再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 2580)
    sys.update(1, makeWorld(), makeEm(), 2580 + 2580)
    expect((sys as any).lastCheck).toBe(2580 + 2580)
  })
  it('tick=0时不触发（0-0=0<2580）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).pedestals).toHaveLength(0)
  })
  it('tick=10000时一次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 10000)
    expect((sys as any).lastCheck).toBe(10000)
  })
  it('节流期间pedestals不增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 2580) // 第一次触发
    const lenBefore = (sys as any).pedestals.length
    sys.update(1, makeWorld(), makeEm(), 2580 + 100) // 不触发
    expect((sys as any).pedestals.length).toBe(lenBefore)
  })
})

describe('WorldRockPedestalSystem - spawn条件', () => {
  let sys: WorldRockPedestalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('MOUNTAIN地形时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2580)
    expect((sys as any).pedestals.length).toBeGreaterThanOrEqual(1)
  })
  it('SAND地形时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(SAND), makeEm(), 2580)
    expect((sys as any).pedestals.length).toBeGreaterThanOrEqual(1)
  })
  it('GRASS地形时不spawn（非MOUNTAIN/SAND）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), 2580)
    expect((sys as any).pedestals).toHaveLength(0)
  })
  it('DEEP_WATER(0)地形时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), makeEm(), 2580)
    expect((sys as any).pedestals).toHaveLength(0)
  })
  it('LAVA(7)地形时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), makeEm(), 2580)
    expect((sys as any).pedestals).toHaveLength(0)
  })
  it('Math.random>=FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2580)
    expect((sys as any).pedestals).toHaveLength(0)
  })
  it('达到MAX_PEDESTALS(15)上限时不再spawn', () => {
    for (let i = 0; i < 15; i++) (sys as any).pedestals.push(makePedestal())
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2580)
    expect((sys as any).pedestals.length).toBe(15)
  })
  it('pedestals=14时（低于MAX）可以再spawn', () => {
    for (let i = 0; i < 14; i++) (sys as any).pedestals.push(makePedestal({ tick: 2580 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2580)
    expect((sys as any).pedestals.length).toBeGreaterThanOrEqual(15)
  })
  it('spawn时tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 9000)
    const spawned = (sys as any).pedestals.find((p: RockPedestal) => p.tick === 9000)
    expect(spawned).toBeDefined()
  })
})

describe('WorldRockPedestalSystem - spawn字段范围', () => {
  let sys: WorldRockPedestalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(randomVal: number) {
    vi.spyOn(Math, 'random').mockReturnValue(randomVal)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2580)
    return (sys as any).pedestals[0] as RockPedestal
  }

  it('capDiameter范围[3,15)', () => {
    const p = spawnOne(0)
    // 初始: 3 + r*12, update不改capDiameter
    expect(p.capDiameter).toBeGreaterThanOrEqual(3)
    expect(p.capDiameter).toBeLessThan(16)
  })
  it('stemHeight范围[2,12)', () => {
    const p = spawnOne(0)
    expect(p.stemHeight).toBeGreaterThanOrEqual(2)
    expect(p.stemHeight).toBeLessThan(13)
  })
  it('stemWidth初始>0.5（经过一次update仍>0.5）', () => {
    const p = spawnOne(0)
    expect(p.stemWidth).toBeGreaterThan(0.4)
  })
  it('balanceRisk初始[5,35]经过一次update仍<80', () => {
    const p = spawnOne(0)
    expect(p.balanceRisk).toBeGreaterThanOrEqual(5)
    expect(p.balanceRisk).toBeLessThanOrEqual(80)
  })
  it('erosionRate初始[3,18)经过一次update仍在[1,25]', () => {
    const p = spawnOne(0)
    expect(p.erosionRate).toBeGreaterThanOrEqual(1)
    expect(p.erosionRate).toBeLessThanOrEqual(25)
  })
  it('spectacle经过一次update仍在[8,60]', () => {
    const p = spawnOne(0)
    expect(p.spectacle).toBeGreaterThanOrEqual(8)
    expect(p.spectacle).toBeLessThanOrEqual(60)
  })
  it('spawn id从1开始递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2580)
    const id1 = (sys as any).pedestals[0].id
    expect(id1).toBeGreaterThanOrEqual(1)
  })
  it('x坐标在[10, world.width-10)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2580)
    const p = (sys as any).pedestals[0] as RockPedestal
    expect(p.x).toBeGreaterThanOrEqual(10)
    expect(p.x).toBeLessThan(200 - 10)
  })
  it('y坐标在[10, world.height-10)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2580)
    const p = (sys as any).pedestals[0] as RockPedestal
    expect(p.y).toBeGreaterThanOrEqual(10)
    expect(p.y).toBeLessThan(200 - 10)
  })
})

describe('WorldRockPedestalSystem - update数值逻辑', () => {
  let sys: WorldRockPedestalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('stemWidth每次update减少0.00001', () => {
    const ped = makePedestal({ stemWidth: 3, tick: 2580 })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEm(), 2580)
    expect(ped.stemWidth).toBeCloseTo(3 - 0.00001, 6)
  })
  it('stemWidth不低于0.5（min guard）', () => {
    const ped = makePedestal({ stemWidth: 0.5, tick: 2580 })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEm(), 2580)
    expect(ped.stemWidth).toBeGreaterThanOrEqual(0.5)
  })
  it('balanceRisk每次update增加0.00003', () => {
    const ped = makePedestal({ balanceRisk: 30, tick: 2580 })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEm(), 2580)
    expect(ped.balanceRisk).toBeCloseTo(30 + 0.00003, 6)
  })
  it('balanceRisk不超过80（max guard）', () => {
    const ped = makePedestal({ balanceRisk: 80, tick: 2580 })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEm(), 2580)
    expect(ped.balanceRisk).toBeLessThanOrEqual(80)
  })
  it('erosionRate不超过25（max guard）', () => {
    const ped = makePedestal({ erosionRate: 25, tick: 2580 })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(GRASS), makeEm(), 2580)
    expect(ped.erosionRate).toBeLessThanOrEqual(25)
  })
  it('erosionRate不低于1（min guard）', () => {
    const ped = makePedestal({ erosionRate: 1, tick: 2580 })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), 2580)
    expect(ped.erosionRate).toBeGreaterThanOrEqual(1)
  })
  it('spectacle不超过60（max guard）', () => {
    const ped = makePedestal({ spectacle: 60, tick: 2580 })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(GRASS), makeEm(), 2580)
    expect(ped.spectacle).toBeLessThanOrEqual(60)
  })
  it('spectacle不低于8（min guard）', () => {
    const ped = makePedestal({ spectacle: 8, tick: 2580 })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), 2580)
    expect(ped.spectacle).toBeGreaterThanOrEqual(8)
  })
})

describe('WorldRockPedestalSystem - cleanup逻辑', () => {
  let sys: WorldRockPedestalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // cutoff = tick - 88000; 删除条件: pedestal.tick < cutoff（strict less）

  it('tick刚好等于cutoff时保留（strict <）', () => {
    const tick = 100000
    const cutoff = tick - 88000 // = 12000
    const ped = makePedestal({ tick: cutoff })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), tick)
    expect((sys as any).pedestals).toHaveLength(1)
  })
  it('tick比cutoff小1时删除', () => {
    const tick = 100000
    const cutoff = tick - 88000
    const ped = makePedestal({ tick: cutoff - 1 })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), tick)
    expect((sys as any).pedestals).toHaveLength(0)
  })
  it('tick远小于cutoff时删除', () => {
    const ped = makePedestal({ tick: 0 })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), 200000)
    expect((sys as any).pedestals).toHaveLength(0)
  })
  it('新pedestals不会被cleanup删除', () => {
    const tick = 100000
    const ped = makePedestal({ tick: tick })
    ;(sys as any).pedestals.push(ped)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), tick)
    expect((sys as any).pedestals).toHaveLength(1)
  })
  it('混合新旧：旧的删除，新的保留', () => {
    const tick = 200000
    const oldPed = makePedestal({ tick: 0 })
    const newPed = makePedestal({ tick: tick })
    ;(sys as any).pedestals.push(oldPed, newPed)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), tick)
    expect((sys as any).pedestals).toHaveLength(1)
    expect((sys as any).pedestals[0].tick).toBe(tick)
  })
  it('cleanup后pedestals数组长度正确', () => {
    const tick = 200000
    for (let i = 0; i < 5; i++) (sys as any).pedestals.push(makePedestal({ tick: 0 }))
    for (let i = 0; i < 3; i++) (sys as any).pedestals.push(makePedestal({ tick: tick }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), tick)
    expect((sys as any).pedestals).toHaveLength(3)
  })
  it('空数组cleanup不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    expect(() => sys.update(1, makeWorld(GRASS), makeEm(), 200000)).not.toThrow()
  })
  it('cleanup与spawn同帧：新pedestal不被删', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2580)
    expect((sys as any).pedestals.length).toBeGreaterThanOrEqual(1)
    expect((sys as any).pedestals.every((p: RockPedestal) => p.tick === 2580)).toBe(true)
  })
})
