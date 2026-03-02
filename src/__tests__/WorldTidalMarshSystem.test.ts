import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTidalMarshSystem } from '../systems/WorldTidalMarshSystem'
import type { TidalMarsh } from '../systems/WorldTidalMarshSystem'
import { TileType } from '../utils/Constants'

// CHECK_INTERVAL=2700, FORM_CHANCE=0.002, MAX_MARSHES=22
// spawn: Math.random() < FORM_CHANCE，然后检查 getTile===SHALLOW_WATER or SAND
// x = 8 + floor(random*(w-16)), y = 8 + floor(random*(h-16))
// update: spartinaCover += 0.01 max90; sedimentAccretion += 0.005 max40;
//         tidalChannel += 0.003 max35; birdPopulation += (rand-0.48)*0.3 clamp[5,60];
//         salinity += (rand-0.5)*0.2 clamp[8,40]
// cleanup cutoff = tick - 90000

function makeSys(): WorldTidalMarshSystem { return new WorldTidalMarshSystem() }
let nextId = 1

function makeMarsh(overrides: Partial<TidalMarsh> = {}): TidalMarsh {
  return {
    id: nextId++,
    x: 20, y: 30,
    radius: 5,
    spartinaCover: 50,
    tidalChannel: 15,
    salinity: 25,
    sedimentAccretion: 10,
    birdPopulation: 30,
    tick: 0,
    ...overrides
  }
}

function makeShallowWorld(): any {
  return { width: 200, height: 200, getTile: vi.fn(() => TileType.SHALLOW_WATER) }
}

function makeSandWorld(): any {
  return { width: 200, height: 200, getTile: vi.fn(() => TileType.SAND) }
}

function makeGrassWorld(): any {
  return { width: 200, height: 200, getTile: vi.fn(() => TileType.GRASS) }
}

const mockEm = {} as any

describe('WorldTidalMarshSystem - 初始状态', () => {
  let sys: WorldTidalMarshSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始marshes为空数组', () => {
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('marshes是数组类型', () => {
    expect(Array.isArray((sys as any).marshes)).toBe(true)
  })

  it('手动注入marsh后长度正确', () => {
    ;(sys as any).marshes.push(makeMarsh())
    expect((sys as any).marshes).toHaveLength(1)
  })

  it('TidalMarsh字段：spartinaCover、tidalChannel、salinity', () => {
    ;(sys as any).marshes.push(makeMarsh({ spartinaCover: 60, tidalChannel: 20, salinity: 30 }))
    const m = (sys as any).marshes[0]
    expect(m.spartinaCover).toBe(60)
    expect(m.tidalChannel).toBe(20)
    expect(m.salinity).toBe(30)
  })

  it('TidalMarsh字段：sedimentAccretion和birdPopulation', () => {
    ;(sys as any).marshes.push(makeMarsh({ sedimentAccretion: 12, birdPopulation: 35 }))
    const m = (sys as any).marshes[0]
    expect(m.sedimentAccretion).toBe(12)
    expect(m.birdPopulation).toBe(35)
  })

  it('TidalMarsh字段：radius', () => {
    ;(sys as any).marshes.push(makeMarsh({ radius: 7 }))
    expect((sys as any).marshes[0].radius).toBe(7)
  })

  it('marshes返回内部同一引用', () => {
    expect((sys as any).marshes).toBe((sys as any).marshes)
  })

  it('多个marsh全部保存', () => {
    ;(sys as any).marshes.push(makeMarsh())
    ;(sys as any).marshes.push(makeMarsh())
    expect((sys as any).marshes).toHaveLength(2)
  })
})

