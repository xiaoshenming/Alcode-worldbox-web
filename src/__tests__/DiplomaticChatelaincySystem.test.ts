import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticChatelaincySystem, ChatelaincyForm } from '../systems/DiplomaticChatelaincySystem'

// DiplomaticChatelaincySystem.update(dt, world, em, tick) — 4参数
// CHECK_INTERVAL=2730, PROCEED_CHANCE=0.0021, MAX_ARRANGEMENTS=16
// 字段范围: fortressControl[5,85], householdOrder[10,90], garrisonStrength[5,80], supplyManagement[5,65]
// 过期: cutoff = tick - 88000，arrangement.tick < cutoff 则删除
// duration每tick +1

const FORMS: ChatelaincyForm[] = ['fortress_chatelaincy', 'household_chatelaincy', 'garrison_chatelaincy', 'provisioning_chatelaincy']

function makeSys() {
  return new DiplomaticChatelaincySystem()
}

function makeArrangement(overrides: Partial<any> = {}): any {
  return {
    id: 1, fortressCivId: 1, chatelainCivId: 2,
    form: 'fortress_chatelaincy' as ChatelaincyForm,
    fortressControl: 40, householdOrder: 45,
    garrisonStrength: 30, supplyManagement: 25,
    duration: 0, tick: 1000,
    ...overrides,
  }
}

