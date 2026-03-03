import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticCompromiseSystem, CompromiseAgreement, CompromiseStatus } from '../systems/DiplomaticCompromiseSystem'

const CHECK_INTERVAL = 2560
const MAX_AGREEMENTS = 16

function makeSys() { return new DiplomaticCompromiseSystem() }

function makeAgreement(overrides: Partial<CompromiseAgreement> = {}): CompromiseAgreement {
  return {
    id: 1, civIdA: 1, civIdB: 2,
    status: 'proposing',
    concessionA: 20, concessionB: 20,
    satisfaction: 0, rounds: 0,
    duration: 0, tick: 10000,
    ...overrides,
  }
}

function callUpdate(sys: DiplomaticCompromiseSystem, tick: number) {
  sys.update(1, {} as any, {} as any, tick)
}

describe('DiplomaticCompromiseSystem', () => {
  let sys: DiplomaticCompromiseSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  // ---- 1. 基础数据结构 ----
  describe('基础数据结构', () => {
    it('初始 agreements 为空数组', () => {
      expect((sys as any).agreements).toHaveLength(0)
      expect(Array.isArray((sys as any).agreements)).toBe(true)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('直接注入单条 agreement 后长度为 1', () => {
      ;(sys as any).agreements.push(makeAgreement())
      expect((sys as any).agreements).toHaveLength(1)
    })

    it('直接注入多条 agreement 后长度正确', () => {
      for (let i = 1; i <= 4; i++) {
        ;(sys as any).agreements.push(makeAgreement({ id: i }))
      }
      expect((sys as any).agreements).toHaveLength(4)
    })

    it('所有 CompromiseStatus 类型均合法', () => {
      const statuses: CompromiseStatus[] = ['proposing', 'counter_offer', 'accepted', 'rejected']
      const ag = makeAgreement()
      for (const s of statuses) {
        ag.status = s
        expect(ag.status).toBe(s)
      }
    })

    it('agreement 结构包含所有必要字段', () => {
      const ag = makeAgreement()
      expect(ag).toHaveProperty('id')
      expect(ag).toHaveProperty('civIdA')
      expect(ag).toHaveProperty('civIdB')
      expect(ag).toHaveProperty('status')
      expect(ag).toHaveProperty('concessionA')
      expect(ag).toHaveProperty('concessionB')
      expect(ag).toHaveProperty('satisfaction')
      expect(ag).toHaveProperty('rounds')
      expect(ag).toHaveProperty('duration')
      expect(ag).toHaveProperty('tick')
    })

    it('satisfaction 初始为 0', () => {
      const ag = makeAgreement()
      expect(ag.satisfaction).toBe(0)
    })

    it('rounds 初始为 0', () => {
      const ag = makeAgreement()
      expect(ag.rounds).toBe(0)
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

    it('tick 大于 CHECK_INTERVAL 时执行', () => {
      callUpdate(sys, CHECK_INTERVAL + 999)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 999)
    })

    it('连续调用：第二次 tick 未满间隔时不更新', () => {
      callUpdate(sys, CHECK_INTERVAL)
      callUpdate(sys, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('连续调用：第二次 tick 满间隔时更新', () => {
      callUpdate(sys, CHECK_INTERVAL)
      callUpdate(sys, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })

    it('tick=0 时不执行', () => {
      callUpdate(sys, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=CHECK_INTERVAL-1 时不执行', () => {
      const ag = makeAgreement({ status: 'proposing', duration: 5 })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL - 1)
      expect(ag.duration).toBe(5)
    })

    it('tick 极大时正常执行', () => {
      callUpdate(sys, 99999999)
      expect((sys as any).lastCheck).toBe(99999999)
    })
  })

  // ---- 3. 状态机与数值更新 ----
  describe('状态机与数值动态更新', () => {
    it('每次 update 后 duration 递增 1', () => {
      const ag = makeAgreement({ status: 'proposing' })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag.duration).toBe(1)
    })

    it('多次 update 后 duration 累计递增', () => {
      const ag = makeAgreement({ status: 'proposing' })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      callUpdate(sys, CHECK_INTERVAL * 2)
      expect(ag.duration).toBe(2)
    })

    it('counter_offer 状态下 concessionA 每次 +0.5，上限 100', () => {
      const ag = makeAgreement({ status: 'counter_offer', concessionA: 30, concessionB: 30 })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag.concessionA).toBeCloseTo(30.5)
    })

    it('counter_offer 状态下 concessionB 每次 +0.5，上限 100', () => {
      const ag = makeAgreement({ status: 'counter_offer', concessionA: 30, concessionB: 30 })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag.concessionB).toBeCloseTo(30.5)
    })

    it('counter_offer 下 concessionA 不超过 100', () => {
      const ag = makeAgreement({ status: 'counter_offer', concessionA: 99.9, concessionB: 30 })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag.concessionA).toBeLessThanOrEqual(100)
    })

    it('counter_offer 下 satisfaction = (concessionA + concessionB) / 2', () => {
      const ag = makeAgreement({ status: 'counter_offer', concessionA: 50, concessionB: 50 })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag.satisfaction).toBeCloseTo((ag.concessionA + ag.concessionB) / 2 - 0.0001, 0)
    })

    it('satisfaction > 60 时状态变为 accepted', () => {
      const ag = makeAgreement({ status: 'counter_offer', concessionA: 62, concessionB: 62 })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag.status).toBe('accepted')
    })

    it('rounds > 10 且 satisfaction < 30 时状态变为 rejected', () => {
      const ag = makeAgreement({ status: 'counter_offer', concessionA: 10, concessionB: 10, rounds: 11 })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag.status).toBe('rejected')
    })

    it('proposing 状态下 random>=0.1 时保持 proposing', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const ag = makeAgreement({ status: 'proposing' })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag.status).toBe('proposing')
    })

    it('proposing 状态下 random<0.1 时转为 counter_offer 并 rounds++', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      const ag = makeAgreement({ status: 'proposing', rounds: 0 })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag.status).toBe('counter_offer')
      expect(ag.rounds).toBe(1)
    })

    it('concessionB 上限为 100', () => {
      const ag = makeAgreement({ status: 'counter_offer', concessionA: 30, concessionB: 99.9 })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag.concessionB).toBeLessThanOrEqual(100)
    })

    it('多条 agreements 各自独立更新 duration', () => {
      const ag1 = makeAgreement({ id: 1, duration: 3, status: 'proposing' })
      const ag2 = makeAgreement({ id: 2, duration: 7, status: 'proposing' })
      ;(sys as any).agreements.push(ag1)
      ;(sys as any).agreements.push(ag2)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag1.duration).toBe(4)
      expect(ag2.duration).toBe(8)
    })
  })

  // ---- 4. 终态清理（accepted/rejected 移除）----
  describe('终态清理', () => {
    it('status=accepted 的记录在下次 update 时被移除', () => {
      const ag = makeAgreement({ status: 'accepted' })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).agreements).toHaveLength(0)
    })

    it('status=rejected 的记录在下次 update 时被移除', () => {
      const ag = makeAgreement({ status: 'rejected' })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).agreements).toHaveLength(0)
    })

    it('status=proposing 的记录保留', () => {
      const ag = makeAgreement({ status: 'proposing' })
      ;(sys as any).agreements.push(ag)
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不触发 counter_offer
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).agreements).toHaveLength(1)
    })

    it('混合状态：proposing 保留，accepted 删除', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, status: 'proposing' }))
      ;(sys as any).agreements.push(makeAgreement({ id: 2, status: 'accepted' }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      callUpdate(sys, CHECK_INTERVAL)
      const remaining = (sys as any).agreements as CompromiseAgreement[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(1)
    })

    it('status=counter_offer 的记录保留', () => {
      const ag = makeAgreement({ status: 'counter_offer', concessionA: 20, concessionB: 20 })
      ;(sys as any).agreements.push(ag)
      callUpdate(sys, CHECK_INTERVAL)
      // satisfaction = 20.5 < 60, rounds=0 <= 10 -> not rejected → should stay
      expect((sys as any).agreements).toHaveLength(1)
    })

    it('多条 rejected 全部被清理', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).agreements.push(makeAgreement({ id: i + 1, status: 'rejected' }))
      }
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).agreements).toHaveLength(0)
    })

    it('空数组时清理不崩溃', () => {
      expect(() => callUpdate(sys, CHECK_INTERVAL)).not.toThrow()
    })
  })

  // ---- 5. MAX 上限 ----
  describe('MAX_AGREEMENTS 上限', () => {
    it('达到 MAX_AGREEMENTS 时不再新增', () => {
      for (let i = 0; i < MAX_AGREEMENTS; i++) {
        ;(sys as any).agreements.push(makeAgreement({ id: i + 1, status: 'proposing' }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 触发新增条件
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).agreements.length).toBeLessThanOrEqual(MAX_AGREEMENTS)
    })

    it('空数组时 random=0 尝试新增不崩溃', () => {
      const values = [0, 0, 0.1]
      let idx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => values[idx++ % values.length])
      expect(() => callUpdate(sys, CHECK_INTERVAL)).not.toThrow()
    })

    it('nextId 手动设置后保持', () => {
      ;(sys as any).nextId = 10
      expect((sys as any).nextId).toBe(10)
    })

    it('random=0.99 时不新增（>INITIATE_CHANCE）', () => {
      callUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).agreements).toHaveLength(0)
    })

    it('agreements 是数组类型', () => {
      expect(Array.isArray((sys as any).agreements)).toBe(true)
    })

    it('update 不崩溃（空状态）', () => {
      expect(() => callUpdate(sys, CHECK_INTERVAL)).not.toThrow()
    })
  })

  // ---- 6. 枚举完整性 ----
  describe('CompromiseStatus 枚举完整性', () => {
    it("status='proposing' 可读取", () => {
      const ag = makeAgreement({ status: 'proposing' })
      expect(ag.status).toBe('proposing')
    })

    it("status='counter_offer' 可读取", () => {
      const ag = makeAgreement({ status: 'counter_offer' })
      expect(ag.status).toBe('counter_offer')
    })

    it("status='accepted' 可读取", () => {
      const ag = makeAgreement({ status: 'accepted' })
      expect(ag.status).toBe('accepted')
    })

    it("status='rejected' 可读取", () => {
      const ag = makeAgreement({ status: 'rejected' })
      expect(ag.status).toBe('rejected')
    })

    it('update 不改变 civIdA/civIdB', () => {
      const ag = makeAgreement({ civIdA: 4, civIdB: 6, status: 'proposing' })
      ;(sys as any).agreements.push(ag)
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      callUpdate(sys, CHECK_INTERVAL)
      expect(ag.civIdA).toBe(4)
      expect(ag.civIdB).toBe(6)
    })
  })
})
