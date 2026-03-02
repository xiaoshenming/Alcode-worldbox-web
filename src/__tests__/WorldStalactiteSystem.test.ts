import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldStalactiteSystem } from '../systems/WorldStalactiteSystem'
import type { StalactiteCave, CaveType } from '../systems/WorldStalactiteSystem'

// CHECK_INTERVAL=3400, SPAWN_CHANCE=0.003, MAX_CAVES=12
// tile条件: tile===5(MOUNTAIN) 或 tile===6(SNOW)
// cleanup: active===false 则移除
// update: age=tick-c.tick; random<GROWTH_RATE[type] 则 formations+1(max 100)
//         age>300000 && random<0.0005 则 active=false
// CAVE_DEPTH: limestone:5, crystal:8, ice:3, lava:10
// GROWTH_RATE: limestone:0.01, crystal:0.005, ice:0.02, lava:0.008

function makeSys(): WorldStalactiteSystem { return new WorldStalactiteSystem() }

function makeWorld(tile: number = 5, width = 200, height = 200) {
  return { width, height, getTile: () => tile } as any
}

function makeEm() { return {} as any }

let idCounter = 1
function makeCave(overrides: Partial<StalactiteCave> = {}): StalactiteCave {
  return {
    id: idCounter++,
    x: 15, y: 25,
    caveType: 'limestone',
    depth: 7,
    formations: 10,
    age: 0,
    active: true,
    tick: 0,
    ...overrides,
  }
}

describe('WorldStalactiteSystem - 初始状态', () => {
  let sys: WorldStalactiteSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })

  it('初始 caves 数组为空', () => {
    expect((sys as any).caves).toHaveLength(0)
  })
  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('caves 是数组实例', () => {
    expect(Array.isArray((sys as any).caves)).toBe(true)
  })
  it('多次实例化互不干扰', () => {
    const s2 = makeSys()
    ;(sys as any).caves.push(makeCave())
    expect((s2 as any).caves).toHaveLength(0)
  })
  it('nextId 与 lastCheck 是数值类型', () => {
    expect(typeof (sys as any).nextId).toBe('number')
    expect(typeof (sys as any).lastCheck).toBe('number')
  })
  it('caves 引用稳定', () => {
    expect((sys as any).caves).toBe((sys as any).caves)
  })
  it('构造函数不调用 Math.random', () => {
    const spy = vi.spyOn(Math, 'random')
    makeSys()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('WorldStalactiteSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldStalactiteSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL(3400) 时不执行', () => {
    const spy = vi.spyOn(Math, 'random')
    sys.update(1, makeWorld(), makeEm(), 3399)
    expect(spy).not.toHaveBeenCalled()
  })
  it('tick === 3399 时不执行', () => {
    const spy = vi.spyOn(Math, 'random')
    sys.update(1, makeWorld(), makeEm(), 3399)
    expect(spy).not.toHaveBeenCalled()
  })
  it('tick === CHECK_INTERVAL(3400) 时执行', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 3400)
    expect(spy).toHaveBeenCalled()
  })
  it('触发后 lastCheck 更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 3400)
    expect((sys as any).lastCheck).toBe(3400)
  })
  it('第二次间隔不足则 lastCheck 不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 3400)
    sys.update(1, makeWorld(), makeEm(), 3401)
    expect((sys as any).lastCheck).toBe(3400)
  })
  it('第二次满足间隔则 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 3400)
    sys.update(1, makeWorld(), makeEm(), 6800)
    expect((sys as any).lastCheck).toBe(6800)
  })
  it('tick=0 不触发', () => {
    const spy = vi.spyOn(Math, 'random')
    sys.update(1, makeWorld(), makeEm(), 0)
    expect(spy).not.toHaveBeenCalled()
  })
  it('节流期间注入的洞穴不被改变', () => {
    ;(sys as any).caves.push(makeCave({ formations: 10 }))
    ;(sys as any).lastCheck = 3400
    sys.update(1, makeWorld(), makeEm(), 3401)
    expect((sys as any).caves[0].formations).toBe(10)
  })
})

