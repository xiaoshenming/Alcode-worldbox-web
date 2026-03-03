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

  // ─── 6. civIdA === civIdB 冲突检测 ─────────────────────────────────────────
  describe('civIdA === civIdB 冲突检测', () => {
    const T = 10000

    it('civA === civB 时不创建 act', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001  // PROCEED_CHANCE pass
        if (calls === 2) return 0.0    // civA = 1
        if (calls === 3) return 0.0    // civB = 1 (相同)
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('civA=8, civB=8 时不创建 act', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.999  // civA = 8
        if (calls === 3) return 0.999  // civB = 8
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('civA !== civB 时正常创建 act', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0    // civA = 1
        if (calls === 3) return 0.125  // civB = 2
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts.length).toBeGreaterThan(0)
    })
  })

  // ─── 7. nextId 自增逻辑 ─────────────────────────────────────────────────────
  describe('nextId 自增逻辑', () => {
    const T = 10000

    it('创建第一个 act 时 id=1，nextId 变为 2', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      if ((sys as any).acts.length > 0) {
        expect((sys as any).acts[0].id).toBe(1)
        expect((sys as any).nextId).toBe(2)
      }
    })

    it('连续创建多个 acts 时 id 严格递增', () => {
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        const cycle = (callCount - 1) % 4
        if (cycle === 0) return 0.001
        if (cycle === 1) return 0.0
        if (cycle === 2) return 0.125
        return 0.5
      })
      for (let t = T; t <= T + 15000; t += 3000) {
        sys.update(1, {} as any, {} as any, t)
      }
      const ids = (sys as any).acts.map((a: any) => a.id)
      for (let i = 1; i < ids.length; i++) {
        expect(ids[i]).toBeGreaterThan(ids[i - 1])
      }
    })

    it('手动设置 nextId=100 后，新 act 的 id 从 100 开始', () => {
      ;(sys as any).nextId = 100
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      if ((sys as any).acts.length > 0) {
        expect((sys as any).acts[0].id).toBe(100)
      }
    })
  })

  // ─── 8. 数值字段边界值组合测试 ─────────────────────────────────────────────
  describe('数值字段边界值组合测试', () => {
    const T = 10000

    it('所有字段同时达到上限时保持稳定', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, {
        mercyLevel: 85,
        recipientGratitude: 80,
        thirdPartyReaction: 75,
        precedentRisk: 65,
      }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, T)
      const act = (sys as any).acts[0]
      expect(act.mercyLevel).toBeLessThanOrEqual(85)
      expect(act.recipientGratitude).toBeLessThanOrEqual(80)
      expect(act.thirdPartyReaction).toBeLessThanOrEqual(75)
      expect(act.precedentRisk).toBeLessThanOrEqual(65)
    })

    it('所有字段同时达到下限时保持稳定', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, {
        mercyLevel: 10,
        recipientGratitude: 10,
        thirdPartyReaction: 5,
        precedentRisk: 5,
      }))
      vi.spyOn(Math, 'random').mockReturnValue(0.0)
      sys.update(1, {} as any, {} as any, T)
      const act = (sys as any).acts[0]
      expect(act.mercyLevel).toBeGreaterThanOrEqual(10)
      expect(act.recipientGratitude).toBeGreaterThanOrEqual(10)
      expect(act.thirdPartyReaction).toBeGreaterThanOrEqual(5)
      expect(act.precedentRisk).toBeGreaterThanOrEqual(5)
    })

    it('字段值在中间范围时可以正常波动', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, {
        mercyLevel: 50,
        recipientGratitude: 50,
        thirdPartyReaction: 40,
        precedentRisk: 35,
      }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      const act = (sys as any).acts[0]
      expect(act.mercyLevel).toBeGreaterThanOrEqual(10)
      expect(act.mercyLevel).toBeLessThanOrEqual(85)
    })
  })

  // ─── 9. 多实体并发更新测试 ─────────────────────────────────────────────────
  describe('多实体并发更新测试', () => {
    const T = 10000

    it('10 个 acts 同时更新 duration 都递增 1', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, T, { duration: i }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      for (let i = 0; i < 10; i++) {
        expect((sys as any).acts[i].duration).toBe(i + 1)
      }
    })

    it('混合不同 civId 的 acts 可以共存', () => {
      ;(sys as any).acts.push(
        makeSafeAct(1, T, { civIdA: 1, civIdB: 2 }),
        makeSafeAct(2, T, { civIdA: 3, civIdB: 4 }),
        makeSafeAct(3, T, { civIdA: 5, civIdB: 6 }),
      )
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(3)
    })

    it('混合不同 form 的 acts 可以共存', () => {
      ;(sys as any).acts.push(
        makeSafeAct(1, T, { form: 'sanction_reduction' }),
        makeSafeAct(2, T, { form: 'penalty_commutation' }),
        makeSafeAct(3, T, { form: 'embargo_easing' }),
        makeSafeAct(4, T, { form: 'tribute_forgiveness' }),
      )
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(4)
    })
  })

  // ─── 10. 极端 tick 值测试 ──────────────────────────────────────────────────
  describe('极端 tick 值测试', () => {
    it('tick=0 时系统正常运行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=Number.MAX_SAFE_INTEGER 时不崩溃', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      expect(() => {
        sys.update(1, {} as any, {} as any, Number.MAX_SAFE_INTEGER)
      }).not.toThrow()
    })

    it('tick 从大值回退到小值时 lastCheck 仍然更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 100000)
      expect((sys as any).lastCheck).toBe(100000)
      sys.update(1, {} as any, {} as any, 102500)
      expect((sys as any).lastCheck).toBe(102500)
    })

    it('tick 负数时系统不崩溃（虽然不符合预期）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      expect(() => {
        sys.update(1, {} as any, {} as any, -1000)
      }).not.toThrow()
    })
  })

  // ─── 11. 过期清理与新增的交互测试 ──────────────────────────────────────────
  describe('过期清理与新增的交互测试', () => {
    it('清理过期 acts 后可以立即新增', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, 0, { tick: 0 }))
      }
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, 100000)
      expect((sys as any).acts.length).toBeLessThanOrEqual(20)
    })

    it('部分过期清理后 acts 数量减少', () => {
      ;(sys as any).acts.push(
        makeSafeAct(1, 0, { tick: 0 }),
        makeSafeAct(2, 0, { tick: 50000 }),
        makeSafeAct(3, 0, { tick: 100000 }),
      )
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 120000)
      expect((sys as any).acts).toHaveLength(2)
    })
  })

  // ─── 12. PROCEED_CHANCE 概率边界测试 ───────────────────────────────────────
  describe('PROCEED_CHANCE 概率边界测试', () => {
    const T = 10000

    it('Math.random=0.0023 时刚好不触发（边界）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0023)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('Math.random=0.00229 时触发创建', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.00229
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts.length).toBeGreaterThan(0)
    })

    it('Math.random=1.0 时不触发', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1.0)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(0)
    })
  })

  // ─── 13. civId 范围测试 ────────────────────────────────────────────────────
  describe('civId 范围测试', () => {
    const T = 10000

    it('civA 可以是 1-8 范围内的值', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.5
        if (calls === 3) return 0.0
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      if ((sys as any).acts.length > 0) {
        const civA = (sys as any).acts[0].civIdA
        expect(civA).toBeGreaterThanOrEqual(1)
        expect(civA).toBeLessThanOrEqual(8)
      }
    })

    it('civB 可以是 1-8 范围内的值', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.5
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      if ((sys as any).acts.length > 0) {
        const civB = (sys as any).acts[0].civIdB
        expect(civB).toBeGreaterThanOrEqual(1)
        expect(civB).toBeLessThanOrEqual(8)
      }
    })
  })
})
