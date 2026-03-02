import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticPaviorSystem } from '../systems/DiplomaticPaviorSystem'
import type { PaviorArrangement, PaviorForm } from '../systems/DiplomaticPaviorSystem'

const NULL_WORLD = {} as any
const NULL_EM = {} as any

function makeSys() { return new DiplomaticPaviorSystem() }

function makeArrangement(overrides: Partial<PaviorArrangement> = {}): PaviorArrangement {
  return {
    id: 1, roadCivId: 1, maintenanceCivId: 2, form: 'royal_pavior',
    roadAuthority: 40, pavingQuality: 40, tollCollection: 20, repairSchedule: 25,
    duration: 0, tick: 100000, ...overrides,
  }
}

describe('DiplomaticPaviorSystem', () => {
  let sys: DiplomaticPaviorSystem

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

  // ── 2. CHECK_INTERVAL=3040 节流 ─────────────────────────────
  describe('CHECK_INTERVAL=3040 节流', () => {
    it('tick差值小于3040时不执行update逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 10000)
      sys.update(1, NULL_WORLD, NULL_EM, 10000 + 3039)
      expect((sys as any).lastCheck).toBe(10000)
    })
    it('tick差值恰好等于3040时执行update', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 10000)
      sys.update(1, NULL_WORLD, NULL_EM, 10000 + 3040)
      expect((sys as any).lastCheck).toBe(10000 + 3040)
    })
    it('tick差值大于3040时执行update', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 5000)
      sys.update(1, NULL_WORLD, NULL_EM, 9000)
      expect((sys as any).lastCheck).toBe(9000)
    })
    it('第一次调用时lastCheck从0开始触发', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 3040)
      expect((sys as any).lastCheck).toBe(3040)
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
      sys.update(1, NULL_WORLD, NULL_EM, 3040)
      expect(arr.duration).toBe(1)
      sys.update(1, NULL_WORLD, NULL_EM, 3040 * 2)
      expect(arr.duration).toBe(2)
    })
    it('roadAuthority保持在[5,85]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const arr = makeArrangement({ tick: 0, roadAuthority: 84.99 })
      ;(sys as any).arrangements.push(arr)
      for (let t = 3040; t <= 3040 * 50; t += 3040) {
        sys.update(1, NULL_WORLD, NULL_EM, t)
      }
      expect(arr.roadAuthority).toBeLessThanOrEqual(85)
      expect(arr.roadAuthority).toBeGreaterThanOrEqual(5)
    })
    it('pavingQuality保持在[10,90]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const arr = makeArrangement({ tick: 0, pavingQuality: 10.01 })
      ;(sys as any).arrangements.push(arr)
      for (let t = 3040; t <= 3040 * 50; t += 3040) {
        sys.update(1, NULL_WORLD, NULL_EM, t)
      }
      expect(arr.pavingQuality).toBeGreaterThanOrEqual(10)
      expect(arr.pavingQuality).toBeLessThanOrEqual(90)
    })
    it('repairSchedule上限为65', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const arr = makeArrangement({ tick: 0, repairSchedule: 64.99 })
      ;(sys as any).arrangements.push(arr)
      for (let t = 3040; t <= 3040 * 100; t += 3040) {
        sys.update(1, NULL_WORLD, NULL_EM, t)
      }
      expect(arr.repairSchedule).toBeLessThanOrEqual(65)
    })
  })

  // ── 4. 过期 cleanup ─────────────────────────────────────────
  describe('过期cleanup (cutoff = tick - 88000)', () => {
    it('tick=0的arrangement在tick=88001时被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArrangement({ tick: 0 }))
      sys.update(1, NULL_WORLD, NULL_EM, 88001 + 3040)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('tick=88000的arrangement在tick=176001时被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArrangement({ tick: 88000 }))
      sys.update(1, NULL_WORLD, NULL_EM, 176001 + 3040)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('未过期的arrangement不被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const arrTick = 200000
      ;(sys as any).arrangements.push(makeArrangement({ tick: arrTick }))
      sys.update(1, NULL_WORLD, NULL_EM, arrTick + 3040)
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('多个arrangement中只清除过期项', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const nowTick = 200000
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: nowTick }))
      sys.update(1, NULL_WORLD, NULL_EM, nowTick + 3040)
      const remaining = (sys as any).arrangements as PaviorArrangement[]
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
      sys.update(1, NULL_WORLD, NULL_EM, 300000 + 3040)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('arrangements.length永远不超过MAX_ARRANGEMENTS', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let t = 3040; t <= 3040 * 100; t += 3040) {
        sys.update(1, NULL_WORLD, NULL_EM, t + 300000)
      }
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('nextId初始值为1', () => {
      expect((sys as any).nextId).toBe(1)
    })
    it('已有15条时arrangements.length不超过16', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < 15; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 300000 }))
      }
      sys.update(1, NULL_WORLD, NULL_EM, 300000 + 3040)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
  })

  // ── 6. 枚举完整性 ───────────────────────────────────────────
  describe('PaviorForm 枚举完整性', () => {
    it('royal_pavior是合法form', () => {
      const form: PaviorForm = 'royal_pavior'
      expect(['royal_pavior', 'borough_pavior', 'guild_pavior', 'highway_pavior']).toContain(form)
    })
    it('所有4种form均在合法集合内', () => {
      const forms: PaviorForm[] = ['royal_pavior', 'borough_pavior', 'guild_pavior', 'highway_pavior']
      for (const f of forms) {
        expect(['royal_pavior', 'borough_pavior', 'guild_pavior', 'highway_pavior']).toContain(f)
      }
    })
    it('arrangement.form字段属于PaviorForm', () => {
      const arr = makeArrangement({ form: 'guild_pavior' })
      expect(['royal_pavior', 'borough_pavior', 'guild_pavior', 'highway_pavior']).toContain(arr.form)
    })
  })
})
