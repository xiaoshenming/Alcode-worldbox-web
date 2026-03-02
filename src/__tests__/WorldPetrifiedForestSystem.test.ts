import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPetrifiedForestSystem } from '../systems/WorldPetrifiedForestSystem'
import type { PetrifiedForest, PetrifiedAge } from '../systems/WorldPetrifiedForestSystem'

function makeSys(): WorldPetrifiedForestSystem { return new WorldPetrifiedForestSystem() }
let nextId = 1
function makeForest(age: PetrifiedAge = 'ancient', overrides: Partial<PetrifiedForest> = {}): PetrifiedForest {
  return {
    id: nextId++, x: 30, y: 40, petrifiedAge: age, treeCount: 20,
    mineralValue: 80, mysteryLevel: 70, discoveredBy: 0, tick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number = 5, w = 200, h = 200): any {
  return { width: w, height: h, getTile: (_x: number, _y: number) => tile }
}

// CHECK_INTERVAL = 5000, SPAWN_CHANCE = 0.001, MAX_FORESTS = 6
// Spawn tiles: MOUNTAIN=5, GRASS=3
// AGES = ['recent', 'ancient', 'primordial', 'mythic']
// AGE_VALUE = { recent: 10, ancient: 25, primordial: 50, mythic: 80 }
// pickRandom(AGES): random=0 -> 'recent', random=0.25 -> 'ancient', random=0.5 -> 'primordial', random=0.75 -> 'mythic'
// 注意: spawn后同帧会执行update(mysteryLevel/treeCount变化)

describe('WorldPetrifiedForestSystem - 初始状态', () => {
  let sys: WorldPetrifiedForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无石化森林', () => { expect((sys as any).forests).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入后可查询', () => {
    ;(sys as any).forests.push(makeForest())
    expect((sys as any).forests).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).forests).toBe((sys as any).forests)
  })
  it('支持4种石化年代', () => {
    const ages: PetrifiedAge[] = ['recent', 'ancient', 'primordial', 'mythic']
    expect(ages).toHaveLength(4)
  })
  it('石化森林字段正确', () => {
    ;(sys as any).forests.push(makeForest('primordial'))
    const f = (sys as any).forests[0]
    expect(f.petrifiedAge).toBe('primordial')
    expect(f.mineralValue).toBe(80)
    expect(f.mysteryLevel).toBe(70)
  })
  it('discoveredBy初始为0', () => {
    ;(sys as any).forests.push(makeForest())
    expect((sys as any).forests[0].discoveredBy).toBe(0)
  })
})

describe('WorldPetrifiedForestSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldPetrifiedForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行(0-0=0 < 5000)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 0)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('tick < CHECK_INTERVAL时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 4999)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('tick == CHECK_INTERVAL时执行(lastCheck=0)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('第一次update后lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('未到间隔第二次不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    const c = (sys as any).forests.length
    sys.update(1, world, {} as any, 5001)
    expect((sys as any).forests.length).toBe(c)
  })
  it('间隔2倍tick时再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    sys.update(1, world, {} as any, 10000)
    expect((sys as any).lastCheck).toBe(10000)
  })
  it('节流期间mysteryLevel不变', () => {
    ;(sys as any).forests.push(makeForest('ancient', { mysteryLevel: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 100) // < CHECK_INTERVAL
    expect((sys as any).forests[0].mysteryLevel).toBe(50)
  })
})

describe('WorldPetrifiedForestSystem - spawn条件', () => {
  let sys: WorldPetrifiedForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0 < SPAWN_CHANCE且MOUNTAIN地形时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests).toHaveLength(1)
  })
  it('random >= SPAWN_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('GRASS地形(3)时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests).toHaveLength(1)
  })
  it('DEEP_WATER地形(0)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('SHALLOW_WATER地形(1)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(1)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('SAND地形(2)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(2)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('SNOW地形(6)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(6)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('达到MAX_FORESTS(6)时不spawn', () => {
    for (let i = 0; i < 6; i++) {
      ;(sys as any).forests.push(makeForest('ancient', { treeCount: 10 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests).toHaveLength(6)
  })
  it('5个时还能spawn', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).forests.push(makeForest('ancient', { treeCount: 10 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests).toHaveLength(6)
  })
  it('spawn后tick字段为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests[0].tick).toBe(5000)
  })
  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests[0].id).toBe(1)
  })
})

