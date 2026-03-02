import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRockArch2System } from '../systems/WorldRockArch2System'
import type { RockArch2 } from '../systems/WorldRockArch2System'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5, SNOW=6, LAVA=7
const MOUNTAIN = 5
const SAND = 2
const GRASS = 3

function makeSys(): WorldRockArch2System { return new WorldRockArch2System() }
let nextId = 1

function makeArch(overrides: Partial<RockArch2> = {}): RockArch2 {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    spanWidth: 15,
    archHeight: 10,
    thickness: 3,
    stability: 80,
    erosionRate: 0.002,
    spectacle: 50,
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

// CHECK_INTERVAL = 2610, FORM_CHANCE = 0.0012, MAX_ARCHES = 13, cutoff = tick - 91000

describe('WorldRockArch2System - 初始状态', () => {
  let sys: WorldRockArch2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始arches为空数组', () => {
    expect((sys as any).arches).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入一条记录后长度为1', () => {
    ;(sys as any).arches.push(makeArch())
    expect((sys as any).arches).toHaveLength(1)
  })
  it('arches是同一个引用', () => {
    const a = (sys as any).arches
    expect(a).toBe((sys as any).arches)
  })
  it('岩石拱字段值正确', () => {
    const arch = makeArch()
    ;(sys as any).arches.push(arch)
    const a = (sys as any).arches[0]
    expect(a.spanWidth).toBe(15)
    expect(a.archHeight).toBe(10)
    expect(a.thickness).toBe(3)
    expect(a.stability).toBe(80)
    expect(a.erosionRate).toBe(0.002)
    expect(a.spectacle).toBe(50)
  })
  it('注入多条记录后长度正确', () => {
    for (let i = 0; i < 5; i++) (sys as any).arches.push(makeArch())
    expect((sys as any).arches).toHaveLength(5)
  })
  it('不传tick=0时update不执行（节流）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 0)
    expect((sys as any).arches).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('WorldRockArch2System - CHECK_INTERVAL节流', () => {
  let sys: WorldRockArch2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=2609时不触发（2609-0<2610）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 2609)
    expect((sys as any).arches).toHaveLength(0)
  })
  it('tick=2610时触发（2610-0不<2610）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
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
    // 仍是lastCheck不变
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
    expect((sys as any).arches).toHaveLength(0)
  })
  it('tick=10000时一次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 10000)
    expect((sys as any).lastCheck).toBe(10000)
  })
  it('节流期间arches不增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 2610) // 第一次触发，设lastCheck=2610
    const lenBefore = (sys as any).arches.length
    sys.update(1, makeWorld(), makeEm(), 2610 + 100) // 不触发
    expect((sys as any).arches.length).toBe(lenBefore)
  })
})

describe('WorldRockArch2System - spawn条件', () => {
  let sys: WorldRockArch2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('MOUNTAIN地形时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    expect((sys as any).arches.length).toBeGreaterThanOrEqual(1)
  })
  it('SAND地形时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(SAND), makeEm(), 2610)
    expect((sys as any).arches.length).toBeGreaterThanOrEqual(1)
  })
  it('GRASS地形时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), 2610)
    expect((sys as any).arches).toHaveLength(0)
  })
  it('DEEP_WATER(0)地形时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), makeEm(), 2610)
    expect((sys as any).arches).toHaveLength(0)
  })
  it('LAVA(7)地形时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), makeEm(), 2610)
    expect((sys as any).arches).toHaveLength(0)
  })
  it('Math.random>=FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    expect((sys as any).arches).toHaveLength(0)
  })
  it('达到MAX_ARCHES(13)上限时不再spawn', () => {
    for (let i = 0; i < 13; i++) (sys as any).arches.push(makeArch())
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    expect((sys as any).arches.length).toBe(13)
  })
  it('arches=12时（低于MAX）可以再spawn', () => {
    for (let i = 0; i < 12; i++) (sys as any).arches.push(makeArch({ tick: 2610 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const cutoff = 2610 - 91000
    // 确保已有arches不会被cleanup删掉（tick=2610 > cutoff）
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    expect((sys as any).arches.length).toBeGreaterThanOrEqual(13)
  })
  it('spawn时tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 5000)
    const spawned = (sys as any).arches.find((a: RockArch2) => a.tick === 5000)
    expect(spawned).toBeDefined()
  })
})

