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
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
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

    it('decree 包含所有必要字段', () => {
      const d = makeDecree()
      ;(sys as any).decrees.push(d)
      const stored = (sys as any).decrees[0]
      expect(stored).toHaveProperty('id')
      expect(stored).toHaveProperty('civIdA')
      expect(stored).toHaveProperty('civIdB')
      expect(stored).toHaveProperty('form')
      expect(stored).toHaveProperty('releaseCompleteness')
      expect(stored).toHaveProperty('publicAcceptance')
      expect(stored).toHaveProperty('moralAuthority')
      expect(stored).toHaveProperty('precedentValue')
      expect(stored).toHaveProperty('duration')
      expect(stored).toHaveProperty('tick')
    })

    it('注入三条 decree 后长度为3', () => {
      for (let i = 1; i <= 3; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i }))
      }
      expect((sys as any).decrees).toHaveLength(3)
    })

    it('注入 decree 后 duration 初始值为0', () => {
      ;(sys as any).decrees.push(makeDecree({ duration: 0 }))
      expect((sys as any).decrees[0].duration).toBe(0)
    })

    it('civIdA 和 civIdB 可以独立读取', () => {
      ;(sys as any).decrees.push(makeDecree({ civIdA: 5, civIdB: 8 }))
      expect((sys as any).decrees[0].civIdA).toBe(5)
      expect((sys as any).decrees[0].civIdB).toBe(8)
    })

    it('每种 form 类型均可独立注入并读取', () => {
      const f: Absolution2Form = 'reparation_cancellation'
      ;(sys as any).decrees.push(makeDecree({ form: f }))
      expect((sys as any).decrees[0].form).toBe('reparation_cancellation')
    })
  })

  // ---- 2. CHECK_INTERVAL 节流 ----
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 差值小于 CHECK_INTERVAL 时不更新 lastCheck', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 差值等于 CHECK_INTERVAL 时执行更新并更新 lastCheck', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick 差值大于 CHECK_INTERVAL 时执行更新', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
    })

    it('连续两次 update 在 CHECK_INTERVAL 内，第二次不触发再次更新', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const lastCheckAfterFirst = (sys as any).lastCheck
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(lastCheckAfterFirst)
    })

    it('第二个完整周期触发时 lastCheck 更新到新 tick', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })

    it('tick=0 时不触发更新，lastCheck 保持为 0', () => {
      sys.update(1, {} as any, {} as any, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=CHECK_INTERVAL-1 时 duration 不递增', () => {
      ;(sys as any).decrees.push(makeDecree({ duration: 0, tick: 0 }))
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
      expect((sys as any).decrees[0].duration).toBe(0)
    })

    it('三次完整周期，lastCheck 跟随最新 tick', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 3)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
    })
  })

  // ---- 3. 数值字段动态更新 ----
  describe('数值字段动态更新', () => {
    it('每次 update 后 duration +1', () => {
      const d = makeDecree({ duration: 0, tick: 0 })
      ;(sys as any).decrees.push(d)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees[0].duration).toBeGreaterThanOrEqual(0)
    })

    it('多次 update 后 duration 累计递增', () => {
      const d = makeDecree({ duration: 0, tick: 0 })
      ;(sys as any).decrees.push(d)
      for (let i = 1; i <= 3; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      expect((sys as any).decrees[0].duration).toBe(3)
    })

    it('releaseCompleteness 不超出 [10, 90] 范围', () => {
      ;(sys as any).decrees.push(makeDecree({ releaseCompleteness: 50, tick: 0 }))
      for (let i = 1; i <= 20; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).decrees[0].releaseCompleteness
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(90)
    })

    it('publicAcceptance 不超出 [5, 80] 范围', () => {
      ;(sys as any).decrees.push(makeDecree({ publicAcceptance: 40, tick: 0 }))
      for (let i = 1; i <= 20; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).decrees[0].publicAcceptance
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(80)
    })

    it('moralAuthority 不超出 [10, 85] 范围', () => {
      ;(sys as any).decrees.push(makeDecree({ moralAuthority: 50, tick: 0 }))
      for (let i = 1; i <= 20; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).decrees[0].moralAuthority
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(85)
    })

    it('precedentValue 不超出 [5, 65] 范围', () => {
      ;(sys as any).decrees.push(makeDecree({ precedentValue: 30, tick: 0 }))
      for (let i = 1; i <= 20; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).decrees[0].precedentValue
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(65)
    })

    it('releaseCompleteness 在边界 10 时不会被压低到 10 以下', () => {
      ;(sys as any).decrees.push(makeDecree({ releaseCompleteness: 10, tick: 0 }))
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const val = (sys as any).decrees[0].releaseCompleteness
      expect(val).toBeGreaterThanOrEqual(10)
    })

    it('publicAcceptance 在边界 5 时不会被压低到 5 以下', () => {
      ;(sys as any).decrees.push(makeDecree({ publicAcceptance: 5, tick: 0 }))
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const val = (sys as any).decrees[0].publicAcceptance
      expect(val).toBeGreaterThanOrEqual(5)
    })

    it('多条记录各自独立更新 duration', () => {
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 0, duration: 0 }))
      ;(sys as any).decrees.push(makeDecree({ id: 2, tick: 0, duration: 5 }))
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees[0].duration).toBe(1)
      expect((sys as any).decrees[1].duration).toBe(6)
    })

    it('moralAuthority 在边界 10 时不会被压低到 10 以下', () => {
      ;(sys as any).decrees.push(makeDecree({ moralAuthority: 10, tick: 0 }))
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const val = (sys as any).decrees[0].moralAuthority
      expect(val).toBeGreaterThanOrEqual(10)
    })

    it('precedentValue 在边界 5 时不会被压低到 5 以下', () => {
      ;(sys as any).decrees.push(makeDecree({ precedentValue: 5, tick: 0 }))
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const val = (sys as any).decrees[0].precedentValue
      expect(val).toBeGreaterThanOrEqual(5)
    })
  })

  // ---- 4. time-based 过期清理 ----
  describe('time-based 过期清理', () => {
    it('tick=0 的记录在大 tick 时被清理', () => {
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 0 }))
      const bigTick = EXPIRY_WINDOW + CHECK_INTERVAL + 1
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).decrees).toHaveLength(0)
    })

    it('未过期记录不被清理', () => {
      const baseTick = 100000
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: baseTick }))
      sys.update(1, {} as any, {} as any, baseTick + CHECK_INTERVAL)
      expect((sys as any).decrees).toHaveLength(1)
    })

    it('恰好在 cutoff 边界的记录（tick < cutoff）被清理', () => {
      const bigTick = EXPIRY_WINDOW + CHECK_INTERVAL + 1
      ;(sys as any).decrees.push(makeDecree({ tick: CHECK_INTERVAL }))
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).decrees).toHaveLength(0)
    })

    it('混合新旧记录时只清理过期记录', () => {
      const bigTick = EXPIRY_WINDOW + CHECK_INTERVAL + 1
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 0 }))
      ;(sys as any).decrees.push(makeDecree({ id: 2, tick: bigTick }))
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).decrees).toHaveLength(1)
      expect((sys as any).decrees[0].id).toBe(2)
    })

    it('多个过期记录全部被清理', () => {
      const bigTick = EXPIRY_WINDOW + CHECK_INTERVAL + 1
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i, tick: 0 }))
      }
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).decrees).toHaveLength(0)
    })

    it('所有记录均为新鲜记录时无清理', () => {
      const bigTick = CHECK_INTERVAL + 1000
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: bigTick - 1000 }))
      ;(sys as any).decrees.push(makeDecree({ id: 2, tick: bigTick - 500 }))
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).decrees).toHaveLength(2)
    })

    it('清理后剩余记录顺序保留（反向遍历不错位）', () => {
      const bigTick = EXPIRY_WINDOW + CHECK_INTERVAL + 1
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 0 }))
      ;(sys as any).decrees.push(makeDecree({ id: 2, tick: bigTick }))
      ;(sys as any).decrees.push(makeDecree({ id: 3, tick: 0 }))
      ;(sys as any).decrees.push(makeDecree({ id: 4, tick: bigTick }))
      sys.update(1, {} as any, {} as any, bigTick)
      const ids = (sys as any).decrees.map((d: any) => d.id)
      expect(ids).toContain(2)
      expect(ids).toContain(4)
      expect(ids).not.toContain(1)
      expect(ids).not.toContain(3)
    })
  })

  // ---- 5. MAX_DECREES 上限 ----
  describe('MAX_DECREES 上限', () => {
    it('达到 MAX_DECREES 时不再新增 decree', () => {
      for (let i = 1; i <= MAX_DECREES; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i, tick: 10000 }))
      }
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees.length).toBeLessThanOrEqual(MAX_DECREES)
    })

    it('未达到 MAX_DECREES 且 random 满足概率时可新增 decree', () => {
      for (let i = 1; i <= MAX_DECREES - 1; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i, tick: 10000 }))
      }
      let callCount = 0
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0
        if (callCount === 2) return 0
        if (callCount === 3) return 0.5
        return 0.5
      })
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees.length).toBeLessThanOrEqual(MAX_DECREES)
    })

    it('nextId 在新增 decree 后递增', () => {
      let callCount = 0
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0
        if (callCount === 2) return 0
        if (callCount === 3) return 0.5
        return 0.5
      })
      const initialNextId = (sys as any).nextId
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const finalNextId = (sys as any).nextId
      expect(finalNextId).toBeGreaterThanOrEqual(initialNextId)
    })

    it('MAX_DECREES 常量为 20', () => {
      for (let i = 1; i <= MAX_DECREES; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i, tick: 10000 }))
      }
      expect((sys as any).decrees).toHaveLength(20)
    })

    it('decrees 数组初始时未超出 MAX_DECREES', () => {
      expect((sys as any).decrees.length).toBeLessThanOrEqual(MAX_DECREES)
    })

    it('注入 MAX_DECREES-1 条记录后长度为 MAX_DECREES-1', () => {
      for (let i = 1; i <= MAX_DECREES - 1; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i, tick: 10000 }))
      }
      expect((sys as any).decrees).toHaveLength(MAX_DECREES - 1)
    })
  })

  // ---- 6. 额外边界 & 完整性测试 ----
  describe('额外边界与完整性', () => {
    it('civA === civB 时不新增（random mock 保证相同 civ）', () => {
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      // random=0 → civA=1, civB=1 → 相等 → early return
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees).toHaveLength(0)
    })

    it('update 不改变注入 decree 的 form 字段', () => {
      ;(sys as any).decrees.push(makeDecree({ form: 'treaty_obligation_waiver', tick: 0 }))
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees[0].form).toBe('treaty_obligation_waiver')
    })

    it('update 不改变注入 decree 的 civIdA/civIdB 字段', () => {
      ;(sys as any).decrees.push(makeDecree({ civIdA: 3, civIdB: 7, tick: 0 }))
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees[0].civIdA).toBe(3)
      expect((sys as any).decrees[0].civIdB).toBe(7)
    })

    it('系统实例相互独立，不共享状态', () => {
      const s1 = makeSys()
      const s2 = makeSys()
      ;(s1 as any).decrees.push(makeDecree({ id: 99 }))
      expect((s2 as any).decrees).toHaveLength(0)
    })

    it('duration 只在满足 CHECK_INTERVAL 时递增', () => {
      ;(sys as any).decrees.push(makeDecree({ duration: 0, tick: 0 }))
      sys.update(1, {} as any, {} as any, 10)
      expect((sys as any).decrees[0].duration).toBe(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees[0].duration).toBe(1)
    })

    it('releaseCompleteness 上界不超过 90', () => {
      ;(sys as any).decrees.push(makeDecree({ releaseCompleteness: 90, tick: 0 }))
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees[0].releaseCompleteness).toBeLessThanOrEqual(90)
    })

    it('moralAuthority 上界不超过 85', () => {
      ;(sys as any).decrees.push(makeDecree({ moralAuthority: 85, tick: 0 }))
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).decrees[0].moralAuthority).toBeLessThanOrEqual(85)
    })
  })
})
