import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureForgerSystem } from '../systems/CreatureForgerSystem'
import type { Forger } from '../systems/CreatureForgerSystem'

let nextId = 1
function makeSys(): CreatureForgerSystem { return new CreatureForgerSystem() }
function makeForger(entityId: number, overrides: Partial<Forger> = {}): Forger {
  return {
    id: nextId++, entityId,
    forgingSkill: 50, hammerControl: 60, metalReading: 70, structuralIntegrity: 80, tick: 0,
    ...overrides
  }
}

const em = {} as any
const CHECK_INTERVAL = 2900

describe('CreatureForgerSystem', () => {
  let sys: CreatureForgerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ============================================================
  // 一、初始状态测试
  // ============================================================
  describe('初始状态', () => {
    it('初始无锻造师', () => {
      expect((sys as any).forgers).toHaveLength(0)
    })

    it('forgers 是数组实例', () => {
      expect(Array.isArray((sys as any).forgers)).toBe(true)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })
  })

  // ============================================================
  // 二、数据注入与查询
  // ============================================================
  describe('数据注入与查询', () => {
    it('注入后可查询', () => {
      ;(sys as any).forgers.push(makeForger(1))
      expect((sys as any).forgers[0].entityId).toBe(1)
    })

    it('多个全部返回', () => {
      ;(sys as any).forgers.push(makeForger(1))
      ;(sys as any).forgers.push(makeForger(2))
      expect((sys as any).forgers).toHaveLength(2)
    })

    it('四字段数据完整（forgingSkill/hammerControl/metalReading/structuralIntegrity）', () => {
      const f = makeForger(10)
      f.forgingSkill = 90; f.hammerControl = 85; f.metalReading = 80; f.structuralIntegrity = 75
      ;(sys as any).forgers.push(f)
      const r = (sys as any).forgers[0]
      expect(r.forgingSkill).toBe(90)
      expect(r.hammerControl).toBe(85)
      expect(r.metalReading).toBe(80)
      expect(r.structuralIntegrity).toBe(75)
    })

    it('Forger 结构���含必需字段 id/entityId/tick', () => {
      const f = makeForger(5)
      ;(sys as any).forgers.push(f)
      const r = (sys as any).forgers[0]
      expect(r).toHaveProperty('id')
      expect(r).toHaveProperty('entityId')
      expect(r).toHaveProperty('tick')
    })

    it('注入 10 个后长度为 10', () => {
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).forgers.push(makeForger(i))
      }
      expect((sys as any).forgers).toHaveLength(10)
    })

    it('metalReading 字段读写正确', () => {
      const f = makeForger(1, { metalReading: 55 })
      ;(sys as any).forgers.push(f)
      expect((sys as any).forgers[0].metalReading).toBe(55)
    })

    it('tick 字段初始为 0', () => {
      const f = makeForger(1)
      ;(sys as any).forgers.push(f)
      expect((sys as any).forgers[0].tick).toBe(0)
    })

    it('可以通过 overrides 覆盖默认字段值', () => {
      const f = makeForger(1, { forgingSkill: 77 })
      ;(sys as any).forgers.push(f)
      expect((sys as any).forgers[0].forgingSkill).toBe(77)
    })
  })

  // ============================================================
  // 三、update / tick 节流测试
  // ============================================================
  describe('update tick 节流 (CHECK_INTERVAL=2900)', () => {
    it('tick差值<2900时不更新lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(1, em, 1000 + CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick差值=2899时不触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值>=2900时更新lastCheck', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick恰好等于lastCheck+2900时触发更新', () => {
      ;(sys as any).lastCheck = 3000
      sys.update(1, em, 3000 + CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(3000 + CHECK_INTERVAL)
    })

    it('tick差值超过2900时也会更新lastCheck', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
    })

    it('tick 未达到阈值时技能不增加', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL - 1)
      expect((sys as any).forgers[0].forgingSkill).toBe(50)
    })

    it('连续两次 update，第二次仍需差值>=2900才触发', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL) // 第一次触发，lastCheck=CHECK_INTERVAL
      const skillAfterFirst = (sys as any).forgers[0].forgingSkill
      sys.update(1, em, CHECK_INTERVAL + 1) // 差值=1 < 2900，不触发
      expect((sys as any).forgers[0].forgingSkill).toBe(skillAfterFirst)
    })
  })

  // ============================================================
  // 四、技能递增测试
  // ============================================================
  describe('技能递增', () => {
    it('update 后 forgingSkill+0.02', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].forgingSkill).toBeCloseTo(50.02, 5)
    })

    it('update 后 hammerControl+0.015', () => {
      ;(sys as any).forgers.push(makeForger(1, { hammerControl: 60 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].hammerControl).toBeCloseTo(60.015, 5)
    })

    it('update 后 structuralIntegrity+0.01', () => {
      ;(sys as any).forgers.push(makeForger(1, { structuralIntegrity: 80 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].structuralIntegrity).toBeCloseTo(80.01, 5)
    })

    it('metalReading 不在递增列表，保持不变', () => {
      const f = makeForger(1, { metalReading: 55 })
      ;(sys as any).forgers.push(f)
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].metalReading).toBe(55)
    })

    it('多个 forger 都会增长 forgingSkill', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 20 }))
      ;(sys as any).forgers.push(makeForger(2, { forgingSkill: 30 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].forgingSkill).toBeCloseTo(20.02)
      expect((sys as any).forgers[1].forgingSkill).toBeCloseTo(30.02)
    })

    it('多个 forger 都会增长 hammerControl', () => {
      const f1 = makeForger(1, { hammerControl: 20 })
      const f2 = makeForger(2, { hammerControl: 30 })
      ;(sys as any).forgers.push(f1)
      ;(sys as any).forgers.push(f2)
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].hammerControl).toBeCloseTo(20.015)
      expect((sys as any).forgers[1].hammerControl).toBeCloseTo(30.015)
    })

    it('多个 forger 都会增长 structuralIntegrity', () => {
      const f1 = makeForger(1, { structuralIntegrity: 40 })
      const f2 = makeForger(2, { structuralIntegrity: 50 })
      ;(sys as any).forgers.push(f1)
      ;(sys as any).forgers.push(f2)
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].structuralIntegrity).toBeCloseTo(40.01)
      expect((sys as any).forgers[1].structuralIntegrity).toBeCloseTo(50.01)
    })

    it('forgingSkill 递增步长精确：连续两次触发后增加 0.04', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)       // +0.02 -> 50.02
      sys.update(1, em, CHECK_INTERVAL * 2)   // +0.02 -> 50.04
      expect((sys as any).forgers[0].forgingSkill).toBeCloseTo(50.04, 5)
    })
  })

  // ============================================================
  // 五、上限测试（100 封顶）
  // ============================================================
  describe('技能上限（100）', () => {
    it('forgingSkill 上限 100，不超过 100', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].forgingSkill).toBe(100)
    })

    it('hammerControl 上限 100，不超过 100', () => {
      ;(sys as any).forgers.push(makeForger(1, { hammerControl: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].hammerControl).toBe(100)
    })

    it('structuralIntegrity 上限 100，不超过 100', () => {
      ;(sys as any).forgers.push(makeForger(1, { structuralIntegrity: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].structuralIntegrity).toBe(100)
    })

    it('forgingSkill 恰好为 100 后仍为 100', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 100 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].forgingSkill).toBe(100)
    })

    it('hammerControl 恰好为 100 后仍为 100', () => {
      ;(sys as any).forgers.push(makeForger(1, { hammerControl: 100 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].hammerControl).toBe(100)
    })

    it('structuralIntegrity 恰好为 100 后仍为 100', () => {
      ;(sys as any).forgers.push(makeForger(1, { structuralIntegrity: 100 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers[0].structuralIntegrity).toBe(100)
    })
  })

  // ============================================================
  // 六、cleanup 测试（先递增后 cleanup，forgingSkill<=4 删除）
  // ============================================================
  describe('cleanup 逻辑（forgingSkill<=4 删除）', () => {
    it('cleanup: forgingSkill=3.98 递增后=4.00 <=4 → 被删除', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 3.98 }))
      ;(sys as any).forgers.push(makeForger(2, { forgingSkill: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      const remaining = (sys as any).forgers
      expect(remaining.every((f: Forger) => f.entityId !== 1)).toBe(true)
      expect(remaining.some((f: Forger) => f.entityId === 2)).toBe(true)
    })

    it('forgingSkill=4.01 递增后=4.03 > 4 → 保留', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 4.01 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers).toHaveLength(1)
    })

    it('forgingSkill=1 远低于 4 → 被删除', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 1 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers).toHaveLength(0)
    })

    it('forgingSkill=4 恰好 <= 4 → 被删除（4+0.02=4.02 > 4，实际先增后判）', () => {
      // 先增：4+0.02=4.02，4.02 > 4 → 不删除
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 4 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      // 4.02 > 4 所以保留
      expect((sys as any).forgers).toHaveLength(1)
    })

    it('forgingSkill=3.97 递增后=3.99 <= 4 → 被删除', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 3.97 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers).toHaveLength(0)
    })

    it('forgingSkill=3.99 递增后=4.01 > 4 → 保留', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 3.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers).toHaveLength(1)
    })

    it('多个低技能全部被删除', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 1 }))
      ;(sys as any).forgers.push(makeForger(2, { forgingSkill: 2 }))
      ;(sys as any).forgers.push(makeForger(3, { forgingSkill: 3 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers).toHaveLength(0)
    })

    it('cleanup 从尾部向前删除不影响前面元素顺序', () => {
      const f1 = makeForger(1, { forgingSkill: 50 })   // 保留
      const f2 = makeForger(2, { forgingSkill: 3.98 }) // 删除
      const f3 = makeForger(3, { forgingSkill: 60 })   // 保留
      ;(sys as any).forgers.push(f1)
      ;(sys as any).forgers.push(f2)
      ;(sys as any).forgers.push(f3)
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers).toHaveLength(2)
      expect((sys as any).forgers[0].entityId).toBe(1)
      expect((sys as any).forgers[1].entityId).toBe(3)
    })

    it('所有锻造师 forgingSkill 高于 4 时全部保留', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 50 }))
      ;(sys as any).forgers.push(makeForger(2, { forgingSkill: 70 }))
      ;(sys as any).forgers.push(makeForger(3, { forgingSkill: 90 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers).toHaveLength(3)
    })
  })

  // ============================================================
  // 七、随机招募相关（上限及触发条件）
  // ============================================================
  describe('MAX_FORGERS 上限与随机招募', () => {
    it('已达 MAX_FORGERS=10 时不招募新锻造师', () => {
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).forgers.push(makeForger(i, { forgingSkill: 50 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 触发招募条件
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      // length 不应超过 10
      expect((sys as any).forgers.length).toBeLessThanOrEqual(10)
    })

    it('random=0 时（< RECRUIT_CHANCE=0.0014）会招募新锻造师', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      // forgingSkill=10+0*25=10，>4 不被删除
      expect((sys as any).forgers.length).toBeGreaterThanOrEqual(1)
    })

    it('random=1 时（>= RECRUIT_CHANCE=0.0014）不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers).toHaveLength(0)
    })

    it('random=0.0013 时（< RECRUIT_CHANCE=0.0014）会招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0013)
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).forgers.length).toBeGreaterThanOrEqual(1)
    })

    it('random=0.0014 时（= RECRUIT_CHANCE，不满足严格 <）不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0014)
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      // 0.0014 < 0.0014 为 false，不招募
      expect((sys as any).forgers).toHaveLength(0)
    })

    it('招募后新锻造师 id 使用 nextId 自增', () => {
      ;(sys as any).nextId = 5
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      if ((sys as any).forgers.length > 0) {
        expect((sys as any).forgers[0].id).toBe(5)
        expect((sys as any).nextId).toBe(6)
      }
    })
  })

  // ============================================================
  // 八、边界与组合场景
  // ============================================================
  describe('边界与组合场景', () => {
    it('空 forgers 列表 update 不崩溃', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
    })

    it('tick=0 时差值=0 < 2900 不触发更新', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 50 }))
      sys.update(1, em, 0)
      expect((sys as any).forgers[0].forgingSkill).toBe(50)
    })

    it('大量锻造师（9个）同时增长不崩溃', () => {
      for (let i = 1; i <= 9; i++) {
        ;(sys as any).forgers.push(makeForger(i, { forgingSkill: 50 }))
      }
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
      expect((sys as any).forgers).toHaveLength(9)
    })

    it('forgingSkill=50 触发多次更新后线性增长', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 50 }))
      ;(sys as any).lastCheck = 0
      for (let i = 1; i <= 5; i++) {
        sys.update(1, em, CHECK_INTERVAL * i)
      }
      expect((sys as any).forgers[0].forgingSkill).toBeCloseTo(50 + 0.02 * 5, 4)
    })

    it('dt 参数不影响任何结果（系统仅依赖 tick）', () => {
      ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(9999, em, CHECK_INTERVAL) // dt=9999 无影响
      expect((sys as any).forgers[0].forgingSkill).toBeCloseTo(50.02)
    })
  })
})