describe('WorldRockArch2System - spawn字段范围', () => {
  let sys: WorldRockArch2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(randomVal: number) {
    vi.spyOn(Math, 'random').mockReturnValue(randomVal)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    // spawn后update立即执行一次，字段已被修改一次
    return (sys as any).arches[0] as RockArch2
  }

  it('spanWidth范围[5,20)', () => {
    const a = spawnOne(0)
    // 初始: 5 + r*15, r=0 => 5; update不改spanWidth
    expect(a.spanWidth).toBeGreaterThanOrEqual(5)
    expect(a.spanWidth).toBeLessThan(21)
  })
  it('archHeight范围[4,16)', () => {
    const a = spawnOne(0)
    expect(a.archHeight).toBeGreaterThanOrEqual(4)
    expect(a.archHeight).toBeLessThan(17)
  })
  it('thickness初始>0（经过一次update仍>0.5）', () => {
    const a = spawnOne(0)
    expect(a.thickness).toBeGreaterThan(0.4)
  })
  it('stability初始范围[45,85]经过一次update仍>=8', () => {
    const a = spawnOne(0)
    expect(a.stability).toBeGreaterThanOrEqual(8)
    expect(a.stability).toBeLessThanOrEqual(85)
  })
  it('erosionRate初始[0.001,0.004)', () => {
    // erosionRate在spawn时设定，update不改变erosionRate
    const a = spawnOne(0)
    expect(a.erosionRate).toBeGreaterThanOrEqual(0.001)
    expect(a.erosionRate).toBeLessThan(0.005)
  })
  it('spectacle经过一次update仍在[10,70]', () => {
    const a = spawnOne(0)
    expect(a.spectacle).toBeGreaterThanOrEqual(10)
    expect(a.spectacle).toBeLessThanOrEqual(70)
  })
  it('spawn id从1开始递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    const id1 = (sys as any).arches[0].id
    expect(id1).toBeGreaterThanOrEqual(1)
  })
  it('x坐标在[10, world.width-10)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    const a = (sys as any).arches[0] as RockArch2
    expect(a.x).toBeGreaterThanOrEqual(10)
    expect(a.x).toBeLessThan(200 - 10)
  })
  it('y坐标在[10, world.height-10)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    const a = (sys as any).arches[0] as RockArch2
    expect(a.y).toBeGreaterThanOrEqual(10)
    expect(a.y).toBeLessThan(200 - 10)
  })
})

describe('WorldRockArch2System - update数值逻辑', () => {
  let sys: WorldRockArch2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('thickness每次update减少erosionRate*0.008', () => {
    const arch = makeArch({ thickness: 5, erosionRate: 0.002, tick: 2610 })
    ;(sys as any).arches.push(arch)
    vi.spyOn(Math, 'random').mockReturnValue(0.47)
    sys.update(1, makeWorld(GRASS), makeEm(), 2610)
    const expected = Math.max(0.5, 5 - 0.002 * 0.008)
    expect(arch.thickness).toBeCloseTo(expected, 5)
  })
  it('thickness不低于0.5（min guard）', () => {
    const arch = makeArch({ thickness: 0.5, erosionRate: 1, tick: 2610 })
    ;(sys as any).arches.push(arch)
    vi.spyOn(Math, 'random').mockReturnValue(0.47)
    sys.update(1, makeWorld(GRASS), makeEm(), 2610)
    expect(arch.thickness).toBeGreaterThanOrEqual(0.5)
  })
  it('stability每次update减少0.00003', () => {
    const arch = makeArch({ stability: 80, tick: 2610 })
    ;(sys as any).arches.push(arch)
    vi.spyOn(Math, 'random').mockReturnValue(0.47)
    sys.update(1, makeWorld(GRASS), makeEm(), 2610)
    expect(arch.stability).toBeCloseTo(80 - 0.00003, 6)
  })
  it('stability不低于8（min guard）', () => {
    const arch = makeArch({ stability: 8, tick: 2610 })
    ;(sys as any).arches.push(arch)
    vi.spyOn(Math, 'random').mockReturnValue(0.47)
    sys.update(1, makeWorld(GRASS), makeEm(), 2610)
    expect(arch.stability).toBeGreaterThanOrEqual(8)
  })
  it('spectacle不超过70（max guard）', () => {
    const arch = makeArch({ spectacle: 70, tick: 2610 })
    ;(sys as any).arches.push(arch)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(GRASS), makeEm(), 2610)
    expect(arch.spectacle).toBeLessThanOrEqual(70)
  })
  it('spectacle不低于10（min guard）', () => {
    const arch = makeArch({ spectacle: 10, tick: 2610 })
    ;(sys as any).arches.push(arch)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), 2610)
    expect(arch.spectacle).toBeGreaterThanOrEqual(10)
  })
  it('多条记录都被update', () => {
    const a1 = makeArch({ thickness: 5, erosionRate: 0.002, tick: 2610 })
    const a2 = makeArch({ thickness: 4, erosionRate: 0.001, tick: 2610 })
    ;(sys as any).arches.push(a1, a2)
    vi.spyOn(Math, 'random').mockReturnValue(0.47)
    sys.update(1, makeWorld(GRASS), makeEm(), 2610)
    expect(a1.thickness).toBeCloseTo(5 - 0.002 * 0.008, 5)
    expect(a2.thickness).toBeCloseTo(4 - 0.001 * 0.008, 5)
  })
  it('spanWidth和archHeight不被update修改', () => {
    const arch = makeArch({ spanWidth: 15, archHeight: 10, tick: 2610 })
    ;(sys as any).arches.push(arch)
    vi.spyOn(Math, 'random').mockReturnValue(0.47)
    sys.update(1, makeWorld(GRASS), makeEm(), 2610)
    expect(arch.spanWidth).toBe(15)
    expect(arch.archHeight).toBe(10)
  })
})

