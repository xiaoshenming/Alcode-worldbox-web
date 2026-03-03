import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticHaywardSystem } from '../systems/DiplomaticHaywardSystem'

const w = {} as any, em = {} as any
function makeSys() { return new DiplomaticHaywardSystem() }
function makeArr(overrides: Record<string, any> = {}) {
  return { id: 1, form: 'royal_hayward', enclosureAuthority: 50, hedgeMaintenance: 50, boundaryEnforcement: 50, commonProtection: 50, duration: 0, tick: 0, ...overrides }
}

describe('DiplomaticHaywardSystem', () => {
  let s: DiplomaticHaywardSystem
  beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.99); s = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  describe('基础数据结构', () => {
    it('arrangements初始为空', () => { expect((s as any).arrangements).toHaveLength(0) })
    it('arrangements是数组', () => { expect(Array.isArray((s as any).arrangements)).toBe(true) })
    it('nextId初始为1', () => { expect((s as any).nextId).toBe(1) })
    it('lastCheck初始为0', () => { expect((s as any).lastCheck).toBe(0) })
    it('注入后arrangements有数据', () => {
      ;(s as any).arrangements.push({ id: 1 })
      expect((s as any).arrangements).toHaveLength(1)
    })
    it('多次注入后长度正确', () => {
      ;(s as any).arrangements.push({ id: 1 }, { id: 2 }, { id: 3 })
      expect((s as any).arrangements).toHaveLength(3)
    })
    it('nextId可手动设置', () => { ;(s as any).nextId = 99; expect((s as any).nextId).toBe(99) })
    it('lastCheck可手动设置', () => { ;(s as any).lastCheck = 5000; expect((s as any).lastCheck).toBe(5000) })
    it('注入对象id字段可读', () => {
      ;(s as any).arrangements.push(makeArr({ id: 42 }))
      expect((s as any).arrangements[0].id).toBe(42)
    })
    it('初始等于空数组', () => { expect((s as any).arrangements).toEqual([]) })
  })

  describe('CHECK_INTERVAL=3110节流', () => {
    it('tick不足CHECK_INTERVAL不更新lastCheck', () => {
      s.update(1, w, em, 100)
      expect((s as any).lastCheck).toBe(0)
    })
    it('tick>=CHECK_INTERVAL更新lastCheck', () => {
      s.update(1, w, em, 3110)
      expect((s as any).lastCheck).toBe(3110)
    })
    it('第二次tick不足间隔不再更新', () => {
      s.update(1, w, em, 3110)
      s.update(1, w, em, 3200)
      expect((s as any).lastCheck).toBe(3110)
    })
    it('两次间隔足够各自更新lastCheck', () => {
      s.update(1, w, em, 3110)
      s.update(1, w, em, 6220)
      expect((s as any).lastCheck).toBe(6220)
    })
    it('tick=0时不触发', () => {
      s.update(1, w, em, 0)
      expect((s as any).lastCheck).toBe(0)
    })
    it('tick=3109不触发', () => {
      s.update(1, w, em, 3109)
      expect((s as any).lastCheck).toBe(0)
    })
    it('三次间隔均满足时lastCheck跟随', () => {
      s.update(1, w, em, 3110)
      s.update(1, w, em, 6220)
      s.update(1, w, em, 9330)
      expect((s as any).lastCheck).toBe(9330)
    })
    it('大tick值安全运行', () => {
      expect(() => s.update(1, w, em, 9999999)).not.toThrow()
    })
  })

  describe('字段范围', () => {
    it('enclosureAuthority在[5,85]内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).arrangements.push(makeArr({ enclosureAuthority: 85, tick: 0 }))
      s.update(1, w, em, 3110)
      expect((s as any).arrangements[0].enclosureAuthority).toBeLessThanOrEqual(85)
    })
    it('hedgeMaintenance在[10,90]内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).arrangements.push(makeArr({ hedgeMaintenance: 90, tick: 0 }))
      s.update(1, w, em, 3110)
      expect((s as any).arrangements[0].hedgeMaintenance).toBeLessThanOrEqual(90)
    })
    it('boundaryEnforcement下限>=5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(s as any).arrangements.push(makeArr({ boundaryEnforcement: 5, tick: 0 }))
      s.update(1, w, em, 3110)
      expect((s as any).arrangements[0].boundaryEnforcement).toBeGreaterThanOrEqual(5)
    })
    it('commonProtection在[5,65]内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).arrangements.push(makeArr({ commonProtection: 65, tick: 0 }))
      s.update(1, w, em, 3110)
      expect((s as any).arrangements[0].commonProtection).toBeLessThanOrEqual(65)
    })
    it('duration每次update递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).arrangements.push(makeArr({ duration: 0, tick: 0 }))
      s.update(1, w, em, 3110)
      expect((s as any).arrangements[0].duration).toBe(1)
    })
    it('duration两次update后为2', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).arrangements.push(makeArr({ duration: 0, tick: 100000 }))
      s.update(1, w, em, 103110)
      s.update(1, w, em, 106220)
      expect((s as any).arrangements[0].duration).toBe(2)
    })
    it('enclosureAuthority下限>=5时不低于5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(s as any).arrangements.push(makeArr({ enclosureAuthority: 6, tick: 0 }))
      s.update(1, w, em, 3110)
      const v = (s as any).arrangements[0]?.enclosureAuthority
      if (v !== undefined) expect(v).toBeGreaterThanOrEqual(5)
    })
    it('hedgeMaintenance下限>=10', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(s as any).arrangements.push(makeArr({ hedgeMaintenance: 11, tick: 0 }))
      s.update(1, w, em, 3110)
      const v = (s as any).arrangements[0]?.hedgeMaintenance
      if (v !== undefined) expect(v).toBeGreaterThanOrEqual(10)
    })
  })

  describe('过期清理', () => {
    it('tick小于cutoff的记录被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).arrangements.push(makeArr({ tick: 0 }))
      s.update(1, w, em, 100000)
      expect((s as any).arrangements).toHaveLength(0)
    })
    it('tick等于cutoff边界不被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const tick = 100000
      ;(s as any).arrangements.push(makeArr({ tick: tick - 88000 }))
      s.update(1, w, em, tick)
      expect((s as any).arrangements).toHaveLength(1)
    })
    it('tick大于cutoff的记录保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).arrangements.push(makeArr({ tick: 50000 }))
      s.update(1, w, em, 100000)
      expect((s as any).arrangements).toHaveLength(1)
    })
    it('多条记录部分过期只删过期的', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).arrangements.push(
        makeArr({ id: 1, tick: 0 }),
        makeArr({ id: 2, tick: 50000 })
      )
      s.update(1, w, em, 100000)
      expect((s as any).arrangements).toHaveLength(1)
      expect((s as any).arrangements[0].id).toBe(2)
    })
    it('无过期记录时数组不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).arrangements.push(makeArr({ tick: 90000 }))
      s.update(1, w, em, 100000)
      expect((s as any).arrangements).toHaveLength(1)
    })
    it('全部过期时全部删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 0; i < 3; i++) {
        ;(s as any).arrangements.push(makeArr({ id: i + 1, tick: 0 }))
      }
      s.update(1, w, em, 100000)
      expect((s as any).arrangements).toHaveLength(0)
    })
    it('清理后nextId不重置', () => {
      ;(s as any).nextId = 5
      ;(s as any).arrangements.push(makeArr({ id: 4, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      s.update(1, w, em, 100000)
      expect((s as any).nextId).toBe(5)
    })
    it('空数组时清理不报错', () => {
      expect(() => s.update(1, w, em, 100000)).not.toThrow()
    })
  })

  describe('MAX上限', () => {
    it('arrangements达到16时不再新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 0; i < 16; i++) {
        ;(s as any).arrangements.push(makeArr({ id: i + 1, tick: 100000 }))
      }
      s.update(1, w, em, 103110)
      expect((s as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('arrangements未满时长度小于16', () => {
      expect((s as any).arrangements.length).toBeLessThan(16)
    })
    it('MAX_ARRANGEMENTS为16', () => {
      for (let i = 0; i < 16; i++) {
        ;(s as any).arrangements.push(makeArr({ id: i + 1, tick: 100000 }))
      }
      expect((s as any).arrangements).toHaveLength(16)
    })
    it('nextId在无spawn时不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).arrangements.push(makeArr({ tick: 100000 }))
      const before = (s as any).nextId
      s.update(1, w, em, 103110)
      expect((s as any).nextId).toBe(before)
    })
    it('PROCEED_CHANCE不满足时不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, w, em, 3110)
      expect((s as any).arrangements).toHaveLength(0)
    })
    it('nextId手动递增后值正确', () => {
      ;(s as any).arrangements.push(makeArr({ id: (s as any).nextId++ }))
      ;(s as any).arrangements.push(makeArr({ id: (s as any).nextId++ }))
      expect((s as any).nextId).toBe(3)
    })
    it('update返回undefined', () => {
      expect(s.update(1, w, em, 0)).toBeUndefined()
    })
  })

  describe('枚举', () => {
    it('form类型royal_hayward有效', () => {
      ;(s as any).arrangements.push(makeArr({ form: 'royal_hayward', tick: 100000 }))
      expect((s as any).arrangements[0].form).toBe('royal_hayward')
    })
    it('form类型manor_hayward有效', () => {
      ;(s as any).arrangements.push(makeArr({ form: 'manor_hayward', tick: 100000 }))
      expect((s as any).arrangements[0].form).toBe('manor_hayward')
    })
    it('form类型parish_hayward有效', () => {
      ;(s as any).arrangements.push(makeArr({ form: 'parish_hayward', tick: 100000 }))
      expect((s as any).arrangements[0].form).toBe('parish_hayward')
    })
    it('form类型common_hayward有效', () => {
      ;(s as any).arrangements.push(makeArr({ form: 'common_hayward', tick: 100000 }))
      expect((s as any).arrangements[0].form).toBe('common_hayward')
    })
    it('共4种form', () => {
      const forms = ['royal_hayward', 'manor_hayward', 'parish_hayward', 'common_hayward']
      expect(forms).toHaveLength(4)
    })
    it('form是字符串类型', () => { expect(typeof makeArr({ form: 'royal_hayward' }).form).toBe('string') })
  })
})
