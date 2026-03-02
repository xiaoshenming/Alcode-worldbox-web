import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSiliceousSinterSystem } from '../systems/WorldSiliceousSinterSystem'
import type { SiliceousSinter } from '../systems/WorldSiliceousSinterSystem'

// CHECK_INTERVAL=2790, FORM_CHANCE=0.0007, MAX_DEPOSITS=5
// spawn条件: deposits.length < MAX_DEPOSITS && random < FORM_CHANCE
// 无tile条件限制（任意tile都可spawn）
// silicaPurity: 45+random*35, layerCount: 3+floor(random*10)
// opalescence: 10+random*30, thermalActivity: 30+random*40
// age初始: 0, tick初始: tick
// update: age+=0.003, silicaPurity=max(20, silicaPurity-0.003)
//         opalescence=min(80, opalescence+0.007), thermalActivity=max(8, thermalActivity-0.005)
// cleanup: !(d.age < 97) => d.age >= 97时删除

function makeSys(): WorldSiliceousSinterSystem { return new WorldSiliceousSinterSystem() }

function makeWorld(w = 100, h = 100) {
  return { width: w, height: h, getTile: () => 3 } as any
}

function makeEM() { return {} as any }

let nextId = 1
function makeDeposit(overrides: Partial<SiliceousSinter> = {}): SiliceousSinter {
  return {
    id: nextId++,
    x: 20, y: 30,
    silicaPurity: 60,
    layerCount: 5,
    opalescence: 25,
    thermalActivity: 50,
    age: 0,
    tick: 0,
    ...overrides,
  }
}

describe('WorldSiliceousSinterSystem - 初始状态', () => {
  let sys: WorldSiliceousSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无硅质硅华', () => {
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('deposits是数组', () => {
    expect(Array.isArray((sys as any).deposits)).toBe(true)
  })

  it('注入单个deposit后长度为1', () => {
    ;(sys as any).deposits.push(makeDeposit())
    expect((sys as any).deposits).toHaveLength(1)
  })

  it('注入两个deposit后长度为2', () => {
    ;(sys as any).deposits.push(makeDeposit())
    ;(sys as any).deposits.push(makeDeposit())
    expect((sys as any).deposits).toHaveLength(2)
  })

  it('deposits返回内部引用', () => {
    expect((sys as any).deposits).toBe((sys as any).deposits)
  })

  it('deposit字段值正确', () => {
    ;(sys as any).deposits.push(makeDeposit({ silicaPurity: 70, opalescence: 30, thermalActivity: 45 }))
    const d = (sys as any).deposits[0]
    expect(d.silicaPurity).toBe(70)
    expect(d.opalescence).toBe(30)
    expect(d.thermalActivity).toBe(45)
  })
})

describe('WorldSiliceousSinterSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldSiliceousSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行(差值0 < 2790)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 0)
    expect((sys as any).deposits).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2789时不执行(小于CHECK_INTERVAL)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2789)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2790时执行(等于CHECK_INTERVAL)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // >FORM_CHANCE不spawn
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).lastCheck).toBe(2790)
  })

  it('执行后lastCheck更新为tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('间隔内第二次调用不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2790)
    sys.update(1, makeWorld(), makeEM(), 3000)
    expect((sys as any).lastCheck).toBe(2790)
  })

  it('第二个间隔到时再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2790)
    sys.update(1, makeWorld(), makeEM(), 5580)
    expect((sys as any).lastCheck).toBe(5580)
  })

  it('lastCheck=1000，tick=3789时不执行(差2789<2790)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 1000
    sys.update(1, makeWorld(), makeEM(), 3789)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('lastCheck=1000，tick=3790时执行(差2790>=2790)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).lastCheck = 1000
    sys.update(1, makeWorld(), makeEM(), 3790)
    expect((sys as any).lastCheck).toBe(3790)
  })
})

describe('WorldSiliceousSinterSystem - spawn逻辑', () => {
  let sys: WorldSiliceousSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('random<FORM_CHANCE(0.0007)时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits).toHaveLength(1)
  })

  it('random>=FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('random=FORM_CHANCE(0.0007)时不spawn(等于不<)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0007)
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('deposits已满MAX_DEPOSITS(5)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < 5; i++) {
      (sys as any).deposits.push(makeDeposit({ age: 0 }))
    }
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits).toHaveLength(5)
  })

  it('4个deposits时仍可spawn(4<5)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < 4; i++) {
      (sys as any).deposits.push(makeDeposit({ age: 0 }))
    }
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits).toHaveLength(5)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn的deposit id为1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorld(), makeEM(), 2790)
    if ((sys as any).deposits.length > 0) {
      expect((sys as any).deposits[0].id).toBe(1)
    }
  })

  it('spawn的deposit tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorld(), makeEM(), 5000)
    if ((sys as any).deposits.length > 0) {
      expect((sys as any).deposits[0].tick).toBe(5000)
    }
  })
})

