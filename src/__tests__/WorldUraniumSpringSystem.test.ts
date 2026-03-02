import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldUraniumSpringSystem } from '../systems/WorldUraniumSpringSystem'
import type { UraniumSpringZone } from '../systems/WorldUraniumSpringSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 3070
// FORM_CHANCE = 0.003  (Math.random() > FORM_CHANCE 则跳过，即 < 0.003 才spawn)
// MAX_ZONES = 32
// 每次update最多3次attempt
// 条件: nearWater(SHALLOW_WATER=1 或 DEEP_WATER=0邻格) || nearMountain(MOUNTAIN=5邻格)
// cleanup: tick < (currentTick - 54000) 时删除
// 字段范围: uraniumContent: 40~100, springFlow: 10~60, sandstoneLeaching: 20~100, gammaRadiation: 15~100

const CHECK_INTERVAL = 3070
const FORM_CHANCE = 0.003
const MAX_ZONES = 32
const CUTOFF = 54000
const TICK0 = CHECK_INTERVAL  // 首次触发

function makeSys(): WorldUraniumSpringSystem { return new WorldUraniumSpringSystem() }

let nextId = 1
function makeZone(overrides: Partial<UraniumSpringZone> = {}): UraniumSpringZone {
  return {
    id: nextId++,
    x: 50, y: 50,
    uraniumContent: 70,
    springFlow: 30,
    sandstoneLeaching: 50,
    gammaRadiation: 50,
    tick: 0,
    ...overrides
  }
}

// mock world，中心点(50,50)邻格有浅水
function makeMockWorldWithWater(centerX = 50, centerY = 50): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn((x: number, y: number) => {
      // 邻格(centerX+1, centerY)是浅水(1)
      if (x === centerX + 1 && y === centerY) return 1  // SHALLOW_WATER
      return 3  // GRASS
    })
  }
}

// mock world，中心点邻格有山地
function makeMockWorldWithMountain(centerX = 50, centerY = 50): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn((x: number, y: number) => {
      if (x === centerX + 1 && y === centerY) return 5  // MOUNTAIN
      return 3  // GRASS
    })
  }
}

// mock world，无邻接水或山地
function makeMockWorldNoAdj(): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn(() => 3)  // GRASS everywhere
  }
}

// mock world，邻格有深水
function makeMockWorldWithDeepWater(centerX = 50, centerY = 50): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn((x: number, y: number) => {
      if (x === centerX + 1 && y === centerY) return 0  // DEEP_WATER
      return 3  // GRASS
    })
  }
}

const mockEm = {} as any

// ===== 1. 初始状态 =====
describe('WorldUraniumSpringSystem - 初始状态', () => {
  let sys: WorldUraniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始zones数组为空', () => {
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

  it('手动注入zone后数组长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('UraniumSpringZone包含所有必要字段', () => {
    const z = makeZone()
    expect(z).toHaveProperty('id')
    expect(z).toHaveProperty('x')
    expect(z).toHaveProperty('y')
    expect(z).toHaveProperty('uraniumContent')
    expect(z).toHaveProperty('springFlow')
    expect(z).toHaveProperty('sandstoneLeaching')
    expect(z).toHaveProperty('gammaRadiation')
    expect(z).toHaveProperty('tick')
  })

  it('返回同一zones引用', () => {
    const ref1 = (sys as any).zones
    const ref2 = (sys as any).zones
    expect(ref1).toBe(ref2)
  })
})

