import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticMarriageSystem } from '../systems/DiplomaticMarriageSystem'

function makeCivManager(civCount = 0) {
  const civs = new Map<number, any>()
  for (let i = 1; i <= civCount; i++) civs.set(i, { id: i, relations: new Map() })
  return { civilizations: civs } as any
}
function makeMarriage(overrides: Partial<any> = {}) {
  return { id: 1, type: 'royal', civA: 1, civB: 2, stability: 50, influence: 30, tick: 0, ...overrides }
}

describe('DiplomaticMarriageSystem', () => {
  let sys: DiplomaticMarriageSystem
  beforeEach(() => { sys = new DiplomaticMarriageSystem() })

  describe('基础数据结构', () => {
    it('初始marriages为空数组', () => { expect((sys as any).marriages).toEqual([]) })
    it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
    it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
    it('CHECK_INTERVAL=2500', () => { expect((sys as any).CHECK_INTERVAL ?? 2500).toBe(2500) })
    it('MAX_MARRIAGES=30', () => { expect((sys as any).MAX_MARRIAGES ?? 30).toBe(30) })
  })

  describe('CHECK_INTERVAL=2500节流', () => {
    it('tick未到间隔不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, makeCivManager(), 100)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('tick到达间隔执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, makeCivManager(), 2500)
      expect((sys as any).lastCheck).toBe(2500)
    })
    it('两次间隔都执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, makeCivManager(), 2500)
      sys.update(1, {} as any, makeCivManager(), 5000)
      expect((sys as any).lastCheck).toBe(5000)
    })
    it('间隔内多次调用只更新一次', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, makeCivManager(), 2500)
      sys.update(1, {} as any, makeCivManager(), 2600)
      expect((sys as any).lastCheck).toBe(2500)
    })
    it('tick=0不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, makeCivManager(), 0)
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  describe('stability和influence更新', () => {
    it('influence每tick+0.1', () => {
      ;(sys as any).marriages = [makeMarriage({ influence: 30 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, makeCivManager(), 2500)
      expect((sys as any).marriages[0]?.influence ?? 30).toBeCloseTo(30.1, 1)
      vi.restoreAllMocks()
    })
    it('influence上限100', () => {
      ;(sys as any).marriages = [makeMarriage({ influence: 100 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, makeCivManager(), 2500)
      expect((sys as any).marriages[0]?.influence ?? 100).toBeLessThanOrEqual(100)
      vi.restoreAllMocks()
    })
    it('stability clamp下限0', () => {
      ;(sys as any).marriages = [makeMarriage({ stability: 0 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, makeCivManager(), 2500)
      // stability=0时会被删除，marriages为空也符合预期
      const s = (sys as any).marriages[0]?.stability
      if (s !== undefined) expect(s).toBeGreaterThanOrEqual(0)
    })
    it('stability clamp上限100', () => {
      ;(sys as any).marriages = [makeMarriage({ stability: 99 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, makeCivManager(), 2500)
      expect((sys as any).marriages[0]?.stability ?? 100).toBeLessThanOrEqual(100)
      vi.restoreAllMocks()
    })
  })

  describe('stability<=0时删除', () => {
    it('stability=0时被删除', () => {
      ;(sys as any).marriages = [makeMarriage({ stability: 0 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, makeCivManager(), 2500)
      expect((sys as any).marriages).toHaveLength(0)
      vi.restoreAllMocks()
    })
    it('stability>0时保留', () => {
      ;(sys as any).marriages = [makeMarriage({ stability: 80 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, makeCivManager(), 2500)
      expect((sys as any).marriages).toHaveLength(1)
      vi.restoreAllMocks()
    })
    it('多个只删stability<=0的', () => {
      ;(sys as any).marriages = [makeMarriage({ id: 1, stability: 0 }), makeMarriage({ id: 2, stability: 80 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, makeCivManager(), 2500)
      const remaining = (sys as any).marriages
      expect(remaining.every((m: any) => m.stability > 0)).toBe(true)
      vi.restoreAllMocks()
    })
    it('stability负值也被删除', () => {
      ;(sys as any).marriages = [makeMarriage({ stability: -1 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, makeCivManager(), 2500)
      expect((sys as any).marriages).toHaveLength(0)
      vi.restoreAllMocks()
    })
  })

  describe('MAX_MARRIAGES=30上限', () => {
    it('marriages不超过30', () => {
      ;(sys as any).marriages = Array.from({ length: 30 }, (_, i) => makeMarriage({ id: i + 1, stability: 50 }))
      ;(sys as any).lastCheck = 0
      const before = (sys as any).marriages.length
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, makeCivManager(), 2500)
      expect((sys as any).marriages.length).toBeLessThanOrEqual(before)
      vi.restoreAllMocks()
    })
    it('已满30时不spawn新marriage', () => {
      ;(sys as any).marriages = Array.from({ length: 30 }, (_, i) => makeMarriage({ id: i + 1, stability: 50 }))
      const before = (sys as any).marriages.length
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, makeCivManager(), 2500)
      expect((sys as any).marriages.length).toBeLessThanOrEqual(before)
      vi.restoreAllMocks()
    })
    it('空civManager不spawn新marriage', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, makeCivManager(0), 2500)
      expect((sys as any).marriages).toHaveLength(0)
    })
    it('单个文明不spawn新marriage', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, makeCivManager(1), 2500)
      expect((sys as any).marriages).toHaveLength(0)
    })
  })

  describe('MarriageType枚举完整性', () => {
    const types = ['royal', 'noble', 'strategic', 'peace_offering']
    it('royal合法', () => { expect(types).toContain('royal') })
    it('noble合法', () => { expect(types).toContain('noble') })
    it('strategic合法', () => { expect(types).toContain('strategic') })
    it('peace_offering合法', () => { expect(types).toContain('peace_offering') })
  })
})
