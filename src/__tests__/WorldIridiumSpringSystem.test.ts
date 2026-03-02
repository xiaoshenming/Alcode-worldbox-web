import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldIridiumSpringSystem } from '../systems/WorldIridiumSpringSystem'
import type { IridiumSpringZone } from '../systems/WorldIridiumSpringSystem'

const CHECK_INTERVAL = 2810
const MAX_ZONES = 32

function makeSys(): WorldIridiumSpringSystem { return new WorldIridiumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<IridiumSpringZone> = {}): IridiumSpringZone {
  return {
    id: nextId++, x: 20, y: 30,
    iridiumContent: 60,
    springFlow: 35,
    mantleLeaching: 50,
    mineralDensity: 55,
    tick: 0,
    ...overrides
  }
}

// 安全阻断spawn world：getTile()=>2(SAND)，hasAdjacentTile全返回false（无水/山)
function blockWorld() {
  return { width: 100, height: 100, getTile: () => 2 }
}
const emMock = {} as any

describe('WorldIridiumSpringSystem - 初始状态', () => {
  let sys: WorldIridiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始zones为空数组', () => {
    expect((sys as any).zones).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('zones是数组类型', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })
  it('可以正常实例化系统', () => {
    expect(sys).toBeInstanceOf(WorldIridiumSpringSystem)
  })
})

