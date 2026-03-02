import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTidalLagoonSystem } from '../systems/WorldTidalLagoonSystem'
import type { TidalLagoon } from '../systems/WorldTidalLagoonSystem'
import { TileType } from '../utils/Constants'

// CHECK_INTERVAL=2800, FORM_CHANCE=0.003, MAX_LAGOONS=28
// spawn条件: Math.random() < FORM_CHANCE (进入if)，然后检查 getTile===SHALLOW_WATER or SAND
// x = 10 + floor(random*(w-20)), y = 10 + floor(random*(h-20))
// update: salinity += (random-0.5)*2, clamp[5,50]; biodiversity += 0.02, max 100
// cleanup cutoff = tick - 90000

function makeSys(): WorldTidalLagoonSystem { return new WorldTidalLagoonSystem() }
let nextId = 1

function makeLagoon(overrides: Partial<TidalLagoon> = {}): TidalLagoon {
  return {
    id: nextId++,
    x: 30, y: 40,
    radius: 5,
    salinity: 25,
    depth: 1.5,
    biodiversity: 50,
    tidalRange: 1.0,
    tick: 0,
    ...overrides
  }
}

function makeShallowWorld(): any {
  return {
    width: 200, height: 200,
    getTile: vi.fn(() => TileType.SHALLOW_WATER)
  }
}

function makeSandWorld(): any {
  return {
    width: 200, height: 200,
    getTile: vi.fn(() => TileType.SAND)
  }
}

function makeGrassWorld(): any {
  return {
    width: 200, height: 200,
    getTile: vi.fn(() => TileType.GRASS)
  }
}

const mockEm = {} as any

describe('WorldTidalLagoonSystem - 初始状态', () => {
  let sys: WorldTidalLagoonSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始lagoons为空数组', () => {
    expect((sys as any).lagoons).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lagoons是数组类型', () => {
    expect(Array.isArray((sys as any).lagoons)).toBe(true)
  })

  it('手动注入lagoon后长度正确', () => {
    ;(sys as any).lagoons.push(makeLagoon())
    expect((sys as any).lagoons).toHaveLength(1)
  })

  it('TidalLagoon字段：salinity、biodiversity、tidalRange', () => {
    ;(sys as any).lagoons.push(makeLagoon({ salinity: 30, biodiversity: 70, tidalRange: 1.2 }))
    const l = (sys as any).lagoons[0]
    expect(l.salinity).toBe(30)
    expect(l.biodiversity).toBe(70)
    expect(l.tidalRange).toBeCloseTo(1.2, 5)
  })

  it('TidalLagoon字段：radius和depth', () => {
    ;(sys as any).lagoons.push(makeLagoon({ radius: 6, depth: 2.0 }))
    const l = (sys as any).lagoons[0]
    expect(l.radius).toBe(6)
    expect(l.depth).toBeCloseTo(2.0, 5)
  })

  it('lagoons返回内部同一引用', () => {
    expect((sys as any).lagoons).toBe((sys as any).lagoons)
  })

  it('多个lagoon全部保存', () => {
    ;(sys as any).lagoons.push(makeLagoon())
    ;(sys as any).lagoons.push(makeLagoon())
    expect((sys as any).lagoons).toHaveLength(2)
  })
})

describe('WorldTidalLagoonSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTidalLagoonSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（差值0 < 2800）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeShallowWorld(), mockEm, 0)
    expect((sys as any).lagoons).toHaveLength(0)
  })

  it('tick=2799时不触发（差值2799 < 2800）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeShallowWorld(), mockEm, 2799)
    expect((sys as any).lagoons).toHaveLength(0)
  })

  it('tick=2800时触发（差值2800不满足< 2800）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // <FORM_CHANCE
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('触发后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('未触发时lastCheck不变', () => {
    sys.update(1, makeShallowWorld(), mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('两次调用间隔满足后lastCheck更新为第二次tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    sys.update(1, makeShallowWorld(), mockEm, 7800) // 7800-5000=2800>=2800
    expect((sys as any).lastCheck).toBe(7800)
  })

  it('触发后间隔内再调用不重复处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    const count = (sys as any).lagoons.length
    sys.update(1, makeShallowWorld(), mockEm, 5001)
    expect((sys as any).lagoons.length).toBe(count)
  })
})

