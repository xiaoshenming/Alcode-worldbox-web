import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldKarstTowerSystem } from '../systems/WorldKarstTowerSystem'
import type { KarstTower } from '../systems/WorldKarstTowerSystem'

function makeSys(): WorldKarstTowerSystem { return new WorldKarstTowerSystem() }

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5
const mockWorldSand     = { width: 200, height: 200, getTile: () => 2 } // SAND - spawn不了
const mockWorldGrass    = { width: 200, height: 200, getTile: () => 3 } // GRASS - 可spawn
const mockWorldMountain = { width: 200, height: 200, getTile: () => 5 } // MOUNTAIN - 可spawn
const mockEM = {} as any

let nextId = 1
function makeTower(overrides: Partial<KarstTower> = {}): KarstTower {
  return {
    id: nextId++, x: 25, y: 35,
    radius: 3, height: 50,
    erosionRate: 10, vegetationCover: 25,
    caveCount: 2, stability: 70,
    tick: 0,
    ...overrides,
  }
}

// CHECK_INTERVAL = 2800, MAX_TOWERS = 22, FORM_CHANCE = 0.002, cleanup = tick - 95000

describe('WorldKarstTowerSystem - 初始状态', () => {
  let sys: WorldKarstTowerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始towers为空', () => {
    expect((sys as any).towers).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('towers是数组', () => {
    expect(Array.isArray((sys as any).towers)).toBe(true)
  })
  it('注入tower后长度为1', () => {
    ;(sys as any).towers.push(makeTower())
    expect((sys as any).towers).toHaveLength(1)
  })
  it('tower字段radius正确', () => {
    ;(sys as any).towers.push(makeTower({ radius: 3 }))
    expect((sys as any).towers[0].radius).toBe(3)
  })
  it('tower字段height正确', () => {
    ;(sys as any).towers.push(makeTower({ height: 50 }))
    expect((sys as any).towers[0].height).toBe(50)
  })
  it('tower字段erosionRate正确', () => {
    ;(sys as any).towers.push(makeTower({ erosionRate: 10 }))
    expect((sys as any).towers[0].erosionRate).toBe(10)
  })
  it('tower字段vegetationCover正确', () => {
    ;(sys as any).towers.push(makeTower({ vegetationCover: 25 }))
    expect((sys as any).towers[0].vegetationCover).toBe(25)
  })
  it('tower字段caveCount正确', () => {
    ;(sys as any).towers.push(makeTower({ caveCount: 2 }))
    expect((sys as any).towers[0].caveCount).toBe(2)
  })
  it('tower字段stability正确', () => {
    ;(sys as any).towers.push(makeTower({ stability: 70 }))
    expect((sys as any).towers[0].stability).toBe(70)
  })
  it('内部towers引用一致', () => {
    expect((sys as any).towers).toBe((sys as any).towers)
  })
})

describe('WorldKarstTowerSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldKarstTowerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=100 < CHECK_INTERVAL(2800)时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2799时仍被节流不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldGrass as any, mockEM, 2799)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).towers).toHaveLength(0)
  })
  it('tick=2800时lastCheck更新为2800', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })
  it('第一次执行后第二次tick未满间隔不再执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 2800)
    const lc = (sys as any).lastCheck
    sys.update(0, mockWorldGrass as any, mockEM, 2801)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('第二个完整间隔（5600）lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 2800)
    sys.update(0, mockWorldSand as any, mockEM, 5600)
    expect((sys as any).lastCheck).toBe(5600)
  })
})

describe('WorldKarstTowerSystem - spawn条件', () => {
  let sys: WorldKarstTowerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0.9时不spawn（超出FORM_CHANCE=0.002）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldGrass as any, mockEM, 2800)
    expect((sys as any).towers).toHaveLength(0)
  })
  it('tile=SAND(2)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldSand as any, mockEM, 2800)
    expect((sys as any).towers).toHaveLength(0)
  })
  it('tile=SHALLOW_WATER(1)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const mockWater = { width: 200, height: 200, getTile: () => 1 }
    sys.update(0, mockWater as any, mockEM, 2800)
    expect((sys as any).towers).toHaveLength(0)
  })
  it('tile=GRASS(3)且random<0.002时spawn成功', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.001 : 0.5
    })
    sys.update(0, mockWorldGrass as any, mockEM, 2800)
    expect((sys as any).towers).toHaveLength(1)
  })
  it('tile=MOUNTAIN(5)且random<0.002时spawn成功', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.001 : 0.5
    })
    sys.update(0, mockWorldMountain as any, mockEM, 2800)
    expect((sys as any).towers).toHaveLength(1)
  })
  it('spawn时id自增', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount <= 2 ? 0.001 : 0.5
    })
    sys.update(0, mockWorldGrass as any, mockEM, 2800)
    callCount = 0
    sys.update(0, mockWorldGrass as any, mockEM, 5600)
    const ids = (sys as any).towers.map((t: KarstTower) => t.id)
    expect(ids[0]).not.toBe(ids[1])
  })
  it('spawn的tower带有正确tick', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.001 : 0.5
    })
    sys.update(0, mockWorldGrass as any, mockEM, 2800)
    expect((sys as any).towers[0].tick).toBe(2800)
  })
})

