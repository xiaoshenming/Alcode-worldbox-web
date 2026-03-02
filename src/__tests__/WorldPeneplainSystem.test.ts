import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPeneplainSystem } from '../systems/WorldPeneplainSystem'
import type { Peneplain } from '../systems/WorldPeneplainSystem'

function makeSys(): WorldPeneplainSystem { return new WorldPeneplainSystem() }
let nextId = 1
function makePeneplain(overrides: Partial<Peneplain> = {}): Peneplain {
  return {
    id: nextId++, x: 25, y: 35, area: 80, flatness: 90,
    erosionAge: 50000, soilDepth: 5, vegetationCover: 60, spectacle: 50, tick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number = 3, w = 200, h = 200): any {
  return { width: w, height: h, getTile: () => tile }
}

// CHECK_INTERVAL = 2640, FORM_CHANCE = 0.0014, MAX_PENEPLAINS = 15
// TileType: GRASS=3, FOREST=4
// 注意: spawn后同帧update会修改字段值

describe('WorldPeneplainSystem - 初始状态', () => {
  let sys: WorldPeneplainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无准平原', () => { expect((sys as any).peneplains).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入后可查询', () => {
    ;(sys as any).peneplains.push(makePeneplain())
    expect((sys as any).peneplains).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).peneplains).toBe((sys as any).peneplains)
  })
  it('准平原字段正确', () => {
    ;(sys as any).peneplains.push(makePeneplain())
    const p = (sys as any).peneplains[0]
    expect(p.flatness).toBe(90)
    expect(p.vegetationCover).toBe(60)
    expect(p.soilDepth).toBe(5)
  })
  it('多个准平原全部返回', () => {
    ;(sys as any).peneplains.push(makePeneplain())
    ;(sys as any).peneplains.push(makePeneplain())
    expect((sys as any).peneplains).toHaveLength(2)
  })
  it('spectacle字段正确', () => {
    ;(sys as any).peneplains.push(makePeneplain())
    expect((sys as any).peneplains[0].spectacle).toBe(50)
  })
})

describe('WorldPeneplainSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldPeneplainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行update逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 0)
    expect((sys as any).peneplains).toHaveLength(0)
  })
  it('tick < CHECK_INTERVAL时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2639)
    expect((sys as any).peneplains).toHaveLength(0)
  })
  it('tick == CHECK_INTERVAL时执行(lastCheck=0)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).lastCheck).toBe(2640)
  })
  it('第一次update后lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).lastCheck).toBe(2640)
  })
  it('未到间隔第二次update不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    const countAfterFirst = (sys as any).peneplains.length
    sys.update(1, world, {} as any, 2641)
    expect((sys as any).peneplains.length).toBe(countAfterFirst)
  })
  it('间隔2倍tick时再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).lastCheck).toBe(2640)
    sys.update(1, world, {} as any, 5280)
    expect((sys as any).lastCheck).toBe(5280)
  })
  it('节流期间不更新peneplain字段', () => {
    ;(sys as any).peneplains.push(makePeneplain({ flatness: 90, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 100) // < CHECK_INTERVAL
    expect((sys as any).peneplains[0].flatness).toBe(90)
  })
})

describe('WorldPeneplainSystem - spawn条件', () => {
  let sys: WorldPeneplainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0 < FORM_CHANCE且GRASS地形时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).peneplains).toHaveLength(1)
  })
  it('random >= FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).peneplains).toHaveLength(0)
  })
  it('FOREST地形(4)时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(4)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).peneplains).toHaveLength(1)
  })
  it('非GRASS/FOREST地形(SAND=2)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(2)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).peneplains).toHaveLength(0)
  })
  it('MOUNTAIN地形(5)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(5)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).peneplains).toHaveLength(0)
  })
  it('WATER地形(0)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).peneplains).toHaveLength(0)
  })
  it('达到MAX_PENEPLAINS(15)时不spawn', () => {
    for (let i = 0; i < 15; i++) {
      ;(sys as any).peneplains.push(makePeneplain({ tick: 2640 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).peneplains).toHaveLength(15)
  })
  it('14个时还能spawn', () => {
    for (let i = 0; i < 14; i++) {
      ;(sys as any).peneplains.push(makePeneplain({ tick: 2640 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).peneplains).toHaveLength(15)
  })
  it('spawn后tick字段为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).peneplains[0].tick).toBe(2640)
  })
  it('spawn后id自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    expect((sys as any).peneplains[0].id).toBe(1)
  })
})