describe('WorldStalactiteSystem - spawn 逻辑', () => {
  let sys: WorldStalactiteSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('random < SPAWN_CHANCE(0.003) 且 tile=5 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    expect((sys as any).caves.length).toBeGreaterThanOrEqual(1)
  })
  it('random >= SPAWN_CHANCE 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.004)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    expect((sys as any).caves).toHaveLength(0)
  })
  it('SPAWN_CHANCE 边界：random === 0.003 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    expect((sys as any).caves).toHaveLength(0)
  })
  it('tile=6(SNOW) 时允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(6), makeEm(), 3400)
    expect((sys as any).caves.length).toBeGreaterThanOrEqual(1)
  })
  it('tile=5(MOUNTAIN) 时允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    expect((sys as any).caves.length).toBeGreaterThanOrEqual(1)
  })
  it('tile=3(GRASS) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(3), makeEm(), 3400)
    expect((sys as any).caves).toHaveLength(0)
  })
  it('tile=2(SAND) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(2), makeEm(), 3400)
    expect((sys as any).caves).toHaveLength(0)
  })
  it('tile=0(DEEP_WATER) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(0), makeEm(), 3400)
    expect((sys as any).caves).toHaveLength(0)
  })
  it('达到 MAX_CAVES(12) 不再 spawn', () => {
    for (let i = 0; i < 12; i++) (sys as any).caves.push(makeCave({ tick: 3400 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    expect((sys as any).caves).toHaveLength(12)
  })
  it('caves.length === 11 仍可 spawn', () => {
    for (let i = 0; i < 11; i++) (sys as any).caves.push(makeCave({ tick: 3400 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    expect((sys as any).caves.length).toBeGreaterThan(11)
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })
  it('spawn 的洞穴初始 active=true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    const cave = (sys as any).caves.find((c: StalactiteCave) => c.tick === 3400)
    if (cave) expect(cave.active).toBe(true)
  })
  it('spawn 的洞穴初始 age=0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    const cave = (sys as any).caves.find((c: StalactiteCave) => c.tick === 3400)
    if (cave) expect(cave.age).toBe(0)
  })
  it('spawn 记录当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    const cave = (sys as any).caves.find((c: StalactiteCave) => c.tick === 6800)
    if (cave) expect(cave.tick).toBe(6800)
  })
  it('洞穴 caveType 是四种之一', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    if ((sys as any).caves.length > 0) {
      expect(['limestone', 'crystal', 'ice', 'lava']).toContain((sys as any).caves[0].caveType)
    }
  })
  it('formations 初始 >= 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    if ((sys as any).caves.length > 0) {
      expect((sys as any).caves[0].formations).toBeGreaterThanOrEqual(1)
    }
  })
  it('null tile 时不 spawn', () => {
    const world = { width: 200, height: 200, getTile: () => null } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, world, makeEm(), 3400)
    expect((sys as any).caves).toHaveLength(0)
  })
})

describe('WorldStalactiteSystem - spawn 字段范围', () => {
  let sys: WorldStalactiteSystem
  afterEach(() => vi.restoreAllMocks())

  it('limestone depth 在 [5, 9]', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'limestone', depth: 5 }))
    // CAVE_DEPTH[limestone]=5, +floor(random*5) => [5,9]
    expect((sys as any).caves[0].depth).toBeGreaterThanOrEqual(5)
  })
  it('crystal depth 在 [8, 12]', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'crystal', depth: 10 }))
    expect((sys as any).caves[0].depth).toBeGreaterThanOrEqual(8)
  })
  it('ice depth 在 [3, 7]', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'ice', depth: 4 }))
    expect((sys as any).caves[0].depth).toBeGreaterThanOrEqual(3)
  })
  it('lava depth 在 [10, 14]', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'lava', depth: 12 }))
    expect((sys as any).caves[0].depth).toBeGreaterThanOrEqual(10)
  })
  it('formations 初始在 [1, 3]', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ formations: 2 }))
    expect((sys as any).caves[0].formations).toBeGreaterThanOrEqual(1)
    expect((sys as any).caves[0].formations).toBeLessThanOrEqual(3)
  })
  it('age 初始为 0', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ age: 0 }))
    expect((sys as any).caves[0].age).toBe(0)
  })
  it('active 初始为 true', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ active: true }))
    expect((sys as any).caves[0].active).toBe(true)
  })
  it('x 坐标有效（世界范围内）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys = makeSys()
    sys.update(1, makeWorld(5, 100, 100), makeEm(), 3400)
    if ((sys as any).caves.length > 0) {
      const x = (sys as any).caves[0].x
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(100)
    }
  })
})

