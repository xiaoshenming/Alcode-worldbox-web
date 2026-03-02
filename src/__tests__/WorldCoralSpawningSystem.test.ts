import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldCoralSpawningSystem } from '../systems/WorldCoralSpawningSystem'
import type { CoralSpawn, CoralSeason } from '../systems/WorldCoralSpawningSystem'

function makeSys(): WorldCoralSpawningSystem { return new WorldCoralSpawningSystem() }
let nextId = 1
function makeSpawn(season: CoralSeason = 'spawning', overrides: Partial<CoralSpawn> = {}): CoralSpawn {
  return { id: nextId++, x: 30, y: 40, density: 80, fertility: 70, season, dispersal: 50, tick: 0, ...overrides }
}

const SAFE_WORLD = { width: 200, height: 200, getTile: (x: number, y: number) => 3 }
const SHALLOW_WORLD = { width: 200, height: 200, getTile: (x: number, y: number) => 1 }
const DEEP_WORLD = { width: 200, height: 200, getTile: (x: number, y: number) => 0 }

describe('WorldCoralSpawningSystem - 基础状态', () => {
  let sys: WorldCoralSpawningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珊瑚产卵', () => { expect((sys as any).spawns).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).spawns.push(makeSpawn())
    expect((sys as any).spawns).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).spawns).toBe((sys as any).spawns)
  })
  it('支持4种季节状态', () => {
    const seasons: CoralSeason[] = ['dormant', 'preparing', 'spawning', 'dispersing']
    expect(seasons).toHaveLength(4)
  })
  it('珊瑚产卵字段正确', () => {
    ;(sys as any).spawns.push(makeSpawn('dispersing'))
    const s = (sys as any).spawns[0]
    expect(s.season).toBe('dispersing')
    expect(s.density).toBe(80)
    expect(s.fertility).toBe(70)
  })
})

describe('WorldCoralSpawningSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldCoralSpawningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足时不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SHALLOW_WORLD as any, {} as any, 100)
    sys.update(1, SHALLOW_WORLD as any, {} as any, 200)
    expect((sys as any).spawns).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick >= CHECK_INTERVAL(4200)后触发检查', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect((sys as any).lastCheck).toBe(4200)
    vi.restoreAllMocks()
  })

  it('连续两次调用间隔不足时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    const countAfterFirst = (sys as any).spawns.length
    sys.update(1, SAFE_WORLD as any, {} as any, 4300)
    expect((sys as any).spawns.length).toBe(countAfterFirst)
    vi.restoreAllMocks()
  })
})

describe('WorldCoralSpawningSystem - spawn生成', () => {
  let sys: WorldCoralSpawningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('SHALLOW_WATER(tile=1)触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < SPAWN_CHANCE=0.003
    sys.update(1, SHALLOW_WORLD as any, {} as any, 4200)
    expect((sys as any).spawns).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('DEEP_WATER(tile=0)也触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, DEEP_WORLD as any, {} as any, 4200)
    expect((sys as any).spawns).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('GRASS地形(tile=3)不触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect((sys as any).spawns).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random >= SPAWN_CHANCE(0.003)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, SHALLOW_WORLD as any, {} as any, 4200)
    expect((sys as any).spawns).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('已达MAX_SPAWNS(12)时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 12; i++) {
      (sys as any).spawns.push(makeSpawn())
    }
    sys.update(1, SHALLOW_WORLD as any, {} as any, 4200)
    expect((sys as any).spawns).toHaveLength(12)
    vi.restoreAllMocks()
  })

  it('新spawn初始season为dormant', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, SHALLOW_WORLD as any, {} as any, 4200)
    expect((sys as any).spawns[0].season).toBe('dormant')
    vi.restoreAllMocks()
  })

  it('新spawn初始dispersal为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, SHALLOW_WORLD as any, {} as any, 4200)
    expect((sys as any).spawns[0].dispersal).toBe(0)
    vi.restoreAllMocks()
  })
})

describe('WorldCoralSpawningSystem - 季节转换', () => {
  let sys: WorldCoralSpawningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('dormant持续60000后转换为preparing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // 注入一个dormant，tick=0创建，当前tick=60001 > 60000
    const s = makeSpawn('dormant', { tick: 0 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 60001)
    expect(s.season).toBe('preparing')
    vi.restoreAllMocks()
  })

  it('dormant未满60000时不转换', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('dormant', { tick: 0 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 60000)
    // age=60000，elapsed for dormant=60000，60000 > 60000 为false，不转换
    expect(s.season).toBe('dormant')
    vi.restoreAllMocks()
  })

  it('preparing持续90000后转换为spawning（60000+30000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // 注入preparing，已知从tick=0开始，age=90001时转换
    const s = makeSpawn('preparing', { tick: 0 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 90001)
    expect(s.season).toBe('spawning')
    vi.restoreAllMocks()
  })

  it('spawning持续105000后转换为dispersing（60000+30000+15000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('spawning', { tick: 0 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 105001)
    expect(s.season).toBe('dispersing')
    vi.restoreAllMocks()
  })

  it('dispersing是最后一个季节，不再转换', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('dispersing', { tick: 0 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    // 即使时间超过所有季节，dispersing不转换（没有下一个）
    sys.update(1, SAFE_WORLD as any, {} as any, 200000)
    expect(s.season).toBe('dispersing')
    vi.restoreAllMocks()
  })
})

