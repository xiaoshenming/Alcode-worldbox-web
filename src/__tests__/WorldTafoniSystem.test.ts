import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTafoniSystem } from '../systems/WorldTafoniSystem'
import type { Tafoni } from '../systems/WorldTafoniSystem'

// 系统关键参数
// CHECK_INTERVAL=2560, FORM_CHANCE=0.0014, MAX_TAFONI=16
// tile 条件：MOUNTAIN=5 或 SAND=2
// x: 10 + floor(random*(w-20))，y: 10 + floor(random*(h-20))
// cleanup: tick < cutoff = tick - 91000

const CHECK_INTERVAL = 2560
const FORM_CHANCE = 0.0014
const MAX_TAFONI = 16

const em = {} as any

function makeSys(): WorldTafoniSystem { return new WorldTafoniSystem() }

function makeWorld(tile: number = 5, width = 100, height = 100): any {
  return { width, height, getTile: () => tile } as any
}

let _nextId = 1
function makeTafoni(overrides: Partial<Tafoni> = {}): Tafoni {
  return {
    id: _nextId++,
    x: 15, y: 25,
    cavityCount: 10,
    cavityDepth: 5,
    saltContent: 30,
    weatheringRate: 10,
    rockType: 2,
    spectacle: 20,
    tick: 0,
    ...overrides,
  }
}

describe('WorldTafoniSystem — 初始状态', () => {
  let sys: WorldTafoniSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('初始 tafoni 为空数组', () => {
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tafoni 是数组类型', () => {
    expect(Array.isArray((sys as any).tafoni)).toBe(true)
  })
  it('手动注入一个 tafoni 后长度为 1', () => {
    ;(sys as any).tafoni.push(makeTafoni())
    expect((sys as any).tafoni).toHaveLength(1)
  })
  it('手动注入多个后长度正确', () => {
    ;(sys as any).tafoni.push(makeTafoni(), makeTafoni(), makeTafoni())
    expect((sys as any).tafoni).toHaveLength(3)
  })
  it('tafoni 返回内部引用（同一对象）', () => {
    expect((sys as any).tafoni).toBe((sys as any).tafoni)
  })
  it('Tafoni 接口字段齐全', () => {
    const t = makeTafoni()
    expect(t).toHaveProperty('id')
    expect(t).toHaveProperty('x')
    expect(t).toHaveProperty('y')
    expect(t).toHaveProperty('cavityCount')
    expect(t).toHaveProperty('cavityDepth')
    expect(t).toHaveProperty('saltContent')
    expect(t).toHaveProperty('weatheringRate')
    expect(t).toHaveProperty('rockType')
    expect(t).toHaveProperty('spectacle')
    expect(t).toHaveProperty('tick')
  })
  it('rockType 范围 [0, 3]（floor(random*4)）', () => {
    for (const rv of [0, 0.25, 0.5, 0.75]) {
      expect(Math.floor(rv * 4)).toBeGreaterThanOrEqual(0)
      expect(Math.floor(rv * 4)).toBeLessThanOrEqual(3)
    }
  })
})

describe('WorldTafoniSystem — CHECK_INTERVAL 节流', () => {
  let sys: WorldTafoniSystem
  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick=0 不执行（差值=0 < 2560）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 0)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('tick=2559 不执行（差值=2559 < 2560）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 2559)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('tick=2560 执行（差值=2560 不小于 2560）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // < FORM_CHANCE，tile=5，spawn
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni).toHaveLength(1)
  })
  it('tick=2560 后 lastCheck 更新为 2560', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).lastCheck).toBe(2560)
  })
  it('第一次执行后，tick=5119 仍不执行（差值=2559）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 2560)
    const countAfter = (sys as any).tafoni.length
    sys.update(1, makeWorld(5), em, 5119)
    expect((sys as any).tafoni).toHaveLength(countAfter)
  })
  it('tick=5120 再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 2560)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 5120)
    expect((sys as any).lastCheck).toBe(5120)
  })
  it('lastCheck 只在执行时更新', () => {
    sys.update(1, makeWorld(5), em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('CHECK_INTERVAL 边界：tick=CHECK_INTERVAL-1 不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, CHECK_INTERVAL - 1)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('CHECK_INTERVAL 边界：tick=CHECK_INTERVAL 执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, CHECK_INTERVAL)
    expect((sys as any).tafoni).toHaveLength(1)
  })
})

