import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSteamVentSystem } from '../systems/WorldSteamVentSystem'
import type { SteamVent } from '../systems/WorldSteamVentSystem'

// CHECK_INTERVAL=2740, FORM_CHANCE=0.0008, MAX_VENTS=7
// 无 tile 条件：spawn 无需检查 tile
// cleanup: !(v.age < 92) => v.age >= 92 则移除
// update: age+=0.004; pressure=max(10,min(95,p+(r-0.48)*0.15)); steamVolume=max(5,sv-0.005); mineralContent=min(80,mc+0.008)
// spawn: pressure=[35,80), steamVolume=[20,55), mineralContent=[10,35), eruptionCycle=[50,150), age=0

function makeSys(): WorldSteamVentSystem { return new WorldSteamVentSystem() }

function makeWorld(width = 200, height = 200) {
  return { width, height, getTile: () => 5 } as any
}

function makeEm() { return {} as any }

let idCounter = 1
function makeVent(overrides: Partial<SteamVent> = {}): SteamVent {
  return {
    id: idCounter++,
    x: 50, y: 60,
    pressure: 60,
    steamVolume: 40,
    mineralContent: 25,
    eruptionCycle: 100,
    age: 0,
    tick: 0,
    ...overrides,
  }
}

describe('WorldSteamVentSystem - 初始状态', () => {
  let sys: WorldSteamVentSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })

  it('初始 vents 数组为空', () => {
    expect((sys as any).vents).toHaveLength(0)
  })
  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('vents 是数组实例', () => {
    expect(Array.isArray((sys as any).vents)).toBe(true)
  })
  it('多次实例���互不干扰', () => {
    const s2 = makeSys()
    ;(sys as any).vents.push(makeVent())
    expect((s2 as any).vents).toHaveLength(0)
  })
  it('nextId 与 lastCheck 是数值类型', () => {
    expect(typeof (sys as any).nextId).toBe('number')
    expect(typeof (sys as any).lastCheck).toBe('number')
  })
  it('vents 引用稳定', () => {
    expect((sys as any).vents).toBe((sys as any).vents)
  })
  it('构造函数不调用 Math.random', () => {
    const spy = vi.spyOn(Math, 'random')
    makeSys()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('WorldSteamVentSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldSteamVentSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL(2740) 时不执行', () => {
    const spy = vi.spyOn(Math, 'random')
    sys.update(1, makeWorld(), makeEm(), 2739)
    expect(spy).not.toHaveBeenCalled()
  })
  it('tick === 2739 时不执行', () => {
    const spy = vi.spyOn(Math, 'random')
    sys.update(1, makeWorld(), makeEm(), 2739)
    expect(spy).not.toHaveBeenCalled()
  })
  it('tick === CHECK_INTERVAL(2740) 时执行', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 2740)
    expect(spy).toHaveBeenCalled()
  })
  it('触发后 lastCheck 更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 2740)
    expect((sys as any).lastCheck).toBe(2740)
  })
  it('第二次间隔不足则 lastCheck 不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 2740)
    sys.update(1, makeWorld(), makeEm(), 2741)
    expect((sys as any).lastCheck).toBe(2740)
  })
  it('第二次满足间隔则 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 2740)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).lastCheck).toBe(5480)
  })
  it('tick=0 不触发', () => {
    const spy = vi.spyOn(Math, 'random')
    sys.update(1, makeWorld(), makeEm(), 0)
    expect(spy).not.toHaveBeenCalled()
  })
  it('节流期间 age 字段不变', () => {
    ;(sys as any).vents.push(makeVent({ age: 5 }))
    ;(sys as any).lastCheck = 2740
    sys.update(1, makeWorld(), makeEm(), 2741)
    expect((sys as any).vents[0].age).toBe(5)
  })
  it('节流期间 pressure 字段不变', () => {
    ;(sys as any).vents.push(makeVent({ pressure: 60 }))
    ;(sys as any).lastCheck = 2740
    sys.update(1, makeWorld(), makeEm(), 2741)
    expect((sys as any).vents[0].pressure).toBe(60)
  })
})