describe('WorldTidalLagoonSystem - spawn逻辑', () => {
  let sys: WorldTidalLagoonSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('random >= FORM_CHANCE时不spawn（>=0.003跳过if）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.003) // 0.003 不满足 < 0.003
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    expect((sys as any).lagoons).toHaveLength(0)
  })

  it('random < FORM_CHANCE但tile不是SHALLOW_WATER或SAND时不spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // <FORM_CHANCE，进入if
      .mockReturnValueOnce(0.5)   // x坐标
      .mockReturnValueOnce(0.5)   // y坐标
      .mockReturnValue(0.5)
    sys.update(1, makeGrassWorld(), mockEm, 2800)
    expect((sys as any).lagoons).toHaveLength(0)
  })

  it('SHALLOW_WATER tile下可spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // <FORM_CHANCE
      .mockReturnValueOnce(0.5)   // x
      .mockReturnValueOnce(0.5)   // y
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    expect((sys as any).lagoons).toHaveLength(1)
  })

  it('SAND tile下可spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // <FORM_CHANCE
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeSandWorld(), mockEm, 2800)
    expect((sys as any).lagoons).toHaveLength(1)
  })

  it('spawn后lagoon包含正确tick', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 8888)
    expect((sys as any).lagoons[0].tick).toBe(8888)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    expect((sys as any).nextId).toBe(2)
  })

  it('x坐标在[10, w-10)范围内（random=0时x=10）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // FORM_CHANCE
      .mockReturnValueOnce(0)     // x = 10 + floor(0*(200-20)) = 10
      .mockReturnValueOnce(0.5)   // y
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    expect((sys as any).lagoons[0].x).toBe(10)
  })

  it('y坐标在[10, h-10)范围内（random=0时y=10）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5)   // x
      .mockReturnValueOnce(0)     // y = 10 + floor(0*(200-20)) = 10
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    expect((sys as any).lagoons[0].y).toBe(10)
  })

  it('radius = 3 + floor(random*4)，random=0时为3', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // FORM_CHANCE
      .mockReturnValueOnce(0.5)   // x
      .mockReturnValueOnce(0.5)   // y
      .mockReturnValueOnce(0)     // radius = 3 + floor(0*4) = 3
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    expect((sys as any).lagoons[0].radius).toBe(3)
  })

  it('salinity初始值 = 15 + random*30，random=0时为15', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5)   // x
      .mockReturnValueOnce(0.5)   // y
      .mockReturnValueOnce(0.5)   // radius
      .mockReturnValueOnce(0)     // salinity = 15 + 0*30 = 15
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    // salinity会在update循环中被修改（random-0.5)*2），但此时lagoons列表刚有1个
    // 实际salinity = 15 + (random-0.5)*2 = 15 + (0.5-0.5)*2 = 15
    const s = (sys as any).lagoons[0].salinity
    expect(s).toBeGreaterThanOrEqual(5)
    expect(s).toBeLessThanOrEqual(50)
  })

  it('每次update最多spawn 1个lagoon（if而非loop）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    // 即使random一直<FORM_CHANCE，也只有1次spawn机会
    expect((sys as any).lagoons.length).toBeLessThanOrEqual(1)
  })
})

