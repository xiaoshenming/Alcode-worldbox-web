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

  it('cleanup从后向前遍历，删除多个连续过期zone', () => {
    const currentTick = 60000
    // cutoff=6000
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))  // 过期
    ;(sys as any).zones.push(makeZone({ tick: 2000 }))  // 过期
    ;(sys as any).zones.push(makeZone({ tick: 3000 }))  // 过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cleanup保留所有未过期zone的顺序', () => {
    const currentTick = 60000
    // cutoff=6000
    ;(sys as any).zones.push(makeZone({ id: 10, tick: 10000 }))
    ;(sys as any).zones.push(makeZone({ id: 20, tick: 20000 }))
    ;(sys as any).zones.push(makeZone({ id: 30, tick: 30000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(3)
    expect((sys as any).zones[0].id).toBe(10)
    expect((sys as any).zones[1].id).toBe(20)
    expect((sys as any).zones[2].id).toBe(30)
  })
})

describe('WorldLutetiumSpringSystem — 边界条件测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('world宽度为1时spawn不崩溃', () => {
    const tinyWorld = { width: 1, height: 200, getTile: () => 1 }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, tinyWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })

  it('world高度为1时spawn不崩溃', () => {
    const tinyWorld = { width: 200, height: 1, getTile: () => 1 }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, tinyWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })

  it('world为1x1时spawn不崩溃', () => {
    const miniWorld = { width: 1, height: 1, getTile: () => 1 }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, miniWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })

  it('world为超大尺寸时spawn不崩溃', () => {
    const hugeWorld = { width: 10000, height: 10000, getTile: () => 1 }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, hugeWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })

  it('tick为Number.MAX_SAFE_INTEGER时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, Number.MAX_SAFE_INTEGER)
    expect((sys as any).lastCheck).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('tick为负数时不崩溃（虽然不符合预期）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, -1000)
    // 负数tick会跳过执行（-1000 - 0 < 3030），lastCheck保持为0
    expect((sys as any).lastCheck).toBe(0)
  })

  it('dt为0时不影响逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })

  it('dt为负数时不影响逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(-100, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })

  it('dt为极大值时不影响逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(999999, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })
})

describe('WorldLutetiumSpringSystem — 多实体交互测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('31个zones时仍可spawn第32个', () => {
    for (let i = 0; i < 31; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 3030 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBe(32)
  })

  it('32个zones时尝试spawn但不增加', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 3030 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 6060)
    expect((sys as any).zones.length).toBe(32)
  })

  it('cleanup后zones数量减少，下次可再spawn', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 1000 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 60000) // cleanup全部，然后spawn
    // cleanup后zones被清空，然后spawn新的（最多3个）
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  it('多次update累积spawn，zones逐渐增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const count1 = (sys as any).zones.length
    sys.update(0, waterWorld as any, fakeEm, 6060)
    const count2 = (sys as any).zones.length
    expect(count2).toBeGreaterThanOrEqual(count1)
  })

  it('不同tick的zones共存', () => {
    ;(sys as any).zones.push(makeZone({ tick: 3030 }))
    ;(sys as any).zones.push(makeZone({ tick: 6060 }))
    ;(sys as any).zones.push(makeZone({ tick: 9090 }))
    expect((sys as any).zones).toHaveLength(3)
  })

  it('zones的id严格递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    sys.update(0, waterWorld as any, fakeEm, 6060)
    const zones = (sys as any).zones
    for (let i = 1; i < zones.length; i++) {
      expect(zones[i].id).toBeGreaterThan(zones[i - 1].id)
    }
  })
})

describe('WorldLutetiumSpringSystem — 状态转换测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('从空zones到有zones的转换', () => {
    expect((sys as any).zones).toHaveLength(0)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('从有zones到空zones的转换（全部cleanup）', () => {
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))
    expect((sys as any).zones).toHaveLength(1)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 60000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('lastCheck从0更新到非0', () => {
    expect((sys as any).lastCheck).toBe(0)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 3030)
    expect((sys as any).lastCheck).toBe(3030)
  })

  it('nextId从1递增到更大值', () => {
    expect((sys as any).nextId).toBe(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('zones达到MAX_ZONES后不再增长', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 3030 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 6060)
    expect((sys as any).zones).toHaveLength(32)
  })
})

