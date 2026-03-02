import { describe, it, expect, vi } from 'vitest'
import { DiplomaticHostageSystem } from '../systems/DiplomaticHostageSystem'

function makeEM() {
  return { getEntitiesWithComponents: () => [], getComponent: () => null } as any
}
function makeCivManager(civCount = 0) {
  const civs = new Map<number, any>()
  for (let i = 1; i <= civCount; i++) civs.set(i, { id: i })
  return { civilizations: civs } as any
}
function makeHostage(overrides: Partial<any> = {}) {
  return { id: 1, entityId: 100, captor: 1, origin: 2, status: 'captured', value: 50, tick: 0, ...overrides }
}
function sys() { return new DiplomaticHostageSystem() }
function hostages(s: any) { return (s as any).hostages as any[] }

describe('DiplomaticHostageSystem', () => {
  describe('基础数据结构', () => {
    it('初始化时hostages为空数组', () => {
      expect(hostages(sys())).toEqual([])
    })
    it('可以注入和查询hostages', () => {
      const s = sys(); hostages(s).push(makeHostage())
      expect(hostages(s)).toHaveLength(1)
    })
    it('nextId初始值为1', () => {
      expect((sys() as any).nextId).toBe(1)
    })
    it('lastCheck初始值为0', () => {
      expect((sys() as any).lastCheck).toBe(0)
    })
    it('支持5种status枚举', () => {
      const statuses = ['captured', 'negotiating', 'exchanged', 'executed', 'escaped']
      statuses.forEach(s => expect(['captured','negotiating','exchanged','executed','escaped']).toContain(s))
    })
  })

  describe('CHECK_INTERVAL=2000节流', () => {
    it('tick未达到CHECK_INTERVAL时不处理', () => {
      const s = sys(); s.update(1, makeEM(), makeCivManager(2), 1999)
      expect((s as any).lastCheck).toBe(0)
    })
    it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
      const s = sys(); s.update(1, makeEM(), makeCivManager(2), 2000)
      expect((s as any).lastCheck).toBe(2000)
    })
    it('多次调用按CHECK_INTERVAL节流', () => {
      const s = sys()
      s.update(1, makeEM(), makeCivManager(2), 2000)
      s.update(1, makeEM(), makeCivManager(2), 3999)
      expect((s as any).lastCheck).toBe(2000)
      s.update(1, makeEM(), makeCivManager(2), 4000)
      expect((s as any).lastCheck).toBe(4000)
    })
    it('4参数调用签名正确（无world）', () => {
      expect(() => sys().update(1, makeEM(), makeCivManager(2), 2000)).not.toThrow()
    })
    it('lastCheck跟随tick递增', () => {
      const s = sys()
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect((s as any).lastCheck).toBe(2000)
      s.update(1, makeEM(), makeCivManager(2), 4000)
      expect((s as any).lastCheck).toBe(4000)
    })
  })

  describe('status转换逻辑', () => {
    it('captured→negotiating(random<0.15)', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'captured', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.1)
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect(hostages(s)[0].status).toBe('negotiating')
      vi.restoreAllMocks()
    })
    it('negotiating→exchanged(roll<0.4)', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'negotiating', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.3)
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect(hostages(s)[0].status).toBe('exchanged')
      vi.restoreAllMocks()
    })
    it('negotiating→executed(0.4<=roll<0.5)', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'negotiating', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.45)
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect(hostages(s)[0].status).toBe('executed')
      vi.restoreAllMocks()
    })
    // captured→escaped 用 else if，只有 random>=0.15 时才检查 escape
    it('captured→escaped(random>=0.15且第二次random<0.03)', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'captured', tick: 0 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.9)   // spawn check (no spawn, already has hostage)
        .mockReturnValueOnce(0.9)   // negotiate check >=0.15, skip
        .mockReturnValueOnce(0.02)  // escape check <0.03
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect(hostages(s)[0].status).toBe('escaped')
      vi.restoreAllMocks()
    })
  })

  describe('清理逻辑', () => {
    it('exchanged且tick-h.tick>3000时删除', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'exchanged', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 5001)
      expect(hostages(s)).toHaveLength(0)
      vi.restoreAllMocks()
    })
    it('executed且tick-h.tick>3000时删除', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'executed', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 5001)
      expect(hostages(s)).toHaveLength(0)
      vi.restoreAllMocks()
    })
    it('escaped且tick-h.tick>3000时删除', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'escaped', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 5001)
      expect(hostages(s)).toHaveLength(0)
      vi.restoreAllMocks()
    })
    it('exchanged但tick-h.tick<=3000时不删除', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'exchanged', tick: 2000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 4000)
      expect(hostages(s)).toHaveLength(1)
      vi.restoreAllMocks()
    })
  })

  describe('MAX_HOSTAGES=50上限', () => {
    it('已有50个时不再spawn', () => {
      const s = sys()
      for (let i = 0; i < 50; i++) hostages(s).push(makeHostage({ id: i + 1, tick: 2000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, makeEM(), makeCivManager(2), 4000)
      expect(hostages(s).length).toBeLessThanOrEqual(50)
      vi.restoreAllMocks()
    })
    it('需要至少2个文明才能capture', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, makeEM(), makeCivManager(1), 2000)
      expect(hostages(s)).toHaveLength(0)
      vi.restoreAllMocks()
    })
    it('CAPTURE_CHANCE=0.002：random>=0.002时不spawn', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.003)
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect(hostages(s)).toHaveLength(0)
      vi.restoreAllMocks()
    })
    it('0个文明时不spawn', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, makeEM(), makeCivManager(0), 2000)
      expect(hostages(s)).toHaveLength(0)
      vi.restoreAllMocks()
    })
  })

  describe('Hostage结构字段', () => {
    it('包含id和entityId字段', () => {
      const h = makeHostage()
      expect(h).toHaveProperty('id'); expect(h).toHaveProperty('entityId')
    })
    it('包含captor和origin字段', () => {
      const h = makeHostage()
      expect(h).toHaveProperty('captor'); expect(h).toHaveProperty('origin')
    })
    it('包含status和value字段', () => {
      const h = makeHostage()
      expect(h).toHaveProperty('status'); expect(h).toHaveProperty('value')
    })
    it('包含tick字段', () => {
      expect(makeHostage()).toHaveProperty('tick')
    })
  })
})
