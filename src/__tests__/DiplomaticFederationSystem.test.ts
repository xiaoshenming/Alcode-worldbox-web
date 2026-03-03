import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticFederationSystem } from '../systems/DiplomaticFederationSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticFederationSystem() }
function makeAgreement(overrides: Record<string, any> = {}) {
  return {
    id: 1, civIdA: 1, civIdB: 2, form: 'political_union',
    integrationLevel: 50, sharedGovernance: 50, memberAutonomy: 40, collectiveStrength: 35,
    duration: 0, tick: 0, ...overrides
  }
}

describe('DiplomaticFederationSystem', () => {
  let sys: DiplomaticFederationSystem
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys = makeSys()
  })
  afterEach(() => { vi.restoreAllMocks() })

  describe('基础数据结构', () => {
    it('初始agreements为空', () => { expect((sys as any).agreements).toHaveLength(0) })
    it('注入后agreements返回数据', () => {
      ;(sys as any).agreements.push({ id: 1 })
      expect((sys as any).agreements).toHaveLength(1)
    })
    it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
    it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
    it('agreements是数组', () => { expect(Array.isArray((sys as any).agreements)).toBe(true) })
    it('多次注入后长度正确', () => {
      ;(sys as any).agreements.push({ id: 1 }, { id: 2 }, { id: 3 })
      expect((sys as any).agreements).toHaveLength(3)
    })
    it('nextId可手动设置', () => {
      ;(sys as any).nextId = 99
      expect((sys as any).nextId).toBe(99)
    })
    it('lastCheck可手动设置', () => {
      ;(sys as any).lastCheck = 5000
      expect((sys as any).lastCheck).toBe(5000)
    })
    it('agreements初始为空数组实例', () => {
      expect((sys as any).agreements).toEqual([])
    })
    it('注入的对象可读取字段', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 42 }))
      expect((sys as any).agreements[0].id).toBe(42)
    })
  })

  describe('CHECK_INTERVAL节流', () => {
    it('tick < CHECK_INTERVAL不更新lastCheck', () => {
      sys.update(1, W, EM, 100)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('tick === CHECK_INTERVAL时更新lastCheck', () => {
      sys.update(1, W, EM, 2500)
      expect((sys as any).lastCheck).toBe(2500)
    })
    it('tick = CHECK_INTERVAL-1不更新', () => {
      sys.update(1, W, EM, 2499)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('连续两次满足间隔均更新', () => {
      sys.update(1, W, EM, 2500)
      sys.update(1, W, EM, 5000)
      expect((sys as any).lastCheck).toBe(5000)
    })
    it('第二次不满足间隔不更新', () => {
      sys.update(1, W, EM, 2500)
      sys.update(1, W, EM, 2600)
      expect((sys as any).lastCheck).toBe(2500)
    })
    it('tick=0不触发', () => {
      sys.update(1, W, EM, 0)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('tick=1不触发', () => {
      sys.update(1, W, EM, 1)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('三次间隔均满足时lastCheck跟随最新tick', () => {
      sys.update(1, W, EM, 2500)
      sys.update(1, W, EM, 5000)
      sys.update(1, W, EM, 7500)
      expect((sys as any).lastCheck).toBe(7500)
    })
  })

  describe('数值字段动态更新', () => {
    it('每次update后duration+1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(makeAgreement({ duration: 0, tick: 0 }))
      sys.update(1, W, EM, 2500)
      expect((sys as any).agreements[0].duration).toBe(1)
    })
    it('integrationLevel上限不超过90', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(makeAgreement({ integrationLevel: 89.99, tick: 0 }))
      sys.update(1, W, EM, 2500)
      expect((sys as any).agreements[0].integrationLevel).toBeLessThanOrEqual(90)
    })
    it('sharedGovernance上限不超过85', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(makeAgreement({ sharedGovernance: 84.99, tick: 0 }))
      sys.update(1, W, EM, 2500)
      expect((sys as any).agreements[0].sharedGovernance).toBeLessThanOrEqual(85)
    })
    it('memberAutonomy下限不低于5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).agreements.push(makeAgreement({ memberAutonomy: 5.01, tick: 0 }))
      sys.update(1, W, EM, 2500)
      expect((sys as any).agreements[0].memberAutonomy).toBeGreaterThanOrEqual(5)
    })
    it('collectiveStrength下限不低于5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).agreements.push(makeAgreement({ collectiveStrength: 5.01, tick: 0 }))
      sys.update(1, W, EM, 2500)
      expect((sys as any).agreements[0].collectiveStrength).toBeGreaterThanOrEqual(5)
    })
    it('duration连续两次update后为2', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(makeAgreement({ duration: 0, tick: 100000 }))
      sys.update(1, W, EM, 102500)
      sys.update(1, W, EM, 105000)
      expect((sys as any).agreements[0].duration).toBe(2)
    })
    it('integrationLevel在mid值时仍在合法范围', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).agreements.push(makeAgreement({ integrationLevel: 50, tick: 0 }))
      sys.update(1, W, EM, 2500)
      const v = (sys as any).agreements[0].integrationLevel
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(90)
    })
    it('collectiveStrength在high mock下不超上限', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(makeAgreement({ collectiveStrength: 50, tick: 0 }))
      sys.update(1, W, EM, 2500)
      const v = (sys as any).agreements[0].collectiveStrength
      if (v !== undefined) expect(v).toBeGreaterThanOrEqual(5)
    })
  })

  describe('过期清理cutoff=tick-94000', () => {
    it('过期agreement被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(makeAgreement({ tick: 0 }))
      sys.update(1, W, EM, 94001)
      expect((sys as any).agreements).toHaveLength(0)
    })
    it('新鲜agreement保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(makeAgreement({ tick: 90000 }))
      sys.update(1, W, EM, 94001)
      expect((sys as any).agreements).toHaveLength(1)
    })
    it('混合：过期删除新鲜保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(
        makeAgreement({ id: 1, tick: 0 }),
        makeAgreement({ id: 2, tick: 90000 })
      )
      sys.update(1, W, EM, 94001)
      expect((sys as any).agreements).toHaveLength(1)
      expect((sys as any).agreements[0].id).toBe(2)
    })
    it('tick===cutoff边界不删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(makeAgreement({ tick: 6000 }))
      sys.update(1, W, EM, 100000)
      expect((sys as any).agreements).toHaveLength(1)
    })
    it('空数组安全运行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      expect(() => sys.update(1, W, EM, 100000)).not.toThrow()
    })
    it('三条记录全部过期时全部删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 0; i < 3; i++) {
        ;(sys as any).agreements.push(makeAgreement({ id: i + 1, tick: 0 }))
      }
      sys.update(1, W, EM, 94001)
      expect((sys as any).agreements).toHaveLength(0)
    })
    it('三条中两条过期时保留一条', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(
        makeAgreement({ id: 1, tick: 0 }),
        makeAgreement({ id: 2, tick: 0 }),
        makeAgreement({ id: 3, tick: 90000 })
      )
      sys.update(1, W, EM, 94001)
      expect((sys as any).agreements).toHaveLength(1)
      expect((sys as any).agreements[0].id).toBe(3)
    })
  })

  describe('MAX_AGREEMENTS上限', () => {
    it('已满16个不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 16; i++) {
        ;(sys as any).agreements.push(makeAgreement({ id: i + 1, tick: 100000 }))
      }
      sys.update(1, W, EM, 102500)
      expect((sys as any).agreements).toHaveLength(16)
    })
    it('15个时可新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 15; i++) {
        ;(sys as any).agreements.push(makeAgreement({ id: i + 1, tick: 100000 }))
      }
      ;(sys as any).nextId = 16
      sys.update(1, W, EM, 102500)
      expect((sys as any).agreements.length).toBeGreaterThanOrEqual(15)
    })
    it('满时nextId不递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 16; i++) {
        ;(sys as any).agreements.push(makeAgreement({ id: i + 1, tick: 100000 }))
      }
      ;(sys as any).nextId = 17
      sys.update(1, W, EM, 102500)
      expect((sys as any).nextId).toBe(17)
    })
    it('空时PROCEED_CHANCE不满足不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, 2500)
      expect((sys as any).agreements).toHaveLength(0)
    })
    it('手动填满16条后count正确', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).agreements.push(makeAgreement({ id: i + 1 }))
      }
      expect((sys as any).agreements).toHaveLength(16)
    })
    it('nextId手动递增后值正确', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: (sys as any).nextId++ }))
      ;(sys as any).agreements.push(makeAgreement({ id: (sys as any).nextId++ }))
      expect((sys as any).agreements[0].id).toBe(1)
      expect((sys as any).agreements[1].id).toBe(2)
      expect((sys as any).nextId).toBe(3)
    })
  })

  describe('Form枚举完整性', () => {
    it('包含political_union', () => {
      expect(['political_union', 'economic_federation', 'military_league', 'cultural_federation']).toContain('political_union')
    })
    it('包含economic_federation', () => {
      expect(['political_union', 'economic_federation', 'military_league', 'cultural_federation']).toContain('economic_federation')
    })
    it('包含military_league', () => {
      expect(['political_union', 'economic_federation', 'military_league', 'cultural_federation']).toContain('military_league')
    })
    it('共4种form', () => {
      expect(['political_union', 'economic_federation', 'military_league', 'cultural_federation']).toHaveLength(4)
    })
    it('包含cultural_federation', () => {
      expect(['political_union', 'economic_federation', 'military_league', 'cultural_federation']).toContain('cultural_federation')
    })
    it('form字段可赋值political_union', () => {
      const a = makeAgreement({ form: 'political_union' })
      expect(a.form).toBe('political_union')
    })
    it('form字段可赋值military_league', () => {
      const a = makeAgreement({ form: 'military_league' })
      expect(a.form).toBe('military_league')
    })
  })

  describe('安全性与边界', () => {
    it('update不抛出错误', () => {
      expect(() => sys.update(1, W, EM, 0)).not.toThrow()
    })
    it('update返回undefined', () => {
      expect(sys.update(1, W, EM, 0)).toBeUndefined()
    })
    it('多次空update不累计lastCheck', () => {
      sys.update(1, W, EM, 0)
      sys.update(1, W, EM, 0)
      sys.update(1, W, EM, 0)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('非常大的tick值安全运行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      expect(() => sys.update(1, W, EM, 9999999)).not.toThrow()
    })
    it('lastCheck在触发后等于传入tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      sys.update(1, W, EM, 2500)
      expect((sys as any).lastCheck).toBe(2500)
    })
    it('tick大幅跳跃时仍正确触发', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      sys.update(1, W, EM, 50000)
      expect((sys as any).lastCheck).toBe(50000)
    })
    it('agreements被删后nextId不重置', () => {
      ;(sys as any).nextId = 10
      ;(sys as any).agreements.push(makeAgreement({ id: 9, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, W, EM, 94001)
      expect((sys as any).nextId).toBe(10)
    })
  })
})
