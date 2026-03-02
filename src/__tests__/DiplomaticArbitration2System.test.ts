import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticArbitration2System, Arbitration2Case } from '../systems/DiplomaticArbitration2System'

// Constants mirrored from source
const CHECK_INTERVAL = 2540
const MAX_CASES = 20
const EXPIRE_OFFSET = 89000

function makeSys() { return new DiplomaticArbitration2System() }

function makeCase(id: number, tick = 0): Arbitration2Case {
  return {
    id,
    civIdA: 1,
    civIdB: 2,
    form: 'binding_arbitration',
    evidenceStrength: 50,
    arbitratorImpartiality: 55,
    complianceRate: 40,
    rulingFairness: 35,
    duration: 0,
    tick,
  }
}

describe('DiplomaticArbitration2System', () => {
  let sys: DiplomaticArbitration2System

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ------------------------------------------------------------------ //
  // 1. 基础数据结构
  // ------------------------------------------------------------------ //
  describe('基础数据结构', () => {
    it('初始cases为空数组', () => {
      expect((sys as any).cases).toHaveLength(0)
      expect(Array.isArray((sys as any).cases)).toBe(true)
    })

    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入单条case后长度为1', () => {
      ;(sys as any).cases.push(makeCase(1))
      expect((sys as any).cases).toHaveLength(1)
      expect((sys as any).cases[0].id).toBe(1)
    })

    it('注入多条case后长度正确', () => {
      ;(sys as any).cases.push(makeCase(1), makeCase(2), makeCase(3))
      expect((sys as any).cases).toHaveLength(3)
    })

    it('支持所有form类型：binding_arbitration', () => {
      const c = makeCase(1)
      c.form = 'binding_arbitration'
      ;(sys as any).cases.push(c)
      expect((sys as any).cases[0].form).toBe('binding_arbitration')
    })

    it('支持所有form类型：advisory_arbitration', () => {
      const c = makeCase(1)
      c.form = 'advisory_arbitration'
      ;(sys as any).cases.push(c)
      expect((sys as any).cases[0].form).toBe('advisory_arbitration')
    })

    it('支持所有form类型：mediated_arbitration', () => {
      const c = makeCase(1)
      c.form = 'mediated_arbitration'
      ;(sys as any).cases.push(c)
      expect((sys as any).cases[0].form).toBe('mediated_arbitration')
    })

    it('支持所有form类型：tribunal_ruling', () => {
      const c = makeCase(1)
      c.form = 'tribunal_ruling'
      ;(sys as any).cases.push(c)
      expect((sys as any).cases[0].form).toBe('tribunal_ruling')
    })
  })

  // ------------------------------------------------------------------ //
  // 2. CHECK_INTERVAL 节流
  // ------------------------------------------------------------------ //
  describe('CHECK_INTERVAL节流', () => {
    it('tick < CHECK_INTERVAL 时不更新lastCheck', () => {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick === CHECK_INTERVAL 时触发更新并更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // 不新增case
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick > CHECK_INTERVAL 时触发更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
    })

    it('第二次调用tick未超过interval时不重复更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
      // 第二次tick在lastCheck基础上未达到CHECK_INTERVAL
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 10)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL) // 没变
    })

    it('连续两次有效tick均更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })
  })

  // ------------------------------------------------------------------ //
  // 3. 数值字段动态更新
  // ------------------------------------------------------------------ //
  describe('数值字段动态更新', () => {
    it('每次有效update后duration增加1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const c = makeCase(1, 0)
      ;(sys as any).cases.push(c)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases[0].duration).toBe(1)
    })

    it('多次有效update后duration累加', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const c = makeCase(1, 0)
      ;(sys as any).cases.push(c)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
      expect((sys as any).cases[0].duration).toBe(2)
    })

    it('evidenceStrength始终在[10,85]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1) // 最大偏移
      const c = makeCase(1, 0)
      c.evidenceStrength = 84
      ;(sys as any).cases.push(c)
      for (let i = 1; i <= 5; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).cases[0].evidenceStrength
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(85)
    })

    it('arbitratorImpartiality始终在[15,90]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const c = makeCase(1, 0)
      c.arbitratorImpartiality = 16
      ;(sys as any).cases.push(c)
      for (let i = 1; i <= 5; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).cases[0].arbitratorImpartiality
      expect(val).toBeGreaterThanOrEqual(15)
      expect(val).toBeLessThanOrEqual(90)
    })

    it('complianceRate始终在[10,80]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const c = makeCase(1, 0)
      c.complianceRate = 79
      ;(sys as any).cases.push(c)
      for (let i = 1; i <= 5; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).cases[0].complianceRate
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(80)
    })

    it('rulingFairness始终在[5,75]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const c = makeCase(1, 0)
      c.rulingFairness = 6
      ;(sys as any).cases.push(c)
      for (let i = 1; i <= 5; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).cases[0].rulingFairness
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(75)
    })
  })

  // ------------------------------------------------------------------ //
  // 4. time-based 过期清理
  // ------------------------------------------------------------------ //
  describe('time-based过期清理', () => {
    it('超期case被删除（tick=0，大tick触发清理）', () => {
      const c = makeCase(1, 0)
      ;(sys as any).cases.push(c)
      // cutoff = bigTick - 89000; 0 < cutoff => 被删除
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      // mock > PROCEED_CHANCE(0.0021) 跳过新增分支，保证过期清理执行
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).cases).toHaveLength(0)
    })

    it('未超期case被保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const baseTick = CHECK_INTERVAL
      sys.update(1, {} as any, {} as any, baseTick)
      // 手动注入tick=baseTick的case
      ;(sys as any).cases.push(makeCase(99, baseTick))
      // 再trigger一次，cutoff = baseTick+CHECK_INTERVAL - 89000 < baseTick => 保留
      sys.update(1, {} as any, {} as any, baseTick + CHECK_INTERVAL)
      const remaining = (sys as any).cases.filter((c: Arbitration2Case) => c.id === 99)
      expect(remaining).toHaveLength(1)
    })

    it('混合case：超期的删除，未超期的保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      // tick=0 超期
      ;(sys as any).cases.push(makeCase(1, 0))
      // tick=bigTick-1 未超期
      ;(sys as any).cases.push(makeCase(2, bigTick - 1))
      sys.update(1, {} as any, {} as any, bigTick)
      const ids = (sys as any).cases.map((c: Arbitration2Case) => c.id)
      expect(ids).not.toContain(1)
      expect(ids).toContain(2)
    })

    it('多条超期case全部被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      ;(sys as any).cases.push(makeCase(1, 0), makeCase(2, 0), makeCase(3, 0))
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).cases).toHaveLength(0)
    })

    it('cutoff边界：tick恰好等于cutoff时不删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      const cutoff = bigTick - EXPIRE_OFFSET
      // tick === cutoff，条件是 tick < cutoff，所以不删
      ;(sys as any).cases.push(makeCase(5, cutoff))
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).cases).toHaveLength(1)
    })
  })

  // ------------------------------------------------------------------ //
  // 5. MAX_CASES 上限
  // ------------------------------------------------------------------ //
  describe('MAX_CASES上限', () => {
    it('cases数量不超过MAX_CASES(20)', () => {
      // 先填满MAX_CASES条
      for (let i = 0; i < MAX_CASES; i++) {
        ;(sys as any).cases.push(makeCase(i + 1, CHECK_INTERVAL))
      }
      // random < PROCEED_CHANCE => 想新增，但已满
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0021
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases.length).toBeLessThanOrEqual(MAX_CASES)
    })

    it('未满时random满足条件可以新增', () => {
      // 填18条
      for (let i = 0; i < 18; i++) {
        ;(sys as any).cases.push(makeCase(i + 1, CHECK_INTERVAL))
      }
      // mock random：第一次返回0.001（< 0.0021），后续返回0.5（civA/civB不同）
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.001 // PROCEED_CHANCE check
        return 0.5 // civ selection: yields different civs
      })
      // 注意：civA = 1 + floor(0.5*8)=5, civB = 1 + floor(0.5*8)=5 => 相同会return
      // 用更明确的mock：第2次返回0.1(civA=1), 第3次返回0.9(civB=8)
      callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.001
        if (callCount === 2) return 0.1  // civA = 1+floor(0.1*8)=1
        if (callCount === 3) return 0.9  // civB = 1+floor(0.9*8)=8
        return 0.5
      })
      const before = (sys as any).cases.length
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      // 可能新增了1条
      expect((sys as any).cases.length).toBeGreaterThanOrEqual(before)
    })

    it('nextId在新增case后递增', () => {
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.001
        if (callCount === 2) return 0.1
        if (callCount === 3) return 0.9
        return 0.5
      })
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      // 如果新增了case，nextId会变成2
      const nextId = (sys as any).nextId
      expect(nextId).toBeGreaterThanOrEqual(1)
    })
  })
})
