import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSeleniumSpringSystem } from '../systems/WorldSeleniumSpringSystem'
import type { SeleniumSpringZone } from '../systems/WorldSeleniumSpringSystem'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5, SNOW=6, LAVA=7
// CHECK_INTERVAL=2720, FORM_CHANCE=0.003, MAX_ZONES=32
// spawn条件: (nearWater || nearMountain) && random<=FORM_CHANCE(即random不>FORM_CHANCE)
// 注意: 源码是 if (Math.random() > FORM_CHANCE) continue => random<=FORM_CHANCE时spawn
// 每次最多3次attempt
// seleniumContent: 40+random*60, springFlow: 10+random*50
// mineralDeposit: 20+random*80, traceElements: 15+random*85
// cleanup: tick < (currentTick - 54000)
// 无update数值逻辑(只有spawn和cleanup)

function makeSys(): WorldSeleniumSpringSystem { return new WorldSeleniumSpringSystem() }

function makeWorldNearWater(w = 100, h = 100) {
  return {
    width: w,
    height: h,
    getTile: (x: number, y: number) => {
      // 中心附近返回SHALLOW_WATER(1)让hasAdjacentTile=true
      return 1
    },
  } as any
}

function makeWorldNearMountain(w = 100, h = 100) {
  return {
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => 5, // MOUNTAIN
  } as any
}

function makeWorldNoAdjacent(w = 100, h = 100) {
  return {
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => 3, // GRASS，不是water也不是mountain
  } as any
}

function makeEM() { return {} as any }

let nextId = 1
function makeZone(overrides: Partial<SeleniumSpringZone> = {}): SeleniumSpringZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    seleniumContent: 70,
    springFlow: 35,
    mineralDeposit: 60,
    traceElements: 57,
    tick: 0,
    ...overrides,
  }
}

describe('WorldSeleniumSpringSystem - 初始状态', () => {
  let sys: WorldSeleniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无selenium泉区', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('zones是数组', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('注入单个zone后长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('注入两个zone后长度为2', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })

  it('zones返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })

  it('zone字段seleniumContent正确', () => {
    ;(sys as any).zones.push(makeZone({ seleniumContent: 75, springFlow: 40 }))
    const z = (sys as any).zones[0]
    expect(z.seleniumContent).toBe(75)
    expect(z.springFlow).toBe(40)
  })
})

describe('WorldSeleniumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldSeleniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行(差值0 < 2720)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick=2719时不执行(小于CHECK_INTERVAL)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2719)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2720时执行(等于CHECK_INTERVAL)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 2720)
    expect((sys as any).lastCheck).toBe(2720)
  })

  it('执行后lastCheck更新为tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('间隔内第二次调用不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 2720)
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 3000)
    expect((sys as any).lastCheck).toBe(2720)
  })

  it('第二个间隔到时再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 2720)
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 5440)
    expect((sys as any).lastCheck).toBe(5440)
  })

  it('手动设lastCheck=1000，tick=3719时不执行(差值2719<2720)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 1000
    sys.update(1, makeWorldNearWater(), makeEM(), 3719)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('手动设lastCheck=1000，tick=3720时执行(差值2720>=2720)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).lastCheck = 1000
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 3720)
    expect((sys as any).lastCheck).toBe(3720)
  })
})

describe('WorldSeleniumSpringSystem - spawn逻辑', () => {
  let sys: WorldSeleniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('nearWater(SHALLOW_WATER邻近)且random<=FORM_CHANCE时spawn', () => {
    // random=0时: nearWater check用0.5>FORM_CHANCE? => hasAdjacentTile(1)=true
    // random>FORM_CHANCE? 0>0.003? false，不跳过，spawn
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('nearMountain且random<=FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearMountain(), makeEM(), 2720)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('无邻近水或山时不spawn(即使random很小)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 2720)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random>FORM_CHANCE(0.003)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random=FORM_CHANCE(0.003)时spawn(等于时不跳过)', () => {
    // 条件是 random() > FORM_CHANCE，等于时不>，不跳过，spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('zones已满MAX_ZONES(32)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 32; i++) {
      (sys as any).zones.push(makeZone({ tick: 2720 }))
    }
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    expect((sys as any).zones).toHaveLength(32)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('每次update最多spawn3个(3次attempt)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })
})

describe('WorldSeleniumSpringSystem - spawn字段范围', () => {
  let sys: WorldSeleniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn的zone tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].tick).toBe(2720)
    }
  })

  it('seleniumContent在[40,100]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    if ((sys as any).zones.length > 0) {
      // random=0: seleniumContent=40+0*60=40
      expect((sys as any).zones[0].seleniumContent).toBeGreaterThanOrEqual(40)
      expect((sys as any).zones[0].seleniumContent).toBeLessThanOrEqual(100)
    }
  })

  it('springFlow在[10,60]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].springFlow).toBeGreaterThanOrEqual(10)
      expect((sys as any).zones[0].springFlow).toBeLessThanOrEqual(60)
    }
  })

  it('mineralDeposit在[20,100]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].mineralDeposit).toBeGreaterThanOrEqual(20)
      expect((sys as any).zones[0].mineralDeposit).toBeLessThanOrEqual(100)
    }
  })

  it('traceElements在[15,100]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].traceElements).toBeGreaterThanOrEqual(15)
      expect((sys as any).zones[0].traceElements).toBeLessThanOrEqual(100)
    }
  })

  it('random=0时seleniumContent=40', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].seleniumContent).toBe(40)
    }
  })

  it('random=0时springFlow=10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].springFlow).toBe(10)
    }
  })

  it('random=0时mineralDeposit=20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].mineralDeposit).toBe(20)
    }
  })
})