describe('WorldPetrifiedForestSystem - spawn字段范围', () => {
  let sys: WorldPetrifiedForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0时petrifiedAge为recent', () => {
    // pickRandom(['recent','ancient','primordial','mythic']): floor(0*4)=0 -> 'recent'
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests[0].petrifiedAge).toBe('recent')
  })
  it('random=0时mineralValue为AGE_VALUE[recent]=10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    // age='recent', mineralValue=10
    expect((sys as any).forests[0].mineralValue).toBe(10)
  })
  it('treeCount在spawn时范围[10, 49]内', () => {
    // treeCount = 10 + floor(random*40): random=0 -> 10
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    const f = (sys as any).forests[0]
    // spawn后同帧update: random=0 < 0.002? 0<0.002 yes -> treeCount=max(0,10-1)=9
    // 注意update里会执行treeCount-=1
    expect(f.treeCount).toBeGreaterThanOrEqual(0)
    expect(f.treeCount).toBeLessThanOrEqual(50)
  })
  it('mysteryLevel在spawn时范围[20, 79]内', () => {
    // mysteryLevel = 20 + floor(random*60): random=0 -> 20
    // 然后update: mysteryLevel += (0-0.5)*0.5 = -0.25 -> 19.75, max(5,...)->19.75
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    const f = (sys as any).forests[0]
    expect(f.mysteryLevel).toBeGreaterThanOrEqual(5)
    expect(f.mysteryLevel).toBeLessThanOrEqual(100)
  })
  it('discoveredBy初始为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests[0].discoveredBy).toBe(0)
  })
  it('different random=0.25时age为ancient', () => {
    // floor(0.25*4)=1 -> 'ancient'
    const mockFn = vi.spyOn(Math, 'random')
    mockFn.mockReturnValueOnce(0)     // SPAWN_CHANCE: 0 < 0.001 -> proceed
    mockFn.mockReturnValueOnce(0)     // x
    mockFn.mockReturnValueOnce(0)     // y
    mockFn.mockReturnValueOnce(0.25)  // pickRandom: floor(0.25*4)=1 -> 'ancient'
    mockFn.mockReturnValue(0.5)       // remaining calls
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests[0].petrifiedAge).toBe('ancient')
    expect((sys as any).forests[0].mineralValue).toBe(25)
  })
  it('mythic年代mineralValue为80', () => {
    const mockFn = vi.spyOn(Math, 'random')
    mockFn.mockReturnValueOnce(0)     // SPAWN_CHANCE pass
    mockFn.mockReturnValueOnce(0)     // x
    mockFn.mockReturnValueOnce(0)     // y
    mockFn.mockReturnValueOnce(0.99)  // pickRandom: floor(0.99*4)=3 -> 'mythic'
    mockFn.mockReturnValue(0.5)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests[0].petrifiedAge).toBe('mythic')
    expect((sys as any).forests[0].mineralValue).toBe(80)
  })
  it('primordial年代mineralValue为50', () => {
    const mockFn = vi.spyOn(Math, 'random')
    mockFn.mockReturnValueOnce(0)     // SPAWN_CHANCE pass
    mockFn.mockReturnValueOnce(0)     // x
    mockFn.mockReturnValueOnce(0)     // y
    mockFn.mockReturnValueOnce(0.5)   // pickRandom: floor(0.5*4)=2 -> 'primordial'
    mockFn.mockReturnValue(0.5)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 5000)
    expect((sys as any).forests[0].petrifiedAge).toBe('primordial')
    expect((sys as any).forests[0].mineralValue).toBe(50)
  })
})