describe('WorldKarstTowerSystem - 字段动态更新', () => {
  let sys: WorldKarstTowerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('update后height严格小于初始值（持续侵蚀）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).towers.push(makeTower({ tick: 99000, height: 50 }))
    sys.update(0, mockWorldSand as any, mockEM, 2800)
    expect((sys as any).towers[0].height).toBeLessThan(50)
  })
  it('update后height不低于10（clamp下限）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).towers.push(makeTower({ tick: 99000, height: 10 }))
    sys.update(0, mockWorldSand as any, mockEM, 2800)
    expect((sys as any).towers[0].height).toBeGreaterThanOrEqual(10)
  })
  it('update后vegetationCover不超过80（clamp上限）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).towers.push(makeTower({ tick: 99000, vegetationCover: 80 }))
    sys.update(0, mockWorldSand as any, mockEM, 2800)
    expect((sys as any).towers[0].vegetationCover).toBeLessThanOrEqual(80)
  })
  it('update后stability不低于20（clamp下限）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).towers.push(makeTower({ tick: 99000, stability: 20 }))
    sys.update(0, mockWorldSand as any, mockEM, 2800)
    expect((sys as any).towers[0].stability).toBeGreaterThanOrEqual(20)
  })
  it('update后erosionRate在[1,40]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).towers.push(makeTower({ tick: 99000, erosionRate: 10 }))
    sys.update(0, mockWorldSand as any, mockEM, 2800)
    const er = (sys as any).towers[0].erosionRate
    expect(er).toBeGreaterThanOrEqual(1)
    expect(er).toBeLessThanOrEqual(40)
  })
  it('update不修改tower的x坐标', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).towers.push(makeTower({ tick: 99000, x: 55 }))
    sys.update(0, mockWorldSand as any, mockEM, 2800)
    expect((sys as any).towers[0].x).toBe(55)
  })
  it('update不修改tower的tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).towers.push(makeTower({ tick: 99000 }))
    sys.update(0, mockWorldSand as any, mockEM, 2800)
    expect((sys as any).towers[0].tick).toBe(99000)
  })
})

describe('WorldKarstTowerSystem - cleanup（tick-95000）', () => {
  let sys: WorldKarstTowerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期tower（tick < currentTick-95000）被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).towers.push(makeTower({ tick: 0 }))
    sys.update(0, mockWorldSand as any, mockEM, 96000)
    expect((sys as any).towers).toHaveLength(0)
  })
  it('未过期tower保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).towers.push(makeTower({ tick: 10000 }))
    sys.update(0, mockWorldSand as any, mockEM, 96000)
    expect((sys as any).towers).toHaveLength(1)
  })
  it('cutoff-1时（严格小于cutoff）被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    const cutoff = currentTick - 95000 // = 5000
    ;(sys as any).towers.push(makeTower({ tick: cutoff - 1 }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).towers).toHaveLength(0)
  })
  it('tick等于cutoff时保留（不删）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    const cutoff = currentTick - 95000
    ;(sys as any).towers.push(makeTower({ tick: cutoff }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).towers).toHaveLength(1)
  })
  it('混合cleanup：过期删除，未过期保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 200000
    ;(sys as any).towers.push(makeTower({ id: 10, tick: 0 }))
    ;(sys as any).towers.push(makeTower({ id: 11, tick: 150000 }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).towers).toHaveLength(1)
    expect((sys as any).towers[0].tick).toBe(150000)
  })
  it('全部过期时towers清空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).towers.push(makeTower({ tick: 0 }))
    }
    sys.update(0, mockWorldSand as any, mockEM, 100000)
    expect((sys as any).towers).toHaveLength(0)
  })
})

describe('WorldKarstTowerSystem - MAX_TOWERS上限', () => {
  let sys: WorldKarstTowerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('towers满22个时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 22; i++) {
      ;(sys as any).towers.push(makeTower({ tick: 999999 }))
    }
    sys.update(0, mockWorldGrass as any, mockEM, 999999 + 2800)
    expect((sys as any).towers.length).toBe(22)
  })
  it('towers为21个时仍可spawn', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.001 : 0.5
    })
    for (let i = 0; i < 21; i++) {
      ;(sys as any).towers.push(makeTower({ tick: 999999 }))
    }
    sys.update(0, mockWorldGrass as any, mockEM, 999999 + 2800)
    expect((sys as any).towers.length).toBe(22)
  })
})

describe('WorldKarstTowerSystem - id唯一性', () => {
  let sys: WorldKarstTowerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入多个tower时id各不相同', () => {
    const t1 = makeTower()
    const t2 = makeTower()
    const t3 = makeTower()
    ;(sys as any).towers.push(t1, t2, t3)
    const ids = (sys as any).towers.map((t: KarstTower) => t.id)
    expect(new Set(ids).size).toBe(3)
  })
})