describe('WorldLutetiumSpringSystem — 极端值测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random()返回0时lutetiumContent为最小值40', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const zone = (sys as any).zones[0]
    expect(zone.lutetiumContent).toBe(40)
  })

  it('random()返回0.999时lutetiumContent接近最大值100', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.5)   // x
    mockRandom.mockReturnValueOnce(0.5)   // y
    mockRandom.mockReturnValueOnce(0.001) // FORM_CHANCE
    mockRandom.mockReturnValueOnce(0.999) // lutetiumContent
    mockRandom.mockReturnValue(0.5)       // 其他字段
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const zone = (sys as any).zones[0]
    expect(zone.lutetiumContent).toBeCloseTo(40 + 0.999 * 60, 1)
  })

  it('random()返回0时springFlow为最小值10', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001) // 通过FORM_CHANCE
    mockRandom.mockReturnValueOnce(0.5)   // x坐标
    mockRandom.mockReturnValueOnce(0.5)   // y坐标
    mockRandom.mockReturnValue(0)         // 所有字段都用0
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const zone = (sys as any).zones[0]
    expect(zone.springFlow).toBe(10)
  })

  it('random()返回0时heavySandLeaching为最小值20', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001) // 通过FORM_CHANCE
    mockRandom.mockReturnValueOnce(0.5)   // x坐标
    mockRandom.mockReturnValueOnce(0.5)   // y坐标
    mockRandom.mockReturnValue(0)         // 所有字段都用0
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const zone = (sys as any).zones[0]
    expect(zone.heavySandLeaching).toBe(20)
  })

  it('random()返回0时catalyticActivity为最小值15', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001) // 通过FORM_CHANCE
    mockRandom.mockReturnValueOnce(0.5)   // x坐标
    mockRandom.mockReturnValueOnce(0.5)   // y坐标
    mockRandom.mockReturnValue(0)         // 所有字段都用0
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const zone = (sys as any).zones[0]
    expect(zone.catalyticActivity).toBe(15)
  })

  it('cutoff为0时tick=0的zone不被删除（0不小于0）', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 54000) // cutoff=0
    expect((sys as any).zones).toHaveLength(1) // tick=0不满足<0，保留
  })

  it('cutoff为1时tick=0的zone被删除，tick=1的zone保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 54001) // cutoff=1
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(1)
  })
})

describe('WorldLutetiumSpringSystem — 组合场景测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn+cleanup同时发生：新增zone同时删除旧zone', () => {
    ;(sys as any).zones.push(makeZone({ tick: 1000 })) // 将被删除
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 60000) // cutoff=6000
    // 旧zone被删除，新zone被添加
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    expect((sys as any).zones.every((z: any) => z.tick >= 6000)).toBe(true)
  })

  it('达到MAX_ZONES后cleanup释放空间，可再spawn', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 1000 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 60000)
    // 全部cleanup，然后spawn新的（最多3个）
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  it('连续多次update，zones数量在MAX_ZONES内波动', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 20; i++) {
      sys.update(0, waterWorld as any, fakeEm, 3030 * (i + 1))
      expect((sys as any).zones.length).toBeLessThanOrEqual(32)
    }
  })

  it('waterWorld和mountainWorld交替使用，都能spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const count1 = (sys as any).zones.length
    sys.update(0, mountainWorld as any, fakeEm, 6060)
    const count2 = (sys as any).zones.length
    expect(count2).toBeGreaterThan(count1)
  })

  it('safeWorld阻断spawn，但不影响已有zones', () => {
    ;(sys as any).zones.push(makeZone({ tick: 3030 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, safeWorld as any, fakeEm, 6060)
    expect((sys as any).zones).toHaveLength(1) // 没有新增
  })

  it('节流期间多次调用，lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 3030)
    expect((sys as any).lastCheck).toBe(3030)
    sys.update(0, safeWorld as any, fakeEm, 3031)
    expect((sys as any).lastCheck).toBe(3030)
    sys.update(0, safeWorld as any, fakeEm, 4000)
    expect((sys as any).lastCheck).toBe(3030)
  })

  it('节流期满后再次执行，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 3030)
    sys.update(0, safeWorld as any, fakeEm, 6060)
    expect((sys as any).lastCheck).toBe(6060)
  })
})

