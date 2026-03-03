import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticConservatorshipSystem, ConservatorshipArrangement, ConservatorshipForm } from '../systems/DiplomaticConservatorshipSystem'

const CHECK_INTERVAL = 2560
const MAX_ARRANGEMENTS = 16
const CUTOFF_AGE = 88000

function makeSys() { return new DiplomaticConservatorshipSystem() }
const nullWorld = {} as any
const nullEm = {} as any

function injectArrangement(sys: DiplomaticConservatorshipSystem, overrides: Partial<ConservatorshipArrangement> = {}): ConservatorshipArrangement {
  const a: ConservatorshipArrangement = {
    id: (sys as any).nextId++,
    conservatorCivId: 1,
    subjectCivId: 2,
    form: 'fiscal_conservatorship',
    controlScope: 40,
    reformProgress: 42,
    resistanceLevel: 25,
    stabilityGain: 27,
    duration: 0,
    tick: 10000,
    ...overrides,
  }
  ;(sys as any).arrangements.push(a)
  return a
}

describe('DiplomaticConservatorshipSystem', () => {

  let sys: DiplomaticConservatorshipSystem
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
    it('初始 arrangements 为空数组', () => {
      expect((sys as any).arrangements).toHaveLength(0)
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('手动注入 arrangement 后 arrangements 长度正确', () => {
      injectArrangement(sys)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('ConservatorshipForm 合法值涵盖4种', () => {
      const validForms: ConservatorshipForm[] = [
        'fiscal_conservatorship',
        'military_conservatorship',
        'administrative_conservatorship',
        'judicial_conservatorship',
      ]
      validForms.forEach(f => {
        const a = injectArrangement(sys, { form: f })
        expect(a.form).toBe(f)
      })
    })

    it('注入的 arrangement 包含所有必要字段', () => {
      const a = injectArrangement(sys)
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('conservatorCivId')
      expect(a).toHaveProperty('subjectCivId')
      expect(a).toHaveProperty('form')
      expect(a).toHaveProperty('controlScope')
      expect(a).toHaveProperty('reformProgress')
      expect(a).toHaveProperty('resistanceLevel')
      expect(a).toHaveProperty('stabilityGain')
      expect(a).toHaveProperty('duration')
      expect(a).toHaveProperty('tick')
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
      expect((sys as any).arrangements).toHaveLength(0)
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
      const a = injectArrangement(sys, { tick: 0 })
      triggerUpdate(CHECK_INTERVAL)
      expect(a.duration).toBe(1)
      triggerUpdate(CHECK_INTERVAL * 2)
      expect(a.duration).toBe(2)
    })

    it('controlScope 不低于下限 5', () => {
      const a = injectArrangement(sys, { controlScope: 5.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.controlScope).toBeGreaterThanOrEqual(5)
    })

    it('controlScope 不超过上限 85', () => {
      const a = injectArrangement(sys, { controlScope: 84.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.controlScope).toBeLessThanOrEqual(85)
    })

    it('reformProgress 不低于下限 10', () => {
      const a = injectArrangement(sys, { reformProgress: 10.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.reformProgress).toBeGreaterThanOrEqual(10)
    })

    it('reformProgress 不超过上限 90', () => {
      const a = injectArrangement(sys, { reformProgress: 89.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.reformProgress).toBeLessThanOrEqual(90)
    })

    it('resistanceLevel 不低于下限 5', () => {
      const a = injectArrangement(sys, { resistanceLevel: 5.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.resistanceLevel).toBeGreaterThanOrEqual(5)
    })

    it('resistanceLevel 不超过上限 80', () => {
      const a = injectArrangement(sys, { resistanceLevel: 79.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.resistanceLevel).toBeLessThanOrEqual(80)
    })

    it('stabilityGain 不低于下限 5', () => {
      const a = injectArrangement(sys, { stabilityGain: 5.01, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.stabilityGain).toBeGreaterThanOrEqual(5)
    })

    it('stabilityGain 不超过上限 65', () => {
      const a = injectArrangement(sys, { stabilityGain: 64.99, tick: 0 })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.stabilityGain).toBeLessThanOrEqual(65)
    })
  })

  // ------------------------------------------------------------------ //
  // 4. 过期清理（基于 tick cutoff = tick - 88000）
  // ------------------------------------------------------------------ //
  describe('4. 过期清理', () => {
    it('tick 记录刚好超过 cutoff 时被清除', () => {
      injectArrangement(sys, { tick: 0 })
      const currentTick = CUTOFF_AGE + 1
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('tick 记录未超过 cutoff 时保留', () => {
      const currentTick = CHECK_INTERVAL
      injectArrangement(sys, { tick: currentTick - CUTOFF_AGE + 100 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('混合新旧 arrangement：仅旧的被清除', () => {
      const currentTick = CUTOFF_AGE + CHECK_INTERVAL
      injectArrangement(sys, { tick: 0 })
      injectArrangement(sys, { tick: currentTick - CUTOFF_AGE + 50 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('多个过期 arrangement 全部被清除', () => {
      injectArrangement(sys, { tick: 0 })
      injectArrangement(sys, { tick: 100 })
      injectArrangement(sys, { tick: 200 })
      const currentTick = CUTOFF_AGE + 1000
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('清除过期后 arrangements 仍为数组', () => {
      injectArrangement(sys, { tick: 0 })
      const currentTick = CUTOFF_AGE + 1000
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, nullWorld, nullEm, currentTick)
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })
  })

  // ------------------------------------------------------------------ //
  // 5. MAX_ARRANGEMENTS 上限
  // ------------------------------------------------------------------ //
  describe('5. MAX_ARRANGEMENTS 上限', () => {
    it('arrangements 满 MAX_ARRANGEMENTS 时不再新增', () => {
      for (let i = 0; i < MAX_ARRANGEMENTS; i++) {
        injectArrangement(sys, { tick: CHECK_INTERVAL })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect((sys as any).arrangements).toHaveLength(MAX_ARRANGEMENTS)
    })

    it('arrangements 数量不能超过 MAX_ARRANGEMENTS（多次调用）', () => {
      for (let i = 0; i < MAX_ARRANGEMENTS; i++) {
        injectArrangement(sys, { tick: CHECK_INTERVAL })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let t = 1; t <= 5; t++) {
        sys.update(1, nullWorld, nullEm, CHECK_INTERVAL * t)
      }
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(MAX_ARRANGEMENTS)
    })

    it('arrangements 未满时可新增（随机触发）', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0)   // 触发 PROCEED_CHANCE
        .mockReturnValueOnce(0.1) // conservator = 1
        .mockReturnValueOnce(0.5) // subject = 4
        .mockReturnValue(0.5)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect((sys as any).arrangements.length).toBeGreaterThan(0)
    })

    it('nextId 在新增 arrangement 后单调递增', () => {
      const idBefore = (sys as any).nextId
      injectArrangement(sys)
      expect((sys as any).nextId).toBeGreaterThan(idBefore)
    })
  })

  // ---- 6. 额外边界测试 ----
  describe('6. 额外边界与枚举测试', () => {
    it('controlScope 上限 85 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const a = injectArrangement(sys, { controlScope: 84.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.controlScope).toBeLessThanOrEqual(85)
    })

    it('controlScope 下限 5 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const a = injectArrangement(sys, { controlScope: 5.01, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.controlScope).toBeGreaterThanOrEqual(5)
    })

    it('reformProgress 上限 90 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const a = injectArrangement(sys, { reformProgress: 89.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.reformProgress).toBeLessThanOrEqual(90)
    })

    it('resistanceLevel 上限 80 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const a = injectArrangement(sys, { resistanceLevel: 79.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.resistanceLevel).toBeLessThanOrEqual(80)
    })

    it('stabilityGain 上限 65 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const a = injectArrangement(sys, { stabilityGain: 64.99, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.stabilityGain).toBeLessThanOrEqual(65)
    })

    it('fiscal_conservatorship form 可存储', () => {
      const a = injectArrangement(sys, { form: 'fiscal_conservatorship' })
      expect(a.form).toBe('fiscal_conservatorship')
    })

    it('military_conservatorship form 可存储', () => {
      const a = injectArrangement(sys, { form: 'military_conservatorship' })
      expect(a.form).toBe('military_conservatorship')
    })

    it('administrative_conservatorship form 可存储', () => {
      const a = injectArrangement(sys, { form: 'administrative_conservatorship' })
      expect(a.form).toBe('administrative_conservatorship')
    })

    it('judicial_conservatorship form 可存储', () => {
      const a = injectArrangement(sys, { form: 'judicial_conservatorship' })
      expect(a.form).toBe('judicial_conservatorship')
    })

    it('update 不改变 form', () => {
      const a = injectArrangement(sys, { form: 'judicial_conservatorship', tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.form).toBe('judicial_conservatorship')
    })

    it('多条 arrangements 各自独立更新 duration', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const a1 = injectArrangement(sys, { duration: 2, tick: 0 })
      const a2 = injectArrangement(sys, { duration: 6, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a1.duration).toBe(3)
      expect(a2.duration).toBe(7)
    })

    it('全部过期后 arrangements 清空', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      injectArrangement(sys, { tick: 0 })
      injectArrangement(sys, { tick: 100 })
      const bigTick = CUTOFF_AGE + 1000 + CHECK_INTERVAL
      ;(sys as any).lastCheck = 0
      sys.update(1, nullWorld, nullEm, bigTick)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('update 不改变 conservatorCivId/subjectCivId', () => {
      const a = injectArrangement(sys, { conservatorCivId: 3, subjectCivId: 6, tick: 0 })
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)
      expect(a.conservatorCivId).toBe(3)
      expect(a.subjectCivId).toBe(6)
    })

    it('空 arrangements 时 update 不崩溃', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      expect(() => sys.update(1, nullWorld, nullEm, CHECK_INTERVAL)).not.toThrow()
    })

    it('注入 4 种 form 后 arrangements 长度为 4', () => {
      const forms: ConservatorshipForm[] = ['fiscal_conservatorship', 'military_conservatorship', 'administrative_conservatorship', 'judicial_conservatorship']
      for (const f of forms) { injectArrangement(sys, { form: f }) }
      expect((sys as any).arrangements).toHaveLength(4)
    })

    it('lastCheck 更新到最新 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      sys.update(1, nullWorld, nullEm, CHECK_INTERVAL * 4)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 4)
    })
  })
})