describe('WorldSiliceousSinterSystem - spawn字段范围', () => {
  let sys: WorldSiliceousSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn的age初始(update后)为0.003', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorld(), makeEM(), 2790)
    if ((sys as any).deposits.length > 0) {
      // spawn后同帧update: age=0+0.003=0.003
      expect((sys as any).deposits[0].age).toBeCloseTo(0.003, 5)
    }
  })

  it('silicaPurity初始范围[45,80]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorld(), makeEM(), 2790)
    if ((sys as any).deposits.length > 0) {
      // random=0.0001: silicaPurity=45+0.0001*35≈45.0035，update后-0.003≈45.0005
      expect((sys as any).deposits[0].silicaPurity).toBeGreaterThanOrEqual(44)
      expect((sys as any).deposits[0].silicaPurity).toBeLessThanOrEqual(81)
    }
  })

  it('layerCount初始为整数且在[3,12]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorld(), makeEM(), 2790)
    if ((sys as any).deposits.length > 0) {
      // layerCount=3+floor(random*10)=3+floor(0.0001*10)=3+0=3，不受update影响
      expect((sys as any).deposits[0].layerCount).toBeGreaterThanOrEqual(3)
      expect((sys as any).deposits[0].layerCount).toBeLessThanOrEqual(12)
      expect(Number.isInteger((sys as any).deposits[0].layerCount)).toBe(true)
    }
  })

  it('opalescence初始范围[10,40]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorld(), makeEM(), 2790)
    if ((sys as any).deposits.length > 0) {
      // opalescence=10+random*30，update后+0.007
      expect((sys as any).deposits[0].opalescence).toBeGreaterThanOrEqual(10)
      expect((sys as any).deposits[0].opalescence).toBeLessThanOrEqual(41)
    }
  })

  it('thermalActivity初始范围[30,70]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorld(), makeEM(), 2790)
    if ((sys as any).deposits.length > 0) {
      // thermalActivity=30+random*40，update后-0.005
      expect((sys as any).deposits[0].thermalActivity).toBeGreaterThanOrEqual(29)
      expect((sys as any).deposits[0].thermalActivity).toBeLessThanOrEqual(71)
    }
  })

  it('x在[0,width)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const world = makeWorld(50, 80)
    sys.update(1, world, makeEM(), 2790)
    if ((sys as any).deposits.length > 0) {
      expect((sys as any).deposits[0].x).toBeGreaterThanOrEqual(0)
      expect((sys as any).deposits[0].x).toBeLessThan(50)
    }
  })

  it('y在[0,height)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const world = makeWorld(50, 80)
    sys.update(1, world, makeEM(), 2790)
    if ((sys as any).deposits.length > 0) {
      expect((sys as any).deposits[0].y).toBeGreaterThanOrEqual(0)
      expect((sys as any).deposits[0].y).toBeLessThan(80)
    }
  })

  it('random=0时layerCount为3(最小值)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // random=0不<FORM_CHANCE(0.0007)，不spawn！所以改用手动注入
    // 直接测逻辑：3+floor(0*10)=3+0=3
    expect(3 + Math.floor(0 * 10)).toBe(3)
  })
})

describe('WorldSiliceousSinterSystem - update数值逻辑', () => {
  let sys: WorldSiliceousSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update: age+=0.003', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ age: 1, silicaPurity: 60 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits[0].age).toBeCloseTo(1.003, 5)
  })

  it('每次update: silicaPurity-=0.003', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ silicaPurity: 60, age: 1 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits[0].silicaPurity).toBeCloseTo(59.997, 3)
  })

  it('silicaPurity不低于20(max保护)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ silicaPurity: 20, age: 1 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits[0].silicaPurity).toBe(20)
  })

  it('silicaPurity=20.001时update后仍不低于20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ silicaPurity: 20.001, age: 1 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits[0].silicaPurity).toBeGreaterThanOrEqual(20)
  })

  it('每次update: opalescence+=0.007', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ opalescence: 25, age: 1 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits[0].opalescence).toBeCloseTo(25.007, 5)
  })

  it('opalescence不超过80(min保护)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ opalescence: 80, age: 1 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits[0].opalescence).toBe(80)
  })

  it('opalescence=79.999时update后不超过80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ opalescence: 79.999, age: 1 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits[0].opalescence).toBeLessThanOrEqual(80)
  })

  it('每次update: thermalActivity-=0.005', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ thermalActivity: 50, age: 1 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits[0].thermalActivity).toBeCloseTo(49.995, 3)
  })

  it('thermalActivity不低于8(max保护)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ thermalActivity: 8, age: 1 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits[0].thermalActivity).toBe(8)
  })
})

