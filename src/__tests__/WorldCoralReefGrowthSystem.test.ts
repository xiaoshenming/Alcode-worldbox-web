import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldCoralReefGrowthSystem } from '../systems/WorldCoralReefGrowthSystem'
import type { CoralReef, CoralType } from '../systems/WorldCoralReefGrowthSystem'

function makeSys(): WorldCoralReefGrowthSystem { return new WorldCoralReefGrowthSystem() }
let nextId = 1
function makeReef(coralType: CoralType = 'brain', overrides: Partial<CoralReef> = {}): CoralReef {
  return { id: nextId++, x: 25, y: 35, coralType, coverage: 70, biodiversity: 85, health: 80, growthRate: 0.3, tick: 0, ...overrides }
}

const SAFE_WORLD = { width: 200, height: 200, getTile: (x: number, y: number) => 3 }
const SHALLOW_WORLD = { width: 200, height: 200, getTile: (x: number, y: number) => 1 }

describe('WorldCoralReefGrowthSystem - 基础状态', () => {
  let sys: WorldCoralReefGrowthSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珊瑚礁', () => { expect((sys as any).reefs).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).reefs.push(makeReef())
    expect((sys as any).reefs).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).reefs).toBe((sys as any).reefs)
  })
  it('支持5种珊瑚类型', () => {
    const types: CoralType[] = ['brain', 'staghorn', 'fan', 'table', 'pillar']
    expect(types).toHaveLength(5)
  })
  it('珊瑚礁字段正确', () => {
    ;(sys as any).reefs.push(makeReef('staghorn'))
    const r = (sys as any).reefs[0]
    expect(r.coralType).toBe('staghorn')
    expect(r.coverage).toBe(70)
    expect(r.health).toBe(80)
  })
})

describe('WorldCoralReefGrowthSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldCoralReefGrowthSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足时不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SHALLOW_WORLD as any, {} as any, 100)
    sys.update(1, SHALLOW_WORLD as any, {} as any, 200)
    expect((sys as any).reefs).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick >= CHECK_INTERVAL(4500)后触发检查', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    expect((sys as any).lastCheck).toBe(4500)
    vi.restoreAllMocks()
  })

  it('连续两次调用间隔不足时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    const countAfterFirst = (sys as any).reefs.length
    sys.update(1, SAFE_WORLD as any, {} as any, 4600)
    expect((sys as any).reefs.length).toBe(countAfterFirst)
    vi.restoreAllMocks()
  })
})

describe('WorldCoralReefGrowthSystem - spawn生成', () => {
  let sys: WorldCoralReefGrowthSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('SHALLOW_WATER(tile=1)触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < GROW_CHANCE=0.003
    sys.update(1, SHALLOW_WORLD as any, {} as any, 4500)
    expect((sys as any).reefs).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('GRASS地形(tile=3)不触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    expect((sys as any).reefs).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random >= GROW_CHANCE(0.003)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SHALLOW_WORLD as any, {} as any, 4500)
    expect((sys as any).reefs).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('已达MAX_REEFS(12)时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 12; i++) {
      (sys as any).reefs.push(makeReef())
    }
    sys.update(1, SHALLOW_WORLD as any, {} as any, 4500)
    expect((sys as any).reefs).toHaveLength(12)
    vi.restoreAllMocks()
  })

  it('新spawn的coverage在5-14范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, SHALLOW_WORLD as any, {} as any, 4500)
    const r = (sys as any).reefs[0]
    expect(r.coverage).toBeGreaterThanOrEqual(5)
    expect(r.coverage).toBeLessThanOrEqual(14)
    vi.restoreAllMocks()
  })

  it('新spawn的health在80-99范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, SHALLOW_WORLD as any, {} as any, 4500)
    const r = (sys as any).reefs[0]
    expect(r.health).toBeGreaterThanOrEqual(80)
    expect(r.health).toBeLessThanOrEqual(99)
    vi.restoreAllMocks()
  })
})

