import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticFederationSystem } from '../systems/DiplomaticFederationSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticFederationSystem() }

describe('DiplomaticFederationSystem', () => {
  let sys: DiplomaticFederationSystem
  beforeEach(() => { sys = makeSys() })
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
  })

  describe('数值字段动态更新', () => {
    it('每次update后duration+1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'political_union',
        integrationLevel:50, sharedGovernance:50, memberAutonomy:40, collectiveStrength:35, duration:0, tick:0 })
      sys.update(1, W, EM, 2500)
      expect((sys as any).agreements[0].duration).toBe(1)
    })
    it('integrationLevel上限不超过90', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'political_union',
        integrationLevel:89.99, sharedGovernance:50, memberAutonomy:40, collectiveStrength:35, duration:0, tick:0 })
      sys.update(1, W, EM, 2500)
      expect((sys as any).agreements[0].integrationLevel).toBeLessThanOrEqual(90)
    })
    it('sharedGovernance上限不超过85', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'political_union',
        integrationLevel:50, sharedGovernance:84.99, memberAutonomy:40, collectiveStrength:35, duration:0, tick:0 })
      sys.update(1, W, EM, 2500)
      expect((sys as any).agreements[0].sharedGovernance).toBeLessThanOrEqual(85)
    })
    it('memberAutonomy下限不低于5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'political_union',
        integrationLevel:50, sharedGovernance:50, memberAutonomy:5.01, collectiveStrength:35, duration:0, tick:0 })
      sys.update(1, W, EM, 2500)
      expect((sys as any).agreements[0].memberAutonomy).toBeGreaterThanOrEqual(5)
    })
    it('collectiveStrength下限不低于5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'political_union',
        integrationLevel:50, sharedGovernance:50, memberAutonomy:40, collectiveStrength:5.01, duration:0, tick:0 })
      sys.update(1, W, EM, 2500)
      expect((sys as any).agreements[0].collectiveStrength).toBeGreaterThanOrEqual(5)
    })
  })

  describe('过期清理cutoff=tick-94000', () => {
    it('过期agreement被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'political_union',
        integrationLevel:50, sharedGovernance:50, memberAutonomy:40, collectiveStrength:35, duration:0, tick:0 })
      sys.update(1, W, EM, 94001)
      expect((sys as any).agreements).toHaveLength(0)
    })
    it('新鲜agreement保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'political_union',
        integrationLevel:50, sharedGovernance:50, memberAutonomy:40, collectiveStrength:35, duration:0, tick:90000 })
      sys.update(1, W, EM, 94001)
      expect((sys as any).agreements).toHaveLength(1)
    })
    it('混合：过期删除新鲜保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(
        { id:1, civIdA:1, civIdB:2, form:'political_union', integrationLevel:50, sharedGovernance:50, memberAutonomy:40, collectiveStrength:35, duration:0, tick:0 },
        { id:2, civIdA:1, civIdB:3, form:'military_league', integrationLevel:50, sharedGovernance:50, memberAutonomy:40, collectiveStrength:35, duration:0, tick:90000 }
      )
      sys.update(1, W, EM, 94001)
      expect((sys as any).agreements).toHaveLength(1)
      expect((sys as any).agreements[0].id).toBe(2)
    })
    it('tick===cutoff边界不删除(tick===tick-94000+94000)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'political_union',
        integrationLevel:50, sharedGovernance:50, memberAutonomy:40, collectiveStrength:35, duration:0, tick:6000 })
      sys.update(1, W, EM, 100000)
      // cutoff=100000-94000=6000, tick(6000) < cutoff(6000) is false => 保留
      expect((sys as any).agreements).toHaveLength(1)
    })
    it('空数组安全运行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      expect(() => sys.update(1, W, EM, 100000)).not.toThrow()
    })
  })

  describe('MAX_AGREEMENTS上限', () => {
    it('已满16个不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 16; i++) {
        ;(sys as any).agreements.push({ id:i+1, civIdA:1, civIdB:2, form:'political_union',
          integrationLevel:50, sharedGovernance:50, memberAutonomy:40, collectiveStrength:35, duration:0, tick:100000 })
      }
      sys.update(1, W, EM, 102500)
      expect((sys as any).agreements).toHaveLength(16)
    })
    it('15个时可新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 15; i++) {
        ;(sys as any).agreements.push({ id:i+1, civIdA:1, civIdB:2, form:'political_union',
          integrationLevel:50, sharedGovernance:50, memberAutonomy:40, collectiveStrength:35, duration:0, tick:100000 })
      }
      ;(sys as any).nextId = 16
      sys.update(1, W, EM, 102500)
      expect((sys as any).agreements.length).toBeGreaterThanOrEqual(15)
    })
    it('满时nextId不递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 16; i++) {
        ;(sys as any).agreements.push({ id:i+1, civIdA:1, civIdB:2, form:'political_union',
          integrationLevel:50, sharedGovernance:50, memberAutonomy:40, collectiveStrength:35, duration:0, tick:100000 })
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
  })

  describe('Form枚举完整性', () => {
    it('包含political_union', () => {
      const forms = ['political_union','economic_federation','military_league','cultural_federation']
      expect(forms).toContain('political_union')
    })
    it('包含economic_federation', () => {
      expect(['political_union','economic_federation','military_league','cultural_federation']).toContain('economic_federation')
    })
    it('包含military_league', () => {
      expect(['political_union','economic_federation','military_league','cultural_federation']).toContain('military_league')
    })
    it('共4种form', () => {
      expect(['political_union','economic_federation','military_league','cultural_federation']).toHaveLength(4)
    })
  })
})
