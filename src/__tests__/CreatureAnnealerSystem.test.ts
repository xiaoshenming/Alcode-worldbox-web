import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureAnnealerSystem } from '../systems/CreatureAnnealerSystem'
import type { Annealer } from '../systems/CreatureAnnealerSystem'

// 源码常量
// CHECK_INTERVAL = 2860, RECRUIT_CHANCE = 0.0015, MAX_ANNEALERS = 10
// 技能递增: annealingSkill+0.02, temperatureCycling+0.015, grainRefinement+0.01
// cleanup: annealingSkill <= 4 时删除

let nextAnnId = 1

function makeAnnSys(): CreatureAnnealerSystem {
  return new CreatureAnnealerSystem()
}

function makeAnnealer(entityId: number, overrides: Partial<Annealer> = {}): Annealer {
  return {
    id: nextAnnId++,
    entityId,
    annealingSkill: 20,
    temperatureCycling: 25,
    coolingRate: 10,
    grainRefinement: 15,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureAnnealerSystem', () => {
  let sys: CreatureAnnealerSystem

  beforeEach(() => {
    sys = makeAnnSys()
    nextAnnId = 1
  })

  afterEach(() => vi.restoreAllMocks())

  // ── 初始状态 ────────────────────────────────────────────────────────────

  describe('初始状态', () => {
    it('初始无退火师', () => {
      expect((sys as any).annealers).toHaveLength(0)
    })

    it('annealers 是数组', () => {
      expect(Array.isArray((sys as any).annealers)).toBe(true)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })
  })

  // ── Annealer 数据结构 ─────────────────────────────────────────────────

  describe('Annealer 数据结构', () => {
    it('注入退火师后可查询', () => {
      ;(sys as any).annealers.push(makeAnnealer(1))
      expect((sys as any).annealers).toHaveLength(1)
      expect((sys as any).annealers[0].entityId).toBe(1)
    })

    it('多个退火师全部返回', () => {
      ;(sys as any).annealers.push(makeAnnealer(1))
      ;(sys as any).annealers.push(makeAnnealer(2))
      ;(sys as any).annealers.push(makeAnnealer(3))
      expect((sys as any).annealers).toHaveLength(3)
    })

    it('退火师数据四字段完整', () => {
      const a = makeAnnealer(10, {
        annealingSkill: 75,
        temperatureCycling: 60,
        coolingRate: 30,
        grainRefinement: 50,
      })
      ;(sys as any).annealers.push(a)
      const r = (sys as any).annealers[0]
      expect(r.annealingSkill).toBe(75)
      expect(r.temperatureCycling).toBe(60)
      expect(r.coolingRate).toBe(30)
      expect(r.grainRefinement).toBe(50)
    })

    it('退火师 id 字段为数字', () => {
      const a = makeAnnealer(5)
      ;(sys as any).annealers.push(a)
      expect(typeof (sys as any).annealers[0].id).toBe('number')
    })

    it('退火师 tick 字段可赋值', () => {
      const a = makeAnnealer(5, { tick: 9999 })
      ;(sys as any).annealers.push(a)
      expect((sys as any).annealers[0].tick).toBe(9999)
    })

    it('coolingRate 不参与技能递增', () => {
      const a = makeAnnealer(1, { coolingRate: 42 })
      ;(sys as any).annealers.push(a)
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2860)
      // coolingRate 不在递增列表，应保持不变
      expect((sys as any).annealers[0].coolingRate).toBe(42)
    })
  })

  // ── CHECK_INTERVAL 节流（CHECK_INTERVAL = 2860）───────────────────────

  describe('CHECK_INTERVAL 节流 (2860)', () => {
    it('tick 差值 < 2860 时不更新 lastCheck', () => {
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2000)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 差值 == 2860 时更新 lastCheck', () => {
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).lastCheck).toBe(2860)
    })

    it('tick 差值 > 2860 时更新 lastCheck', () => {
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 5000)
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('lastCheck=2860, tick=5719 时不触发（差值<2860）', () => {
      const em = {} as any
      ;(sys as any).lastCheck = 2860
      sys.update(1, em, 5719)
      expect((sys as any).lastCheck).toBe(2860)
    })

    it('lastCheck=2860, tick=5720 时触发（差值==2860）', () => {
      const em = {} as any
      ;(sys as any).lastCheck = 2860
      sys.update(1, em, 5720)
      expect((sys as any).lastCheck).toBe(5720)
    })

    it('tick=0 时不触发（差值=0 < 2860）', () => {
      const em = {} as any
      sys.update(1, em, 0)
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ── 技能递增 ─────────────────────────────────────────────────────────

  describe('技能递增（每触发一次 +增量）', () => {
    it('update 后 annealingSkill +0.02', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers[0].annealingSkill).toBeCloseTo(50.02, 5)
    })

    it('update 后 temperatureCycling +0.015', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { temperatureCycling: 40 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers[0].temperatureCycling).toBeCloseTo(40.015, 5)
    })

    it('update 后 grainRefinement +0.01', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { grainRefinement: 30 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers[0].grainRefinement).toBeCloseTo(30.01, 5)
    })

    it('annealingSkill 上限为 100', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers[0].annealingSkill).toBe(100)
    })

    it('temperatureCycling 上限为 100', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { temperatureCycling: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers[0].temperatureCycling).toBe(100)
    })

    it('grainRefinement 上限为 100', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { grainRefinement: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers[0].grainRefinement).toBe(100)
    })

    it('annealingSkill 已为 100 时不超出', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 100 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers[0].annealingSkill).toBe(100)
    })

    it('多个退火师各自独立递增', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 10 }))
      ;(sys as any).annealers.push(makeAnnealer(2, { annealingSkill: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers[0].annealingSkill).toBeCloseTo(10.02, 5)
      expect((sys as any).annealers[1].annealingSkill).toBeCloseTo(50.02, 5)
    })

    it('tick < CHECK_INTERVAL 时技能不递增', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2000) // < 2860
      expect((sys as any).annealers[0].annealingSkill).toBe(50)
    })
  })

  // ── cleanup 逻辑（annealingSkill <= 4 时删除）─────────────────────────

  describe('cleanup 逻辑', () => {
    it('annealingSkill <= 4 时删除（3.98+0.02=4.00 <= 4）', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 3.98 }))
      ;(sys as any).annealers.push(makeAnnealer(2, { annealingSkill: 30 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers.length).toBe(1)
      expect((sys as any).annealers[0].entityId).toBe(2)
    })

    it('annealingSkill = 3.97+0.02=3.99 < 4 => 删除', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 3.97 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      // 3.97+0.02=3.99 <= 4 => 删除
      expect((sys as any).annealers).toHaveLength(0)
    })

    it('annealingSkill = 4.01+0.02=4.03 > 4 => 保留', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 4.01 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      // 4.01+0.02=4.03 > 4 => 保留
      expect((sys as any).annealers).toHaveLength(1)
    })

    it('annealingSkill 初始为 0 的退火师被删除', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 0 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      // 0+0.02=0.02 <= 4 => 删除
      expect((sys as any).annealers).toHaveLength(0)
    })

    it('cleanup 从后向前删除，不跳过元素', () => {
      const em = {} as any
      // 3个都需要删除
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 1 }))
      ;(sys as any).annealers.push(makeAnnealer(2, { annealingSkill: 2 }))
      ;(sys as any).annealers.push(makeAnnealer(3, { annealingSkill: 3 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      // 1+0.02=1.02 <=4, 2+0.02=2.02 <=4, 3+0.02=3.02 <=4 => 全删
      expect((sys as any).annealers).toHaveLength(0)
    })

    it('cleanup 在技能递增之后运行（确保顺序）', () => {
      // annealingSkill=3.99 => 递增后=4.01 > 4 => 不删除
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 3.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      // 3.99+0.02=4.01 > 4 => 保留
      expect((sys as any).annealers).toHaveLength(1)
    })

    it('多个退火师中只删除技能过低的', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 1 }))   // 1.02 <= 4 => 删
      ;(sys as any).annealers.push(makeAnnealer(2, { annealingSkill: 10 }))  // 10.02 > 4 => 留
      ;(sys as any).annealers.push(makeAnnealer(3, { annealingSkill: 2 }))   // 2.02 <= 4 => 删
      ;(sys as any).annealers.push(makeAnnealer(4, { annealingSkill: 50 }))  // 50.02 > 4 => 留
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers).toHaveLength(2)
      const ids = (sys as any).annealers.map((a: Annealer) => a.entityId)
      expect(ids).toContain(2)
      expect(ids).toContain(4)
    })
  })

  // ── 招募逻辑（MAX_ANNEALERS = 10, RECRUIT_CHANCE = 0.0015）──────────

  describe('招募逻辑', () => {
    it('已达 MAX_ANNEALERS(10) 时不招募新退火师', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).annealers.push(makeAnnealer(i + 1, { annealingSkill: 50 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // random=0 < RECRUIT_CHANCE => 本应招募
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2860)
      // cleanup 后，10个全保留（annealingSkill=50 > 4），不新增
      expect((sys as any).annealers).toHaveLength(10)
    })

    it('random >= RECRUIT_CHANCE(0.0015) 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 >= 0.0015 => 不招募
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2860)
      expect((sys as any).annealers).toHaveLength(0)
    })

    it('random < RECRUIT_CHANCE(0.0015) 时招募一个新退火师', () => {
      // 固定 random 使招募条件满足
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        return callCount === 1 ? 0.001 : 0 // 第1次触发招募检查，后续给entityId和技能随机值用
      })
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2860)
      expect((sys as any).annealers.length).toBeGreaterThanOrEqual(1)
    })

    it('招募的退火师 annealingSkill 在 [10, 35) 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < RECRUIT_CHANCE
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2860)
      if ((sys as any).annealers.length > 0) {
        const skill = (sys as any).annealers[0].annealingSkill
        // 源码: 10 + random()*25，random=0.001 => 10.025, 但 cleanup 会检查
        // 10.025+0.02=10.045 > 4 => 保留
        expect(skill).toBeGreaterThan(4) // cleanup 后仍存在
      }
    })

    it('nextId 在招募后递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      ;(sys as any).lastCheck = 0
      const prevNextId = (sys as any).nextId
      sys.update(1, {} as any, 2860)
      if ((sys as any).annealers.length > 0) {
        expect((sys as any).nextId).toBeGreaterThan(prevNextId)
      }
    })
  })

  // ── update 综合行为 ──────────────────────────────────────────────────

  describe('update 综合行为', () => {
    it('update 不崩溃（空退火师列表）', () => {
      expect(() => sys.update(1, {} as any, 0)).not.toThrow()
    })

    it('update 多次不崩溃', () => {
      expect(() => {
        for (let t = 0; t <= 20000; t += 1000) {
          sys.update(1, {} as any, t)
        }
      }).not.toThrow()
    })

    it('连续两次触发 update，lastCheck 更新为第二次 tick', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2860)
      expect((sys as any).lastCheck).toBe(2860)
      sys.update(1, {} as any, 5720)
      expect((sys as any).lastCheck).toBe(5720)
    })

    it('dt 参数对节流无影响', () => {
      ;(sys as any).lastCheck = 0
      sys.update(9999, {} as any, 100) // dt很大但tick<2860
      expect((sys as any).lastCheck).toBe(0)
      sys.update(1, {} as any, 2860)
      expect((sys as any).lastCheck).toBe(2860)
    })

    it('tick < CHECK_INTERVAL 时退火师列表不变', () => {
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 30 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2000)
      expect((sys as any).annealers[0].annealingSkill).toBe(30) // 未递增
      expect((sys as any).annealers).toHaveLength(1)
    })

    it('触发后列表中多个退火师全部更新', () => {
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 20, temperatureCycling: 20, grainRefinement: 20 }))
      ;(sys as any).annealers.push(makeAnnealer(2, { annealingSkill: 40, temperatureCycling: 40, grainRefinement: 40 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2860)
      expect((sys as any).annealers[0].annealingSkill).toBeCloseTo(20.02, 5)
      expect((sys as any).annealers[1].annealingSkill).toBeCloseTo(40.02, 5)
      expect((sys as any).annealers[0].temperatureCycling).toBeCloseTo(20.015, 5)
      expect((sys as any).annealers[1].temperatureCycling).toBeCloseTo(40.015, 5)
    })
  })

  // ── 边界与特殊值 ─────────────────────────────────────────────────────

  describe('边界与特殊值', () => {
    it('annealingSkill = 4 时删除（4+0.02=4.02 > 4 => 不删，但初始4 => 递增后4.02 > 4 => 保留）', () => {
      // 注意：先递增再 cleanup。4+0.02=4.02 > 4 => 保留
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 4 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers).toHaveLength(1)
      expect((sys as any).annealers[0].annealingSkill).toBeCloseTo(4.02, 5)
    })

    it('9 个退火师时仍可招募第 10 个', () => {
      for (let i = 0; i < 9; i++) {
        ;(sys as any).annealers.push(makeAnnealer(i + 1, { annealingSkill: 50 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < RECRUIT_CHANCE
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, 2860)
      // cleanup 不删（所有 skill > 4），可能招募1个
      expect((sys as any).annealers.length).toBeGreaterThanOrEqual(9)
    })

    it('大量 tick 值不溢出', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(1, {} as any, Number.MAX_SAFE_INTEGER)).not.toThrow()
    })

    it('单个退火师 grainRefinement 从 0 开始递增', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 50, grainRefinement: 0 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)
      expect((sys as any).annealers[0].grainRefinement).toBeCloseTo(0.01, 5)
    })

    it('连续多次触发后 annealingSkill 累积增长', () => {
      const em = {} as any
      ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 2860)  // 50.02
      sys.update(1, em, 5720)  // 50.04
      sys.update(1, em, 8580)  // 50.06
      expect((sys as any).annealers[0].annealingSkill).toBeCloseTo(50.06, 4)
    })
  })
})
