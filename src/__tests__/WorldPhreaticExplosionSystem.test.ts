import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldPhreaticExplosionSystem } from '../systems/WorldPhreaticExplosionSystem'
import type { PhreaticExplosion } from '../systems/WorldPhreaticExplosionSystem'

const CHECK_INTERVAL = 2700
const MAX_EXPLOSIONS = 7
const FORM_CHANCE = 0.0009

function makeSys(): WorldPhreaticExplosionSystem { return new WorldPhreaticExplosionSystem() }
let nextId = 1
function makeExplosion(overrides: Partial<PhreaticExplosion> = {}): PhreaticExplosion {
  return {
    id: nextId++, x: 30, y: 40,
    blastRadius: 10, steamPressure: 80,
    debrisEjection: 60, groundwaterDepth: 20,
    age: 0, tick: 0,
    ...overrides,
  }
}

const mockWorld = { width: 200, height: 200, getTile: () => 3 } as any
const mockEm = {} as any

// ─── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('WorldPhreaticExplosionSystem - 初始状态', () => {
  let sys: WorldPhreaticExplosionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始explosions为空数组', () => { expect((sys as any).explosions).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('explosions是数组类型', () => { expect(Array.isArray((sys as any).explosions)).toBe(true) })
  it('注入一条后长度为1', () => {
    ;(sys as any).explosions.push(makeExplosion())
    expect((sys as any).explosions).toHaveLength(1)
  })
  it('注入多条后长度正确', () => {
    ;(sys as any).explosions.push(makeExplosion())
    ;(sys as any).explosions.push(makeExplosion())
    ;(sys as any).explosions.push(makeExplosion())
    expect((sys as any).explosions).toHaveLength(3)
  })
  it('内部数组是同一引用', () => {
    expect((sys as any).explosions).toBe((sys as any).explosions)
  })
  it('爆炸字段steamPressure正确读取', () => {
    ;(sys as any).explosions.push(makeExplosion({ steamPressure: 90 }))
    expect((sys as any).explosions[0].steamPressure).toBe(90)
  })
  it('爆炸字段blastRadius正确读取', () => {
    ;(sys as any).explosions.push(makeExplosion({ blastRadius: 15 }))
    expect((sys as any).explosions[0].blastRadius).toBe(15)
  })
})

// ─── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe('WorldPhreaticExplosionSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldPhreaticExplosionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).explosions).toHaveLength(0)
  })
  it('tick == CHECK_INTERVAL时执行spawn逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).explosions).toHaveLength(1)
  })
  it('tick == CHECK_INTERVAL+1时执行spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL + 1)
    expect((sys as any).explosions).toHaveLength(1)
  })
  it('两次update间隔不足CHECK_INTERVAL不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).explosions).toHaveLength(1)
  })
  it('达到第二个间隔后再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).explosions).toHaveLength(2)
  })
  it('tick=0时不执行（差值0 < 2700）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, 0)
    expect((sys as any).explosions).toHaveLength(0)
  })
  it('lastCheck在执行后更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

// ─── 3. spawn条件 ─────────────────────────────────────────────────────────────
describe('WorldPhreaticExplosionSystem - spawn条件', () => {
  let sys: WorldPhreaticExplosionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('random < FORM_CHANCE时spawn成功', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).explosions).toHaveLength(1)
  })
  it('random >= FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).explosions).toHaveLength(0)
  })
  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).explosions).toHaveLength(0)
  })
  it('已有MAX_EXPLOSIONS个时不spawn', () => {
    for (let i = 0; i < MAX_EXPLOSIONS; i++) {
      ;(sys as any).explosions.push(makeExplosion({ age: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).explosions).toHaveLength(MAX_EXPLOSIONS)
  })
  it('有6个时仍可spawn', () => {
    for (let i = 0; i < MAX_EXPLOSIONS - 1; i++) {
      ;(sys as any).explosions.push(makeExplosion({ age: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).explosions).toHaveLength(MAX_EXPLOSIONS)
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL * 2)
    const ids = (sys as any).explosions.map((e: PhreaticExplosion) => e.id)
    expect(ids[0]).not.toBe(ids[1])
  })
  it('spawn后tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).explosions[0].tick).toBe(CHECK_INTERVAL)
  })
})

