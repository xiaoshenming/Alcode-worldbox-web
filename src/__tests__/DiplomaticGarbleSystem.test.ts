import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticGarbleSystem, GarblerForm, GarblerArrangement } from '../systems/DiplomaticGarbleSystem'

function makeSys() { return new DiplomaticGarbleSystem() }

function makeArr(overrides: Partial<GarblerArrangement> = {}): GarblerArrangement {
  return { id: 1, spiceCivId: 1, inspectionCivId: 2, form: 'royal_garbler',
    spiceInspection: 50, purityStandards: 50, adulterationDetection: 40, tradeCompliance: 30,
    duration: 0, tick: 100000, ...overrides }
}

describe('DiplomaticGarbleSystem', () => {
  let sys: DiplomaticGarbleSystem
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
    it('tick差值小于3060时跳过更新，lastCheck不变', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 13059)
      expect((sys as any).lastCheck).toBe(10000)
    })
    it('tick差值等于3060时触发更新，lastCheck更新', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 13060)
      expect((sys as any).lastCheck).toBe(13060)
    })
    it('tick差值大于3060时触发更新，lastCheck更新为当前tick', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 50000)
      expect((sys as any).lastCheck).toBe(50000)
    })
    it('连续在interval内调用，lastCheck只在第一次触发时更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).lastCheck).toBe(3100)
      sys.update(1, {} as any, {} as any, 4000)
      expect((sys as any).lastCheck).toBe(3100)
    })
    it('两次足够间隔的update均触发，lastCheck两次均更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).lastCheck).toBe(3100)
      sys.update(1, {} as any, {} as any, 6200)
      expect((sys as any).lastCheck).toBe(6200)
    })
  })

  describe('数值字段动态更新', () => {
    it('每次update后duration递增1', () => {
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].duration).toBe(1)
    })
    it('多次update后duration持续累加', () => {
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3100)
      sys.update(1, {} as any, {} as any, 6200)
      sys.update(1, {} as any, {} as any, 9300)
      expect((sys as any).arrangements[0].duration).toBe(3)
    })
    it('spiceInspection不低于最小值5', () => {
      ;(sys as any).arrangements.push(makeArr({ spiceInspection: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].spiceInspection).toBeGreaterThanOrEqual(5)
    })
    it('spiceInspection不超过最大值85', () => {
      ;(sys as any).arrangements.push(makeArr({ spiceInspection: 84.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].spiceInspection).toBeLessThanOrEqual(85)
    })
    it('purityStandards不低于最小值10', () => {
      ;(sys as any).arrangements.push(makeArr({ purityStandards: 10.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].purityStandards).toBeGreaterThanOrEqual(10)
    })
    it('purityStandards不超过最大值90', () => {
      ;(sys as any).arrangements.push(makeArr({ purityStandards: 89.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].purityStandards).toBeLessThanOrEqual(90)
    })
    it('adulterationDetection不低于最小值5', () => {
      ;(sys as any).arrangements.push(makeArr({ adulterationDetection: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].adulterationDetection).toBeGreaterThanOrEqual(5)
    })
    it('tradeCompliance不超过最大值65', () => {
      ;(sys as any).arrangements.push(makeArr({ tradeCompliance: 64.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].tradeCompliance).toBeLessThanOrEqual(65)
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
      const ids = (sys as any).arrangements.map((a: GarblerArrangement) => a.id)
      expect(ids).toContain(2)
      expect(ids).not.toContain(1)
      expect(ids).not.toContain(3)
    })
    it('无过期记录时arrangements长度不变', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 5000 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 6000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements).toHaveLength(2)
    })
  })

  describe('MAX_ARRANGEMENTS=16上限', () => {
    it('arrangements达到16时不新增', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, spiceCivId: i + 1, inspectionCivId: i + 20, tick: 500000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, {} as any, {} as any, 503100)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('arrangements未达16时random触发可新增', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, spiceCivId: i + 1, inspectionCivId: i + 20, tick: 500000 }))
      }
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 503100)
      expect((sys as any).arrangements.length).toBeGreaterThan(10)
    })
    it('nextId在新增时递增', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).nextId).toBeGreaterThanOrEqual(2)
    })
    it('新增记录的form字段是合法GarblerForm', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3100)
      const validForms: GarblerForm[] = ['royal_garbler', 'guild_garbler', 'market_garbler', 'port_garbler']
      if ((sys as any).arrangements.length > 0) {
        expect(validForms).toContain((sys as any).arrangements[0].form)
      }
    })
  })

  describe('Form枚举完整性', () => {
    it('royal_garbler可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'royal_garbler' }))
      expect((sys as any).arrangements[0].form).toBe('royal_garbler')
    })
    it('guild_garbler可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'guild_garbler' }))
      expect((sys as any).arrangements[0].form).toBe('guild_garbler')
    })
    it('market_garbler可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'market_garbler' }))
      expect((sys as any).arrangements[0].form).toBe('market_garbler')
    })
    it('port_garbler可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'port_garbler' }))
      expect((sys as any).arrangements[0].form).toBe('port_garbler')
    })
  })

  describe('边界条件测试', () => {
    it('adulterationDetection不超过最大值80', () => {
      ;(sys as any).arrangements.push(makeArr({ adulterationDetection: 79.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].adulterationDetection).toBeLessThanOrEqual(80)
    })
    it('tradeCompliance不低于最小值5', () => {
      ;(sys as any).arrangements.push(makeArr({ tradeCompliance: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].tradeCompliance).toBeGreaterThanOrEqual(5)
    })
    it('spiceInspection在边界值5时保持稳定', () => {
      ;(sys as any).arrangements.push(makeArr({ spiceInspection: 5, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].spiceInspection).toBe(5)
    })
    it('purityStandards在边界值90时保持稳定', () => {
      ;(sys as any).arrangements.push(makeArr({ purityStandards: 90, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].purityStandards).toBe(90)
    })
    it('tick差值刚好3059时不触发更新', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 13059)
      expect((sys as any).lastCheck).toBe(10000)
    })
    it('tick差值刚好3061时触发更新', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 13061)
      expect((sys as any).lastCheck).toBe(13061)
    })
  })

  describe('多实体交互测试', () => {
    it('多个arrangements同时更新duration', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 3, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].duration).toBe(1)
      expect((sys as any).arrangements[1].duration).toBe(1)
      expect((sys as any).arrangements[2].duration).toBe(1)
    })
    it('多个arrangements各自独立更新数值字段', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, spiceInspection: 20, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, spiceInspection: 70, tick: 0 }))
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].spiceInspection).not.toBe(20)
      expect((sys as any).arrangements[1].spiceInspection).not.toBe(70)
    })
    it('部分arrangements过期清理后剩余的继续更新', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0, duration: 5 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 150000, duration: 10 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 200000)
      expect((sys as any).arrangements).toHaveLength(1)
      expect((sys as any).arrangements[0].duration).toBe(11)
    })
    it('15个arrangements时可新增第16个', () => {
      for (let i = 0; i < 15; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, spiceCivId: i + 1, inspectionCivId: i + 20, tick: 500000 }))
      }
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 503100)
      expect((sys as any).arrangements.length).toBe(16)
    })
  })

  describe('状态转换测试', () => {
    it('spiceInspection从中间值向上漂移', () => {
      ;(sys as any).arrangements.push(makeArr({ spiceInspection: 50, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].spiceInspection).toBeGreaterThan(50)
    })
    it('spiceInspection从中间值向下漂移', () => {
      ;(sys as any).arrangements.push(makeArr({ spiceInspection: 50, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.1)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].spiceInspection).toBeLessThan(50)
    })
    it('purityStandards从低值逐步增长', () => {
      ;(sys as any).arrangements.push(makeArr({ purityStandards: 15, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.8)
      const before = (sys as any).arrangements[0].purityStandards
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].purityStandards).toBeGreaterThan(before)
    })
    it('adulterationDetection从高值逐步下降', () => {
      ;(sys as any).arrangements.push(makeArr({ adulterationDetection: 75, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.1)
      const before = (sys as any).arrangements[0].adulterationDetection
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].adulterationDetection).toBeLessThan(before)
    })
    it('tradeCompliance在多次update后保持在范围内', () => {
      ;(sys as any).arrangements.push(makeArr({ tradeCompliance: 30, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      for (let i = 0; i < 10; i++) {
        sys.update(1, {} as any, {} as any, 3100 + i * 3060)
      }
      expect((sys as any).arrangements[0].tradeCompliance).toBeGreaterThanOrEqual(5)
      expect((sys as any).arrangements[0].tradeCompliance).toBeLessThanOrEqual(65)
    })
  })

  describe('极端值测试', () => {
    it('所有数值字段同时处于最小边界', () => {
      ;(sys as any).arrangements.push(makeArr({
        spiceInspection: 5,
        purityStandards: 10,
        adulterationDetection: 5,
        tradeCompliance: 5,
        tick: 0
      }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].spiceInspection).toBe(5)
      expect((sys as any).arrangements[0].purityStandards).toBe(10)
      expect((sys as any).arrangements[0].adulterationDetection).toBe(5)
      expect((sys as any).arrangements[0].tradeCompliance).toBe(5)
    })
    it('所有数值字段同时处于最大边界', () => {
      ;(sys as any).arrangements.push(makeArr({
        spiceInspection: 85,
        purityStandards: 90,
        adulterationDetection: 80,
        tradeCompliance: 65,
        tick: 0
      }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].spiceInspection).toBe(85)
      expect((sys as any).arrangements[0].purityStandards).toBe(90)
      expect((sys as any).arrangements[0].adulterationDetection).toBe(80)
      expect((sys as any).arrangements[0].tradeCompliance).toBe(65)
    })
    it('tick为0的记录在tick=88001时被清理', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 88001)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('tick为1的记录在tick=88002时被清理', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 88002)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('duration累加到极大值仍正常工作', () => {
      ;(sys as any).arrangements.push(makeArr({ duration: 999999, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements[0].duration).toBe(1000000)
    })
  })

  describe('组合场景测试', () => {
    it('16个过期记录被清理后arrangements为空', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, spiceCivId: i + 1, inspectionCivId: i + 20, tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 200000)
      expect((sys as any).arrangements.length).toBe(0)
    })
    it('相同spiceCivId和inspectionCivId时不新增', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('多次update后nextId持续递增', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3100)
      const id1 = (sys as any).nextId
      sys.update(1, {} as any, {} as any, 6200)
      const id2 = (sys as any).nextId
      expect(id2).toBeGreaterThanOrEqual(id1)
    })
    it('新增记录后duration会递增', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3100)
      if ((sys as any).arrangements.length > 0) {
        const lastArr = (sys as any).arrangements[(sys as any).arrangements.length - 1]
        expect(lastArr.duration).toBe(1)
      }
    })
    it('新增记录的tick字段等于当前tick', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3100)
      if ((sys as any).arrangements.length > 0) {
        const lastArr = (sys as any).arrangements[(sys as any).arrangements.length - 1]
        expect(lastArr.tick).toBe(3100)
      }
    })
    it('新增记录的spiceInspection在20-60范围内', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3100)
      if ((sys as any).arrangements.length > 0) {
        const lastArr = (sys as any).arrangements[(sys as any).arrangements.length - 1]
        expect(lastArr.spiceInspection).toBeGreaterThanOrEqual(20)
        expect(lastArr.spiceInspection).toBeLessThanOrEqual(60)
      }
    })
    it('新增记录的purityStandards在25-60范围内', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3100)
      if ((sys as any).arrangements.length > 0) {
        const lastArr = (sys as any).arrangements[(sys as any).arrangements.length - 1]
        expect(lastArr.purityStandards).toBeGreaterThanOrEqual(25)
        expect(lastArr.purityStandards).toBeLessThanOrEqual(60)
      }
    })
    it('新增记录的adulterationDetection在10-40范围内', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3100)
      if ((sys as any).arrangements.length > 0) {
        const lastArr = (sys as any).arrangements[(sys as any).arrangements.length - 1]
        expect(lastArr.adulterationDetection).toBeGreaterThanOrEqual(10)
        expect(lastArr.adulterationDetection).toBeLessThanOrEqual(40)
      }
    })
    it('新增记录的tradeCompliance在15-40范围内', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3100)
      if ((sys as any).arrangements.length > 0) {
        const lastArr = (sys as any).arrangements[(sys as any).arrangements.length - 1]
        expect(lastArr.tradeCompliance).toBeGreaterThanOrEqual(15)
        expect(lastArr.tradeCompliance).toBeLessThanOrEqual(40)
      }
    })
  })
})