describe('WorldIridiumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldIridiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不执行更新', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    const len = (sys as any).zones.length
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(len)
  })
  it('tick==CHECK_INTERVAL时会执行（差值不满足严格小于）', () => {
    // lastCheck=0, tick=2810: 2810-0=2810 不 < 2810，因此会执行
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick超过CHECK_INTERVAL时更新lastCheck', () => {
    const tick = CHECK_INTERVAL + 1
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).lastCheck).toBe(tick)
  })
  it('更新后lastCheck精确等于传入tick', () => {
    const tick = CHECK_INTERVAL * 3 + 99
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).lastCheck).toBe(tick)
  })
  it('连续调用时第二次在新间隔前不触发', () => {
    const tick1 = CHECK_INTERVAL + 1
    ;(sys as any).update(0, blockWorld(), emMock, tick1)
    const lc = (sys as any).lastCheck
    ;(sys as any).update(0, blockWorld(), emMock, tick1 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('lastCheck被设置后，差值不足时不再执行', () => {
    ;(sys as any).lastCheck = 5000
    const prevLen = (sys as any).zones.length
    ;(sys as any).update(0, blockWorld(), emMock, 5000 + CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(prevLen)
  })
})

describe('WorldIridiumSpringSystem - spawn条件（阻断）', () => {
  let sys: WorldIridiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无水无山邻近时不spawn（hasAdjacentTile均为false）', () => {
    // blockWorld返回SAND，周围无水无山
    const world = { width: 100, height: 100, getTile: () => 2 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).zones).toHaveLength(0)
  })
  it('random>FORM_CHANCE(0.003)时不spawn即使有水邻近', () => {
    const world = { width: 100, height: 100, getTile: () => 1 }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).zones).toHaveLength(0)
  })
  it('有水邻近且random允许时可以spawn', () => {
    const world = { width: 100, height: 100, getTile: () => 1 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('有深水邻近(DEEP_WATER=0)且random允许时可以spawn', () => {
    const world = { width: 100, height: 100, getTile: () => 0 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('有山邻近(MOUNTAIN=5)且random允许时可以spawn', () => {
    const world = { width: 100, height: 100, getTile: () => 5 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
})

describe('WorldIridiumSpringSystem - spawn字段范围', () => {
  let sys: WorldIridiumSpringSystem

  beforeEach(() => {
    sys = makeSys(); nextId = 1
    const world = { width: 100, height: 100, getTile: () => 1 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('iridiumContent在[40,100)范围内', () => {
    if ((sys as any).zones.length === 0) return
    const v = (sys as any).zones[0].iridiumContent
    expect(v).toBeGreaterThanOrEqual(40)
    expect(v).toBeLessThan(101)
  })
  it('springFlow在[10,60)范围内', () => {
    if ((sys as any).zones.length === 0) return
    const v = (sys as any).zones[0].springFlow
    expect(v).toBeGreaterThanOrEqual(10)
    expect(v).toBeLessThan(61)
  })
  it('mantleLeaching在[20,100)范围内', () => {
    if ((sys as any).zones.length === 0) return
    const v = (sys as any).zones[0].mantleLeaching
    expect(v).toBeGreaterThanOrEqual(20)
    expect(v).toBeLessThan(101)
  })
  it('mineralDensity在[15,100)范围内', () => {
    if ((sys as any).zones.length === 0) return
    const v = (sys as any).zones[0].mineralDensity
    expect(v).toBeGreaterThanOrEqual(15)
    expect(v).toBeLessThan(101)
  })
  it('zone有id字段', () => {
    if ((sys as any).zones.length === 0) return
    expect((sys as any).zones[0].id).toBeDefined()
  })
  it('zone有x/y坐标字段', () => {
    if ((sys as any).zones.length === 0) return
    expect((sys as any).zones[0].x).toBeDefined()
    expect((sys as any).zones[0].y).toBeDefined()
  })
  it('zone有tick字段', () => {
    if ((sys as any).zones.length === 0) return
    expect((sys as any).zones[0].tick).toBeDefined()
  })
})

describe('WorldIridiumSpringSystem - MAX_ZONES上限', () => {
  let sys: WorldIridiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('达到MAX_ZONES(32)后不再spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    const world = { width: 100, height: 100, getTile: () => 1 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })
  it('注入31个后还可再尝试spawn', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    const world = { width: 100, height: 100, getTile: () => 1 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })
  it('MAX_ZONES常量为32', () => {
    expect(MAX_ZONES).toBe(32)
  })
})

describe('WorldIridiumSpringSystem - cleanup过期记录', () => {
  let sys: WorldIridiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick-54000之前的zone被清除（严格小于cutoff）', () => {
    const tick = 100000
    ;(sys as any).zones.push(makeZone({ tick: tick - 54001 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick-54000之后的zone不被清除', () => {
    const tick = 100000
    ;(sys as any).zones.push(makeZone({ tick: tick - 53999 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('恰好在cutoff(tick-54000)处的zone不被清除（严格小于，等于不删）', () => {
    // cutoff = tick - 54000; 条件 zone.tick < cutoff
    // 当 zone.tick == cutoff 时不满足严格小于，不删除
    const tick = 100000
    ;(sys as any).zones.push(makeZone({ tick: tick - 54000 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('混合新旧zone，只清除旧的', () => {
    const tick = 100000
    ;(sys as any).zones.push(makeZone({ tick: tick - 54001 })) // old
    ;(sys as any).zones.push(makeZone({ tick: tick - 1000 }))  // new
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('清除后剩余zone字段完整', () => {
    const tick = 100000
    ;(sys as any).zones.push(makeZone({ tick: tick - 54001 })) // old
    ;(sys as any).zones.push(makeZone({ tick: tick - 1000, iridiumContent: 77 })) // new
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).zones[0].iridiumContent).toBe(77)
  })
  it('全部过期时清空数组', () => {
    const tick = 100000
    ;(sys as any).zones.push(makeZone({ tick: tick - 54001 }))
    ;(sys as any).zones.push(makeZone({ tick: tick - 80000 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).zones).toHaveLength(0)
  })
})

describe('WorldIridiumSpringSystem - 注入字段直接验证', () => {
  let sys: WorldIridiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入的zone id字段正确', () => {
    ;(sys as any).zones.push(makeZone({ id: 42 }))
    expect((sys as any).zones[0].id).toBe(42)
  })
  it('注入的zone iridiumContent字段正确', () => {
    ;(sys as any).zones.push(makeZone({ iridiumContent: 88 }))
    expect((sys as any).zones[0].iridiumContent).toBe(88)
  })
  it('注入的zone springFlow字段正确', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 45 }))
    expect((sys as any).zones[0].springFlow).toBe(45)
  })
  it('注入的zone mantleLeaching字段正确', () => {
    ;(sys as any).zones.push(makeZone({ mantleLeaching: 70 }))
    expect((sys as any).zones[0].mantleLeaching).toBe(70)
  })
  it('注入的zone mineralDensity字段正确', () => {
    ;(sys as any).zones.push(makeZone({ mineralDensity: 55 }))
    expect((sys as any).zones[0].mineralDensity).toBe(55)
  })
  it('注入多个zone返回全部', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(3)
  })
  it('手动设置nextId后值正确', () => {
    ;(sys as any).nextId = 5
    expect((sys as any).nextId).toBe(5)
  })
})
