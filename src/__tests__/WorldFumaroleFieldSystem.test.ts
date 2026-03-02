import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldFumaroleFieldSystem } from '../systems/WorldFumaroleFieldSystem'
import type { FumaroleField } from '../systems/WorldFumaroleFieldSystem'

const CHECK_INTERVAL = 2720
const MAX_FIELDS = 6

const world = { width: 200, height: 200 } as any
const em = {} as any

function makeSys() { return new WorldFumaroleFieldSystem() }

function injectFields(sys: WorldFumaroleFieldSystem, items: FumaroleField[]) {
  ;(sys as any).fields = items
}

function getFields(sys: WorldFumaroleFieldSystem): FumaroleField[] {
  return (sys as any).fields
}

/** 强制让系统执行一次update（绕过节流），使用指定tick */
function runOnce(sys: WorldFumaroleFieldSystem, tick: number) {
  ;(sys as any).lastCheck = tick - CHECK_INTERVAL
  sys.update(1, world, em, tick)
}

let nextId = 1
function makeField(overrides: Partial<FumaroleField> = {}): FumaroleField {
  return {
    id: nextId++,
    x: 10, y: 20,
    ventCount: 5,
    gasEmission: 50,
    sulfurDeposit: 15,
    heatIntensity: 40,
    age: 0,
    tick: 1000,
    ...overrides,
  }
}

beforeEach(() => { nextId = 1; vi.restoreAllMocks() })

