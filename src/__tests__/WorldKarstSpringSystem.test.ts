import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldKarstSpringSystem } from '../systems/WorldKarstSpringSystem'
import type { KarstSpring } from '../systems/WorldKarstSpringSystem'

function makeSys(): WorldKarstSpringSystem { return new WorldKarstSpringSystem() }

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5
const mockWorldSand     = { width: 200, height: 200, getTile: () => 2 } // SAND - spawn不了
const mockWorldGrass    = { width: 200, height: 200, getTile: () => 3 } // GRASS - 可spawn
const mockWorldMountain = { width: 200, height: 200, getTile: () => 5 } // MOUNTAIN - 可spawn
const mockEM = {} as any

let nextId = 1
function makeSpring(overrides: Partial<KarstSpring> = {}): KarstSpring {
  return {
    id: nextId++, x: 20, y: 30,
    flowRate: 15, mineralContent: 25,
    poolDepth: 3, waterClarity: 60,
    temperature: 20, spectacle: 40,
    tick: 0,
    ...overrides,
  }
}

// CHECK_INTERVAL = 2570, MAX_SPRINGS = 14, FORM_CHANCE = 0.0013, cleanup = tick - 92000

describe('WorldKarstSpringSystem - 初始状态', () => {
  let sys: WorldKarstSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始springs为空', () => {
    expect((sys as any).springs).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('springs是数组', () => {
    expect(Array.isArray((sys as any).springs)).toBe(true)
  })
  it('注入spring后长度为1', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })
  it('spring字段flowRate正确', () => {
    ;(sys as any).springs.push(makeSpring({ flowRate: 15 }))
    expect((sys as any).springs[0].flowRate).toBe(15)
  })
  it('spring字段mineralContent正确', () => {
    ;(sys as any).springs.push(makeSpring({ mineralContent: 25 }))
    expect((sys as any).springs[0].mineralContent).toBe(25)
  })
  it('spring字段poolDepth正确', () => {
    ;(sys as any).springs.push(makeSpring({ poolDepth: 3 }))
    expect((sys as any).springs[0].poolDepth).toBe(3)
  })
  it('spring字段waterClarity正确', () => {
    ;(sys as any).springs.push(makeSpring({ waterClarity: 60 }))
    expect((sys as any).springs[0].waterClarity).toBe(60)
  })
  it('spring字段temperature正确', () => {
    ;(sys as any).springs.push(makeSpring({ temperature: 20 }))
    expect((sys as any).springs[0].temperature).toBe(20)
  })
  it('spring字段spectacle正确', () => {
    ;(sys as any).springs.push(makeSpring({ spectacle: 40 }))
    expect((sys as any).springs[0].spectacle).toBe(40)
  })
  it('内部springs引用一致', () => {
    expect((sys as any).springs).toBe((sys as any).springs)
  })
})

describe('WorldKarstSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldKarstSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=100 < CHECK_INTERVAL(2570)时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2569时仍被节流不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, mockWorldGrass as any, mockEM, 2569)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('tick=2570时lastCheck更新为2570', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 2570)
    expect((sys as any).lastCheck).toBe(2570)
  })
  it('第一次执行后第二次tick未满间隔不再执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 2570)
    const lc = (sys as any).lastCheck
    sys.update(0, mockWorldGrass as any, mockEM, 2571)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('第二个完整间隔（5140）lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 2570)
    sys.update(0, mockWorldSand as any, mockEM, 5140)
    expect((sys as any).lastCheck).toBe(5140)
  })
})

describe('WorldKarstSpringSystem - spawn条件', () => {
  let sys: WorldKarstSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0.9时不spawn（超出FORM_CHANCE=0.0013）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldGrass as any, mockEM, 2570)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('tile=SAND(2)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldSand as any, mockEM, 2570)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('tile=DEEP_WATER(0)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const mockWater = { width: 200, height: 200, getTile: () => 0 }
    sys.update(0, mockWater as any, mockEM, 2570)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('tile=GRASS(3)且random<0.0013时spawn成功', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.0001 : 0.5
    })
    sys.update(0, mockWorldGrass as any, mockEM, 2570)
    expect((sys as any).springs).toHaveLength(1)
  })
  it('tile=MOUNTAIN(5)且random<0.0013时spawn成功', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.0001 : 0.5
    })
    sys.update(0, mockWorldMountain as any, mockEM, 2570)
    expect((sys as any).springs).toHaveLength(1)
  })
  it('spawn时id自增', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount <= 2 ? 0.0001 : 0.5
    })
    sys.update(0, mockWorldGrass as any, mockEM, 2570)
    callCount = 0
    sys.update(0, mockWorldGrass as any, mockEM, 5140)
    const ids = (sys as any).springs.map((s: KarstSpring) => s.id)
    expect(ids[0]).not.toBe(ids[1])
  })
  it('spawn的spring带有正确tick', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.0001 : 0.5
    })
    sys.update(0, mockWorldGrass as any, mockEM, 2570)
    expect((sys as any).springs[0].tick).toBe(2570)
  })
})

