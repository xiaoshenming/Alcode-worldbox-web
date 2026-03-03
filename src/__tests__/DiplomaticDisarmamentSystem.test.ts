import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticDisarmamentSystem, DisarmamentTreaty } from '../systems/DiplomaticDisarmamentSystem'

function makeTreaty(overrides: Partial<DisarmamentTreaty> = {}): DisarmamentTreaty {
  return {
    id: 1, civIdA: 1, civIdB: 2, scope: 'partial',
    armsReduction: 20, verificationLevel: 40, complianceRate: 55, peaceDividend: 15,
    duration: 0, tick: 0, ...overrides,
  }
}

describe('DiplomaticDisarmamentSystem', () => {
  let sys: DiplomaticDisarmamentSystem

  beforeEach(() => {
    sys = new DiplomaticDisarmamentSystem()
    vi.restoreAllMocks()
  })

  describe('基础数据结构', () => {
    it('初始treaties为空数组', () => {
      expect((sys as any).treaties).toHaveLength(0)
    })
    it('注入treaty后可查询', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 99 }))
      expect((sys as any).treaties[0].id).toBe(99)
    })
    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })
    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })
    it('4种scope枚举均可存储', () => {
      const scopes = ['partial', 'regional', 'bilateral', 'comprehensive']
      for (const s of scopes) {
        ;(sys as any).treaties.push(makeTreaty({ scope: s as any }))
      }
      const stored = (sys as any).treaties.map((t: DisarmamentTreaty) => t.scope)
      expect(stored).toEqual(expect.arrayContaining(scopes))
    })
  })

  describe('CHECK_INTERVAL=2350节流', () => {
    it('tick < 2350时不执行更新', () => {
      ;(sys as any).treaties.push(makeTreaty({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2349)
      expect((sys as any).treaties[0].duration).toBe(0)
    })
    it('tick === 2350时执行更新', () => {
      ;(sys as any).treaties.push(makeTreaty({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0].duration).toBe(1)
    })
    it('tick = 2349时不执行', () => {
      ;(sys as any).lastCheck = 0
      ;(sys as any).treaties.push(makeTreaty({ duration: 5 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2349)
      expect((sys as any).treaties[0].duration).toBe(5)
    })
    it('连续两次满足间隔时执行两次更新', () => {
      ;(sys as any).treaties.push(makeTreaty({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0].duration).toBe(1)
      sys.update(1, {} as any, {} as any, 4700)
      expect((sys as any).treaties[0].duration).toBe(2)
    })
    it('第二次不满足间隔时不执行', () => {
      ;(sys as any).treaties.push(makeTreaty({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2350)
      const d = (sys as any).treaties[0].duration
      sys.update(1, {} as any, {} as any, 2351)
      expect((sys as any).treaties[0].duration).toBe(d)
    })
  })

  describe('数值字段动态更新', () => {
    it('每次update duration+1', () => {
      ;(sys as any).treaties.push(makeTreaty({ duration: 7 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0].duration).toBe(8)
    })
    it('armsReduction保持在[5,80]范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ armsReduction: 40 }))
      for (let tick = 2350; tick < 2350 * 100; tick += 2350) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, tick)
        const v = (sys as any).treaties[0]?.armsReduction
        if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(80) }
      }
    })
    it('verificationLevel保持在[10,90]范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ verificationLevel: 50 }))
      for (let tick = 2350; tick < 2350 * 100; tick += 2350) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, tick)
        const v = (sys as any).treaties[0]?.verificationLevel
        if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
      }
    })
    it('complianceRate保持在[15,100]范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ complianceRate: 60 }))
      for (let tick = 2350; tick < 2350 * 100; tick += 2350) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, tick)
        const v = (sys as any).treaties[0]?.complianceRate
        if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(15); expect(v).toBeLessThanOrEqual(100) }
      }
    })
    it('peaceDividend保持在[3,60]范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ peaceDividend: 20 }))
      for (let tick = 2350; tick < 2350 * 100; tick += 2350) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, tick)
        const v = (sys as any).treaties[0]?.peaceDividend
        if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(3); expect(v).toBeLessThanOrEqual(60) }
      }
    })
  })

  describe('过期清理cutoff=tick-85000', () => {
    it('过期记录(tick<cutoff)被删除', () => {
      const bigTick = 200000
      ;(sys as any).treaties.push(makeTreaty({ tick: 0 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(0)
    })
    it('新记录(tick=bigTick)不被删除', () => {
      const bigTick = 200000
      ;(sys as any).treaties.push(makeTreaty({ tick: bigTick }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(1)
    })
    it('混合场景：过期删、新的保留', () => {
      const bigTick = 200000
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: 0 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 2, tick: bigTick }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(1)
      expect((sys as any).treaties[0].id).toBe(2)
    })
    it('tick===cutoff时不删除', () => {
      const bigTick = 200000
      const cutoff = bigTick - 85000
      ;(sys as any).treaties.push(makeTreaty({ tick: cutoff }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(1)
    })
    it('空数组时过期清理不报错', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => sys.update(1, {} as any, {} as any, 200000)).not.toThrow()
    })
  })

  describe('MAX_TREATIES=20上限', () => {
    it('已满20条时不新增', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).treaties.push(makeTreaty({ id: i + 1, tick: 2350 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties).toHaveLength(20)
      vi.restoreAllMocks()
    })
    it('random>=TREATY_CHANCE时不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties).toHaveLength(0)
      vi.restoreAllMocks()
    })
    it('未满20条且random<TREATY_CHANCE时不崩溃', () => {
      const vals = [0, 0.1, 0.9, 0]
      let idx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => vals[idx++ % vals.length])
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(1, {} as any, {} as any, 2350)).not.toThrow()
      vi.restoreAllMocks()
    })
    it('19条时可新增到最多20', () => {
      for (let i = 0; i < 19; i++) {
        ;(sys as any).treaties.push(makeTreaty({ id: i + 1, tick: 2350 }))
      }
      const vals = [0, 0.1, 0.9, 0]
      let idx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => vals[idx++ % vals.length])
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties.length).toBeLessThanOrEqual(20)
      vi.restoreAllMocks()
    })
  })

  describe('DisarmamentScope枚举完整性', () => {
    it("scope='partial'可正确存储", () => {
      ;(sys as any).treaties.push(makeTreaty({ scope: 'partial' }))
      expect((sys as any).treaties[0].scope).toBe('partial')
    })
    it("scope='regional'可正确存储", () => {
      ;(sys as any).treaties.push(makeTreaty({ scope: 'regional' }))
      expect((sys as any).treaties[0].scope).toBe('regional')
    })
    it("scope='bilateral'可正确存储", () => {
      ;(sys as any).treaties.push(makeTreaty({ scope: 'bilateral' }))
      expect((sys as any).treaties[0].scope).toBe('bilateral')
    })
    it("scope='comprehensive'可正确存储", () => {
      ;(sys as any).treaties.push(makeTreaty({ scope: 'comprehensive' }))
      expect((sys as any).treaties[0].scope).toBe('comprehensive')
    })
  })

  describe('额外覆盖测试', () => {
    it('armsReduction 上限 80 不被突破', () => {
      ;(sys as any).treaties.push(makeTreaty({ armsReduction: 79.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0]?.armsReduction).toBeLessThanOrEqual(80)
      vi.restoreAllMocks()
    })

    it('armsReduction 下限 5 不被突破', () => {
      ;(sys as any).treaties.push(makeTreaty({ armsReduction: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0]?.armsReduction).toBeGreaterThanOrEqual(5)
      vi.restoreAllMocks()
    })

    it('verificationLevel 上限 90 不被突破', () => {
      ;(sys as any).treaties.push(makeTreaty({ verificationLevel: 89.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0]?.verificationLevel).toBeLessThanOrEqual(90)
      vi.restoreAllMocks()
    })

    it('complianceRate 上限 100 不被突破', () => {
      ;(sys as any).treaties.push(makeTreaty({ complianceRate: 99.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0]?.complianceRate).toBeLessThanOrEqual(100)
      vi.restoreAllMocks()
    })

    it('peaceDividend 上限 60 不被突破', () => {
      ;(sys as any).treaties.push(makeTreaty({ peaceDividend: 59.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0]?.peaceDividend).toBeLessThanOrEqual(60)
      vi.restoreAllMocks()
    })

    it('DisarmamentTreaty 包含所有必要字段', () => {
      const t = makeTreaty()
      expect(t).toHaveProperty('id')
      expect(t).toHaveProperty('civIdA')
      expect(t).toHaveProperty('civIdB')
      expect(t).toHaveProperty('scope')
      expect(t).toHaveProperty('armsReduction')
      expect(t).toHaveProperty('verificationLevel')
      expect(t).toHaveProperty('complianceRate')
      expect(t).toHaveProperty('peaceDividend')
      expect(t).toHaveProperty('duration')
      expect(t).toHaveProperty('tick')
    })

    it('update 不改变 civIdA/civIdB', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).treaties.push(makeTreaty({ civIdA: 4, civIdB: 6, tick: 0 }))
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0].civIdA).toBe(4)
      expect((sys as any).treaties[0].civIdB).toBe(6)
      vi.restoreAllMocks()
    })

    it('update 不改变 scope 字段', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).treaties.push(makeTreaty({ scope: 'comprehensive', tick: 0 }))
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0].scope).toBe('comprehensive')
      vi.restoreAllMocks()
    })

    it('全部过期后 treaties 清空', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).treaties.push(makeTreaty({ tick: 0 }))
      ;(sys as any).treaties.push(makeTreaty({ tick: 100 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 200000)
      expect((sys as any).treaties).toHaveLength(0)
      vi.restoreAllMocks()
    })

    it('mixed 过期和未过期，仅删过期', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const bigTick = 200000
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: 0 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 2, tick: bigTick }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(1)
      expect((sys as any).treaties[0].id).toBe(2)
      vi.restoreAllMocks()
    })

    it('多条 treaties 各自独立更新 duration', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).treaties.push(makeTreaty({ id: 1, duration: 3, tick: 0 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 2, duration: 7, tick: 0 }))
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0].duration).toBe(4)
      expect((sys as any).treaties[1].duration).toBe(8)
      vi.restoreAllMocks()
    })

    it('verificationLevel 下限 10 不被突破', () => {
      ;(sys as any).treaties.push(makeTreaty({ verificationLevel: 10.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0]?.verificationLevel).toBeGreaterThanOrEqual(10)
      vi.restoreAllMocks()
    })

    it('complianceRate 下限 15 不被突破', () => {
      ;(sys as any).treaties.push(makeTreaty({ complianceRate: 15.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties[0]?.complianceRate).toBeGreaterThanOrEqual(15)
      vi.restoreAllMocks()
    })

    it('tick 恰好等于 cutoff 时不被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const bigTick = 200000
      const cutoff = bigTick - 85000
      ;(sys as any).treaties.push(makeTreaty({ tick: cutoff }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(1)
      vi.restoreAllMocks()
    })

    it('nextId 手动设置后保持', () => {
      ;(sys as any).nextId = 66
      expect((sys as any).nextId).toBe(66)
    })

    it('lastCheck 更新到最新 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2350 * 5)
      expect((sys as any).lastCheck).toBe(2350 * 5)
      vi.restoreAllMocks()
    })

    it('tick 极大时正常执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => sys.update(1, {} as any, {} as any, 99999999)).not.toThrow()
      vi.restoreAllMocks()
    })

    it('初始系统创建不崩溃', () => {
      expect(() => new DiplomaticDisarmamentSystem()).not.toThrow()
    })

    it('treaties 是数组类型', () => {
      expect(Array.isArray((sys as any).treaties)).toBe(true)
    })

    it('treaties 数量不超过 MAX_TREATIES=20', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).treaties.push(makeTreaty({ id: i + 1, tick: 2350 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2350)
      expect((sys as any).treaties.length).toBeLessThanOrEqual(20)
      vi.restoreAllMocks()
    })
  })
})