describe('WorldTidalLagoonSystem - update数值逻辑', () => {
  let sys: WorldTidalLagoonSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('biodiversity每次update增加0.02', () => {
    ;(sys as any).lagoons.push(makeLagoon({ biodiversity: 50, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // >FORM_CHANCE，不spawn
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).lagoons[0].biodiversity).toBeCloseTo(50.02, 5)
  })

  it('biodiversity上限为100', () => {
    ;(sys as any).lagoons.push(makeLagoon({ biodiversity: 99.99, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).lagoons[0].biodiversity).toBeLessThanOrEqual(100)
  })

  it('biodiversity=100时不再增加', () => {
    ;(sys as any).lagoons.push(makeLagoon({ biodiversity: 100, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).lagoons[0].biodiversity).toBeCloseTo(100, 5)
  })

  it('salinity随random变化，random=1时增加约1', () => {
    ;(sys as any).lagoons.push(makeLagoon({ salinity: 25, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // >FORM_CHANCE
      .mockReturnValueOnce(1)   // salinity += (1-0.5)*2 = +1
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).lagoons[0].salinity).toBeCloseTo(26, 5)
  })

  it('salinity随random变化，random=0时减少约1', () => {
    ;(sys as any).lagoons.push(makeLagoon({ salinity: 25, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // >FORM_CHANCE
      .mockReturnValueOnce(0)   // salinity += (0-0.5)*2 = -1
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).lagoons[0].salinity).toBeCloseTo(24, 5)
  })

  it('salinity下限为5（clamp）', () => {
    ;(sys as any).lagoons.push(makeLagoon({ salinity: 5.2, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // >FORM_CHANCE
      .mockReturnValueOnce(0)   // salinity += -1 → 4.2 → clamp到5
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).lagoons[0].salinity).toBeGreaterThanOrEqual(5)
  })

  it('salinity上限为50（clamp）', () => {
    ;(sys as any).lagoons.push(makeLagoon({ salinity: 49.5, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // >FORM_CHANCE
      .mockReturnValueOnce(1)   // salinity += +1 → 50.5 → clamp到50
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).lagoons[0].salinity).toBeLessThanOrEqual(50)
  })

  it('多个lagoon各自独立update', () => {
    ;(sys as any).lagoons.push(makeLagoon({ biodiversity: 30, tick: 50000 }))
    ;(sys as any).lagoons.push(makeLagoon({ biodiversity: 60, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).lagoons[0].biodiversity).toBeCloseTo(30.02, 5)
    expect((sys as any).lagoons[1].biodiversity).toBeCloseTo(60.02, 5)
  })

  it('update不修改lagoon的x、y、radius、depth、id', () => {
    ;(sys as any).lagoons.push(makeLagoon({ x: 50, y: 80, radius: 6, depth: 2.0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    const l = (sys as any).lagoons[0]
    expect(l.x).toBe(50)
    expect(l.y).toBe(80)
    expect(l.radius).toBe(6)
    expect(l.depth).toBeCloseTo(2.0, 5)
  })
})

describe('WorldTidalLagoonSystem - cleanup逻辑', () => {
  let sys: WorldTidalLagoonSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('cutoff=tick-90000，过期lagoon被删除', () => {
    const currentTick = 100000
    ;(sys as any).lagoons.push(makeLagoon({ tick: 9999 })) // 100000-9999=90001 > 90000
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).lagoons).toHaveLength(0)
  })

  it('tick恰好等于cutoff时不删除（需< cutoff）', () => {
    const currentTick = 100000
    const cutoff = currentTick - 90000 // = 10000
    ;(sys as any).lagoons.push(makeLagoon({ tick: cutoff })) // tick===cutoff，不删
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).lagoons).toHaveLength(1)
  })

  it('tick=cutoff-1时被删除', () => {
    const currentTick = 100000
    const cutoff = currentTick - 90000
    ;(sys as any).lagoons.push(makeLagoon({ tick: cutoff - 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).lagoons).toHaveLength(0)
  })

  it('较新的lagoon不被cleanup删除', () => {
    const currentTick = 100000
    ;(sys as any).lagoons.push(makeLagoon({ tick: 80000 })) // 100000-80000=20000 < 90000，不删
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).lagoons).toHaveLength(1)
  })

  it('同时有新旧lagoon时只删旧的', () => {
    const currentTick = 100000
    const cutoff = currentTick - 90000
    ;(sys as any).lagoons.push(makeLagoon({ tick: cutoff - 1 })) // 旧
    ;(sys as any).lagoons.push(makeLagoon({ tick: 80000 }))      // 新
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).lagoons).toHaveLength(1)
    expect((sys as any).lagoons[0].tick).toBe(80000)
  })

  it('多个旧lagoon全部被删', () => {
    const currentTick = 150000
    const cutoff = currentTick - 90000
    for (let i = 0; i < 6; i++) {
      ;(sys as any).lagoons.push(makeLagoon({ tick: cutoff - i - 1 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).lagoons).toHaveLength(0)
  })

  it('cleanup逆序删除不跳过元素（交替新旧）', () => {
    const currentTick = 100000
    const cutoff = currentTick - 90000
    ;(sys as any).lagoons.push(makeLagoon({ tick: cutoff - 1 })) // 旧
    ;(sys as any).lagoons.push(makeLagoon({ tick: 80000 }))      // 新
    ;(sys as any).lagoons.push(makeLagoon({ tick: cutoff - 1 })) // 旧
    ;(sys as any).lagoons.push(makeLagoon({ tick: 80000 }))      // 新
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).lagoons).toHaveLength(2)
    expect((sys as any).lagoons.every((l: TidalLagoon) => l.tick === 80000)).toBe(true)
  })
})

describe('WorldTidalLagoonSystem - MAX_LAGOONS上限', () => {
  let sys: WorldTidalLagoonSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('lagoons达到MAX_LAGOONS=28后不再spawn', () => {
    for (let i = 0; i < 28; i++) {
      ;(sys as any).lagoons.push(makeLagoon({ tick: 50000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // <FORM_CHANCE
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    expect((sys as any).lagoons.length).toBe(28)
  })

  it('lagoons=27时仍可spawn（未达上限）', () => {
    for (let i = 0; i < 27; i++) {
      ;(sys as any).lagoons.push(makeLagoon({ tick: 50000 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // <FORM_CHANCE
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    expect((sys as any).lagoons.length).toBe(28)
  })

  it('lagoons=28时，random<FORM_CHANCE但上限阻止spawn', () => {
    for (let i = 0; i < 28; i++) {
      ;(sys as any).lagoons.push(makeLagoon({ tick: 50000 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeShallowWorld(), mockEm, 2800)
    expect((sys as any).lagoons).toHaveLength(28)
  })
})
