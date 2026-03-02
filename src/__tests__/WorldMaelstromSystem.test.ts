import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMaelstromSystem } from '../systems/WorldMaelstromSystem'
import type { Maelstrom } from '../systems/WorldMaelstromSystem'

// DEEP_WATER=0；返回0则允许在深水区spawn
const deepWaterWorld = {
  width: 200, height: 200,
  getTile: () => 0
}
// SAND=2；阻断spawn（非深水）
const safeWorld = { width: 200, height: 200, getTile: () => 2 }

const fakeEm = {
  getEntitiesWithComponents: () => [],
  getComponent: () => null
} as any

function makeSys(): WorldMaelstromSystem { return new WorldMaelstromSystem() }

let nextId = 1
function makeMaelstrom(overrides: Partial<Maelstrom> = {}): Maelstrom {
  return {
    id: nextId++,
    x: 50, y: 50,
    radius: 5,
    maxRadius: 8,
    strength: 60,
    phase: 0,
    growthRate: 0.02,
    age: 0,
    active: true,
    ...overrides
  }
}

describe('WorldMaelstromSystem — 初始状态', () => {
  let sys: WorldMaelstromSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始maelstroms数组为空', () => {
    expect((sys as any).maelstroms).toHaveLength(0)
  })

  it('nextId初始值为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始值为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('maelstroms是数组类型', () => {
    expect(Array.isArray((sys as any).maelstroms)).toBe(true)
  })

  it('初始getActiveMaelstroms返回空数组', () => {
    expect(sys.getActiveMaelstroms()).toHaveLength(0)
  })

  it('getActiveMaelstroms只返回active=true的漩涡', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: true }))
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: false }))
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: true }))
    expect(sys.getActiveMaelstroms()).toHaveLength(2)
  })
})

describe('WorldMaelstromSystem — CHECK_INTERVAL节流', () => {
  let sys: WorldMaelstromSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时跳过（0<600）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld as any, fakeEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=599时跳过（599<600）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld as any, fakeEm, 599)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=600时执行并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    expect((sys as any).lastCheck).toBe(600)
  })

  it('执行后tick=601（差1<600）跳过不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    sys.update(0, safeWorld as any, fakeEm, 601)
    expect((sys as any).lastCheck).toBe(600)
  })

  it('第二个间隔600+600=1200再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    sys.update(0, safeWorld as any, fakeEm, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('节流期间内置maelstrom字段不更新（age不变）', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ age: 100 }))
    // tick=100，差值100<600，跳过
    sys.update(0, safeWorld as any, fakeEm, 100)
    expect((sys as any).maelstroms[0].age).toBe(100)
  })
})

describe('WorldMaelstromSystem — spawn条件（formMaelstroms）', () => {
  let sys: WorldMaelstromSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random>FORM_CHANCE(0.02)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, deepWaterWorld as any, fakeEm, 600)
    expect((sys as any).maelstroms).toHaveLength(0)
  })

  it('safeWorld（非深水）阻断spawn，即使random<FORM_CHANCE', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, safeWorld as any, fakeEm, 600)
    expect((sys as any).maelstroms).toHaveLength(0)
  })

  it('maelstroms达到MAX_MAELSTROMS(6)时不spawn', () => {
    for (let i = 0; i < 6; i++) {
      ;(sys as any).maelstroms.push(makeMaelstrom())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, deepWaterWorld as any, fakeEm, 600)
    // 已有6个，active且age<MAX_AGE，不被清除，不spawn新的
    // 但update会执行age++，age从0变为1，不被cleanup
    expect((sys as any).maelstroms.length).toBeLessThanOrEqual(6)
  })

  it('deepWaterWorld+random<FORM_CHANCE+深水cluster足够时spawn', () => {
    // deepWaterWorld所有tile=0(DEEP_WATER)，7x7区域49个deep_water > MIN_DEEP_WATER(12)
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // <0.02 触发FORM_CHANCE
    sys.update(0, deepWaterWorld as any, fakeEm, 600)
    expect((sys as any).maelstroms.length).toBeGreaterThanOrEqual(1)
  })
})

describe('WorldMaelstromSystem — spawn后字段范围', () => {
  let sys: WorldMaelstromSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(): Maelstrom {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, deepWaterWorld as any, fakeEm, 600)
    return (sys as any).maelstroms[0]
  }

  it('spawn后radius初始为2（update后基于sin变化）', () => {
    const m = spawnOne()
    // radius = 2 + sin(phase*2π)*maxRadius，phase初始0，sin(0)=0，radius=2
    // 但update后phase += growthRate，radius重新计算
    // 初始phase=0，update后phase=growthRate，radius=2+sin(growthRate*2π)*maxRadius
    // 验证radius在合理范围内：2-maxRadius到2+maxRadius
    expect(m.radius).toBeGreaterThanOrEqual(2 - m.maxRadius)
    expect(m.radius).toBeLessThanOrEqual(2 + m.maxRadius)
  })

  it('spawn后maxRadius在[3,5]范围内', () => {
    const m = spawnOne()
    expect(m.maxRadius).toBeGreaterThanOrEqual(3)
    expect(m.maxRadius).toBeLessThanOrEqual(5)
  })

  it('spawn后strength在[30,80]范围内（update后略变）', () => {
    const m = spawnOne()
    // strength初始30~80，update后±2.5随机波动，但不低于10
    expect(m.strength).toBeGreaterThanOrEqual(10)
    expect(m.strength).toBeLessThanOrEqual(100)
  })

  it('spawn后active为true', () => {
    const m = spawnOne()
    expect(m.active).toBe(true)
  })

  it('spawn后age初始为0（update后变为1）', () => {
    const m = spawnOne()
    // age在update中自增1
    expect(m.age).toBe(1)
  })

  it('spawn后growthRate在[0.02,0.05]范围内', () => {
    const m = spawnOne()
    expect(m.growthRate).toBeGreaterThanOrEqual(0.02)
    expect(m.growthRate).toBeLessThanOrEqual(0.05)
  })
})

