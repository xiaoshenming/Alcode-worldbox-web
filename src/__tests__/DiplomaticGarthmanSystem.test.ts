import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticGarthmanSystem, GarthmanForm, GarthmanArrangement } from '../systems/DiplomaticGarthmanSystem'

function makeSys() { return new DiplomaticGarthmanSystem() }

function makeArr(overrides: Partial<GarthmanArrangement> = {}): GarthmanArrangement {
  return { id: 1, gardenCivId: 1, yardCivId: 2, form: 'royal_garthman',
    gardenJurisdiction: 50, yardAllocation: 50, cultivationRights: 40, enclosureMaintenance: 30,
    duration: 0, tick: 100000, ...overrides }
}

describe('DiplomaticGarthmanSystem', () => {
  let sys: DiplomaticGarthmanSystem
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
    it('tick差值小于2980时跳过更新，lastCheck不变', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 12979)
      expect((sys as any).lastCheck).toBe(10000)
    })
    it('tick差值等于2980时触发更新，lastCheck更新', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 12980)
      expect((sys as any).lastCheck).toBe(12980)
    })
    it('tick差值大于2980时触发更新，lastCheck更新为当前tick', () => {
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
    it('gardenJurisdiction不低于最小值5', () => {
      ;(sys as any).arrangements.push(makeArr({ gardenJurisdiction: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].gardenJurisdiction).toBeGreaterThanOrEqual(5)
    })
    it('gardenJurisdiction不超过最大值85', () => {
      ;(sys as any).arrangements.push(makeArr({ gardenJurisdiction: 84.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].gardenJurisdiction).toBeLessThanOrEqual(85)
    })
    it('yardAllocation不低于最小值10', () => {
      ;(sys as any).arrangements.push(makeArr({ yardAllocation: 10.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].yardAllocation).toBeGreaterThanOrEqual(10)
    })
    it('yardAllocation不超过最大值90', () => {
      ;(sys as any).arrangements.push(makeArr({ yardAllocation: 89.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].yardAllocation).toBeLessThanOrEqual(90)
    })
    it('cultivationRights不低于最小值5', () => {
      ;(sys as any).arrangements.push(makeArr({ cultivationRights: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].cultivationRights).toBeGreaterThanOrEqual(5)
    })
    it('enclosureMaintenance不超过最大值65', () => {
      ;(sys as any).arrangements.push(makeArr({ enclosureMaintenance: 64.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].enclosureMaintenance).toBeLessThanOrEqual(65)
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
      const ids = (sys as any).arrangements.map((a: GarthmanArrangement) => a.id)
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
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, gardenCivId: i + 1, yardCivId: i + 20, tick: 500000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, {} as any, {} as any, 503000)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('arrangements未达16时random触发可新增', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, gardenCivId: i + 1, yardCivId: i + 20, tick: 500000 }))
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
    it('新增记录的form字段是合法GarthmanForm', () => {
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      const validForms: GarthmanForm[] = ['royal_garthman', 'manor_garthman', 'abbey_garthman', 'borough_garthman']
      if ((sys as any).arrangements.length > 0) {
        expect(validForms).toContain((sys as any).arrangements[0].form)
      }
    })
  })

  describe('Form枚举完整性', () => {
    it('royal_garthman可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'royal_garthman' }))
      expect((sys as any).arrangements[0].form).toBe('royal_garthman')
    })
    it('manor_garthman可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'manor_garthman' }))
      expect((sys as any).arrangements[0].form).toBe('manor_garthman')
    })
    it('abbey_garthman可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'abbey_garthman' }))
      expect((sys as any).arrangements[0].form).toBe('abbey_garthman')
    })
    it('borough_garthman可注入', () => {
      ;(sys as any).arrangements.push(makeArr({ form: 'borough_garthman' }))
      expect((sys as any).arrangements[0].form).toBe('borough_garthman')
    })
  })

  describe('边界值精确测试', () => {
    it('gardenJurisdiction=5时不再下降', () => {
      ;(sys as any).arrangements.push(makeArr({ gardenJurisdiction: 5, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].gardenJurisdiction).toBe(5)
    })
    it('gardenJurisdiction=85时不再上升', () => {
      ;(sys as any).arrangements.push(makeArr({ gardenJurisdiction: 85, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].gardenJurisdiction).toBe(85)
    })
    it('yardAllocation=10时不再下降', () => {
      ;(sys as any).arrangements.push(makeArr({ yardAllocation: 10, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].yardAllocation).toBe(10)
    })
    it('yardAllocation=90时不再上升', () => {
      ;(sys as any).arrangements.push(makeArr({ yardAllocation: 90, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].yardAllocation).toBe(90)
    })
    it('cultivationRights=5时不再下降', () => {
      ;(sys as any).arrangements.push(makeArr({ cultivationRights: 5, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].cultivationRights).toBe(5)
    })
    it('cultivationRights=80时不再上升', () => {
      ;(sys as any).arrangements.push(makeArr({ cultivationRights: 80, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].cultivationRights).toBe(80)
    })
    it('enclosureMaintenance=5时不再下降', () => {
      ;(sys as any).arrangements.push(makeArr({ enclosureMaintenance: 5, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].enclosureMaintenance).toBe(5)
    })
    it('enclosureMaintenance=65时不再上升', () => {
      ;(sys as any).arrangements.push(makeArr({ enclosureMaintenance: 65, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].enclosureMaintenance).toBe(65)
    })
  })

  describe('多实体并发更新', () => {
    it('3个arrangements同时更新duration', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 0 }))
      ;(sys as any).arrangements.push(makeArr({ id: 3, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].duration).toBe(1)
      expect((sys as any).arrangements[1].duration).toBe(1)
      expect((sys as any).arrangements[2].duration).toBe(1)
    })
    it('10个arrangements同时更新，全部保留', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, tick: 5000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 8000)
      expect((sys as any).arrangements).toHaveLength(10)
    })
    it('16个arrangements达到上限后不新增', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, gardenCivId: i + 1, yardCivId: i + 10, tick: 10000 }))
      }
      const m = vi.spyOn(Math, 'random')
      m.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 13000)
      expect((sys as any).arrangements).toHaveLength(16)
    })
  })

  describe('极端tick值测试', () => {
    it('tick=0时lastCheck更新为0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 0)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('tick=1000000时正常处理', () => {
      ;(sys as any).arrangements.push(makeArr({ tick: 950000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 1000000)
      expect((sys as any).lastCheck).toBe(1000000)
    })
    it('cutoff计算：tick=88000时cutoff=0', () => {
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 88000)
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('cutoff计算：tick=88001时tick=0的记录被删除', () => {
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 88001)
      expect((sys as any).arrangements).toHaveLength(0)
    })
  })

  describe('duration累加长期测试', () => {
    it('duration从0累加到10', () => {
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      for (let i = 1; i <= 10; i++) {
        sys.update(1, {} as any, {} as any, i * 3000)
      }
      expect((sys as any).arrangements[0].duration).toBe(10)
    })
    it('duration从0累加到20', () => {
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      for (let i = 1; i <= 20; i++) {
        sys.update(1, {} as any, {} as any, i * 3000)
      }
      expect((sys as any).arrangements[0].duration).toBe(20)
    })
  })

  describe('随机值边界组合', () => {
    it('所有字段同时达到最小值', () => {
      ;(sys as any).arrangements.push(makeArr({
        gardenJurisdiction: 5, yardAllocation: 10,
        cultivationRights: 5, enclosureMaintenance: 5, tick: 0
      }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      const a = (sys as any).arrangements[0]
      expect(a.gardenJurisdiction).toBe(5)
      expect(a.yardAllocation).toBe(10)
      expect(a.cultivationRights).toBe(5)
      expect(a.enclosureMaintenance).toBe(5)
    })
    it('所有字段同时达到最大值', () => {
      ;(sys as any).arrangements.push(makeArr({
        gardenJurisdiction: 85, yardAllocation: 90,
        cultivationRights: 80, enclosureMaintenance: 65, tick: 0
      }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      const a = (sys as any).arrangements[0]
      expect(a.gardenJurisdiction).toBe(85)
      expect(a.yardAllocation).toBe(90)
      expect(a.cultivationRights).toBe(80)
      expect(a.enclosureMaintenance).toBe(65)
    })
  })
})