describe('WorldRockArch2System - cleanup逻辑', () => {
  let sys: WorldRockArch2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // cutoff = tick - 91000; 删除条件: arch.tick < cutoff（strict less）

  it('tick刚好等于cutoff时保留（strict <）', () => {
    const tick = 100000
    const cutoff = tick - 91000 // = 9000
    const arch = makeArch({ tick: cutoff }) // tick == cutoff => NOT < cutoff => 保留
    ;(sys as any).arches.push(arch)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), tick)
    expect((sys as any).arches).toHaveLength(1)
  })
  it('tick比cutoff小1时删除', () => {
    const tick = 100000
    const cutoff = tick - 91000
    const arch = makeArch({ tick: cutoff - 1 })
    ;(sys as any).arches.push(arch)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), tick)
    expect((sys as any).arches).toHaveLength(0)
  })
  it('tick远小于cutoff时删除', () => {
    const arch = makeArch({ tick: 0 })
    ;(sys as any).arches.push(arch)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), 200000)
    expect((sys as any).arches).toHaveLength(0)
  })
  it('新arches不会被cleanup删除', () => {
    const tick = 100000
    const arch = makeArch({ tick: tick })
    ;(sys as any).arches.push(arch)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), tick)
    expect((sys as any).arches).toHaveLength(1)
  })
  it('混合新旧：旧的删除，新的保留', () => {
    const tick = 200000
    const oldArch = makeArch({ tick: 0 })
    const newArch = makeArch({ tick: tick })
    ;(sys as any).arches.push(oldArch, newArch)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), tick)
    expect((sys as any).arches).toHaveLength(1)
    expect((sys as any).arches[0].tick).toBe(tick)
  })
  it('cleanup后arches数组长度正确', () => {
    const tick = 200000
    for (let i = 0; i < 5; i++) (sys as any).arches.push(makeArch({ tick: 0 }))
    for (let i = 0; i < 3; i++) (sys as any).arches.push(makeArch({ tick: tick }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(GRASS), makeEm(), tick)
    expect((sys as any).arches).toHaveLength(3)
  })
  it('空数组cleanup不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    expect(() => sys.update(1, makeWorld(GRASS), makeEm(), 200000)).not.toThrow()
  })
  it('cleanup与spawn同帧：先spawn后cleanup，新arch不被删', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(MOUNTAIN), makeEm(), 2610)
    expect((sys as any).arches.length).toBeGreaterThanOrEqual(1)
    expect((sys as any).arches.every((a: RockArch2) => a.tick === 2610)).toBe(true)
  })
})