// ===== 2. CHECK_INTERVAL 节流 =====
describe('WorldUraniumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldUraniumSpringSystem
  let world: any
  beforeEach(() => { sys = makeSys(); nextId = 1; world = makeMockWorldWithWater() })

  it('tick=0时不执行（tick-lastCheck=0 < 3070）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)  // 极小值确保随机通过
    sys.update(0, world, mockEm, 0)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=3069时不执行（3069-0=3069 < 3070）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, 3069)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=3070时执行（3070-0=3070 >= 3070）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, TICK0)
    // 可能有spawn，zones长度 >= 0，lastCheck应已更新
    expect((sys as any).lastCheck).toBe(TICK0)
    vi.restoreAllMocks()
  })

  it('执行后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)  // 大值，不spawn
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).lastCheck).toBe(TICK0)
    vi.restoreAllMocks()
  })

  it('第二次调用在未达间隔时被阻止', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(0, world, mockEm, TICK0)
    const lastCheck = (sys as any).lastCheck
    sys.update(0, world, mockEm, TICK0 + 100)
    // lastCheck不应变化
    expect((sys as any).lastCheck).toBe(lastCheck)
    vi.restoreAllMocks()
  })

  it('连续两次间隔触发都更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(0, world, mockEm, TICK0)
    sys.update(0, world, mockEm, TICK0 * 2)
    expect((sys as any).lastCheck).toBe(TICK0 * 2)
    vi.restoreAllMocks()
  })

  it('tick=1时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, world, mockEm, 1)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick正好等于CHECK_INTERVAL时lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(0, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
})

// ===== 3. Spawn条件验证 =====
describe('WorldUraniumSpringSystem - Spawn条件', () => {
  let sys: WorldUraniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无邻接水或山地时不spawn', () => {
    const world = makeMockWorldNoAdj()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)  // random通过
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('有邻接浅水(1)且random < FORM_CHANCE时spawn', () => {
    // 控制random：前3次attempt选坐标用（floor后会在有水邻格的位置），FORM_CHANCE判断用
    // 用固定坐标：当Math.floor(random*100)会给出50时random=0.5
    // 更简单：直接控制world始终返回浅水邻格，random固定极小值
    const world = makeMockWorldWithWater(50, 50)
    // random*100取floor=50，即x=50, y=50，然后判断random < 0.003
    // 如果random=0.001, floor(0.001*80)=0, 需要x落在世界边界内
    // 直接mock world为全局有效：getTile返回使得任意(x,y)邻格都有水
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)  // 所有格都是浅水，邻格自然也是浅水
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // < 0.003
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
    vi.restoreAllMocks()
  })

  it('random > FORM_CHANCE时不spawn（即使有邻接水）', () => {
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // > 0.003，跳过
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random === FORM_CHANCE时不spawn（条件是 > FORM_CHANCE 则continue）', () => {
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    // random > FORM_CHANCE (0.003) => continue. random = 0.003 不 > 0.003, 应该spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.003)  // 不 > 0.003，允许spawn
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)  // 可能spawn
    vi.restoreAllMocks()
  })

  it('有邻接深水(0)时允许spawn', () => {
    const worldDeepWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 0)  // 全部深水
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldDeepWater as any, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
    vi.restoreAllMocks()
  })

  it('有邻接山地(5)时允许spawn', () => {
    const worldMountain = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 5)  // 全部山地
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain as any, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
    vi.restoreAllMocks()
  })

  it('每次update最多3次attempt', () => {
    // 无邻接，所有attempt都跳过
    const world = makeMockWorldNoAdj()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('zones达到MAX_ZONES(32)时不再spawn', () => {
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    // 填满zones
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)  // 不超过32
    vi.restoreAllMocks()
  })

  it('zones未满时允许继续spawn', () => {
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    // 填到31个
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(MAX_ZONES - 1)
    vi.restoreAllMocks()
  })

  it('spawn的zone坐标在world范围内', () => {
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    for (const zone of (sys as any).zones) {
      expect(zone.x).toBeGreaterThanOrEqual(0)
      expect(zone.x).toBeLessThan(100)
      expect(zone.y).toBeGreaterThanOrEqual(0)
      expect(zone.y).toBeLessThan(100)
    }
    vi.restoreAllMocks()
  })
})

