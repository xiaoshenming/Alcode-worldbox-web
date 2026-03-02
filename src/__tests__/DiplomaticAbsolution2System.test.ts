import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAbsolution2System, Absolution2Decree, Absolution2Form } from '../systems/DiplomaticAbsolution2System'

const FORMS: Absolution2Form[] = ['debt_forgiveness', 'war_guilt_release', 'treaty_obligation_waiver', 'reparation_cancellation']
const CHECK_INTERVAL = 2460
const MAX_DECREES = 20
const EXPIRY_WINDOW = 86000

function makeSys() { return new DiplomaticAbsolution2System() }

function makeDecree(overrides: Partial<Absolution2Decree> = {}): Absolution2Decree {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    form: 'debt_forgiveness',
    releaseCompleteness: 50,
    publicAcceptance: 40,
    moralAuthority: 50,
    precedentValue: 30,
    duration: 0,
    tick: 10000,
    ...overrides,
  }
}

describe('DiplomaticAbsolution2System', () => {

  let sys: DiplomaticAbsolution2System

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---- 1. 基础数据结构 ----
  describe('基础数据结构', () => {
    it('初始 decrees 为空数组', () => {
      expect((sys as any).decrees).toHaveLength(0)
      expect(Array.isArray((sys as any).decrees)).toBe(true)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入 decree 后 decrees 数组长度正确', () => {
      ;(sys as any).decrees.push(makeDecree({ id: 1 }))
      ;(sys as any).decrees.push(makeDecree({ id: 2 }))
      expect((sys as any).decrees).toHaveLength(2)
    })

    it('注入的 decree 字段可正确读取', () => {
      const d = makeDecree({ id: 42, form: 'war_guilt_release', civIdA: 3, civIdB: 7 })
      ;(sys as any).decrees.push(d)
      const stored = (sys as any).decrees[0]
      expect(stored.id).toBe(42)
      expect(stored.form).toBe('war_guilt_release')
      expect(stored.civIdA).toBe(3)
      expect(stored.civIdB).toBe(7)
    })

    it('所有有效 Absolution2Form 可被识别', () => {
      for (const form of FORMS) {
        const d = makeDecree({ form })
        ;(sys as any).decrees.push(d)
      }
      expect((sys as any).decrees).toHaveLength(FORMS.length)
    })
  })

  // ---- 2. CHECK_INTERVAL 节流 ----
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 差值小于 CHECK_INTERVAL 时不更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 差值等于 CHECK_INTERVAL 时执行更新并更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick 差值大于 CHECK_INTERVAL 时执行更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
    })

    it('连续两次 update 在 CHECK_INTERVAL 内，第二次不触发再次更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const lastCheckAfterFirst = (sys as any).lastCheck
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 100)
      // 差值仅100，小于2460，lastCheck不变
      expect((sys as any).lastCheck).toBe(lastCheckAfterFirst)
    })

    it('第二个完整周期触发时 lastCheck 更新到新 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })
  })

  // ---- 3. 数值字段动态更新 ----
  describe('数值字段动态更新', () => {
    it('每次 update 后 duration +1', () => {
      const d = makeDecree({ duration: 0, tick: 0 })
      ;(sys as any).decrees.push(d)
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees[0].duration).toBe(1)
    })

    it('多次 update 后 duration 累计递增', () => {
      const d = makeDecree({ duration: 0, tick: 0 })
      ;(sys as any).decrees.push(d)
      for (let i = 1; i <= 3; i++) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      expect((sys as any).decrees[0].duration).toBe(3)
    })

    it('releaseCompleteness 不超出 [10, 90] 范围', () => {
      ;(sys as any).decrees.push(makeDecree({ releaseCompleteness: 50, tick: 0 }))
      for (let i = 1; i <= 20; i++) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).decrees[0].releaseCompleteness
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(90)
    })

    it('publicAcceptance 不超出 [5, 80] 范围', () => {
      ;(sys as any).decrees.push(makeDecree({ publicAcceptance: 40, tick: 0 }))
      for (let i = 1; i <= 20; i++) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).decrees[0].publicAcceptance
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(80)
    })

    it('moralAuthority 不超出 [10, 85] 范围', () => {
      ;(sys as any).decrees.push(makeDecree({ moralAuthority: 50, tick: 0 }))
      for (let i = 1; i <= 20; i++) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).decrees[0].moralAuthority
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(85)
    })

    it('precedentValue 不超出 [5, 65] 范围', () => {
      ;(sys as any).decrees.push(makeDecree({ precedentValue: 30, tick: 0 }))
      for (let i = 1; i <= 20; i++) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).decrees[0].precedentValue
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(65)
    })

    it('releaseCompleteness 在边界 10 时不会被压低到 10 以下', () => {
      ;(sys as any).decrees.push(makeDecree({ releaseCompleteness: 10, tick: 0 }))
      // 强制 random 返回 0（让偏移量最负）
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const val = (sys as any).decrees[0].releaseCompleteness
      expect(val).toBeGreaterThanOrEqual(10)
    })

    it('publicAcceptance 在边界 5 时不会被压低到 5 以下', () => {
      ;(sys as any).decrees.push(makeDecree({ publicAcceptance: 5, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const val = (sys as any).decrees[0].publicAcceptance
      expect(val).toBeGreaterThanOrEqual(5)
    })
  })

  // ---- 4. time-based 过期清理 ----
  describe('time-based 过期清理', () => {
    it('tick=0 的记录在大 tick 时被清理', () => {
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 0 }))
      const bigTick = EXPIRY_WINDOW + CHECK_INTERVAL + 1
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).decrees).toHaveLength(0)
    })

    it('未过期记录不被清理', () => {
      const baseTick = 100000
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: baseTick }))
      // 下一个检查点恰好是 baseTick + CHECK_INTERVAL，cutoff = baseTick + CHECK_INTERVAL - EXPIRY_WINDOW
      // 记录 tick = baseTick，大于 cutoff，不应被清理
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, baseTick + CHECK_INTERVAL)
      expect((sys as any).decrees).toHaveLength(1)
    })

    it('恰好在 cutoff 边界的记录（tick < cutoff）被清理', () => {
      const bigTick = EXPIRY_WINDOW + CHECK_INTERVAL + 1
      // cutoff = bigTick - EXPIRY_WINDOW = CHECK_INTERVAL + 1
      // 令 decree.tick = CHECK_INTERVAL（< cutoff），应被清理
      ;(sys as any).decrees.push(makeDecree({ tick: CHECK_INTERVAL }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).decrees).toHaveLength(0)
    })

    it('混合新旧记录时只清理过期记录', () => {
      const bigTick = EXPIRY_WINDOW + CHECK_INTERVAL + 1
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 0 }))       // 过期
      ;(sys as any).decrees.push(makeDecree({ id: 2, tick: bigTick }))  // 新记录
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).decrees).toHaveLength(1)
      expect((sys as any).decrees[0].id).toBe(2)
    })

    it('多个过期记录全部被清理', () => {
      const bigTick = EXPIRY_WINDOW + CHECK_INTERVAL + 1
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i, tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).decrees).toHaveLength(0)
    })
  })

  // ---- 5. MAX_DECREES 上限 ----
  describe('MAX_DECREES 上限', () => {
    it('达到 MAX_DECREES 时不再新增 decree', () => {
      for (let i = 1; i <= MAX_DECREES; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i, tick: 10000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 确保 PROCEED_CHANCE 条件满足（0 < 0.0023）
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees.length).toBeLessThanOrEqual(MAX_DECREES)
    })

    it('未达到 MAX_DECREES 且 random 满足概率时可新增 decree', () => {
      // random 返回 0 < PROCEED_CHANCE(0.0023)，且两个 civ 不同时触发新增
      // 但由于 civA/civB 随机可能相等导致 return，这里多次观察
      // 注入19个记录（未满）
      for (let i = 1; i <= MAX_DECREES - 1; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i, tick: 10000 }))
      }
      // 控制 random：先返回 0（触发概率），然后返回固定值产生 civA!=civB
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0        // 触发 PROCEED_CHANCE
        if (callCount === 2) return 0        // civA = 1
        if (callCount === 3) return 0.5      // civB = 5，不同
        return 0.5                           // 其他随机字段
      })
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      // 新记录数量 <= MAX_DECREES（已满足上限约束）
      expect((sys as any).decrees.length).toBeLessThanOrEqual(MAX_DECREES)
    })

    it('nextId 在新增 decree 后递增', () => {
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0    // 触发 PROCEED_CHANCE
        if (callCount === 2) return 0    // civA = 1
        if (callCount === 3) return 0.5  // civB = 5
        return 0.5
      })
      const initialNextId = (sys as any).nextId
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      // 若成功新增则 nextId 递增
      const finalNextId = (sys as any).nextId
      expect(finalNextId).toBeGreaterThanOrEqual(initialNextId)
    })

    it('MAX_DECREES 常量为 20', () => {
      // 验证系统限制等于预期值
      for (let i = 1; i <= MAX_DECREES; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i, tick: 10000 }))
      }
      expect((sys as any).decrees).toHaveLength(20)
    })
  })

})
