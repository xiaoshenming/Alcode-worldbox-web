import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldLutetiumSpringSystem } from '../systems/WorldLutetiumSpringSystem'
import type { LutetiumSpringZone } from '../systems/WorldLutetiumSpringSystem'

// 安全world：SAND tile(=2)，不邻水也不邻山，阻断spawn
const safeWorld = { width: 200, height: 200, getTile: () => 2 }
// 允许spawn的world：返回SHALLOW_WATER(=1)
const waterWorld = { width: 200, height: 200, getTile: () => 1 }
// 允许spawn的world：返回MOUNTAIN(=5)
const mountainWorld = { width: 200, height: 200, getTile: () => 5 }

const fakeEm = {} as any

function makeSys(): WorldLutetiumSpringSystem { return new WorldLutetiumSpringSystem() }

let nextId = 1
function makeZone(overrides: Partial<LutetiumSpringZone> = {}): LutetiumSpringZone {
  return {
    id: nextId++, x: 20, y: 30,
    lutetiumContent: 60,
    springFlow: 35,
    heavySandLeaching: 60,
    catalyticActivity: 50,
    tick: 0,
    ...overrides
  }
}

describe('WorldLutetiumSpringSystem — 初始状态', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始zones数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId初始值为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始值为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('zones是数组类型', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('注入zone后长度变为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zones返回同一内部引用', () => {
    const ref = (sys as any).zones
    expect(ref).toBe((sys as any).zones)
  })
})

describe('WorldLutetiumSpringSystem — CHECK_INTERVAL节流', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时跳过（lastCheck=0，差值为0，0<3030）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld as any, fakeEm, 0)
    expect((sys as any).zones).toHaveLength(0)
    // lastCheck仍为0（跳过未执行）
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3029时跳过（差值3029<3030）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld as any, fakeEm, 3029)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3030时执行（差值3030，不小于3030）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld as any, fakeEm, 3030)
    expect((sys as any).lastCheck).toBe(3030)
  })

  it('第一次执行后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld as any, fakeEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第一次执行后再传tick=5001（差值1<3030），跳过不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld as any, fakeEm, 5000)
    sys.update(0, safeWorld as any, fakeEm, 5001)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第二次tick达到间隔时再次执行并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld as any, fakeEm, 5000)
    sys.update(0, safeWorld as any, fakeEm, 8030)
    expect((sys as any).lastCheck).toBe(8030)
  })
})

describe('WorldLutetiumSpringSystem — spawn条件', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('SAND tile（无水无山邻居）阻断spawn', () => {
    // random()返回0使FORM_CHANCE通过，但tile条件不满足
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld as any, fakeEm, 3030)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('FORM_CHANCE=0.003：random>0.003时阻断spawn（即使有水邻居）', () => {
    // 让getTile返回1（SHALLOW_WATER），但random()>0.003阻断
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('waterWorld+random<=FORM_CHANCE时允许spawn', () => {
    // random()返回0.002 < 0.003，且waterWorld所有tile=SHALLOW_WATER
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('mountainWorld+random<=FORM_CHANCE时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, mountainWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('每次update最多尝试3次spawn', () => {
    // 让random始终让条件通过（<0.003）且waterWorld
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    // 最多3次尝试，zones不超过3
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  it('zones达到MAX_ZONES(32)时停止spawn', () => {
    // 预填32个zones
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 3030 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBe(32)
  })
})

describe('WorldLutetiumSpringSystem — spawn后字段范围', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(): LutetiumSpringZone {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    return (sys as any).zones[0]
  }

  it('spawn后lutetiumContent在[40,100]范围内', () => {
    const z = spawnOne()
    expect(z.lutetiumContent).toBeGreaterThanOrEqual(40)
    expect(z.lutetiumContent).toBeLessThanOrEqual(100)
  })

  it('spawn后springFlow在[10,60]范围内', () => {
    const z = spawnOne()
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
    expect(z.springFlow).toBeLessThanOrEqual(60)
  })

  it('spawn后heavySandLeaching在[20,100]范围内', () => {
    const z = spawnOne()
    expect(z.heavySandLeaching).toBeGreaterThanOrEqual(20)
    expect(z.heavySandLeaching).toBeLessThanOrEqual(100)
  })

  it('spawn后catalyticActivity在[15,100]范围内', () => {
    const z = spawnOne()
    expect(z.catalyticActivity).toBeGreaterThanOrEqual(15)
    expect(z.catalyticActivity).toBeLessThanOrEqual(100)
  })

  it('spawn后id从1开始自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones[0].id).toBe(1)
  })

  it('spawn后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones[0].tick).toBe(3030)
  })
})

describe('WorldLutetiumSpringSystem — cleanup逻辑', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('zone.tick < cutoff(tick-54000)时删除', () => {
    const currentTick = 60000
    // cutoff = 60000 - 54000 = 6000；zone.tick=5999 < 6000，应删除
    ;(sys as any).zones.push(makeZone({ tick: 5999 }))
    ;(sys as any).lastCheck = 0 // 让节流通过
    vi.spyOn(Math, 'random').mockReturnValue(0.999) // 阻断spawn
    sys.update(0, safeWorld as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick == cutoff时不删除（严格小于）', () => {
    const currentTick = 60000
    // cutoff = 6000；zone.tick=6000，不满足 <6000，保留
    ;(sys as any).zones.push(makeZone({ tick: 6000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick > cutoff时保留', () => {
    const currentTick = 60000
    // cutoff=6000；zone.tick=10000 > 6000，保留
    ;(sys as any).zones.push(makeZone({ tick: 10000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('混合情况：过期zone删除，未过期zone保留', () => {
    const currentTick = 60000
    // cutoff=6000
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))  // 过期
    ;(sys as any).zones.push(makeZone({ tick: 10000 })) // 保留
    ;(sys as any).zones.push(makeZone({ tick: 5999 }))  // 过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(10000)
  })

  it('tick很小时cutoff为负数，所有zone都保留', () => {
    // tick=3030，cutoff=3030-54000=-50970，所有zone.tick>=0>=-50970，全保留
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 3030)
    expect((sys as any).zones).toHaveLength(2)
  })

  it('全部过期时zones清空', () => {
    const currentTick = 100000
    // cutoff=46000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 100 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })
})
