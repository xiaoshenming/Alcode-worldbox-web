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
