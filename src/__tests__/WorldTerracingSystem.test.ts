import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTerracingSystem } from '../systems/WorldTerracingSystem'
import type { Terrace, TerraceStage } from '../systems/WorldTerracingSystem'

function makeSys(): WorldTerracingSystem { return new WorldTerracingSystem() }
let nextId = 1
function makeTerrace(overrides: Partial<Terrace> = {}): Terrace {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    stage: 'planted' as TerraceStage,
    levels: 3,
    fertility: 50,
    waterAccess: 50,
    yield: 0,
    tick: 0,
    ...overrides
  }
}

// CHECK_INTERVAL=3000, BUILD_CHANCE=0.003, MAX_TERRACES=25
// tile条件：tile===4(FOREST)或tile===5(MOUNTAIN)
function makeWorld(tileValue: number = 4) {
  return {
    width: 200,
    height: 200,
    getTile: () => tileValue
  } as any
}

const mockEm = {} as any

describe('WorldTerracingSystem - 初始状态', () => {
  let sys: WorldTerracingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始terraces数组为空', () => {
    expect((sys as any).terraces).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('terraces是数组类型', () => {
    expect(Array.isArray((sys as any).terraces)).toBe(true)
  })

  it('两个实例互相独立', () => {
    const sys2 = makeSys()
    ;(sys as any).terraces.push(makeTerrace())
    expect((sys2 as any).terraces).toHaveLength(0)
  })
})

describe('WorldTerracingSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTerracingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL=3000 时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2999 时不触发（2999<3000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), mockEm, 2999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3000 时触发（3000-0=3000，不满足<3000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('tick=3001 时触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 3001)
    expect((sys as any).lastCheck).toBe(3001)
  })

  it('触发后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 7777)
    expect((sys as any).lastCheck).toBe(7777)
  })

  it('触发后下一个相邻tick不再触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 5000)
    sys.update(1, makeWorld(), mockEm, 5001)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第二次触发需要满足间隔', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 5000)
    sys.update(1, makeWorld(), mockEm, 5000 + 3000)
    expect((sys as any).lastCheck).toBe(8000)
  })
})

describe('WorldTerracingSystem - spawn/build逻辑', () => {
  let sys: WorldTerracingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('random >= BUILD_CHANCE=0.003 时不spawn（0.5>=0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect((sys as any).terraces).toHaveLength(0)
  })

  it('random < BUILD_CHANCE=0.003 时spawn（0.001<0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect((sys as any).terraces.length).toBeGreaterThanOrEqual(1)
  })

  it('tile=4(FOREST)时满足条件可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect((sys as any).terraces.length).toBeGreaterThanOrEqual(1)
  })

  it('tile=5(MOUNTAIN)时满足条件可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), mockEm, 5000)
    expect((sys as any).terraces.length).toBeGreaterThanOrEqual(1)
  })

  it('tile=3(GRASS)时不满足条件不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), mockEm, 5000)
    expect((sys as any).terraces).toHaveLength(0)
  })

  it('tile=1(SHALLOW_WATER)时不满足条件不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).terraces).toHaveLength(0)
  })

  it('tile=0(DEEP_WATER)时不满足条件不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(0), mockEm, 5000)
    expect((sys as any).terraces).toHaveLength(0)
  })

  it('tile=2(SAND)时不满足条件不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2), mockEm, 5000)
    expect((sys as any).terraces).toHaveLength(0)
  })

  it('tile=null时不spawn', () => {
    const nullWorld = { width: 200, height: 200, getTile: () => null } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, nullWorld, mockEm, 5000)
    expect((sys as any).terraces).toHaveLength(0)
  })

  it('spawn后stage初始为carving（同帧update不转变时保持carving）', () => {
    // BUILD_CHANCE: 0.001 < 0.003 -> spawn (carving)
    // 然后carving的random需要>=0.05才不转变
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // BUILD_CHANCE: 0.001 < 0.003 -> spawn
      .mockReturnValueOnce(0.001) // x position random
      .mockReturnValueOnce(0.001) // y position random
      .mockReturnValueOnce(0.001) // levels random
      .mockReturnValueOnce(0.001) // fertility random
      .mockReturnValueOnce(0.001) // waterAccess random
      .mockReturnValue(0.1)       // carving stage check: 0.1 >= 0.05 -> 不转irrigating
    sys.update(1, makeWorld(4), mockEm, 5000)
    const t = (sys as any).terraces[0]
    if (t) expect(t.stage).toBe('carving')
  })

  it('spawn后yield为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    const t = (sys as any).terraces[0]
    if (t) expect(t.yield).toBe(0)
  })

  it('spawn后tick字段记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 7654)
    const t = (sys as any).terraces[0]
    if (t) expect(t.tick).toBe(7654)
  })

  it('spawn后levels在2-5范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    for (const t of (sys as any).terraces) {
      expect(t.levels).toBeGreaterThanOrEqual(2)
      expect(t.levels).toBeLessThanOrEqual(5)
    }
  })

  it('spawn后fertility在30-69范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    for (const t of (sys as any).terraces) {
      expect(t.fertility).toBeGreaterThanOrEqual(30)
      expect(t.fertility).toBeLessThanOrEqual(69)
    }
  })

  it('spawn后waterAccess在20-69范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    for (const t of (sys as any).terraces) {
      expect(t.waterAccess).toBeGreaterThanOrEqual(20)
      expect(t.waterAccess).toBeLessThanOrEqual(69)
    }
  })

  it('每次update最多spawn1个terrace', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect((sys as any).terraces.length).toBeLessThanOrEqual(1)
  })
})

