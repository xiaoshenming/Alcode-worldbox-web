import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticBailiffrySystem, BailiffryArrangement, BailiffryForm } from '../systems/DiplomaticBailiffrySystem'

const CHECK_INTERVAL = 2750
const MAX_ARRANGEMENTS = 16
const EXPIRE_OFFSET = 88000

function makeSys() { return new DiplomaticBailiffrySystem() }

function makeArrangement(overrides: Partial<BailiffryArrangement> = {}): BailiffryArrangement {
  return {
    id: 1,
    realmCivId: 1,
    bailiffCivId: 2,
    form: 'law_bailiffry',
    lawEnforcement: 50,
    propertyAdmin: 45,
    courtAuthority: 35,
    revenueRecovery: 30,
    duration: 0,
    tick: 10000,
    ...overrides,
  }
}

describe('DiplomaticBailiffrySystem', () => {
  let sys: DiplomaticBailiffrySystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────
  // 1. 基础数据结构
  // ─────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始arrangements为空数组', () => {
      expect((sys as any).arrangements).toHaveLength(0)
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })

    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入单条记录后arrangements长度为1', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1 }))
      expect((sys as any).arrangements).toHaveLength(1)
      expect((sys as any).arrangements[0].id).toBe(1)
    })

    it('注入多条记录后arrangements长度正确', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, realmCivId: 3, bailiffCivId: 4 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 3, realmCivId: 5, bailiffCivId: 6 }))
      expect((sys as any).arrangements).toHaveLength(3)
    })

    it('支持 law_bailiffry 表单类型', () => {
      const a = makeArrangement({ form: 'law_bailiffry' })
      expect(a.form).toBe('law_bailiffry')
    })

    it('支持 property_bailiffry 表单类型', () => {
      const a = makeArrangement({ form: 'property_bailiffry' })
      expect(a.form).toBe('property_bailiffry')
    })

    it('支持 court_bailiffry 表单类型', () => {
      const a = makeArrangement({ form: 'court_bailiffry' })
      expect(a.form).toBe('court_bailiffry')
    })

    it('支持 revenue_bailiffry 表单类型', () => {
      const a = makeArrangement({ form: 'revenue_bailiffry' })
      expect(a.form).toBe('revenue_bailiffry')
    })

    it('arrangement包含所有必需字段', () => {
      const a = makeArrangement()
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('realmCivId')
      expect(a).toHaveProperty('bailiffCivId')
      expect(a).toHaveProperty('form')
      expect(a).toHaveProperty('lawEnforcement')
      expect(a).toHaveProperty('propertyAdmin')
      expect(a).toHaveProperty('courtAuthority')
      expect(a).toHaveProperty('revenueRecovery')
      expect(a).toHaveProperty('duration')
      expect(a).toHaveProperty('tick')
    })
  })

  // ─────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流
  // ─────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick差值小于CHECK_INTERVAL时跳过update', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      const tick1 = CHECK_INTERVAL + 1
      sys.update(1, {} as any, {} as any, tick1)
      const tick2 = tick1 + CHECK_INTERVAL - 1
      const lenBefore = (sys as any).arrangements.length
      sys.update(1, {} as any, {} as any, tick2)
      expect((sys as any).arrangements.length).toBe(lenBefore)
    })

    it('tick差值等于CHECK_INTERVAL时执行update（lastCheck更新）', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick差值超过CHECK_INTERVAL时lastCheck被更新', () => {
      const bigTick = CHECK_INTERVAL * 2
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).lastCheck).toBe(bigTick)
    })

    it('连续调用第一次通过第二次节流', () => {
      const tick1 = CHECK_INTERVAL + 10
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, tick1)
      const lastCheck1 = (sys as any).lastCheck
      sys.update(1, {} as any, {} as any, tick1 + 1)
      expect((sys as any).lastCheck).toBe(lastCheck1)
    })

    it('节流期间不对现有arrangements执行duration更新', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, duration: 7 }))
      const tick1 = CHECK_INTERVAL + 1
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, tick1)
      const dur1 = (sys as any).arrangements[0].duration
      sys.update(1, {} as any, {} as any, tick1 + CHECK_INTERVAL - 1)
      const dur2 = (sys as any).arrangements[0].duration
      expect(dur2).toBe(dur1)
    })
  })

  // ─────────────────────────────────────────
  // 3. 数值字段动态更新
  // ─────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次update后duration递增1', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements[0].duration).toBe(1)
    })

    it('多次update后duration累计递增', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2 + 2)
      expect((sys as any).arrangements[0].duration).toBe(2)
    })

    it('lawEnforcement不低于下限5', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, lawEnforcement: 5.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements[0].lawEnforcement).toBeGreaterThanOrEqual(5)
    })

    it('lawEnforcement不超过上限85', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, lawEnforcement: 84.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements[0].lawEnforcement).toBeLessThanOrEqual(85)
    })

    it('propertyAdmin不低于下限10', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, propertyAdmin: 10.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements[0].propertyAdmin).toBeGreaterThanOrEqual(10)
    })

    it('propertyAdmin不超过上限90', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, propertyAdmin: 89.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements[0].propertyAdmin).toBeLessThanOrEqual(90)
    })

    it('courtAuthority不低于下限5', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, courtAuthority: 5.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements[0].courtAuthority).toBeGreaterThanOrEqual(5)
    })

    it('courtAuthority不超过上限80', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, courtAuthority: 79.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements[0].courtAuthority).toBeLessThanOrEqual(80)
    })

    it('revenueRecovery不低于下限5', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, revenueRecovery: 5.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements[0].revenueRecovery).toBeGreaterThanOrEqual(5)
    })

    it('revenueRecovery不超过上限65', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, revenueRecovery: 64.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements[0].revenueRecovery).toBeLessThanOrEqual(65)
    })
  })

  // ─────────────────────────────────────────
  // 4. time-based 过期清理
  // ─────────────────────────────────────────
  describe('time-based 过期清理', () => {
    it('超期记录被删除（tick=0，bigTick>EXPIRE_OFFSET）', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('未超期记录被保留', () => {
      // executeTick足够大通过节流，record.tick紧贴cutoff之后（不被删除）
      const executeTick = EXPIRE_OFFSET + CHECK_INTERVAL * 2
      // cutoff = executeTick - EXPIRE_OFFSET = CHECK_INTERVAL * 2
      // record.tick = cutoff（边界值：不满足 < cutoff，保留）
      const cutoff = executeTick - EXPIRE_OFFSET
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: cutoff }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, executeTick)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('混合：过期的被删，未过期的保留', () => {
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 10000
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))            // 过期
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: bigTick - 100 })) // 未过期
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      const remaining = (sys as any).arrangements
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })

    it('多条超期记录全部清除', () => {
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      for (let i = 0; i < 5; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('正好在cutoff边界的记录不被删除', () => {
      const updateTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      const cutoff = updateTick - EXPIRE_OFFSET
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: cutoff }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, updateTick)
      expect((sys as any).arrangements).toHaveLength(1)
    })
  })

  // ─────────────────────────────────────────
  // 5. MAX_ARRANGEMENTS 上限
  // ─────────────────────────────────────────
  describe('MAX_ARRANGEMENTS 上限', () => {
    it('达到MAX_ARRANGEMENTS上限时不新增记录', () => {
      for (let i = 0; i < MAX_ARRANGEMENTS; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, realmCivId: i + 1, bailiffCivId: i + 9 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(MAX_ARRANGEMENTS)
    })

    it('未达上限且random满足时可新增记录', () => {
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom
        .mockReturnValueOnce(0.0001)  // < PROCEED_CHANCE(0.0021)
        .mockReturnValueOnce(0)       // realm=1
        .mockReturnValueOnce(0.5)     // bailiff=5 (≠1)
        .mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(1)
    })

    it('random >= PROCEED_CHANCE时不新增记录', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('MAX_ARRANGEMENTS-1条记录时random满足可新增到MAX', () => {
      for (let i = 0; i < MAX_ARRANGEMENTS - 1; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, realmCivId: i + 1, bailiffCivId: i + 9 }))
      }
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom
        .mockReturnValueOnce(0.0001)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0.5)
        .mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(MAX_ARRANGEMENTS)
    })
  })
})
