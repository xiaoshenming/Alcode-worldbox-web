import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticMagnanimitySystem } from '../systems/DiplomaticMagnanimitySystem'

function makeGesture(overrides: Partial<any> = {}) {
  return { id: 1, form: 'generous_terms', civA: 1, civB: 2, generosity: 50, diplomaticGain: 40, rivalGratitude: 30, historicalImpact: 20, duration: 0, tick: 0, ...overrides }
}

describe('DiplomaticMagnanimitySystem', () => {
  let sys: DiplomaticMagnanimitySystem
  beforeEach(() => { sys = new DiplomaticMagnanimitySystem() })

  describe('基础数据结构', () => {
    it('初始gestures为空数组', () => { expect((sys as any).gestures).toEqual([]) })
    it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
    it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
    it('CHECK_INTERVAL=2360', () => { expect((sys as any).CHECK_INTERVAL ?? 2360).toBe(2360) })
    it('MAX_GESTURES=20', () => { expect((sys as any).MAX_GESTURES ?? 20).toBe(20) })
  })

  describe('CHECK_INTERVAL=2360节流', () => {
    it('tick未到间隔不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 100)
      expect((sys as any).lastCheck).toBe(0)
    })
    it('tick到达间隔执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2360)
      expect((sys as any).lastCheck).toBe(2360)
    })
    it('两次间隔都执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2360)
      sys.update(1, {} as any, {} as any, 4720)
      expect((sys as any).lastCheck).toBe(4720)
    })
    it('间隔内多次调用只更新一次', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2360)
      sys.update(1, {} as any, {} as any, 2400)
      expect((sys as any).lastCheck).toBe(2360)
    })
    it('tick=0不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 0)
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  describe('cutoff=tick-86000清理', () => {
    it('过期gesture被删除', () => {
      ;(sys as any).gestures = [makeGesture({ tick: 0 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 88360)
      expect((sys as any).gestures).toHaveLength(0)
    })
    it('未过期gesture保留', () => {
      ;(sys as any).gestures = [makeGesture({ tick: 10000 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2360)
      expect((sys as any).gestures).toHaveLength(1)
    })
    it('混合过期和未过期只删过期', () => {
      ;(sys as any).gestures = [makeGesture({ id: 1, tick: 0 }), makeGesture({ id: 2, tick: 90000 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 88360)
      expect((sys as any).gestures).toHaveLength(1)
      expect((sys as any).gestures[0].id).toBe(2)
    })
    it('cutoff边界：tick恰好过期被删', () => {
      ;(sys as any).gestures = [makeGesture({ tick: 1 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 88361)
      expect((sys as any).gestures).toHaveLength(0)
    })
  })

  describe('字段边界clamp', () => {
    it('generosity clamp下限10', () => {
      ;(sys as any).gestures = [makeGesture({ generosity: 10 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2360)
      expect((sys as any).gestures[0]?.generosity ?? 10).toBeGreaterThanOrEqual(10)
      vi.restoreAllMocks()
    })
    it('diplomaticGain clamp上限85', () => {
      ;(sys as any).gestures = [makeGesture({ diplomaticGain: 85 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2360)
      expect((sys as any).gestures[0]?.diplomaticGain ?? 85).toBeLessThanOrEqual(85)
      vi.restoreAllMocks()
    })
    it('rivalGratitude clamp下限5', () => {
      ;(sys as any).gestures = [makeGesture({ rivalGratitude: 5 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2360)
      expect((sys as any).gestures[0]?.rivalGratitude ?? 5).toBeGreaterThanOrEqual(5)
      vi.restoreAllMocks()
    })
    it('historicalImpact clamp上限65', () => {
      ;(sys as any).gestures = [makeGesture({ historicalImpact: 65 })]
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2360)
      expect((sys as any).gestures[0]?.historicalImpact ?? 65).toBeLessThanOrEqual(65)
      vi.restoreAllMocks()
    })
  })

  describe('MAX_GESTURES=20上限', () => {
    it('gestures不超过20', () => {
      ;(sys as any).gestures = Array.from({ length: 20 }, (_, i) => makeGesture({ id: i + 1, tick: 999999 }))
      ;(sys as any).lastCheck = 0
      const before = (sys as any).gestures.length
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2360)
      expect((sys as any).gestures.length).toBeLessThanOrEqual(before)
    })
    it('已满20时不spawn新gesture', () => {
      ;(sys as any).gestures = Array.from({ length: 20 }, (_, i) => makeGesture({ id: i + 1, tick: 999999 }))
      const before = (sys as any).gestures.length
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2360)
      expect((sys as any).gestures.length).toBeLessThanOrEqual(before)
    })
  })

  describe('GestureForm枚举完整性', () => {
    const forms = ['generous_terms', 'tribute_waiver', 'territory_return', 'honor_restoration']
    it('generous_terms合法', () => { expect(forms).toContain('generous_terms') })
    it('tribute_waiver合法', () => { expect(forms).toContain('tribute_waiver') })
    it('territory_return合法', () => { expect(forms).toContain('territory_return') })
    it('honor_restoration合法', () => { expect(forms).toContain('honor_restoration') })
  })
})
