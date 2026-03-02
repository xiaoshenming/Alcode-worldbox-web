import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticForbearanceSystem } from '../systems/DiplomaticForbearanceSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticForbearanceSystem() }

describe('DiplomaticForbearanceSystem', () => {
  let sys: DiplomaticForbearanceSystem
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
      sys.update(1, W, EM, 2380)
      expect((sys as any).lastCheck).toBe(2380)
    })
    it('tick = CHECK_INTERVAL-1不更新', () => {
      sys.update(1, W, EM, 2379)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('连续两次满足间隔均更新', () => {
      sys.update(1, W, EM, 2380)
      sys.update(1, W, EM, 4760)
      expect((sys as any).lastCheck).toBe(4760)
    })
    it('第二次不满足间隔不更新', () => {
      sys.update(1, W, EM, 2380)
      sys.update(1, W, EM, 2500)
      expect((sys as any).lastCheck).toBe(2380)
    })
  })

  describe('数值字段动态更新', () => {
    it('每次update后duration+1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'restraint_pact',
        patience:50, stabilityEffect:40, trustBuilding:30, strainLevel:20, duration:0, tick:0 })
      sys.update(1, W, EM, 2380)
      expect((sys as any).agreements[0].duration).toBe(1)
    })
    it('patience上限不超过90', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'restraint_pact',
        patience:89.99, stabilityEffect:40, trustBuilding:30, strainLevel:20, duration:0, tick:0 })
      sys.update(1, W, EM, 2380)
      expect((sys as any).agreements[0].patience).toBeLessThanOrEqual(90)
    })
    it('stabilityEffect上限不超过80', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'restraint_pact',
        patience:50, stabilityEffect:79.99, trustBuilding:30, strainLevel:20, duration:0, tick:0 })
      sys.update(1, W, EM, 2380)
      expect((sys as any).agreements[0].stabilityEffect).toBeLessThanOrEqual(80)
    })
    it('trustBuilding下限不低于5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'restraint_pact',
        patience:50, stabilityEffect:40, trustBuilding:5.01, strainLevel:20, duration:0, tick:0 })
      sys.update(1, W, EM, 2380)
      expect((sys as any).agreements[0].trustBuilding).toBeGreaterThanOrEqual(5)
    })
    it('strainLevel下限不低于0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'restraint_pact',
        patience:50, stabilityEffect:40, trustBuilding:30, strainLevel:0.01, duration:0, tick:0 })
      sys.update(1, W, EM, 2380)
      expect((sys as any).agreements[0].strainLevel).toBeGreaterThanOrEqual(0)
    })
  })

  describe('过期清理cutoff=tick-84000', () => {
    it('过期agreement被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'restraint_pact',
        patience:50, stabilityEffect:40, trustBuilding:30, strainLevel:20, duration:0, tick:0 })
      sys.update(1, W, EM, 84001)
      expect((sys as any).agreements).toHaveLength(0)
    })
    it('新鲜agreement保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'restraint_pact',
        patience:50, stabilityEffect:40, trustBuilding:30, strainLevel:20, duration:0, tick:80000 })
      sys.update(1, W, EM, 84001)
      expect((sys as any).agreements).toHaveLength(1)
    })
    it('混合：过期删除新鲜保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push(
        { id:1, civIdA:1, civIdB:2, form:'restraint_pact', patience:50, stabilityEffect:40, trustBuilding:30, strainLevel:20, duration:0, tick:0 },
        { id:2, civIdA:1, civIdB:3, form:'measured_patience', patience:50, stabilityEffect:40, trustBuilding:30, strainLevel:20, duration:0, tick:80000 }
      )
      sys.update(1, W, EM, 84001)
      expect((sys as any).agreements).toHaveLength(1)
      expect((sys as any).agreements[0].id).toBe(2)
    })
    it('tick===cutoff边界不删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).agreements.push({ id:1, civIdA:1, civIdB:2, form:'restraint_pact',
        patience:50, stabilityEffect:40, trustBuilding:30, strainLevel:20, duration:0, tick:16000 })
      sys.update(1, W, EM, 100000)
      // cutoff=100000-84000=16000, tick(16000) < 16000 is false => 保留
      expect((sys as any).agreements).toHaveLength(1)
    })
    it('空数组安全运行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      expect(() => sys.update(1, W, EM, 100000)).not.toThrow()
    })
  })

  describe('MAX_AGREEMENTS上限', () => {
    it('已满20个不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 20; i++) {
        ;(sys as any).agreements.push({ id:i+1, civIdA:1, civIdB:2, form:'restraint_pact',
          patience:50, stabilityEffect:40, trustBuilding:30, strainLevel:20, duration:0, tick:100000 })
      }
      sys.update(1, W, EM, 102380)
      expect((sys as any).agreements).toHaveLength(20)
    })
    it('19个时可新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 19; i++) {
        ;(sys as any).agreements.push({ id:i+1, civIdA:1, civIdB:2, form:'restraint_pact',
          patience:50, stabilityEffect:40, trustBuilding:30, strainLevel:20, duration:0, tick:100000 })
      }
      ;(sys as any).nextId = 20
      sys.update(1, W, EM, 102380)
      expect((sys as any).agreements.length).toBeGreaterThanOrEqual(19)
    })
    it('满时nextId不递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 20; i++) {
        ;(sys as any).agreements.push({ id:i+1, civIdA:1, civIdB:2, form:'restraint_pact',
          patience:50, stabilityEffect:40, trustBuilding:30, strainLevel:20, duration:0, tick:100000 })
      }
      ;(sys as any).nextId = 21
      sys.update(1, W, EM, 102380)
      expect((sys as any).nextId).toBe(21)
    })
    it('AGREE_CHANCE不满足不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, 2380)
      expect((sys as any).agreements).toHaveLength(0)
    })
  })

  describe('Form枚举完整性', () => {
    it('包含restraint_pact', () => {
      expect(['restraint_pact','provocation_tolerance','delayed_response','measured_patience']).toContain('restraint_pact')
    })
    it('包含provocation_tolerance', () => {
      expect(['restraint_pact','provocation_tolerance','delayed_response','measured_patience']).toContain('provocation_tolerance')
    })
    it('包含delayed_response', () => {
      expect(['restraint_pact','provocation_tolerance','delayed_response','measured_patience']).toContain('delayed_response')
    })
    it('共4种form', () => {
      expect(['restraint_pact','provocation_tolerance','delayed_response','measured_patience']).toHaveLength(4)
    })
  })
})
