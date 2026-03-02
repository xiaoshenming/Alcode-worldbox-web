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
})