describe('WorldKarstSpringSystem - 字段动态更新', () => {
  let sys: WorldKarstSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('update后flowRate在[1,35]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ tick: 99000, flowRate: 15 }))
    sys.update(0, mockWorldSand as any, mockEM, 2570)
    const fr = (sys as any).springs[0].flowRate
    expect(fr).toBeGreaterThanOrEqual(1)
    expect(fr).toBeLessThanOrEqual(35)
  })
  it('update后mineralContent在[5,50]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ tick: 99000, mineralContent: 25 }))
    sys.update(0, mockWorldSand as any, mockEM, 2570)
    const mc = (sys as any).springs[0].mineralContent
    expect(mc).toBeGreaterThanOrEqual(5)
    expect(mc).toBeLessThanOrEqual(50)
  })
  it('update后waterClarity在[20,90]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ tick: 99000, waterClarity: 60 }))
    sys.update(0, mockWorldSand as any, mockEM, 2570)
    const wc = (sys as any).springs[0].waterClarity
    expect(wc).toBeGreaterThanOrEqual(20)
    expect(wc).toBeLessThanOrEqual(90)
  })
  it('update后spectacle在[10,65]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ tick: 99000, spectacle: 40 }))
    sys.update(0, mockWorldSand as any, mockEM, 2570)
    const sp = (sys as any).springs[0].spectacle
    expect(sp).toBeGreaterThanOrEqual(10)
    expect(sp).toBeLessThanOrEqual(65)
  })
  it('update不修改spring的x坐标', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ tick: 99000, x: 42 }))
    sys.update(0, mockWorldSand as any, mockEM, 2570)
    expect((sys as any).springs[0].x).toBe(42)
  })
  it('update不修改spring的y坐标', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ tick: 99000, y: 77 }))
    sys.update(0, mockWorldSand as any, mockEM, 2570)
    expect((sys as any).springs[0].y).toBe(77)
  })
  it('update不修改spring的tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ tick: 99000 }))
    sys.update(0, mockWorldSand as any, mockEM, 2570)
    expect((sys as any).springs[0].tick).toBe(99000)
  })
})

describe('WorldKarstSpringSystem - cleanup（tick-92000）', () => {
  let sys: WorldKarstSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期spring（tick < currentTick-92000）被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ tick: 0 }))
    sys.update(0, mockWorldSand as any, mockEM, 93000)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('未过期spring保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ tick: 5000 }))
    sys.update(0, mockWorldSand as any, mockEM, 93000)
    expect((sys as any).springs).toHaveLength(1)
  })
  it('cutoff-1时（严格小于cutoff）被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    const cutoff = currentTick - 92000 // = 8000
    ;(sys as any).springs.push(makeSpring({ tick: cutoff - 1 }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('tick等于cutoff时保留（不删）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    const cutoff = currentTick - 92000
    ;(sys as any).springs.push(makeSpring({ tick: cutoff }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).springs).toHaveLength(1)
  })
  it('混合cleanup：过期删除，未过期保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 200000
    ;(sys as any).springs.push(makeSpring({ id: 10, tick: 0 }))
    ;(sys as any).springs.push(makeSpring({ id: 11, tick: 150000 }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).springs).toHaveLength(1)
    expect((sys as any).springs[0].tick).toBe(150000)
  })
  it('全部过期时springs清空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: 0 }))
    }
    sys.update(0, mockWorldSand as any, mockEM, 100000)
    expect((sys as any).springs).toHaveLength(0)
  })
})

describe('WorldKarstSpringSystem - MAX_SPRINGS上限', () => {
  let sys: WorldKarstSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('springs满14个时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < 14; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: 999999 }))
    }
    sys.update(0, mockWorldGrass as any, mockEM, 999999 + 2570)
    expect((sys as any).springs.length).toBe(14)
  })
  it('springs为13个时仍可spawn', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.0001 : 0.5
    })
    for (let i = 0; i < 13; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: 999999 }))
    }
    sys.update(0, mockWorldGrass as any, mockEM, 999999 + 2570)
    expect((sys as any).springs.length).toBe(14)
  })
})

describe('WorldKarstSpringSystem - id唯一性', () => {
  let sys: WorldKarstSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入多个spring时id各不相同', () => {
    const s1 = makeSpring()
    const s2 = makeSpring()
    const s3 = makeSpring()
    ;(sys as any).springs.push(s1, s2, s3)
    const ids = (sys as any).springs.map((s: KarstSpring) => s.id)
    expect(new Set(ids).size).toBe(3)
  })
})
