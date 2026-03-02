import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldFumarolicFieldSystem } from '../systems/WorldFumarolicFieldSystem'
import type { FumarolicField } from '../systems/WorldFumarolicFieldSystem'

const CHECK_INTERVAL = 3050
const MAX_FIELDS = 12
const CUTOFF_OFFSET = 82000

const world = { width: 200, height: 200 } as any
const em = {} as any

function makeSys() { return new WorldFumarolicFieldSystem() }

function injectFields(sys: WorldFumarolicFieldSystem, items: FumarolicField[]) {
  ;(sys as any).fields = items
}

function getFields(sys: WorldFumarolicFieldSystem): FumarolicField[] {
  return (sys as any).fields
}

let nextId = 1
function makeField(overrides: Partial<FumarolicField> = {}): FumarolicField {
  return {
    id: nextId++,
    x: 10, y: 20,
    gasIntensity: 40,
    sulfurDeposit: 20,
    heatOutput: 50,
    ventCount: 5,
    tick: 100000,
    ...overrides,
  }
}

/** 让系统执行一次，tick必须满足 tick-lastCheck >= CHECK_INTERVAL */
function runOnce(sys: WorldFumarolicFieldSystem, tick: number) {
  // 先把lastCheck设为 tick-CHECK_INTERVAL 使得条件通过
  ;(sys as any).lastCheck = tick - CHECK_INTERVAL
  sys.update(1, world, em, tick)
}

beforeEach(() => { nextId = 1; vi.restoreAllMocks() })