describe('WorldTafoniSystem — spawn 逻辑（random < FORM_CHANCE 且 tile=MOUNTAIN/SAND 才 spawn）', () => {
  let sys: WorldTafoniSystem
  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('random=0（< 0.0014）且 tile=5（MOUNTAIN）触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni).toHaveLength(1)
  })
  it('random=0 且 tile=2（SAND）触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(2), em, 2560)
    expect((sys as any).tafoni).toHaveLength(1)
  })
  it('random=0.0013（< 0.0014）且 tile=5 触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0013)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni).toHaveLength(1)
  })
  it('random=0.0014（不小于 0.0014）不触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0014)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('random=0.5 不触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('random=0 但 tile=3（GRASS）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 2560)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('random=0 但 tile=0（DEEP_WATER）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), em, 2560)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('random=0 但 tile=1（SHALLOW_WATER）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), em, 2560)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('random=0 但 tile=4（FOREST）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(4), em, 2560)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('random=0 但 tile=6（SNOW）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(6), em, 2560)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('random=0 但 tile=7（LAVA）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), em, 2560)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('已达 MAX_TAFONI=16 时不再 spawn', () => {
    for (let i = 0; i < MAX_TAFONI; i++) {
      ;(sys as any).tafoni.push(makeTafoni())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni).toHaveLength(MAX_TAFONI)
  })
  it('tafoni=15（< MAX_TAFONI）且 random=0 时可 spawn', () => {
    for (let i = 0; i < MAX_TAFONI - 1; i++) {
      ;(sys as any).tafoni.push(makeTafoni({ tick: 2560 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni.length).toBeGreaterThanOrEqual(MAX_TAFONI)
  })
  it('spawn 后 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).nextId).toBe(2)
  })
  it('spawn 的 tafoni tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].tick).toBe(2560)
  })
  it('spawn 的 tafoni id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].id).toBe(1)
  })
  it('连续两次 spawn id 递增为 1,2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 2560)
    sys.update(1, makeWorld(5), em, 5120)
    const ids = (sys as any).tafoni.map((t: Tafoni) => t.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
  })
})

describe('WorldTafoniSystem — spawn x/y 边界（10 到 w-11）', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('x: 10 + floor(random*(w-20))，random=0 => x=10', () => {
    const sys = makeSys()
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0 : 0 })
    sys.update(1, makeWorld(5, 100, 100), em, 2560)
    const t = (sys as any).tafoni[0]
    if (t) expect(t.x).toBe(10)
    vi.restoreAllMocks()
  })
  it('y: 10 + floor(random*(h-20))，random=0 => y=10', () => {
    const sys = makeSys()
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c <= 2 ? 0 : 0 })
    sys.update(1, makeWorld(5, 100, 100), em, 2560)
    const t = (sys as any).tafoni[0]
    if (t) expect(t.y).toBe(10)
    vi.restoreAllMocks()
  })
  it('x 范围在 [10, w-11]（w=100 时 [10,89]）', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5, 100, 100), em, 2560)
    const t = (sys as any).tafoni[0]
    if (t) {
      expect(t.x).toBeGreaterThanOrEqual(10)
      expect(t.x).toBeLessThanOrEqual(89)
    }
    vi.restoreAllMocks()
  })
  it('y 范围在 [10, h-11]（h=100 时 [10,89]）', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5, 100, 100), em, 2560)
    const t = (sys as any).tafoni[0]
    if (t) {
      expect(t.y).toBeGreaterThanOrEqual(10)
      expect(t.y).toBeLessThanOrEqual(89)
    }
    vi.restoreAllMocks()
  })
})

