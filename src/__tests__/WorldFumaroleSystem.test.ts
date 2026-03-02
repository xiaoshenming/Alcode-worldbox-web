import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldFumaroleSystem } from '../systems/WorldFumaroleSystem'
import type { Fumarole } from '../systems/WorldFumaroleSystem'

const CHECK_INTERVAL = 2700
const MAX_FUMAROLES = 11

const world = { width: 200, height: 200 } as any
const em = {} as any

function makeSys() { return new WorldFumaroleSystem() }

function injectFumaroles(sys: WorldFumaroleSystem, items: Fumarole[]) {
  ;(sys as any).fumaroles = items
}

function getFumaroles(sys: WorldFumaroleSystem): Fumarole[] {
  return (sys as any).fumaroles
}

/** 强制让系统执行一次update（绕过节流），使用指定tick */
function runOnce(sys: WorldFumaroleSystem, tick: number) {
  ;(sys as any).lastCheck = tick - CHECK_INTERVAL
  sys.update(1, world, em, tick)
}

let nextId = 1
function makeFumarole(overrides: Partial<Fumarole> = {}): Fumarole {
  return {
    id: nextId++,
    x: 15, y: 25,
    steamIntensity: 30,
    sulfurDeposit: 10,
    temperature: 150,
    activityCycle: 0,
    tick: 1000,
    ...overrides,
  }
}

beforeEach(() => { nextId = 1; vi.restoreAllMocks() })

