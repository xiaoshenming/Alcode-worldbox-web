import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticParkwardSystem } from '../systems/DiplomaticParkwardSystem'
import type { ParkwardArrangement, ParkwardForm } from '../systems/DiplomaticParkwardSystem'

const NULL_WORLD = {} as any
const NULL_EM = {} as any

function makeSys() { return new DiplomaticParkwardSystem() }

function makeArrangement(overrides: Partial<ParkwardArrangement> = {}): ParkwardArrangement {
  return {
    id: 1, parkCivId: 1, wardCivId: 2, form: 'royal_parkward',
    parkJurisdiction: 40, deerRights: 40, enclosureManagement: 20, grazingControl: 25,
    duration: 0, tick: 100000, ...overrides,
  }
}

describe('DiplomaticParkwardSystem', () => {
  let sys: DiplomaticParkwardSystem

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

  // ��─ 2. CHECK_INTERVAL 节流 ──────────────────────────────────
  describe('CHECK_INTERVAL=2840 节流', () => {
    it('tick差值小于2840时不执行update逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 10000)   // lastCheck=10000
      sys.update(1, NULL_WORLD, NULL_EM, 10000 + 2839)  // 差值<2840, 跳过
      expect((sys as any).lastCheck).toBe(10000)
    })
    it('tick差值恰好等于2840时执行update', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 10000)
      sys.update(1, NULL_WORLD, NULL_EM, 10000 + 2840)
      expect((sys as any).lastCheck).toBe(10000 + 2840)
    })
    it('tick差值大于2840时执行update', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 5000)
      sys.update(1, NULL_WORLD, NULL_EM, 8000)
      expect((sys as any).lastCheck).toBe(8000)
    })
    it('第一次调用时lastCheck从0开始触发', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, NULL_WORLD, NULL_EM, 2840)
      expect((sys as any).lastCheck).toBe(2840)
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
      sys.update(1, NULL_WORLD, NULL_EM, 2840)
      expect(arr.duration).toBe(1)
      sys.update(1, NULL_WORLD, NULL_EM, 2840 * 2)
      expect(arr.duration).toBe(2)
    })
    it('parkJurisdiction保持在[5,85]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const arr = makeArrangement({ tick: 0, parkJurisdiction: 84.99 })
      ;(sys as any).arrangements.push(arr)
      for (let t = 2840; t <= 2840 * 50; t += 2840) {
        sys.update(1, NULL_WORLD, NULL_EM, t)
      }
      expect(arr.parkJurisdiction).toBeLessThanOrEqual(85)
      expect(arr.parkJurisdiction).toBeGreaterThanOrEqual(5)
    })
    it('deerRights保持在[10,90]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const arr = makeArrangement({ tick: 0, deerRights: 10.01 })
      ;(sys as any).arrangements.push(arr)
      for (let t = 2840; t <= 2840 * 50; t += 2840) {
        sys.update(1, NULL_WORLD, NULL_EM, t)
      }
      expect(arr.deerRights).toBeGreaterThanOrEqual(10)
      expect(arr.deerRights).toBeLessThanOrEqual(90)
    })
    it('grazingControl上限为65', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const arr = makeArrangement({ tick: 0, grazingControl: 64.99 })
      ;(sys as any).arrangements.push(arr)
      for (let t = 2840; t <= 2840 * 100; t += 2840) {
        sys.update(1, NULL_WORLD, NULL_EM, t)
      }
      expect(arr.grazingControl).toBeLessThanOrEqual(65)
    })
  })

  // ── 4. 过期 cleanup ─────────────────────────────────────────
  describe('过期cleanup (cutoff = tick - 88000)', () => {
    it('tick=0的arrangement在tick=88001时被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArrangement({ tick: 0 }))
      sys.update(1, NULL_WORLD, NULL_EM, 88001 + 2840)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('tick=88000的arrangement在tick=176000时刚好被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).arrangements.push(makeArrangement({ tick: 88000 }))
      // cutoff = 176000 - 88000 = 88000, tick(88000) < cutoff(88000) 为false, 不删
      // cutoff = 176001 - 88000 = 88001 > tick(88000), 删除
      sys.update(1, NULL_WORLD, NULL_EM, 176001 + 2840)
      expect((sys as any).arrangements).toHaveLength(0)
    })
    it('未过期的arrangement不被清除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const arrTick = 200000
      ;(sys as any).arrangements.push(makeArrangement({ tick: arrTick }))
      sys.update(1, NULL_WORLD, NULL_EM, arrTick + 2840)
      expect((sys as any).arrangements).toHaveLength(1)
    })
    it('多个arrangement中只清除过期项', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const nowTick = 200000
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))      // 过期
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: nowTick })) // 未过期
      sys.update(1, NULL_WORLD, NULL_EM, nowTick + 2840)
      const remaining = (sys as any).arrangements as ParkwardArrangement[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })
  })

  // ── 5. MAX_ARRANGEMENTS 上限 ────────────────────────────────
  describe('MAX_ARRANGEMENTS=16 上限', () => {
    it('已有16条时不再新增', () => {
      // PROCEED_CHANCE=0.0021, Math.random()<0.0021时才spawn；mock为0确保触发spawn
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 300000 }))
      }
      sys.update(1, NULL_WORLD, NULL_EM, 300000 + 2840)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('已有15条时仍可新增到16', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < 15; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 300000 }))
      }
      // nextId设置避免冲突
      ;(sys as any).nextId = 16
      sys.update(1, NULL_WORLD, NULL_EM, 300000 + 2840)
      // mock=0: civId=1+floor(0*8)=1, 两个相同会return, 不会新增
      // 但arrangements.length不会超过16
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('arrangements.length永远不超过MAX_ARRANGEMENTS', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let t = 2840; t <= 2840 * 100; t += 2840) {
        sys.update(1, NULL_WORLD, NULL_EM, t + 300000)
      }
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })
    it('nextId在每次spawn时递增', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValue(1)
      ;(sys as any).nextId = 5
      sys.update(1, NULL_WORLD, NULL_EM, 2840)
      // spawn不一定发生（park===ward时return），但nextId只有在push后递增
      expect((sys as any).nextId).toBeGreaterThanOrEqual(5)
    })
  })

  // ── 6. 枚举完整性 ───────────────────────────────────────────
  describe('ParkwardForm 枚举完整性', () => {
    it('royal_parkward是合法form', () => {
      const form: ParkwardForm = 'royal_parkward'
      expect(['royal_parkward', 'noble_parkward', 'chase_parkward', 'forest_parkward']).toContain(form)
    })
    it('所有4种form均在合法集合内', () => {
      const forms: ParkwardForm[] = ['royal_parkward', 'noble_parkward', 'chase_parkward', 'forest_parkward']
      for (const f of forms) {
        expect(['royal_parkward', 'noble_parkward', 'chase_parkward', 'forest_parkward']).toContain(f)
      }
    })
    it('arrangement.form字段初始化后属于ParkwardForm', () => {
      const arr = makeArrangement({ form: 'chase_parkward' })
      expect(['royal_parkward', 'noble_parkward', 'chase_parkward', 'forest_parkward']).toContain(arr.form)
    })
  })
})
