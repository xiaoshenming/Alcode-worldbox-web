import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPumiceFieldSystem } from '../systems/WorldPumiceFieldSystem'
import type { PumiceField } from '../systems/WorldPumiceFieldSystem'

function makeSys(): WorldPumiceFieldSystem { return new WorldPumiceFieldSystem() }
let nextId = 1
function makeField(overrides: Partial<PumiceField> = {}): PumiceField {
  return {
    id: nextId++, x: 20, y: 30, size: 15, buoyancy: 80,
    mineralContent: 40, driftSpeed: 2, age: 1000, tick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number | null = 0) {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => tile,
  } as any
}

const em = {} as any

describe('WorldPumiceFieldSystem - 初始状态', () => {
  let sys: WorldPumiceFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无浮石场', () => {
    expect((sys as any).fields).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入一个字段后 fields 长度为 1', () => {
    ;(sys as any).fields.push(makeField())
    expect((sys as any).fields).toHaveLength(1)
  })
  it('fields 返回内部引用', () => {
    expect((sys as any).fields).toBe((sys as any).fields)
  })
  it('浮石场 buoyancy 字段正确', () => {
    ;(sys as any).fields.push(makeField())
    expect((sys as any).fields[0].buoyancy).toBe(80)
  })
  it('浮石场 mineralContent 字段正确', () => {
    ;(sys as any).fields.push(makeField())
    expect((sys as any).fields[0].mineralContent).toBe(40)
  })
  it('浮石场 driftSpeed 字段正确', () => {
    ;(sys as any).fields.push(makeField())
    expect((sys as any).fields[0].driftSpeed).toBe(2)
  })
  it('浮石场 age 字段正确', () => {
    ;(sys as any).fields.push(makeField())
    expect((sys as any).fields[0].age).toBe(1000)
  })
})

describe('WorldPumiceFieldSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldPumiceFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL(1900) 时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), em, 1899)
    expect((sys as any).fields).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick = CHECK_INTERVAL 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).lastCheck).toBe(1900)
  })
  it('tick > CHECK_INTERVAL 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(0), em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('执行后 lastCheck 更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(0), em, 3800)
    expect((sys as any).lastCheck).toBe(3800)
  })
  it('第二次调用 tick 未超过间隔时不再执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(0), em, 5000)
    ;(sys as any).fields = []
    sys.update(1, makeWorld(0), em, 5001)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('连续两个间隔各执行一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).lastCheck).toBe(1900)
    sys.update(1, makeWorld(0), em, 3800)
    expect((sys as any).lastCheck).toBe(3800)
  })
  it('节流期间 fields 不变', () => {
    ;(sys as any).fields.push(makeField({ buoyancy: 50, size: 10 }))
    sys.update(1, makeWorld(0), em, 100)
    expect((sys as any).fields[0].age).toBe(1000)
  })
})

describe('WorldPumiceFieldSystem - spawn 条件', () => {
  let sys: WorldPumiceFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('DEEP_WATER(tile=0) 允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields.length).toBeGreaterThanOrEqual(1)
  })
  it('SHALLOW_WATER(tile=1) 允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), em, 1900)
    expect((sys as any).fields.length).toBeGreaterThanOrEqual(1)
  })
  it('SAND(tile=2) 不允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(2), em, 1900)
    expect((sys as any).fields).toHaveLength(0)
  })
  it('LAVA(tile=7) 不允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), em, 1900)
    expect((sys as any).fields).toHaveLength(0)
  })
  it('tile=null 不允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(null), em, 1900)
    expect((sys as any).fields).toHaveLength(0)
  })
  it('random >= SPAWN_CHANCE(0.003) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields).toHaveLength(0)
  })
  it('random < SPAWN_CHANCE(0.003) 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields.length).toBeGreaterThanOrEqual(1)
  })
  it('fields 已达 MAX_FIELDS(16) 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 16; i++) {
      ;(sys as any).fields.push(makeField({ buoyancy: 80, size: 15 }))
    }
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields.length).toBe(16)
  })
  it('fields 为 15 时可再 spawn 一个', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 15; i++) {
      ;(sys as any).fields.push(makeField({ buoyancy: 80, size: 15 }))
    }
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields.length).toBeGreaterThanOrEqual(15)
  })
})