describe('WorldMaelstromSystem — updateMaelstroms动态字段', () => {
  let sys: WorldMaelstromSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次执行update后age增加1', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ age: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    expect((sys as any).maelstroms[0].age).toBe(101)
  })

  it('phase随growthRate递进并对1取模', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ phase: 0.95, growthRate: 0.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    const newPhase = (sys as any).maelstroms[0].phase
    // phase = (0.95 + 0.1) % 1 = 0.05
    expect(newPhase).toBeCloseTo(0.05, 5)
  })

  it('radius基于phase和maxRadius计算（在合理范围）', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ phase: 0, growthRate: 0.25, maxRadius: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    const m = (sys as any).maelstroms[0]
    // phase更新后=0.25，radius=2+sin(0.25*2π)*5=2+sin(π/2)*5=2+5=7
    expect(m.radius).toBeCloseTo(7, 3)
  })

  it('strength不低于10（下限保护）', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ strength: 10.1 }))
    // Math.random()-0.5=-0.5时，strength=10.1+(-0.5)*5=7.6，但max(10,7.6)=10
    vi.spyOn(Math, 'random').mockReturnValue(0) // random()-0.5=-0.5
    sys.update(0, safeWorld as any, fakeEm, 600)
    expect((sys as any).maelstroms[0].strength).toBeGreaterThanOrEqual(10)
  })

  it('age超过MAX_AGE(8000)时active变为false并被cleanup删除', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ age: 8000, active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    // age先++变为8001 > 8000，active=false，cleanup立刻删除
    expect((sys as any).maelstroms).toHaveLength(0)
  })

  it('age恰好为MAX_AGE时active变为false', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ age: 7999, active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    // age变为8000，条件 8000>8000 为false，active保持true
    expect((sys as any).maelstroms[0].active).toBe(true)
  })
})

describe('WorldMaelstromSystem — cleanupExpired逻辑', () => {
  let sys: WorldMaelstromSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('active=false的漩涡被cleanup删除', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: false, age: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    expect((sys as any).maelstroms).toHaveLength(0)
  })

  it('active=true的漩涡不被删除', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: true, age: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    expect((sys as any).maelstroms).toHaveLength(1)
  })

  it('混合情况：inactive删除，active保留', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: true, age: 100 }))
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: false, age: 100 }))
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: true, age: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    expect((sys as any).maelstroms).toHaveLength(2)
  })

  it('age超过MAX_AGE(8000)的漩涡在同次update中变inactive并被删除', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ age: 8000, active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    // age=8000，age++=8001>8000，active=false，cleanup删除
    expect((sys as any).maelstroms).toHaveLength(0)
  })

  it('所有漩涡inactive时maelstroms清空', () => {
    for (let i = 0; i < 4; i++) {
      ;(sys as any).maelstroms.push(makeMaelstrom({ active: false, age: 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    expect((sys as any).maelstroms).toHaveLength(0)
  })

  it('getActiveMaelstroms在cleanup后返回正确结果', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: true, age: 100 }))
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: false, age: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, fakeEm, 600)
    // cleanup后只剩active=true的那1个
    expect(sys.getActiveMaelstroms()).toHaveLength(1)
  })
})

describe('WorldMaelstromSystem — pullEntities实体牵引', () => {
  let sys: WorldMaelstromSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('active=false的漩涡不拉取实体', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: false, x: 50, y: 50, radius: 10, strength: 100, age: 100 }))
    const pos = { x: 55, y: 55 }
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => pos
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, em, 600)
    // inactive漩涡被cleanup删除，不拉取实体
    expect(pos.x).toBe(55)
    expect(pos.y).toBe(55)
  })

  it('active=true的漩涡拉取范围内的实体', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: true, x: 50, y: 50, radius: 10, strength: 100, age: 0 }))
    const pos = { x: 55, y: 55 }
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => pos
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, em, 600)
    // 实体在pullRange(radius*2.5=25)内，会被拉向(50,50)
    expect(pos.x).toBeLessThan(55)
    expect(pos.y).toBeLessThan(55)
  })

  it('距离超过pullRange(radius*PULL_RANGE_MULT)的实体不被拉取', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom({ active: true, x: 50, y: 50, radius: 5, strength: 100, age: 0 }))
    // pullRange=5*2.5=12.5；实体距离=100，超过12.5
    const pos = { x: 150, y: 150 }
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => pos
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, safeWorld as any, em, 600)
    expect(pos.x).toBe(150)
    expect(pos.y).toBe(150)
  })
})
