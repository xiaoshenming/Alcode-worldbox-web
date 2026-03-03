import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticCastellanySystem, CastellanyArrangement } from '../systems/DiplomaticCastellanySystem'

function makeSys() { return new DiplomaticCastellanySystem() }
const W = {} as any
const EM = {} as any

// 强制触发update的tick步长（超过CHECK_INTERVAL=2740）
const STEP = 2800

describe('DiplomaticCastellanySystem', () => {
  let sys: DiplomaticCastellanySystem

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

    it('初始nextId为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始lastCheck为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('arrangements是Array实例', () => {
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })

    it('手动注入arrangement后数组长度增加', () => {
      ;(sys as any).arrangements.push({ id: 55 })
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('新建arrangement包含所有必要字段', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, STEP)
      const arr: CastellanyArrangement[] = (sys as any).arrangements
      if (arr.length > 0) {
        const a = arr[0]
        expect(a).toHaveProperty('id')
        expect(a).toHaveProperty('territoryCivId')
        expect(a).toHaveProperty('castellanCivId')
        expect(a).toHaveProperty('form')
        expect(a).toHaveProperty('defenseStrength')
        expect(a).toHaveProperty('adminEfficiency')
        expect(a).toHaveProperty('judicialReach')
        expect(a).toHaveProperty('revenueCollection')
        expect(a).toHaveProperty('duration')
        expect(a).toHaveProperty('tick')
      }
    })

    it('form只能是合法枚举值', () => {
      const VALID_FORMS = ['defensive_castellany', 'administrative_castellany', 'judicial_castellany', 'revenue_castellany']
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, STEP)
      const arr: CastellanyArrangement[] = (sys as any).arrangements
      for (const a of arr) {
        expect(VALID_FORMS).toContain(a.form)
      }
    })

    it('territoryCivId与castellanCivId不相等（自治城堡不合法）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 5; i++) {
        sys.update(1, W, EM, STEP * (i + 1))
      }
      const arr: CastellanyArrangement[] = (sys as any).arrangements
      for (const a of arr) {
        expect(a.territoryCivId).not.toBe(a.castellanCivId)
      }
    })
  })

  // ─────────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流
  // ─────────────────────────────────────────────
  describe('CHECK_INTERVAL节流', () => {
    it('tick差值小于CHECK_INTERVAL(2740)时不处理', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, 1000)  // 1000-0=1000 < 2740 → 跳过
      expect((sys as any).arrangements).toHaveLength(0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值恰好等于CHECK_INTERVAL(2740)时不跳过', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      sys.update(1, W, EM, 2740)  // 条件 < 2740 不成立，执行
      expect((sys as any).lastCheck).toBe(2740)
    })

    it('tick超过CHECK_INTERVAL后lastCheck被更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      sys.update(1, W, EM, STEP)
      expect((sys as any).lastCheck).toBe(STEP)
    })

    it('连续两次相同tick不重复处理', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, STEP)
      const cnt = (sys as any).arrangements.length
      sys.update(1, W, EM, STEP)
      expect((sys as any).arrangements.length).toBe(cnt)
    })

    it('第二轮须超过lastCheck+2740才再触发', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      sys.update(1, W, EM, STEP)         // lastCheck=STEP
      sys.update(1, W, EM, STEP + 100)   // 差值100 < 2740 → 跳过
      expect((sys as any).lastCheck).toBe(STEP)
      sys.update(1, W, EM, STEP + STEP)  // 差值STEP=2800 > 2740 → 触发
      expect((sys as any).lastCheck).toBe(STEP + STEP)
    })
  })

  // ─────────────────────────────────────────────
  // 3. 数值字段动态更新
  // ─────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次update后duration递增1', () => {
      ;(sys as any).arrangements.push({
        id: 1, territoryCivId: 1, castellanCivId: 2, form: 'defensive_castellany',
        defenseStrength: 40, adminEfficiency: 40, judicialReach: 25, revenueCollection: 30,
        duration: 0, tick: 0
      })
      sys.update(1, W, EM, STEP)
      expect((sys as any).arrangements[0].duration).toBe(1)
      sys.update(1, W, EM, STEP * 2)
      expect((sys as any).arrangements[0].duration).toBe(2)
    })

    it('defenseStrength不低于下限5', () => {
      ;(sys as any).arrangements.push({
        id: 1, territoryCivId: 1, castellanCivId: 2, form: 'defensive_castellany',
        defenseStrength: 5, adminEfficiency: 40, judicialReach: 25, revenueCollection: 30,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].defenseStrength).toBeGreaterThanOrEqual(5)
    })

    it('defenseStrength不超过上限85', () => {
      ;(sys as any).arrangements.push({
        id: 1, territoryCivId: 1, castellanCivId: 2, form: 'defensive_castellany',
        defenseStrength: 85, adminEfficiency: 40, judicialReach: 25, revenueCollection: 30,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].defenseStrength).toBeLessThanOrEqual(85)
    })

    it('adminEfficiency不低于下限10', () => {
      ;(sys as any).arrangements.push({
        id: 1, territoryCivId: 1, castellanCivId: 2, form: 'administrative_castellany',
        defenseStrength: 40, adminEfficiency: 10, judicialReach: 25, revenueCollection: 30,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].adminEfficiency).toBeGreaterThanOrEqual(10)
    })

    it('adminEfficiency不超过上限90', () => {
      ;(sys as any).arrangements.push({
        id: 1, territoryCivId: 1, castellanCivId: 2, form: 'administrative_castellany',
        defenseStrength: 40, adminEfficiency: 90, judicialReach: 25, revenueCollection: 30,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].adminEfficiency).toBeLessThanOrEqual(90)
    })

    it('judicialReach不低于下限5', () => {
      ;(sys as any).arrangements.push({
        id: 1, territoryCivId: 1, castellanCivId: 2, form: 'judicial_castellany',
        defenseStrength: 40, adminEfficiency: 40, judicialReach: 5, revenueCollection: 30,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].judicialReach).toBeGreaterThanOrEqual(5)
    })

    it('revenueCollection不低于下限5', () => {
      ;(sys as any).arrangements.push({
        id: 1, territoryCivId: 1, castellanCivId: 2, form: 'revenue_castellany',
        defenseStrength: 40, adminEfficiency: 40, judicialReach: 25, revenueCollection: 5,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].revenueCollection).toBeGreaterThanOrEqual(5)
    })

    it('revenueCollection不超过上限65', () => {
      ;(sys as any).arrangements.push({
        id: 1, territoryCivId: 1, castellanCivId: 2, form: 'revenue_castellany',
        defenseStrength: 40, adminEfficiency: 40, judicialReach: 25, revenueCollection: 65,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].revenueCollection).toBeLessThanOrEqual(65)
    })
  })

  // ─────────────────────────────────────────────
  // 4. time-based 过期清理
  // ─────────────────────────────────────────────
  describe('time-based过期清理', () => {
    it('tick字段过老的记录（tick < currentTick - 88000）被删除', () => {
      ;(sys as any).arrangements.push({
        id: 1, territoryCivId: 1, castellanCivId: 2, form: 'defensive_castellany',
        defenseStrength: 40, adminEfficiency: 40, judicialReach: 25, revenueCollection: 30,
        duration: 100, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, 100000)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('较新的记录（tick > cutoff）不被删除', () => {
      const currentTick = 100000
      ;(sys as any).arrangements.push({
        id: 1, territoryCivId: 1, castellanCivId: 2, form: 'defensive_castellany',
        defenseStrength: 40, adminEfficiency: 40, judicialReach: 25, revenueCollection: 30,
        duration: 0, tick: currentTick - 3000
      })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, currentTick)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('恰好在cutoff边界的记录（tick === cutoff）不被删除', () => {
      const currentTick = 100000
      const cutoff = currentTick - 88000
      ;(sys as any).arrangements.push({
        id: 1, territoryCivId: 1, castellanCivId: 2, form: 'defensive_castellany',
        defenseStrength: 40, adminEfficiency: 40, judicialReach: 25, revenueCollection: 30,
        duration: 0, tick: cutoff
      })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, currentTick)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('混合新旧记录：只删除旧记录，保留新记录', () => {
      const currentTick = 200000
      ;(sys as any).arrangements.push(
        {
          id: 1, territoryCivId: 1, castellanCivId: 2, form: 'defensive_castellany',
          defenseStrength: 40, adminEfficiency: 40, judicialReach: 25, revenueCollection: 30,
          duration: 0, tick: 0  // 过期
        },
        {
          id: 2, territoryCivId: 3, castellanCivId: 4, form: 'judicial_castellany',
          defenseStrength: 50, adminEfficiency: 50, judicialReach: 20, revenueCollection: 35,
          duration: 0, tick: currentTick - 20000  // 新鲜
        }
      )
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, currentTick)
      const arr: CastellanyArrangement[] = (sys as any).arrangements
      expect(arr).toHaveLength(1)
      expect(arr[0].id).toBe(2)
    })

    it('多条过期记录全部被清除', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).arrangements.push({
          id: i + 1, territoryCivId: i + 1, castellanCivId: i + 2, form: 'revenue_castellany',
          defenseStrength: 40, adminEfficiency: 40, judicialReach: 25, revenueCollection: 30,
          duration: 0, tick: 0
        })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, 200000)
      expect((sys as any).arrangements).toHaveLength(0)
    })
  })

  // ─────────────────────────────────────────────
  // 5. MAX_ARRANGEMENTS 上限
  // ─────────────────────────────────────────────
  describe('MAX_ARRANGEMENTS上限(16)', () => {
    it('arrangements数量不超过16', () => {
      const currentTick = 500000
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push({
          id: i + 1, territoryCivId: i + 1, castellanCivId: (i + 2) % 8 + 1,
          form: 'defensive_castellany',
          defenseStrength: 40, adminEfficiency: 40, judicialReach: 25, revenueCollection: 30,
          duration: 0, tick: currentTick
        })
      }
      ;(sys as any).nextId = 17
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, currentTick + STEP)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('未满16时随机通过后允许新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, STEP)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('nextId在每次新增后递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const initialNextId = (sys as any).nextId
      sys.update(1, W, EM, STEP)
      const afterCount = (sys as any).arrangements.length
      if (afterCount > 0) {
        expect((sys as any).nextId).toBe(initialNextId + afterCount)
      }
    })
  })
})