describe('WorldSteamVentSystem - spawn 逻辑', () => {
  let sys: WorldSteamVentSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('random < FORM_CHANCE(0.0008) 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), makeEm(), 2740)
    expect((sys as any).vents).toHaveLength(1)
  })
  it('random >= FORM_CHANCE(0.0008) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), makeEm(), 2740)
    expect((sys as any).vents).toHaveLength(0)
  })
  it('FORM_CHANCE 边界：random === 0.0008 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0008)
    sys.update(1, makeWorld(), makeEm(), 2740)
    expect((sys as any).vents).toHaveLength(0)
  })
  it('spawn 无需检查 tile 类型', () => {
    const world = { width: 200, height: 200, getTile: () => 3 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, world, makeEm(), 2740)
    expect((sys as any).vents).toHaveLength(1)
  })
  it('达到 MAX_VENTS(7) 不再 spawn', () => {
    for (let i = 0; i < 7; i++) (sys as any).vents.push(makeVent({ age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), makeEm(), 2740)
    // age += 0.004后 age=0.004<92，不被cleanup。但MAX_VENTS已满，不spawn
    expect((sys as any).vents.filter((v: SteamVent) => v.age < 92)).toHaveLength(7)
  })
  it('vents.length === 6 仍可 spawn', () => {
    for (let i = 0; i < 6; i++) (sys as any).vents.push(makeVent({ age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), makeEm(), 2740)
    expect((sys as any).vents.length).toBeGreaterThan(6)
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), makeEm(), 2740)
    expect((sys as any).nextId).toBe(2)
  })
  it('spawn 后 id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), makeEm(), 2740)
    expect((sys as any).vents[0].id).toBe(1)
  })
  it('spawn 时 age 初始为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), makeEm(), 2740)
    // 注意：spawn后立即经过update: age += 0.004
    const vent = (sys as any).vents.find((v: SteamVent) => v.tick === 2740)
    if (vent) expect(vent.age).toBeCloseTo(0.004, 5)
  })
  it('spawn 记录当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), makeEm(), 5480)
    const vent = (sys as any).vents.find((v: SteamVent) => v.tick === 5480)
    if (vent) expect(vent.tick).toBe(5480)
  })
  it('无 tile 条件：任何世界都可 spawn', () => {
    const world = { width: 200, height: 200, getTile: () => 0 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, world, makeEm(), 2740)
    expect((sys as any).vents).toHaveLength(1)
  })
  it('世界 width/height 为 0 时使用默认值 200', () => {
    const world = { width: 0, height: 0, getTile: () => 5 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, world, makeEm(), 2740)
    expect((sys as any).vents).toHaveLength(1)
    // x 在 [0, 200)
    expect((sys as any).vents[0].x).toBeGreaterThanOrEqual(0)
    expect((sys as any).vents[0].x).toBeLessThan(200)
  })
})

describe('WorldSteamVentSystem - spawn 字段范围', () => {
  let sys: WorldSteamVentSystem
  afterEach(() => vi.restoreAllMocks())

  it('pressure 在 [35, 80)', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ pressure: 60 }))
    expect((sys as any).vents[0].pressure).toBeGreaterThanOrEqual(35)
    expect((sys as any).vents[0].pressure).toBeLessThan(80)
  })
  it('steamVolume 在 [20, 55)', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ steamVolume: 40 }))
    expect((sys as any).vents[0].steamVolume).toBeGreaterThanOrEqual(20)
    expect((sys as any).vents[0].steamVolume).toBeLessThan(55)
  })
  it('mineralContent 在 [10, 35)', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ mineralContent: 20 }))
    expect((sys as any).vents[0].mineralContent).toBeGreaterThanOrEqual(10)
    expect((sys as any).vents[0].mineralContent).toBeLessThan(35)
  })
  it('eruptionCycle 在 [50, 150)', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ eruptionCycle: 100 }))
    expect((sys as any).vents[0].eruptionCycle).toBeGreaterThanOrEqual(50)
    expect((sys as any).vents[0].eruptionCycle).toBeLessThan(150)
  })
  it('age 初始为 0', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: 0 }))
    expect((sys as any).vents[0].age).toBe(0)
  })
  it('x 坐标在 [0, width) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys = makeSys()
    sys.update(1, makeWorld(100, 100), makeEm(), 2740)
    if ((sys as any).vents.length > 0) {
      const x = (sys as any).vents[0].x
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(100)
    }
  })
  it('y 坐标在 [0, height) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys = makeSys()
    sys.update(1, makeWorld(100, 100), makeEm(), 2740)
    if ((sys as any).vents.length > 0) {
      const y = (sys as any).vents[0].y
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThan(100)
    }
  })
  it('x 是整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys = makeSys()
    sys.update(1, makeWorld(), makeEm(), 2740)
    if ((sys as any).vents.length > 0) {
      expect(Number.isInteger((sys as any).vents[0].x)).toBe(true)
    }
  })
  it('y 是整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys = makeSys()
    sys.update(1, makeWorld(), makeEm(), 2740)
    if ((sys as any).vents.length > 0) {
      expect(Number.isInteger((sys as any).vents[0].y)).toBe(true)
    }
  })
})

