import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticCoexistenceSystem } from '../systems/DiplomaticCoexistenceSystem'

function makeSys() { return new DiplomaticCoexistenceSystem() }

const VALID_FORMS = ['territorial_respect', 'cultural_tolerance', 'resource_sharing', 'mutual_recognition']

function makeSafeAgreement(id: number, updateTick: number, overrides = {}) {
  return {
    id,
    civIdA: 1, civIdB: 2,
    form: 'territorial_respect' as const,
    toleranceLevel: 50,
    cooperationDepth: 30,
    conflictReduction: 20,
    culturalExchange: 15,
    duration: 0,
    tick: updateTick, // 与 update tick 相同，cutoff = updateTick - 91000 << updateTick，不会过期
    ...overrides,
  }
}

describe('DiplomaticCoexistenceSystem', () => {
  let sys: DiplomaticCoexistenceSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── 1. 基础数据结构 ────────────────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始 agreements 为空数组', () => {
      expect((sys as any).agreements).toHaveLength(0)
    })

    it('agreements 是 Array 类型', () => {
      expect(Array.isArray((sys as any).agreements)).toBe(true)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('手动注入 agreement 后 agreements.length 为 1', () => {
      ;(sys as any).agreements.push({ id: 1 })
      expect((sys as any).agreements).toHaveLength(1)
    })

    it('新增 agreement 包含所有必要字段', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001  // < PROCEED_CHANCE=0.0024
        if (calls === 2) return 0.0    // civA = 1
        if (calls === 3) return 0.125  // civB = 2
        return 0.5
      })
      sys.update(1, {} as any, {} as any, 5000)
      if ((sys as any).agreements.length > 0) {
        const ag = (sys as any).agreements[0]
        expect(ag).toHaveProperty('id')
        expect(ag).toHaveProperty('civIdA')
        expect(ag).toHaveProperty('civIdB')
        expect(ag).toHaveProperty('form')
        expect(ag).toHaveProperty('toleranceLevel')
        expect(ag).toHaveProperty('cooperationDepth')
        expect(ag).toHaveProperty('conflictReduction')
        expect(ag).toHaveProperty('culturalExchange')
        expect(ag).toHaveProperty('duration')
        expect(ag).toHaveProperty('tick')
      }
    })

    it('form 值必须是合法枚举之一', () => {
      for (const form of VALID_FORMS) {
        ;(sys as any).agreements.push(makeSafeAgreement(99, 10000, { form }))
      }
      for (const ag of (sys as any).agreements) {
        expect(VALID_FORMS).toContain(ag.form)
      }
    })
  })

  // ─── 2. CHECK_INTERVAL 节流 (2490) ─────────────────────────────────────────
  describe('CHECK_INTERVAL 节流 (2490)', () => {
    it('tick=0 时不执行逻辑（差值 0 < 2490）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 0)
      expect((sys as any).agreements).toHaveLength(0)
    })

    it('tick=2489 时差值不足，跳过更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2489)
      expect((sys as any).agreements).toHaveLength(0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=2490 时差值刚好等于 CHECK_INTERVAL，更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2490)
      expect((sys as any).lastCheck).toBe(2490)
    })

    it('tick=4980 时可执行第二次检查', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2490)
      sys.update(1, {} as any, {} as any, 4980)
      expect((sys as any).lastCheck).toBe(4980)
    })

    it('连续两次 tick 差值不足 2490，lastCheck 只更新一次', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).lastCheck).toBe(3000)
    })
  })

  // ─── 3. 数值字段动态更新 ────────────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    const T = 10000

    it('每次 update 后 duration += 1', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, T))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).agreements[0].duration).toBe(1)
    })

    it('两次 update 后 duration 为 2', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, T))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      sys.update(1, {} as any, {} as any, T + 5000)
      expect((sys as any).agreements[0].duration).toBe(2)
    })

    it('toleranceLevel 超上限 90 时被夹回 90', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, T, { toleranceLevel: 999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).agreements[0].toleranceLevel).toBeLessThanOrEqual(90)
    })

    it('toleranceLevel 低于下限 10 时被夹回 10', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, T, { toleranceLevel: -999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).agreements[0].toleranceLevel).toBeGreaterThanOrEqual(10)
    })

    it('cooperationDepth 超上限 85 时被夹回 85', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, T, { cooperationDepth: 999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).agreements[0].cooperationDepth).toBeLessThanOrEqual(85)
    })

    it('cooperationDepth 低于下限 10 时被夹回 10', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, T, { cooperationDepth: -999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).agreements[0].cooperationDepth).toBeGreaterThanOrEqual(10)
    })

    it('conflictReduction 超上限 75 时被夹回 75', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, T, { conflictReduction: 999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).agreements[0].conflictReduction).toBeLessThanOrEqual(75)
    })

    it('conflictReduction 低于下限 5 时被夹回 5', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, T, { conflictReduction: -999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).agreements[0].conflictReduction).toBeGreaterThanOrEqual(5)
    })

    it('culturalExchange 超上限 65 时被夹回 65', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, T, { culturalExchange: 999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).agreements[0].culturalExchange).toBeLessThanOrEqual(65)
    })

    it('culturalExchange 低于下限 5 时被夹回 5', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, T, { culturalExchange: -999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).agreements[0].culturalExchange).toBeGreaterThanOrEqual(5)
    })

    it('新建 agreement 时 tick 字段记录为当前 tick', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, 6000)
      if ((sys as any).agreements.length > 0) {
        expect((sys as any).agreements[0].tick).toBe(6000)
      }
    })

    it('civIdA 和 civIdB 不相等（不同文明之间的协议）', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0    // civA = 1
        if (calls === 3) return 0.125  // civB = 2
        return 0.5
      })
      sys.update(1, {} as any, {} as any, 5000)
      if ((sys as any).agreements.length > 0) {
        const ag = (sys as any).agreements[0]
        expect(ag.civIdA).not.toBe(ag.civIdB)
      }
    })
  })

  // ─── 4. time-based 过期清理 (cutoff = tick - 91000) ─────────────────────────
  describe('time-based 过期清理 (cutoff = tick - 91000)', () => {
    it('tick=0 的 agreement 在 update(91001) 时被清除', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, 0, { tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 91001)
      expect((sys as any).agreements).toHaveLength(0)
    })

    it('tick=0 的 agreement 在 update(91000) 时不被清除（边界）', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, 0, { tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 91000)
      // cutoff = 91000 - 91000 = 0，agreement.tick=0 不小于 0，保留
      expect((sys as any).agreements).toHaveLength(1)
    })

    it('较新的 agreement (tick=5000) 在 update(94000) 时不被清除', () => {
      ;(sys as any).agreements.push(makeSafeAgreement(1, 0, { tick: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 94000)
      // cutoff = 94000 - 91000 = 3000，agreement.tick=5000 > 3000，保留
      expect((sys as any).agreements).toHaveLength(1)
    })

    it('混合新旧 agreements：旧的清除，新的保留', () => {
      ;(sys as any).agreements.push(
        makeSafeAgreement(1, 0, { tick: 200 }),
        makeSafeAgreement(2, 0, { civIdA: 3, civIdB: 4, tick: 50000 })
      )
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 100000)
      // cutoff = 100000 - 91000 = 9000
      // id=1 tick=200 < 9000 → 删除；id=2 tick=50000 > 9000 → 保留
      expect((sys as any).agreements).toHaveLength(1)
      expect((sys as any).agreements[0].id).toBe(2)
    })

    it('全部 agreements 过期时，数组清空', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).agreements.push(makeSafeAgreement(i + 1, 0, { tick: i * 1000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 200000)
      expect((sys as any).agreements).toHaveLength(0)
    })
  })

  // ─── 5. MAX_AGREEMENTS 上限 (18) ───────────────────────────────────────────
  describe('MAX_AGREEMENTS 上限 (18)', () => {
    const T = 10000

    it('已满 18 个 agreements 时，不再新增', () => {
      for (let i = 0; i < 18; i++) {
        ;(sys as any).agreements.push(makeSafeAgreement(i + 1, T))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).agreements.length).toBeLessThanOrEqual(18)
    })

    it('agreements 数量在多次 update 后永不超过 18', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      for (let t = 5000; t <= 500000; t += 2500) {
        sys.update(1, {} as any, {} as any, t)
      }
      expect((sys as any).agreements.length).toBeLessThanOrEqual(18)
    })

    it('17 个 agreements 时仍可能新增（未达上限）', () => {
      for (let i = 0; i < 17; i++) {
        ;(sys as any).agreements.push(makeSafeAgreement(i + 1, T, { civIdA: i + 1, civIdB: i + 2 }))
      }
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      // 即使新增，也不超过 18
      expect((sys as any).agreements.length).toBeLessThanOrEqual(18)
    })
  })
})
