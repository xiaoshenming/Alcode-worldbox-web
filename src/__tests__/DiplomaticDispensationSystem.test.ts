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

  describe('额外覆盖测试', () => {
    it('exemptionScope 上限 80 不被突破', () => {
      ;(sys as any).grants.push(makeGrant({ exemptionScope: 79.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0]?.exemptionScope).toBeLessThanOrEqual(80)
      vi.restoreAllMocks()
    })

    it('exemptionScope 下限 10 不被突破', () => {
      ;(sys as any).grants.push(makeGrant({ exemptionScope: 10.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0]?.exemptionScope).toBeGreaterThanOrEqual(10)
      vi.restoreAllMocks()
    })

    it('politicalCost 上限 70 不被突破', () => {
      ;(sys as any).grants.push(makeGrant({ politicalCost: 69.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0]?.politicalCost).toBeLessThanOrEqual(70)
      vi.restoreAllMocks()
    })

    it('politicalCost 下限 5 不被突破', () => {
      ;(sys as any).grants.push(makeGrant({ politicalCost: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0]?.politicalCost).toBeGreaterThanOrEqual(5)
      vi.restoreAllMocks()
    })

    it('benefitValue 上限 85 不被突破', () => {
      ;(sys as any).grants.push(makeGrant({ benefitValue: 84.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0]?.benefitValue).toBeLessThanOrEqual(85)
      vi.restoreAllMocks()
    })

    it('precedentRisk 上限 60 不被突破', () => {
      ;(sys as any).grants.push(makeGrant({ precedentRisk: 59.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0]?.precedentRisk).toBeLessThanOrEqual(60)
      vi.restoreAllMocks()
    })

    it('military_waiver form 可存储', () => {
      ;(sys as any).grants.push(makeGrant({ form: 'military_waiver' }))
      expect((sys as any).grants[0].form).toBe('military_waiver')
    })

    it('tribute_relief form 可存储', () => {
      ;(sys as any).grants.push(makeGrant({ form: 'tribute_relief' }))
      expect((sys as any).grants[0].form).toBe('tribute_relief')
    })

    it('law_exception form 可存储', () => {
      ;(sys as any).grants.push(makeGrant({ form: 'law_exception' }))
      expect((sys as any).grants[0].form).toBe('law_exception')
    })

    it('update 不改变 form', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).grants.push(makeGrant({ form: 'law_exception', tick: 0 }))
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0].form).toBe('law_exception')
      vi.restoreAllMocks()
    })

    it('update 不改变 civIdA/civIdB', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).grants.push(makeGrant({ civIdA: 5, civIdB: 8, tick: 0 }))
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0].civIdA).toBe(5)
      expect((sys as any).grants[0].civIdB).toBe(8)
      vi.restoreAllMocks()
    })

    it('过期记录被移除（cutoff=tick-85000）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).grants.push(makeGrant({ tick: 0 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 200000)
      expect((sys as any).grants).toHaveLength(0)
      vi.restoreAllMocks()
    })

    it('未过期记录保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const bigTick = 200000
      ;(sys as any).grants.push(makeGrant({ tick: bigTick }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).grants).toHaveLength(1)
      vi.restoreAllMocks()
    })

    it('多条 grants 各自独立更新 duration', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).grants.push(makeGrant({ id: 1, duration: 3, tick: 0 }))
      ;(sys as any).grants.push(makeGrant({ id: 2, duration: 7, tick: 0 }))
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants[0].duration).toBe(4)
      expect((sys as any).grants[1].duration).toBe(8)
      vi.restoreAllMocks()
    })

    it('全部过期后 grants 清空', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).grants.push(makeGrant({ tick: 0 }))
      ;(sys as any).grants.push(makeGrant({ tick: 100 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 200000)
      expect((sys as any).grants).toHaveLength(0)
      vi.restoreAllMocks()
    })

    it('mixed 过期和未过期，仅删过期', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const bigTick = 200000
      ;(sys as any).grants.push(makeGrant({ id: 1, tick: 0 }))
      ;(sys as any).grants.push(makeGrant({ id: 2, tick: bigTick }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).grants).toHaveLength(1)
      expect((sys as any).grants[0].id).toBe(2)
      vi.restoreAllMocks()
    })

    it('空 grants 时 update 不崩溃', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      expect(() => sys.update(1, {} as any, {} as any, 2400)).not.toThrow()
      vi.restoreAllMocks()
    })

    it('nextId 手动设置后保持', () => {
      ;(sys as any).nextId = 88
      expect((sys as any).nextId).toBe(88)
    })

    it('lastCheck 更新到最新 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2400 * 4)
      expect((sys as any).lastCheck).toBe(2400 * 4)
      vi.restoreAllMocks()
    })

    it('DispensationGrant 包含所有必要字段', () => {
      const g = makeGrant()
      expect(g).toHaveProperty('id')
      expect(g).toHaveProperty('civIdA')
      expect(g).toHaveProperty('civIdB')
      expect(g).toHaveProperty('form')
      expect(g).toHaveProperty('exemptionScope')
      expect(g).toHaveProperty('politicalCost')
      expect(g).toHaveProperty('benefitValue')
      expect(g).toHaveProperty('precedentRisk')
      expect(g).toHaveProperty('duration')
      expect(g).toHaveProperty('tick')
    })

    it('MAX_GRANTS=20 上限：已满时不新增', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).grants.push(makeGrant({ id: i + 1, tick: 2400 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).grants.length).toBeLessThanOrEqual(20)
      vi.restoreAllMocks()
    })
  })
})