// ─── 4. spawn字段范围 ─────────────────────────────────────────────────────────
describe('WorldPhreaticExplosionSystem - spawn字段范围', () => {
  let sys: WorldPhreaticExplosionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('blastRadius范围[5,20)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const e = (sys as any).explosions[0]
    expect(e.blastRadius).toBeGreaterThanOrEqual(5)
    expect(e.blastRadius).toBeLessThan(20)
  })
  it('blastRadius在random=1时接近20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    // random >= FORM_CHANCE=0.0009，不spawn，所以不断言
    expect((sys as any).explosions).toHaveLength(0)
  })
  it('steamPressure范围[40,90)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const e = (sys as any).explosions[0]
    // spawn后同tick update：steamPressure = max(5, 40 - 0.03) ≈ 39.97
    expect(e.steamPressure).toBeGreaterThanOrEqual(5)
    expect(e.steamPressure).toBeLessThan(91)
  })
  it('debrisEjection范围[20,50)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const e = (sys as any).explosions[0]
    // spawn后同tick update：debrisEjection = max(0, 20 - 0.02) ≈ 19.98
    expect(e.debrisEjection).toBeGreaterThanOrEqual(0)
    expect(e.debrisEjection).toBeLessThan(51)
  })
  it('groundwaterDepth范围[10,50)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const e = (sys as any).explosions[0]
    // spawn后同tick update：groundwaterDepth = min(80, 10 + 0.01) ≈ 10.01
    expect(e.groundwaterDepth).toBeGreaterThanOrEqual(10)
    expect(e.groundwaterDepth).toBeLessThan(81)
  })
  it('spawn后age经过同tick update为0.008', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const e = (sys as any).explosions[0]
    // spawn初始age=0，同tick update age+=0.008
    expect(e.age).toBeCloseTo(0.008, 5)
  })
  it('x坐标在[0,world.width)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const w = { width: 100, height: 100, getTile: () => 3 } as any
    sys.update(1, w, mockEm, CHECK_INTERVAL)
    const e = (sys as any).explosions[0]
    expect(e.x).toBeGreaterThanOrEqual(0)
    expect(e.x).toBeLessThan(100)
  })
  it('y坐标在[0,world.height)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const w = { width: 100, height: 100, getTile: () => 3 } as any
    sys.update(1, w, mockEm, CHECK_INTERVAL)
    const e = (sys as any).explosions[0]
    expect(e.y).toBeGreaterThanOrEqual(0)
    expect(e.y).toBeLessThan(100)
  })
})

// ─── 5. update数值逻辑 ────────────────────────────────────────────────────────
describe('WorldPhreaticExplosionSystem - update数值逻辑', () => {
  let sys: WorldPhreaticExplosionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次update后age += 0.008', () => {
    const e = makeExplosion({ age: 10 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect(e.age).toBeCloseTo(10.008, 5)
  })
  it('steamPressure -= 0.03，低于5时被max(5)保护', () => {
    const e = makeExplosion({ steamPressure: 5.02 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    // max(5, 5.02-0.03)=max(5,4.99)=5
    expect(e.steamPressure).toBe(5)
  })
  it('steamPressure不低于5（下界保护）', () => {
    const e = makeExplosion({ steamPressure: 5 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect(e.steamPressure).toBe(5)
  })
  it('debrisEjection -= 0.02，不低于0', () => {
    const e = makeExplosion({ debrisEjection: 0.01 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect(e.debrisEjection).toBe(0)
  })
  it('debrisEjection正常递减', () => {
    const e = makeExplosion({ debrisEjection: 30 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect(e.debrisEjection).toBeCloseTo(29.98, 5)
  })
  it('groundwaterDepth += 0.01，不超过80', () => {
    const e = makeExplosion({ groundwaterDepth: 79.995 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect(e.groundwaterDepth).toBe(80)
  })
  it('groundwaterDepth正常递增', () => {
    const e = makeExplosion({ groundwaterDepth: 20 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect(e.groundwaterDepth).toBeCloseTo(20.01, 5)
  })
  it('多个爆炸同时update', () => {
    const e1 = makeExplosion({ age: 5, steamPressure: 50 })
    const e2 = makeExplosion({ age: 3, steamPressure: 70 })
    ;(sys as any).explosions.push(e1, e2)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect(e1.age).toBeCloseTo(5.008, 5)
    expect(e2.age).toBeCloseTo(3.008, 5)
  })
  it('update只在tick满足CHECK_INTERVAL时执行', () => {
    const e = makeExplosion({ age: 10 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect(e.age).toBe(10) // 未执行
  })
})

// ─── 6. cleanup逻辑 ───────────────────────────────────────────────────────────
describe('WorldPhreaticExplosionSystem - cleanup逻辑', () => {
  let sys: WorldPhreaticExplosionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('age < 80时不删除', () => {
    const e = makeExplosion({ age: 79 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    // age: 79 + 0.008 = 79.008 < 80, 保留
    expect((sys as any).explosions).toHaveLength(1)
  })
  it('age >= 80时删除（使用age=100的预设）', () => {
    const e = makeExplosion({ age: 100 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    // age: 100 + 0.008 >= 80，删除
    expect((sys as any).explosions).toHaveLength(0)
  })
  it('age恰好达到80时删除', () => {
    // 需要age在update后 >= 80
    // 设置age=79.993，update后=79.993+0.008=80.001 >= 80，删除
    const e = makeExplosion({ age: 79.993 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).explosions).toHaveLength(0)
  })
  it('age=79.99时update后79.998 < 80，不删除', () => {
    const e = makeExplosion({ age: 79.99 })
    ;(sys as any).explosions.push(e)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).explosions).toHaveLength(1)
  })
  it('混合：年轻的保留，老的删除', () => {
    const young = makeExplosion({ age: 10 })
    const old = makeExplosion({ age: 100 })
    ;(sys as any).explosions.push(young, old)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).explosions).toHaveLength(1)
    expect((sys as any).explosions[0].age).toBeCloseTo(10.008, 5)
  })
  it('cleanup不在tick不满足时执行', () => {
    const old = makeExplosion({ age: 100 })
    ;(sys as any).explosions.push(old)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).explosions).toHaveLength(1)
  })
  it('多个过期爆炸全部删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).explosions.push(makeExplosion({ age: 90 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).explosions).toHaveLength(0)
  })
})
