import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticDispensationSystem, DispensationGrant } from '../systems/DiplomaticDispensationSystem'

function makeGrant(overrides: Partial<DispensationGrant> = {}): DispensationGrant {
  return {
    id: 1, civIdA: 1, civIdB: 2, form: 'trade_exemption',
    exemptionScope: 40, politicalCost: 30, benefitValue: 45, precedentRisk: 20,
    duration: 0, tick: 0, ...overrides,
  }
}

describe('DiplomaticDispensationSystem', () => {
  let sys: DiplomaticDispensationSystem

  beforeEach(() => {
    sys = new DiplomaticDispensationSystem()
    vi.restoreAllMocks()
  })

  describe('基础数据结构', () => {
    it('初始grants为空数组', () => {
      expect((sys as any).grants).toHaveLength(0)
    })
    it('注入grant后可查询', () => {
      ;(sys as any).grants.push(makeGrant({ id: 99 }))
      expect((sys as any).grants[0].id).toBe(99)
    })
    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })
    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })
    it('4种form枚举均可存储', () => {
      const forms = ['trade_exemption', 'military_waiver', 'tribute_relief', 'law_exception']
      for (const f of forms) {
        ;(sys as any).grants.push(makeGrant({ form: f as any }))
      }
      const stored = (sys as any).grants.map((g: DispensationGrant) => g.form)
      expect(stored).toEqual(expect.arrayContaining(forms))
    })
  })

  describe('CHECK_INTERVAL=2400节流', () => {
    it('tick < 2400时不执行更新', () => {
      ;(sys as any).grants.push(makeGrant({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2399)
      expect((sys as any).grants[0].duration).toBe(0)
    })
    it('tick === 2400时执行更新', () => {
      ;(sys as any).grants.push(makeGrant({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0].duration).toBe(1)
    })
    it('tick = 2399时不执行', () => {
      ;(sys as any).lastCheck = 0
      ;(sys as any).grants.push(makeGrant({ duration: 5 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2399)
      expect((sys as any).grants[0].duration).toBe(5)
    })
    it('连续两次满足间隔时执行两次更新', () => {
      ;(sys as any).grants.push(makeGrant({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0].duration).toBe(1)
      sys.update(1, {} as any, {} as any, 4800)
      expect((sys as any).grants[0].duration).toBe(2)
    })
    it('第二次不满足间隔时不执行', () => {
      ;(sys as any).grants.push(makeGrant({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2400)
      const d = (sys as any).grants[0].duration
      sys.update(1, {} as any, {} as any, 2401)
      expect((sys as any).grants[0].duration).toBe(d)
    })
  })

  describe('数值字段动态更新', () => {
    it('每次update duration+1', () => {
      ;(sys as any).grants.push(makeGrant({ duration: 7 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0].duration).toBe(8)
    })
    it('exemptionScope保持在[10,80]范围内', () => {
      ;(sys as any).grants.push(makeGrant({ exemptionScope: 40 }))
      for (let tick = 2400; tick < 2400 * 100; tick += 2400) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, tick)
        const v = (sys as any).grants[0]?.exemptionScope
        if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(80) }
      }
    })
    it('politicalCost保持在[5,70]范围内', () => {
      ;(sys as any).grants.push(makeGrant({ politicalCost: 30 }))
      for (let tick = 2400; tick < 2400 * 100; tick += 2400) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, tick)
        const v = (sys as any).grants[0]?.politicalCost
        if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(70) }
      }
    })
    it('benefitValue保持在[10,85]范围内', () => {
      ;(sys as any).grants.push(makeGrant({ benefitValue: 45 }))
      for (let tick = 2400; tick < 2400 * 100; tick += 2400) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, tick)
        const v = (sys as any).grants[0]?.benefitValue
        if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(85) }
      }
    })
    it('precedentRisk保持在[5,60]范围内', () => {
      ;(sys as any).grants.push(makeGrant({ precedentRisk: 20 }))
      for (let tick = 2400; tick < 2400 * 100; tick += 2400) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, tick)
        const v = (sys as any).grants[0]?.precedentRisk
        if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(60) }
      }
    })
  })

  describe('过期清理cutoff=tick-85000', () => {
    it('过期记录(tick<cutoff)被删除', () => {
      const bigTick = 200000
      ;(sys as any).grants.push(makeGrant({ tick: 0 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).grants).toHaveLength(0)
    })
    it('新记录(tick=bigTick)不被删除', () => {
      const bigTick = 200000
      ;(sys as any).grants.push(makeGrant({ tick: bigTick }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).grants).toHaveLength(1)
    })
    it('混合场景：过期删、新的保留', () => {
      const bigTick = 200000
      ;(sys as any).grants.push(makeGrant({ id: 1, tick: 0 }))
      ;(sys as any).grants.push(makeGrant({ id: 2, tick: bigTick }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).grants).toHaveLength(1)
      expect((sys as any).grants[0].id).toBe(2)
    })
    it('tick===cutoff时不删除', () => {
      const bigTick = 200000
      const cutoff = bigTick - 85000
      ;(sys as any).grants.push(makeGrant({ tick: cutoff }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).grants).toHaveLength(1)
    })
    it('空数组时过期清理不报错', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => sys.update(1, {} as any, {} as any, 200000)).not.toThrow()
    })
  })

  describe('MAX_GRANTS=20上限', () => {
    it('已满20条时不新增', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).grants.push(makeGrant({ id: i + 1, tick: 2400 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants).toHaveLength(20)
      vi.restoreAllMocks()
    })
    it('random>=GRANT_CHANCE时不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants).toHaveLength(0)
      vi.restoreAllMocks()
    })
    it('未满20条且random<GRANT_CHANCE时不崩溃', () => {
      const vals = [0, 0.1, 0.9, 0]
      let idx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => vals[idx++ % vals.length])
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(1, {} as any, {} as any, 2400)).not.toThrow()
      vi.restoreAllMocks()
    })
    it('19条时可新增到最多20', () => {
      for (let i = 0; i < 19; i++) {
        ;(sys as any).grants.push(makeGrant({ id: i + 1, tick: 2400 }))
      }
      const vals = [0, 0.1, 0.9, 0]
      let idx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => vals[idx++ % vals.length])
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants.length).toBeLessThanOrEqual(20)
      vi.restoreAllMocks()
    })
  })

  describe('DispensationForm枚举完整性', () => {
    it("form='trade_exemption'可正确存储", () => {
      ;(sys as any).grants.push(makeGrant({ form: 'trade_exemption' }))
      expect((sys as any).grants[0].form).toBe('trade_exemption')
    })
    it("form='military_waiver'可正确存储", () => {
      ;(sys as any).grants.push(makeGrant({ form: 'military_waiver' }))
      expect((sys as any).grants[0].form).toBe('military_waiver')
    })
    it("form='tribute_relief'可正确存储", () => {
      ;(sys as any).grants.push(makeGrant({ form: 'tribute_relief' }))
      expect((sys as any).grants[0].form).toBe('tribute_relief')
    })
    it("form='law_exception'可正确存储", () => {
      ;(sys as any).grants.push(makeGrant({ form: 'law_exception' }))
      expect((sys as any).grants[0].form).toBe('law_exception')
    })
  })
})