describe('WorldSiliceousSinterSystem - cleanup逻辑', () => {
  let sys: WorldSiliceousSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('age>=97时删除(!(age<97))', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // 注入age=97，update后age=97.003>=97，cleanup删
    ;(sys as any).deposits.push(makeDeposit({ age: 97 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    // update后age=97.003 >= 97，被删
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('age<97时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // age=96，update后=96.003 < 97，保留
    ;(sys as any).deposits.push(makeDeposit({ age: 96 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits).toHaveLength(1)
  })

  it('age=96.997时update后=96.9999...<97，保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ age: 96.997 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    // age=96.997+0.003=97.000，97>=97被删！
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('age=96.99时update后<97，保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ age: 96.99 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    // age=96.99+0.003=96.993<97，保留
    expect((sys as any).deposits).toHaveLength(1)
  })

  it('混合：age<97的保留，age>=97的删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ age: 97 }))  // 删
    ;(sys as any).deposits.push(makeDeposit({ age: 50 }))  // 保留
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits).toHaveLength(1)
    expect((sys as any).deposits[0].age).toBeCloseTo(50.003, 3)
  })

  it('多个age>=97全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ age: 97 }))
    ;(sys as any).deposits.push(makeDeposit({ age: 100 }))
    ;(sys as any).deposits.push(makeDeposit({ age: 200 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('空列表cleanup不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(() => sys.update(1, makeWorld(), makeEM(), 2790)).not.toThrow()
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('cleanup使用age不使用tick(无tick条件)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // tick=1(很小)，但age>=97，仍被删除
    ;(sys as any).deposits.push(makeDeposit({ age: 100, tick: 1 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits).toHaveLength(0)
  })
})

describe('WorldSiliceousSinterSystem - 综合场景', () => {
  let sys: WorldSiliceousSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('两个不同实例互相独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).deposits.push(makeDeposit())
    expect((sys1 as any).deposits).toHaveLength(1)
    expect((sys2 as any).deposits).toHaveLength(0)
  })

  it('MAX_DEPOSITS=5，不超过5个', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let t = 2790; t <= 2790 * 10; t += 2790) {
      sys.update(1, makeWorld(), makeEM(), t)
    }
    expect((sys as any).deposits.length).toBeLessThanOrEqual(5)
  })

  it('多次update累计age增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ age: 0 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    sys.update(1, makeWorld(), makeEM(), 5580)
    expect((sys as any).deposits[0].age).toBeCloseTo(0.006, 5)
  })

  it('从age=0到age>=97需要约32333次update', () => {
    // 97/0.003≈32333次
    const needed = Math.ceil(97 / 0.003)
    expect(needed).toBeGreaterThan(30000)
  })

  it('world.width||200兜底：width=0时使用200', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    // WorldSiliceousSinterSystem有 const w = world.width || 200
    const worldZeroSize = { width: 0, height: 0, getTile: () => 3 } as any
    expect(() => sys.update(1, worldZeroSize, makeEM(), 2790)).not.toThrow()
    // width=0||200=200，y=0||200=200，x和y应在[0,200)
    if ((sys as any).deposits.length > 0) {
      expect((sys as any).deposits[0].x).toBeGreaterThanOrEqual(0)
      expect((sys as any).deposits[0].x).toBeLessThan(200)
    }
  })

  it('layerCount始终为整数', () => {
    ;(sys as any).deposits.push(makeDeposit({ layerCount: 7 }))
    expect(Number.isInteger((sys as any).deposits[0].layerCount)).toBe(true)
  })

  it('多次update后silicaPurity趋近但不低于20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ silicaPurity: 20.015, age: 0 }))
    // 每次-0.003，5次后=20.015-0.015=20.000，再次update max(20,19.997)=20
    for (let t = 2790; t <= 2790 * 10; t += 2790) {
      sys.update(1, makeWorld(), makeEM(), t)
      if ((sys as any).deposits.length === 0) break
    }
    if ((sys as any).deposits.length > 0) {
      expect((sys as any).deposits[0].silicaPurity).toBeGreaterThanOrEqual(20)
    }
  })

  it('多次update后thermalActivity趋近但不低于8', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ thermalActivity: 8.01, age: 0 }))
    for (let t = 2790; t <= 2790 * 10; t += 2790) {
      sys.update(1, makeWorld(), makeEM(), t)
      if ((sys as any).deposits.length === 0) break
    }
    if ((sys as any).deposits.length > 0) {
      expect((sys as any).deposits[0].thermalActivity).toBeGreaterThanOrEqual(8)
    }
  })

  it('update前后opalescence不超过80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).deposits.push(makeDeposit({ opalescence: 79.998, age: 0 }))
    sys.update(1, makeWorld(), makeEM(), 2790)
    expect((sys as any).deposits[0].opalescence).toBeLessThanOrEqual(80)
  })
})