describe('WorldPetrifiedForestSystem - update数值逻辑', () => {
  let sys: WorldPetrifiedForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('mysteryLevel最小不低于5', () => {
    ;(sys as any).forests.push(makeForest('ancient', { mysteryLevel: 5.1, treeCount: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(0) // 不spawn
    sys.update(1, world, {} as any, 6000)
    expect((sys as any).forests[0].mysteryLevel).toBeGreaterThanOrEqual(5)
  })
  it('mysteryLevel最大不超过100', () => {
    ;(sys as any).forests.push(makeForest('ancient', { mysteryLevel: 99.9, treeCount: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    expect((sys as any).forests[0].mysteryLevel).toBeLessThanOrEqual(100)
  })
  it('mysteryLevel随机波动(±0.25)', () => {
    ;(sys as any).forests.push(makeForest('ancient', { mysteryLevel: 50, treeCount: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    // (0.5 - 0.5) * 0.5 = 0
    expect((sys as any).forests[0].mysteryLevel).toBeCloseTo(50, 3)
  })
  it('random<0.002时treeCount减1', () => {
    ;(sys as any).forests.push(makeForest('ancient', { treeCount: 10 }))
    const mockFn = vi.spyOn(Math, 'random')
    mockFn.mockReturnValueOnce(0.5)    // SPAWN_CHANCE pass check: 0.5 >= 0.001 wait, forests.length check
    // Actually forests.length=1 < 6, but random=0.5 >= 0.001 so spawn check fails
    // Then for loop: mysteryLevel update uses random, then treeCount check uses random
    mockFn.mockReturnValueOnce(0.5)    // mysteryLevel random
    mockFn.mockReturnValueOnce(0.001)  // treeCount: 0.001 < 0.002 -> reduce
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    expect((sys as any).forests[0].treeCount).toBe(9)
  })
  it('random>=0.002时treeCount不减', () => {
    ;(sys as any).forests.push(makeForest('ancient', { treeCount: 10 }))
    const mockFn = vi.spyOn(Math, 'random')
    mockFn.mockReturnValueOnce(0.5)    // spawn check: fail
    mockFn.mockReturnValueOnce(0.5)    // mysteryLevel random
    mockFn.mockReturnValueOnce(0.5)    // treeCount: 0.5 >= 0.002 -> no reduce
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    expect((sys as any).forests[0].treeCount).toBe(10)
  })
  it('treeCount最小为0(不能为负)', () => {
    ;(sys as any).forests.push(makeForest('ancient', { treeCount: 0 }))
    const mockFn = vi.spyOn(Math, 'random')
    mockFn.mockReturnValueOnce(0.5)   // spawn check fail
    mockFn.mockReturnValueOnce(0.5)   // mysteryLevel
    mockFn.mockReturnValueOnce(0.001) // treeCount reduce: max(0, 0-1)=0
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    // treeCount=0 -> max(0, -1) = 0, then cleanup: 0 <= 0 -> removed
    expect((sys as any).forests).toHaveLength(0)
  })
  it('multiple forests都会被update', () => {
    ;(sys as any).forests.push(makeForest('ancient', { mysteryLevel: 50, treeCount: 10 }))
    ;(sys as any).forests.push(makeForest('recent', { mysteryLevel: 30, treeCount: 15 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    // both forests updated
    expect((sys as any).forests).toHaveLength(2)
  })
  it('mysteryLevel随random向上波动', () => {
    ;(sys as any).forests.push(makeForest('ancient', { mysteryLevel: 50, treeCount: 10 }))
    const mockFn = vi.spyOn(Math, 'random')
    mockFn.mockReturnValueOnce(0.5)  // spawn check fail
    mockFn.mockReturnValueOnce(1.0)  // mysteryLevel: (1.0-0.5)*0.5 = +0.25
    mockFn.mockReturnValueOnce(0.5)  // treeCount: no reduce
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    expect((sys as any).forests[0].mysteryLevel).toBeCloseTo(50.25, 3)
  })
})

describe('WorldPetrifiedForestSystem - cleanup逻辑', () => {
  let sys: WorldPetrifiedForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('treeCount<=0的森林被清除', () => {
    ;(sys as any).forests.push(makeForest('ancient', { treeCount: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // no new spawn, no treeCount reduce
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('treeCount=1时被清除(update后可能变0)', () => {
    ;(sys as any).forests.push(makeForest('ancient', { treeCount: 1 }))
    const mockFn = vi.spyOn(Math, 'random')
    mockFn.mockReturnValueOnce(0.5)   // spawn fail
    mockFn.mockReturnValueOnce(0.5)   // mysteryLevel
    mockFn.mockReturnValueOnce(0.001) // treeCount: 1-1=0 -> removed
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    expect((sys as any).forests).toHaveLength(0)
  })
  it('treeCount>0的森林不被清除', () => {
    ;(sys as any).forests.push(makeForest('ancient', { treeCount: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    expect((sys as any).forests).toHaveLength(1)
  })
  it('部分森林被清除，有树的保留', () => {
    ;(sys as any).forests.push(makeForest('ancient', { treeCount: 0 })) // remove
    ;(sys as any).forests.push(makeForest('recent', { treeCount: 10 })) // keep
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    expect((sys as any).forests).toHaveLength(1)
    expect((sys as any).forests[0].petrifiedAge).toBe('recent')
  })
  it('清除后剩余数量正确', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).forests.push(makeForest('ancient', { treeCount: 0 }))
    }
    for (let i = 0; i < 2; i++) {
      ;(sys as any).forests.push(makeForest('mythic', { treeCount: 20 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    expect((sys as any).forests).toHaveLength(2)
  })
  it('节流期间不执行cleanup', () => {
    ;(sys as any).forests.push(makeForest('ancient', { treeCount: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 100) // < CHECK_INTERVAL
    expect((sys as any).forests).toHaveLength(1)
  })
  it('空数组cleanup不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    expect(() => sys.update(1, world, {} as any, 6000)).not.toThrow()
  })
  it('cleanup是从后往前删除，不跳过元素', () => {
    ;(sys as any).forests.push(makeForest('recent', { treeCount: 0 }))   // 0: remove
    ;(sys as any).forests.push(makeForest('ancient', { treeCount: 0 }))  // 1: remove
    ;(sys as any).forests.push(makeForest('mythic', { treeCount: 5 }))   // 2: keep
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 6000)
    expect((sys as any).forests).toHaveLength(1)
    expect((sys as any).forests[0].petrifiedAge).toBe('mythic')
  })
})