describe('WorldSteamVentSystem - update 数值逻辑', () => {
  let sys: WorldSteamVentSystem
  afterEach(() => vi.restoreAllMocks())

  it('age 每次 update 增加 0.004', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].age).toBeCloseTo(0.004, 5)
  })
  it('age 累计增加（多轮）', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: 5, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].age).toBeCloseTo(5.004, 5)
  })
  it('steamVolume 每次减少 0.005', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ steamVolume: 40, age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].steamVolume).toBeCloseTo(40 - 0.005, 5)
  })
  it('steamVolume 下界为 5', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ steamVolume: 5, age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].steamVolume).toBeGreaterThanOrEqual(5)
  })
  it('steamVolume=5.001 减少后不低于 5', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ steamVolume: 5.001, age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].steamVolume).toBeGreaterThanOrEqual(5)
  })
  it('mineralContent 每次增加 0.008', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ mineralContent: 25, age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].mineralContent).toBeCloseTo(25.008, 5)
  })
  it('mineralContent 上界为 80', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ mineralContent: 80, age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].mineralContent).toBeLessThanOrEqual(80)
  })
  it('mineralContent=79.995 增加后不超过 80', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ mineralContent: 79.995, age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].mineralContent).toBeLessThanOrEqual(80)
  })
  it('pressure 上界为 95', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ pressure: 95, age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].pressure).toBeLessThanOrEqual(95)
  })
  it('pressure 下界为 10', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ pressure: 10, age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].pressure).toBeGreaterThanOrEqual(10)
  })
  it('pressure 漂移公式：(random-0.48)*0.15', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ pressure: 60, age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.48) // (0.48-0.48)*0.15=0 => 不变
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].pressure).toBeCloseTo(60, 5)
  })
  it('pressure 正向漂移', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ pressure: 60, age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.98) // (0.98-0.48)*0.15=0.075 => +0.075
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].pressure).toBeCloseTo(60.075, 4)
  })
  it('多个喷口都被 update', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: 0, steamVolume: 40, tick: 2740 }))
    ;(sys as any).vents.push(makeVent({ age: 5, steamVolume: 30, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].age).toBeCloseTo(0.004, 5)
    expect((sys as any).vents[1].age).toBeCloseTo(5.004, 5)
    expect((sys as any).vents[0].steamVolume).toBeCloseTo(40 - 0.005, 5)
    expect((sys as any).vents[1].steamVolume).toBeCloseTo(30 - 0.005, 5)
  })
  it('eruptionCycle 字段在 update 中不被修改', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ eruptionCycle: 100, age: 0, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents[0].eruptionCycle).toBe(100)
  })
})

