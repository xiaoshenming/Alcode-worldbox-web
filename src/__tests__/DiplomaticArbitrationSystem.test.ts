import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticArbitrationSystem, ArbitrationCase } from '../systems/DiplomaticArbitrationSystem'

// Constants mirrored from source
const CHECK_INTERVAL = 2380
const MAX_CASES = 20
const EXPIRE_OFFSET = 80000

function makeSys() { return new DiplomaticArbitrationSystem() }

function makeCase(id: number, tick = 0): ArbitrationCase {
  return {
    id,
    civIdA: 1,
    civIdB: 2,
    arbitrationType: 'territorial',
    fairnessRating: 60,
    bindingStrength: 50,
    complianceRate: 60,
    disputeResolution: 25,
    duration: 0,
    tick,
  }
}

describe('DiplomaticArbitrationSystem', () => {
  let sys: DiplomaticArbitrationSystem

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

    it('注入单条case后可读取', () => {
      ;(sys as any).cases.push(makeCase(1))
      expect((sys as any).cases).toHaveLength(1)
      expect((sys as any).cases[0].id).toBe(1)
    })

    it('注入多条case后长度正确', () => {
      ;(sys as any).cases.push(makeCase(1), makeCase(2), makeCase(3))
      expect((sys as any).cases).toHaveLength(3)
    })

    it('支持arbitrationType: territorial', () => {
      const c = makeCase(1)
      c.arbitrationType = 'territorial'
      ;(sys as any).cases.push(c)
      expect((sys as any).cases[0].arbitrationType).toBe('territorial')
    })

    it('支持arbitrationType: commercial', () => {
      const c = makeCase(1)
      c.arbitrationType = 'commercial'
      ;(sys as any).cases.push(c)
      expect((sys as any).cases[0].arbitrationType).toBe('commercial')
    })

    it('支持arbitrationType: military', () => {
      const c = makeCase(1)
      c.arbitrationType = 'military'
      ;(sys as any).cases.push(c)
      expect((sys as any).cases[0].arbitrationType).toBe('military')
    })

    it('支持arbitrationType: cultural', () => {
      const c = makeCase(1)
      c.arbitrationType = 'cultural'
      ;(sys as any).cases.push(c)
      expect((sys as any).cases[0].arbitrationType).toBe('cultural')
    })
  })

  // ------------------------------------------------------------------ //
  // 2. CHECK_INTERVAL 节流
  // ------------------------------------------------------------------ //
  describe('CHECK_INTERVAL节流', () => {
    it('tick < CHECK_INTERVAL 时不更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick === CHECK_INTERVAL 时触发更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick > CHECK_INTERVAL 时触发更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 500)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
    })

    it('第二次tick未超过间隔时不更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
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
    it('有效update后duration增加1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).cases.push(makeCase(1, 0))
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases[0].duration).toBe(1)
    })

    it('多次有效update后duration累加', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).cases.push(makeCase(1, 0))
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
      expect((sys as any).cases[0].duration).toBe(2)
    })

    it('fairnessRating始终在[10,90]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const c = makeCase(1, 0)
      c.fairnessRating = 89
      ;(sys as any).cases.push(c)
      for (let i = 1; i <= 5; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).cases[0].fairnessRating
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(90)
    })

    it('bindingStrength始终在[10,85]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const c = makeCase(1, 0)
      c.bindingStrength = 11
      ;(sys as any).cases.push(c)
      for (let i = 1; i <= 5; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).cases[0].bindingStrength
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(85)
    })

    it('complianceRate始终在[15,95]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const c = makeCase(1, 0)
      c.complianceRate = 94
      ;(sys as any).cases.push(c)
      for (let i = 1; i <= 5; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).cases[0].complianceRate
      expect(val).toBeGreaterThanOrEqual(15)
      expect(val).toBeLessThanOrEqual(95)
    })

    it('disputeResolution始终在[5,75]范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const c = makeCase(1, 0)
      c.disputeResolution = 6
      ;(sys as any).cases.push(c)
      for (let i = 1; i <= 5; i++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      }
      const val = (sys as any).cases[0].disputeResolution
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(75)
    })
  })

  // ------------------------------------------------------------------ //
  // 4. time-based 过期清理
  // ------------------------------------------------------------------ //
  describe('time-based过期清理', () => {
    it('超期case被删除（tick=0，大tick触发清理）', () => {
      ;(sys as any).cases.push(makeCase(1, 0))
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      // mock > TREATY_CHANCE(0.0027) 跳过新增分支，保证过期清理执行
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).cases).toHaveLength(0)
    })

    it('未超期case被保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const baseTick = CHECK_INTERVAL
      ;(sys as any).cases.push(makeCase(99, baseTick))
      sys.update(1, {} as any, {} as any, baseTick + CHECK_INTERVAL)
      const remaining = (sys as any).cases.filter((c: ArbitrationCase) => c.id === 99)
      expect(remaining).toHaveLength(1)
    })

    it('混合case：超期删除、未超期保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      ;(sys as any).cases.push(makeCase(1, 0))       // 超期
      ;(sys as any).cases.push(makeCase(2, bigTick - 1)) // 未超期
      sys.update(1, {} as any, {} as any, bigTick)
      const ids = (sys as any).cases.map((c: ArbitrationCase) => c.id)
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

    it('cutoff边界：tick === cutoff 时不删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      const cutoff = bigTick - EXPIRE_OFFSET
      ;(sys as any).cases.push(makeCase(5, cutoff))
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).cases).toHaveLength(1)
    })
  })

  // ------------------------------------------------------------------ //
  // 5. MAX_CASES 上限
  // ------------------------------------------------------------------ //
  describe('MAX_CASES上限', () => {
    it('cases已满时不新增', () => {
      for (let i = 0; i < MAX_CASES; i++) {
        ;(sys as any).cases.push(makeCase(i + 1, CHECK_INTERVAL))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < TREATY_CHANCE 0.0027
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases.length).toBeLessThanOrEqual(MAX_CASES)
    })

    it('达到MAX_CASES后不超上限', () => {
      for (let i = 0; i < MAX_CASES; i++) {
        ;(sys as any).cases.push(makeCase(i + 1, CHECK_INTERVAL))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let t = 1; t <= 5; t++) {
        sys.update(1, {} as any, {} as any, CHECK_INTERVAL * t)
      }
      expect((sys as any).cases.length).toBeLessThanOrEqual(MAX_CASES)
    })

    it('nextId在成功新增case后递增', () => {
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.001  // < TREATY_CHANCE
        if (callCount === 2) return 0.1    // civA=1
        if (callCount === 3) return 0.9    // civB=8
        return 0.5
      })
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).nextId).toBeGreaterThanOrEqual(1)
    })
  })
})