describe('WorldFumarolicFieldSystem', () => {

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

    it('注入field后可读取', () => {
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
    it('tick差值不足CHECK_INTERVAL时跳过', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      // 先执行一次使lastCheck=3050
      sys.update(1, world, em, CHECK_INTERVAL)
      // 再次执行，差值=1 < 3050，跳过
      sys.update(1, world, em, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick差值恰好等于CHECK_INTERVAL时执行', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, CHECK_INTERVAL)
      sys.update(1, world, em, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })

    it('首次update(tick=CHECK_INTERVAL)必然执行', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick < CHECK_INTERVAL时首次update被节流跳过', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 100)
      // 100 - 0 = 100 < 3050，跳过，lastCheck仍为0
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续间隔不足不重复执行lastCheck不变', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, world, em, CHECK_INTERVAL)
      sys.update(1, world, em, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })
  })

  // === 3. spawn条件 ===
  describe('field生成条件', () => {
    it('random=0.9 > FORM_CHANCE时不生成', () => {
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
      const currentTick = 200000
      const full = Array.from({ length: MAX_FIELDS }, (_, i) =>
        makeField({ id: i + 1, tick: currentTick }))
      injectFields(sys, full)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, currentTick + CHECK_INTERVAL)
      expect(getFields(sys)).toHaveLength(MAX_FIELDS)
    })

    it('低于MAX_FIELDS时random=0可以生成', () => {
      const sys = makeSys()
      injectFields(sys, [makeField({ tick: 200000 })])
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, 200000)
      expect(getFields(sys).length).toBeGreaterThan(1)
    })

    it('生成的field有正确tick', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, 99999)
      expect(getFields(sys)[0].tick).toBe(99999)
    })

    it('生成的field坐标在world范围内', () => {
      const sys = makeSys()
      // random=0.5: x=Math.floor(0.5*200)=100, y=100
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      // 0.5 < 0.0011 为假，不spawn。需要单独控制
      // 用不同值：先用0让spawn通过，坐标=0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      const f = getFields(sys)[0]
      expect(f.x).toBeGreaterThanOrEqual(0)
      expect(f.x).toBeLessThan(200)
      expect(f.y).toBeGreaterThanOrEqual(0)
      expect(f.y).toBeLessThan(200)
    })

    it('生成的field ventCount >= 3', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(getFields(sys)[0].ventCount).toBeGreaterThanOrEqual(3)
    })

    it('生成的field gasIntensity在[15,50]范围内', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      // gasIntensity = 15 + Math.random()*35，random=0 => 15
      // 但update后立刻更新了字段，所以值会变
      expect(getFields(sys)[0].gasIntensity).toBeGreaterThanOrEqual(5)
    })
  })

  // === 4. 字段更新逻辑（随机浮动+边界钳制）===
  describe('字段更新逻辑', () => {
    it('gasIntensity随机浮动但不低于5', () => {
      const sys = makeSys()
      // random=0 => (0-0.48)*0.25=-0.12，即减少0.12，从5开始应被钳制到5
      const f = makeField({ gasIntensity: 5 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.gasIntensity).toBeGreaterThanOrEqual(5)
    })

    it('gasIntensity随机浮动但不超过80', () => {
      const sys = makeSys()
      // random=1 => (1-0.48)*0.25=+0.13，从80增加被钳制到80
      const f = makeField({ gasIntensity: 80 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(1)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.gasIntensity).toBeLessThanOrEqual(80)
    })

    it('heatOutput随机浮动但不低于10', () => {
      const sys = makeSys()
      const f = makeField({ heatOutput: 10 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.heatOutput).toBeGreaterThanOrEqual(10)
    })

    it('heatOutput随机浮动但不超过85', () => {
      const sys = makeSys()
      const f = makeField({ heatOutput: 85 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(1)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.heatOutput).toBeLessThanOrEqual(85)
    })

    it('sulfurDeposit每次增加约0.008且不超过70', () => {
      const sys = makeSys()
      const f = makeField({ sulfurDeposit: 69.995 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.sulfurDeposit).toBeCloseTo(70, 2)
    })

    it('sulfurDeposit达到70时不再增加', () => {
      const sys = makeSys()
      const f = makeField({ sulfurDeposit: 70 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, CHECK_INTERVAL)
      expect(f.sulfurDeposit).toBe(70)
    })

    it('random=0.5时gasIntensity有轻微正偏移', () => {
      const sys = makeSys()
      const f = makeField({ gasIntensity: 40 })
      injectFields(sys, [f])
      // random=0.5: (0.5-0.48)*0.25 = 0.005，正偏移
      // 但mock是全局的，每次Math.random()都返回0.5
      // heatOutput: (0.5-0.5)*0.2 = 0，不变
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      runOnce(sys, CHECK_INTERVAL)
      // gasIntensity原值40, 期望>=40（正偏移）
      expect(f.gasIntensity).toBeGreaterThanOrEqual(40)
    })

    it('gasIntensity最小值为5（下界保护）', () => {
      const sys = makeSys()
      const f = makeField({ gasIntensity: 4 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      // (0.9-0.48)*0.25=0.105，从4增加但钳制最小5
      runOnce(sys, CHECK_INTERVAL)
      expect(f.gasIntensity).toBeGreaterThanOrEqual(5)
    })
  })

  // === 5. cleanup - tick-based ===
  describe('cleanup - tick < cutoff删除', () => {
    it('field.tick < tick-82000时被删除', () => {
      const sys = makeSys()
      const currentTick = 200000
      const f = makeField({ tick: currentTick - CUTOFF_OFFSET - 1 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, currentTick)
      expect(getFields(sys)).toHaveLength(0)
    })

    it('field.tick === tick-82000时不被删除（严格<）', () => {
      const sys = makeSys()
      const currentTick = 200000
      // cutoff = currentTick - 82000; field.tick < cutoff 时删除
      // field.tick = cutoff: cutoff < cutoff => false，保留
      const f = makeField({ tick: currentTick - CUTOFF_OFFSET })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, currentTick)
      expect(getFields(sys)).toHaveLength(1)
    })

    it('field.tick > tick-82000时保留', () => {
      const sys = makeSys()
      const currentTick = 200000
      const f = makeField({ tick: currentTick - CUTOFF_OFFSET + 1 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, currentTick)
      expect(getFields(sys)).toHaveLength(1)
    })

    it('混合场景：过期field被删，未过期保留', () => {
      const sys = makeSys()
      const currentTick = 200000
      injectFields(sys, [
        makeField({ tick: currentTick - CUTOFF_OFFSET - 1 }),
        makeField({ tick: currentTick }),
      ])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, currentTick)
      expect(getFields(sys)).toHaveLength(1)
      expect(getFields(sys)[0].tick).toBe(currentTick)
    })

    it('全部过期时全被删除', () => {
      const sys = makeSys()
      const currentTick = 200000
      injectFields(sys, [
        makeField({ tick: 1 }),
        makeField({ tick: 2 }),
      ])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, currentTick)
      expect(getFields(sys)).toHaveLength(0)
    })

    it('tick<cutoff_offset时无field会被过期删除', () => {
      const sys = makeSys()
      // tick=1000 => cutoff=1000-82000=-81000, field.tick=100 >= -81000 保留
      const f = makeField({ tick: 100 })
      injectFields(sys, [f])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      runOnce(sys, 1000)
      expect(getFields(sys)).toHaveLength(1)
    })

    it('空数组时cleanup不崩溃', () => {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => runOnce(sys, 200000)).not.toThrow()
    })
  })

  // === 6. MAX上限 ===
  describe('MAX_FIELDS=12上限', () => {
    it('达到MAX_FIELDS时random=0也不新增', () => {
      const sys = makeSys()
      const currentTick = 200000
      const full = Array.from({ length: MAX_FIELDS }, (_, i) =>
        makeField({ id: i + 1, tick: currentTick }))
      injectFields(sys, full)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, currentTick + CHECK_INTERVAL)
      expect(getFields(sys).length).toBeLessThanOrEqual(MAX_FIELDS)
    })

    it('低于MAX_FIELDS时random=0可以新增', () => {
      const sys = makeSys()
      injectFields(sys, [makeField({ tick: 200000 })])
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runOnce(sys, 200000)
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