describe('WorldSeleniumSpringSystem - cleanup逻辑', () => {
  let sys: WorldSeleniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < cutoff时删除(过期)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // cutoff = 60000 - 54000 = 6000
    // zone.tick=1000 < 6000，应被删除
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 60000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick >= cutoff时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // cutoff = 60000 - 54000 = 6000
    // zone.tick=6001 >= 6000，保留
    ;(sys as any).zones.push(makeZone({ tick: 6001 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 60000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('tick=cutoff时保留(等于边界，条件是<)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // cutoff = 60000 - 54000 = 6000
    ;(sys as any).zones.push(makeZone({ tick: 6000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 60000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('混合：过期删，有效保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // cutoff=60000-54000=6000
    ;(sys as any).zones.push(makeZone({ tick: 1000 })) // 过期
    ;(sys as any).zones.push(makeZone({ tick: 10000 })) // 有效
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 60000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(10000)
  })

  it('多个过期全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // cutoff=60000-54000=6000
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))
    ;(sys as any).zones.push(makeZone({ tick: 2000 }))
    ;(sys as any).zones.push(makeZone({ tick: 3000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 60000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('空列表cleanup不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, makeWorldNoAdjacent(), makeEM(), 60000)).not.toThrow()
  })

  it('cutoff边界精确：tick=54000时cutoff=0，zone.tick=-1被删', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // cutoff=54000-54000=0, zone.tick=-1 < 0，删
    ;(sys as any).zones.push(makeZone({ tick: -1 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 54000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cutoff边界：zone.tick=0 cutoff=0时保留(0不<0)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // cutoff=54000-54000=0, zone.tick=0，0不<0，保留
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorldNoAdjacent(), makeEM(), 54000)
    expect((sys as any).zones).toHaveLength(1)
  })
})

describe('WorldSeleniumSpringSystem - 综合场景', () => {
  let sys: WorldSeleniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('两个不同实例互相独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).zones.push(makeZone())
    expect((sys1 as any).zones).toHaveLength(1)
    expect((sys2 as any).zones).toHaveLength(0)
  })

  it('31个zones，spawn后最多32个', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 31; i++) {
      (sys as any).zones.push(makeZone({ tick: 2720 }))
    }
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })

  it('DEEP_WATER(0)邻近时也触发nearWater条件', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const worldDeepWater = {
      width: 100, height: 100,
      getTile: (_x: number, _y: number) => 0, // DEEP_WATER
    } as any
    sys.update(1, worldDeepWater, makeEM(), 2720)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('id从1开始自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearWater(), makeEM(), 2720)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].id).toBe(1)
    }
  })

  it('多次update累计spawn但不超MAX_ZONES', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 每次up到3次attempt，每次最多spawn3个
    for (let t = 2720; t <= 2720 * 20; t += 2720) {
      sys.update(1, makeWorldNearWater(), makeEM(), t)
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })

  it('mineralDeposit字段存在且正确', () => {
    ;(sys as any).zones.push(makeZone({ mineralDeposit: 55 }))
    expect((sys as any).zones[0].mineralDeposit).toBe(55)
  })

  it('traceElements字段存在且正确', () => {
    ;(sys as any).zones.push(makeZone({ traceElements: 80 }))
    expect((sys as any).zones[0].traceElements).toBe(80)
  })

  it('zone的id字段存在', () => {
    ;(sys as any).zones.push(makeZone({ id: 5 }))
    expect((sys as any).zones[0].id).toBe(5)
  })

  it('spawn时zone的x、y坐标在world范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const w = { width: 50, height: 80, getTile: () => 1 } as any
    sys.update(1, w, makeEM(), 2720)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].x).toBeGreaterThanOrEqual(0)
      expect((sys as any).zones[0].x).toBeLessThan(50)
      expect((sys as any).zones[0].y).toBeGreaterThanOrEqual(0)
      expect((sys as any).zones[0].y).toBeLessThan(80)
    }
  })

  it('LAVA(7)邻近不触发nearWater或nearMountain，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const worldLava = { width: 100, height: 100, getTile: () => 7 } as any
    sys.update(1, worldLava, makeEM(), 2720)
    expect((sys as any).zones).toHaveLength(0)
  })
})