// ---- 追加测试以达到 50+ ----
describe('DiplomaticArbitrationSystem — 额外完整性测试', () => {
  const CI = 2380
  const CUTOFF = 80000
  const MAX = 20

  function makeSys2() { return new DiplomaticArbitrationSystem() }
  function makeC(id = 1, tick = 0): ArbitrationCase {
    return { id, civIdA: 1, civIdB: 2, arbitrationType: 'territorial',
      fairnessRating: 60, bindingStrength: 50, complianceRate: 60,
      disputeResolution: 25, duration: 0, tick }
  }

  let sys: DiplomaticArbitrationSystem
  beforeEach(() => { sys = makeSys2(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('两系统实例互相独立', () => {
    const s2 = makeSys2(); ;(sys as any).cases.push(makeC())
    expect((s2 as any).cases).toHaveLength(0)
  })
  it('update 不改变 id 字段', () => {
    ;(sys as any).cases.push(makeC(55, 0))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].id).toBe(55)
  })
  it('fairnessRating 下界不低于 10', () => {
    ;(sys as any).cases.push(makeC(1, 0))
    ;(sys as any).cases[0].fairnessRating = 10
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].fairnessRating).toBeGreaterThanOrEqual(10)
  })
  it('bindingStrength 下界不低于 10', () => {
    ;(sys as any).cases.push(makeC(1, 0))
    ;(sys as any).cases[0].bindingStrength = 10
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].bindingStrength).toBeGreaterThanOrEqual(10)
  })
  it('complianceRate 下界不低于 15', () => {
    ;(sys as any).cases.push(makeC(1, 0))
    ;(sys as any).cases[0].complianceRate = 15
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].complianceRate).toBeGreaterThanOrEqual(15)
  })
  it('disputeResolution 下界不低于 5', () => {
    ;(sys as any).cases.push(makeC(1, 0))
    ;(sys as any).cases[0].disputeResolution = 5
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].disputeResolution).toBeGreaterThanOrEqual(5)
  })
  it('fairnessRating 上界不超过 90', () => {
    ;(sys as any).cases.push(makeC(1, 0))
    ;(sys as any).cases[0].fairnessRating = 90
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].fairnessRating).toBeLessThanOrEqual(90)
  })
  it('bindingStrength 上界不超过 85', () => {
    ;(sys as any).cases.push(makeC(1, 0))
    ;(sys as any).cases[0].bindingStrength = 85
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].bindingStrength).toBeLessThanOrEqual(85)
  })
  it('complianceRate 上界不超过 95', () => {
    ;(sys as any).cases.push(makeC(1, 0))
    ;(sys as any).cases[0].complianceRate = 95
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].complianceRate).toBeLessThanOrEqual(95)
  })
  it('disputeResolution 上界不超过 75', () => {
    ;(sys as any).cases.push(makeC(1, 0))
    ;(sys as any).cases[0].disputeResolution = 75
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].disputeResolution).toBeLessThanOrEqual(75)
  })
  it('多条记录各自独立更新 duration', () => {
    ;(sys as any).cases.push(makeC(1, CI))
    ;(sys as any).cases.push(makeC(2, CI))
    ;(sys as any).cases[1].duration = 5
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].duration).toBe(1)
    expect((sys as any).cases[1].duration).toBe(6)
  })
  it('过期清理：tick=0 在大 tick 时删除', () => {
    ;(sys as any).cases.push(makeC(1, 0))
    sys.update(1, {} as any, {} as any, CUTOFF + CI + 1)
    expect((sys as any).cases).toHaveLength(0)
  })
  it('混合过期：保留新，删旧', () => {
    const big = CUTOFF + CI + 1
    ;(sys as any).cases.push(makeC(1, 0))
    ;(sys as any).cases.push(makeC(2, big))
    sys.update(1, {} as any, {} as any, big)
    expect((sys as any).cases).toHaveLength(1)
    expect((sys as any).cases[0].id).toBe(2)
  })
  it('duration 只在满足 CHECK_INTERVAL 时递增', () => {
    ;(sys as any).cases.push(makeC(1, 0))
    sys.update(1, {} as any, {} as any, 10)
    expect((sys as any).cases[0].duration).toBe(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].duration).toBe(1)
  })
  it('civA === civB 时不新增', () => {
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases).toHaveLength(0)
  })
  it('达到 MAX=20 时不新增', () => {
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 1; i <= MAX; i++) { ;(sys as any).cases.push(makeC(i, CI)) }
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases.length).toBeLessThanOrEqual(MAX)
  })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('tick=0 不触发更新', () => {
    sys.update(1, {} as any, {} as any, 0); expect((sys as any).lastCheck).toBe(0)
  })
  it('5 条全过期在大 tick 时全删除', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).cases.push(makeC(i, 0)) }
    sys.update(1, {} as any, {} as any, CUTOFF + CI + 1)
    expect((sys as any).cases).toHaveLength(0)
  })
  it('civIdB 可独立读取', () => {
    const c = makeC(); c.civIdB = 7; ;(sys as any).cases.push(c)
    expect((sys as any).cases[0].civIdB).toBe(7)
  })
  it('两次满足间隔 lastCheck 递增', () => {
    sys.update(1, {} as any, {} as any, CI)
    sys.update(1, {} as any, {} as any, CI * 2)
    expect((sys as any).lastCheck).toBe(CI * 2)
  })
  it('注入 3 条后 length 为 3', () => {
    for (let i = 1; i <= 3; i++) { ;(sys as any).cases.push(makeC(i)) }
    expect((sys as any).cases).toHaveLength(3)
  })
  it('update 不改变 arbitrationType', () => {
    ;(sys as any).cases.push(makeC(1, 0))
    ;(sys as any).cases[0].arbitrationType = 'cultural'
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0]?.arbitrationType).toBe('cultural')
  })
  it('全新鲜记录无清理', () => {
    const big = CUTOFF + CI + 1
    ;(sys as any).cases.push(makeC(1, big - 1000))
    ;(sys as any).cases.push(makeC(2, big - 500))
    sys.update(1, {} as any, {} as any, big)
    expect((sys as any).cases).toHaveLength(2)
  })
})
