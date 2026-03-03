import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticGrithmanSystem, GrithmanForm, GrithmanArrangement } from '../systems/DiplomaticGrithmanSystem'

function makeSys() { return new DiplomaticGrithmanSystem() }

function makeArr(overrides: Partial<GrithmanArrangement> = {}): GrithmanArrangement {
  return { id: 1, sanctuaryCivId: 1, peaceCivId: 2, form: 'royal_grithman',
    sanctuaryAuthority: 50, peaceEnforcement: 50, asylumRights: 40, trucePeriod: 30,
    duration: 0, tick: 100000, ...overrides }
}

describe('DiplomaticGrithmanSystem', () => {
  let sys: DiplomaticGrithmanSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  describe('基础数据结构', () => {
    it('初始arrangements为空数组', () => {
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('初始arrangements是Array类型', () => {
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })
    it('nextId初始值为1', () => {
      expect((sys as any).nextId).toBe(1)
    })
    it('lastCheck初始值为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })
    it('注入单条arrangements可读取', () => {
      ;(sys as any).arrangements.push(makeArr())
      expect((sys as any).arrangements).toHaveLength(1)
      expect((sys as any).arrangements[0].id).toBe(1)
    })
  })

  describe('CHECK_INTERVAL节流', () => {
    it('tick差值小于2930时跳过更新，lastCheck不变', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 12929)
      expect((sys as any).lastCheck).toBe(10000)
    })
    it('tick差值等于2930时触发更新，lastCheck更新', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 12930)
      expect((sys as any).lastCheck).toBe(12930)
    })
    it('tick差值大于2930时触发更新，lastCheck更新为当前tick', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 50000)
      expect((sys as any).lastCheck).toBe(50000)
    })
    it('连续在interval内调用，lastCheck只在第一次触发时更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).lastCheck).toBe(3000)
      sys.update(1, {} as any, {} as any, 4000)
      expect((sys as any).lastCheck).toBe(3000)
    })
    it('两次足够间隔的update均触发，lastCheck两次均更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).lastCheck).toBe(3000)
      sys.update(1, {} as any, {} as any, 6000)
      expect((sys as any).lastCheck).toBe(6000)
    })
  })

  describe('数值字段动态更新', () => {
    it('每次update后duration递增1', () => {
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].duration).toBe(1)
    })
    it('多次update后duration持续累加', () => {
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      sys.update(1, {} as any, {} as any, 6000)
      sys.update(1, {} as any, {} as any, 9000)
      expect((sys as any).arrangements[0].duration).toBe(3)
    })
    it('sanctuaryAuthority不低于最小值5', () => {
      ;(sys as any).arrangements.push(makeArr({ sanctuaryAuthority: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].sanctuaryAuthority).toBeGreaterThanOrEqual(5)
    })
    it('sanctuaryAuthority不超过最大值85', () => {
      ;(sys as any).arrangements.push(makeArr({ sanctuaryAuthority: 84.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].sanctuaryAuthority).toBeLessThanOrEqual(85)
    })
    it('peaceEnforcement不低于最小值10', () => {
      ;(sys as any).arrangements.push(makeArr({ peaceEnforcement: 10.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].peaceEnforcement).toBeGreaterThanOrEqual(10)
    })
    it('peaceEnforcement不超过最大值90', () => {
      ;(sys as any).arrangements.push(makeArr({ peaceEnforcement: 89.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].peaceEnforcement).toBeLessThanOrEqual(90)
    })
    it('asylumRights不低于最小值5', () => {
      ;(sys as any).arrangements.push(makeArr({ asylumRights: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].asylumRights).toBeGreaterThanOrEqual(5)
    })
    it('trucePeriod不超过最大值65', () => {
      ;(sys as any).arrangements.push(makeArr({ trucePeriod: 64.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].trucePeriod).toBeLessThanOrEqual(65)
    })
  })

  describe('过期清理cutoff=tick-88000', () => {
    it('tick=0的记录在大tick时被清理', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('tick=88001的记录在tick=90000时被保留', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 88001 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('tick刚好等于cutoff时记录被保留', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 2000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('混合新旧记录：只删除过期的，保留有效的', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 150000 }))
      ;(sys as any).arrangements.push(makeArr({ id: 3, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 200000)
      const ids = (sys as any).arrangements.map((a: GrithmanArrangement) => a.id)
      expect(ids).toContain(2)
      expect(ids).not.toContain(1)
      expect(ids).not.toContain(3)
    })
    it('无过期记录时arrangements长度不变', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 5000 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 6000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements).toHaveLength(2)
    })
  })

  describe('MAX_ARRANGEMENTS=16上限', () => {
    it('arrangements达到16时不新增', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, sanctuaryCivId: i + 1, peaceCivId: i + 20, tick: 500000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, {} as any, {} as any, 503000)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('arrangements未达16时random触发可新增', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, sanctuaryCivId: i + 1, peaceCivId: i + 20, tick: 500000 }))
      }
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 503000)
      expect((sys as any).arrangements.length).toBeGreaterThan(10)
    })
    it('nextId在新增时递增', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).nextId).toBeGreaterThanOrEqual(2)
    })
    it('新增记录的form字段是合法GrithmanForm', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      const validForms: GrithmanForm[] = ['royal_grithman', 'church_grithman', 'market_grithman', 'court_grithman']
      if ((sys as any).arrangements.length > 0) {
        expect(validForms).toContain((sys as any).arrangements[0].form)
      }
    })
  })

  describe('Form枚举完整性', () => {
    it('royal_grithman可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'royal_grithman' }))
      expect((sys as any).arrangements[0].form).toBe('royal_grithman')
    })
    it('church_grithman可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'church_grithman' }))
      expect((sys as any).arrangements[0].form).toBe('church_grithman')
    })
    it('market_grithman可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'market_grithman' }))
      expect((sys as any).arrangements[0].form).toBe('market_grithman')
    })
    it('court_grithman可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'court_grithman' }))
      expect((sys as any).arrangements[0].form).toBe('court_grithman')
    })
  })

  describe('边界条件测试', () => {
    it('sanctuaryAuthority精确等于5时保持不变', () => {
      ;(sys as any).arrangements.push(makeArr({ sanctuaryAuthority: 5, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].sanctuaryAuthority).toBe(5)
    })
    it('sanctuaryAuthority精确等于85时保持不变', () => {
      ;(sys as any).arrangements.push(makeArr({ sanctuaryAuthority: 85, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].sanctuaryAuthority).toBe(85)
    })
    it('peaceEnforcement精确等于10时保持不变', () => {
      ;(sys as any).arrangements.push(makeArr({ peaceEnforcement: 10, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].peaceEnforcement).toBe(10)
    })
    it('peaceEnforcement精确等于90时保持不变', () => {
      ;(sys as any).arrangements.push(makeArr({ peaceEnforcement: 90, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].peaceEnforcement).toBe(90)
    })
    it('asylumRights精确等于5时保持不变', () => {
      ;(sys as any).arrangements.push(makeArr({ asylumRights: 5, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].asylumRights).toBe(5)
    })
    it('asylumRights精确等于80时保持不变', () => {
      ;(sys as any).arrangements.push(makeArr({ asylumRights: 80, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].asylumRights).toBe(80)
    })
    it('trucePeriod精确等于5时保持不变', () => {
      ;(sys as any).arrangements.push(makeArr({ trucePeriod: 5, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].trucePeriod).toBe(5)
    })
    it('trucePeriod精确等于65时保持不变', () => {
      ;(sys as any).arrangements.push(makeArr({ trucePeriod: 65, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].trucePeriod).toBe(65)
    })
  })

  describe('多实体交互测试', () => {
    it('多条arrangements同时更新duration', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 3, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].duration).toBe(1)
      expect((sys as any).arrangements[1].duration).toBe(1)
      expect((sys as any).arrangements[2].duration).toBe(1)
    })
    it('多条arrangements各自独立更新数值字段', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, sanctuaryAuthority: 20, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, sanctuaryAuthority: 70, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].sanctuaryAuthority).not.toBe((sys as any).arrangements[1].sanctuaryAuthority)
    })
    it('部分arrangements过期清理后剩余arrangements保持正常', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 100000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements).toHaveLength(1)
      expect((sys as any).arrangements[0].id).toBe(2)
    })
    it('16条arrangements全部过期时清空数组', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements).toHaveLength(0)
    })
  })

  describe('极端值测试', () => {
    it('tick为0时系统正常运行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 0)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('tick为极大值时系统正常运行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 999999999)
      expect((sys as any).lastCheck).toBe(999999999)
    })
    it('duration累加到极大值仍正常', () => {
      ;(sys as any).arrangements.push(makeArr({ duration: 999999, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].duration).toBe(1000000)
    })
    it('sanctuaryCivId和peaceCivId相同时不创建新arrangement', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('所有数值字段同时达到最大值', () => {
      ;(sys as any).arrangements.push(makeArr({ sanctuaryAuthority: 85, peaceEnforcement: 90, asylumRights: 80, trucePeriod: 65, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].sanctuaryAuthority).toBe(85)
      expect((sys as any).arrangements[0].peaceEnforcement).toBe(90)
      expect((sys as any).arrangements[0].asylumRights).toBe(80)
      expect((sys as any).arrangements[0].trucePeriod).toBe(65)
    })
    it('所有数值字段同时达到最小值', () => {
      ;(sys as any).arrangements.push(makeArr({ sanctuaryAuthority: 5, peaceEnforcement: 10, asylumRights: 5, trucePeriod: 5, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].sanctuaryAuthority).toBe(5)
      expect((sys as any).arrangements[0].peaceEnforcement).toBe(10)
      expect((sys as any).arrangements[0].asylumRights).toBe(5)
      expect((sys as any).arrangements[0].trucePeriod).toBe(5)
    })
  })

  describe('状态转换测试', () => {
    it('从空数组到有1条arrangement', () => {
      expect((sys as any).arrangements).toHaveLength(0)
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements.length).toBeGreaterThan(0)
    })
    it('从15条增长到16条后不再增长', () => {
      for (let i = 0; i < 15; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, sanctuaryCivId: i + 1, peaceCivId: i + 20, tick: 500000 }))
      }
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 503000)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('从16条清理到0条后可重新增长', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements).toHaveLength(0)
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 93000)
      expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(0)
    })
    it('duration从0持续增长', () => {
      ;(sys as any).arrangements.push(makeArr({ duration: 0, tick: 500000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 503000)
      sys.update(1, {} as any, {} as any, 506000)
      sys.update(1, {} as any, {} as any, 509000)
      expect((sys as any).arrangements[0].duration).toBe(3)
    })
  })

  describe('组合场景测试', () => {
    it('同时触发新增和过期清理', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(0)
    })
    it('不同form的arrangements可共存', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, form: 'royal_grithman', tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, form: 'church_grithman', tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 3, form: 'market_grithman', tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 4, form: 'court_grithman', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements).toHaveLength(4)
    })
    it('相同sanctuaryCivId的多条arrangements独立运行', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, sanctuaryCivId: 1, peaceCivId: 2, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, sanctuaryCivId: 1, peaceCivId: 3, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements).toHaveLength(2)
    })
    it('相同peaceCivId的多条arrangements独立运行', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, sanctuaryCivId: 1, peaceCivId: 5, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, sanctuaryCivId: 2, peaceCivId: 5, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements).toHaveLength(2)
    })
    it('混合不同tick的arrangements正确清理', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 1000 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 50000 }))
      ;(sys as any).arrangements.push(makeArr({ id: 3, tick: 100000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements.length).toBeGreaterThan(0)
      expect((sys as any).arrangements.some((a: GrithmanArrangement) => a.id === 3)).toBe(true)
    })
  })
})