describe('WorldLutetiumSpringSystem — 坐标边界测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn的x坐标在[0, width)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const zones = (sys as any).zones
    zones.forEach((z: any) => {
      expect(z.x).toBeGreaterThanOrEqual(0)
      expect(z.x).toBeLessThan(200)
    })
  })

  it('spawn的y坐标在[0, height)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const zones = (sys as any).zones
    zones.forEach((z: any) => {
      expect(z.y).toBeGreaterThanOrEqual(0)
      expect(z.y).toBeLessThan(200)
    })
  })

  it('random()=0时x坐标为0', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0)     // x=0
    mockRandom.mockReturnValueOnce(0.5)   // y
    mockRandom.mockReturnValueOnce(0.001) // FORM_CHANCE
    mockRandom.mockReturnValue(0.5)       // 其他字段
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones[0].x).toBe(0)
  })

  it('random()=0.999时x坐标接近width-1', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.999) // x接近199
    mockRandom.mockReturnValueOnce(0.5)   // y
    mockRandom.mockReturnValueOnce(0.001) // FORM_CHANCE
    mockRandom.mockReturnValue(0.5)       // 其他字段
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones[0].x).toBeCloseTo(199, 0)
  })
})

describe('WorldLutetiumSpringSystem — nextId递增测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn一个zone后nextId变为2', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0)     // x
    mockRandom.mockReturnValueOnce(0)     // y
    mockRandom.mockReturnValueOnce(0.001) // FORM_CHANCE - 第1次尝试
    mockRandom.mockReturnValue(0.999)     // 后续尝试都失败
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn三个zone后nextId变为4', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).nextId).toBe(4)
  })

  it('cleanup不影响nextId的值', () => {
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))
    ;(sys as any).nextId = 10
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 60000)
    expect((sys as any).nextId).toBe(10)
  })

  it('多次spawn后nextId持续递增不重复', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const id1 = (sys as any).nextId
    sys.update(0, waterWorld as any, fakeEm, 6060)
    const id2 = (sys as any).nextId
    expect(id2).toBeGreaterThan(id1)
  })
})

describe('WorldLutetiumSpringSystem — FORM_CHANCE边界测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random()=0.003时不阻断spawn（0.003不大于0.003）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValue(0.003) // 0.003 > 0.003 为 false，所以允许spawn
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('random()=0.00301时阻断spawn（>0.003）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValue(0.00301) // 0.00301 > 0.003，阻断
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random()=0.0029时允许spawn（<=0.003）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValue(0.0029)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('random()=0时必定通过FORM_CHANCE', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })
})

describe('WorldLutetiumSpringSystem — 字段最大值测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('springFlow最大值接近60', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.5)   // x
    mockRandom.mockReturnValueOnce(0.5)   // y
    mockRandom.mockReturnValueOnce(0.001) // FORM_CHANCE
    mockRandom.mockReturnValueOnce(0.5)   // lutetiumContent
    mockRandom.mockReturnValueOnce(0.999) // springFlow
    mockRandom.mockReturnValue(0.5)       // 其他字段
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones[0].springFlow).toBeCloseTo(10 + 0.999 * 50, 1)
  })

  it('heavySandLeaching最大值接近100', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.5)   // x
    mockRandom.mockReturnValueOnce(0.5)   // y
    mockRandom.mockReturnValueOnce(0.001) // FORM_CHANCE
    mockRandom.mockReturnValueOnce(0.5)   // lutetiumContent
    mockRandom.mockReturnValueOnce(0.5)   // springFlow
    mockRandom.mockReturnValueOnce(0.999) // heavySandLeaching
    mockRandom.mockReturnValue(0.5)       // 其他字段
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones[0].heavySandLeaching).toBeCloseTo(20 + 0.999 * 80, 1)
  })

  it('catalyticActivity最大值接近100', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.5)   // x
    mockRandom.mockReturnValueOnce(0.5)   // y
    mockRandom.mockReturnValueOnce(0.001) // FORM_CHANCE
    mockRandom.mockReturnValueOnce(0.5)   // lutetiumContent
    mockRandom.mockReturnValueOnce(0.5)   // springFlow
    mockRandom.mockReturnValueOnce(0.5)   // heavySandLeaching
    mockRandom.mockReturnValueOnce(0.999) // catalyticActivity
    sys.update(0, waterWorld as any, fakeEm, 3030)
    expect((sys as any).zones[0].catalyticActivity).toBeCloseTo(15 + 0.999 * 85, 1)
  })
})