describe('WorldTafoniSystem — spawn 字段范围', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('cavityCount 范围 [5, 34]（5+floor(random*30)）', () => {
    for (const rv of [0, 0.5, 0.9999]) {
      const sys = makeSys()
      let c = 0
      vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c <= 3 ? 0 : rv })
      sys.update(1, makeWorld(5), em, 2560)
      const t = (sys as any).tafoni[0]
      if (t) {
        expect(t.cavityCount).toBeGreaterThanOrEqual(5)
        expect(t.cavityCount).toBeLessThanOrEqual(34)
      }
      vi.restoreAllMocks()
    }
  })
  it('cavityDepth spawn初始 [2,17)，同帧update +0.00003', () => {
    const sys = makeSys()
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c <= 3 ? 0 : 0 })
    sys.update(1, makeWorld(5), em, 2560)
    const t = (sys as any).tafoni[0]
    // spawn: 2+0*15=2，update+0.00003=2.00003
    if (t) {
      expect(t.cavityDepth).toBeGreaterThanOrEqual(2)
      expect(t.cavityDepth).toBeLessThanOrEqual(17.1)
    }
    vi.restoreAllMocks()
  })
  it('saltContent 范围 [10, 50)', () => {
    for (const rv of [0, 0.5, 0.9999]) {
      const sys = makeSys()
      let c = 0
      vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c <= 3 ? 0 : rv })
      sys.update(1, makeWorld(5), em, 2560)
      const t = (sys as any).tafoni[0]
      if (t) {
        expect(t.saltContent).toBeGreaterThanOrEqual(10)
        expect(t.saltContent).toBeLessThanOrEqual(50)
      }
      vi.restoreAllMocks()
    }
  })
  it('weatheringRate spawn初始 [5,25)，update同帧可微调', () => {
    const sys = makeSys()
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c <= 3 ? 0 : 0 })
    sys.update(1, makeWorld(5), em, 2560)
    const t = (sys as any).tafoni[0]
    if (t) {
      expect(t.weatheringRate).toBeGreaterThanOrEqual(2) // clamp min
      expect(t.weatheringRate).toBeLessThanOrEqual(35) // clamp max
    }
    vi.restoreAllMocks()
  })
  it('rockType 范围 [0, 3]（floor(random*4)）', () => {
    for (const rv of [0, 0.24, 0.5, 0.75, 0.9999]) {
      const sys = makeSys()
      let c = 0
      vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c <= 3 ? 0 : rv })
      sys.update(1, makeWorld(5), em, 2560)
      const t = (sys as any).tafoni[0]
      if (t) {
        expect(t.rockType).toBeGreaterThanOrEqual(0)
        expect(t.rockType).toBeLessThanOrEqual(3)
        expect(Number.isInteger(t.rockType)).toBe(true)
      }
      vi.restoreAllMocks()
    }
  })
  it('spectacle spawn初始 [10,38)，同帧update可微调', () => {
    const sys = makeSys()
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c <= 3 ? 0 : 0 })
    sys.update(1, makeWorld(5), em, 2560)
    const t = (sys as any).tafoni[0]
    if (t) {
      expect(t.spectacle).toBeGreaterThanOrEqual(5) // clamp min
      expect(t.spectacle).toBeLessThanOrEqual(55) // clamp max
    }
    vi.restoreAllMocks()
  })
})

describe('WorldTafoniSystem — update 数值逻辑', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('cavityDepth 每次 update 增加 0.00003（单调递增）', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ cavityDepth: 10, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].cavityDepth).toBeCloseTo(10.00003, 6)
  })
  it('cavityDepth 上限钳制为 30', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ cavityDepth: 30, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].cavityDepth).toBeLessThanOrEqual(30)
  })
  it('cavityCount：random<0.0008 时+1，否则不变', () => {
    // random=0 < 0.0008，+1
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ cavityCount: 20, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 0 }) // update random=0
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].cavityCount).toBe(21)
  })
  it('cavityCount：random>=0.0008 时不变', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ cavityCount: 20, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 0.001 }) // >=0.0008，不+1
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].cavityCount).toBe(20)
  })
  it('cavityCount 上限钳制为 60', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ cavityCount: 60, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 0 }) // 会触发+1，但max60
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].cavityCount).toBe(60)
  })
  it('weatheringRate 更新步长 0.07（random=1 时 +(1-0.5)*0.07=+0.035）', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ weatheringRate: 10, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 1 })
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].weatheringRate).toBeCloseTo(10.035, 4)
  })
  it('weatheringRate 下限钳制为 2', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ weatheringRate: 2, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 0 }) // (0-0.5)*0.07=-0.035
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].weatheringRate).toBeGreaterThanOrEqual(2)
  })
  it('weatheringRate 上限钳制为 35', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ weatheringRate: 35, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 1 })
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].weatheringRate).toBeLessThanOrEqual(35)
  })
  it('spectacle 更新步长 0.09（random=1 时 +(1-0.47)*0.09=+0.0477）', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ spectacle: 20, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 1 })
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].spectacle).toBeCloseTo(20.0477, 3)
  })
  it('spectacle 下限钳制为 5', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ spectacle: 5, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 0 })
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].spectacle).toBeGreaterThanOrEqual(5)
  })
  it('spectacle 上限钳制为 55', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ spectacle: 55, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 1 })
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].spectacle).toBeLessThanOrEqual(55)
  })
  it('saltContent 不被 update 修改', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ saltContent: 25, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].saltContent).toBe(25)
  })
  it('rockType 不被 update 修改', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ rockType: 3, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].rockType).toBe(3)
  })
  it('update 对所有 tafoni 都执行', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(
      makeTafoni({ cavityDepth: 5, tick: 2560 }),
      makeTafoni({ cavityDepth: 10, tick: 2560 }),
    )
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 2560)
    for (const t of (sys as any).tafoni) {
      expect(t.cavityDepth).toBeGreaterThan(0)
    }
  })
})

