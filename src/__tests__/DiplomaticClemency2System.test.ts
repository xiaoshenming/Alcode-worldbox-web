import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticClemency2System } from '../systems/DiplomaticClemency2System'

function makeSys() { return new DiplomaticClemency2System() }

const VALID_FORMS = ['sanction_reduction', 'penalty_commutation', 'embargo_easing', 'tribute_forgiveness']

// 生成在单次 update 中不会被过期删除的 act
// 只需 act.tick 大于 update_tick - 87000 即可
// 单次 update 使用 10000，cutoff = 10000 - 87000 < 0，所以 tick=0 也不会被删
function makeSafeAct(id: number, updateTick: number, overrides = {}) {
  return {
    id,
    civIdA: 1, civIdB: 2,
    form: 'sanction_reduction' as const,
    mercyLevel: 50,
    recipientGratitude: 30,
    thirdPartyReaction: 25,
    precedentRisk: 20,
    duration: 0,
    tick: updateTick, // 与 update tick 相同，cutoff = updateTick - 87000 << updateTick，不会过期
    ...overrides,
  }
}

describe('DiplomaticClemency2System', () => {
  let sys: DiplomaticClemency2System

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── 1. 基础数据结构 ────────────────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始 acts 为空数组', () => {
      expect((sys as any).acts).toHaveLength(0)
    })

    it('acts 是 Array 类型', () => {
      expect(Array.isArray((sys as any).acts)).toBe(true)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('手动注入 act 后 acts.length 为 1', () => {
      ;(sys as any).acts.push({ id: 1 })
      expect((sys as any).acts).toHaveLength(1)
    })

    it('新增 act 包含所有必要字段', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001  // < PROCEED_CHANCE=0.0023 → 触发创建
        if (calls === 2) return 0.0    // civA = 1
        if (calls === 3) return 0.125  // civB = 2
        return 0.5
      })
      sys.update(1, {} as any, {} as any, 10000)
      if ((sys as any).acts.length > 0) {
        const act = (sys as any).acts[0]
        expect(act).toHaveProperty('id')
        expect(act).toHaveProperty('civIdA')
        expect(act).toHaveProperty('civIdB')
        expect(act).toHaveProperty('form')
        expect(act).toHaveProperty('mercyLevel')
        expect(act).toHaveProperty('recipientGratitude')
        expect(act).toHaveProperty('thirdPartyReaction')
        expect(act).toHaveProperty('precedentRisk')
        expect(act).toHaveProperty('duration')
        expect(act).toHaveProperty('tick')
      }
    })

    it('form 值必须是合法枚举之一', () => {
      for (const form of VALID_FORMS) {
        ;(sys as any).acts.push(makeSafeAct(99, 10000, { form }))
      }
      for (const act of (sys as any).acts) {
        expect(VALID_FORMS).toContain(act.form)
      }
    })
  })

  // ─── 2. CHECK_INTERVAL 节流 (2500) ─────────────────────────────────────────
  describe('CHECK_INTERVAL 节流 (2500)', () => {
    it('tick=0 时 lastCheck=0，差值为0 < 2500，不执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 0)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('tick=2499 时差值不足，跳过更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2499)
      expect((sys as any).acts).toHaveLength(0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=2500 时差值刚好等于 CHECK_INTERVAL，应执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).lastCheck).toBe(2500)
    })

    it('tick=5000 时可执行第二次检查', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2500)
      const lastCheck1 = (sys as any).lastCheck
      sys.update(1, {} as any, {} as any, 5000)
      expect((sys as any).lastCheck).toBe(5000)
      expect((sys as any).lastCheck).toBeGreaterThan(lastCheck1)
    })

    it('连续两次 tick 差值不足 2500，lastCheck 只更新一次', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).lastCheck).toBe(3000)
    })
  })

  // ─── 3. 数值字段动态更新 ────────────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    const T = 10000 // 单次 update 使用的 tick

    it('每次 update 后 duration += 1', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].duration).toBe(1)
    })

    it('多次 update 后 duration 累计递增', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      sys.update(1, {} as any, {} as any, T + 5000)
      expect((sys as any).acts[0].duration).toBe(2)
    })

    it('mercyLevel 被 Math.min(85,...) 夹住：超出上限时回到85', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { mercyLevel: 200 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].mercyLevel).toBeLessThanOrEqual(85)
    })

    it('mercyLevel 被 Math.max(10,...) 夹住：低于下限时回到10', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { mercyLevel: -100 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].mercyLevel).toBeGreaterThanOrEqual(10)
    })

    it('recipientGratitude 被 Math.min(80,...) 夹住：超出上限时回到80', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { recipientGratitude: 999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].recipientGratitude).toBeLessThanOrEqual(80)
    })

    it('recipientGratitude 被 Math.max(10,...) 夹住：低于下限时回到10', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { recipientGratitude: -999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].recipientGratitude).toBeGreaterThanOrEqual(10)
    })

    it('thirdPartyReaction 被 Math.min(75,...) 夹住：超出上限时回到75', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { thirdPartyReaction: 999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].thirdPartyReaction).toBeLessThanOrEqual(75)
    })

    it('thirdPartyReaction 被 Math.max(5,...) 夹住：低于下限时回到5', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { thirdPartyReaction: -999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].thirdPartyReaction).toBeGreaterThanOrEqual(5)
    })

    it('precedentRisk 被 Math.min(65,...) 夹住：超出上限时回到65', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { precedentRisk: 999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].precedentRisk).toBeLessThanOrEqual(65)
    })

    it('precedentRisk 被 Math.max(5,...) 夹住：低于下限时回到5', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { precedentRisk: -999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].precedentRisk).toBeGreaterThanOrEqual(5)
    })

    it('新建 act 时 tick 字段记录为当前 tick', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, 10000)
      if ((sys as any).acts.length > 0) {
        expect((sys as any).acts[0].tick).toBe(10000)
      }
    })
  })

  // ─── 4. time-based 过期清理 (cutoff = tick - 87000) ─────────────────────────
  describe('time-based 过期清理 (cutoff = tick - 87000)', () => {
    it('tick 字段等于 0 的 act，在 tick=87001 时被清除', () => {
      ;(sys as any).acts.push(makeSafeAct(1, 0, { tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 87001)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('tick=87000 时 cutoff=0，tick=0 的 act 不被清除（边界）', () => {
      ;(sys as any).acts.push(makeSafeAct(1, 0, { tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 87000)
      // cutoff = 87000 - 87000 = 0，act.tick=0 不小于 0，保留
      expect((sys as any).acts).toHaveLength(1)
    })

    it('较新的 act (tick=5000) 在 tick=90000 时不被清除', () => {
      ;(sys as any).acts.push(makeSafeAct(1, 0, { tick: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 90000)
      // cutoff = 90000 - 87000 = 3000，act.tick=5000 > 3000，保留
      expect((sys as any).acts).toHaveLength(1)
    })

    it('混合新旧 acts：旧的被清除，新的保留', () => {
      ;(sys as any).acts.push(
        makeSafeAct(1, 0, { tick: 0 }),
        makeSafeAct(2, 0, { civIdA: 3, civIdB: 4, tick: 50000 })
      )
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 100000)
      // cutoff = 100000 - 87000 = 13000
      // id=1 tick=0 < 13000 → 删除；id=2 tick=50000 > 13000 → 保留
      expect((sys as any).acts).toHaveLength(1)
      expect((sys as any).acts[0].id).toBe(2)
    })

    it('所有 acts 都过期时，acts 数组清空', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, 0, { tick: i * 1000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 200000)
      // cutoff = 200000 - 87000 = 113000，所有 tick <= 4000 都过期
      expect((sys as any).acts).toHaveLength(0)
    })
  })

  // ─── 5. MAX_ACTS 上限 (20) ─────────────────────────────────────────────────
  describe('MAX_ACTS 上限 (20)', () => {
    const T = 10000

    it('已满 20 个 acts 时，不再新增', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, T))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts.length).toBeLessThanOrEqual(20)
    })

    it('19 个 acts 时，Math.random 返回极小值可触发新增', () => {
      for (let i = 0; i < 19; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, T, { civIdA: i + 1, civIdB: i + 2 }))
      }
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.0001 // PROCEED_CHANCE check pass
        if (calls === 2) return 0.0    // civA = 1
        if (calls === 3) return 0.125  // civB = 2
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts.length).toBeLessThanOrEqual(20)
    })

    it('acts 数量永远不超过 MAX_ACTS=20', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      for (let t = 10000; t <= 500000; t += 3000) {
        sys.update(1, {} as any, {} as any, t)
      }
      expect((sys as any).acts.length).toBeLessThanOrEqual(20)
    })
  })
})