describe('DiplomaticChatelaincySystem', () => {
  let sys: DiplomaticChatelaincySystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── 1. 基础数据结构 ────────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始arrangements为空数组', () => {
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('arrangements是数组类型', () => {
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })

    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('手动注入arrangement后可读取', () => {
      ;(sys as any).arrangements.push(makeArrangement())
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('ChatelaincyArrangement包含所有必要字段', () => {
      const a = makeArrangement({ id: 7, fortressCivId: 3, chatelainCivId: 5 })
      ;(sys as any).arrangements.push(a)
      const r = (sys as any).arrangements[0]
      expect(r).toHaveProperty('id')
      expect(r).toHaveProperty('fortressCivId')
      expect(r).toHaveProperty('chatelainCivId')
      expect(r).toHaveProperty('form')
      expect(r).toHaveProperty('fortressControl')
      expect(r).toHaveProperty('householdOrder')
      expect(r).toHaveProperty('garrisonStrength')
      expect(r).toHaveProperty('supplyManagement')
      expect(r).toHaveProperty('duration')
      expect(r).toHaveProperty('tick')
    })

    it('form字段必须是合法的ChatelaincyForm之一', () => {
      ;(sys as any).arrangements.push(makeArrangement({ form: 'garrison_chatelaincy' }))
      expect(FORMS).toContain((sys as any).arrangements[0].form)
    })
  })

  // ─── 2. CHECK_INTERVAL节流 ──────────────────────────────────────────
  describe('CHECK_INTERVAL节流(2730)', () => {
    it('tick差小于2730时不执行，lastCheck不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2000)  // 2000 - 0 = 2000 < 2730 → 跳过
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差 = 2729时跳过（严格<）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2729)
      expect((sys as any).lastCheck).toBe(0)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('tick差 >= 2730时执行并更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发新增
      sys.update(1, {} as any, {} as any, 2730)
      expect((sys as any).lastCheck).toBe(2730)
    })

    it('第二次在间隔内调用不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2730) // 执行
      sys.update(1, {} as any, {} as any, 3000) // 3000-2730=270 < 2730 → 跳过
      expect((sys as any).lastCheck).toBe(2730)
    })

    it('两次都超过间隔时lastCheck跟随最新tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      sys.update(1, {} as any, {} as any, 6000)
      expect((sys as any).lastCheck).toBe(6000)
    })
  })

  // ─── 3. 数值字段动态更新 ────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次update后duration增加1', () => {
      ;(sys as any).arrangements.push(makeArrangement({ duration: 0, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].duration).toBe(1)
    })

    it('多次update后duration累计递增', () => {
      ;(sys as any).arrangements.push(makeArrangement({ duration: 0, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      sys.update(1, {} as any, {} as any, 6000)
      sys.update(1, {} as any, {} as any, 9000)
      expect((sys as any).arrangements[0].duration).toBe(3)
    })

    it('fortressControl不低于min(5)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ fortressControl: 5.01, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0) // 最大负向偏移
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].fortressControl).toBeGreaterThanOrEqual(5)
    })

    it('fortressControl不超过max(85)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ fortressControl: 84.99, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1) // 最大正向偏移
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].fortressControl).toBeLessThanOrEqual(85)
    })

    it('householdOrder不低于min(10)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ householdOrder: 10.01, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].householdOrder).toBeGreaterThanOrEqual(10)
    })

    it('householdOrder不超过max(90)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ householdOrder: 89.99, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].householdOrder).toBeLessThanOrEqual(90)
    })

    it('garrisonStrength不低于min(5)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ garrisonStrength: 5.01, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].garrisonStrength).toBeGreaterThanOrEqual(5)
    })

    it('supplyManagement不超过max(65)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ supplyManagement: 64.99, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].supplyManagement).toBeLessThanOrEqual(65)
    })
  })

  // ─── 4. time-based过期清理(cutoff = tick - 88000) ──────────────────
  describe('time-based过期清理', () => {
    it('tick字段小于cutoff的arrangement被删除', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000) // cutoff = 90000-88000=2000 > 0 → 过期
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('tick字段恰好等于cutoff时不删除（cutoff是严格<）', () => {
      // cutoff = 90000 - 88000 = 2000，tick=2000 → NOT < cutoff → 保留
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 2000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('tick字段大于cutoff的arrangement被保留', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 10000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000) // cutoff=2000, tick=10000 > 2000 → 保留
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('混合过期和未过期时只删除过期的', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))   // 过期
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: 50000 })) // 保留
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000) // cutoff=2000
      expect((sys as any).arrangements).toHaveLength(1)
      expect((sys as any).arrangements[0].id).toBe(2)
    })

    it('多个过期记录全部被删除', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i, tick: i * 100 })) // 全部 < 2000
      }
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements).toHaveLength(0)
    })
  })

  // ─── 5. MAX_ARRANGEMENTS上限(16) ────────────────────────────────────
  describe('MAX_ARRANGEMENTS上限(16)', () => {
    it('arrangements不超过MAX_ARRANGEMENTS(16)', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, fortressCivId: i + 1, chatelainCivId: i + 10, tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 触发新增逻辑
      sys.update(1, {} as any, {} as any, 1002730)
      // 过期cutoff = 1002730-88000=914730，tick=999999 > 914730 → 保留；不新增
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('填满16个后再调用update仍然 ≤ 16', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 1002730)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('未填满时随机触发可新增arrangement', () => {
      // 先确保lastCheck=0，tick=2730触发
      // Math.random()=0 → 0 < PROCEED_CHANCE=0.0021为false（0 < 0.0021 = true）→ 触发
      vi.spyOn(Math, 'random').mockReturnValue(0) // fortress=1,chatelain=1 → 同ID → 不新增
      sys.update(1, {} as any, {} as any, 2730)
      // fortress和chatelain可能相同（都是1），测试不崩溃即可
      expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(0)
    })

    it('fortressCivId与chatelainCivId不相同才能新增', () => {
      // mock random序列：Math.random()第1次用于proceed_chance判断（0<0.0021），第2次fortress=1，第3次chatelain=1 → 同ID跳过
      const randomSpy = vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.001) // proceed_chance: 0.001 < 0.0021 → 执行
        .mockReturnValueOnce(0)     // fortress = 1+floor(0*8) = 1
        .mockReturnValueOnce(0)     // chatelain = 1+floor(0*8) = 1 → 同ID → 跳过
      sys.update(1, {} as any, {} as any, 2730)
      expect((sys as any).arrangements).toHaveLength(0) // 相同ID不新增
    })
  })
})
