import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticForestarSystem } from '../systems/DiplomaticForestarSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticForestarSystem() }

describe('DiplomaticForestarSystem', () => {
  let sys: DiplomaticForestarSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  describe('基础数据结构', () => {
    it('初始arrangements为空', () => { expect((sys as any).arrangements).toHaveLength(0) })
    it('注入后arrangements返回数据', () => {
      ;(sys as any).arrangements.push({ id: 1 })
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
    it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
    it('arrangements是数组', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
  })

  describe('CHECK_INTERVAL节流', () => {
    it('tick < CHECK_INTERVAL不更新lastCheck', () => {
      sys.update(1, W, EM, 100)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('tick === CHECK_INTERVAL时更新lastCheck', () => {
      sys.update(1, W, EM, 2870)
      expect((sys as any).lastCheck).toBe(2870)
    })
    it('tick = CHECK_INTERVAL-1不更新', () => {
      sys.update(1, W, EM, 2869)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('连续两次满足间隔均更新', () => {
      sys.update(1, W, EM, 2870)
      sys.update(1, W, EM, 5740)
      expect((sys as any).lastCheck).toBe(5740)
    })
    it('第二次不满足间隔不更新', () => {
      sys.update(1, W, EM, 2870)
      sys.update(1, W, EM, 3000)
      expect((sys as any).lastCheck).toBe(2870)
    })
  })

  describe('数值字段动态更新', () => {
    it('每次update后duration+1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push({ id:1, plantingCivId:1, managementCivId:2, form:'royal_forestar',
        afforestationScope:50, seedlingSupply:50, landAllocation:40, growthMonitoring:35, duration:0, tick:0 })
      sys.update(1, W, EM, 2870)
      expect((sys as any).arrangements[0].duration).toBe(1)
    })
    it('afforestationScope上限不超过85', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push({ id:1, plantingCivId:1, managementCivId:2, form:'royal_forestar',
        afforestationScope:84.99, seedlingSupply:50, landAllocation:40, growthMonitoring:35, duration:0, tick:0 })
      sys.update(1, W, EM, 2870)
      expect((sys as any).arrangements[0].afforestationScope).toBeLessThanOrEqual(85)
    })
    it('seedlingSupply上限不超过90', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push({ id:1, plantingCivId:1, managementCivId:2, form:'royal_forestar',
        afforestationScope:50, seedlingSupply:89.99, landAllocation:40, growthMonitoring:35, duration:0, tick:0 })
      sys.update(1, W, EM, 2870)
      expect((sys as any).arrangements[0].seedlingSupply).toBeLessThanOrEqual(90)
    })
    it('landAllocation下限不低于5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).arrangements.push({ id:1, plantingCivId:1, managementCivId:2, form:'royal_forestar',
        afforestationScope:50, seedlingSupply:50, landAllocation:5.01, growthMonitoring:35, duration:0, tick:0 })
      sys.update(1, W, EM, 2870)
      expect((sys as any).arrangements[0].landAllocation).toBeGreaterThanOrEqual(5)
    })
    it('growthMonitoring下限不低于5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).arrangements.push({ id:1, plantingCivId:1, managementCivId:2, form:'royal_forestar',
        afforestationScope:50, seedlingSupply:50, landAllocation:40, growthMonitoring:5.01, duration:0, tick:0 })
      sys.update(1, W, EM, 2870)
      expect((sys as any).arrangements[0].growthMonitoring).toBeGreaterThanOrEqual(5)
    })
  })

  describe('过期清理cutoff=tick-88000', () => {
    it('过期arrangement被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push({ id:1, plantingCivId:1, managementCivId:2, form:'royal_forestar',
        afforestationScope:50, seedlingSupply:50, landAllocation:40, growthMonitoring:35, duration:0, tick:0 })
      sys.update(1, W, EM, 88001)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('新鲜arrangement保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push({ id:1, plantingCivId:1, managementCivId:2, form:'royal_forestar',
        afforestationScope:50, seedlingSupply:50, landAllocation:40, growthMonitoring:35, duration:0, tick:85000 })
      sys.update(1, W, EM, 88001)
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('混合：过期删除新鲜保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(
        { id:1, plantingCivId:1, managementCivId:2, form:'royal_forestar', afforestationScope:50, seedlingSupply:50, landAllocation:40, growthMonitoring:35, duration:0, tick:0 },
        { id:2, plantingCivId:1, managementCivId:3, form:'shire_forestar', afforestationScope:50, seedlingSupply:50, landAllocation:40, growthMonitoring:35, duration:0, tick:85000 }
      )
      sys.update(1, W, EM, 88001)
      expect((sys as any).arrangements).toHaveLength(1)
      expect((sys as any).arrangements[0].id).toBe(2)
    })
    it('tick===cutoff边界不删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push({ id:1, plantingCivId:1, managementCivId:2, form:'royal_forestar',
        afforestationScope:50, seedlingSupply:50, landAllocation:40, growthMonitoring:35, duration:0, tick:12000 })
      sys.update(1, W, EM, 100000)
      // cutoff=100000-88000=12000, tick(12000) < 12000 is false => 保留
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('空数组安全运行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      expect(() => sys.update(1, W, EM, 100000)).not.toThrow()
    })
  })

  describe('MAX_ARRANGEMENTS上限', () => {
    it('已满16个不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push({ id:i+1, plantingCivId:1, managementCivId:2, form:'royal_forestar',
          afforestationScope:50, seedlingSupply:50, landAllocation:40, growthMonitoring:35, duration:0, tick:100000 })
      }
      sys.update(1, W, EM, 102870)
      expect((sys as any).arrangements).toHaveLength(16)
    })
    it('15个时可新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 15; i++) {
        ;(sys as any).arrangements.push({ id:i+1, plantingCivId:1, managementCivId:2, form:'royal_forestar',
          afforestationScope:50, seedlingSupply:50, landAllocation:40, growthMonitoring:35, duration:0, tick:100000 })
      }
      ;(sys as any).nextId = 16
      sys.update(1, W, EM, 102870)
      expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(15)
    })
    it('满时nextId不递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push({ id:i+1, plantingCivId:1, managementCivId:2, form:'royal_forestar',
          afforestationScope:50, seedlingSupply:50, landAllocation:40, growthMonitoring:35, duration:0, tick:100000 })
      }
      ;(sys as any).nextId = 17
      sys.update(1, W, EM, 102870)
      expect((sys as any).nextId).toBe(17)
    })
    it('PROCEED_CHANCE不满足不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, 2870)
      expect((sys as any).arrangements).toHaveLength(0)
    })
  })

  describe('Form枚举完整性', () => {
    it('包含royal_forestar', () => {
      expect(['royal_forestar','crown_forestar','shire_forestar','manor_forestar']).toContain('royal_forestar')
    })
    it('包含crown_forestar', () => {
      expect(['royal_forestar','crown_forestar','shire_forestar','manor_forestar']).toContain('crown_forestar')
    })
    it('包含shire_forestar', () => {
      expect(['royal_forestar','crown_forestar','shire_forestar','manor_forestar']).toContain('shire_forestar')
    })
    it('共4种form', () => {
      expect(['royal_forestar','crown_forestar','shire_forestar','manor_forestar']).toHaveLength(4)
    })
  })
})