describe('WorldTidalMarshSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTidalMarshSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（差值0 < 2700）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeShallowWorld(), mockEm, 0)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('tick=2699时不触发（差值2699 < 2700）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeShallowWorld(), mockEm, 2699)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('tick=2700时触发（差值2700不满足< 2700）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })

  it('触发后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 9000)
    expect((sys as any).lastCheck).toBe(9000)
  })

  it('未触发时lastCheck不变', () => {
    sys.update(1, makeShallowWorld(), mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('触发后间隔内再调用不重复处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    const count = (sys as any).marshes.length
    sys.update(1, makeShallowWorld(), mockEm, 5001) // 间隔仅1，不触发
    expect((sys as any).marshes.length).toBe(count)
  })

  it('两次间隔满足后lastCheck更新为第二次tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    sys.update(1, makeShallowWorld(), mockEm, 7700) // 7700-5000=2700>=2700
    expect((sys as any).lastCheck).toBe(7700)
  })
})

describe('WorldTidalMarshSystem - spawn逻辑', () => {
  let sys: WorldTidalMarshSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('random >= FORM_CHANCE时不spawn（0.002不满足< 0.002）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002) // 不满足 < 0.002
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('random < FORM_CHANCE但tile不是SHALLOW_WATER或SAND时不spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // <FORM_CHANCE
      .mockReturnValueOnce(0.5)   // x
      .mockReturnValueOnce(0.5)   // y
      .mockReturnValue(0.5)
    sys.update(1, makeGrassWorld(), mockEm, 2700)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('SHALLOW_WATER tile下可spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // <FORM_CHANCE
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).marshes).toHaveLength(1)
  })

  it('SAND tile下可spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeSandWorld(), mockEm, 2700)
    expect((sys as any).marshes).toHaveLength(1)
  })

  it('spawn后marsh包含正确tick', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 7777)
    expect((sys as any).marshes[0].tick).toBe(7777)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).nextId).toBe(2)
  })

  it('x坐标在[8, w-8)范围内（random=0时x=8）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // FORM_CHANCE
      .mockReturnValueOnce(0)     // x = 8 + floor(0*(200-16)) = 8
      .mockReturnValueOnce(0.5)   // y
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).marshes[0].x).toBe(8)
  })

  it('y坐标在[8, h-8)范围内（random=0时y=8）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5)   // x
      .mockReturnValueOnce(0)     // y = 8 + floor(0*(200-16)) = 8
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).marshes[0].y).toBe(8)
  })

  it('radius = 4 + floor(random*5)，random=0时为4', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // FORM_CHANCE
      .mockReturnValueOnce(0.5)   // x
      .mockReturnValueOnce(0.5)   // y
      .mockReturnValueOnce(0)     // radius = 4 + floor(0*5) = 4
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).marshes[0].radius).toBe(4)
  })

  it('radius = 4 + floor(random*5)，random=0.99时接近8', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.99) // radius = 4 + floor(0.99*5) = 4 + 4 = 8
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).marshes[0].radius).toBe(8)
  })

  it('spartinaCover初始值在[20, 55)范围（20+random*35）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5) // radius
      .mockReturnValueOnce(0)   // spartinaCover = 20 + 0 = 20
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    // 注意：spawn后立即进update循环，spartinaCover += 0.01
    expect((sys as any).marshes[0].spartinaCover).toBeCloseTo(20.01, 5)
  })

  it('每次update最多spawn 1个marsh（if语句而非循环）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).marshes.length).toBeLessThanOrEqual(1)
  })
})