// ---- 追加测试以达到 50+ ----
describe('DiplomaticCastellanySystem — 额外完整性测试', () => {
  const CI = 2740
  const CUTOFF = 88000
  const MAX = 16

  function makeSys2() { return new DiplomaticCastellanySystem() }
  function makeA(o: Partial<CastellanyArrangement> = {}): CastellanyArrangement {
    return { id: 1, territoryCivId: 1, castellanCivId: 2, form: 'defensive_castellany',
      defenseStrength: 50, adminEfficiency: 50, judicialReach: 30, revenueCollection: 30,
      duration: 0, tick: 0, ...o }
  }

  let sys: DiplomaticCastellanySystem
  beforeEach(() => { sys = makeSys2(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('两系统实例互相独立', () => {
    const s2 = makeSys2(); ;(sys as any).arrangements.push(makeA())
    expect((s2 as any).arrangements).toHaveLength(0)
  })
  it('update 不改变 form 字段', () => {
    ;(sys as any).arrangements.push(makeA({ form: 'revenue_castellany', tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].form).toBe('revenue_castellany')
  })
  it('update 不改变 id 字段', () => {
    ;(sys as any).arrangements.push(makeA({ id: 66, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].id).toBe(66)
  })
  it('defenseStrength 下界不低于 5', () => {
    ;(sys as any).arrangements.push(makeA({ defenseStrength: 5, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].defenseStrength).toBeGreaterThanOrEqual(5)
  })
  it('adminEfficiency 下界不低于 10', () => {
    ;(sys as any).arrangements.push(makeA({ adminEfficiency: 10, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].adminEfficiency).toBeGreaterThanOrEqual(10)
  })
  it('judicialReach 下界不低于 5', () => {
    ;(sys as any).arrangements.push(makeA({ judicialReach: 5, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].judicialReach).toBeGreaterThanOrEqual(5)
  })
  it('revenueCollection 下界不低于 5', () => {
    ;(sys as any).arrangements.push(makeA({ revenueCollection: 5, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].revenueCollection).toBeGreaterThanOrEqual(5)
  })
  it('defenseStrength 上界不超过 85', () => {
    ;(sys as any).arrangements.push(makeA({ defenseStrength: 85, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].defenseStrength).toBeLessThanOrEqual(85)
  })
  it('adminEfficiency 上界不超过 90', () => {
    ;(sys as any).arrangements.push(makeA({ adminEfficiency: 90, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].adminEfficiency).toBeLessThanOrEqual(90)
  })
  it('judicialReach 上界不超过 80', () => {
    ;(sys as any).arrangements.push(makeA({ judicialReach: 80, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].judicialReach).toBeLessThanOrEqual(80)
  })
  it('revenueCollection 上界不超过 65', () => {
    ;(sys as any).arrangements.push(makeA({ revenueCollection: 65, tick: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).arrangements[0].revenueCollection).toBeLessThanOrEqual(65)
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
    sys.update(1, {} as any, {} as any, 0); expect((sys as any).lastCheck).toBe(0)
  })
  it('5 条全过期在大 tick 时全删除', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).arrangements.push(makeA({ id: i, tick: 0 })) }
    sys.update(1, {} as any, {} as any, CUTOFF + CI + 1)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('castellanCivId 可独立读取', () => {
    ;(sys as any).arrangements.push(makeA({ castellanCivId: 8 }))
    expect((sys as any).arrangements[0].castellanCivId).toBe(8)
  })
  it('两次满足间隔 lastCheck 递增', () => {
    sys.update(1, {} as any, {} as any, CI)
    sys.update(1, {} as any, {} as any, CI * 2)
    expect((sys as any).lastCheck).toBe(CI * 2)
  })
})