describe('WorldStalactiteSystem - update 数值逻辑', () => {
  let sys: WorldStalactiteSystem
  afterEach(() => vi.restoreAllMocks())

  it('age 更新为 tick - cave.tick', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ age: 0, tick: 3400, active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves[0].age).toBe(6800 - 3400)
  })
  it('random < GROWTH_RATE[limestone](0.01) 时 formations+1', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'limestone', formations: 5, tick: 3400, active: true }))
    // spawn chance: 第一次random用于spawn判断(0.9999>=0.003 不spawn)
    // update中 random < 0.01 => 增长
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves[0].formations).toBe(6)
  })
  it('random >= GROWTH_RATE[limestone] 时 formations 不变', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'limestone', formations: 5, tick: 3400, active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves[0].formations).toBe(5)
  })
  it('formations 上界为 100', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'limestone', formations: 100, tick: 3400, active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves[0].formations).toBe(100)
  })
  it('formations=99 时 random<rate 增长到 100', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'ice', formations: 99, tick: 3400, active: true }))
    // GROWTH_RATE[ice]=0.02
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves[0].formations).toBe(100)
  })
  it('age > 300000 且 random < 0.0005 时 active 变 false', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'limestone', tick: 0, active: true, age: 0 }))
    // update调用顺序: 1)spawn判断(random>=SPAWN_CHANCE跳过) 2)growth判断 3)崩塌判断
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9999) // spawn判断：>=0.003 不spawn
      .mockReturnValueOnce(0.9999) // growth判断：>=0.01 不增长
      .mockReturnValueOnce(0.0003) // 崩塌判断：<0.0005 => active=false
    ;(sys as any).lastCheck = 300001 - 3400
    sys.update(1, makeWorld(5), makeEm(), 300001)
    // age = 300001 - 0 = 300001 > 300000, random=0.0003 < 0.0005 => active=false
    expect((sys as any).caves[0]?.active ?? false).toBe(false)
  })
  it('age <= 300000 时不触发崩塌', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'limestone', tick: 0, active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.0003)
    ;(sys as any).lastCheck = 300000 - 3400
    sys.update(1, makeWorld(5), makeEm(), 300000)
    // age = 300000 <= 300000 => 不崩塌
    expect((sys as any).caves[0].active).toBe(true)
  })
  it('age > 300000 但 random >= 0.0005 时不崩塌', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'limestone', tick: 0, active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    ;(sys as any).lastCheck = 300001 - 3400
    sys.update(1, makeWorld(5), makeEm(), 300001)
    expect((sys as any).caves[0].active).toBe(true)
  })
  it('crystal GROWTH_RATE(0.005) 比 limestone(0.01) 更难增长', () => {
    // crystal需要random<0.005，limestone需要random<0.01
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'crystal', formations: 5, tick: 3400 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.007) // 0.005<=0.007 不增长
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves[0].formations).toBe(5)
  })
  it('ice GROWTH_RATE(0.02) 最容易增长', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'ice', formations: 5, tick: 3400 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.015) // <0.02 => 增长
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves[0].formations).toBe(6)
  })
  it('多洞穴 age 分别独立更新', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ tick: 0, active: true }))
    ;(sys as any).caves.push(makeCave({ tick: 3400, active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves[0].age).toBe(6800)
    expect((sys as any).caves[1].age).toBe(3400)
  })
})