describe('WorldTidalMarshSystem - update数值逻辑', () => {
  let sys: WorldTidalMarshSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('spartinaCover每次update增加0.01', () => {
    ;(sys as any).marshes.push(makeMarsh({ spartinaCover: 50, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // >FORM_CHANCE，不spawn
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].spartinaCover).toBeCloseTo(50.01, 5)
  })

  it('spartinaCover上限为90', () => {
    ;(sys as any).marshes.push(makeMarsh({ spartinaCover: 89.999, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].spartinaCover).toBeLessThanOrEqual(90)
  })

  it('spartinaCover=90时不再增加', () => {
    ;(sys as any).marshes.push(makeMarsh({ spartinaCover: 90, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].spartinaCover).toBeCloseTo(90, 5)
  })

  it('sedimentAccretion每次update增加0.005', () => {
    ;(sys as any).marshes.push(makeMarsh({ sedimentAccretion: 10, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].sedimentAccretion).toBeCloseTo(10.005, 5)
  })

  it('sedimentAccretion上限为40', () => {
    ;(sys as any).marshes.push(makeMarsh({ sedimentAccretion: 39.999, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].sedimentAccretion).toBeLessThanOrEqual(40)
  })

  it('tidalChannel每次update增加0.003', () => {
    ;(sys as any).marshes.push(makeMarsh({ tidalChannel: 15, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].tidalChannel).toBeCloseTo(15.003, 5)
  })

  it('tidalChannel上限为35', () => {
    ;(sys as any).marshes.push(makeMarsh({ tidalChannel: 34.999, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].tidalChannel).toBeLessThanOrEqual(35)
  })

  it('birdPopulation随机变化：random=1时增加约0.156（(1-0.48)*0.3）', () => {
    ;(sys as any).marshes.push(makeMarsh({ birdPopulation: 30, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // >FORM_CHANCE
      .mockReturnValueOnce(1)   // birdPopulation
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    // birdPopulation += (1-0.48)*0.3 = 0.52*0.3 = 0.156
    expect((sys as any).marshes[0].birdPopulation).toBeCloseTo(30.156, 3)
  })

  it('birdPopulation随机变化：random=0时减少约0.144（(0-0.48)*0.3）', () => {
    ;(sys as any).marshes.push(makeMarsh({ birdPopulation: 30, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // >FORM_CHANCE
      .mockReturnValueOnce(0)   // birdPopulation += (0-0.48)*0.3 = -0.144
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].birdPopulation).toBeCloseTo(29.856, 3)
  })

  it('birdPopulation下限为5', () => {
    ;(sys as any).marshes.push(makeMarsh({ birdPopulation: 5.01, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0)   // 减少0.144 → 4.866 → clamp到5
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].birdPopulation).toBeGreaterThanOrEqual(5)
  })

  it('birdPopulation上限为60', () => {
    ;(sys as any).marshes.push(makeMarsh({ birdPopulation: 59.98, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(1)   // 增加0.156 → 60.136 → clamp到60
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].birdPopulation).toBeLessThanOrEqual(60)
  })

  it('salinity随机变化：random=1时增加约0.1（(1-0.5)*0.2）', () => {
    ;(sys as any).marshes.push(makeMarsh({ salinity: 25, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // >FORM_CHANCE
      .mockReturnValueOnce(0.5) // birdPopulation
      .mockReturnValueOnce(1)   // salinity += (1-0.5)*0.2 = 0.1
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].salinity).toBeCloseTo(25.1, 5)
  })

  it('salinity下限为8（clamp）', () => {
    ;(sys as any).marshes.push(makeMarsh({ salinity: 8.05, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)   // salinity += (0-0.5)*0.2 = -0.1 → 7.95 → clamp到8
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].salinity).toBeGreaterThanOrEqual(8)
  })

  it('salinity上限为40（clamp）', () => {
    ;(sys as any).marshes.push(makeMarsh({ salinity: 39.95, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(1)   // salinity += 0.1 → 40.05 → clamp到40
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].salinity).toBeLessThanOrEqual(40)
  })

  it('update不修改marsh的x、y、radius、id', () => {
    ;(sys as any).marshes.push(makeMarsh({ x: 50, y: 80, radius: 6, id: 99, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    const m = (sys as any).marshes[0]
    expect(m.x).toBe(50)
    expect(m.y).toBe(80)
    expect(m.radius).toBe(6)
    expect(m.id).toBe(99)
  })

  it('多个marsh各自独立update（spartinaCover）', () => {
    ;(sys as any).marshes.push(makeMarsh({ spartinaCover: 30, tick: 50000 }))
    ;(sys as any).marshes.push(makeMarsh({ spartinaCover: 70, tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, 5000)
    expect((sys as any).marshes[0].spartinaCover).toBeCloseTo(30.01, 5)
    expect((sys as any).marshes[1].spartinaCover).toBeCloseTo(70.01, 5)
  })
})

describe('WorldTidalMarshSystem - cleanup逻辑', () => {
  let sys: WorldTidalMarshSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('cutoff=tick-90000，过期marsh被删除', () => {
    const currentTick = 100000
    ;(sys as any).marshes.push(makeMarsh({ tick: 9999 })) // 100000-9999 > 90000
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('tick恰好等于cutoff时不删除（需< cutoff）', () => {
    const currentTick = 100000
    const cutoff = currentTick - 90000 // = 10000
    ;(sys as any).marshes.push(makeMarsh({ tick: cutoff }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).marshes).toHaveLength(1)
  })

  it('tick=cutoff-1时被删除', () => {
    const currentTick = 100000
    const cutoff = currentTick - 90000
    ;(sys as any).marshes.push(makeMarsh({ tick: cutoff - 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('较新的marsh不被cleanup删除', () => {
    const currentTick = 100000
    ;(sys as any).marshes.push(makeMarsh({ tick: 80000 })) // 100000-80000=20000 < 90000
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).marshes).toHaveLength(1)
  })

  it('同时有新旧marsh时只删旧的', () => {
    const currentTick = 100000
    const cutoff = currentTick - 90000
    ;(sys as any).marshes.push(makeMarsh({ tick: cutoff - 1 })) // 旧
    ;(sys as any).marshes.push(makeMarsh({ tick: 80000 }))      // 新
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).marshes).toHaveLength(1)
    expect((sys as any).marshes[0].tick).toBe(80000)
  })

  it('多个旧marsh全部被删', () => {
    const currentTick = 150000
    const cutoff = currentTick - 90000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).marshes.push(makeMarsh({ tick: cutoff - i - 1 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).marshes).toHaveLength(0)
  })

  it('cleanup逆序删除不跳过元素（交替新旧）', () => {
    const currentTick = 100000
    const cutoff = currentTick - 90000
    ;(sys as any).marshes.push(makeMarsh({ tick: cutoff - 1 })) // 旧
    ;(sys as any).marshes.push(makeMarsh({ tick: 80000 }))      // 新
    ;(sys as any).marshes.push(makeMarsh({ tick: cutoff - 1 })) // 旧
    ;(sys as any).marshes.push(makeMarsh({ tick: 80000 }))      // 新
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    expect((sys as any).marshes).toHaveLength(2)
    expect((sys as any).marshes.every((m: TidalMarsh) => m.tick === 80000)).toBe(true)
  })

  it('cleanup不影响当前tick新创建的marsh', () => {
    const currentTick = 60000
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // <FORM_CHANCE
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, currentTick)
    const count = (sys as any).marshes.length
    expect(count).toBeGreaterThan(0)
  })
})

describe('WorldTidalMarshSystem - MAX_MARSHES上限', () => {
  let sys: WorldTidalMarshSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('marshes达到MAX_MARSHES=22后不再spawn', () => {
    for (let i = 0; i < 22; i++) {
      ;(sys as any).marshes.push(makeMarsh({ tick: 50000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).marshes.length).toBe(22)
  })

  it('marshes=21时仍可spawn（未达上限）', () => {
    for (let i = 0; i < 21; i++) {
      ;(sys as any).marshes.push(makeMarsh({ tick: 50000 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // <FORM_CHANCE
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).marshes.length).toBe(22)
  })

  it('marshes=22时，random<FORM_CHANCE但上限阻止spawn', () => {
    for (let i = 0; i < 22; i++) {
      ;(sys as any).marshes.push(makeMarsh({ tick: 50000 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).marshes).toHaveLength(22)
  })

  it('MAX_MARSHES=22，注入21个并spawn后恰好22个', () => {
    for (let i = 0; i < 21; i++) {
      ;(sys as any).marshes.push(makeMarsh({ tick: 50000 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeShallowWorld(), mockEm, 2700)
    expect((sys as any).marshes).toHaveLength(22)
  })
})
