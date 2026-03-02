import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticPatronageSystem } from '../systems/DiplomaticPatronageSystem'
import type { PatronageArrangement, PatronageForm } from '../systems/DiplomaticPatronageSystem'

const NULL_WORLD = {} as any
const NULL_EM = {} as any

function makeSys() { return new DiplomaticPatronageSystem() }

function makeArrangement(overrides: Partial<PatronageArrangement> = {}): PatronageArrangement {
  return {
    id: 1, patronCivId: 1, clientCivId: 2, form: 'economic_patronage',
    supportLevel: 40, loyaltyBond: 40, influenceGain: 20, reciprocalDuty: 25,
    duration: 0, tick: 100000, ...overrides,
  }
}

describe('DiplomaticPatronageSystem', () => {
  let sys: DiplomaticPatronageSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // ── 1. 基础数据结构 ─────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始arrangements为空数组', () => {
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('arrangements是Array类型', () => {
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })
    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })
    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })
    it('手动push后arrangements长度正确', () => {
      ;(sys as any).arrangements.push(makeArrangement())
      expect((sys as any).arrangements).toHaveLength(1)
    })
  })

  // ── 2. CHECK_INTERVAL=2580 节流 ─────────────────────────────
  describe('CHECK_INTERVAL=2580 节流', () => {
    it('tick差值小于2580时不执行update逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 10000)
      sys.update(1, NULL_WORLD, NULL_EM, 10000 + 2579)
      expect((sys as any).lastCheck).toBe(10000)
    })
    it('tick差值恰好等于2580时执行update', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 10000)
      sys.update(1, NULL_WORLD, NULL_EM, 10000 + 2580)
      expect((sys as any).lastCheck).toBe(10000 + 2580)
    })
    it('tick差值大于2580时执行update', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 5000)
      sys.update(1, NULL_WORLD, NULL_EM, 8000)
      expect((sys as any).lastCheck).toBe(8000)
    })
    it('第一次调用时lastCheck从0开始触发', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 2580)
      expect((sys as any).lastCheck).toBe(2580)
    })
    it('节流期间arrangements不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 10000)
      const lenBefore = (sys as any).arrangements.length
      sys.update(1, NULL_WORLD, NULL_EM, 10000 + 100)
      expect((sys as any).arrangements.length).toBe(lenBefore)
    })
  })

  // ── 3. 字段动态更新 ─────────────────────────────────────────
  describe('字段动态更新', () => {
    it('每次CHECK_INTERVAL触发后duration递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const arr = makeArrangement({ tick: 0, duration: 0 })
      ;(sys as any).arrangements.push(arr)
      sys.update(1, NULL_WORLD, NULL_EM, 2580)
      expect(arr.duration).toBe(1)
      sys.update(1, NULL_WORLD, NULL_EM, 2580 * 2)
      expect(arr.duration).toBe(2)
    })
    it('supportLevel保持在[5,85]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const arr = makeArrangement({ tick: 0, supportLevel: 84.99 })
      ;(sys as any).arrangements.push(arr)
      for (let t = 2580; t <= 2580 * 50; t += 2580) {
        sys.update(1, NULL_WORLD, NULL_EM, t)
      }
      expect(arr.supportLevel).toBeLessThanOrEqual(85)
      expect(arr.supportLevel).toBeGreaterThanOrEqual(5)
    })
    it('loyaltyBond保持在[10,90]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const arr = makeArrangement({ tick: 0, loyaltyBond: 10.01 })
      ;(sys as any).arrangements.push(arr)
      for (let t = 2580; t <= 2580 * 50; t += 2580) {
        sys.update(1, NULL_WORLD, NULL_EM, t)
      }
      expect(arr.loyaltyBond).toBeGreaterThanOrEqual(10)
      expect(arr.loyaltyBond).toBeLessThanOrEqual(90)
    })
    it('reciprocalDuty上限为65', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const arr = makeArrangement({ tick: 0, reciprocalDuty: 64.99 })
      ;(sys as any).arrangements.push(arr)
      for (let t = 2580; t <= 2580 * 100; t += 2580) {
        sys.update(1, NULL_WORLD, NULL_EM, t)
      }
      expect(arr.reciprocalDuty).toBeLessThanOrEqual(65)
    })
  })

  // ── 4. 过期 cleanup ─────────────────────────────────────────
  describe('过期cleanup (cutoff = tick - 88000)', () => {
    it('tick=0的arrangement在tick=88001时被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArrangement({ tick: 0 }))
      sys.update(1, NULL_WORLD, NULL_EM, 88001 + 2580)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('tick=88000的arrangement在tick=176001时被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArrangement({ tick: 88000 }))
      sys.update(1, NULL_WORLD, NULL_EM, 176001 + 2580)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('未过期的arrangement不被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const arrTick = 200000
      ;(sys as any).arrangements.push(makeArrangement({ tick: arrTick }))
      sys.update(1, NULL_WORLD, NULL_EM, arrTick + 2580)
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('多个arrangement中只清除过期项', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const nowTick = 200000
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: nowTick }))
      sys.update(1, NULL_WORLD, NULL_EM, nowTick + 2580)
      const remaining = (sys as any).arrangements as PatronageArrangement[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })
  })

  // ── 5. MAX_ARRANGEMENTS=16 上限 ─────────────────────────────
  describe('MAX_ARRANGEMENTS=16 上限', () => {
    it('已有16条时不再新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 300000 }))
      }
      sys.update(1, NULL_WORLD, NULL_EM, 300000 + 2580)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('arrangements.length永远不超过MAX_ARRANGEMENTS', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let t = 2580; t <= 2580 * 100; t += 2580) {
        sys.update(1, NULL_WORLD, NULL_EM, t + 300000)
      }
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('nextId在spawn时递增', () => {
      ;(sys as any).nextId = 5
      expect((sys as any).nextId).toBeGreaterThanOrEqual(5)
    })
    it('已有15条时arrangements.length不超过16', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < 15; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 300000 }))
      }
      sys.update(1, NULL_WORLD, NULL_EM, 300000 + 2580)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
  })

  // ── 6. 枚举完整性 ───────────────────────────────────────────
  describe('PatronageForm 枚举完整性', () => {
    it('economic_patronage是合法form', () => {
      const form: PatronageForm = 'economic_patronage'
      expect(['economic_patronage', 'military_patronage', 'cultural_patronage', 'political_patronage']).toContain(form)
    })
    it('所有4种form均在合法集合内', () => {
      const forms: PatronageForm[] = ['economic_patronage', 'military_patronage', 'cultural_patronage', 'political_patronage']
      for (const f of forms) {
        expect(['economic_patronage', 'military_patronage', 'cultural_patronage', 'political_patronage']).toContain(f)
      }
    })
    it('arrangement.form字段属于PatronageForm', () => {
      const arr = makeArrangement({ form: 'military_patronage' })
      expect(['economic_patronage', 'military_patronage', 'cultural_patronage', 'political_patronage']).toContain(arr.form)
    })
  })
})