describe('WorldPumiceFieldSystem - spawn 字段范围', () => {
  let sys: WorldPumiceFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('spawn 后 age 经过 update 变为 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), em, 1900)
    const f = (sys as any).fields[0]
    expect(f.age).toBe(1)
  })
  it('spawn 后 tick 为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), em, 1900)
    const f = (sys as any).fields[0]
    expect(f.tick).toBe(1900)
  })
  it('spawn size 最小值接近 5（random=0，update后约4.99）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys = makeSys()
    sys.update(1, makeWorld(0), em, 1900)
    const f = (sys as any).fields[0]
    expect(f.size).toBeGreaterThanOrEqual(4.9)
    expect(f.size).toBeLessThanOrEqual(35)
  })
  it('spawn size 最大值接近 35（random近1时）', () => {
    // 第一次 random 用 0 通过 spawn check，之后用 0.9999 控制字段值
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.9999)
    sys = makeSys()
    sys.update(1, makeWorld(0), em, 1900)
    const f = (sys as any).fields[0]
    // size = 5 + 0.9999*30 = 34.997, update后-=0.01，约34.987
    expect(f.size).toBeGreaterThanOrEqual(30)
    expect(f.size).toBeLessThanOrEqual(35)
  })
  it('spawn buoyancy 范围接近 [60,100]（经一次update后略减）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys = makeSys()
    sys.update(1, makeWorld(0), em, 1900)
    const f = (sys as any).fields[0]
    expect(f.buoyancy).toBeGreaterThanOrEqual(59.9)
    expect(f.buoyancy).toBeLessThanOrEqual(100)
  })
  it('spawn mineralContent 范围接近 [15,55]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys = makeSys()
    sys.update(1, makeWorld(0), em, 1900)
    const f = (sys as any).fields[0]
    expect(f.mineralContent).toBeGreaterThanOrEqual(14.9)
    expect(f.mineralContent).toBeLessThanOrEqual(55)
  })
  it('spawn driftSpeed 范围 [0.2,1.0]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys = makeSys()
    sys.update(1, makeWorld(0), em, 1900)
    const f = (sys as any).fields[0]
    expect(f.driftSpeed).toBeGreaterThanOrEqual(0.2)
    expect(f.driftSpeed).toBeLessThanOrEqual(1.0)
  })
  it('spawn nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).nextId).toBe(2)
  })
})

describe('WorldPumiceFieldSystem - update 数值逻辑', () => {
  let sys: WorldPumiceFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每个 update 周期 age 递增 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ age: 5, buoyancy: 80, size: 10 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields[0].age).toBe(6)
  })
  it('每个 update 周期 buoyancy 减少 0.03', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ buoyancy: 80, size: 10, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields[0].buoyancy).toBeCloseTo(79.97)
  })
  it('buoyancy 不会低于 0（使用 max 钳制）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // buoyancy=0.04, update后 max(0, 0.04-0.03)=0.01，不触发 cleanup（size=10正常）
    ;(sys as any).fields.push(makeField({ buoyancy: 0.04, size: 10, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields[0].buoyancy).toBeGreaterThanOrEqual(0)
    expect((sys as any).fields[0].buoyancy).toBeLessThanOrEqual(0.04)
  })
  it('每个 update 周期 size 减少 0.01', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ size: 10, buoyancy: 80, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields[0].size).toBeCloseTo(9.99)
  })
  it('size 不会低于 0（使用 max 钳制）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // size=0.02, update后 max(0, 0.02-0.01)=0.01，不触发 cleanup（buoyancy=80正常）
    ;(sys as any).fields.push(makeField({ size: 0.02, buoyancy: 80, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields[0].size).toBeGreaterThanOrEqual(0)
    expect((sys as any).fields[0].size).toBeLessThanOrEqual(0.02)
  })
  it('每个 update 周期 mineralContent 减少 0.005', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ mineralContent: 20, buoyancy: 80, size: 10, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields[0].mineralContent).toBeCloseTo(19.995)
  })
  it('mineralContent 不会低于 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ mineralContent: 0, buoyancy: 80, size: 10, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields[0].mineralContent).toBe(0)
  })
  it('x 坐标被 clamp 在 [0, width-1]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ x: 0, y: 50, buoyancy: 80, size: 10, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields[0].x).toBeGreaterThanOrEqual(0)
    expect((sys as any).fields[0].x).toBeLessThanOrEqual(99)
  })
  it('y 坐标被 clamp 在 [0, height-1]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ x: 50, y: 0, buoyancy: 80, size: 10, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields[0].y).toBeGreaterThanOrEqual(0)
    expect((sys as any).fields[0].y).toBeLessThanOrEqual(99)
  })
})

describe('WorldPumiceFieldSystem - cleanup 逻辑', () => {
  let sys: WorldPumiceFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('buoyancy = 0 时删除浮石场', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ buoyancy: 0, size: 10, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields).toHaveLength(0)
  })
  it('size = 0 时删除浮石场', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ buoyancy: 80, size: 0, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields).toHaveLength(0)
  })
  it('buoyancy > 0 且 size > 0 时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ buoyancy: 1, size: 1, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields).toHaveLength(1)
  })
  it('多个浮石场中只删除满足条件的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ buoyancy: 0, size: 10, age: 1 }))
    ;(sys as any).fields.push(makeField({ buoyancy: 80, size: 10, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields).toHaveLength(1)
    expect((sys as any).fields[0].buoyancy).toBeGreaterThan(0)
  })
  it('buoyancy 极小（0.02）update后变为0被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ buoyancy: 0.02, size: 10, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields).toHaveLength(0)
  })
  it('size 极小（0.005）update 后变为 0 被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).fields.push(makeField({ buoyancy: 80, size: 0.005, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).fields).toHaveLength(0)
  })
  it('空 fields 时 cleanup 不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(0), em, 1900)).not.toThrow()
  })
  it('cleanup 后 nextId 不重置', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).nextId = 5
    ;(sys as any).fields.push(makeField({ buoyancy: 0, size: 10, age: 1 }))
    sys.update(1, makeWorld(0), em, 1900)
    expect((sys as any).nextId).toBe(5)
  })
})