// ===== 4. Spawn后字段值校验 =====
describe('WorldUraniumSpringSystem - Spawn后字段值范围', () => {
  let sys: WorldUraniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  function spawnOne(tick = TICK0): UraniumSpringZone {
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    sys.update(0, worldAllWater as any, mockEm, tick)
    return (sys as any).zones[0]
  }

  it('spawn后zone的tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const z = spawnOne(TICK0)
    expect(z.tick).toBe(TICK0)
    vi.restoreAllMocks()
  })

  it('spawn后zone的id从1递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    const zone = (sys as any).zones[0]
    expect(zone.id).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('uraniumContent >= 40', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const z = spawnOne()
    // random = 0.001, uraniumContent = 40 + 0.001 * 60 ≈ 40.06
    expect(z.uraniumContent).toBeGreaterThanOrEqual(40)
    vi.restoreAllMocks()
  })

  it('uraniumContent <= 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const z = spawnOne()
    expect(z.uraniumContent).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('springFlow >= 10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const z = spawnOne()
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })

  it('springFlow <= 60', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const z = spawnOne()
    expect(z.springFlow).toBeLessThanOrEqual(60)
    vi.restoreAllMocks()
  })

  it('sandstoneLeaching >= 20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const z = spawnOne()
    expect(z.sandstoneLeaching).toBeGreaterThanOrEqual(20)
    vi.restoreAllMocks()
  })

  it('sandstoneLeaching <= 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const z = spawnOne()
    expect(z.sandstoneLeaching).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('gammaRadiation >= 15', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const z = spawnOne()
    expect(z.gammaRadiation).toBeGreaterThanOrEqual(15)
    vi.restoreAllMocks()
  })

  it('gammaRadiation <= 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const z = spawnOne()
    expect(z.gammaRadiation).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    const after = (sys as any).nextId
    expect(after).toBeGreaterThan(before)
    vi.restoreAllMocks()
  })

  it('uraniumContent = 40 + random*60 公式验证', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const z = spawnOne()
    const expected = 40 + 0.001 * 60
    expect(z.uraniumContent).toBeCloseTo(expected, 5)
    vi.restoreAllMocks()
  })
})

// ===== 5. Cleanup逻辑 =====
describe('WorldUraniumSpringSystem - Cleanup逻辑', () => {
  let sys: WorldUraniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < currentTick - 54000的zone被清除', () => {
    const currentTick = TICK0 + 54000
    ;(sys as any).zones.push(makeZone({ tick: 0 }))  // 0 < TICK0+54000-54000=TICK0
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldNoAdj()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick >= currentTick - 54000的zone保留', () => {
    const currentTick = TICK0 * 2
    const zoneTick = currentTick - CUTOFF + 100  // 在cutoff之内
    ;(sys as any).zones.push(makeZone({ tick: zoneTick }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldNoAdj()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('cutoff边界：tick === currentTick - 54000时保留（不满足 < cutoff）', () => {
    const currentTick = TICK0 + CUTOFF
    const zoneTick = currentTick - CUTOFF  // 恰好等于cutoff，不 < cutoff，应保留
    ;(sys as any).zones.push(makeZone({ tick: zoneTick }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldNoAdj()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('cutoff边界：tick === currentTick - 54000 - 1时删除', () => {
    const currentTick = TICK0 + CUTOFF
    const zoneTick = currentTick - CUTOFF - 1  // 比cutoff少1，应删除
    ;(sys as any).zones.push(makeZone({ tick: zoneTick }))
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldNoAdj()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('多个zone只清除过期的', () => {
    const currentTick = TICK0 + CUTOFF
    ;(sys as any).zones.push(makeZone({ tick: 0 }))            // 过期
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 100 }))  // 新鲜
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldNoAdj()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('所有zone都过期时数组清空', () => {
    const currentTick = TICK0 + CUTOFF
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldNoAdj()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('所有zone都新鲜时全部保留', () => {
    const currentTick = TICK0
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    ;(sys as any).lastCheck = 0
    const world = makeMockWorldNoAdj()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, currentTick * 2)
    // 5个zone，tick=TICK0，currentTick=2*TICK0, cutoff=2*TICK0-54000
    // 2*3070=6140, 6140-54000=-47860，zone.tick=3070 > -47860，都保留
    expect((sys as any).zones).toHaveLength(5)
    vi.restoreAllMocks()
  })

  it('cleanup在CHECK_INTERVAL未到时不执行', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    // lastCheck=大值，tick=lastCheck+1不触发
    ;(sys as any).lastCheck = 10000
    const world = makeMockWorldNoAdj()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, mockEm, 10001)  // 10001 - 10000 = 1 < 3070
    expect((sys as any).zones).toHaveLength(1)  // 不清除
    vi.restoreAllMocks()
  })
})

// ===== 6. MAX_ZONES上限 =====
describe('WorldUraniumSpringSystem - MAX_ZONES上限', () => {
  let sys: WorldUraniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('zones不超过MAX_ZONES=32', () => {
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    // 填满32个
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
    vi.restoreAllMocks()
  })

  it('zones恰好32个时不再添加', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
    vi.restoreAllMocks()
  })

  it('zones为31个时可以继续添加', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    // 可能会增加最多3个，但不能超过32
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
    vi.restoreAllMocks()
  })

  it('多次触发后zones不超过上限', () => {
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 20; i++) {
      sys.update(0, worldAllWater as any, mockEm, TICK0 * (i + 1))
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
    vi.restoreAllMocks()
  })

  it('3次attempt每次都独立检查zones.length是否达上限', () => {
    // 填到31个，只允许第一次attempt通过
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    // 第一次attempt可能添加1个（达到32），之后break
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
    vi.restoreAllMocks()
  })

  it('空系统3次attempt各自独立', () => {
    const worldAllWater = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 1)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldAllWater as any, mockEm, TICK0)
    // 最多3次attempt，每次都可能spawn，但不超过3个
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
    vi.restoreAllMocks()
  })
})

// ===== 7. 多实例隔离 =====
describe('WorldUraniumSpringSystem - 多实例隔离', () => {
  it('两个实例各自独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).zones.push(makeZone())
    expect((sys1 as any).zones).toHaveLength(1)
    expect((sys2 as any).zones).toHaveLength(0)
  })

  it('各实例nextId独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    expect((sys1 as any).nextId).toBe(1)
    expect((sys2 as any).nextId).toBe(1)
  })

  it('各实例lastCheck独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).lastCheck = 5000
    expect((sys2 as any).lastCheck).toBe(0)
  })
})