describe('WorldFumaroleFieldSystem', () => {

  // === 1. 基础状态 ===
  describe('初始状态', () => {
    it('fields初始为空数组', () => {
      const sys = makeSys()
      expect(getFields(sys)).toHaveLength(0)
    })

    it('lastCheck初始为0', () => {
      const sys = makeSys()
      expect((sys as any).lastCheck).toBe(0)
    })

    it('nextId初始为1', () => {
      const sys = makeSys()
      expect((sys as any).nextId).toBe(1)
    })

    it('注入field后可通过getFields读取', () => {
      const sys = makeSys()
      injectFields(sys, [makeField()])
      expect(getFields(sys)).toHaveLength(1)
    })

    it('注入多个field均可读取', () => {
      const sys = makeSys()
      injectFields(sys, [makeField(), makeField(), makeField()])
      expect(getFields(sys)).toHaveLength(3)
    })
  })

  // === 2. CHECK_INTERVAL节流 ===
  describe('CHECK_INTERVAL节流', () => {
    it('tick<CHECK_INTERVAL时首次update被节流跳过', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      // tick=100, lastCheck=0: 100-0=100 < 2720, 跳过
      sys.update(1, world, em, 100)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=CHECK_INTERVAL时首次update执行', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, world, em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('连续update间隔不足时跳过第二次', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, world, em, CHECK_INTERVAL)
      sys.update(1, world, em, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('间隔恰好等于CHECK_INTERVAL时第二次执行', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, world, em, CHECK_INTERVAL)
      sys.update(1, world, em, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })

    it('runOnce辅助函数确保update被执行', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, 12345)
      expect((sys as any).lastCheck).toBe(12345)
    })
  })

  // === 3. spawn条件 ===
  describe('field生成条件', () => {
    it('random=0.9 > FORM_CHANCE时不生成新field', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFields(sys)).toHaveLength(0)
    })

    it('random=0时生成新field', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFields(sys)).toHaveLength(1)
    })

    it('已达MAX_FIELDS时不再生成', () => {
      const sys = makeSys()
      const full = Array.from({ length: MAX_FIELDS }, (_, i) => makeField({ id: i + 1 }))
      injectFields(sys, full)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFields(sys)).toHaveLength(MAX_FIELDS)
    })

    it('低于MAX_FIELDS时random=0可以生成', () => {
      const sys = makeSys()
      injectFields(sys, [makeField({ age: 0 })])
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFields(sys).length).toBeGreaterThan(1)
    })

    it('生成的field有正确的tick戳', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, 5000)
      expect(getFields(sys)[0].tick).toBe(5000)
    })

    it('生成的field坐标在world范围内', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      const f = getFields(sys)[0]
      expect(f.x).toBeGreaterThanOrEqual(0)
      expect(f.x).toBeLessThan(200)
      expect(f.y).toBeGreaterThanOrEqual(0)
      expect(f.y).toBeLessThan(200)
    })
  })

  // === 4. 字段更新逻辑 ===
  describe('字段更新逻辑', () => {
    it('每次update后age增加0.004', () => {
      const sys = makeSys()
      const f = makeField({ age: 0 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.age).toBeCloseTo(0.004, 10)
    })

    it('gasEmission每次减少0.008', () => {
      const sys = makeSys()
      const f = makeField({ gasEmission: 30 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.gasEmission).toBeCloseTo(29.992, 5)
    })

    it('gasEmission不低于5（下界）', () => {
      const sys = makeSys()
      const f = makeField({ gasEmission: 5 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.gasEmission).toBe(5)
    })

    it('sulfurDeposit每次增加0.012', () => {
      const sys = makeSys()
      const f = makeField({ sulfurDeposit: 20 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.sulfurDeposit).toBeCloseTo(20.012, 5)
    })

    it('sulfurDeposit不超过90（上界）', () => {
      const sys = makeSys()
      const f = makeField({ sulfurDeposit: 90 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.sulfurDeposit).toBe(90)
    })

    it('heatIntensity每次减少0.005', () => {
      const sys = makeSys()
      const f = makeField({ heatIntensity: 40 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.heatIntensity).toBeCloseTo(39.995, 5)
    })

    it('heatIntensity不低于10（下界）', () => {
      const sys = makeSys()
      const f = makeField({ heatIntensity: 10 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.heatIntensity).toBe(10)
    })
  })

  // === 5. cleanup - age>=95删除 ===
  describe('cleanup - age>=95删除', () => {
    it('age=94时不删除', () => {
      const sys = makeSys()
      const f = makeField({ age: 94 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      // age变为94.004 < 95，保留
      expect(getFields(sys)).toHaveLength(1)
    })

    it('age=94.9999后+0.004>=95被删除', () => {
      const sys = makeSys()
      const f = makeField({ age: 94.9999 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      // age = 94.9999+0.004 = 95.0039 >= 95，被删除
      expect(getFields(sys)).toHaveLength(0)
    })

    it('age=50时保留', () => {
      const sys = makeSys()
      const f = makeField({ age: 50 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFields(sys)).toHaveLength(1)
    })

    it('age>=95的field被删除', () => {
      const sys = makeSys()
      const f = makeField({ age: 95 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFields(sys)).toHaveLength(0)
    })

    it('混合场景：老field被删除，新field保留', () => {
      const sys = makeSys()
      injectFields(sys, [makeField({ age: 95 }), makeField({ age: 10 })])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFields(sys)).toHaveLength(1)
      expect(getFields(sys)[0].age).toBeCloseTo(10.004, 5)
    })

    it('全部过期field均被删除', () => {
      const sys = makeSys()
      injectFields(sys, [makeField({ age: 100 }), makeField({ age: 200 })])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFields(sys)).toHaveLength(0)
    })

    it('空数组时cleanup不崩溃', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => runOnce(sys, CHECK_INTERVAL)).not.toThrow()
    })
  })

  // === 6. MAX上限 ===
  describe('MAX_FIELDS=6上限', () => {
    it('达到MAX_FIELDS时random=0不新增', () => {
      const sys = makeSys()
      const full = Array.from({ length: MAX_FIELDS }, (_, i) => makeField({ id: i + 1 }))
      injectFields(sys, full)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFields(sys).length).toBeLessThanOrEqual(MAX_FIELDS)
    })

    it('低于MAX_FIELDS时random=0可以新增', () => {
      const sys = makeSys()
      injectFields(sys, [makeField({ age: 0 })])
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFields(sys).length).toBeGreaterThan(1)
    })

    it('生成的field id从1开始自增', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      runOnce(sys, CHECK_INTERVAL * 2)
      const ids = getFields(sys).map(f => f.id)
      expect(ids[0]).toBe(1)
      expect(ids[1]).toBe(2)
    })
  })

})
