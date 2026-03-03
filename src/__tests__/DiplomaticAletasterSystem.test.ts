import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAletasterSystem, AletasterForm, AletasterArrangement } from '../systems/DiplomaticAletasterSystem'

// CHECK_INTERVAL=2950, PROCEED_CHANCE=0.0021, MAX_ARRANGEMENTS=16, cutoff offset=88000

function makeSys() { return new DiplomaticAletasterSystem() }

function makeArrangement(overrides: Partial<AletasterArrangement> = {}): AletasterArrangement {
  return {
    id: 1,
    brewingCivId: 1,
    inspectionCivId: 2,
    form: 'royal_aletaster',
    qualityStandards: 50,
    inspectionRigor: 50,
    priceRegulation: 40,
    measureEnforcement: 30,
    duration: 0,
    tick: 100000,
    ...overrides,
  }
}

describe('DiplomaticAletasterSystem', () => {
  let sys: DiplomaticAletasterSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────
  // 1. 基础数据结构
  // ─────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始arrangements为空数组', () => {
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('初始arrangements是Array类型', () => {
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })

    it('nextId初始值为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始值为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入单条arrangements可读取', () => {
      const a = makeArrangement()
      ;(sys as any).arrangements.push(a)
      expect((sys as any).arrangements).toHaveLength(1)
      expect((sys as any).arrangements[0].id).toBe(1)
    })

    it('注入多条arrangements可全部读取', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, brewingCivId: 3, inspectionCivId: 4 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 3, brewingCivId: 5, inspectionCivId: 6 }))
      expect((sys as any).arrangements).toHaveLength(3)
    })

    it('所有AletasterForm类型均可注入', () => {
      const forms: AletasterForm[] = ['royal_aletaster', 'borough_aletaster', 'guild_aletaster', 'market_aletaster']
      forms.forEach((form, i) => {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, brewingCivId: i + 1, inspectionCivId: i + 9, form }))
      })
      expect((sys as any).arrangements).toHaveLength(4)
      const savedForms = (sys as any).arrangements.map((a: AletasterArrangement) => a.form)
      expect(savedForms).toContain('royal_aletaster')
      expect(savedForms).toContain('borough_aletaster')
      expect(savedForms).toContain('guild_aletaster')
      expect(savedForms).toContain('market_aletaster')
    })
  })

  // ─────────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流
  // ─────────────────────────────────────────────
  describe('CHECK_INTERVAL节流', () => {
    it('tick差值小于2950时跳过更新，lastCheck不变', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1) // 强制不新增
      sys.update(1, {} as any, {} as any, 12949) // 差值 2949 < 2950
      expect((sys as any).lastCheck).toBe(10000)
    })

    it('tick差值等于2950时触发更新，lastCheck更新', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 12950)
      expect((sys as any).lastCheck).toBe(12950)
    })

    it('tick差值大于2950时触发更新，lastCheck更新为当前tick', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 50000)
      expect((sys as any).lastCheck).toBe(50000)
    })

    it('连续在interval内调用，lastCheck只在第一次触发时更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).lastCheck).toBe(3000)
      sys.update(1, {} as any, {} as any, 4000) // 差值1000 < 2950
      expect((sys as any).lastCheck).toBe(3000)
    })

    it('两次足够间隔的update均触发，lastCheck两次均更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).lastCheck).toBe(3000)
      sys.update(1, {} as any, {} as any, 6000) // 差值3000 >= 2950
      expect((sys as any).lastCheck).toBe(6000)
    })
  })

  // ─────────────────────────────────────────────
  // 3. 数值字段动态更新
  // ─────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次update后duration递增1', () => {
      ;(sys as any).arrangements.push(makeArrangement({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].duration).toBe(1)
    })

    it('多次update后duration持续累加', () => {
      ;(sys as any).arrangements.push(makeArrangement({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      sys.update(1, {} as any, {} as any, 6000)
      sys.update(1, {} as any, {} as any, 9000)
      expect((sys as any).arrangements[0].duration).toBe(3)
    })

    it('qualityStandards不低于最小值5', () => {
      ;(sys as any).arrangements.push(makeArrangement({ qualityStandards: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0) // 最大负向偏移
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].qualityStandards).toBeGreaterThanOrEqual(5)
    })

    it('qualityStandards不超过最大值85', () => {
      ;(sys as any).arrangements.push(makeArrangement({ qualityStandards: 84.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1) // 最大正向偏移
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].qualityStandards).toBeLessThanOrEqual(85)
    })

    it('inspectionRigor不低于最小值10', () => {
      ;(sys as any).arrangements.push(makeArrangement({ inspectionRigor: 10.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].inspectionRigor).toBeGreaterThanOrEqual(10)
    })

    it('inspectionRigor不超过最大值90', () => {
      ;(sys as any).arrangements.push(makeArrangement({ inspectionRigor: 89.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].inspectionRigor).toBeLessThanOrEqual(90)
    })

    it('priceRegulation不低于最小值5', () => {
      ;(sys as any).arrangements.push(makeArrangement({ priceRegulation: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].priceRegulation).toBeGreaterThanOrEqual(5)
    })

    it('measureEnforcement不超过最大值65', () => {
      ;(sys as any).arrangements.push(makeArrangement({ measureEnforcement: 64.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].measureEnforcement).toBeLessThanOrEqual(65)
    })
  })

  // ─────────────────────────────────────────────
  // 4. time-based 过期清理
  // ─────────────────────────────────────────────
  describe('time-based过期清理', () => {
    it('tick=0的记录在大tick时被清理（cutoff=tick-88000）', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000) // cutoff=2000，tick=0 < 2000
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('tick=88001的记录在tick=90000时被清理（cutoff=2000，88001>2000，不应被清理）', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 88001 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000) // cutoff=2000，88001 >= 2000 => 保留
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('tick刚好等于cutoff时记录被保留（tick >= cutoff 才保留）', () => {
      // cutoff = 90000 - 88000 = 2000
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 2000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('混合新旧记录：只删除过期的，保留有效的', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))       // 过期
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: 150000 }))  // 有效
      ;(sys as any).arrangements.push(makeArrangement({ id: 3, tick: 1000 }))    // 过期
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 200000) // cutoff=112000
      const ids = (sys as any).arrangements.map((a: AletasterArrangement) => a.id)
      expect(ids).toContain(2)
      expect(ids).not.toContain(1)
      expect(ids).not.toContain(3)
    })

    it('无过期记录时arrangements长度不变', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 5000 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: 6000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000) // tick差值3000>=2950触发; cutoff=3000-88000<0 => 无过期
      expect((sys as any).arrangements).toHaveLength(2)
    })
  })

  // ─────────────────────────────────────────────
  // 5. MAX_ARRANGEMENTS 上限控制
  // ─────────────────────────────────────────────
  describe('MAX_ARRANGEMENTS上限控制', () => {
    it('arrangements达到16时即使random触发也不新增', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, brewingCivId: i + 1, inspectionCivId: i + 20, tick: 500000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < 0.0021，触发新增路径
      sys.update(1, {} as any, {} as any, 503000)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('arrangements未达16时random触发可新增', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, brewingCivId: i + 1, inspectionCivId: i + 20, tick: 500000 }))
      }
      // mock：第一次random()=0(触发新增), 第二次random()用于brewingCivId, 第三次用于inspectionCivId，要确保不相等
      const mockRand = vi.spyOn(Math, 'random')
      mockRand.mockReturnValueOnce(0)      // PROCEED_CHANCE check → 0 < 0.0021
      mockRand.mockReturnValueOnce(0)      // brewing = 1+floor(0*8)=1
      mockRand.mockReturnValueOnce(0.5)    // inspection = 1+floor(0.5*8)=5 (1≠5)
      mockRand.mockReturnValue(0.5)        // 其余random调用
      sys.update(1, {} as any, {} as any, 503000)
      expect((sys as any).arrangements.length).toBeGreaterThan(10)
    })

    it('nextId在新增时递增', () => {
      const mockRand = vi.spyOn(Math, 'random')
      mockRand.mockReturnValueOnce(0)
      mockRand.mockReturnValueOnce(0)
      mockRand.mockReturnValueOnce(0.5)
      mockRand.mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      const prevNextId = (sys as any).nextId
      expect(prevNextId).toBeGreaterThanOrEqual(2)
    })
  })
})