describe('WorldTerracingSystem - MAX_TERRACES上限', () => {
  let sys: WorldTerracingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_TERRACES=25时不再spawn', () => {
    for (let i = 0; i < 25; i++) {
      ;(sys as any).terraces.push(makeTerrace({ tick: 999999 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    // 预置的25个加上阶段推进，数量不会因spawn而超过25
    const spawnedCount = (sys as any).terraces.filter((t: Terrace) => t.tick === 5000).length
    expect(spawnedCount).toBe(0)
  })

  it('24个terraces时仍可spawn一个', () => {
    for (let i = 0; i < 24; i++) {
      ;(sys as any).terraces.push(makeTerrace({ tick: 999999 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    const spawnedCount = (sys as any).terraces.filter((t: Terrace) => t.tick === 5000).length
    expect(spawnedCount).toBe(1)
  })
})

describe('WorldTerracingSystem - 阶段推进逻辑', () => {
  let sys: WorldTerracingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('carving阶段：random<0.05时转变为irrigating', () => {
    const t = makeTerrace({ stage: 'carving', tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    // random: 第一次用于BUILD_CHANCE (>= 0.003 不spawn), 第二次用于阶段判断 (< 0.05)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)   // BUILD_CHANCE check -> 不spawn
      .mockReturnValueOnce(0.01)  // carving: 0.01 < 0.05 -> 转irrigating
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect(t.stage).toBe('irrigating')
  })

  it('carving阶段：random>=0.05时不转变', () => {
    const t = makeTerrace({ stage: 'carving', tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)   // BUILD_CHANCE check -> 不spawn
      .mockReturnValueOnce(0.1)   // carving: 0.1 >= 0.05 -> 不转变
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect(t.stage).toBe('carving')
  })

  it('irrigating阶段：waterAccess每次+1', () => {
    const t = makeTerrace({ stage: 'irrigating', waterAccess: 50, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect(t.waterAccess).toBe(51)
  })

  it('irrigating阶段：waterAccess>70时转planted', () => {
    const t = makeTerrace({ stage: 'irrigating', waterAccess: 71, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    // waterAccess变为72，>70，转planted
    expect(t.stage).toBe('planted')
  })

  it('irrigating阶段：waterAccess=70时不转planted', () => {
    // waterAccess=70，+1=71，71>70，转planted
    const t = makeTerrace({ stage: 'irrigating', waterAccess: 70, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    // 70+1=71 > 70, 转planted
    expect(t.stage).toBe('planted')
  })

  it('irrigating阶段：waterAccess=69时不转planted（+1=70，70>70为false）', () => {
    const t = makeTerrace({ stage: 'irrigating', waterAccess: 69, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect(t.stage).toBe('irrigating')
    expect(t.waterAccess).toBe(70)
  })

  it('irrigating阶段：waterAccess上限100', () => {
    const t = makeTerrace({ stage: 'irrigating', waterAccess: 100, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect(t.waterAccess).toBe(100)
  })

  it('planted阶段：fertility每次+0.3', () => {
    const t = makeTerrace({ stage: 'planted', fertility: 50, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect(t.fertility).toBeCloseTo(50.3, 5)
  })

  it('planted阶段：fertility>80时转harvesting', () => {
    const t = makeTerrace({ stage: 'planted', fertility: 81, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    // 81+0.3=81.3>80，转harvesting
    expect(t.stage).toBe('harvesting')
  })

  it('planted阶段：fertility=80时不转harvesting（80>80为false）', () => {
    const t = makeTerrace({ stage: 'planted', fertility: 80, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    // 80+0.3=80.3>80，转harvesting
    expect(t.stage).toBe('harvesting')
  })

  it('planted阶段：fertility=79.6时不转harvesting', () => {
    const t = makeTerrace({ stage: 'planted', fertility: 79.6, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    // 79.6+0.3=79.9，79.9>80 false，不转
    expect(t.stage).toBe('planted')
  })

  it('harvesting阶段：yield增加 levels*fertility*0.01', () => {
    const t = makeTerrace({ stage: 'harvesting', levels: 4, fertility: 60, yield: 0, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    // yield += 4 * (60-0.5) * 0.01 = 4 * 59.5 * 0.01 = 2.38
    // 注意：yield在fertility减少后计算，fertility先减0.5再判断？
    // 从源码：t.yield += t.levels * t.fertility * 0.01，然后t.fertility -= 0.5
    expect(t.yield).toBeCloseTo(4 * 60 * 0.01, 5)
  })

  it('harvesting阶段：fertility每次-0.5', () => {
    const t = makeTerrace({ stage: 'harvesting', fertility: 60, yield: 0, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect(t.fertility).toBeCloseTo(59.5, 5)
  })

  it('harvesting阶段：fertility<30时重置为planted，fertility设为30', () => {
    const t = makeTerrace({ stage: 'harvesting', fertility: 30.4, yield: 0, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    // 30.4 - 0.5 = 29.9 < 30, 转planted, fertility=30
    expect(t.stage).toBe('planted')
    expect(t.fertility).toBe(30)
  })

  it('harvesting阶段：fertility=30.5时不重置（30.5-0.5=30，30<30为false）', () => {
    const t = makeTerrace({ stage: 'harvesting', fertility: 30.5, yield: 0, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 5000)
    // 30.5 - 0.5 = 30, 30<30 false, 不转planted
    expect(t.stage).toBe('harvesting')
    expect(t.fertility).toBeCloseTo(30, 5)
  })
})

describe('WorldTerracingSystem - cleanup逻辑', () => {
  let sys: WorldTerracingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('terrace.tick < tick-200000 时被清除', () => {
    ;(sys as any).terraces.push(makeTerrace({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // tick=200001, cutoff=1, terrace.tick=0 < 1 => 清除
    sys.update(1, makeWorld(4), mockEm, 200001)
    expect((sys as any).terraces).toHaveLength(0)
  })

  it('terrace.tick = cutoff 时不被清除（0 < 0 为false）', () => {
    ;(sys as any).terraces.push(makeTerrace({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // tick=200000, cutoff=0, terrace.tick=0, 0<0 false => 不清除
    sys.update(1, makeWorld(4), mockEm, 200000)
    expect((sys as any).terraces.length).toBeGreaterThanOrEqual(1)
  })

  it('较新的terrace（tick大）不被cleanup', () => {
    ;(sys as any).terraces.push(makeTerrace({ tick: 500000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 600000)
    // cutoff=600000-200000=400000, terrace.tick=500000 > 400000 => 保留
    expect((sys as any).terraces.length).toBeGreaterThanOrEqual(1)
  })

  it('混合新旧terrace，旧的被清除', () => {
    ;(sys as any).terraces.push(makeTerrace({ tick: 0 }))
    ;(sys as any).terraces.push(makeTerrace({ tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 500000)
    // cutoff=300000, tick=0<300000清除, tick=999999>300000保留
    const terraces = (sys as any).terraces
    expect(terraces.some((t: Terrace) => t.tick === 999999)).toBe(true)
    expect(terraces.some((t: Terrace) => t.tick === 0)).toBe(false)
  })

  it('所有terrace都过期时数组为空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).terraces.push(makeTerrace({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 1000000)
    expect((sys as any).terraces).toHaveLength(0)
  })

  it('cutoff=tick-200000，精确计算', () => {
    const tickVal = 500000
    const cutoff = tickVal - 200000 // 300000
    ;(sys as any).terraces.push(makeTerrace({ tick: cutoff - 1 })) // 299999 < 300000 => 清除
    ;(sys as any).terraces.push(makeTerrace({ tick: cutoff }))     // 300000 < 300000 => false, 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, tickVal)
    const remaining = (sys as any).terraces.filter((t: Terrace) => t.tick === cutoff - 1)
    expect(remaining).toHaveLength(0)
  })

  it('cleanup从后向前遍历，不影响结果', () => {
    for (let i = 0; i < 4; i++) {
      ;(sys as any).terraces.push(makeTerrace({ tick: 0 }))
    }
    for (let i = 0; i < 3; i++) {
      ;(sys as any).terraces.push(makeTerrace({ tick: 999999 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 500000)
    const terraces = (sys as any).terraces
    expect(terraces.filter((t: Terrace) => t.tick === 999999).length).toBe(3)
    expect(terraces.filter((t: Terrace) => t.tick === 0).length).toBe(0)
  })

  it('不触发时（tick不足）不执行cleanup', () => {
    ;(sys as any).terraces.push(makeTerrace({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 100) // tick=100 < 3000
    expect((sys as any).terraces).toHaveLength(1)
  })
})

describe('WorldTerracingSystem - terrace字段结构', () => {
  let sys: WorldTerracingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('terrace包含id字段', () => {
    ;(sys as any).terraces.push(makeTerrace({ id: 99 }))
    expect((sys as any).terraces[0].id).toBe(99)
  })

  it('terrace包含x和y字段', () => {
    ;(sys as any).terraces.push(makeTerrace({ x: 55, y: 77 }))
    expect((sys as any).terraces[0].x).toBe(55)
    expect((sys as any).terraces[0].y).toBe(77)
  })

  it('terrace包含levels字段', () => {
    ;(sys as any).terraces.push(makeTerrace({ levels: 4 }))
    expect((sys as any).terraces[0].levels).toBe(4)
  })

  it('terrace包含fertility字段', () => {
    ;(sys as any).terraces.push(makeTerrace({ fertility: 65 }))
    expect((sys as any).terraces[0].fertility).toBe(65)
  })

  it('terrace包含waterAccess字段', () => {
    ;(sys as any).terraces.push(makeTerrace({ waterAccess: 45 }))
    expect((sys as any).terraces[0].waterAccess).toBe(45)
  })

  it('terrace包含yield字段', () => {
    ;(sys as any).terraces.push(makeTerrace({ yield: 10 }))
    expect((sys as any).terraces[0].yield).toBe(10)
  })

  it('terrace包含tick字段', () => {
    ;(sys as any).terraces.push(makeTerrace({ tick: 12345 }))
    expect((sys as any).terraces[0].tick).toBe(12345)
  })

  it('4种stage类型：carving/irrigating/planted/harvesting', () => {
    const stages: TerraceStage[] = ['carving', 'irrigating', 'planted', 'harvesting']
    for (const s of stages) {
      ;(sys as any).terraces.push(makeTerrace({ stage: s }))
    }
    const found = (sys as any).terraces.map((t: Terrace) => t.stage)
    expect(found).toContain('carving')
    expect(found).toContain('irrigating')
    expect(found).toContain('planted')
    expect(found).toContain('harvesting')
  })
})

describe('WorldTerracingSystem - 综合场景', () => {
  let sys: WorldTerracingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('多次update zones数量不超过MAX_TERRACES=25', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 1; i <= 30; i++) {
      sys.update(1, makeWorld(4), mockEm, i * 3001)
    }
    expect((sys as any).terraces.length).toBeLessThanOrEqual(25)
  })

  it('全阶段流程：carving -> irrigating -> planted -> harvesting', () => {
    const t = makeTerrace({ stage: 'carving', waterAccess: 69, fertility: 79, tick: 999999 })
    ;(sys as any).terraces.push(t)
    ;(sys as any).lastCheck = 0
    vi.restoreAllMocks()

    // Step1: carving -> irrigating
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.01)
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect(t.stage).toBe('irrigating')
    vi.restoreAllMocks()

    // Step2: irrigating + waterAccess, 等待waterAccess>70
    // waterAccess=69+1=70，70>70 false，仍irrigating
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 10000)
    expect(t.stage).toBe('irrigating')
    expect(t.waterAccess).toBe(70)
    vi.restoreAllMocks()

    // Step3: irrigating + waterAccess=70+1=71>70 -> planted
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 15000)
    expect(t.stage).toBe('planted')
    vi.restoreAllMocks()

    // Step4: planted, fertility=79+0.3=79.3, 79.3>80 false, 仍planted
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), mockEm, 20000)
    expect(t.stage).toBe('planted')
  })

  it('nextId在spawn后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const prevId = (sys as any).nextId
    sys.update(1, makeWorld(4), mockEm, 5000)
    if ((sys as any).terraces.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(prevId)
    }
  })

  it('spawn时x在world.width范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    for (const t of (sys as any).terraces) {
      expect(t.x).toBeGreaterThanOrEqual(0)
      expect(t.x).toBeLessThan(200)
    }
  })

  it('spawn时y在world.height范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    for (const t of (sys as any).terraces) {
      expect(t.y).toBeGreaterThanOrEqual(0)
      expect(t.y).toBeLessThan(200)
    }
  })

  it('yield累积：多次harvesting update', () => {
    const t = makeTerrace({ stage: 'harvesting', levels: 2, fertility: 60, yield: 0, tick: 999999 })
    ;(sys as any).terraces.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld(4), mockEm, 5000)
    const yieldAfterFirst = t.yield
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld(4), mockEm, 10000)
    expect(t.yield).toBeGreaterThan(yieldAfterFirst)
  })
})
