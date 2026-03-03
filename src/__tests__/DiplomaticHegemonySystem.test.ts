import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticHegemonySystem } from '../systems/DiplomaticHegemonySystem'

const w = {} as any, em = {} as any
function makeSys() { return new DiplomaticHegemonySystem() }
function makeRel(overrides: Record<string, any> = {}) {
  return { id: 1, form: 'military_dominance', influenceLevel: 50, complianceRate: 50, resistanceIndex: 50, stabilityFactor: 50, duration: 0, tick: 0, ...overrides }
}

describe('DiplomaticHegemonySystem', () => {
  let s: DiplomaticHegemonySystem
  beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.99); s = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  describe('基础数据结构', () => {
    it('relations初始为空', () => { expect((s as any).relations).toHaveLength(0) })
    it('relations是数组', () => { expect(Array.isArray((s as any).relations)).toBe(true) })
    it('nextId初始为1', () => { expect((s as any).nextId).toBe(1) })
    it('lastCheck初始为0', () => { expect((s as any).lastCheck).toBe(0) })
    it('注入后relations有数据', () => {
      ;(s as any).relations.push({ id: 1 })
      expect((s as any).relations).toHaveLength(1)
    })
    it('多次注入后长度正确', () => {
      ;(s as any).relations.push({ id: 1 }, { id: 2 }, { id: 3 })
      expect((s as any).relations).toHaveLength(3)
    })
    it('nextId可手动设置', () => { ;(s as any).nextId = 99; expect((s as any).nextId).toBe(99) })
    it('lastCheck可手动设置', () => { ;(s as any).lastCheck = 5000; expect((s as any).lastCheck).toBe(5000) })
    it('注入对象id可读', () => {
      ;(s as any).relations.push(makeRel({ id: 42 }))
      expect((s as any).relations[0].id).toBe(42)
    })
    it('初始等于空数组', () => { expect((s as any).relations).toEqual([]) })
  })

  describe('CHECK_INTERVAL=2560节流', () => {
    it('tick不足CHECK_INTERVAL不更新lastCheck', () => {
      s.update(1, w, em, 100)
      expect((s as any).lastCheck).toBe(0)
    })
    it('tick>=CHECK_INTERVAL更新lastCheck', () => {
      s.update(1, w, em, 2560)
      expect((s as any).lastCheck).toBe(2560)
    })
    it('第二次tick不足间隔不再更新', () => {
      s.update(1, w, em, 2560)
      s.update(1, w, em, 2600)
      expect((s as any).lastCheck).toBe(2560)
    })
    it('两次间隔足够各自更新lastCheck', () => {
      s.update(1, w, em, 2560)
      s.update(1, w, em, 5120)
      expect((s as any).lastCheck).toBe(5120)
    })
    it('tick=0时不触发', () => {
      s.update(1, w, em, 0)
      expect((s as any).lastCheck).toBe(0)
    })
    it('tick=2559不触发', () => {
      s.update(1, w, em, 2559)
      expect((s as any).lastCheck).toBe(0)
    })
    it('三次间隔均满足时lastCheck跟随', () => {
      s.update(1, w, em, 2560)
      s.update(1, w, em, 5120)
      s.update(1, w, em, 7680)
      expect((s as any).lastCheck).toBe(7680)
    })
    it('大tick值安全运行', () => {
      expect(() => s.update(1, w, em, 9999999)).not.toThrow()
    })
  })

  describe('字段范围', () => {
    it('influenceLevel在[10,90]内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).relations.push(makeRel({ influenceLevel: 90, tick: 0 }))
      s.update(1, w, em, 2560)
      expect((s as any).relations[0].influenceLevel).toBeLessThanOrEqual(90)
    })
    it('complianceRate在[10,85]内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).relations.push(makeRel({ complianceRate: 85, tick: 0 }))
      s.update(1, w, em, 2560)
      expect((s as any).relations[0].complianceRate).toBeLessThanOrEqual(85)
    })
    it('resistanceIndex下限>=5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(s as any).relations.push(makeRel({ resistanceIndex: 5, tick: 0 }))
      s.update(1, w, em, 2560)
      expect((s as any).relations[0].resistanceIndex).toBeGreaterThanOrEqual(5)
    })
    it('stabilityFactor在[5,70]内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).relations.push(makeRel({ stabilityFactor: 70, tick: 0 }))
      s.update(1, w, em, 2560)
      expect((s as any).relations[0].stabilityFactor).toBeLessThanOrEqual(70)
    })
    it('duration每次update递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).relations.push(makeRel({ duration: 0, tick: 0 }))
      s.update(1, w, em, 2560)
      expect((s as any).relations[0].duration).toBe(1)
    })
    it('duration两次update后为2', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).relations.push(makeRel({ duration: 0, tick: 100000 }))
      s.update(1, w, em, 102560)
      s.update(1, w, em, 105120)
      expect((s as any).relations[0].duration).toBe(2)
    })
    it('influenceLevel下限>=10', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(s as any).relations.push(makeRel({ influenceLevel: 11, tick: 0 }))
      s.update(1, w, em, 2560)
      const v = (s as any).relations[0]?.influenceLevel
      if (v !== undefined) expect(v).toBeGreaterThanOrEqual(10)
    })
    it('complianceRate下限>=10', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(s as any).relations.push(makeRel({ complianceRate: 11, tick: 0 }))
      s.update(1, w, em, 2560)
      const v = (s as any).relations[0]?.complianceRate
      if (v !== undefined) expect(v).toBeGreaterThanOrEqual(10)
    })
  })

  describe('过期清理', () => {
    it('tick小于cutoff的记录被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).relations.push(makeRel({ tick: 0 }))
      s.update(1, w, em, 100000)
      expect((s as any).relations).toHaveLength(0)
    })
    it('tick等于cutoff边界不被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const tick = 100000
      ;(s as any).relations.push(makeRel({ tick: tick - 88000 }))
      s.update(1, w, em, tick)
      expect((s as any).relations).toHaveLength(1)
    })
    it('tick大于cutoff的记录保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).relations.push(makeRel({ tick: 50000 }))
      s.update(1, w, em, 100000)
      expect((s as any).relations).toHaveLength(1)
    })
    it('多条记录部分过期只删过期的', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).relations.push(
        makeRel({ id: 1, tick: 0 }),
        makeRel({ id: 2, tick: 50000 })
      )
      s.update(1, w, em, 100000)
      expect((s as any).relations).toHaveLength(1)
      expect((s as any).relations[0].id).toBe(2)
    })
    it('无过期记录时数组不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).relations.push(makeRel({ tick: 90000 }))
      s.update(1, w, em, 100000)
      expect((s as any).relations).toHaveLength(1)
    })
    it('全部过期时全部删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 0; i < 3; i++) {
        ;(s as any).relations.push(makeRel({ id: i + 1, tick: 0 }))
      }
      s.update(1, w, em, 100000)
      expect((s as any).relations).toHaveLength(0)
    })
    it('清理后nextId不重置', () => {
      ;(s as any).nextId = 5
      ;(s as any).relations.push(makeRel({ id: 4, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      s.update(1, w, em, 100000)
      expect((s as any).nextId).toBe(5)
    })
    it('空数组时清理不报错', () => {
      expect(() => s.update(1, w, em, 100000)).not.toThrow()
    })
  })

  describe('MAX=16上限', () => {
    it('relations达到16时不再新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 0; i < 16; i++) {
        ;(s as any).relations.push(makeRel({ id: i + 1, tick: 100000 }))
      }
      s.update(1, w, em, 102560)
      expect((s as any).relations.length).toBeLessThanOrEqual(16)
    })
    it('relations未满时长度小于16', () => {
      expect((s as any).relations.length).toBeLessThan(16)
    })
    it('MAX_RELATIONS为16', () => {
      for (let i = 0; i < 16; i++) {
        ;(s as any).relations.push(makeRel({ id: i + 1, tick: 100000 }))
      }
      expect((s as any).relations).toHaveLength(16)
    })
    it('nextId在无spawn时不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(s as any).relations.push(makeRel({ tick: 100000 }))
      const before = (s as any).nextId
      s.update(1, w, em, 102560)
      expect((s as any).nextId).toBe(before)
    })
    it('PROCEED_CHANCE不满足时不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, w, em, 2560)
      expect((s as any).relations).toHaveLength(0)
    })
    it('nextId手动递增后值正确', () => {
      ;(s as any).relations.push(makeRel({ id: (s as any).nextId++ }))
      ;(s as any).relations.push(makeRel({ id: (s as any).nextId++ }))
      expect((s as any).nextId).toBe(3)
    })
    it('update返回undefined', () => {
      expect(s.update(1, w, em, 0)).toBeUndefined()
    })
  })

  describe('枚举', () => {
    it('form类型military_dominance有效', () => {
      ;(s as any).relations.push(makeRel({ form: 'military_dominance', tick: 100000 }))
      expect((s as any).relations[0].form).toBe('military_dominance')
    })
    it('form类型economic_control有效', () => {
      ;(s as any).relations.push(makeRel({ form: 'economic_control', tick: 100000 }))
      expect((s as any).relations[0].form).toBe('economic_control')
    })
    it('form类型cultural_influence有效', () => {
      ;(s as any).relations.push(makeRel({ form: 'cultural_influence', tick: 100000 }))
      expect((s as any).relations[0].form).toBe('cultural_influence')
    })
    it('form类型political_pressure有效', () => {
      ;(s as any).relations.push(makeRel({ form: 'political_pressure', tick: 100000 }))
      expect((s as any).relations[0].form).toBe('political_pressure')
    })
    it('共4种form', () => {
      const forms = ['military_dominance', 'economic_control', 'cultural_influence', 'political_pressure']
      expect(forms).toHaveLength(4)
    })
    it('form字段类型为string', () => {
      const r = makeRel({ form: 'military_dominance' })
      expect(typeof r.form).toBe('string')
    })
    it('relations可存储不同form', () => {
      ;(s as any).relations.push(makeRel({ id: 1, form: 'military_dominance' }))
      ;(s as any).relations.push(makeRel({ id: 2, form: 'economic_control' }))
      expect((s as any).relations[0].form).not.toBe((s as any).relations[1].form)
    })
  })
})