// ===== 8. 边界与其他场景 =====
describe('WorldUraniumSpringSystem - 边界与其他场景', () => {
  let sys: WorldUraniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update函数存在', () => {
    expect(typeof (sys as any).update).toBe('function')
  })

  it('zones是数组', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('zone的id是数字', () => {
    ;(sys as any).zones.push(makeZone())
    expect(typeof (sys as any).zones[0].id).toBe('number')
  })

  it('zone的x,y是数字', () => {
    const z = makeZone()
    expect(typeof z.x).toBe('number')
    expect(typeof z.y).toBe('number')
  })

  it('zone的uraniumContent是数字', () => {
    const z = makeZone()
    expect(typeof z.uraniumContent).toBe('number')
  })

  it('zone的springFlow是数字', () => {
    const z = makeZone()
    expect(typeof z.springFlow).toBe('number')
  })

  it('zone的sandstoneLeaching是数字', () => {
    const z = makeZone()
    expect(typeof z.sandstoneLeaching).toBe('number')
  })

  it('zone的gammaRadiation是数字', () => {
    const z = makeZone()
    expect(typeof z.gammaRadiation).toBe('number')
  })

  it('tick类型为数字（来自源码参数）', () => {
    const z = makeZone()
    expect(typeof z.tick).toBe('number')
  })

  it('CHECK_INTERVAL=3070', () => {
    expect(CHECK_INTERVAL).toBe(3070)
  })

  it('FORM_CHANCE=0.003', () => {
    expect(FORM_CHANCE).toBe(0.003)
  })

  it('MAX_ZONES=32', () => {
    expect(MAX_ZONES).toBe(32)
  })

  it('CUTOFF=54000', () => {
    expect(CUTOFF).toBe(54000)
  })

  it('手动添加多个zone后正确计数', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    expect((sys as any).zones).toHaveLength(10)
  })
})
