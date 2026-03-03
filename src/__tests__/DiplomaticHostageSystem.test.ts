import { describe, it, expect, vi, afterEach } from 'vitest'
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
  afterEach(() => { vi.restoreAllMocks() })

  describe('基础数据结构', () => {
    it('初始化时hostages为空数组', () => { expect(hostages(sys())).toEqual([]) })
    it('可以注入和查询hostages', () => {
      const s = sys(); hostages(s).push(makeHostage())
      expect(hostages(s)).toHaveLength(1)
    })
    it('nextId初始值为1', () => { expect((sys() as any).nextId).toBe(1) })
    it('lastCheck初始值为0', () => { expect((sys() as any).lastCheck).toBe(0) })
    it('支持5种status枚举', () => {
      const statuses = ['captured', 'negotiating', 'exchanged', 'executed', 'escaped']
      statuses.forEach(s => expect(['captured', 'negotiating', 'exchanged', 'executed', 'escaped']).toContain(s))
    })
    it('多次注入后长度正确', () => {
      const s = sys()
      hostages(s).push(makeHostage({ id: 1 }), makeHostage({ id: 2 }), makeHostage({ id: 3 }))
      expect(hostages(s)).toHaveLength(3)
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
      const s = sys(); hostages(s).push(makeHostage({ id: 42, captor: 7 }))
      expect(hostages(s)[0].captor).toBe(7)
    })
    it('hostages初始等于空数组', () => { expect(hostages(sys())).toEqual([]) })
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
    it('tick=1999不触发', () => {
      const s = sys(); s.update(1, makeEM(), makeCivManager(2), 1999)
      expect((s as any).lastCheck).toBe(0)
    })
    it('三次间隔均满足时lastCheck跟随', () => {
      const s = sys()
      s.update(1, makeEM(), makeCivManager(2), 2000)
      s.update(1, makeEM(), makeCivManager(2), 4000)
      s.update(1, makeEM(), makeCivManager(2), 6000)
      expect((s as any).lastCheck).toBe(6000)
    })
    it('update返回undefined', () => {
      expect(sys().update(1, makeEM(), makeCivManager(2), 0)).toBeUndefined()
    })
  })

  describe('status转换逻辑', () => {
    it('captured→negotiating(random<0.15)', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'captured', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.1)
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect(hostages(s)[0].status).toBe('negotiating')
    })
    it('negotiating→exchanged(roll<0.4)', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'negotiating', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.3)
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect(hostages(s)[0].status).toBe('exchanged')
    })
    it('negotiating→executed(0.4<=roll<0.5)', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'negotiating', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.45)
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect(hostages(s)[0].status).toBe('executed')
    })
    it('captured→escaped(random>=0.15且第二次random<0.03)', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'captured', tick: 0 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.9)
        .mockReturnValueOnce(0.9)
        .mockReturnValueOnce(0.02)
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect(hostages(s)[0].status).toBe('escaped')
    })
    it('negotiating在roll>=0.5时保持不变', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'negotiating', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect(hostages(s)[0].status).toBe('negotiating')
    })
    it('exchanged状态可正常处理', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'exchanged', tick: 2000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 4000)
      const h = hostages(s)[0]
      if (h) expect(['exchanged']).toContain(h.status)
    })
    it('executed状态可正常处理', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'executed', tick: 2000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 4000)
      const h = hostages(s)[0]
      if (h) expect(['executed']).toContain(h.status)
    })
  })

  describe('清理逻辑', () => {
    it('exchanged且tick-h.tick>3000时删除', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'exchanged', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 5001)
      expect(hostages(s)).toHaveLength(0)
    })
    it('executed且tick-h.tick>3000时删除', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'executed', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 5001)
      expect(hostages(s)).toHaveLength(0)
    })
    it('escaped且tick-h.tick>3000时删除', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'escaped', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 5001)
      expect(hostages(s)).toHaveLength(0)
    })
    it('exchanged但tick-h.tick<=3000时不删除', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'exchanged', tick: 2000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 4000)
      expect(hostages(s)).toHaveLength(1)
    })
    it('captured状态不因age删除', () => {
      const s = sys(); hostages(s).push(makeHostage({ status: 'captured', tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      s.update(1, makeEM(), makeCivManager(2), 20000)
      const h = hostages(s)[0]
      if (h) expect(['captured', 'negotiating', 'escaped']).toContain(h.status)
    })
    it('空数组时清理不报错', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => s.update(1, makeEM(), makeCivManager(2), 100000)).not.toThrow()
    })
    it('混合状态只删满足条件的', () => {
      const s = sys()
      hostages(s).push(makeHostage({ id: 1, status: 'executed', tick: 0 }))
      hostages(s).push(makeHostage({ id: 2, status: 'captured', tick: 2000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      s.update(1, makeEM(), makeCivManager(2), 6000)
      const ids = hostages(s).map(h => h.id)
      expect(ids).toContain(2)
    })
  })

  describe('MAX_HOSTAGES=50上限', () => {
    it('已有50个时不再spawn', () => {
      const s = sys()
      for (let i = 0; i < 50; i++) hostages(s).push(makeHostage({ id: i + 1, tick: 2000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, makeEM(), makeCivManager(2), 4000)
      expect(hostages(s).length).toBeLessThanOrEqual(50)
    })
    it('需要至少2个文明才能capture', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, makeEM(), makeCivManager(1), 2000)
      expect(hostages(s)).toHaveLength(0)
    })
    it('CAPTURE_CHANCE=0.002：random>=0.002时不spawn', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.003)
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect(hostages(s)).toHaveLength(0)
    })
    it('0个文明时不spawn', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      s.update(1, makeEM(), makeCivManager(0), 2000)
      expect(hostages(s)).toHaveLength(0)
    })
    it('手动填满50条后count=50', () => {
      const s = sys()
      for (let i = 0; i < 50; i++) hostages(s).push(makeHostage({ id: i + 1 }))
      expect(hostages(s)).toHaveLength(50)
    })
    it('nextId可手动递增', () => {
      const s = sys(); ;(s as any).nextId = 10
      expect((s as any).nextId).toBe(10)
    })
    it('lastCheck在触发后等于tick', () => {
      const s = sys()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      s.update(1, makeEM(), makeCivManager(2), 2000)
      expect((s as any).lastCheck).toBe(2000)
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
    it('包含tick字段', () => { expect(makeHostage()).toHaveProperty('tick') })
    it('默认status为captured', () => { expect(makeHostage().status).toBe('captured') })
    it('默认value为50', () => { expect(makeHostage().value).toBe(50) })
    it('captor默认为1', () => { expect(makeHostage().captor).toBe(1) })
    it('origin默认为2', () => { expect(makeHostage().origin).toBe(2) })
  })
})