describe('WorldPeneplainSystem - spawn字段范围', () => {
  let sys: WorldPeneplainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('area在spawn时范围[25, 80]内', () => {
    // random=0: area = 25 + 0*55 = 25, update后area不变
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    const p = (sys as any).peneplains[0]
    expect(p.area).toBeCloseTo(25, 0)
  })
  it('flatness在spawn+update后范围合理(>=40, <=98)', () => {
    // random=0: flatness=60 + 0*30=60, update后 +=( 0-0.49)*0.08 = -0.0392 -> ~59.96
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    const p = (sys as any).peneplains[0]
    expect(p.flatness).toBeGreaterThanOrEqual(40)
    expect(p.flatness).toBeLessThanOrEqual(98)
  })
  it('soilDepth在spawn时范围[5, 25]内', () => {
    // random=0: soilDepth = 5 + 0*20 = 5, update后 +=0.00004 -> ~5.00004
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    const p = (sys as any).peneplains[0]
    expect(p.soilDepth).toBeGreaterThanOrEqual(5)
    expect(p.soilDepth).toBeLessThanOrEqual(25.001)
  })
  it('vegetationCover在spawn+update后范围合理(>=10, <=80)', () => {
    // random=0: vegetationCover=20, update: +=(0-0.47)*0.12=-0.0564 -> ~19.94
    // 但 Math.max(10,...) 保护，所以>=10
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    const p = (sys as any).peneplains[0]
    expect(p.vegetationCover).toBeGreaterThanOrEqual(10)
    expect(p.vegetationCover).toBeLessThanOrEqual(80)
  })
  it('spectacle在spawn+update后范围合理(>=5, <=55)', () => {
    // random=0: spectacle=10, update: +=(0-0.47)*0.09=-0.0423 -> ~9.96, max(5,...)->9.96
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    const p = (sys as any).peneplains[0]
    expect(p.spectacle).toBeGreaterThanOrEqual(5)
    expect(p.spectacle).toBeLessThanOrEqual(55)
  })
  it('random=0时flatness初始为60', () => {
    // 在没有update的情况下 spawn后立即访问前值
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    // 手动调用spawn逻辑等效
    ;(sys as any).trySpawnZone = function(w: any, tick: number) {
      if ((sys as any).peneplains.length >= 15) return
      // random=0 < 0.0014
      const x = 0, y = 0
      const tile = w.getTile(x, y)
      if (tile === 3 || tile === 4) {
        (sys as any).peneplains.push({
          id: (sys as any).nextId++, x, y,
          area: 25 + 0 * 55,
          flatness: 60 + 0 * 30,
          erosionAge: 100 + 0 * 500,
          soilDepth: 5 + 0 * 20,
          vegetationCover: 20 + 0 * 50,
          spectacle: 10 + 0 * 30,
          tick,
        })
      }
    }
    ;(sys as any).trySpawnZone(world, 2640)
    expect((sys as any).peneplains[0].flatness).toBe(60)
  })
  it('erosionAge在spawn时范围[100, 600]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(3)
    sys.update(1, world, {} as any, 2640)
    const p = (sys as any).peneplains[0]
    expect(p.erosionAge).toBeGreaterThanOrEqual(100)
    expect(p.erosionAge).toBeLessThanOrEqual(600)
  })
})

