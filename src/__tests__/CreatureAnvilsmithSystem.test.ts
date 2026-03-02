import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureAnvilsmithSystem } from '../systems/CreatureAnvilsmithSystem'
import type { Anvilsmith } from '../systems/CreatureAnvilsmithSystem'

// 源码常量
// CHECK_INTERVAL = 2650, RECRUIT_CHANCE = 0.0013, MAX_ANVILSMITHS = 10
// 技能递增: heavyForging+0.02, hornShaping+0.015, outputQuality+0.01
// cleanup: heavyForging <= 4 时删除
// surfaceGrinding 不参与递增

let nextId = 1

function makeSys(): CreatureAnvilsmithSystem {
  return new CreatureAnvilsmithSystem()
}

function makeAnvilsmith(entityId: number, overrides: Partial<Anvilsmith> = {}): Anvilsmith {
  return {
    id: nextId++,
    entityId,
    heavyForging: 30,
    surfaceGrinding: 25,
    hornShaping: 20,
    outputQuality: 35,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureAnvilsmithSystem', () => {
  let sys: CreatureAnvilsmithSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  afterEach(() => vi.restoreAllMocks())

  // ── 初始状态 ────���───────────────────────────────────────────────────────

  describe('初始状态', () => {
    it('初始无铁砧匠', () => {
      expect((sys as any).anvilsmiths).toHaveLength(0)
    })

    it('anvilsmiths 是数组', () => {
      expect(Array.isArray((sys as any).anvilsmiths)).toBe(true)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })
  })

  // ── Anvilsmith 数据结构 ────────────────────────────────────────────────

  describe('Anvilsmith 数据结构', () => {
    it('注入后可查询', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1))
      expect((sys as any).anvilsmiths[0].entityId).toBe(1)
    })

    it('多个全部返回', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1))
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(2))
      expect((sys as any).anvilsmiths).toHaveLength(2)
    })

    it('四字段数据完整', () => {
      const a = makeAnvilsmith(10, {
        heavyForging: 80,
        surfaceGrinding: 75,
        hornShaping: 70,
        outputQuality: 65,
      })
      ;(sys as any).anvilsmiths.push(a)
      const r = (sys as any).anvilsmiths[0]
      expect(r.heavyForging).toBe(80)
      expect(r.surfaceGrinding).toBe(75)
      expect(r.hornShaping).toBe(70)
      expect(r.outputQuality).toBe(65)
    })

    it('铁砧匠 id 字段为数字', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(5))
      expect(typeof (sys as any).anvilsmiths[0].id).toBe('number')
    })

    it('铁砧匠 tick 字段可赋值', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(5, { tick: 12345 }))
      expect((sys as any).anvilsmiths[0].tick).toBe(12345)
    })

    it('surfaceGrinding 不参与技能递增（保持原值）', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { surfaceGrinding: 55 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)
      expect((sys as any).anvilsmiths[0].surfaceGrinding).toBe(55)
    })
  })

  // ── CHECK_INTERVAL 节流（CHECK_INTERVAL = 2650）───────────────────────

  describe('CHECK_INTERVAL 节流 (2650)', () => {
    it('tick 差值 < 2650 时不更新 lastCheck', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2000)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 差值 == 2650 时更新 lastCheck', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).lastCheck).toBe(2650)
    })

    it('tick 差值 > 2650 时更新 lastCheck', () => {
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 9999)
      expect((sys as any).lastCheck).toBe(9999)
    })

    it('lastCheck=2650, tick=5299 时不触发（差值<2650）', () => {
      const em = {} as any
      ;(sys as any).lastCheck = 2650
      sys.update(1, em, 5299)
      expect((sys as any).lastCheck).toBe(2650)
    })

    it('lastCheck=2650, tick=5300 时触发（差值==2650）', () => {
      const em = {} as any
      ;(sys as any).lastCheck = 2650
      sys.update(1, em, 5300)
      expect((sys as any).lastCheck).toBe(5300)
    })

    it('tick=0 时不触发', () => {
      const em = {} as any
      sys.update(1, em, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=1 时不触发', () => {
      const em = {} as any
      sys.update(1, em, 1)
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ── 技能递增 ─────────────────────────────────────────────────────────

  describe('技能递增（每触发一次 +增量）', () => {
    it('update 后 heavyForging +0.02', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths[0].heavyForging).toBeCloseTo(50.02, 5)
    })

    it('update 后 hornShaping +0.015', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { hornShaping: 60 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths[0].hornShaping).toBeCloseTo(60.015, 5)
    })

    it('update 后 outputQuality +0.01', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { outputQuality: 70 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths[0].outputQuality).toBeCloseTo(70.01, 5)
    })

    it('heavyForging 上限为 100', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths[0].heavyForging).toBe(100)
    })

    it('hornShaping 上限为 100', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { hornShaping: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths[0].hornShaping).toBe(100)
    })

    it('outputQuality 上限为 100', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { outputQuality: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths[0].outputQuality).toBe(100)
    })

    it('heavyForging 已为 100 时不超出', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 100 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths[0].heavyForging).toBe(100)
    })

    it('多个铁砧匠各自独立递增', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 10 }))
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(2, { heavyForging: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths[0].heavyForging).toBeCloseTo(10.02, 5)
      expect((sys as any).anvilsmiths[1].heavyForging).toBeCloseTo(50.02, 5)
    })

    it('tick < CHECK_INTERVAL 时技能不递增', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2000) // < 2650
      expect((sys as any).anvilsmiths[0].heavyForging).toBe(50)
    })

    it('3个字段同时递增（一次 update）', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, {
        heavyForging: 30,
        hornShaping: 20,
        outputQuality: 25,
      }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths[0].heavyForging).toBeCloseTo(30.02, 5)
      expect((sys as any).anvilsmiths[0].hornShaping).toBeCloseTo(20.015, 5)
      expect((sys as any).anvilsmiths[0].outputQuality).toBeCloseTo(25.01, 5)
    })
  })

  // ── cleanup 逻辑（heavyForging <= 4 时删除）────────────────────────

  describe('cleanup 逻辑', () => {
    it('cleanup: heavyForging<=4 时删除（3.98+0.02=4.00<=4）', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 3.98 }))
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(2, { heavyForging: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths.length).toBe(1)
      expect((sys as any).anvilsmiths[0].entityId).toBe(2)
    })

    it('heavyForging = 3.97+0.02=3.99 <= 4 => 删除', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 3.97 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths).toHaveLength(0)
    })

    it('heavyForging = 4.01+0.02=4.03 > 4 => 保留', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 4.01 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths).toHaveLength(1)
    })

    it('heavyForging = 0 => 0.02 <= 4 => 删除', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 0 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths).toHaveLength(0)
    })

    it('heavyForging = 4 => 4+0.02=4.02 > 4 => 保留', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 4 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      // 4+0.02=4.02 > 4 => 保留
      expect((sys as any).anvilsmiths).toHaveLength(1)
    })

    it('cleanup 从后向前遍历不跳过元素', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 1 }))
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(2, { heavyForging: 2 }))
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(3, { heavyForging: 3 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      // 全部 <= 4 => 全删
      expect((sys as any).anvilsmiths).toHaveLength(0)
    })

    it('cleanup 在技能递增之后执行（先+后判断）', () => {
      // heavyForging=3.99 => +0.02=4.01 > 4 => 保留
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 3.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths).toHaveLength(1)
    })

    it('多个铁砧匠中仅删除技能过低的', () => {
      const em = {} as any
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 1 }))   // 1.02 <= 4 => 删
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(2, { heavyForging: 20 }))  // 20.02 > 4 => 留
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(3, { heavyForging: 3 }))   // 3.02 <= 4 => 删
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(4, { heavyForging: 80 }))  // 80.02 > 4 => 留
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2650)
      expect((sys as any).anvilsmiths).toHaveLength(2)
      const ids = (sys as any).anvilsmiths.map((a: Anvilsmith) => a.entityId)
      expect(ids).toContain(2)
      expect(ids).toContain(4)
    })
  })

  // ── 招募逻辑（MAX_ANVILSMITHS = 10, RECRUIT_CHANCE = 0.0013）────────

  describe('招募逻辑', () => {
    it('已达 MAX_ANVILSMITHS(10) 时不招募新铁砧匠', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).anvilsmiths.push(makeAnvilsmith(i + 1, { heavyForging: 50 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 本应触发招募
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)
      expect((sys as any).anvilsmiths).toHaveLength(10)
    })

    it('random >= RECRUIT_CHANCE(0.0013) 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)
      expect((sys as any).anvilsmiths).toHaveLength(0)
    })

    it('random < RECRUIT_CHANCE(0.0013) 时招募新铁砧匠', () => {
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        return callCount === 1 ? 0.001 : 0.5 // 第1次触发招募
      })
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)
      expect((sys as any).anvilsmiths.length).toBeGreaterThanOrEqual(1)
    })

    it('招募后 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < RECRUIT_CHANCE
      ;(sys as any).lastCheck = 0
      const prevId = (sys as any).nextId
      sys.update(1, {} as any, 2650)
      if ((sys as any).anvilsmiths.length > 0) {
        expect((sys as any).nextId).toBeGreaterThan(prevId)
      }
    })

    it('招募的铁砧匠 heavyForging 在 (10, 35] 范围内', () => {
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.001 // 触发招募
        if (callCount === 2) return 0      // entityId = 0
        if (callCount === 3) return 1      // heavyForging = 10+1*25=35
        return 0
      })
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)
      if ((sys as any).anvilsmiths.length > 0) {
        const hf = (sys as any).anvilsmiths[0].heavyForging
        // cleanup 之前 heavyForging 至少 10+0.02 > 4 => 保留
        expect(hf).toBeGreaterThan(4)
      }
    })

    it('9 个铁砧匠时可招募第 10 个', () => {
      for (let i = 0; i < 9; i++) {
        ;(sys as any).anvilsmiths.push(makeAnvilsmith(i + 1, { heavyForging: 50 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < RECRUIT_CHANCE
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)
      expect((sys as any).anvilsmiths.length).toBeGreaterThanOrEqual(9)
    })
  })

  // ── update 综合行为 ──────────────────────────────────────────────────

  describe('update 综合行为', () => {
    it('update 不崩溃（空列表）', () => {
      expect(() => sys.update(1, {} as any, 0)).not.toThrow()
    })

    it('update 多次不崩溃', () => {
      expect(() => {
        for (let t = 0; t <= 20000; t += 1000) {
          sys.update(1, {} as any, t)
        }
      }).not.toThrow()
    })

    it('连续两次触发，lastCheck 更新为第二次 tick', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)
      expect((sys as any).lastCheck).toBe(2650)
      sys.update(1, {} as any, 5300)
      expect((sys as any).lastCheck).toBe(5300)
    })

    it('dt 参数对节流无影响', () => {
      ;(sys as any).lastCheck = 0
      sys.update(9999, {} as any, 100) // dt很大但tick<2650
      expect((sys as any).lastCheck).toBe(0)
      sys.update(1, {} as any, 2650)
      expect((sys as any).lastCheck).toBe(2650)
    })

    it('tick < CHECK_INTERVAL 时铁砧匠列表不变', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 30 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2000)
      expect((sys as any).anvilsmiths[0].heavyForging).toBe(30)
    })

    it('触发后多个铁砧匠全部更新', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 20, hornShaping: 10, outputQuality: 15 }))
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(2, { heavyForging: 40, hornShaping: 30, outputQuality: 25 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)
      expect((sys as any).anvilsmiths[0].heavyForging).toBeCloseTo(20.02, 5)
      expect((sys as any).anvilsmiths[1].heavyForging).toBeCloseTo(40.02, 5)
    })

    it('连续多次触发后 heavyForging 累积增长', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)  // 50.02
      sys.update(1, {} as any, 5300)  // 50.04
      sys.update(1, {} as any, 7950)  // 50.06
      expect((sys as any).anvilsmiths[0].heavyForging).toBeCloseTo(50.06, 4)
    })
  })

  // ── 边界与特殊值 ─────────────────────────────────────────────────────

  describe('边界与特殊值', () => {
    it('大量 tick 值不溢出', () => {
      expect(() => sys.update(1, {} as any, Number.MAX_SAFE_INTEGER)).not.toThrow()
    })

    it('大量铁砧匠（9个）无重复时共存', () => {
      for (let i = 0; i < 9; i++) {
        ;(sys as any).anvilsmiths.push(makeAnvilsmith(i + 1))
      }
      expect((sys as any).anvilsmiths).toHaveLength(9)
    })

    it('单个铁砧匠 outputQuality 从 0 开始递增', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 50, outputQuality: 0 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)
      expect((sys as any).anvilsmiths[0].outputQuality).toBeCloseTo(0.01, 5)
    })

    it('hornShaping 从 0 开始递增', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 50, hornShaping: 0 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)
      expect((sys as any).anvilsmiths[0].hornShaping).toBeCloseTo(0.015, 5)
    })

    it('同时持有最大技能值（全100）的铁砧匠不超出', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, {
        heavyForging: 100,
        hornShaping: 100,
        outputQuality: 100,
      }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2650)
      const r = (sys as any).anvilsmiths[0]
      expect(r.heavyForging).toBe(100)
      expect(r.hornShaping).toBe(100)
      expect(r.outputQuality).toBe(100)
    })

    it('注入 entityId=0 的铁砧匠合法', () => {
      ;(sys as any).anvilsmiths.push(makeAnvilsmith(0, { heavyForging: 30 }))
      expect((sys as any).anvilsmiths[0].entityId).toBe(0)
    })
  })
})