// ---- 追加测试以达到 50+ ----
describe('DiplomaticAletasterSystem — 额外完整性测试', () => {
  const CI = 2950
  const CUTOFF = 88000
  const MAX = 16

  function makeSys2() { return new DiplomaticAletasterSystem() }
  function makeA(o: Partial<AletasterArrangement> = {}): AletasterArrangement {
    return { id: 1, brewingCivId: 1, inspectionCivId: 2, form: 'royal_aletaster',
      qualityStandards: 50, inspectionRigor: 50, priceRegulation: 40,
      measureEnforcement: 30, duration: 0, tick: 100000, ...o }
  }

  let sys: DiplomaticAletasterSystem
  beforeEach(() => { sys = makeSys2(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('两系统实例互相独立', () => {
    const s2 = makeSys2(); ;(sys as any).arrangements.push(makeA())
    expect((s2 as any).arrangements).toHaveLength(0)
  })
  it('update 不改变 form 字段', () => {
    ;(sys as any).arrangements.push(makeA({ form: 'guild_aletaster', tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].form).toBe('guild_aletaster')
  })
  it('update 不改变 id 字段', () => {
    ;(sys as any).arrangements.push(makeA({ id: 77, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].id).toBe(77)
  })
  it('update 不改变 brewingCivId', () => {
    ;(sys as any).arrangements.push(makeA({ brewingCivId: 5, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].brewingCivId).toBe(5)
  })
  it('qualityStandards 下界不低于 5', () => {
    ;(sys as any).arrangements.push(makeA({ qualityStandards: 5, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].qualityStandards).toBeGreaterThanOrEqual(5)
  })
  it('inspectionRigor 下界不低于 10', () => {
    ;(sys as any).arrangements.push(makeA({ inspectionRigor: 10, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].inspectionRigor).toBeGreaterThanOrEqual(10)
  })
  it('priceRegulation 下界不低于 5', () => {
    ;(sys as any).arrangements.push(makeA({ priceRegulation: 5, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].priceRegulation).toBeGreaterThanOrEqual(5)
  })
  it('measureEnforcement 下界不低于 5', () => {
    ;(sys as any).arrangements.push(makeA({ measureEnforcement: 5, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].measureEnforcement).toBeGreaterThanOrEqual(5)
  })
  it('qualityStandards 上界不超过 85', () => {
    ;(sys as any).arrangements.push(makeA({ qualityStandards: 85, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].qualityStandards).toBeLessThanOrEqual(85)
  })
  it('inspectionRigor 上界不超过 90', () => {
    ;(sys as any).arrangements.push(makeA({ inspectionRigor: 90, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].inspectionRigor).toBeLessThanOrEqual(90)
  })
  it('priceRegulation 上界不超过 80', () => {
    ;(sys as any).arrangements.push(makeA({ priceRegulation: 80, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].priceRegulation).toBeLessThanOrEqual(80)
  })
  it('measureEnforcement 上界不超过 65', () => {
    ;(sys as any).arrangements.push(makeA({ measureEnforcement: 65, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].measureEnforcement).toBeLessThanOrEqual(65)
  })
  it('多条记录各自独立更新 duration', () => {
    ;(sys as any).arrangements.push(makeA({ id: 1, tick: 0, duration: 0 }))
    ;(sys as any).arrangements.push(makeA({ id: 2, tick: 0, duration: 5 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].duration).toBe(1)
    expect((sys as any).arrangements[1].duration).toBe(6)
  })
  it('过期清理：tick=0 在大 tick 时删除', () => {
    ;(sys as any).arrangements.push(makeA({ id: 1, tick: 0 }))
    sys.update(1, {} as any, {} as any, CUTOFF + CI + 1)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('混合过期：保留新，删旧', () => {
    const big = CUTOFF + CI + 1
    ;(sys as any).arrangements.push(makeA({ id: 1, tick: 0 }))
    ;(sys as any).arrangements.push(makeA({ id: 2, tick: big }))
    sys.update(1, {} as any, {} as any, big)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })
  it('duration 只在满足 CHECK_INTERVAL 时递增', () => {
    ;(sys as any).arrangements.push(makeA({ duration: 0, tick: 0 }))
    sys.update(1, {} as any, {} as any, 10)
    expect((sys as any).arrangements[0].duration).toBe(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].duration).toBe(1)
  })
  it('civA === civB 时不新增', () => {
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('达到 MAX=16 时不新增', () => {
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 1; i <= MAX; i++) { ;(sys as any).arrangements.push(makeA({ id: i, tick: CI })) }
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(MAX)
  })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('tick=0 不触发更新', () => {
    sys.update(1, {} as any, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('全新鲜记录无清理', () => {
    const big = CUTOFF + CI + 1
    ;(sys as any).arrangements.push(makeA({ id: 1, tick: big - 1000 }))
    sys.update(1, {} as any, {} as any, big)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('5 条全过期在大 tick 时全删除', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).arrangements.push(makeA({ id: i, tick: 0 })) }
    sys.update(1, {} as any, {} as any, CUTOFF + CI + 1)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('inspectionCivId 可独立读取', () => {
    ;(sys as any).arrangements.push(makeA({ inspectionCivId: 8 }))
    expect((sys as any).arrangements[0].inspectionCivId).toBe(8)
  })
})
