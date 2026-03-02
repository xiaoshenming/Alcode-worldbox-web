import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticCommutationSystem, CommutationAct, CommutationForm } from '../systems/DiplomaticCommutationSystem'

const CHECK_INTERVAL = 2390
const MAX_ACTS = 20
const EXPIRE_TTL = 84000

function makeSys() { return new DiplomaticCommutationSystem() }

function makeAct(overrides: Partial<CommutationAct> = {}): CommutationAct {
  return {
    id: 1, civIdA: 1, civIdB: 2,
    form: 'penalty_reduction',
    severityReduction: 50, fairnessPerception: 40,
    stabilityGain: 30, precedentEffect: 20,
    duration: 0, tick: 10000,
    ...overrides,
  }
}

function callUpdate(sys: DiplomaticCommutationSystem, tick: number) {
  sys.update(1, {} as any, {} as any, tick)
}

describe('DiplomaticCommutationSystem', () => {
  let sys: DiplomaticCommutationSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })
  afterEach(() => { vi.restoreAllMocks() })

  // ---- 1. 基础数据结构 ----
  describe('基础数据结构', () => {
    it('初始 acts 为空数组', () => {
      expect((sys as any).acts).toHaveLength(0)
      expect(Array.isArray((sys as any).acts)).toBe(true)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('直接注入单条 act 后长度为 1', () => {
      ;(sys as any).acts.push(makeAct())
      expect((sys as any).acts).toHaveLength(1)
    })

    it('直接注入多条 act 后长度正确', () => {
      ;(sys as any).acts.push(makeAct({ id: 1 }))
      ;(sys as any).acts.push(makeAct({ id: 2 }))
      ;(sys as any).acts.push(makeAct({ id: 3 }))
      expect((sys as any).acts).toHaveLength(3)
    })

    it('所有 CommutationForm 类型均合法', () => {
      const forms: CommutationForm[] = [
        'penalty_reduction', 'exile_to_restriction',
        'blockade_to_tariff', 'war_to_cold_peace',
      ]
      const a = makeAct()
      for (const f of forms) {
        a.form = f
        expect(a.form).toBe(f)
      }
    })

    it('act 结构包含所有必要字段', () => {
      const a = makeAct()
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('civIdA')
      expect(a).toHaveProperty('civIdB')
      expect(a).toHaveProperty('form')
      expect(a).toHaveProperty('severityReduction')
      expect(a).toHaveProperty('fairnessPerception')
      expect(a).toHaveProperty('stabilityGain')
      expect(a).toHaveProperty('precedentEffect')
      expect(a).toHaveProperty('duration')
      expect(a).toHaveProperty('tick')
    })
  })

  // ---- 2. CHECK_INTERVAL 节流 ----
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 小于 CHECK_INTERVAL 时跳过，lastCheck 不更新', () => {
      callUpdate(sys, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 等于 CHECK_INTERVAL 时执行，lastCheck 更新', () => {
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick 大于 CHECK_INTERVAL 时执行，lastCheck 更新为本次 tick', () => {
      callUpdate(sys, CHECK_INTERVAL + 500)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
    })

    it('连续调用：第二次 tick 未达间隔时 lastCheck 不变', () => {
      callUpdate(sys, CHECK_INTERVAL)
      const prevCheck = (sys as any).lastCheck
      callUpdate(sys, CHECK_INTERVAL + CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(prevCheck)
    })

    it('连续调用：第二次 tick 达到间隔后 lastCheck 更新', () => {
      callUpdate(sys, CHECK_INTERVAL)
      callUpdate(sys, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })
  })

  // ---- 3. 数值字段动态更新 ----
  describe('数值字段动态更新', () => {
    it('每次 update 后 duration 递增 1', () => {
      const a = makeAct({ tick: 0 })
      ;(sys as any).acts.push(a)
      callUpdate(sys, CHECK_INTERVAL)
      expect(a.duration).toBe(1)
    })

    it('多次 update 后 duration 累计递增', () => {
      const a = makeAct({ tick: 0 })
      ;(sys as any).acts.push(a)
      callUpdate(sys, CHECK_INTERVAL)
      callUpdate(sys, CHECK_INTERVAL * 2)
      expect(a.duration).toBe(2)
    })

    it('severityReduction 始终在 [10, 85] 范围内', () => {
      const a = makeAct({ severityReduction: 50, tick: 0 })
      ;(sys as any).acts.push(a)
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(a.severityReduction).toBeGreaterThanOrEqual(10)
        expect(a.severityReduction).toBeLessThanOrEqual(85)
      }
    })

    it('fairnessPerception 始终在 [10, 80] 范围内', () => {
      const a = makeAct({ fairnessPerception: 40, tick: 0 })
      ;(sys as any).acts.push(a)
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(a.fairnessPerception).toBeGreaterThanOrEqual(10)
        expect(a.fairnessPerception).toBeLessThanOrEqual(80)
      }
    })

    it('stabilityGain 始终在 [5, 75] 范围内', () => {
      const a = makeAct({ stabilityGain: 30, tick: 0 })
      ;(sys as any).acts.push(a)
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(a.stabilityGain).toBeGreaterThanOrEqual(5)
        expect(a.stabilityGain).toBeLessThanOrEqual(75)
      }
    })

    it('precedentEffect 始终在 [5, 65] 范围内', () => {
      const a = makeAct({ precedentEffect: 20, tick: 0 })
      ;(sys as any).acts.push(a)
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(a.precedentEffect).toBeGreaterThanOrEqual(5)
        expect(a.precedentEffect).toBeLessThanOrEqual(65)
      }
    })
  })

  // ---- 4. time-based 过期清理 ----
  describe('time-based 过期清理', () => {
    it('tick 早于 cutoff 的记录被删除', () => {
      ;(sys as any).acts.push(makeAct({ tick: 0 }))
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL + 1
      callUpdate(sys, bigTick)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('tick 等于 cutoff 时不删除（仅 < cutoff 才删）', () => {
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL
      const cutoff = bigTick - EXPIRE_TTL
      ;(sys as any).acts.push(makeAct({ tick: cutoff }))
      callUpdate(sys, bigTick)
      expect((sys as any).acts).toHaveLength(1)
    })

    it('tick 晚于 cutoff 的记录保留', () => {
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL
      ;(sys as any).acts.push(makeAct({ tick: bigTick - 1000 }))
      callUpdate(sys, bigTick)
      expect((sys as any).acts).toHaveLength(1)
    })

    it('混合：过期 + 未过期记录，只删过期', () => {
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL + 1
      ;(sys as any).acts.push(makeAct({ id: 1, tick: 0 }))              // 过期
      ;(sys as any).acts.push(makeAct({ id: 2, tick: bigTick - 1000 })) // 未过期
      callUpdate(sys, bigTick)
      const remaining = (sys as any).acts as CommutationAct[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })

    it('全部过期时 acts 清空', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).acts.push(makeAct({ id: i, tick: 0 }))
      }
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL + 1
      callUpdate(sys, bigTick)
      expect((sys as any).acts).toHaveLength(0)
    })
  })

  // ---- 5. MAX 上限 ----
  describe('MAX_ACTS 上限', () => {
    it('达到 MAX_ACTS 时不再新增', () => {
      for (let i = 0; i < MAX_ACTS; i++) {
        ;(sys as any).acts.push(makeAct({ id: i + 1, tick: CHECK_INTERVAL * 100 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).acts).toHaveLength(MAX_ACTS)
    })

    it('低于 MAX_ACTS 且 random=0 时尝试新增逻辑（不崩溃）', () => {
      const values = [0, 0, 0.1]
      let idx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => values[idx++ % values.length])
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).acts.length).toBeGreaterThanOrEqual(0)
    })

    it('nextId 可手动设置并保持', () => {
      ;(sys as any).nextId = 7
      expect((sys as any).nextId).toBe(7)
    })
  })
})