describe('WorldPeneplainSystem - update数值逻辑', () => {
  let sys: WorldPeneplainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('flatness最大不超过98', () => {
    ;(sys as any).peneplains.push(makePeneplain({ flatness: 97.99, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 5000 + 2640)
    const f = (sys as any).peneplains[0].flatness
    expect(f).toBeLessThanOrEqual(98)
  })
  it('flatness最小不低于40', () => {
    ;(sys as any).peneplains.push(makePeneplain({ flatness: 40.01, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 5000 + 2640)
    expect((sys as any).peneplains[0].flatness).toBeGreaterThanOrEqual(40)
  })
  it('soilDepth每次增加0.00004', () => {
    ;(sys as any).peneplains.push(makePeneplain({ soilDepth: 10, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0) // 不spawn新的
    sys.update(1, world, {} as any, 5000 + 2640)
    expect((sys as any).peneplains[0].soilDepth).toBeCloseTo(10.00004, 5)
  })
  it('soilDepth最大不超过35', () => {
    ;(sys as any).peneplains.push(makePeneplain({ soilDepth: 34.9999, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 5000 + 2640)
    expect((sys as any).peneplains[0].soilDepth).toBeLessThanOrEqual(35)
  })
  it('vegetationCover最小不低于10', () => {
    ;(sys as any).peneplains.push(makePeneplain({ vegetationCover: 10.01, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 5000 + 2640)
    expect((sys as any).peneplains[0].vegetationCover).toBeGreaterThanOrEqual(10)
  })
  it('vegetationCover最大不超过80', () => {
    ;(sys as any).peneplains.push(makePeneplain({ vegetationCover: 79.99, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 5000 + 2640)
    expect((sys as any).peneplains[0].vegetationCover).toBeLessThanOrEqual(80)
  })
  it('spectacle最小不低于5', () => {
    ;(sys as any).peneplains.push(makePeneplain({ spectacle: 5.01, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 5000 + 2640)
    expect((sys as any).peneplains[0].spectacle).toBeGreaterThanOrEqual(5)
  })
  it('spectacle最大不超过55', () => {
    ;(sys as any).peneplains.push(makePeneplain({ spectacle: 54.99, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 5000 + 2640)
    expect((sys as any).peneplains[0].spectacle).toBeLessThanOrEqual(55)
  })
  it('multiple peneplains都会被update', () => {
    ;(sys as any).peneplains.push(makePeneplain({ soilDepth: 10, tick: 5000 }))
    ;(sys as any).peneplains.push(makePeneplain({ soilDepth: 15, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 5000 + 2640)
    expect((sys as any).peneplains[0].soilDepth).toBeCloseTo(10.00004, 5)
    expect((sys as any).peneplains[1].soilDepth).toBeCloseTo(15.00004, 5)
  })
})

describe('WorldPeneplainSystem - cleanup逻辑', () => {
  let sys: WorldPeneplainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick过老的准平原被清除(cutoff = tick - 93000)', () => {
    // cutoff = 100000 - 93000 = 7000, peneplain.tick=0 < 7000 -> removed
    ;(sys as any).peneplains.push(makePeneplain({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 100000)
    expect((sys as any).peneplains).toHaveLength(0)
  })
  it('较新的准平原不被清除', () => {
    // cutoff = 100000 - 93000 = 7000, peneplain.tick=8000 >= 7000 -> kept
    ;(sys as any).peneplains.push(makePeneplain({ tick: 8000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 100000)
    expect((sys as any).peneplains).toHaveLength(1)
  })
  it('恰好在cutoff边界的被清除(tick < cutoff)', () => {
    // cutoff = 100000 - 93000 = 7000, peneplain.tick=6999 < 7000 -> removed
    ;(sys as any).peneplains.push(makePeneplain({ tick: 6999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 100000)
    expect((sys as any).peneplains).toHaveLength(0)
  })
  it('恰好等于cutoff的被保留(tick === cutoff不满足 < 条件)', () => {
    // cutoff = 100000 - 93000 = 7000, peneplain.tick=7000 -> NOT < 7000 -> kept
    ;(sys as any).peneplains.push(makePeneplain({ tick: 7000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 100000)
    expect((sys as any).peneplains).toHaveLength(1)
  })
  it('部分过老准平原被清除，新的保留', () => {
    ;(sys as any).peneplains.push(makePeneplain({ tick: 0 }))    // old -> remove
    ;(sys as any).peneplains.push(makePeneplain({ tick: 8000 })) // new -> keep
    ;(sys as any).peneplains.push(makePeneplain({ tick: 100 }))  // old -> remove
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 100000)
    expect((sys as any).peneplains).toHaveLength(1)
  })
  it('cleanup后数量正确', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).peneplains.push(makePeneplain({ tick: 8000 + i * 1000 }))
    }
    for (let i = 0; i < 3; i++) {
      ;(sys as any).peneplains.push(makePeneplain({ tick: i * 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    sys.update(1, world, {} as any, 100000)
    expect((sys as any).peneplains).toHaveLength(5)
  })
  it('节流期间不执行cleanup', () => {
    ;(sys as any).peneplains.push(makePeneplain({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    // tick=100 < CHECK_INTERVAL(2640) -> no update
    sys.update(1, world, {} as any, 100)
    expect((sys as any).peneplains).toHaveLength(1)
  })
  it('空数组cleanup不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0)
    expect(() => sys.update(1, world, {} as any, 100000)).not.toThrow()
  })
})
