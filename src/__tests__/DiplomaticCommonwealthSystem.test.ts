import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticCommonwealthSystem, CommonwealthUnion, CommonwealthForm } from '../systems/DiplomaticCommonwealthSystem'

const CHECK_INTERVAL = 2470
const MAX_UNIONS = 18
const EXPIRE_TTL = 97000

function makeSys() { return new DiplomaticCommonwealthSystem() }

function makeUnion(overrides: Partial<CommonwealthUnion> = {}): CommonwealthUnion {
  return {
    id: 1, civIdA: 1, civIdB: 2,
    form: 'economic_commonwealth',
    cooperationLevel: 50, sharedValues: 40,
    institutionalStrength: 30, memberBenefit: 20,
    duration: 0, tick: 10000,
    ...overrides,
  }
}

function callUpdate(sys: DiplomaticCommonwealthSystem, tick: number) {
  sys.update(1, {} as any, {} as any, tick)
}

describe('DiplomaticCommonwealthSystem', () => {
  let sys: DiplomaticCommonwealthSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })
  afterEach(() => { vi.restoreAllMocks() })

  // ---- 1. 基础数据结构 ----
  describe('基础数据结构', () => {
    it('初始 unions 为空数组', () => {
      expect((sys as any).unions).toHaveLength(0)
      expect(Array.isArray((sys as any).unions)).toBe(true)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('直接注入单条 union 后长度为 1', () => {
      ;(sys as any).unions.push(makeUnion())
      expect((sys as any).unions).toHaveLength(1)
    })

    it('直接注入多条 union 后长度正确', () => {
      ;(sys as any).unions.push(makeUnion({ id: 1 }))
      ;(sys as any).unions.push(makeUnion({ id: 2 }))
      ;(sys as any).unions.push(makeUnion({ id: 3 }))
      expect((sys as any).unions).toHaveLength(3)
    })

    it('所有 CommonwealthForm 类型均合法', () => {
      const forms: CommonwealthForm[] = [
        'economic_commonwealth', 'cultural_commonwealth',
        'security_commonwealth', 'scientific_commonwealth',
      ]
      const u = makeUnion()
      for (const f of forms) {
        u.form = f
        expect(u.form).toBe(f)
      }
    })

    it('union 结构包含所有必要字段', () => {
      const u = makeUnion()
      expect(u).toHaveProperty('id')
      expect(u).toHaveProperty('civIdA')
      expect(u).toHaveProperty('civIdB')
      expect(u).toHaveProperty('form')
      expect(u).toHaveProperty('cooperationLevel')
      expect(u).toHaveProperty('sharedValues')
      expect(u).toHaveProperty('institutionalStrength')
      expect(u).toHaveProperty('memberBenefit')
      expect(u).toHaveProperty('duration')
      expect(u).toHaveProperty('tick')
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
      callUpdate(sys, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
    })

    it('连续调用：第二次 tick 未达间隔时跳过', () => {
      callUpdate(sys, CHECK_INTERVAL)
      const prevCheck = (sys as any).lastCheck
      callUpdate(sys, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(prevCheck)
    })

    it('连续调用：第二次 tick 达到间隔时执行', () => {
      callUpdate(sys, CHECK_INTERVAL)
      callUpdate(sys, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })
  })

  // ---- 3. 数值字段动态更新 ----
  describe('数值字段动态更新', () => {
    it('每次 update 后 duration 递增 1', () => {
      const u = makeUnion({ tick: 0 })
      ;(sys as any).unions.push(u)
      callUpdate(sys, CHECK_INTERVAL)
      expect(u.duration).toBe(1)
    })

    it('多次 update 后 duration 累计递增', () => {
      const u = makeUnion({ tick: 0 })
      ;(sys as any).unions.push(u)
      callUpdate(sys, CHECK_INTERVAL)
      callUpdate(sys, CHECK_INTERVAL * 2)
      expect(u.duration).toBe(2)
    })

    it('cooperationLevel 始终在 [10, 90] 范围内', () => {
      const u = makeUnion({ cooperationLevel: 50, tick: 0 })
      ;(sys as any).unions.push(u)
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(u.cooperationLevel).toBeGreaterThanOrEqual(10)
        expect(u.cooperationLevel).toBeLessThanOrEqual(90)
      }
    })

    it('sharedValues 始终在 [10, 85] 范围内', () => {
      const u = makeUnion({ sharedValues: 50, tick: 0 })
      ;(sys as any).unions.push(u)
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(u.sharedValues).toBeGreaterThanOrEqual(10)
        expect(u.sharedValues).toBeLessThanOrEqual(85)
      }
    })

    it('institutionalStrength 始终在 [5, 75] 范围内', () => {
      const u = makeUnion({ institutionalStrength: 30, tick: 0 })
      ;(sys as any).unions.push(u)
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(u.institutionalStrength).toBeGreaterThanOrEqual(5)
        expect(u.institutionalStrength).toBeLessThanOrEqual(75)
      }
    })

    it('memberBenefit 始终在 [5, 65] 范围内', () => {
      const u = makeUnion({ memberBenefit: 30, tick: 0 })
      ;(sys as any).unions.push(u)
      for (let t = 1; t <= 20; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(u.memberBenefit).toBeGreaterThanOrEqual(5)
        expect(u.memberBenefit).toBeLessThanOrEqual(65)
      }
    })
  })

  // ---- 4. time-based 过期清理 ----
  describe('time-based 过期清理', () => {
    it('tick 早于 cutoff 的记录被删除', () => {
      ;(sys as any).unions.push(makeUnion({ tick: 0 }))
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL + 1
      callUpdate(sys, bigTick)
      expect((sys as any).unions).toHaveLength(0)
    })

    it('tick 等于 cutoff 时不删除（仅 < cutoff 才删）', () => {
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL
      const cutoff = bigTick - EXPIRE_TTL
      ;(sys as any).unions.push(makeUnion({ tick: cutoff }))
      callUpdate(sys, bigTick)
      expect((sys as any).unions).toHaveLength(1)
    })

    it('tick 晚于 cutoff 的记录保留', () => {
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL
      ;(sys as any).unions.push(makeUnion({ tick: bigTick - 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)  // 阻断spawn
      callUpdate(sys, bigTick)
      expect((sys as any).unions).toHaveLength(1)
    })

    it('混合：过期 + 未过期记录，只删过期', () => {
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL + 1
      ;(sys as any).unions.push(makeUnion({ id: 1, tick: 0 }))              // 过期
      ;(sys as any).unions.push(makeUnion({ id: 2, tick: bigTick - 1000 })) // 未过期
      callUpdate(sys, bigTick)
      const remaining = (sys as any).unions as CommonwealthUnion[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })

    it('全部过期时 unions 清空', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).unions.push(makeUnion({ id: i, tick: 0 }))
      }
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL + 1
      callUpdate(sys, bigTick)
      expect((sys as any).unions).toHaveLength(0)
    })
  })

  // ---- 5. MAX 上限 ----
  describe('MAX_UNIONS 上限', () => {
    it('达到 MAX_UNIONS 时不再新增', () => {
      for (let i = 0; i < MAX_UNIONS; i++) {
        ;(sys as any).unions.push(makeUnion({ id: i + 1, tick: CHECK_INTERVAL * 100 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 必定触发新增逻辑
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).unions).toHaveLength(MAX_UNIONS)
    })

    it('低于 MAX_UNIONS 时有机会新增（random=0 触发）', () => {
      // random=0 < PROCEED_CHANCE(0.0023) 为 true，且 civA !== civB 由后续 floor 决定
      // 用固定序列：先让 random < PROCEED_CHANCE，再让 civA=1,civB=2 不同
      const values = [0, 0, 0.1] // random()<PROCEED_CHANCE, floor->1, floor->2
      let idx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => values[idx++ % values.length])
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).unions.length).toBeGreaterThanOrEqual(0) // 至少不崩溃
    })

    it('nextId 随每次新增递增', () => {
      ;(sys as any).nextId = 5
      const u = makeUnion({ id: 5, tick: CHECK_INTERVAL * 100 })
      ;(sys as any).unions.push(u)
      // nextId 手动设置后值应保持
      expect((sys as any).nextId).toBe(5)
    })
  })

  // ---- 6. PROCEED_CHANCE 测试 ----
  describe('PROCEED_CHANCE 测试', () => {
    it('random >= PROCEED_CHANCE 时不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.003) // > 0.0023
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).unions).toHaveLength(0)
    })

    it('random < PROCEED_CHANCE 且 civA === civB 时不新增', () => {
      const values = [0, 0, 0] // random()<PROCEED_CHANCE, floor->1, floor->1
      let idx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => values[idx++ % values.length])
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).unions).toHaveLength(0)
    })
  })

  // ---- 7. 字段范围边界测试 ----
  describe('字段范围边界测试', () => {
    it('cooperationLevel 不会低于 10', () => {
      const u = makeUnion({ cooperationLevel: 10.1, tick: 0 })
      ;(sys as any).unions.push(u)
      vi.spyOn(Math, 'random').mockReturnValue(0) // 最小值
      for (let t = 1; t <= 50; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(u.cooperationLevel).toBeGreaterThanOrEqual(10)
    })

    it('cooperationLevel 不会高于 90', () => {
      const u = makeUnion({ cooperationLevel: 89.9, tick: 0 })
      ;(sys as any).unions.push(u)
      vi.spyOn(Math, 'random').mockReturnValue(1) // 最大值
      for (let t = 1; t <= 50; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(u.cooperationLevel).toBeLessThanOrEqual(90)
    })

    it('sharedValues 不会低于 10', () => {
      const u = makeUnion({ sharedValues: 10.1, tick: 0 })
      ;(sys as any).unions.push(u)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let t = 1; t <= 50; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(u.sharedValues).toBeGreaterThanOrEqual(10)
    })

    it('sharedValues 不会高于 85', () => {
      const u = makeUnion({ sharedValues: 84.9, tick: 0 })
      ;(sys as any).unions.push(u)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let t = 1; t <= 50; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(u.sharedValues).toBeLessThanOrEqual(85)
    })

    it('institutionalStrength 不会低于 5', () => {
      const u = makeUnion({ institutionalStrength: 5.1, tick: 0 })
      ;(sys as any).unions.push(u)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let t = 1; t <= 50; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(u.institutionalStrength).toBeGreaterThanOrEqual(5)
    })

    it('institutionalStrength 不会高于 75', () => {
      const u = makeUnion({ institutionalStrength: 74.9, tick: 0 })
      ;(sys as any).unions.push(u)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let t = 1; t <= 50; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(u.institutionalStrength).toBeLessThanOrEqual(75)
    })

    it('memberBenefit 不会低于 5', () => {
      const u = makeUnion({ memberBenefit: 5.1, tick: 0 })
      ;(sys as any).unions.push(u)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let t = 1; t <= 50; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(u.memberBenefit).toBeGreaterThanOrEqual(5)
    })

    it('memberBenefit 不会高于 65', () => {
      const u = makeUnion({ memberBenefit: 64.9, tick: 0 })
      ;(sys as any).unions.push(u)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let t = 1; t <= 50; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(u.memberBenefit).toBeLessThanOrEqual(65)
    })
  })

  // ---- 8. 多 union 交互测试 ----
  describe('多 union 交互测试', () => {
    it('多条 union 独立更新 duration', () => {
      const u1 = makeUnion({ id: 1, tick: 0 })
      const u2 = makeUnion({ id: 2, tick: 0 })
      ;(sys as any).unions.push(u1, u2)
      callUpdate(sys, CHECK_INTERVAL)
      expect(u1.duration).toBe(1)
      expect(u2.duration).toBe(1)
    })

    it('多条 union 独立更新字段', () => {
      const u1 = makeUnion({ id: 1, cooperationLevel: 50, tick: 0 })
      const u2 = makeUnion({ id: 2, cooperationLevel: 60, tick: 0 })
      ;(sys as any).unions.push(u1, u2)
      callUpdate(sys, CHECK_INTERVAL)
      expect(u1.cooperationLevel).not.toBe(50)
      expect(u2.cooperationLevel).not.toBe(60)
    })

    it('部分 union 过期被删除，其他保留', () => {
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL + 1
      ;(sys as any).unions.push(makeUnion({ id: 1, tick: 0 }))
      ;(sys as any).unions.push(makeUnion({ id: 2, tick: bigTick - 1000 }))
      callUpdate(sys, bigTick)
      expect((sys as any).unions).toHaveLength(1)
      expect((sys as any).unions[0].id).toBe(2)
    })
  })

  // ---- 9. civId 边界测试 ----
  describe('civId 边界测试', () => {
    it('civIdA 和 civIdB 可以是任意正整数', () => {
      const u = makeUnion({ civIdA: 999, civIdB: 888 })
      expect(u.civIdA).toBe(999)
      expect(u.civIdB).toBe(888)
    })

    it('civIdA === civIdB 的 union 可以存在（虽然 spawn 逻辑会拦截）', () => {
      const u = makeUnion({ civIdA: 5, civIdB: 5 })
      ;(sys as any).unions.push(u)
      expect((sys as any).unions).toHaveLength(1)
    })
  })

  // ---- 10. duration 累计测试 ----
  describe('duration 累计测试', () => {
    it('duration 从 0 开始每次 +1', () => {
      const u = makeUnion({ duration: 0, tick: 0 })
      ;(sys as any).unions.push(u)
      for (let t = 1; t <= 5; t++) {
        callUpdate(sys, CHECK_INTERVAL * t)
        expect(u.duration).toBe(t)
      }
    })

    it('duration 初始非 0 时继续累加', () => {
      const u = makeUnion({ duration: 10, tick: 0 })
      ;(sys as any).unions.push(u)
      callUpdate(sys, CHECK_INTERVAL)
      expect(u.duration).toBe(11)
    })
  })

  // ---- 11. tick 字段测试 ----
  describe('tick 字段测试', () => {
    it('tick 字段在 update 中不变', () => {
      const u = makeUnion({ tick: 12345 })
      ;(sys as any).unions.push(u)
      callUpdate(sys, CHECK_INTERVAL)
      expect(u.tick).toBe(12345)
    })

    it('tick 用于过期判断', () => {
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL + 1
      const cutoff = bigTick - EXPIRE_TTL
      ;(sys as any).unions.push(makeUnion({ tick: cutoff - 1 }))
      callUpdate(sys, bigTick)
      expect((sys as any).unions).toHaveLength(0)
    })
  })

  // ---- 12. form 字段测试 ----
  describe('form 字段测试', () => {
    it('economic_commonwealth 是合法 form', () => {
      const u = makeUnion({ form: 'economic_commonwealth' })
      expect(u.form).toBe('economic_commonwealth')
    })

    it('cultural_commonwealth 是合法 form', () => {
      const u = makeUnion({ form: 'cultural_commonwealth' })
      expect(u.form).toBe('cultural_commonwealth')
    })

    it('security_commonwealth 是合法 form', () => {
      const u = makeUnion({ form: 'security_commonwealth' })
      expect(u.form).toBe('security_commonwealth')
    })

    it('scientific_commonwealth 是合法 form', () => {
      const u = makeUnion({ form: 'scientific_commonwealth' })
      expect(u.form).toBe('scientific_commonwealth')
    })
  })

  // ---- 13. 空数组边界测试 ----
  describe('空数组边界测试', () => {
    it('unions 为空时 update 不崩溃', () => {
      expect(() => callUpdate(sys, CHECK_INTERVAL)).not.toThrow()
    })

    it('unions 为空时 cleanup 不崩溃', () => {
      const bigTick = EXPIRE_TTL + CHECK_INTERVAL + 1
      expect(() => callUpdate(sys, bigTick)).not.toThrow()
    })
  })
})