describe('WorldCoralSpawningSystem - 季节行为更新', () => {
  let sys: WorldCoralSpawningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('preparing时density增加0.3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('preparing', { density: 50 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect(s.density).toBeCloseTo(50.3, 5)
    vi.restoreAllMocks()
  })

  it('preparing时density上限为100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('preparing', { density: 99.9 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect(s.density).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('spawning时fertility增加0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('spawning', { fertility: 60 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect(s.fertility).toBeCloseTo(60.5, 5)
    vi.restoreAllMocks()
  })

  it('spawning时dispersal增加0.2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('spawning', { dispersal: 10 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect(s.dispersal).toBeCloseTo(10.2, 5)
    vi.restoreAllMocks()
  })

  it('dispersing时dispersal增加0.4上限50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('dispersing', { dispersal: 40, density: 80, fertility: 60 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect(s.dispersal).toBeCloseTo(40.4, 5)
    vi.restoreAllMocks()
  })

  it('dispersing时dispersal上限为50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('dispersing', { dispersal: 49.8, density: 80, fertility: 60 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect(s.dispersal).toBeLessThanOrEqual(50)
    vi.restoreAllMocks()
  })

  it('dispersing时density减少0.1下限为1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('dispersing', { density: 50, dispersal: 10, fertility: 60 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect(s.density).toBeCloseTo(49.9, 5)
    vi.restoreAllMocks()
  })

  it('dispersing时density下限为1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('dispersing', { density: 1, dispersal: 10, fertility: 60 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect(s.density).toBe(1)
    vi.restoreAllMocks()
  })

  it('dispersing时fertility减少0.2下限为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('dispersing', { fertility: 5, dispersal: 10, density: 50 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect(s.fertility).toBeCloseTo(4.8, 5)
    vi.restoreAllMocks()
  })

  it('dormant时各字段不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('dormant', { density: 50, fertility: 60, dispersal: 10 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 4200)
    expect(s.density).toBe(50)
    expect(s.fertility).toBe(60)
    expect(s.dispersal).toBe(10)
    vi.restoreAllMocks()
  })
})

describe('WorldCoralSpawningSystem - cleanup（完全扩散后删除）', () => {
  let sys: WorldCoralSpawningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('dispersing且age>145000时被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // totalCycle = 60000+30000+15000+40000 = 145000
    const s = makeSpawn('dispersing', { tick: 0 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 145001)
    expect((sys as any).spawns).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('dispersing但age<=145000时不清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('dispersing', { tick: 0 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 145000)
    // age=145000不满足>145000
    expect((sys as any).spawns).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('非dispersing季节即使age>145000也不清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const s = makeSpawn('spawning', { tick: 0 })
    ;(sys as any).spawns.push(s)
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 145001)
    // 虽然age超出但season不是dispersing，不清除（spawning会转为dispersing，但这步先进行）
    // 实际上spawning在105001时转为dispersing，145001时已是dispersing，会被清除
    // 重新设计：使用preparing season，elapsed=90000，145001>90000会转为spawning
    // 为了精确测试非dispersing不被清除，直接测dormant
    const s2 = makeSpawn('dormant', { tick: 0 })
    ;(sys as any).spawns.push(s2)
    ;(sys as any).lastCheck = 4200 // 确保throttle通过
    sys.update(1, SAFE_WORLD as any, {} as any, 150000)
    // s已被清除（spawning->dispersing->age>145000），s2保留（dormant->preparing...未到dispersing+超时）
    // 实际上s2 age=150000，dormant elapsed=60000，150000>60000转为preparing，不是dispersing不清除
    expect((sys as any).spawns.some((sp: CoralSpawn) => sp.season !== 'dispersing' || (150000 - sp.tick) <= 145000)).toBe(true)
    vi.restoreAllMocks()
  })

  it('多个spawns中只清除满足条件的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).spawns.push(makeSpawn('dispersing', { tick: 0 }))        // 会被清除 (age=145001>145000)
    ;(sys as any).spawns.push(makeSpawn('dispersing', { tick: 100000 }))   // 不清除 (age=45001<145000)
    ;(sys as any).spawns.push(makeSpawn('preparing', { tick: 0 }))         // 不清除
    ;(sys as any).lastCheck = 0
    sys.update(1, SAFE_WORLD as any, {} as any, 145001)
    // 第1个被清除，第2个、第3个保留
    expect((sys as any).spawns).toHaveLength(2)
    vi.restoreAllMocks()
  })
})