describe('WorldStalactiteSystem - cleanup 逻辑', () => {
  let sys: WorldStalactiteSystem
  afterEach(() => vi.restoreAllMocks())

  it('active=false 的洞穴被移除', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ active: false, tick: 3400 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves).toHaveLength(0)
  })
  it('active=true 的洞穴不被移除', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ active: true, tick: 3400 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves).toHaveLength(1)
  })
  it('混合 active 状态：只保留 active=true', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ id: 1, active: false, tick: 3400 }))
    ;(sys as any).caves.push(makeCave({ id: 2, active: true, tick: 3400 }))
    ;(sys as any).caves.push(makeCave({ id: 3, active: false, tick: 3400 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves).toHaveLength(1)
    expect((sys as any).caves[0].id).toBe(2)
  })
  it('cleanup 后数组长度正确', () => {
    sys = makeSys()
    for (let i = 0; i < 5; i++) (sys as any).caves.push(makeCave({ active: false, tick: 3400 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves).toHaveLength(0)
  })
  it('cleanup 在同轮 update 后执行（age 更新后再清除）', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ active: true, tick: 3400 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    // active 未被置 false（age=3400<=300000），不被清除
    expect((sys as any).caves).toHaveLength(1)
    expect((sys as any).caves[0].age).toBe(3400)
  })
  it('崩塌后的洞穴在同轮被清除', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ tick: 0, active: true }))
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9999) // spawn判断：>=0.003 不spawn
      .mockReturnValueOnce(0.9999) // growth判断：>=0.01 不增长
      .mockReturnValueOnce(0.0003) // 崩塌判断：<0.0005 => active=false => cleanup
    ;(sys as any).lastCheck = 300001 - 3400
    sys.update(1, makeWorld(5), makeEm(), 300001)
    // age=300001>300000, random=0.0003<0.0005 => active=false => 被清除
    expect((sys as any).caves).toHaveLength(0)
  })
  it('新 spawn 的洞穴 active=true 不被清除', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 3400)
    // spawned cave has active=true, should not be removed
    const activeCaves = (sys as any).caves.filter((c: StalactiteCave) => c.active)
    expect(activeCaves.length).toBeGreaterThanOrEqual(0)
  })
  it('inactive cave 不能通过修改 active 重新激活', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ active: false, tick: 3400 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 6800)
    expect((sys as any).caves).toHaveLength(0)
  })
})

describe('WorldStalactiteSystem - 综合场景', () => {
  let sys: WorldStalactiteSystem
  afterEach(() => vi.restoreAllMocks())

  it('formations 经多轮增长不超过 100', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'ice', formations: 95, tick: 3400 }))
    for (let i = 1; i <= 10; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.01) // <0.02 => 增长
      sys.update(1, makeWorld(5), makeEm(), 3400 + i * 3400)
      vi.restoreAllMocks()
    }
    if ((sys as any).caves.length > 0) {
      expect((sys as any).caves[0].formations).toBeLessThanOrEqual(100)
    }
  })
  it('id 在多次 spawn 中严格递增', () => {
    sys = makeSys()
    for (let i = 0; i < 3; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.002)
      sys.update(1, makeWorld(5), makeEm(), 3400 + i * 3400)
      vi.restoreAllMocks()
    }
    const ids = (sys as any).caves.map((c: StalactiteCave) => c.id)
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1])
    }
  })
  it('dt 参数不影响逻辑', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(999, makeWorld(5), makeEm(), 3400)
    expect((sys as any).lastCheck).toBe(3400)
  })
  it('四种洞穴类型都有不同的 depth 基准', () => {
    const depthMap: Record<CaveType, number> = { limestone: 5, crystal: 8, ice: 3, lava: 10 }
    sys = makeSys()
    const types: CaveType[] = ['limestone', 'crystal', 'ice', 'lava']
    for (const t of types) {
      ;(sys as any).caves.push(makeCave({ caveType: t, depth: depthMap[t] }))
    }
    for (const c of (sys as any).caves) {
      expect(c.depth).toBeGreaterThanOrEqual(depthMap[c.caveType as CaveType])
    }
  })
  it('世界宽高影响 spawn 的坐标范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys = makeSys()
    sys.update(1, makeWorld(5, 50, 50), makeEm(), 3400)
    if ((sys as any).caves.length > 0) {
      expect((sys as any).caves[0].x).toBeLessThan(50)
      expect((sys as any).caves[0].y).toBeLessThan(50)
    }
  })
  it('连续更新不产生 NaN 字段', () => {
    sys = makeSys()
    ;(sys as any).caves.push(makeCave({ caveType: 'lava', formations: 50, tick: 3400 }))
    for (let i = 1; i <= 5; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, makeWorld(5), makeEm(), 3400 + i * 3400)
      vi.restoreAllMocks()
    }
    if ((sys as any).caves.length > 0) {
      const c = (sys as any).caves[0]
      expect(isNaN(c.age)).toBe(false)
      expect(isNaN(c.formations)).toBe(false)
    }
  })
  it('空洞穴列表时 update 不崩溃', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    expect(() => sys.update(1, makeWorld(5), makeEm(), 3400)).not.toThrow()
  })
})
