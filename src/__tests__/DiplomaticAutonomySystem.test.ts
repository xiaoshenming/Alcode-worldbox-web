import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAutonomySystem, AutonomyAgreement, AutonomyForm } from '../systems/DiplomaticAutonomySystem'

const CHECK_INTERVAL = 2530
const MAX_AGREEMENTS = 16
const EXPIRE_OFFSET = 89000

function makeSys() { return new DiplomaticAutonomySystem() }

function makeAgreement(overrides: Partial<AutonomyAgreement> = {}): AutonomyAgreement {
  return {
    id: 1,
    grantorCivId: 1,
    autonomousCivId: 2,
    form: 'administrative_autonomy',
    selfGovLevel: 50,
    complianceRate: 40,
    freedomIndex: 35,
    stabilityFactor: 25,
    duration: 0,
    tick: 10000,
    ...overrides,
  }
}

describe('DiplomaticAutonomySystem', () => {
  let sys: DiplomaticAutonomySystem

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
    it('初始agreements为空数组', () => {
      expect((sys as any).agreements).toHaveLength(0)
      expect(Array.isArray((sys as any).agreements)).toBe(true)
    })

    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入单条记录后agreements长度为1', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1 }))
      expect((sys as any).agreements).toHaveLength(1)
      expect((sys as any).agreements[0].id).toBe(1)
    })

    it('注入多条记录后agreements长度正确', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1 }))
      ;(sys as any).agreements.push(makeAgreement({ id: 2, grantorCivId: 3, autonomousCivId: 4 }))
      ;(sys as any).agreements.push(makeAgreement({ id: 3, grantorCivId: 5, autonomousCivId: 6 }))
      expect((sys as any).agreements).toHaveLength(3)
    })

    it('支持 administrative_autonomy 表单类型', () => {
      const a = makeAgreement({ form: 'administrative_autonomy' })
      expect(a.form).toBe('administrative_autonomy')
    })

    it('支持 fiscal_independence 表单类型', () => {
      const a = makeAgreement({ form: 'fiscal_independence' })
      expect(a.form).toBe('fiscal_independence')
    })

    it('支持 judicial_sovereignty 表单类型', () => {
      const a = makeAgreement({ form: 'judicial_sovereignty' })
      expect(a.form).toBe('judicial_sovereignty')
    })

    it('支持 legislative_freedom 表单类型', () => {
      const a = makeAgreement({ form: 'legislative_freedom' })
      expect(a.form).toBe('legislative_freedom')
    })

    it('agreement包含所有必需字段', () => {
      const a = makeAgreement()
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('grantorCivId')
      expect(a).toHaveProperty('autonomousCivId')
      expect(a).toHaveProperty('form')
      expect(a).toHaveProperty('selfGovLevel')
      expect(a).toHaveProperty('complianceRate')
      expect(a).toHaveProperty('freedomIndex')
      expect(a).toHaveProperty('stabilityFactor')
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
      const lenBefore = (sys as any).agreements.length
      sys.update(1, {} as any, {} as any, tick2)
      expect((sys as any).agreements.length).toBe(lenBefore)
    })

    it('tick差值等于CHECK_INTERVAL时执行update（lastCheck更新）', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick差值超过CHECK_INTERVAL时lastCheck被更新', () => {
      const bigTick = CHECK_INTERVAL * 2
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).lastCheck).toBe(bigTick)
    })

    it('连续调用第一次通过第二次节流', () => {
      const tick1 = CHECK_INTERVAL + 10
      sys.update(1, {} as any, {} as any, tick1)
      const lastCheck1 = (sys as any).lastCheck
      sys.update(1, {} as any, {} as any, tick1 + 1)
      expect((sys as any).lastCheck).toBe(lastCheck1)
    })

    it('节流期间不对现有agreements执行duration更新', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, duration: 3 }))
      const tick1 = CHECK_INTERVAL + 1
      sys.update(1, {} as any, {} as any, tick1)
      const dur1 = (sys as any).agreements[0].duration
      sys.update(1, {} as any, {} as any, tick1 + CHECK_INTERVAL - 1)
      const dur2 = (sys as any).agreements[0].duration
      expect(dur2).toBe(dur1)
    })
  })

  // ─────────────────────────────────────────
  // 3. 数值字段动态更新
  // ─────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次update后duration递增1', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, duration: 0 }))
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements[0].duration).toBe(1)
    })

    it('多次update后duration累计递增', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, duration: 0 }))
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2 + 2)
      expect((sys as any).agreements[0].duration).toBe(2)
    })

    it('selfGovLevel不低于下限10', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, selfGovLevel: 10.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements[0].selfGovLevel).toBeGreaterThanOrEqual(10)
    })

    it('selfGovLevel不超过上限90', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, selfGovLevel: 89.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements[0].selfGovLevel).toBeLessThanOrEqual(90)
    })

    it('complianceRate不低于下限10', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, complianceRate: 10.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements[0].complianceRate).toBeGreaterThanOrEqual(10)
    })

    it('complianceRate不超过上限80', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, complianceRate: 79.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements[0].complianceRate).toBeLessThanOrEqual(80)
    })

    it('freedomIndex不低于下限5', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, freedomIndex: 5.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements[0].freedomIndex).toBeGreaterThanOrEqual(5)
    })

    it('freedomIndex不超过上限85', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, freedomIndex: 84.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements[0].freedomIndex).toBeLessThanOrEqual(85)
    })

    it('stabilityFactor不低于下限5', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, stabilityFactor: 5.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements[0].stabilityFactor).toBeGreaterThanOrEqual(5)
    })

    it('stabilityFactor不超过上限65', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, stabilityFactor: 64.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements[0].stabilityFactor).toBeLessThanOrEqual(65)
    })
  })

  // ─────────────────────────────────────────
  // 4. time-based 过期清理
  // ─────────────────────────────────────────
  describe('time-based 过期清理', () => {
    it('超期记录被删除（tick=0，bigTick>EXPIRE_OFFSET）', () => {
      ;(sys as any).agreements.push(makeAgreement({ id: 1, tick: 0 }))
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).agreements).toHaveLength(0)
    })

    it('未超期记录被保留', () => {
      // executeTick足够大通过节流，record.tick紧贴cutoff之后（不被删除）
      const executeTick = EXPIRE_OFFSET + CHECK_INTERVAL * 2
      // cutoff = executeTick - EXPIRE_OFFSET = CHECK_INTERVAL * 2
      // record.tick = cutoff（边界值：不满足 < cutoff，保留）
      const cutoff = executeTick - EXPIRE_OFFSET
      ;(sys as any).agreements.push(makeAgreement({ id: 1, tick: cutoff }))
      sys.update(1, {} as any, {} as any, executeTick)
      expect((sys as any).agreements).toHaveLength(1)
    })

    it('混合：过期的被删，未过期的保留', () => {
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 10000
      ;(sys as any).agreements.push(makeAgreement({ id: 1, tick: 0 }))           // 过期
      ;(sys as any).agreements.push(makeAgreement({ id: 2, tick: bigTick - 100 })) // 未过期
      sys.update(1, {} as any, {} as any, bigTick)
      const remaining = (sys as any).agreements
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })

    it('多条超期记录全部清除', () => {
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      for (let i = 0; i < 5; i++) {
        ;(sys as any).agreements.push(makeAgreement({ id: i + 1, tick: 0 }))
      }
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).agreements).toHaveLength(0)
    })

    it('正好在cutoff边界的记录不被删除', () => {
      const updateTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      const cutoff = updateTick - EXPIRE_OFFSET
      ;(sys as any).agreements.push(makeAgreement({ id: 1, tick: cutoff }))
      sys.update(1, {} as any, {} as any, updateTick)
      expect((sys as any).agreements).toHaveLength(1)
    })
  })

  // ─────────────────────────────────────────
  // 5. MAX_AGREEMENTS 上限
  // ─────────────────────────────────────────
  describe('MAX_AGREEMENTS 上限', () => {
    it('达到MAX_AGREEMENTS上限时不新增记录', () => {
      for (let i = 0; i < MAX_AGREEMENTS; i++) {
        ;(sys as any).agreements.push(makeAgreement({ id: i + 1, grantorCivId: i + 1, autonomousCivId: i + 9 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements.length).toBeLessThanOrEqual(MAX_AGREEMENTS)
    })

    it('未达上限且random满足时可新增记录', () => {
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom
        .mockReturnValueOnce(0.0001)  // < PROCEED_CHANCE(0.0022)
        .mockReturnValueOnce(0)       // grantor=1
        .mockReturnValueOnce(0.5)     // autonomous=5 (≠1)
        .mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements.length).toBeGreaterThanOrEqual(1)
    })

    it('random >= PROCEED_CHANCE时不新增记录', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements).toHaveLength(0)
    })

    it('MAX_AGREEMENTS-1条记录时random满足可新增到MAX', () => {
      for (let i = 0; i < MAX_AGREEMENTS - 1; i++) {
        ;(sys as any).agreements.push(makeAgreement({ id: i + 1, grantorCivId: i + 1, autonomousCivId: i + 9 }))
      }
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom
        .mockReturnValueOnce(0.0001)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0.5)
        .mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).agreements.length).toBeLessThanOrEqual(MAX_AGREEMENTS)
    })
  })
})
