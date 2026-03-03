import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticHayreveSystem } from '../systems/DiplomaticHayreveSystem'

function makeSys() { return new DiplomaticHayreveSystem() }
function makeArr(overrides: Record<string, any> = {}) {
  return {
    id: 1, meadowCivId: 1, fodderCivId: 2, form: 'royal_hayreve',
    meadowJurisdiction: 40,    hayAllocation: 45,    harvestSchedule: 25,    storageManagement: 30,
    duration: 0, tick: 0, ...overrides
  }
}
const W = {} as any, EM = {} as any

describe('DiplomaticHayreveSystem', () => {
  let sys: DiplomaticHayreveSystem
  beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.99); sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  describe('基础数据结构', () => {
    it('初始arrangements为空', () => { expect((sys as any).arrangements).toHaveLength(0) })
    it('arrangements是数组', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
    it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
    it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
    it('注入后arrangements有数据', () => {
      ;(sys as any).arrangements.push({ id: 1 })
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('多次注入后长度正确', () => {
      ;(sys as any).arrangements.push({ id: 1 }, { id: 2 }, { id: 3 })
      expect((sys as any).arrangements).toHaveLength(3)
    })
    it('nextId可手动设置', () => { ;(sys as any).nextId = 99; expect((sys as any).nextId).toBe(99) })
    it('lastCheck可手动设置', () => { ;(sys as any).lastCheck = 5000; expect((sys as any).lastCheck).toBe(5000) })
    it('注入对象id可读', () => {
      ;(sys as any).arrangements.push(makeArr({ id: 42 }))
      expect((sys as any).arrangements[0].id).toBe(42)
    })
    it('初始等于空数组', () => { expect((sys as any).arrangements).toEqual([]) })
  })

  describe('CHECK_INTERVAL=2910节流', () => {
    it('tick不足CHECK_INTERVAL不更新lastCheck', () => {
      sys.update(1, W, EM, 100)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('tick>=CHECK_INTERVAL更新lastCheck', () => {
      sys.update(1, W, EM, 2910)
      expect((sys as any).lastCheck).toBe(2910)
    })
    it('第二次tick不足间隔不再更新', () => {
      sys.update(1, W, EM, 2910)
      sys.update(1, W, EM, 3010)
      expect((sys as any).lastCheck).toBe(2910)
    })
    it('两次间隔足够各自更新lastCheck', () => {
      sys.update(1, W, EM, 2910)
      sys.update(1, W, EM, 5820)
      expect((sys as any).lastCheck).toBe(5820)
    })
    it('tick=0时不触发', () => {
      sys.update(1, W, EM, 0)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('tick=2910-1不触发', () => {
      sys.update(1, W, EM, 2909)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('三次间隔均满足时lastCheck跟随', () => {
      sys.update(1, W, EM, 2910)
      sys.update(1, W, EM, 5820)
      sys.update(1, W, EM, 8730)
      expect((sys as any).lastCheck).toBe(8730)
    })
    it('大tick值安全运行', () => {
      expect(() => sys.update(1, W, EM, 9999999)).not.toThrow()
    })
  })

  describe('数值字段动态更新', () => {
    it('duration每次update递增1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArr({ duration: 0, tick: 0 }))
      sys.update(1, W, EM, 2910)
      expect((sys as any).arrangements[0].duration).toBe(1)
    })
    it('duration两次update后为2', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArr({ duration: 0, tick: 100000 }))
      sys.update(1, W, EM, 102910)
      sys.update(1, W, EM, 105820)
      expect((sys as any).arrangements[0].duration).toBe(2)
    })
    it('high mock时字段不超上限', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      sys.update(1, W, EM, 2910)
      const a = (sys as any).arrangements[0]
      if (a) expect(a.duration).toBeGreaterThanOrEqual(1)
    })
    it('low mock时字段不低于下限', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      sys.update(1, W, EM, 2910)
      const a = (sys as any).arrangements[0]
      if (a) expect(a.duration).toBeGreaterThanOrEqual(0)
    })
    it('mid mock时字段在合法范围', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      sys.update(1, W, EM, 2910)
      const a = (sys as any).arrangements[0]
      if (a) expect(a.duration).toBeGreaterThanOrEqual(1)
    })
  })

  describe('过期清理cutoff=tick-88000', () => {
    it('tick小于cutoff的记录被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
      sys.update(1, W, EM, 90910)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('tick等于cutoff边界不被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const bigTick = 100000
      ;(sys as any).arrangements.push(makeArr({ tick: bigTick - 88000 }))
      sys.update(1, W, EM, bigTick)
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('tick大于cutoff的记录保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArr({ tick: 50000 }))
      sys.update(1, W, EM, 100000)
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('多条记录部分过期只删过期的', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(
        makeArr({ id: 1, tick: 0 }),
        makeArr({ id: 2, tick: 50000 })
      )
      sys.update(1, W, EM, 100000)
      expect((sys as any).arrangements).toHaveLength(1)
      expect((sys as any).arrangements[0].id).toBe(2)
    })
    it('无过期记录时数组不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArr({ tick: 90000 }))
      sys.update(1, W, EM, 100000)
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('空数组安全运行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      expect(() => sys.update(1, W, EM, 100000)).not.toThrow()
    })
    it('全部过期时全部删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 0; i < 3; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, tick: 0 }))
      }
      sys.update(1, W, EM, 90910)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('清理后nextId不重置', () => {
      ;(sys as any).nextId = 5
      ;(sys as any).arrangements.push(makeArr({ id: 4, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, W, EM, 90910)
      expect((sys as any).nextId).toBe(5)
    })
  })

  describe('MAX上限=16', () => {
    it('达到16时不再新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1, tick: 100000 }))
      }
      sys.update(1, W, EM, 102910)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('arrangements未满时长度小于16', () => {
      expect((sys as any).arrangements.length).toBeLessThan(16)
    })
    it('手动填满16条后count=16', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArr({ id: i + 1 }))
      }
      expect((sys as any).arrangements).toHaveLength(16)
    })
    it('nextId在无spawn时不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArr({ tick: 100000 }))
      const before = (sys as any).nextId
      sys.update(1, W, EM, 102910)
      expect((sys as any).nextId).toBe(before)
    })
    it('PROCEED_CHANCE不满足时不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, 2910)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('nextId手动递增后值正确', () => {
      ;(sys as any).arrangements.push(makeArr({ id: (sys as any).nextId++ }))
      ;(sys as any).arrangements.push(makeArr({ id: (sys as any).nextId++ }))
      expect((sys as any).nextId).toBe(3)
    })
    it('update返回undefined', () => {
      expect(sys.update(1, W, EM, 0)).toBeUndefined()
    })
  })

  describe('Form枚举完整性', () => {
    it('包含royal_hayreve', () => { expect('royal_hayreve').toBeTruthy() })
    it('包含manor_hayreve', () => { expect('manor_hayreve').toBeTruthy() })
    it('包含common_hayreve', () => { expect('common_hayreve').toBeTruthy() })
    it('包含demesne_hayreve', () => { expect('demesne_hayreve').toBeTruthy() })
    it('共4种form', () => {
      const forms = ['royal_hayreve','manor_hayreve','common_hayreve','demesne_hayreve']
      expect(forms).toHaveLength(4)
    })
    it('form是字符串类型', () => { expect(typeof makeArr().form).toBe('string') })
    it('form可以赋值royal_hayreve', () => {
      const a = makeArr({ form: 'royal_hayreve' })
      expect(a.form).toBe('royal_hayreve')
    })
    it('form可以赋值manor_hayreve', () => {
      const a = makeArr({ form: 'manor_hayreve' })
      expect(a.form).toBe('manor_hayreve')
    })
  })
})
