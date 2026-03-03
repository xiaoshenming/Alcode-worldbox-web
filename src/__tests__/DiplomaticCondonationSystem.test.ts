import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticCondonationSystem, CondonationPolicy, CondonationForm } from '../systems/DiplomaticCondonationSystem'

const CHECK_INTERVAL = 2430
const MAX_POLICIES = 20
const CUTOFF_AGE = 86000

function makeSys() { return new DiplomaticCondonationSystem() }
const nullWorld = {} as any
const nullEm = {} as any

function injectPolicy(sys: DiplomaticCondonationSystem, overrides: Partial<CondonationPolicy> = {}): CondonationPolicy {
  const p: CondonationPolicy = {
    id: (sys as any).nextId++,
    civIdA: 1,
    civIdB: 2,
    form: 'offense_overlooking',
    pragmatism: 50,
    moralCost: 25,
    stabilityBenefit: 40,
    publicAwareness: 15,
    duration: 0,
    tick: 10000,
    ...overrides,
  }
  ;(sys as any).policies.push(p)
  return p
}

describe('DiplomaticCondonationSystem', () => {

  let sys: DiplomaticCondonationSystem
  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ------------------------------------------------------------------ //
  // 1. 基础数据结构
  // ------------------------------------------------------------------ //
  describe('1. 基础数据结构', () => {
    it('初始 policies 为空数组', () => {
      expect((sys as any).policies).toHaveLength(0)
      expect(Array.isArray((sys as any).policies)).toBe(true)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('手动注入 policy 后 policies 长度正确', () => {
      injectPolicy(sys)
      expect((sys as any).policies).toHaveLength(1)
    })

    it('CondonationForm 合法值涵盖4种', () => {
      const validForms: CondonationForm[] = [
        'offense_overlooking',
        'violation_acceptance',
        'transgression_tolerance',
        'breach_forgetting',
      ]
      validForms.forEach(f => {
        const p = injectPolicy(sys, { form: f })
        expect(p.form).toBe(f)
      })
    })

    it('注入的 policy 包含所有必要字段', () => {
      const p = injectPolicy(sys)
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('civIdA')
      expect(p).toHaveProperty('civIdB')
      expect(p).toHaveProperty('form')
      expect(p).toHaveProperty('pragmatism')
      expect(p).toHaveProperty('moralCost')
      expect(p).toHaveProperty('stabilityBenefit')
      expect(p).toHaveProperty('publicAwareness')
      expect(p).toHaveProperty('duration')
      expect(p).toHaveProperty('tick')
    })
  })

  // ------------------------------------------------------------------ //
  // 2. CHECK_INTERVAL 节流
  // ------------------------------------------------------------------ //
  describe('2. CHECK_INTERVAL 节流', () => {
    it('tick 差值小于 CHECK_INTERVAL 时 update 不执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999) // 极大值，不触发创建
      sys.update(1, nullWorld, nullEm, 0)            // 初始化 lastCheck=0
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL - 1)
      expect((sys as any).policies).toHaveLength(0)
    })

    it('tick 差值恰好等于 CHECK_INTERVAL 时执行逻辑', () => {
      // 让 random 触发创建：POLICY_CHANCE=0.0024，mock 返回 0 确保触发
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0) // 触发 POLICY_CHANCE 判断
        .mockReturnValueOnce(0.1) // civA -> 1
        .mockReturnValueOnce(0.5) // civB -> 4 (different)
        .mockReturnValue(0.5)   // 其余字段随机
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('lastCheck 在执行后更新为当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('连续两次间隔不足时第二次被跳过', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      const afterFirst = (sys as any).lastCheck
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(afterFirst) // 未更新
    })

    it('间隔足够时 lastCheck 更新为新 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })
  })

  // ------------------------------------------------------------------ //
  // 3. 数值字段动态更新（duration +1、字段在范围内）
  // ------------------------------------------------------------------ //
  describe('3. 数值字段动态更新', () => {
    function triggerUpdate(tickVal: number) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999) // 不触发新建
      sys.update(1, nullWorld, nullEm, tickVal)
    }

    it('每次 update 执行后 duration 增加 1', () => {
      const p = injectPolicy(sys, { tick: 0 })
      triggerUpdate(CHECK_INTERVAL)
      expect(p.duration).toBe(1)
      triggerUpdate(CHECK_INTERVAL * 2)
      expect(p.duration).toBe(2)
    })

    it('pragmatism 不低于下限 15', () => {
      const p = injectPolicy(sys, { pragmatism: 15.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0) // delta 负向最大
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.pragmatism).toBeGreaterThanOrEqual(15)
    })

    it('pragmatism 不超过上限 85', () => {
      const p = injectPolicy(sys, { pragmatism: 84.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1) // delta 正向最大
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.pragmatism).toBeLessThanOrEqual(85)
    })

    it('moralCost 不低于下限 5', () => {
      const p = injectPolicy(sys, { moralCost: 5.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.moralCost).toBeGreaterThanOrEqual(5)
    })

    it('moralCost 不超过上限 60', () => {
      const p = injectPolicy(sys, { moralCost: 59.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.moralCost).toBeLessThanOrEqual(60)
    })

    it('stabilityBenefit 不低于下限 10', () => {
      const p = injectPolicy(sys, { stabilityBenefit: 10.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.stabilityBenefit).toBeGreaterThanOrEqual(10)
    })

    it('stabilityBenefit 不超过上限 75', () => {
      const p = injectPolicy(sys, { stabilityBenefit: 74.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.stabilityBenefit).toBeLessThanOrEqual(75)
    })

    it('publicAwareness 不低于下限 0', () => {
      const p = injectPolicy(sys, { publicAwareness: 0.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.publicAwareness).toBeGreaterThanOrEqual(0)
    })

    it('publicAwareness 不超过上限 50', () => {
      const p = injectPolicy(sys, { publicAwareness: 49.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.publicAwareness).toBeLessThanOrEqual(50)
    })
  })

  // ------------------------------------------------------------------ //
  // 4. 过期清理（基于 tick cutoff = tick - 86000）
  // ------------------------------------------------------------------ //
  describe('4. 过期清理', () => {
    it('tick 记录刚好超过 cutoff 时被清除', () => {
      const oldTick = 0
      injectPolicy(sys, { tick: oldTick })
      const currentTick = oldTick + CUTOFF_AGE + 1
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).policies).toHaveLength(0)
    })

    it('tick 记录未超过 cutoff 时保留', () => {
      const currentTick = CHECK_INTERVAL
      injectPolicy(sys, { tick: currentTick - CUTOFF_AGE + 100 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).policies).toHaveLength(1)
    })

    it('混合新旧 policy：仅旧的被清除', () => {
      const currentTick = CUTOFF_AGE + CHECK_INTERVAL
      injectPolicy(sys, { tick: 0 })                             // 过期（0 < cutoff=CHECK_INTERVAL）
      injectPolicy(sys, { tick: currentTick - CUTOFF_AGE + 50 }) // 未过期
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).policies).toHaveLength(1)
    })

    it('多个过期 policy 全部被清除', () => {
      injectPolicy(sys, { tick: 0 })
      injectPolicy(sys, { tick: 100 })
      injectPolicy(sys, { tick: 200 })
      const currentTick = CUTOFF_AGE + 1000
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).policies).toHaveLength(0)
    })

    it('清除过期 policy 不影响 policies 数组结构（仍为数组）', () => {
      injectPolicy(sys, { tick: 0 })
      const currentTick = CUTOFF_AGE + 1000
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect(Array.isArray((sys as any).policies)).toBe(true)
    })
  })

  // ------------------------------------------------------------------ //
  // 5. MAX_POLICIES 上限
  // ------------------------------------------------------------------ //
  describe('5. MAX_POLICIES 上限', () => {
    it('policies 满 MAX_POLICIES 时不再新增', () => {
      for (let i = 0; i < MAX_POLICIES; i++) {
        injectPolicy(sys, { tick: CHECK_INTERVAL })
      }
      expect((sys as any).policies).toHaveLength(MAX_POLICIES)
      vi.spyOn(Math, 'random').mockReturnValue(0) // 触发随机尝试
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect((sys as any).policies).toHaveLength(MAX_POLICIES)
    })

    it('policies 数量不能超过 MAX_POLICIES', () => {
      for (let i = 0; i < MAX_POLICIES; i++) {
        injectPolicy(sys, { tick: CHECK_INTERVAL })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let t = 1; t <= 5; t++) {
        sys.update(1, nullWorld, nullEm, CHECK_INTERVAL * t)
      }
      expect((sys as any).policies.length).toBeLessThanOrEqual(MAX_POLICIES)
    })

    it('policies 未满 MAX_POLICIES 时可新增（随机触发）', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0)    // 触发 POLICY_CHANCE
        .mockReturnValueOnce(0.1)  // civA = 1
        .mockReturnValueOnce(0.5)  // civB = 4
        .mockReturnValue(0.5)      // 其他随机字段
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect((sys as any).policies.length).toBeGreaterThan(0)
    })

    it('nextId 在新增 policy 后单调递增', () => {
      const idBefore = (sys as any).nextId
      injectPolicy(sys)
      expect((sys as any).nextId).toBeGreaterThan(idBefore)
    })
  })

  // ---- 6. 额外覆盖测试 ----
  describe('6. 额外边界与枚举测试', () => {
    it('pragmatism 上限 85 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const p = injectPolicy(sys, { pragmatism: 84.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.pragmatism).toBeLessThanOrEqual(85)
    })

    it('pragmatism 下限 15 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const p = injectPolicy(sys, { pragmatism: 15.01, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.pragmatism).toBeGreaterThanOrEqual(15)
    })

    it('moralCost 上限 60 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const p = injectPolicy(sys, { moralCost: 59.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.moralCost).toBeLessThanOrEqual(60)
    })

    it('moralCost 下限 5 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const p = injectPolicy(sys, { moralCost: 5.01, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.moralCost).toBeGreaterThanOrEqual(5)
    })

    it('stabilityBenefit 上限 75 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const p = injectPolicy(sys, { stabilityBenefit: 74.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.stabilityBenefit).toBeLessThanOrEqual(75)
    })

    it('publicAwareness 上限 50 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const p = injectPolicy(sys, { publicAwareness: 49.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.publicAwareness).toBeLessThanOrEqual(50)
    })

    it('publicAwareness 下限 0 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const p = injectPolicy(sys, { publicAwareness: 0.01, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.publicAwareness).toBeGreaterThanOrEqual(0)
    })

    it('offense_overlooking form 可存储', () => {
      const p = injectPolicy(sys, { form: 'offense_overlooking' })
      expect(p.form).toBe('offense_overlooking')
    })

    it('violation_acceptance form 可存储', () => {
      const p = injectPolicy(sys, { form: 'violation_acceptance' })
      expect(p.form).toBe('violation_acceptance')
    })

    it('transgression_tolerance form 可存储', () => {
      const p = injectPolicy(sys, { form: 'transgression_tolerance' })
      expect(p.form).toBe('transgression_tolerance')
    })

    it('breach_forgetting form 可存储', () => {
      const p = injectPolicy(sys, { form: 'breach_forgetting' })
      expect(p.form).toBe('breach_forgetting')
    })

    it('update 不改变 form 字段', () => {
      const p = injectPolicy(sys, { form: 'breach_forgetting', tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.form).toBe('breach_forgetting')
    })

    it('update 不改变 civIdA/civIdB', () => {
      const p = injectPolicy(sys, { civIdA: 4, civIdB: 6, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.civIdA).toBe(4)
      expect(p.civIdB).toBe(6)
    })

    it('多条 policies 各自独立更新 duration', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p1 = injectPolicy(sys, { duration: 3, tick: 0 })
      const p2 = injectPolicy(sys, { duration: 7, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p1.duration).toBe(4)
      expect(p2.duration).toBe(8)
    })

    it('空 policies 时 update 不崩溃', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      expect(() => sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)).not.toThrow()
    })

    it('注入 4 种不同 form 后 policies 长度为 4', () => {
      const forms: CondonationForm[] = ['offense_overlooking', 'violation_acceptance', 'transgression_tolerance', 'breach_forgetting']
      for (const f of forms) { injectPolicy(sys, { form: f }) }
      expect((sys as any).policies).toHaveLength(4)
    })

    it('lastCheck 更新到最新 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL * 5)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 5)
    })

    it('nextId 手动设置后保持', () => {
      ;(sys as any).nextId = 55
      expect((sys as any).nextId).toBe(55)
    })
  })
})