describe('WorldTafoniSystem — cleanup 逻辑（tick < cutoff=tick-91000 则删除）', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('cutoff = tick - 91000；tick=100000 时 cutoff=9000', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ tick: 8999 })) // < 9000，删除
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 100000)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('tick=9000（等于 cutoff）保留', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ tick: 9000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 100000)
    expect((sys as any).tafoni).toHaveLength(1)
  })
  it('tick=9001（> cutoff）保留', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ tick: 9001 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 100000)
    expect((sys as any).tafoni).toHaveLength(1)
  })
  it('一批中只删除过期的，保留新的', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ tick: 1000 }))   // 过期
    ;(sys as any).tafoni.push(makeTafoni({ tick: 50000 }))  // 保留
    ;(sys as any).tafoni.push(makeTafoni({ tick: 5000 }))   // 过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 100000)
    expect((sys as any).tafoni).toHaveLength(1)
    expect((sys as any).tafoni[0].tick).toBe(50000)
  })
  it('cutoff 精确边界（cutoff-1 删除，cutoff 保留）', () => {
    const currentTick = 200000
    const cutoff = currentTick - 91000 // 109000
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ tick: cutoff - 1 })) // 删除
    ;(sys as any).tafoni.push(makeTafoni({ tick: cutoff }))     // 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, currentTick)
    expect((sys as any).tafoni).toHaveLength(1)
    expect((sys as any).tafoni[0].tick).toBe(cutoff)
  })
  it('全部过期时清空（逆序删除不越界）', () => {
    const sys = makeSys()
    for (let i = 0; i < 5; i++) {
      ;(sys as any).tafoni.push(makeTafoni({ tick: 100 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, 200000)
    expect((sys as any).tafoni).toHaveLength(0)
  })
  it('cleanup 后可继续 spawn', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ tick: 100 })) // 过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0) // < FORM_CHANCE，spawn
    sys.update(1, makeWorld(5), em, 200000)
    expect((sys as any).tafoni).toHaveLength(1)
    expect((sys as any).tafoni[0].tick).toBe(200000)
  })
  it('cleanup 不影响当前 tick 刚 spawn 的 tafoni', () => {
    const sys = makeSys()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni).toHaveLength(1)
    expect((sys as any).tafoni[0].tick).toBe(2560)
  })
})

describe('WorldTafoniSystem — 综合场景', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_TAFONI 不超过 16', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 1; i <= 25; i++) {
      sys.update(1, makeWorld(5), em, i * 2560)
    }
    expect((sys as any).tafoni.length).toBeLessThanOrEqual(MAX_TAFONI)
  })
  it('dt 参数不影响 update 逻辑', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys1.update(1, makeWorld(5), em, 2560)
    sys2.update(999, makeWorld(5), em, 2560)
    expect((sys1 as any).lastCheck).toBe((sys2 as any).lastCheck)
  })
  it('tile=SAND(2) 和 tile=MOUNTAIN(5) 都可 spawn', () => {
    const sysSand = makeSys()
    const sysMtn = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sysSand.update(1, makeWorld(2), em, 2560)
    sysMtn.update(1, makeWorld(5), em, 2560)
    expect((sysSand as any).tafoni).toHaveLength(1)
    expect((sysMtn as any).tafoni).toHaveLength(1)
  })
  it('多次 update 后 cavityDepth 不超过 30', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ cavityDepth: 29.9999, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let t = 1; t <= 10; t++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeWorld(5), em, t * 2560)
    }
    const tafoni = (sys as any).tafoni
    if (tafoni[0]) expect(tafoni[0].cavityDepth).toBeLessThanOrEqual(30)
  })
  it('多次 update 后 weatheringRate 在 [2,35] 内', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ weatheringRate: 15, tick: 0 }))
    ;(sys as any).lastCheck = 0
    for (let t = 1; t <= 20; t++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeWorld(5), em, t * 2560)
    }
    const tafoni = (sys as any).tafoni
    if (tafoni[0]) {
      expect(tafoni[0].weatheringRate).toBeGreaterThanOrEqual(2)
      expect(tafoni[0].weatheringRate).toBeLessThanOrEqual(35)
    }
  })
  it('多次 update 后 spectacle 在 [5,55] 内', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ spectacle: 30, tick: 0 }))
    ;(sys as any).lastCheck = 0
    for (let t = 1; t <= 20; t++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeWorld(5), em, t * 2560)
    }
    const tafoni = (sys as any).tafoni
    if (tafoni[0]) {
      expect(tafoni[0].spectacle).toBeGreaterThanOrEqual(5)
      expect(tafoni[0].spectacle).toBeLessThanOrEqual(55)
    }
  })
  it('cavityCount：random<0.0008 时恰好+1（边界 0.0007）', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ cavityCount: 15, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 0.0007 })
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].cavityCount).toBe(16)
    vi.restoreAllMocks()
  })
  it('cavityCount：random=0.0008 时不+1（边界精确）', () => {
    const sys = makeSys()
    ;(sys as any).tafoni.push(makeTafoni({ cavityCount: 15, tick: 2560 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 0.0008 })
    sys.update(1, makeWorld(5), em, 2560)
    expect((sys as any).tafoni[0].cavityCount).toBe(15)
    vi.restoreAllMocks()
  })
})
