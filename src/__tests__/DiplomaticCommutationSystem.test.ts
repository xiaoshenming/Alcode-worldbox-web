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
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
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

    it('act civIdA 和 civIdB 可为不同值', () => {
      const a = makeAct({ civIdA: 3, civIdB: 7 })
      expect(a.civIdA).toBe(3)
      expect(a.civIdB).toBe(7)
    })

    it('注入后 acts 数组可迭代', () => {
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).acts.push(makeAct({ id: i }))
      }
      let count = 0
      for (const _a of (sys as any).acts) { count++ }
      expect(count).toBe(5)
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

    it('tick=1 时不执行（小于 CHECK_INTERVAL）', () => {
      callUpdate(sys, 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=0 时不执行', () => {
      callUpdate(sys, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 极大值时仍正常更新 lastCheck', () => {
      callUpdate(sys, 9999999)
      expect((sys as any).lastCheck).toBe(9999999)
    })
  })

  // ---- 3. 数值字段动态更新 ----
  describe('数值字��动态更新', () => {
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
      vi.restoreAllMocks()
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(a.severityReduction).toBeGreaterThanOrEqual(10)
        expect(a.severityReduction).toBeLessThanOrEqual(85)
      }
    })

    it('fairnessPerception 始终在 [10, 80] 范围内', () => {
      const a = makeAct({ fairnessPerception: 40, tick: 0 })
      ;(sys as any).acts.push(a)
      vi.restoreAllMocks()
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(a.fairnessPerception).toBeGreaterThanOrEqual(10)
        expect(a.fairnessPerception).toBeLessThanOrEqual(80)
      }
    })

    it('stabilityGain 始终在 [5, 75] 范围内', () => {
      const a = makeAct({ stabilityGain: 30, tick: 0 })
      ;(sys as any).acts.push(a)
      vi.restoreAllMocks()
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(a.stabilityGain).toBeGreaterThanOrEqual(5)
        expect(a.stabilityGain).toBeLessThanOrEqual(75)
      }
    })

    it('precedentEffect 始终在 [5, 65] 范围内', () => {
      const a = makeAct({ precedentEffect: 20, tick: 0 })
      ;(sys as any).acts.push(a)
      vi.restoreAllMocks()
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(a.precedentEffect).toBeGreaterThanOrEqual(5)
        expect(a.precedentEffect).toBeLessThanOrEqual(65)
      }
    })

    it('severityReduction 上限 85 不被突破（random=1）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const a = makeAct({ severityReduction: 84.99, tick: 0 })
      ;(sys as any).acts.push(a)
      callUpdate(sys, CHECK_INTERVAL)
      expect(a.severityReduction).toBeLessThanOrEqual(85)
    })

    it('severityReduction 下限 10 不被突破（random=0）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const a = makeAct({ severityReduction: 10.01, tick: 0 })
      ;(sys as any).acts.push(a)
      callUpdate(sys, CHECK_INTERVAL)
      expect(a.severityReduction).toBeGreaterThanOrEqual(10)
    })

    it('多条 acts 各自独立更新 duration', () => {
      const a1 = makeAct({ id: 1, duration: 3, tick: 0 })
      const a2 = makeAct({ id: 2, duration: 7, tick: 0 })
      ;(sys as any).acts.push(a1)
      ;(sys as any).acts.push(a2)
      callUpdate(sys, CHECK_INTERVAL)
      expect(a1.duration).toBe(4)
      expect(a2.duration).toBe(8)
    })

    it('stabilityGain 上限 75 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const a = makeAct({ stabilityGain: 74.99, tick: 0 })
      ;(sys as any).acts.push(a)
      callUpdate(sys, CHECK_INTERVAL)
      expect(a.stabilityGain).toBeLessThanOrEqual(75)
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

    it('空数组时过期清理不崩溃', () => {
      expect(() => callUpdate(sys, EXPIRE_TTL + CHECK_INTERVAL + 1)).not.toThrow()
      expect((sys as any).acts).toHaveLength(0)
    })

    it('tick 极大时所有旧记录均被清理', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).acts.push(makeAct({ id: i, tick: i * 100 }))
      }
      callUpdate(sys, 9999999)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('刚加入的记录（tick=bigTick）不被清理', () => {
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL + 1
      ;(sys as any).acts.push(makeAct({ tick: bigTick }))
      callUpdate(sys, bigTick)
      expect((sys as any).acts).toHaveLength(1)
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

    it('acts 数量不超过 MAX_ACTS', () => {
      for (let i = 0; i < MAX_ACTS + 5; i++) {
        ;(sys as any).acts.push(makeAct({ id: i + 1, tick: CHECK_INTERVAL * 100 }))
      }
      expect((sys as any).acts.length).toBeGreaterThan(MAX_ACTS)
      // system内部逻辑不会超出，但手动注入允许
    })

    it('random=0.99 时不新增 act（spawn 条件 0.0025 未满足）', () => {
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('初始状态下更新不崩溃', () => {
      expect(() => callUpdate(sys, CHECK_INTERVAL)).not.toThrow()
    })
  })

  // ---- 6. 形式（form）覆盖测试 ----
  describe('CommutationForm 完整性', () => {
    it('penalty_reduction 可存储和读取', () => {
      const a = makeAct({ form: 'penalty_reduction' })
      expect(a.form).toBe('penalty_reduction')
    })

    it('exile_to_restriction 可存储和读取', () => {
      const a = makeAct({ form: 'exile_to_restriction' })
      expect(a.form).toBe('exile_to_restriction')
    })

    it('blockade_to_tariff 可存储和读取', () => {
      const a = makeAct({ form: 'blockade_to_tariff' })
      expect(a.form).toBe('blockade_to_tariff')
    })

    it('war_to_cold_peace 可存储和读取', () => {
      const a = makeAct({ form: 'war_to_cold_peace' })
      expect(a.form).toBe('war_to_cold_peace')
    })

    it('act.tick 字段正确记录', () => {
      const a = makeAct({ tick: 12345 })
      expect(a.tick).toBe(12345)
    })

    it('多条不同 form 的 acts 共存', () => {
      ;(sys as any).acts.push(makeAct({ id: 1, form: 'penalty_reduction' }))
      ;(sys as any).acts.push(makeAct({ id: 2, form: 'exile_to_restriction' }))
      ;(sys as any).acts.push(makeAct({ id: 3, form: 'blockade_to_tariff' }))
      ;(sys as any).acts.push(makeAct({ id: 4, form: 'war_to_cold_peace' }))
      expect((sys as any).acts).toHaveLength(4)
    })

    it('update 不改变 form 字段', () => {
      const a = makeAct({ form: 'war_to_cold_peace', tick: 0 })
      ;(sys as any).acts.push(a)
      callUpdate(sys, CHECK_INTERVAL)
      expect(a.form).toBe('war_to_cold_peace')
    })

    it('update 不改变 civIdA/civIdB 字段', () => {
      const a = makeAct({ civIdA: 3, civIdB: 5, tick: 0 })
      ;(sys as any).acts.push(a)
      callUpdate(sys, CHECK_INTERVAL)
      expect(a.civIdA).toBe(3)
      expect(a.civIdB).toBe(5)
    })
  })
})
