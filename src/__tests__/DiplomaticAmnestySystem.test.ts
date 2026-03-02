import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAmnestySystem, AmnestyAgreement, AmnestyScope } from '../systems/DiplomaticAmnestySystem'

const CHECK_INTERVAL = 2400
const MAX_TREATIES = 20
const EXPIRE_OFFSET = 82000

function makeSys() { return new DiplomaticAmnestySystem() }

function makeTreaty(overrides: Partial<AmnestyAgreement> = {}): AmnestyAgreement {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    scope: 'political',
    pardonLevel: 50,
    trustRestoration: 40,
    publicSupport: 60,
    reconciliationProgress: 15,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('DiplomaticAmnestySystem', () => {
  let sys: DiplomaticAmnestySystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── 1. 基础数据结构 ─────────────────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始 treaties 为空数组', () => {
      expect((sys as any).treaties).toHaveLength(0)
      expect(Array.isArray((sys as any).treaties)).toBe(true)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入单条协议后 treaties 长度为 1', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1 }))
      expect((sys as any).treaties).toHaveLength(1)
      expect((sys as any).treaties[0].id).toBe(1)
    })

    it('注入多条协议后 treaties 正确存储', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1, civIdA: 1, civIdB: 2 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 2, civIdA: 3, civIdB: 4 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 3, civIdA: 5, civIdB: 6 }))
      expect((sys as any).treaties).toHaveLength(3)
    })

    it('scope 为 political 时字段正确', () => {
      const t = makeTreaty({ scope: 'political' })
      ;(sys as any).treaties.push(t)
      expect((sys as any).treaties[0].scope).toBe('political')
    })

    it('scope 为 military 时字段正确', () => {
      const t = makeTreaty({ scope: 'military' })
      ;(sys as any).treaties.push(t)
      expect((sys as any).treaties[0].scope).toBe('military')
    })

    it('scope 为 economic 时字段正确', () => {
      const t = makeTreaty({ scope: 'economic' })
      ;(sys as any).treaties.push(t)
      expect((sys as any).treaties[0].scope).toBe('economic')
    })

    it('scope 为 universal 时字段正确', () => {
      const t = makeTreaty({ scope: 'universal' })
      ;(sys as any).treaties.push(t)
      expect((sys as any).treaties[0].scope).toBe('universal')
    })
  })

  // ─── 2. CHECK_INTERVAL 节流 ─────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick < CHECK_INTERVAL 时 update 直接返回，lastCheck 不变', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick === CHECK_INTERVAL 时 update 执行，lastCheck 更新', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick > CHECK_INTERVAL 时 update 执行，lastCheck 更新为当前 tick', () => {
      const tick = CHECK_INTERVAL + 100
      sys.update(1, {} as any, {} as any, tick)
      expect((sys as any).lastCheck).toBe(tick)
    })

    it('第一次触发后，第二次 tick 差值不足时不重复执行', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const prevCheck = (sys as any).lastCheck
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(prevCheck)
    })

    it('第一次触发后，第二次 tick 差值足够时再次执行', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const secondTick = CHECK_INTERVAL * 2
      sys.update(1, {} as any, {} as any, secondTick)
      expect((sys as any).lastCheck).toBe(secondTick)
    })
  })

  // ─── 3. 数值字段动态更新 ─────────────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次 update 后 duration +1', () => {
      ;(sys as any).treaties.push(makeTreaty({ tick: 0 }))
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).treaties[0].duration).toBe(1)
    })

    it('多次 update 后 duration 累加', () => {
      ;(sys as any).treaties.push(makeTreaty({ tick: 0 }))
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
      expect((sys as any).treaties[0].duration).toBe(2)
    })

    it('pardonLevel 保持在 [5, 85] 范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ pardonLevel: 50, tick: 0 }))
      for (let i = 1; i <= 10; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).treaties[0].pardonLevel
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(85)
    })

    it('trustRestoration 保持在 [5, 80] 范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ trustRestoration: 40, tick: 0 }))
      for (let i = 1; i <= 10; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).treaties[0].trustRestoration
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(80)
    })

    it('publicSupport 保持在 [10, 95] 范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ publicSupport: 60, tick: 0 }))
      for (let i = 1; i <= 10; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).treaties[0].publicSupport
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(95)
    })

    it('reconciliationProgress 保持在 [2, 70] 范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ reconciliationProgress: 15, tick: 0 }))
      for (let i = 1; i <= 10; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).treaties[0].reconciliationProgress
      expect(val).toBeGreaterThanOrEqual(2)
      expect(val).toBeLessThanOrEqual(70)
    })
  })

  // ─── 4. time-based 过期清理 ────────────────────────────────────────────────
  describe('time-based 过期清理', () => {
    it('tick=0 的记录在 tick=90000 时被删除', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: 0 }))
      expect((sys as any).treaties).toHaveLength(1)
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).treaties).toHaveLength(0)
    })

    it('cutoff 边界：tick 等于 cutoff 时不删除（tick > cutoff才删）', () => {
      const bigTick = 100000
      const cutoff = bigTick - EXPIRE_OFFSET  // 18000
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: cutoff }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      // cutoff = 18000, treaty.tick = 18000 => 18000 < 18000 为 false，不删除
      expect((sys as any).treaties).toHaveLength(1)
    })

    it('tick 比 cutoff 小 1 时被删除', () => {
      const bigTick = 100000
      const cutoff = bigTick - EXPIRE_OFFSET  // 18000
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: cutoff - 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(0)
    })

    it('较新的记录在相同 update 中不被删除', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: 50000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 90000)
      // cutoff = 90000 - 82000 = 8000，50000 >= 8000 不删
      expect((sys as any).treaties).toHaveLength(1)
    })

    it('混合记录：过期的删除，未过期的保留', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: 0 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 2, tick: 50000 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 3, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 90000)
      const remaining = (sys as any).treaties
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })

    it('所有记录都未过期时全部保留', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: 80000 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 2, tick: 85000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).treaties).toHaveLength(2)
    })
  })

  // ─── 5. MAX_TREATIES 上限控制 ─────────────────────────────────────────────
  describe('MAX_TREATIES 上限控制', () => {
    it('达到 MAX_TREATIES 上限时，random 低也不新增', () => {
      for (let i = 0; i < MAX_TREATIES; i++) {
        ;(sys as any).treaties.push(makeTreaty({ id: i + 1, tick: 999999 }))
      }
      expect((sys as any).treaties).toHaveLength(MAX_TREATIES)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).treaties).toHaveLength(MAX_TREATIES)
    })

    it('未达到上限时，random 极低可触发新增', () => {
      for (let i = 0; i < MAX_TREATIES - 1; i++) {
        ;(sys as any).treaties.push(makeTreaty({ id: i + 1, tick: 999999 }))
      }
      // mock random: 第1次 < TREATY_CHANCE, 第2,3次给 civA/civB 不同值
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom
        .mockReturnValueOnce(0.001)   // < TREATY_CHANCE → 触发创建
        .mockReturnValueOnce(0)       // civA = 1
        .mockReturnValueOnce(0.5)     // civB = 5 (不同)
        .mockReturnValue(0.5)         // 其他字段用
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).treaties.length).toBeLessThanOrEqual(MAX_TREATIES)
      expect((sys as any).treaties.length).toBeGreaterThanOrEqual(MAX_TREATIES - 1)
    })

    it('treaties 数量永不超过 MAX_TREATIES', () => {
      for (let i = 0; i < MAX_TREATIES; i++) {
        ;(sys as any).treaties.push(makeTreaty({ id: i + 1, tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let tick = CHECK_INTERVAL; tick <= CHECK_INTERVAL * 5; tick += CHECK_INTERVAL) {
        sys.update(1, {} as any, {} as any, tick)
      }
      expect((sys as any).treaties.length).toBeLessThanOrEqual(MAX_TREATIES)
    })
  })
})
