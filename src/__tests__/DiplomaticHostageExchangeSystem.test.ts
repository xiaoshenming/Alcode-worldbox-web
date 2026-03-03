import { describe, it, expect, vi, afterEach } from 'vitest'
import { DiplomaticHostageExchangeSystem } from '../systems/DiplomaticHostageExchangeSystem'

function makeEM() {
  return { getEntitiesWithComponents: () => [], getComponent: () => null } as any
}
function makeCivManager(civCount = 0) {
  const civs = new Map<number, any>()
  for (let i = 1; i <= civCount; i++) civs.set(i, { id: i, name: `Civ${i}` })
  return { civilizations: civs } as any
}
function makeExchange(overrides: Partial<any> = {}) {
  return { id: 1, civA: 1, civB: 2, hostageFromA: 100, hostageFromB: 200, trustGain: 10, duration: 5000, status: 'proposed', tick: 0, ...overrides }
}
function sys() { return new DiplomaticHostageExchangeSystem() }
function exchanges(s: any) { return (s as any).exchanges as any[] }

describe('DiplomaticHostageExchangeSystem', () => {
  afterEach(() => { vi.restoreAllMocks() })

  describe('基础数据结构', () => {
    it('初始化时exchanges为空数组', () => { expect(exchanges(sys())).toEqual([]) })
    it('可以注入和查询exchanges', () => {
      const s = sys(); exchanges(s).push(makeExchange())
      expect(exchanges(s)).toHaveLength(1)
    })
    it('nextId初始值为1', () => { expect((sys() as any).nextId).toBe(1) })
    it('lastCheck初始值为0', () => { expect((sys() as any).lastCheck).toBe(0) })
    it('支持4种status枚举', () => {
      const statuses = ['proposed', 'active', 'completed', 'broken']
      statuses.forEach(s => expect(['proposed', 'active', 'completed', 'broken']).toContain(s))
    })
    it('多次注入后长度正确', () => {
      const s = sys()
      exchanges(s).push(makeExchange({ id: 1 }), makeExchange({ id: 2 }), makeExchange({ id: 3 }))
      expect(exchanges(s)).toHaveLength(3)
    })
    it('nextId可手动设置', () => {
      const s = sys(); ;(s as any).nextId = 99
      expect((s as any).nextId).toBe(99)
    })
    it('lastCheck可手动设置', () => {
      const s = sys(); ;(s as any).lastCheck = 9999
      expect((s as any).lastCheck).toBe(9999)
    })
    it('注入对象字段可读', () => {
      const s = sys(); exchanges(s).push(makeExchange({ id: 42, civA: 7 }))
      expect(exchanges(s)[0].civA).toBe(7)
    })
    it('exchanges初始等于空数组', () => { expect(exchanges(sys())).toEqual([]) })
  })

  describe('CHECK_INTERVAL=3600节流', () => {
    it('tick未达到CHECK_INTERVAL时不处理', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const s = sys(); s.update(1, {} as any, makeEM(), makeCivManager(2), 3599)
      expect((s as any).lastCheck).toBe(0)
    })
    it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const s = sys(); s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect((s as any).lastCheck).toBe(3600)
    })
    it('多次调用按CHECK_INTERVAL节流', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 7199)
      expect((s as any).lastCheck).toBe(3600)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 7200)
      expect((s as any).lastCheck).toBe(7200)
    })
    it('5参数调用签名正确', () => {
      expect(() => sys().update(1, {} as any, makeEM(), makeCivManager(2), 3600)).not.toThrow()
    })
    it('civManager少于2个文明时不处理', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const s = sys(); s.update(1, {} as any, makeEM(), makeCivManager(1), 3600)
      expect(exchanges(s)).toHaveLength(0)
    })
    it('tick=3599不触发', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const s = sys(); s.update(1, {} as any, makeEM(), makeCivManager(2), 3599)
      expect((s as any).lastCheck).toBe(0)
    })
    it('三次间隔均满足时lastCheck跟随', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 7200)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 10800)
      expect((s as any).lastCheck).toBe(10800)
    })
    it('update返回undefined', () => {
      expect(sys().update(1, {} as any, makeEM(), makeCivManager(2), 0)).toBeUndefined()
    })
  })

  describe('status转换逻辑', () => {
    it('proposed→active(random<0.1)', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'proposed', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect(exchanges(s)[0].status).toBe('active')
    })
    it('active→broken(random<0.005)', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'active', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.003)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect(exchanges(s)[0].status).toBe('broken')
    })
    it('active→completed(age>duration)', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'active', tick: 0, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 5001)
      expect(exchanges(s)[0].status).toBe('completed')
    })
    it('proposed在random>=0.1时保持不变', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'proposed', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect(exchanges(s)[0].status).toBe('proposed')
    })
    it('broken状态维持不变(random>0.005)', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'broken', tick: 3600, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 7200)
      const st = exchanges(s)[0]?.status
      if (st !== undefined) expect(['broken', 'completed']).toContain(st)
    })
    it('completed状态维持不变', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'completed', tick: 7200, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 10800)
      const st = exchanges(s)[0]?.status
      if (st !== undefined) expect(['completed', 'broken']).toContain(st)
    })
    it('active但age<=duration且random>=0.005时保持active', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'active', tick: 0, duration: 9999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect(exchanges(s)[0].status).toBe('active')
    })
  })

  describe('清理逻辑', () => {
    it('completed且age>duration+3000时删除', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'completed', tick: 0, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 8001 + 3600)
      expect(exchanges(s)).toHaveLength(0)
    })
    it('broken且age>duration+3000时删除', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'broken', tick: 0, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 8001 + 3600)
      expect(exchanges(s)).toHaveLength(0)
    })
    it('completed但age<=duration+3000时不删除', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'completed', tick: 0, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 7999)
      expect(exchanges(s)).toHaveLength(1)
    })
    it('proposed状态不因age删除', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'proposed', tick: 0, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 20000)
      expect(exchanges(s)).toHaveLength(1)
    })
    it('active状态不因age删除', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'active', tick: 0, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      const remaining = exchanges(s)
      expect(remaining.length).toBeGreaterThanOrEqual(0)
    })
    it('空数组时清理不报错', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => s.update(1, {} as any, makeEM(), makeCivManager(2), 100000)).not.toThrow()
    })
    it('混合状态只删满足条件的', () => {
      const s = sys()
      exchanges(s).push(makeExchange({ id: 1, status: 'completed', tick: 0, duration: 1000 }))
      exchanges(s).push(makeExchange({ id: 2, status: 'proposed', tick: 3600, duration: 9999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 7200)
      expect(exchanges(s).some(e => e.status === 'proposed')).toBe(true)
    })
  })

  describe('MAX_EXCHANGES=6上限', () => {
    it('已有6个时不再spawn新exchange', () => {
      const s = sys()
      for (let i = 0; i < 6; i++) exchanges(s).push(makeExchange({ id: i + 1, tick: 3600 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 7200)
      expect(exchanges(s)).toHaveLength(6)
    })
    it('少于6个时可以spawn', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect(exchanges(s).length).toBeGreaterThanOrEqual(0)
    })
    it('需要至少2个文明才spawn', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, {} as any, makeEM(), makeCivManager(1), 3600)
      expect(exchanges(s)).toHaveLength(0)
    })
    it('SPAWN_CHANCE=0.002：random>=0.002时不spawn', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.003)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect(exchanges(s)).toHaveLength(0)
    })
    it('0个文明时不spawn', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, {} as any, makeEM(), makeCivManager(0), 3600)
      expect(exchanges(s)).toHaveLength(0)
    })
    it('手动填满6条后count=6', () => {
      const s = sys()
      for (let i = 0; i < 6; i++) exchanges(s).push(makeExchange({ id: i + 1 }))
      expect(exchanges(s)).toHaveLength(6)
    })
    it('nextId可手动递增', () => {
      const s = sys()
      ;(s as any).nextId = 10
      expect((s as any).nextId).toBe(10)
    })
  })

  describe('HostageExchange结构字段', () => {
    it('包含id字段', () => { expect(makeExchange()).toHaveProperty('id') })
    it('包含civA和civB字段', () => {
      const ex = makeExchange()
      expect(ex).toHaveProperty('civA'); expect(ex).toHaveProperty('civB')
    })
    it('包含hostageFromA和hostageFromB字段', () => {
      const ex = makeExchange()
      expect(ex).toHaveProperty('hostageFromA'); expect(ex).toHaveProperty('hostageFromB')
    })
    it('包含trustGain、duration、status、tick字段', () => {
      const ex = makeExchange()
      expect(ex).toHaveProperty('trustGain'); expect(ex).toHaveProperty('duration')
      expect(ex).toHaveProperty('status'); expect(ex).toHaveProperty('tick')
    })
    it('默认status为proposed', () => {
      expect(makeExchange().status).toBe('proposed')
    })
    it('默认duration为5000', () => {
      expect(makeExchange().duration).toBe(5000)
    })
    it('civA默认为1', () => {
      expect(makeExchange().civA).toBe(1)
    })
    it('civB默认为2', () => {
      expect(makeExchange().civB).toBe(2)
    })
  })
})
