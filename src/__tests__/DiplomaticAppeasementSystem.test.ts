import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAppeasementSystem, AppeasementPolicy, AppeasementType } from '../systems/DiplomaticAppeasementSystem'

const CHECK_INTERVAL = 2390
const MAX_POLICIES = 20
const EXPIRE_OFFSET = 80000

function makeSys() { return new DiplomaticAppeasementSystem() }

function makePolicy(overrides: Partial<AppeasementPolicy> = {}): AppeasementPolicy {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    appeasementType: 'territorial',
    concessionLevel: 40,
    peaceStability: 50,
    publicOpinion: 55,
    longTermRisk: 25,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('DiplomaticAppeasementSystem', () => {
  let sys: DiplomaticAppeasementSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── 1. 基础数据结构 ─────────────────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始 policies 为空数组', () => {
      expect((sys as any).policies).toHaveLength(0)
      expect(Array.isArray((sys as any).policies)).toBe(true)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入单条政策后 policies 长度为 1，字段正确', () => {
      ;(sys as any).policies.push(makePolicy({ id: 1, civIdA: 2, civIdB: 4 }))
      expect((sys as any).policies).toHaveLength(1)
      expect((sys as any).policies[0].civIdA).toBe(2)
      expect((sys as any).policies[0].civIdB).toBe(4)
    })

    it('注入多条政策后数量正确', () => {
      ;(sys as any).policies.push(makePolicy({ id: 1 }))
      ;(sys as any).policies.push(makePolicy({ id: 2 }))
      ;(sys as any).policies.push(makePolicy({ id: 3 }))
      expect((sys as any).policies).toHaveLength(3)
    })

    it('appeasementType 为 territorial 时字段正确', () => {
      ;(sys as any).policies.push(makePolicy({ appeasementType: 'territorial' }))
      expect((sys as any).policies[0].appeasementType).toBe('territorial')
    })

    it('appeasementType 为 economic 时字段正确', () => {
      ;(sys as any).policies.push(makePolicy({ appeasementType: 'economic' }))
      expect((sys as any).policies[0].appeasementType).toBe('economic')
    })

    it('appeasementType 为 military 时字段正确', () => {
      ;(sys as any).policies.push(makePolicy({ appeasementType: 'military' }))
      expect((sys as any).policies[0].appeasementType).toBe('military')
    })

    it('appeasementType 为 symbolic 时字段正确', () => {
      ;(sys as any).policies.push(makePolicy({ appeasementType: 'symbolic' }))
      expect((sys as any).policies[0].appeasementType).toBe('symbolic')
    })
  })

  // ─── 2. CHECK_INTERVAL 节流 ─────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick < CHECK_INTERVAL 时 update 直接返回，lastCheck 不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick === CHECK_INTERVAL 时 update 执行，lastCheck 更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick > CHECK_INTERVAL 时 lastCheck 更新为当前 tick', () => {
      const tick = CHECK_INTERVAL + 200
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, tick)
      expect((sys as any).lastCheck).toBe(tick)
    })

    it('第一次触发后，差值不足时不重复执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const prevCheck = (sys as any).lastCheck
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(prevCheck)
    })

    it('第一次触发后，差值足够时再次执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const secondTick = CHECK_INTERVAL * 2
      sys.update(1, {} as any, {} as any, secondTick)
      expect((sys as any).lastCheck).toBe(secondTick)
    })
  })

  // ─── 3. 数值字段动态更新 ─────────────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次 update 后 duration +1', () => {
      ;(sys as any).policies.push(makePolicy({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).policies[0].duration).toBe(1)
    })

    it('多次 update 后 duration 累加', () => {
      ;(sys as any).policies.push(makePolicy({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
      expect((sys as any).policies[0].duration).toBe(2)
    })

    it('concessionLevel 保持在 [5, 80] 范围内', () => {
      ;(sys as any).policies.push(makePolicy({ concessionLevel: 40, tick: 0 }))
      for (let i = 1; i <= 10; i++) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).policies[0].concessionLevel
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(80)
    })

    it('peaceStability 保持在 [10, 85] 范围内', () => {
      ;(sys as any).policies.push(makePolicy({ peaceStability: 50, tick: 0 }))
      for (let i = 1; i <= 10; i++) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).policies[0].peaceStability
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(85)
    })

    it('publicOpinion 保持在 [10, 90] 范围内', () => {
      ;(sys as any).policies.push(makePolicy({ publicOpinion: 55, tick: 0 }))
      for (let i = 1; i <= 10; i++) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).policies[0].publicOpinion
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(90)
    })

    it('longTermRisk 保持在 [5, 70] 范围内', () => {
      ;(sys as any).policies.push(makePolicy({ longTermRisk: 25, tick: 0 }))
      for (let i = 1; i <= 10; i++) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).policies[0].longTermRisk
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(70)
    })
  })

  // ─── 4. time-based 过期清理 ────────────────────────────────────────────────
  describe('time-based 过期清理', () => {
    it('tick=0 的记录在 bigTick=90000 时被删除', () => {
      ;(sys as any).policies.push(makePolicy({ id: 1, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).policies).toHaveLength(0)
    })

    it('cutoff 边界：policy.tick 等于 cutoff 时不删除', () => {
      const bigTick = 100000
      const cutoff = bigTick - EXPIRE_OFFSET  // 20000
      ;(sys as any).policies.push(makePolicy({ id: 1, tick: cutoff }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      // cutoff = 20000, policy.tick = 20000 => 20000 < 20000 为 false，不删除
      expect((sys as any).policies).toHaveLength(1)
    })

    it('policy.tick 比 cutoff 小 1 时被删除', () => {
      const bigTick = 100000
      const cutoff = bigTick - EXPIRE_OFFSET  // 20000
      ;(sys as any).policies.push(makePolicy({ id: 1, tick: cutoff - 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).policies).toHaveLength(0)
    })

    it('较新的记录在相同 update 中不被删除', () => {
      ;(sys as any).policies.push(makePolicy({ id: 1, tick: 50000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 90000)
      // cutoff = 90000 - 80000 = 10000，50000 >= 10000 不删
      expect((sys as any).policies).toHaveLength(1)
    })

    it('混合记录：过期的删除，未过期的保留', () => {
      ;(sys as any).policies.push(makePolicy({ id: 1, tick: 0 }))
      ;(sys as any).policies.push(makePolicy({ id: 2, tick: 50000 }))
      ;(sys as any).policies.push(makePolicy({ id: 3, tick: 500 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 90000)
      const remaining = (sys as any).policies
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })

    it('所有记录都未过期时全部保留', () => {
      ;(sys as any).policies.push(makePolicy({ id: 1, tick: 80000 }))
      ;(sys as any).policies.push(makePolicy({ id: 2, tick: 85000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).policies).toHaveLength(2)
    })
  })

  // ─── 5. MAX_POLICIES 上限控制 ─────────────────────────────────────────────
  describe('MAX_POLICIES 上限控制', () => {
    it('达到 MAX_POLICIES 上限时，random 低也不新增', () => {
      for (let i = 0; i < MAX_POLICIES; i++) {
        ;(sys as any).policies.push(makePolicy({ id: i + 1, tick: 999999 }))
      }
      expect((sys as any).policies).toHaveLength(MAX_POLICIES)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).policies).toHaveLength(MAX_POLICIES)
    })

    it('未达到上限时，random 极低可触发新增', () => {
      for (let i = 0; i < MAX_POLICIES - 1; i++) {
        ;(sys as any).policies.push(makePolicy({ id: i + 1, tick: 999999 }))
      }
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom
        .mockReturnValueOnce(0.001)   // < TREATY_CHANCE → 触发创建
        .mockReturnValueOnce(0)       // civA = 1
        .mockReturnValueOnce(0.5)     // civB = 5 (不同)
        .mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).policies.length).toBeLessThanOrEqual(MAX_POLICIES)
    })

    it('连续触发 update 时 policies 数量不超过 MAX_POLICIES', () => {
      for (let i = 0; i < MAX_POLICIES; i++) {
        ;(sys as any).policies.push(makePolicy({ id: i + 1, tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let tick = CHECK_INTERVAL; tick <= CHECK_INTERVAL * 5; tick += CHECK_INTERVAL) {
        sys.update(1, {} as any, {} as any, tick)
      }
      expect((sys as any).policies.length).toBeLessThanOrEqual(MAX_POLICIES)
    })
  })
})
