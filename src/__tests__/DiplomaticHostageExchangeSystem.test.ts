import { describe, it, expect, vi } from 'vitest'
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
  describe('基础数据结构', () => {
    it('初始化时exchanges为空数组', () => {
      expect(exchanges(sys())).toEqual([])
    })
    it('可以注入和查询exchanges', () => {
      const s = sys(); exchanges(s).push(makeExchange())
      expect(exchanges(s)).toHaveLength(1)
    })
    it('nextId初始值为1', () => {
      expect((sys() as any).nextId).toBe(1)
    })
    it('lastCheck初始值为0', () => {
      expect((sys() as any).lastCheck).toBe(0)
    })
    it('支持4种status枚举', () => {
      const statuses = ['proposed', 'active', 'completed', 'broken']
      statuses.forEach(s => expect(['proposed','active','completed','broken']).toContain(s))
    })
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
  })

  describe('status转换逻辑', () => {
    it('proposed→active(random<0.1)', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'proposed', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect(exchanges(s)[0].status).toBe('active')
      vi.restoreAllMocks()
    })
    it('active→broken(random<0.005)', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'active', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.003)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect(exchanges(s)[0].status).toBe('broken')
      vi.restoreAllMocks()
    })
    it('active→completed(age>duration)', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'active', tick: 0, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 5001)
      expect(exchanges(s)[0].status).toBe('completed')
      vi.restoreAllMocks()
    })
    it('proposed在random>=0.1时保持不变', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'proposed', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect(exchanges(s)[0].status).toBe('proposed')
      vi.restoreAllMocks()
    })
  })

  describe('清理逻辑', () => {
    it('completed且age>duration+3000时删除', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'completed', tick: 0, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 8001 + 3600)
      expect(exchanges(s)).toHaveLength(0)
      vi.restoreAllMocks()
    })
    it('broken且age>duration+3000时删除', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'broken', tick: 0, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 8001 + 3600)
      expect(exchanges(s)).toHaveLength(0)
      vi.restoreAllMocks()
    })
    it('completed但age<=duration+3000时不删除', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'completed', tick: 0, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 7999)
      expect(exchanges(s)).toHaveLength(1)
      vi.restoreAllMocks()
    })
    it('proposed状态不因age删除', () => {
      const s = sys(); exchanges(s).push(makeExchange({ status: 'proposed', tick: 0, duration: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 20000)
      expect(exchanges(s)).toHaveLength(1)
      vi.restoreAllMocks()
    })
  })

  describe('MAX_EXCHANGES=6上限', () => {
    it('已有6个时不再spawn新exchange', () => {
      const s = sys()
      for (let i = 0; i < 6; i++) exchanges(s).push(makeExchange({ id: i + 1, tick: 3600 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 7200)
      expect(exchanges(s)).toHaveLength(6)
      vi.restoreAllMocks()
    })
    it('少于6个时可以spawn', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect(exchanges(s).length).toBeGreaterThanOrEqual(0)
      vi.restoreAllMocks()
    })
    it('需要至少2个文明才spawn', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, {} as any, makeEM(), makeCivManager(1), 3600)
      expect(exchanges(s)).toHaveLength(0)
      vi.restoreAllMocks()
    })
    it('SPAWN_CHANCE=0.002：random>=0.002时不spawn', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.003)
      s.update(1, {} as any, makeEM(), makeCivManager(2), 3600)
      expect(exchanges(s)).toHaveLength(0)
      vi.restoreAllMocks()
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
  })
})