describe('WorldCoralReefGrowthSystem - 覆盖率增长', () => {
  let sys: WorldCoralReefGrowthSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('health>50时coverage按growthRate增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const r = makeReef('brain', { health: 80, coverage: 50, growthRate: 0.3 })
    ;(sys as any).reefs.push(r)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    // coverage增量 = growthRate * 0.01 = 0.3 * 0.01 = 0.003
    expect(r.coverage).toBeCloseTo(50.003, 5)
    vi.restoreAllMocks()
  })

  it('health<=50时coverage不增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const r = makeReef('brain', { health: 50, coverage: 50, growthRate: 0.3 })
    ;(sys as any).reefs.push(r)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    expect(r.coverage).toBe(50)
    vi.restoreAllMocks()
  })

  it('coverage增长上限为100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const r = makeReef('staghorn', { health: 80, coverage: 99.999, growthRate: 0.8 })
    ;(sys as any).reefs.push(r)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    expect(r.coverage).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('biodiversity每次增加0.005上限100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const r = makeReef('fan', { health: 80, biodiversity: 99.999 })
    ;(sys as any).reefs.push(r)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    expect(r.biodiversity).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('staghorn类型growthRate最大(0.8)增长最快', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const brain = makeReef('brain', { health: 80, coverage: 50, growthRate: 0.3 })
    const staghorn = makeReef('staghorn', { health: 80, coverage: 50, growthRate: 0.8 })
    ;(sys as any).reefs.push(brain, staghorn)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    expect(staghorn.coverage).toBeGreaterThan(brain.coverage)
    vi.restoreAllMocks()
  })
})

describe('WorldCoralReefGrowthSystem - health老化退化', () => {
  let sys: WorldCoralReefGrowthSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('age>120000时health下降0.02', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=0时创建，当前tick=130000，age=130000>120000
    const r = makeReef('brain', { health: 80, coverage: 50, tick: 0 })
    ;(sys as any).reefs.push(r)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 130000)
    expect(r.health).toBeCloseTo(79.98, 5)
    vi.restoreAllMocks()
  })

  it('health退化下限为10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const r = makeReef('brain', { health: 10, coverage: 50, tick: 0 })
    ;(sys as any).reefs.push(r)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 130000)
    expect(r.health).toBe(10)
    vi.restoreAllMocks()
  })

  it('age<=120000时health不退化，保持原值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const r = makeReef('brain', { health: 80, coverage: 50, tick: 0 })
    ;(sys as any).reefs.push(r)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 120000)
    // age = 120000 - 0 = 120000，不满足 > 120000，health不退化保持80
    expect(r.health).toBe(80)
    vi.restoreAllMocks()
  })
})

describe('WorldCoralReefGrowthSystem - cleanup（双条件删除）', () => {
  let sys: WorldCoralReefGrowthSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('health<=10且coverage<5时被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const r = makeReef('brain', { health: 5, coverage: 3 })
    ;(sys as any).reefs.push(r)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    expect((sys as any).reefs).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('health<=10但coverage>=5时不清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const r = makeReef('brain', { health: 5, coverage: 5 })
    ;(sys as any).reefs.push(r)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    expect((sys as any).reefs).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('health>10即使coverage<5也不清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const r = makeReef('brain', { health: 11, coverage: 3 })
    ;(sys as any).reefs.push(r)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    expect((sys as any).reefs).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('多个珊瑚礁中只清除满足双条件的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).reefs.push(makeReef('brain', { health: 5, coverage: 3 }))    // 删除
    ;(sys as any).reefs.push(makeReef('fan', { health: 5, coverage: 5 }))      // 保留
    ;(sys as any).reefs.push(makeReef('table', { health: 80, coverage: 70 }))  // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    expect((sys as any).reefs).toHaveLength(2)
    vi.restoreAllMocks()
  })

  it('health恰好为10且coverage恰好为4时被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const r = makeReef('pillar', { health: 10, coverage: 4 })
    ;(sys as any).reefs.push(r)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4500)
    expect((sys as any).reefs).toHaveLength(0)
    vi.restoreAllMocks()
  })
})
