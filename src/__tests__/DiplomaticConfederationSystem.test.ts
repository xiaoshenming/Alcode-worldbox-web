import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticConfederationSystem, ConfederationPact, ConfederationForm } from '../systems/DiplomaticConfederationSystem'

const CHECK_INTERVAL = 2540
const MAX_PACTS = 17
const CUTOFF_AGE = 95000

function makeSys() { return new DiplomaticConfederationSystem() }
const nullWorld = {} as any
const nullEm = {} as any

function injectPact(sys: DiplomaticConfederationSystem, overrides: Partial<ConfederationPact> = {}): ConfederationPact {
  const p: ConfederationPact = {
    id: (sys as any).nextId++,
    civIdA: 1,
    civIdB: 2,
    form: 'defense_league',
    cohesionLevel: 45,
    sovereigntyPreserved: 37,
    commonPurpose: 30,
    decisionConsensus: 22,
    duration: 0,
    tick: 10000,
    ...overrides,
  }
  ;(sys as any).pacts.push(p)
  return p
}

describe('DiplomaticConfederationSystem', () => {

  let sys: DiplomaticConfederationSystem
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
    it('初始 pacts 为空数组', () => {
      expect((sys as any).pacts).toHaveLength(0)
      expect(Array.isArray((sys as any).pacts)).toBe(true)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('手动注入 pact 后 pacts 长度正确', () => {
      injectPact(sys)
      expect((sys as any).pacts).toHaveLength(1)
    })

    it('ConfederationForm 合法值涵盖4种', () => {
      const validForms: ConfederationForm[] = [
        'defense_league',
        'trade_bloc',
        'cultural_alliance',
        'resource_compact',
      ]
      validForms.forEach(f => {
        const p = injectPact(sys, { form: f })
        expect(p.form).toBe(f)
      })
    })

    it('注入的 pact 包含所有必要字段', () => {
      const p = injectPact(sys)
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('civIdA')
      expect(p).toHaveProperty('civIdB')
      expect(p).toHaveProperty('form')
      expect(p).toHaveProperty('cohesionLevel')
      expect(p).toHaveProperty('sovereigntyPreserved')
      expect(p).toHaveProperty('commonPurpose')
      expect(p).toHaveProperty('decisionConsensus')
      expect(p).toHaveProperty('duration')
      expect(p).toHaveProperty('tick')
    })
  })

  // ------------------------------------------------------------------ //
  // 2. CHECK_INTERVAL 节流
  // ------------------------------------------------------------------ //
  describe('2. CHECK_INTERVAL 节流', () => {
    it('tick 差值小于 CHECK_INTERVAL 时 update 不执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, 0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL - 1)
      expect((sys as any).pacts).toHaveLength(0)
    })

    it('tick 差值恰好等于 CHECK_INTERVAL 时执行逻辑，lastCheck 更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
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
      expect((sys as any).lastCheck).toBe(afterFirst)
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
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, tickVal)
    }

    it('每次 update 执行后 duration 增加 1', () => {
      const p = injectPact(sys, { tick: 0 })
      triggerUpdate(CHECK_INTERVAL)
      expect(p.duration).toBe(1)
      triggerUpdate(CHECK_INTERVAL * 2)
      expect(p.duration).toBe(2)
    })

    it('cohesionLevel 不低于下限 10', () => {
      const p = injectPact(sys, { cohesionLevel: 10.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.cohesionLevel).toBeGreaterThanOrEqual(10)
    })

    it('cohesionLevel 不超过上限 90', () => {
      const p = injectPact(sys, { cohesionLevel: 89.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.cohesionLevel).toBeLessThanOrEqual(90)
    })

    it('sovereigntyPreserved 不低于下限 10', () => {
      const p = injectPact(sys, { sovereigntyPreserved: 10.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.sovereigntyPreserved).toBeGreaterThanOrEqual(10)
    })

    it('sovereigntyPreserved 不超过上限 85', () => {
      const p = injectPact(sys, { sovereigntyPreserved: 84.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.sovereigntyPreserved).toBeLessThanOrEqual(85)
    })

    it('commonPurpose 不低于下限 5', () => {
      const p = injectPact(sys, { commonPurpose: 5.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.commonPurpose).toBeGreaterThanOrEqual(5)
    })

    it('commonPurpose 不超过上限 75', () => {
      const p = injectPact(sys, { commonPurpose: 74.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.commonPurpose).toBeLessThanOrEqual(75)
    })

    it('decisionConsensus 不低于下限 5', () => {
      const p = injectPact(sys, { decisionConsensus: 5.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.decisionConsensus).toBeGreaterThanOrEqual(5)
    })

    it('decisionConsensus 不超过上限 65', () => {
      const p = injectPact(sys, { decisionConsensus: 64.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.decisionConsensus).toBeLessThanOrEqual(65)
    })
  })

  // ------------------------------------------------------------------ //
  // 4. 过期清理（基于 tick cutoff = tick - 95000）
  // ------------------------------------------------------------------ //
  describe('4. 过期清理', () => {
    it('tick 记录刚好超过 cutoff 时被清除', () => {
      injectPact(sys, { tick: 0 })
      const currentTick = CUTOFF_AGE + 1
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).pacts).toHaveLength(0)
    })

    it('tick 记录未超过 cutoff 时保留', () => {
      const currentTick = CHECK_INTERVAL
      injectPact(sys, { tick: currentTick - CUTOFF_AGE + 100 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).pacts).toHaveLength(1)
    })

    it('混合新旧 pact：仅旧的被清除', () => {
      const currentTick = CUTOFF_AGE + CHECK_INTERVAL
      injectPact(sys, { tick: 0 })
      injectPact(sys, { tick: currentTick - CUTOFF_AGE + 50 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).pacts).toHaveLength(1)
    })

    it('多个过期 pact 全部被清除', () => {
      injectPact(sys, { tick: 0 })
      injectPact(sys, { tick: 100 })
      injectPact(sys, { tick: 200 })
      const currentTick = CUTOFF_AGE + 1000
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).pacts).toHaveLength(0)
    })

    it('清除过期后 pacts 仍为数组', () => {
      injectPact(sys, { tick: 0 })
      const currentTick = CUTOFF_AGE + 1000
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect(Array.isArray((sys as any).pacts)).toBe(true)
    })
  })

  // ------------------------------------------------------------------ //
  // 5. MAX_PACTS 上限
  // ------------------------------------------------------------------ //
  describe('5. MAX_PACTS 上限', () => {
    it('pacts 满 MAX_PACTS 时不再新增', () => {
      for (let i = 0; i < MAX_PACTS; i++) {
        injectPact(sys, { tick: CHECK_INTERVAL })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect((sys as any).pacts).toHaveLength(MAX_PACTS)
    })

    it('pacts 数量不能超过 MAX_PACTS（多次调用）', () => {
      for (let i = 0; i < MAX_PACTS; i++) {
        injectPact(sys, { tick: CHECK_INTERVAL })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let t = 1; t <= 5; t++) {
        sys.update(1, nullWorld, nullEm, CHECK_INTERVAL * t)
      }
      expect((sys as any).pacts.length).toBeLessThanOrEqual(MAX_PACTS)
    })

    it('pacts 未满时可新增（随机触发）', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0)   // 触发 PROCEED_CHANCE
        .mockReturnValueOnce(0.1) // civA = 1
        .mockReturnValueOnce(0.5) // civB = 4
        .mockReturnValue(0.5)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect((sys as any).pacts.length).toBeGreaterThan(0)
    })

    it('nextId 在新增 pact 后单调递增', () => {
      const idBefore = (sys as any).nextId
      injectPact(sys)
      expect((sys as any).nextId).toBeGreaterThan(idBefore)
    })
  })

  // ---- 6. 额外覆盖测试 ----
  describe('6. 额外边界与枚举测试', () => {
    it('cohesionLevel 上限 90 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const p = injectPact(sys, { cohesionLevel: 89.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.cohesionLevel).toBeLessThanOrEqual(90)
    })

    it('cohesionLevel 下限 10 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const p = injectPact(sys, { cohesionLevel: 10.01, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.cohesionLevel).toBeGreaterThanOrEqual(10)
    })

    it('sovereigntyPreserved 上限 85 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const p = injectPact(sys, { sovereigntyPreserved: 84.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.sovereigntyPreserved).toBeLessThanOrEqual(85)
    })

    it('commonPurpose 上限 75 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const p = injectPact(sys, { commonPurpose: 74.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.commonPurpose).toBeLessThanOrEqual(75)
    })

    it('decisionConsensus 上限 65 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const p = injectPact(sys, { decisionConsensus: 64.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.decisionConsensus).toBeLessThanOrEqual(65)
    })

    it('defense_league form 可存储', () => {
      const p = injectPact(sys, { form: 'defense_league' })
      expect(p.form).toBe('defense_league')
    })

    it('trade_bloc form 可存储', () => {
      const p = injectPact(sys, { form: 'trade_bloc' })
      expect(p.form).toBe('trade_bloc')
    })

    it('cultural_alliance form 可存储', () => {
      const p = injectPact(sys, { form: 'cultural_alliance' })
      expect(p.form).toBe('cultural_alliance')
    })

    it('resource_compact form 可存储', () => {
      const p = injectPact(sys, { form: 'resource_compact' })
      expect(p.form).toBe('resource_compact')
    })

    it('多条 pacts 各自独立更新 duration', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p1 = injectPact(sys, { duration: 3, tick: 0 })
      const p2 = injectPact(sys, { duration: 7, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p1.duration).toBe(4)
      expect(p2.duration).toBe(8)
    })

    it('update 不改变 form', () => {
      const p = injectPact(sys, { form: 'resource_compact', tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.form).toBe('resource_compact')
    })

    it('update 不改变 civIdA/civIdB', () => {
      const p = injectPact(sys, { civIdA: 5, civIdB: 8, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(p.civIdA).toBe(5)
      expect(p.civIdB).toBe(8)
    })

    it('空 pacts 时 update 不崩溃', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      expect(() => sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)).not.toThrow()
    })

    it('全部过期后 pacts 清空', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      injectPact(sys, { tick: 0 })
      injectPact(sys, { tick: 100 })
      const bigTick = CUTOFF_AGE + 1000 + CHECK_INTERVAL
      ;(sys as any).lastCheck = 0
      sys.update(1, nullWorld, nullEm, bigTick)
      expect((sys as any).pacts).toHaveLength(0)
    })

    it('lastCheck 更新到最新 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL * 5)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 5)
    })

    it('nextId 手动设置后保持', () => {
      ;(sys as any).nextId = 77
      expect((sys as any).nextId).toBe(77)
    })

    it('注入 4 种不同 form 后 pacts 长度为 4', () => {
      const forms: ConfederationForm[] = ['defense_league', 'trade_bloc', 'cultural_alliance', 'resource_compact']
      for (const f of forms) { injectPact(sys, { form: f }) }
      expect((sys as any).pacts).toHaveLength(4)
    })
  })
})