describe('WorldFumaroleSystem', () => {

  // === 1. 基础状态 ===
  describe('初始状态', () => {
    it('fumaroles初始为空数组', () => {
      const sys = makeSys()
      expect(getFumaroles(sys)).toHaveLength(0)
    })

    it('lastCheck初始为0', () => {
      const sys = makeSys()
      expect((sys as any).lastCheck).toBe(0)
    })

    it('nextId初始为1', () => {
      const sys = makeSys()
      expect((sys as any).nextId).toBe(1)
    })

    it('注入fumarole后可读取', () => {
      const sys = makeSys()
      injectFumaroles(sys, [makeFumarole()])
      expect(getFumaroles(sys)).toHaveLength(1)
    })

    it('注入多个fumarole均可读取', () => {
      const sys = makeSys()
      injectFumaroles(sys, [makeFumarole(), makeFumarole()])
      expect(getFumaroles(sys)).toHaveLength(2)
    })
  })

  // === 2. CHECK_INTERVAL节流 ===
  describe('CHECK_INTERVAL节流', () => {
    it('tick<CHECK_INTERVAL时首次update被节流跳过', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
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
      runOnce(sys, 99999)
      expect((sys as any).lastCheck).toBe(99999)
    })
  })

  // === 3. spawn条件 ===
  describe('fumarole生成条件', () => {
    it('random=0.9 > FORM_CHANCE时不生成', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFumaroles(sys)).toHaveLength(0)
    })

    it('random=0时生成新fumarole', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFumaroles(sys)).toHaveLength(1)
    })

    it('已达MAX_FUMAROLES时不再生成', () => {
      const sys = makeSys()
      const full = Array.from({ length: MAX_FUMAROLES }, (_, i) =>
        makeFumarole({ id: i + 1, temperature: 200 }))
      injectFumaroles(sys, full)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFumaroles(sys)).toHaveLength(MAX_FUMAROLES)
    })

    it('低于MAX_FUMAROLES时random=0可以生成', () => {
      const sys = makeSys()
      injectFumaroles(sys, [makeFumarole({ temperature: 200 })])
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFumaroles(sys).length).toBeGreaterThan(1)
    })

    it('生成的fumarole有正确tick', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, 8888)
      expect(getFumaroles(sys)[0].tick).toBe(8888)
    })

    it('生成的fumarole坐标在world范围内', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      const f = getFumaroles(sys)[0]
      expect(f.x).toBeGreaterThanOrEqual(0)
      expect(f.x).toBeLessThan(200)
    })

    it('生成的fumarole activityCycle在spawn后同帧被更新为0.01', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      // activityCycle初始为0，spawn后同一tick内update将其增加0.01
      expect(getFumaroles(sys)[0].activityCycle).toBeCloseTo(0.01, 10)
    })
  })

  // === 4. 字段更新逻辑 ===
  describe('字段更新逻辑', () => {
    it('activityCycle每次update增加0.01', () => {
      const sys = makeSys()
      const f = makeFumarole({ activityCycle: 0, temperature: 200 })
      injectFumaroles(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.activityCycle).toBeCloseTo(0.01, 10)
    })

    it('steamIntensity = 20 + 15*sin(activityCycle)', () => {
      const sys = makeSys()
      const f = makeFumarole({ activityCycle: 0, temperature: 200 })
      injectFumaroles(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      // activityCycle变为0.01后: 20 + 15*sin(0.01)
      const expected = 20 + 15 * Math.sin(0.01)
      expect(f.steamIntensity).toBeCloseTo(expected, 5)
    })

    it('sulfurDeposit每次增加0.005', () => {
      const sys = makeSys()
      const f = makeFumarole({ sulfurDeposit: 50, temperature: 200 })
      injectFumaroles(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.sulfurDeposit).toBeCloseTo(50.005, 5)
    })

    it('sulfurDeposit不超过100（上界）', () => {
      const sys = makeSys()
      const f = makeFumarole({ sulfurDeposit: 100, temperature: 200 })
      injectFumaroles(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.sulfurDeposit).toBe(100)
    })

    it('temperature每次减少0.01', () => {
      const sys = makeSys()
      const f = makeFumarole({ temperature: 100, activityCycle: 0 })
      injectFumaroles(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.temperature).toBeCloseTo(99.99, 5)
    })

    it('temperature降低但实际数值可低于50（更新在cleanup前）', () => {
      const sys = makeSys()
      const f = makeFumarole({ temperature: 50.005, activityCycle: 0 })
      injectFumaroles(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      // 更新：temperature=Math.max(50, 50.005-0.01)=Math.max(50,49.995)=50
      expect(f.temperature).toBe(50)
    })

    it('temperature到达Math.max(50,...)边界后保持50', () => {
      const sys = makeSys()
      const f = makeFumarole({ temperature: 50, activityCycle: 0 })
      injectFumaroles(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      // temperature=Math.max(50, 50-0.01)=50，然后50<=50被删除
      runOnce(sys, CHECK_INTERVAL)
      // 先更新temperature=50，再cleanup删除(temperature<=50)
      expect(getFumaroles(sys)).toHaveLength(0)
    })
  })

  // === 5. cleanup - temperature<=50删除 ===
  describe('cleanup - temperature<=50删除', () => {
    it('temperature=50时被删除', () => {
      const sys = makeSys()
      injectFumaroles(sys, [makeFumarole({ temperature: 50, activityCycle: 0 })])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFumaroles(sys)).toHaveLength(0)
    })

    it('temperature<50时被删除', () => {
      const sys = makeSys()
      injectFumaroles(sys, [makeFumarole({ temperature: 49, activityCycle: 0 })])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFumaroles(sys)).toHaveLength(0)
    })

    it('temperature>51时保留', () => {
      const sys = makeSys()
      injectFumaroles(sys, [makeFumarole({ temperature: 100 })])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFumaroles(sys)).toHaveLength(1)
    })

    it('混合：temperature<=50的被删除，高temperature的保留', () => {
      const sys = makeSys()
      injectFumaroles(sys, [
        makeFumarole({ temperature: 50 }),
        makeFumarole({ temperature: 200 }),
      ])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFumaroles(sys)).toHaveLength(1)
      expect(getFumaroles(sys)[0].temperature).toBeGreaterThan(50)
    })

    it('全部temperature<=50时全被删除', () => {
      const sys = makeSys()
      injectFumaroles(sys, [
        makeFumarole({ temperature: 30 }),
        makeFumarole({ temperature: 50 }),
      ])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFumaroles(sys)).toHaveLength(0)
    })

    it('空数组时cleanup不崩溃', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => runOnce(sys, CHECK_INTERVAL)).not.toThrow()
    })
  })

  // === 6. MAX上限 ===
  describe('MAX_FUMAROLES=11上限', () => {
    it('达到MAX_FUMAROLES时random=0也不再新增', () => {
      const sys = makeSys()
      const full = Array.from({ length: MAX_FUMAROLES }, (_, i) =>
        makeFumarole({ id: i + 1, temperature: 200 }))
      injectFumaroles(sys, full)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFumaroles(sys).length).toBeLessThanOrEqual(MAX_FUMAROLES)
    })

    it('低于MAX_FUMAROLES时random=0可以新增', () => {
      const sys = makeSys()
      injectFumaroles(sys, [makeFumarole({ temperature: 200 })])
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFumaroles(sys).length).toBeGreaterThan(1)
    })

    it('生成的fumarole id连续自增', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      runOnce(sys, CHECK_INTERVAL * 2)
      const ids = getFumaroles(sys).map(f => f.id)
      expect(ids[0]).toBe(1)
      expect(ids[1]).toBe(2)
    })
  })

})
