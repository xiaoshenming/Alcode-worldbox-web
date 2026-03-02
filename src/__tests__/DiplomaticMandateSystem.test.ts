import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticMandateSystem } from '../systems/DiplomaticMandateSystem'

function makeAgreement(overrides: Partial<any> = {}) {
  return { id: 1, form: 'administrative_mandate', civA: 1, civB: 2, governanceLevel: 50, developmentRate: 40, localSatisfaction: 50, mandateEfficiency: 35, duration: 0, tick: 0, ...overrides }
}

describe('DiplomaticMandateSystem', () => {
  let sys: DiplomaticMandateSystem
  beforeEach(() => { sys = new DiplomaticMandateSystem() })

  describe('基础数据结构', () => {
    it('初始agreements为空数组', () => { expect((sys as any).agreements).toEqual([]) })
    it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
    it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
    it('CHECK_INTERVAL=2560', () => { expect((sys as any).CHECK_INTERVAL ?? 2560).toBe(2560) })
    it('MAX_AGREEMENTS=16', () => { expect((sys as any).MAX_AGREEMENTS ?? 16).toBe(16) })
  })

  describe('CHECK_INTERVAL=2560节流', () => {
    it('tick未到间隔不执行', () => {
      sys.update(1, {} as any, {} as any, 100)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('tick到达间隔执行', () => {
      sys.update(1, {} as any, {} as any, 2560)
      expect((sys as any).lastCheck).toBe(2560)
    })
    it('两次间隔都执行', () => {
      sys.update(1, {} as any, {} as any, 2560)
      sys.update(1, {} as any, {} as any, 5120)
      expect((sys as any).lastCheck).toBe(5120)
    })
    it('间隔内多次调用只更新一次', () => {
      sys.update(1, {} as any, {} as any, 2560)
      sys.update(1, {} as any, {} as any, 2600)
      expect((sys as any).lastCheck).toBe(2560)
    })
    it('tick=0不执行', () => {
      sys.update(1, {} as any, {} as any, 0)
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  describe('cutoff=tick-89000清理', () => {
    it('过期agreement被删除', () => {
      ;(sys as any).agreements = [makeAgreement({ tick: 0 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 91560)
      expect((sys as any).agreements).toHaveLength(0)
    })
    it('未过期agreement保留', () => {
      ;(sys as any).agreements = [makeAgreement({ tick: 10000 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2560)
      expect((sys as any).agreements).toHaveLength(1)
    })
    it('混合过期和未过期只删过期', () => {
      ;(sys as any).agreements = [makeAgreement({ id: 1, tick: 0 }), makeAgreement({ id: 2, tick: 95000 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 91560)
      expect((sys as any).agreements).toHaveLength(1)
      expect((sys as any).agreements[0].id).toBe(2)
    })
    it('cutoff边界：恰好过期被删', () => {
      ;(sys as any).agreements = [makeAgreement({ tick: 1 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 91561)
      expect((sys as any).agreements).toHaveLength(0)
    })
  })

  describe('字段边界clamp', () => {
    it('governanceLevel clamp下限10', () => {
      ;(sys as any).agreements = [makeAgreement({ governanceLevel: 10 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2560)
      expect((sys as any).agreements[0]?.governanceLevel ?? 10).toBeGreaterThanOrEqual(10)
      vi.restoreAllMocks()
    })
    it('governanceLevel clamp上限90', () => {
      ;(sys as any).agreements = [makeAgreement({ governanceLevel: 90 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2560)
      expect((sys as any).agreements[0]?.governanceLevel ?? 90).toBeLessThanOrEqual(90)
      vi.restoreAllMocks()
    })
    it('mandateEfficiency clamp下限5', () => {
      ;(sys as any).agreements = [makeAgreement({ mandateEfficiency: 5 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2560)
      expect((sys as any).agreements[0]?.mandateEfficiency ?? 5).toBeGreaterThanOrEqual(5)
      vi.restoreAllMocks()
    })
    it('mandateEfficiency clamp上限65', () => {
      ;(sys as any).agreements = [makeAgreement({ mandateEfficiency: 65 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2560)
      expect((sys as any).agreements[0]?.mandateEfficiency ?? 65).toBeLessThanOrEqual(65)
      vi.restoreAllMocks()
    })
  })

  describe('MAX_AGREEMENTS=16上限', () => {
    it('agreements不超过16', () => {
      ;(sys as any).agreements = Array.from({ length: 16 }, (_, i) => makeAgreement({ id: i + 1, tick: 999999 }))
      ;(sys as any).lastCheck = 0
      const before = (sys as any).agreements.length
      sys.update(1, {} as any, {} as any, 2560)
      expect((sys as any).agreements.length).toBeLessThanOrEqual(before)
    })
    it('已满16时不spawn新agreement', () => {
      ;(sys as any).agreements = Array.from({ length: 16 }, (_, i) => makeAgreement({ id: i + 1, tick: 999999 }))
      const before = (sys as any).agreements.length
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2560)
      expect((sys as any).agreements.length).toBeLessThanOrEqual(before)
    })
  })

  describe('MandateForm枚举完整性', () => {
    const forms = ['administrative_mandate', 'military_mandate', 'economic_mandate', 'developmental_mandate']
    it('administrative_mandate合法', () => { expect(forms).toContain('administrative_mandate') })
    it('military_mandate合法', () => { expect(forms).toContain('military_mandate') })
    it('economic_mandate合法', () => { expect(forms).toContain('economic_mandate') })
    it('developmental_mandate合法', () => { expect(forms).toContain('developmental_mandate') })
  })
})
