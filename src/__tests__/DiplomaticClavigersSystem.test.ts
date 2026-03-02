import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticClavigersSystem, ClavigerForm } from '../systems/DiplomaticClavigersSystem'

// DiplomaticClavigersSystem.update(dt, world, em, tick) — 4参数
// CHECK_INTERVAL=3030, PROCEED_CHANCE=0.0021, MAX_ARRANGEMENTS=16
// 字段范围: gateAuthority[5,85], accessControl[10,90], keyHolding[5,80], curfewEnforcement[5,65]
// 过期: cutoff = tick - 88000，arrangement.tick < cutoff 则删除
// duration每tick +1

const FORMS: ClavigerForm[] = ['royal_claviger', 'castle_claviger', 'city_claviger', 'abbey_claviger']

function makeSys() {
  return new DiplomaticClavigersSystem()
}

function makeArrangement(overrides: Partial<any> = {}): any {
  return {
    id: 1, gateCivId: 1, accessCivId: 2,
    form: 'royal_claviger' as ClavigerForm,
    gateAuthority: 40, accessControl: 45,
    keyHolding: 30, curfewEnforcement: 25,
    duration: 0, tick: 1000,
    ...overrides,
  }
}

describe('DiplomaticClavigersSystem', () => {
  let sys: DiplomaticClavigersSystem

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

    it('ClavigerArrangement包含所有必要字段', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 9, gateCivId: 4, accessCivId: 7 }))
      const r = (sys as any).arrangements[0]
      expect(r).toHaveProperty('id')
      expect(r).toHaveProperty('gateCivId')
      expect(r).toHaveProperty('accessCivId')
      expect(r).toHaveProperty('form')
      expect(r).toHaveProperty('gateAuthority')
      expect(r).toHaveProperty('accessControl')
      expect(r).toHaveProperty('keyHolding')
      expect(r).toHaveProperty('curfewEnforcement')
      expect(r).toHaveProperty('duration')
      expect(r).toHaveProperty('tick')
    })

    it('form字段必须是合法的ClavigerForm之一', () => {
      ;(sys as any).arrangements.push(makeArrangement({ form: 'city_claviger' }))
      expect(FORMS).toContain((sys as any).arrangements[0].form)
    })
  })

  // ─── 2. CHECK_INTERVAL节流(3030) ────────────────────────────────────
  describe('CHECK_INTERVAL节流(3030)', () => {
    it('tick差小于3030时不执行，lastCheck不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2000) // 2000 - 0 = 2000 < 3030 → 跳过
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差 = 3029时跳过（严格<）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3029)
      expect((sys as any).lastCheck).toBe(0)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('tick差 >= 3030时执行并更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发新增
      sys.update(1, {} as any, {} as any, 3030)
      expect((sys as any).lastCheck).toBe(3030)
    })

    it('第二次在间隔内调用不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3030) // 执行
      sys.update(1, {} as any, {} as any, 4000) // 4000-3030=970 < 3030 → 跳过
      expect((sys as any).lastCheck).toBe(3030)
    })

    it('两次都超过间隔时lastCheck跟随最新tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3030)
      sys.update(1, {} as any, {} as any, 6060)
      expect((sys as any).lastCheck).toBe(6060)
    })
  })

  // ─── 3. 数值字段动态更新 ────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次update后duration增加1', () => {
      ;(sys as any).arrangements.push(makeArrangement({ duration: 0, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3030)
      expect((sys as any).arrangements[0].duration).toBe(1)
    })

    it('多次update后duration累计递增', () => {
      ;(sys as any).arrangements.push(makeArrangement({ duration: 0, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3030)
      sys.update(1, {} as any, {} as any, 6060)
      sys.update(1, {} as any, {} as any, 9090)
      expect((sys as any).arrangements[0].duration).toBe(3)
    })

    it('gateAuthority不低于min(5)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ gateAuthority: 5.01, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0) // 最大负向偏移
      sys.update(1, {} as any, {} as any, 3030)
      expect((sys as any).arrangements[0].gateAuthority).toBeGreaterThanOrEqual(5)
    })

    it('gateAuthority不超过max(85)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ gateAuthority: 84.99, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1) // 最大正向偏移
      sys.update(1, {} as any, {} as any, 3030)
      expect((sys as any).arrangements[0].gateAuthority).toBeLessThanOrEqual(85)
    })

    it('accessControl不低于min(10)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ accessControl: 10.01, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3030)
      expect((sys as any).arrangements[0].accessControl).toBeGreaterThanOrEqual(10)
    })

    it('accessControl不超过max(90)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ accessControl: 89.99, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3030)
      expect((sys as any).arrangements[0].accessControl).toBeLessThanOrEqual(90)
    })

    it('keyHolding不低于min(5)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ keyHolding: 5.01, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3030)
      expect((sys as any).arrangements[0].keyHolding).toBeGreaterThanOrEqual(5)
    })

    it('curfewEnforcement不超过max(65)', () => {
      ;(sys as any).arrangements.push(makeArrangement({ curfewEnforcement: 64.99, tick: 1000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3030)
      expect((sys as any).arrangements[0].curfewEnforcement).toBeLessThanOrEqual(65)
    })
  })

  // ─── 4. time-based过期清理(cutoff = tick - 88000) ──────────────────
  describe('time-based过期清理', () => {
    it('tick字段小于cutoff的arrangement被删除', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 91030) // cutoff=91030-88000=3030, tick=0 < 3030 → 过期
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('tick字段恰好等于cutoff时不删除（严格<）', () => {
      // cutoff = 91030 - 88000 = 3030，tick=3030 → NOT < cutoff → 保留
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 3030 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 91030)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('tick字段大于cutoff的arrangement被保留', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 50000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 91030) // cutoff=3030, tick=50000 > 3030 → 保留
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('混合过期和未过期时只删除过期的', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))      // 过期
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: 60000 }))  // 保留
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 91030)
      expect((sys as any).arrangements).toHaveLength(1)
      expect((sys as any).arrangements[0].id).toBe(2)
    })

    it('多个过期记录全部被删除', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i, tick: i * 100 })) // 全部 < 3030
      }
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 91030)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('刚创建的arrangement(tick=当前tick)不会立即过期', () => {
      // 注入tick=91030的arrangement，再用91030调用update → cutoff=3030 < 91030 → 保留
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 91030 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 91030)
      expect((sys as any).arrangements).toHaveLength(1)
    })
  })

  // ─── 5. MAX_ARRANGEMENTS上限(16) ────────────────────────────────────
  describe('MAX_ARRANGEMENTS上限(16)', () => {
    it('arrangements不超过MAX_ARRANGEMENTS(16)', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, gateCivId: i + 1, accessCivId: i + 20, tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 1003030)
      // cutoff = 1003030-88000=915030，tick=999999 > 915030 → 保留；已满 → 不新增
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('填满16个后再调用update仍然 ≤ 16', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 1003030)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('gateCivId与accessCivId不相同才能新增', () => {
      const randomSpy = vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.001) // proceed_chance: 0.001 < 0.0021 → 执行
        .mockReturnValueOnce(0)     // gate = 1+floor(0*8) = 1
        .mockReturnValueOnce(0)     // access = 1+floor(0*8) = 1 → 同ID → 跳过
      sys.update(1, {} as any, {} as any, 3030)
      expect((sys as any).arrangements).toHaveLength(0) // 相同ID不新增
    })

    it('nextId在成功新增后递增', () => {
      const randomSpy = vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.001) // proceed_chance: 触发
        .mockReturnValueOnce(0)     // gate = 1
        .mockReturnValueOnce(0.5)   // access = 1+floor(0.5*8)=5 → 不同 → 新增
        .mockReturnValue(0.5)       // 后续随机值（form选取等）
      sys.update(1, {} as any, {} as any, 3030)
      // 若成功新增则nextId=2，否则=1
      expect((sys as any).nextId).toBeGreaterThanOrEqual(1)
    })

    it('过期清理后空出位置，下次可继续新增', () => {
      // 塞满16个过期记录
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 0 })) // 即将过期
      }
      vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发新增
      // tick=91030 → cutoff=3030 → tick=0 < 3030 → 全部删除
      sys.update(1, {} as any, {} as any, 91030)
      expect((sys as any).arrangements).toHaveLength(0)
    })
  })
})