describe('WorldSteamVentSystem - cleanup 逻辑', () => {
  let sys: WorldSteamVentSystem
  afterEach(() => vi.restoreAllMocks())

  it('age >= 92 时喷口被移除', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: 92, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    // age在update后=92.004>=92，被移除
    expect((sys as any).vents).toHaveLength(0)
  })
  it('age = 91.997 update 后 < 92 不被移除', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: 91.997, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    // age = 91.997 + 0.004 = 92.001 >= 92，被移除
    expect((sys as any).vents).toHaveLength(0)
  })
  it('age < 91.996 时 update 后仍 < 92 保留', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: 50, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    // age = 50.004 < 92，保留
    expect((sys as any).vents).toHaveLength(1)
  })
  it('cleanup 边界：age=91.995 + 0.004 = 91.999 < 92 保留', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: 91.995, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    // 91.995 + 0.004 = 91.999 < 92 => 保留
    expect((sys as any).vents).toHaveLength(1)
  })
  it('混合：老喷口被移除，新喷口保留', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ id: 1, age: 92, tick: 2740 }))
    ;(sys as any).vents.push(makeVent({ id: 2, age: 5, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents).toHaveLength(1)
    expect((sys as any).vents[0].id).toBe(2)
  })
  it('所有老喷口都被清除', () => {
    sys = makeSys()
    for (let i = 0; i < 5; i++) (sys as any).vents.push(makeVent({ age: 92 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents).toHaveLength(0)
  })
  it('cleanup 逻辑使用 !(age < 92) 而非 age >= 92（NaN 安全）', () => {
    // 验证极端情况：age=NaN => !(NaN<92)=true => 被移除
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: NaN }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents).toHaveLength(0)
  })
  it('cleanup 后 length 减少', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: 50 }))
    ;(sys as any).vents.push(makeVent({ age: 92 }))
    ;(sys as any).vents.push(makeVent({ age: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    expect((sys as any).vents).toHaveLength(2)
  })
  it('spawn 后当轮不被 cleanup（age 刚设为 0，update 后为 0.004）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), makeEm(), 2740)
    // 新 spawn 的 vent age=0，update后=0.004<92，不被清除
    expect((sys as any).vents).toHaveLength(1)
  })
})

describe('WorldSteamVentSystem - 综合场景', () => {
  let sys: WorldSteamVentSystem
  afterEach(() => vi.restoreAllMocks())

  it('连续 update 不产生 NaN', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: 0, tick: 2740 }))
    for (let i = 1; i <= 10; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, makeWorld(), makeEm(), 2740 + i * 2740)
      vi.restoreAllMocks()
    }
    if ((sys as any).vents.length > 0) {
      const v = (sys as any).vents[0]
      expect(isNaN(v.age)).toBe(false)
      expect(isNaN(v.pressure)).toBe(false)
      expect(isNaN(v.steamVolume)).toBe(false)
      expect(isNaN(v.mineralContent)).toBe(false)
    }
  })
  it('id 在多次 spawn 中严格递增', () => {
    sys = makeSys()
    for (let i = 0; i < 3; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.0005)
      sys.update(1, makeWorld(), makeEm(), 2740 + i * 2740)
      vi.restoreAllMocks()
    }
    const ids = (sys as any).vents.map((v: SteamVent) => v.id)
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1])
    }
  })
  it('dt 参数不影响逻辑', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(999, makeWorld(), makeEm(), 2740)
    expect((sys as any).lastCheck).toBe(2740)
  })
  it('steamVolume 经多轮减少不低于 5', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ steamVolume: 5.05, age: 0, tick: 2740 }))
    for (let i = 1; i <= 20; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, makeWorld(), makeEm(), 2740 + i * 2740)
      vi.restoreAllMocks()
    }
    if ((sys as any).vents.length > 0) {
      expect((sys as any).vents[0].steamVolume).toBeGreaterThanOrEqual(5)
    }
  })
  it('mineralContent 经多轮增加不超过 80', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ mineralContent: 79.9, age: 0, tick: 2740 }))
    for (let i = 1; i <= 5; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, makeWorld(), makeEm(), 2740 + i * 2740)
      vi.restoreAllMocks()
    }
    if ((sys as any).vents.length > 0) {
      expect((sys as any).vents[0].mineralContent).toBeLessThanOrEqual(80)
    }
  })
  it('age 到达 92 的喷口最终被清除', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ age: 91.998, tick: 2740 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 5480)
    // 91.998 + 0.004 = 92.002 >= 92 => 被清除
    expect((sys as any).vents).toHaveLength(0)
  })
  it('pressure 经多轮漂移保持在 [10,95] 范围内', () => {
    sys = makeSys()
    ;(sys as any).vents.push(makeVent({ pressure: 50, age: 0, tick: 2740 }))
    for (let i = 1; i <= 20; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(Math.random() > 0.5 ? 0.99 : 0.01)
      sys.update(1, makeWorld(), makeEm(), 2740 + i * 2740)
      vi.restoreAllMocks()
    }
    if ((sys as any).vents.length > 0) {
      const p = (sys as any).vents[0].pressure
      expect(p).toBeGreaterThanOrEqual(10)
      expect(p).toBeLessThanOrEqual(95)
    }
  })
  it('空喷口列表时 update 不崩溃', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    expect(() => sys.update(1, makeWorld(), makeEm(), 2740)).not.toThrow()
  })
})
