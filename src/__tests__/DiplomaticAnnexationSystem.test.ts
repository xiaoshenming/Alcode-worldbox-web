import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAnnexationSystem, AnnexationTreaty, AnnexationType } from '../systems/DiplomaticAnnexationSystem'

const CHECK_INTERVAL = 2600
const MAX_TREATIES = 20
const EXPIRE_OFFSET = 85000

function makeSys() { return new DiplomaticAnnexationSystem() }

function makeTreaty(overrides: Partial<AnnexationTreaty> = {}): AnnexationTreaty {
  return {
    id: 1,
    annexerCivId: 1,
    targetCivId: 2,
    annexationType: 'peaceful',
    territorySize: 30,
    territoryTransferred: 0,
    legitimacy: 70,
    resistance: 20,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('DiplomaticAnnexationSystem', () => {
  let sys: DiplomaticAnnexationSystem

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

    it('注入单条协议后 treaties 长度为 1，字段正确', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1, annexerCivId: 3, targetCivId: 5 }))
      expect((sys as any).treaties).toHaveLength(1)
      expect((sys as any).treaties[0].annexerCivId).toBe(3)
      expect((sys as any).treaties[0].targetCivId).toBe(5)
    })

    it('注入多条协议后数量正确', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 2 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 3 }))
      expect((sys as any).treaties).toHaveLength(3)
    })

    it('annexationType 为 peaceful 时字段正确', () => {
      ;(sys as any).treaties.push(makeTreaty({ annexationType: 'peaceful' }))
      expect((sys as any).treaties[0].annexationType).toBe('peaceful')
    })

    it('annexationType 为 coerced 时字段正确', () => {
      ;(sys as any).treaties.push(makeTreaty({ annexationType: 'coerced' }))
      expect((sys as any).treaties[0].annexationType).toBe('coerced')
    })

    it('annexationType 为 negotiated 时字段正确', () => {
      ;(sys as any).treaties.push(makeTreaty({ annexationType: 'negotiated' }))
      expect((sys as any).treaties[0].annexationType).toBe('negotiated')
    })

    it('annexationType 为 referendum 时字段正确', () => {
      ;(sys as any).treaties.push(makeTreaty({ annexationType: 'referendum' }))
      expect((sys as any).treaties[0].annexationType).toBe('referendum')
    })

    it('territoryTransferred 初始为 0', () => {
      ;(sys as any).treaties.push(makeTreaty({ territoryTransferred: 0, territorySize: 20 }))
      expect((sys as any).treaties[0].territoryTransferred).toBe(0)
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

    it('tick > CHECK_INTERVAL 时 lastCheck 更新为当前 tick', () => {
      const tick = CHECK_INTERVAL + 500
      sys.update(1, {} as any, {} as any, tick)
      expect((sys as any).lastCheck).toBe(tick)
    })

    it('第一次触发后，差值不足时不重复执行', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const prevCheck = (sys as any).lastCheck
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(prevCheck)
    })

    it('第一次触发后，差值足够时再次执行', () => {
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

    it('legitimacy 保持在 [5, 100] 范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ legitimacy: 50, tick: 0 }))
      for (let i = 1; i <= 10; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).treaties[0].legitimacy
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(100)
    })

    it('resistance 保持在 [0, 100] 范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ resistance: 50, tick: 0 }))
      for (let i = 1; i <= 10; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).treaties[0].resistance
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    })

    it('territoryTransferred 不超过 territorySize', () => {
      ;(sys as any).treaties.push(makeTreaty({ territorySize: 5, territoryTransferred: 5, legitimacy: 100, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 < 100*0.003=0.3 → 触发转让
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).treaties[0].territoryTransferred).toBeLessThanOrEqual(5)
    })
  })

  // ─── 4. time-based 过期清理 ────────────────────────────────────────────────
  describe('time-based 过期清理', () => {
    it('tick=0 的记录在 bigTick=90000 时被删除', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).treaties).toHaveLength(0)
    })

    it('cutoff 边界：treaty.tick 等于 cutoff 时不删除', () => {
      const bigTick = 100000
      const cutoff = bigTick - EXPIRE_OFFSET  // 15000
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: cutoff }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(1)
    })

    it('treaty.tick 比 cutoff 小 1 时被删除', () => {
      const bigTick = 100000
      const cutoff = bigTick - EXPIRE_OFFSET  // 15000
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: cutoff - 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(0)
    })

    it('较新的记录在相同 update 中不被删除', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: 60000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 90000)
      // cutoff = 90000 - 85000 = 5000，60000 >= 5000 不删
      expect((sys as any).treaties).toHaveLength(1)
    })

    it('混合记录：过期的删除，未过期的保留', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: 0 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 2, tick: 60000 }))
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
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom
        .mockReturnValueOnce(0.001)   // < TREATY_CHANCE → 触发创建
        .mockReturnValueOnce(0)       // annexer = 1
        .mockReturnValueOnce(0.5)     // target = 5 (不同)
        .mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).treaties.length).toBeLessThanOrEqual(MAX_TREATIES)
    })

    it('连续触发 update 时 treaties 数量不超过 MAX_TREATIES', () => {
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