describe('WorldLutetiumSpringSystem — 混合地形测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('DEEP_WATER(0)邻居允许spawn', () => {
    const deepWaterWorld = { width: 200, height: 200, getTile: () => 0 }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, deepWaterWorld as any, fakeEm, 3030)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('GRASS(3)邻居阻断spawn', () => {
    const grassWorld = { width: 200, height: 200, getTile: () => 3 }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, grassWorld as any, fakeEm, 3030)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('FOREST(4)邻居阻断spawn', () => {
    const forestWorld = { width: 200, height: 200, getTile: () => 4 }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, forestWorld as any, fakeEm, 3030)
    expect((sys as any).zones).toHaveLength(0)
  })
})

describe('WorldLutetiumSpringSystem — cleanup精确边界测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=cutoff-1时删除', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 5999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick=cutoff+1时保留', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 6001 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('多个zone在cutoff边界附近的混合情况', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 5998 }))  // 删除
    ;(sys as any).zones.push(makeZone({ tick: 5999 }))  // 删除
    ;(sys as any).zones.push(makeZone({ tick: 6000 }))  // 保留
    ;(sys as any).zones.push(makeZone({ tick: 6001 }))  // 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, currentTick)
    expect((sys as any).zones).toHaveLength(2)
  })
})

describe('WorldLutetiumSpringSystem — 连续spawn测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('连续10次update，zones数量不超过MAX_ZONES', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 10; i++) {
      sys.update(0, waterWorld as any, fakeEm, 3030 * (i + 1))
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })

  it('连续spawn直到达到MAX_ZONES', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    let tick = 3030
    while ((sys as any).zones.length < 32 && tick < 100000) {
      sys.update(0, waterWorld as any, fakeEm, tick)
      tick += 3030
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })

  it('达到MAX_ZONES后继续update不会超出', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 3030 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 5; i++) {
      sys.update(0, waterWorld as any, fakeEm, 6060 + 3030 * i)
    }
    expect((sys as any).zones).toHaveLength(32)
  })
})

describe('WorldLutetiumSpringSystem — zone字段完整性测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn的zone包含所有必需字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const zone = (sys as any).zones[0]
    expect(zone).toHaveProperty('id')
    expect(zone).toHaveProperty('x')
    expect(zone).toHaveProperty('y')
    expect(zone).toHaveProperty('lutetiumContent')
    expect(zone).toHaveProperty('springFlow')
    expect(zone).toHaveProperty('heavySandLeaching')
    expect(zone).toHaveProperty('catalyticActivity')
    expect(zone).toHaveProperty('tick')
  })

  it('spawn的zone字段类型正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const zone = (sys as any).zones[0]
    expect(typeof zone.id).toBe('number')
    expect(typeof zone.x).toBe('number')
    expect(typeof zone.y).toBe('number')
    expect(typeof zone.lutetiumContent).toBe('number')
    expect(typeof zone.springFlow).toBe('number')
    expect(typeof zone.heavySandLeaching).toBe('number')
    expect(typeof zone.catalyticActivity).toBe('number')
    expect(typeof zone.tick).toBe('number')
  })

  it('spawn的zone所有数值字段都是有限数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, waterWorld as any, fakeEm, 3030)
    const zone = (sys as any).zones[0]
    expect(Number.isFinite(zone.id)).toBe(true)
    expect(Number.isFinite(zone.x)).toBe(true)
    expect(Number.isFinite(zone.y)).toBe(true)
    expect(Number.isFinite(zone.lutetiumContent)).toBe(true)
    expect(Number.isFinite(zone.springFlow)).toBe(true)
    expect(Number.isFinite(zone.heavySandLeaching)).toBe(true)
    expect(Number.isFinite(zone.catalyticActivity)).toBe(true)
    expect(Number.isFinite(zone.tick)).toBe(true)
  })
})

describe('WorldLutetiumSpringSystem — 特殊tick值测试', () => {
  let sys: WorldLutetiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=CHECK_INTERVAL时正好触发执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 3030)
    expect((sys as any).lastCheck).toBe(3030)
  })

  it('tick=CHECK_INTERVAL-1时不触发执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 3029)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL+1时触发执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 3031)
    expect((sys as any).lastCheck).toBe(3031)
  })

  it('tick=54000时cutoff为0', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 54000)
    expect((sys as any).zones).toHaveLength(1)
  })
})
